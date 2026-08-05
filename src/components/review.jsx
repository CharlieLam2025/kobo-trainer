import { Icon } from './icons.jsx';
import { formatTime } from '../lib/utils.jsx';
import { saveVideoToDisk } from '../lib/storage.jsx';
import { deepseekCoachReview } from '../lib/deepseek.jsx';
import { calculateWPM, analyzeFillerWords, wpmBand, buildNextTakeFocus } from '../lib/analysis.jsx';
import { useSettings } from '../settings-context.jsx';
import { Btn, Card, MetricTile, ActionPanel } from './ui.jsx';
import { startOfDay, dayKey, STREAK_DAY_MESSAGES, ACHIEVEMENTS, detectNewlyUnlocked, dateKeyTomorrow, readTomorrowTopic, writeTomorrowTopic, clearTomorrowTopic } from '../lib/home-data.jsx';
import { FileTagger, PublishStep } from './library.jsx';
import { useState, useEffect, useRef, useMemo } from '../react-hooks.jsx';

export const SameTopicCompare = ({ topic, currentTranscript, currentDuration }) => {
  const { savedFiles } = useSettings();
  const prior = useMemo(() => {
    if (!topic) return null;
    // savedFiles[0] 是刚保存的本次。从 [1:] 里找最近一次同题练习。
    return (savedFiles || [])
      .slice(1)
      .find(f => f.label === topic);
  }, [savedFiles, topic]);

  if (!prior) return null;

  const priorWpm     = calculateWPM(prior.transcript, prior.duration || 0);
  const priorFillers = analyzeFillerWords(prior.transcript);
  const priorFillerTotal = priorFillers.reduce((s, f) => s + f.count, 0);

  const currWpm     = calculateWPM(currentTranscript, currentDuration);
  const currFillers = analyzeFillerWords(currentTranscript || '');
  const currFillerTotal = currFillers.reduce((s, f) => s + f.count, 0);
  const hasTextCompare = (prior.transcript || '').trim().length > 10
    && (currentTranscript || '').trim().length > 10;
  const takeCount = Math.max(2, (savedFiles || []).filter(f => f.label === topic).length);

  const daysAgo = Math.max(1, Math.floor((Date.now() - (prior.ts || 0)) / 86400000));

  const fillerDelta = currFillerTotal - priorFillerTotal;
  const durDelta    = currentDuration - (prior.duration || 0);
  // WPM 不分高低好坏（180-260 都是舒适区）· 只显示差值不打色

  const fmtDelta = (d, unit = '') => d === 0 ? '持平' : `${d > 0 ? '+' : ''}${d}${unit}`;
  const fillerColor = fillerDelta < 0 ? 'text-emerald-700' : fillerDelta > 0 ? 'text-[#A30236]' : 'text-stone-500';

  return (
    <Card className="p-5 mb-4 border-l-[3px] border-[#061A6C]">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 bg-[#E9EBF5] text-[#061A6C] flex items-center justify-center" style={{borderRadius:'3px'}}>
          <Icon name="refresh" size={16} strokeWidth={1.7}/>
        </div>
        <div>
          <div className="text-stone-400 text-[9px] tracking-[0.18em] font-semibold">同题复练</div>
          <div className="font-display font-bold text-[#061A6C] text-[14px] leading-none mt-0.5">
            同题对比 · {daysAgo} 天前你录过这题
          </div>
        </div>
      </div>

      {hasTextCompare ? (
        <div className="grid grid-cols-3 gap-2 mt-4">
          <div className="text-center p-3 bg-stone-50" style={{borderRadius:'3px'}}>
            <div className="text-[9px] tracking-[0.16em] uppercase text-stone-400 font-bold">嗯啊数</div>
            <div className="font-display font-bold text-[20px] tabular-nums mt-1 text-stone-900">{currFillerTotal}</div>
            <div className={`text-[10px] mt-1 ${fillerColor}`}>
              上次 {priorFillerTotal} · {fmtDelta(fillerDelta)}
            </div>
          </div>
          <div className="text-center p-3 bg-stone-50" style={{borderRadius:'3px'}}>
            <div className="text-[9px] tracking-[0.16em] text-stone-400 font-bold">语速</div>
            <div className="font-display font-bold text-[20px] tabular-nums mt-1 text-stone-900">{currWpm}</div>
            <div className="text-[10px] mt-1 text-stone-500">上次 {priorWpm}</div>
          </div>
          <div className="text-center p-3 bg-stone-50" style={{borderRadius:'3px'}}>
            <div className="text-[9px] tracking-[0.16em] uppercase text-stone-400 font-bold">时长</div>
            <div className="font-display font-bold text-[20px] tabular-nums mt-1 text-stone-900">{currentDuration}s</div>
            <div className="text-[10px] mt-1 text-stone-500">上次 {prior.duration || 0}s · {fmtDelta(durDelta, 's')}</div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-2 mt-4">
          <div className="p-3 bg-[#E9EBF5]" style={{borderRadius:'3px'}}>
            <div className="text-[9px] tracking-[0.16em] uppercase text-[#061A6C]/60 font-bold">同题次数</div>
            <div className="font-display font-bold text-[20px] text-[#061A6C] mt-1">第 {takeCount} 遍</div>
            <div className="text-[10px] text-[#061A6C]/70 mt-1">复练闭环已经形成</div>
          </div>
          <div className="p-3 bg-stone-50" style={{borderRadius:'3px'}}>
            <div className="text-[9px] tracking-[0.16em] uppercase text-stone-400 font-bold">本次时长</div>
            <div className="font-display font-bold text-[20px] text-stone-900 mt-1">{currentDuration}s</div>
            <div className="text-[10px] text-stone-500 mt-1">上次 {prior.duration || 0}s · {fmtDelta(durDelta, 's')}</div>
          </div>
        </div>
      )}

      {(prior.transcript || '').trim() && <details className="mt-4 pt-3 border-t border-stone-200">
        <summary className="text-[11px] text-stone-500 cursor-pointer hover:text-stone-800 select-none">
          📜 看上次怎么讲的（{daysAgo} 天前）
        </summary>
        <div className="text-[12px] text-stone-700 mt-2 leading-relaxed bg-stone-50 p-3" style={{borderRadius:'2px'}}>
          {prior.transcript}
        </div>
      </details>}
    </Card>
  );
};

// ============ 「明天的话题」预承诺 ============
// 习惯科学的 pre-commitment device · 今天结束时给明天预订 · 明天打开就被「未完成的承诺」撞一下
// 比单纯的提醒强 · 因为是「你自己选的承诺」不是「app 给你的任务」
// localStorage helper（dateKeyToday / dateKeyTomorrow / readTomorrowTopic / writeTomorrowTopic /
// clearTomorrowTopic）定义在 HomeView 上面 · 这里只渲染 UI

export const TomorrowTopicCommit = ({ defaultTopic = '' }) => {
  const [text, setText] = useState('');
  const [committed, setCommitted] = useState(() => {
    // mount 时检查：是否已经为明天预订过了
    const t = readTomorrowTopic();
    return t && t.forDate === dateKeyTomorrow() ? t.topic : null;
  });

  const submit = () => {
    const t = text.trim();
    if (!t) return;
    writeTomorrowTopic(t);
    setCommitted(t);
    setText('');
  };
  const cancel = () => {
    clearTomorrowTopic();
    setCommitted(null);
  };
  const useToday = () => setText(defaultTopic || '');

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center gap-2.5 mb-3">
        <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
          <Icon name="clock" size={16} strokeWidth={1.7}/>
        </div>
        <div>
          <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">TOMORROW</div>
          <div className="font-display font-bold text-[#A30236] text-[14px] leading-none mt-0.5">
            给明天的自己预订一题
          </div>
        </div>
      </div>

      {committed ? (
        <div className="bg-emerald-50 border border-emerald-200 p-4" style={{borderRadius:'3px'}}>
          <div className="flex items-start gap-2 mb-2">
            <Icon name="check" size={14} className="text-emerald-700 mt-0.5 shrink-0" strokeWidth={2.2}/>
            <div className="text-[10px] tracking-[0.16em] uppercase font-bold text-emerald-700">已预订给明天</div>
          </div>
          <div className="font-display font-bold text-stone-900 text-[15px] leading-snug pl-5">{committed}</div>
          <div className="flex items-center justify-end mt-3">
            <button onClick={cancel} className="text-[11px] text-stone-500 hover:text-[#A30236] transition-colors">
              取消预订
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-[12px] text-stone-600 leading-relaxed mb-3">
            写下你明天想讲的一句话 / 一个观点 / 一个问题 ·
            明天打开 app · 它会作为你给自己的承诺出现在首页。
          </p>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="例如：聊聊「为什么我离开大厂」"
            className="w-full p-3 border border-stone-300 text-sm leading-relaxed resize-none focus:outline-none focus:border-[#A30236]"
            style={{borderRadius:'3px', minHeight: 64}}
            maxLength={200}
          />
          <div className="flex items-center justify-between flex-wrap gap-2 mt-3">
            {defaultTopic && (
              <button onClick={useToday} className="text-[11px] text-stone-600 hover:text-[#A30236] transition-colors">
                ↻ 用今天这题
              </button>
            )}
            <div className="flex-1" />
            <Btn variant="primary" onClick={submit} disabled={!text.trim()}>
              预订给明天 →
            </Btn>
          </div>
        </div>
      )}
    </Card>
  );
};

export const ReviewScoreGrid = ({ stats, review }) => {
  const score = review?.scores || {};
  const items = [
    { key: 'hook', label: '开头', value: score.hook ?? '--', tone: 'crimson' },
    { key: 'logic', label: '逻辑', value: score.logic ?? '--', tone: 'navy' },
    { key: 'filler', label: '口头禅', value: score.filler ?? (stats?.fillers?.length ? stats.fillers.length : 0), tone: 'amber' },
    { key: 'ending', label: '收尾', value: score.ending ?? '--', tone: 'stone' },
    { key: 'pacing', label: '语速', value: score.pacing ?? (stats?.wpm || 0), tone: 'emerald' },
  ];
  return (
    <div className="grid grid-cols-2 gap-2">
      {items.map(item => (
        <MetricTile
          key={item.key}
          label={item.label}
          value={item.value}
          detail={item.key === 'pacing' && item.value !== '--' ? '字/分' : null}
          tone={item.tone}
        />
      ))}
    </div>
  );
};

export const ReviewHero = ({ contextLabel, duration, onRetry, onNew, focus }) => (
  <ActionPanel className="kobo-rise p-4 mb-3 border-l-[3px] border-l-[#A30236]">
    <div className="text-[10px] font-bold uppercase text-[#A30236] mb-1.5 tracking-[0.16em]">复盘报告</div>
    <h1 className="font-display font-bold text-[20px] leading-tight text-stone-950 m-0">
      下一遍只改这一件事
    </h1>
    <p className="text-[12px] text-stone-500 mt-1.5 leading-relaxed truncate">
      {contextLabel || '未命名练习'} · {formatTime(duration || 0)}
    </p>
    {focus && (
      <div className="mt-3 p-3 bg-[#FBEFF2] border border-[#efd0da]" style={{ borderRadius: '8px' }}>
        <div className="text-[9px] tracking-[0.18em] uppercase font-bold text-[#A30236] mb-1">下一遍只改这一件事</div>
        <div className="text-[13px] font-bold text-stone-900 leading-relaxed">{focus}</div>
      </div>
    )}
    <div className="flex gap-2 mt-3">
      <Btn variant="primary" onClick={onRetry} className="flex-1 kobo-press">
        <Icon name="refresh" size={14} /> 同题二刷
      </Btn>
      <Btn variant="secondary" onClick={onNew} className="kobo-press">换个题目</Btn>
    </div>
  </ActionPanel>
);

// ============ Done View ============

export const DoneView = ({ blob, contextLabel, duration = 0, onRetry, onNew, extra, transcript = '' }) => {
  // createObjectURL 放 effect 里而不是 useMemo：render 阶段的副作用在被 React
  // 丢弃的 render（StrictMode/并发中断）里不会触发配对的 revoke → 视频 blob 泄漏
  const [url, setUrl] = useState(null);
  useEffect(() => {
    if (!blob) { setUrl(null); return; }
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  const settings = useSettings();
  const [saveStatus, setSaveStatus] = useState({ state: 'pending' });
  const savedRef = useRef(false);
  // 默认极简：AI / 同题对比 / 模拟发布 / 明天预订 收进「更多」
  const [showMore, setShowMore] = useState(false);

  useEffect(() => {
    if (!blob || savedRef.current) return;
    savedRef.current = true;
    setSaveStatus({ state: 'saving' });
    saveVideoToDisk(blob, contextLabel, settings.saveDir)
      .then(r => {
        setSaveStatus({ state: 'saved', ...r });
        settings.addSavedFile?.({ ...r, label: contextLabel, duration, ts: Date.now(), transcript: transcript || '' });
      })
      .catch(err => setSaveStatus({ state: 'error', error: err.message }));
  }, [blob, contextLabel, duration, settings.saveDir, transcript]);

  const sizeMB = blob ? (blob.size / 1024 / 1024).toFixed(1) : null;
  const nextTakeFocus = useMemo(() => buildNextTakeFocus(transcript, duration), [transcript, duration]);

  // 录完即时反馈：今日进度 + 连续天数 + 是否解锁新成就
  // 注意：savedFiles 包含刚加进去的这一条
  const feedbackStats = useMemo(() => {
    const today0 = startOfDay(new Date());
    const goal = settings.dailyGoal || { count: 3, durationSec: 30 };
    const minDur = (goal.durationSec || 0) * 0.8;
    const files = settings.savedFiles || [];
    // 先按「本地日历日」把达标录像分桶（O(N)），streak 再逐日回看（O(days)）
    // — 替代原来 365 次全量 filter 的 O(days×N)；按日历日回溯也天然兼容 DST
    const qualifyingByDay = new Map();
    for (const f of files) {
      if ((f.duration || 0) < minDur) continue;
      const k = dayKey(f.ts || 0);
      qualifyingByDay.set(k, (qualifyingByDay.get(k) || 0) + 1);
    }
    const todayQualifying = qualifyingByDay.get(dayKey(today0)) || 0;
    let streak = todayQualifying >= goal.count ? 1 : 0;
    const cursorDate = new Date(today0);
    for (let i = 0; i < 365; i++) {
      cursorDate.setDate(cursorDate.getDate() - 1);
      if ((qualifyingByDay.get(dayKey(cursorDate.getTime())) || 0) >= goal.count) streak++;
      else break;
    }
    const justHitGoal = todayQualifying === goal.count;
    const unlocked = ACHIEVEMENTS.filter(a => {
      try { return a.test(files, streak); } catch { return false; }
    }).map(a => a.id);
    const newlyUnlocked = detectNewlyUnlocked(settings.unlockedAchievements, unlocked)
      .map(id => ACHIEVEMENTS.find(a => a.id === id))
      .filter(Boolean);
    // 习惯科学口径：「连续录过的天数」（不要求达成 goal）+「今天的总录像数」
    // STREAK_DAY_MESSAGES 触发条件用这俩 · 跟硬 streak 解耦
    const allTodayFiles = files.filter(f => (f.ts || 0) >= today0 && (f.ts || 0) < today0 + 86400000);
    const dayKeys = new Set(files.map(f => dayKey(f.ts || 0)));
    let softStreak = dayKeys.has(dayKey(today0)) ? 1 : 0;
    const softCursorDate = new Date(today0);
    while (softStreak < 365) {
      softCursorDate.setDate(softCursorDate.getDate() - 1);
      if (!dayKeys.has(dayKey(softCursorDate.getTime()))) break;
      softStreak++;
    }
    // 「断了几天回来」检测 · 用于 streak repair 文案
    // returnGap = N 表示「上次录像在 N 天前」· null 表示没有历史录像
    // returnGap >= 2 等价于「至少跳过了昨天一天」
    const pastFiles = files.filter(f => (f.ts || 0) < today0);
    let returnGap = null;
    if (pastFiles.length > 0) {
      const lastTs = Math.max(...pastFiles.map(f => f.ts || 0));
      const lastDay0 = startOfDay(new Date(lastTs));
      returnGap = Math.round((today0 - lastDay0) / 86400000);
    }
    return {
      todayCount: todayQualifying, goalCount: goal.count, streak,
      justHitGoal, newlyUnlocked, remaining: Math.max(0, goal.count - todayQualifying),
      qualified: (duration || 0) >= minDur,
      minDur,
      softStreak,
      isFirstOfDay: allTodayFiles.length === 1,
      returnGap,
    };
  }, [settings.savedFiles, settings.dailyGoal, settings.unlockedAchievements, duration]);

  // 标记新成就为已见
  useEffect(() => {
    if (feedbackStats.newlyUnlocked.length > 0) {
      const ids = feedbackStats.newlyUnlocked.map(a => a.id);
      const timer = setTimeout(() => settings.markAchievementsSeen(ids), 2000);
      return () => clearTimeout(timer);  // 组件已卸载就别再标记（用户可能马上二刷）
    }
    // eslint-disable-next-line
  }, [feedbackStats.newlyUnlocked.length]);

  // 首日/回归一句话（折叠成长科学长文）
  const habitLine = useMemo(() => {
    if (!blob || !feedbackStats.isFirstOfDay) return null;
    const { softStreak, returnGap } = feedbackStats;
    if (softStreak === 1 && returnGap != null && returnGap >= 2) {
      if (returnGap === 2) return { emoji: '🤝', text: '昨天空了 · 今天又开始 · 这就够' };
      if (returnGap <= 7) return { emoji: '🌱', text: `回来了 · 跳过了 ${returnGap - 1} 天也不晚` };
      return { emoji: '🌅', text: '好久没见 · 重新走 Day 1' };
    }
    if (softStreak >= 1 && softStreak <= 7) {
      const m = STREAK_DAY_MESSAGES[softStreak];
      if (m) return { emoji: m.emoji, text: m.title };
    }
    return null;
  }, [blob, feedbackStats]);

  return (
    <div className="kobo-page">
      {/* 主反馈条：打卡进度 + 连续 + 新徽章 */}
      {blob && (
        <div
          className="kobo-rise kobo-pop mb-3 overflow-hidden text-white"
          style={{
            borderRadius: '12px',
            background: feedbackStats.justHitGoal
              ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)'
              : 'linear-gradient(135deg, #A30236 0%, #8E0230 100%)',
          }}
        >
          <div className="p-4">
            <div className="flex items-center justify-between gap-2 mb-2">
              <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-white/85">
                {feedbackStats.justHitGoal ? '今日打卡完成' : '预演 +1'}
              </span>
              {feedbackStats.streak > 0 && (
                <span className="text-[11px] font-bold text-white/90">🔥 连续 {feedbackStats.streak} 天</span>
              )}
            </div>
            <div className="font-display font-bold text-[18px] leading-snug mb-2">
              {feedbackStats.justHitGoal
                ? '今天的目标达成了'
                : feedbackStats.remaining > 0
                  ? `再来 ${feedbackStats.remaining} 条 · 达成今日目标`
                  : '今天已经在进步'}
            </div>
            <div className="h-1.5 bg-white/20 mb-1.5 overflow-hidden" style={{ borderRadius: '99px' }}>
              <div
                className="kobo-bar h-full bg-white"
                style={{ width: `${Math.min(100, (feedbackStats.todayCount / Math.max(1, feedbackStats.goalCount)) * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-white/75 tabular-nums">
              <span>
                今日 {feedbackStats.todayCount}/{feedbackStats.goalCount}
                {!feedbackStats.qualified && ` · 本条需满 ${Math.ceil(feedbackStats.minDur)}s 才计入`}
              </span>
              {sizeMB && saveStatus.state === 'saved' && <span>已存本地 · {sizeMB}MB</span>}
              {saveStatus.state === 'saving' && <span>保存中…</span>}
              {saveStatus.state === 'error' && <span>保存失败</span>}
            </div>
            {feedbackStats.newlyUnlocked.length > 0 && (
              <div className="mt-3 flex gap-2 flex-wrap">
                {feedbackStats.newlyUnlocked.map(a => (
                  <span
                    key={a.id}
                    className="inline-flex items-center gap-1.5 bg-white/15 px-2.5 py-1 text-[11px] font-bold"
                    style={{ borderRadius: '999px' }}
                  >
                    {a.emoji} {a.name}
                  </span>
                ))}
              </div>
            )}
            {habitLine && (
              <div className="mt-3 pt-2.5 border-t border-white/15 text-[12px] text-white/90 leading-snug">
                {habitLine.emoji} {habitLine.text}
              </div>
            )}
          </div>
        </div>
      )}

      <ReviewHero
        contextLabel={contextLabel}
        duration={duration}
        onRetry={onRetry}
        onNew={onNew}
        focus={nextTakeFocus}
      />

      {/* 回放 */}
      <Card className="kobo-rise p-3 mb-3" style={{ borderRadius: '12px' }}>
        {url ? (
          (blob.type && blob.type.startsWith('audio/')) ? (
            <div className="w-full bg-gradient-to-br from-stone-900 to-[#3a0716] p-5 flex flex-col items-center justify-center" style={{ borderRadius: '8px' }}>
              <div className="text-5xl mb-2">🎙️</div>
              <div className="text-amber-300 text-[10px] tracking-[0.18em] uppercase font-bold mb-3">纯语音</div>
              <audio src={url} controls className="w-full max-w-md" />
            </div>
          ) : (
            <video src={url} controls className="w-full bg-black" style={{ borderRadius: '8px' }} />
          )
        ) : (
          <div className="text-stone-400 text-sm p-6 text-center">录制为空（可能时长太短或权限被拒）</div>
        )}

        {saveStatus.state === 'saved' && (
          <div className="mt-2.5 flex items-center justify-between gap-2 text-[11px] text-stone-500">
            <span className="truncate">✓ {saveStatus.filename}</span>
            <div className="flex items-center gap-2 shrink-0">
              {url && (
                <a href={url} download={saveStatus.filename} className="underline hover:text-[#A30236]">再下载</a>
              )}
              <button
                type="button"
                onClick={() => {
                  if (window.confirm(`删除这条录像？\n\n${contextLabel}`)) {
                    const idx = settings.savedFiles.findIndex(f => f.filename === saveStatus.filename);
                    if (idx >= 0) settings.removeSavedFile(idx);
                    setSaveStatus({ state: 'discarded' });
                  }
                }}
                className="underline hover:text-red-600"
              >
                丢掉
              </button>
            </div>
          </div>
        )}
        {saveStatus.state === 'error' && (
          <div className="mt-2 text-[11px] text-red-600 flex items-center justify-between gap-2">
            <span>保存失败：{saveStatus.error}</span>
            {url && <a href={url} download={`口播-${Date.now()}.webm`} className="underline">手动下载</a>}
          </div>
        )}
        {saveStatus.state === 'discarded' && (
          <div className="mt-2 text-[11px] text-stone-400 italic">已删除这条录像</div>
        )}

        {saveStatus.state === 'saved' && saveStatus.filename && (settings.savedFiles?.length || 0) >= 3 && (
          <div className="mt-2">
            <FileTagger filename={saveStatus.filename} />
          </div>
        )}
      </Card>

      {/* 更多工具：默认折叠 */}
      {blob && (
        <div className="mb-3">
          <button
            type="button"
            onClick={() => setShowMore(v => !v)}
            className="kobo-press w-full flex items-center justify-between px-3 py-2.5 border border-stone-200 bg-white text-[13px] font-semibold text-stone-700"
            style={{ borderRadius: '10px' }}
          >
            <span>{showMore ? '收起更多' : '更多 · AI 复盘 / 同题对比 / 预订明天'}</span>
            <Icon name="chevron" size={14} className={`text-stone-400 transition-transform duration-300 ${showMore ? 'rotate-90' : ''}`} />
          </button>
          {showMore && (
            <div className="kobo-rise mt-3 space-y-0">
              <CoachReview topic={contextLabel} durationSec={duration} initialTranscript={transcript} onRetry={onRetry} />
              {contextLabel && (
                <SameTopicCompare topic={contextLabel} currentTranscript={transcript} currentDuration={duration} />
              )}
              {contextLabel && <PublishStep contextLabel={contextLabel} />}
              <TomorrowTopicCommit defaultTopic={contextLabel} />
            </div>
          )}
        </div>
      )}

      {extra}
    </div>
  );
};

// ============ AI 教练复盘：5 维评分 + 改进建议 ============

export const CoachReview = ({ topic, durationSec = 0, initialTranscript = '', onRetry }) => {
  const settings = useSettings();
  const [text, setText]       = useState(initialTranscript || '');
  const [review, setReview]   = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState('');
  const [expanded, setExpanded] = useState(initialTranscript ? false : false); // 默认折叠，点开后展开

  // 本地统计（实时随 text 变化）
  const stats = useMemo(() => {
    const wpm = calculateWPM(text, durationSec);
    const fillers = analyzeFillerWords(text);
    return { wpm, fillers };
  }, [text, durationSec]);

  const band = wpmBand(stats.wpm);

  // 卸载时（同题二刷/切页）中止进行中的 AI 复盘请求 · 避免 setState 落到已卸载组件
  const abortRef = useRef(null);
  useEffect(() => () => { try { abortRef.current?.abort(); } catch {} }, []);

  const run = async () => {
    if (!text.trim() || text.trim().length < 15) {
      setError('转录稿太短（至少 15 字）');
      return;
    }
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true); setError('');
    try {
      const r = await deepseekCoachReview({
        apiKey: settings.apiKey,
        topic: topic || '',
        transcript: text,
        durationSec,
        wpm: stats.wpm,
        fillerTop: stats.fillers,
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      setReview(r);
    } catch (e) {
      if (controller.signal.aborted) return;
      setError(e.message || String(e));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  // 折叠态：用户没主动展开 → 只显示一个"展开 AI 复盘"按钮，节省视觉空间
  if (!expanded) {
    return (
      <Card className="p-4 mb-4 border-l-[3px] border-amber-400 cursor-pointer hover:bg-amber-50/50 transition-colors"
        onClick={() => setExpanded(true)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 bg-amber-100 text-amber-700 flex items-center justify-center" style={{borderRadius:"3px"}}>
              <Icon name="sparkle" size={16} strokeWidth={1.7} />
            </div>
            <div>
              <div className="font-display font-bold text-stone-900 text-[15px]">🎯 AI 教练复盘</div>
              <div className="text-[11px] text-stone-500 mt-0.5">5 维评分 · 口头禅统计 · 改进建议</div>
            </div>
          </div>
          <div className="text-amber-700 text-xs font-bold">展开 →</div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6 mb-4 border-l-[3px] border-amber-400">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-amber-100 text-amber-700 flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="sparkle" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">🎯 AI 教练复盘</h3>
            <div className="text-[9px] tracking-wider text-stone-400 mt-0.5">🤖 内容由 AI 生成 · 仅供参考</div>
          </div>
        </div>
        <button onClick={() => setExpanded(false)} className="text-stone-400 hover:text-stone-700 text-xs">收起 ✕</button>
      </div>

      {!review && (
        <>
          <div className="text-[12px] text-stone-600 mb-2">
            {initialTranscript
              ? '你的实时转录已填入下方。可手动修正再调 AI。'
              : '把你刚才说的话粘贴 / 输入下面（iOS Safari 没有实时转录，可手打要点）。'}
          </div>
          <textarea
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder="转录稿（至少 15 字）..."
            rows={5}
            className="w-full p-3 border border-stone-300 text-sm leading-relaxed"
            style={{borderRadius: '3px', fontFamily: 'inherit'}}
          />

          {/* 本地实时统计 */}
          <div className="grid grid-cols-2 gap-2 mt-3 text-[12px]">
            <div className="p-2.5 bg-stone-50 border border-stone-200" style={{borderRadius:'3px'}}>
              <div className="text-[10px] tracking-wider uppercase text-stone-500 mb-1 font-bold">语速</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-xl font-display font-bold tabular-nums text-stone-900">{stats.wpm}</span>
                <span className="text-[11px] text-stone-500">字/分</span>
                <span className="text-[11px] font-bold ml-auto" style={{color: band.color}}>{band.label}</span>
              </div>
            </div>
            <div className="p-2.5 bg-stone-50 border border-stone-200" style={{borderRadius:'3px'}}>
              <div className="text-[10px] tracking-wider uppercase text-stone-500 mb-1 font-bold">口头禅</div>
              {stats.fillers.length === 0 ? (
                <div className="text-[13px] font-bold text-emerald-600">✓ 干净</div>
              ) : (
                <div className="flex flex-wrap gap-1">
                  {stats.fillers.slice(0, 4).map(f => (
                    <span key={f.word} className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold" style={{borderRadius:'2px'}}>
                      {f.word} <span className="opacity-70">×{f.count}</span>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="mt-4 flex items-center gap-3">
            <Btn variant="primary" onClick={run} disabled={loading}>
              {loading ? '思考中...' : '调用 AI 复盘 ✨'}
            </Btn>
            {error && <span className="text-red-600 text-sm">{error}</span>}
          </div>
        </>
      )}

      {review && (
        <>
          {review.suggestions?.[0] && (
            <div className="mb-4 p-4 bg-[#FBEFF2] border-l-[3px] border-[#A30236]">
              <div className="text-[9px] tracking-[0.18em] uppercase font-bold text-[#A30236] mb-1">第二遍唯一任务</div>
              <div className="text-[14px] font-bold text-stone-900 leading-relaxed">{review.suggestions[0]}</div>
              {onRetry && (
                <Btn variant="primary" onClick={onRetry} className="w-full mt-3">
                  <Icon name="refresh" size={14}/> 按这条同题二刷
                </Btn>
              )}
            </div>
          )}

          <div className="mb-4">
            <ReviewScoreGrid stats={stats} review={review} />
          </div>

          {/* 总评 */}
          {review.summary && (
            <div className="p-3 bg-stone-50 border-l-[3px] border-stone-400 text-[13px] text-stone-800 leading-relaxed mb-3">
              {review.summary}
            </div>
          )}

          {/* 亮点 */}
          {review.highlights?.length > 0 && (
            <div className="mb-3">
              <div className="text-[10px] tracking-[0.18em] uppercase text-emerald-700 font-bold mb-1.5">✨ 亮点</div>
              <ul className="space-y-1.5">
                {review.highlights.map((h, i) => (
                  <li key={i} className="text-[13px] text-stone-700 pl-3 border-l border-emerald-300 leading-relaxed">{h}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 改进建议 */}
          {review.suggestions?.length > 1 && (
            <div className="mb-3">
              <div className="text-[10px] tracking-[0.18em] uppercase text-stone-500 font-bold mb-1.5">之后再改</div>
              <ul className="space-y-1.5">
                {review.suggestions.slice(1).map((s, i) => (
                  <li key={i} className="text-[13px] text-stone-800 pl-3 border-l border-[#A30236] leading-relaxed">{s}</li>
                ))}
              </ul>
            </div>
          )}

          {/* 本地补充统计 */}
          <div className="mt-4 pt-3 border-t border-stone-200 flex items-center gap-3 text-[11px] text-stone-500">
            <span>语速 <span className="font-bold text-stone-700">{stats.wpm}</span> 字/分</span>
            <span>·</span>
            <span>口头禅 {stats.fillers.length === 0 ? '0' : stats.fillers.reduce((s, f) => s + f.count, 0)} 处</span>
          </div>

          <div className="flex gap-2 mt-3">
            <Btn variant="secondary" onClick={() => { setReview(null); }}>重新复盘</Btn>
          </div>
        </>
      )}
    </Card>
  );
};

// ============ 海报生成（Canvas）============
// 中文字体降级链 · 各平台都有匹配
