import { Icon } from '../components/icons.jsx';
import { getRoutineAnchor } from '../lib/notifications.jsx';
import { useSettings } from '../settings-context.jsx';
import { Btn, Tag, SectionHeader, ActionPanel } from '../components/ui.jsx';
import {
  dayKey, computeMaxStreak, computeGrowthStage, ACHIEVEMENTS, detectNewlyUnlocked,
  getHeatmapGrid, dateKeyToday, readTomorrowTopic, clearTomorrowTopic,
  pickRecommendedPractice, getRecentPracticeItems,
} from '../lib/home-data.jsx';
import { renderMonthlyReportPoster } from '../lib/poster.jsx';
import { PosterShareModal } from '../components/library.jsx';
import { GoalEditor, WeeklyRecapModal } from '../components/home-widgets.jsx';
import { useState, useEffect, useMemo } from '../react-hooks.jsx';

const MODE_TILES = [
  { id: 'improv',       icon: 'dice',     title: '即兴',   detail: '随机题 · 倒计时' },
  { id: 'teleprompter', icon: 'document', title: '提词',   detail: '跟稿练自然' },
  { id: 'host',         icon: 'mic',      title: '主持',   detail: '被追问的压力' },
  { id: 'tutorial',     icon: 'book',     title: '框架',   detail: '结构拆解表达' },
  { id: 'endless',      icon: 'refresh',  title: '循环',   detail: '连续换题不停' },
];

export const HomeView = ({ onSelect, onOpenSettings, onQuickStart, onStartWithTopic }) => {
  const [todayKeyTick, setTodayKeyTick] = useState(() => dayKey(Date.now()));
  useEffect(() => {
    const t = setInterval(() => {
      const k = dayKey(Date.now());
      setTodayKeyTick(prev => (prev === k ? prev : k));
    }, 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const today = new Date();
  const dateStr = `${today.getFullYear()}.${String(today.getMonth() + 1).padStart(2, '0')}.${String(today.getDate()).padStart(2, '0')}`;
  const settings = useSettings();
  const dayOfWeek = ['日', '一', '二', '三', '四', '五', '六'][today.getDay()];
  const [editingGoal, setEditingGoal] = useState(false);
  const [showWeeklyRecap, setShowWeeklyRecap] = useState(false);
  const [tomorrowTopic, setTomorrowTopic] = useState(() => readTomorrowTopic());
  const [reportBlob, setReportBlob] = useState(null);
  const [reportLoading, setReportLoading] = useState(false);

  // 每周复盘：上次 > 6 天 + 至少 3 条
  useEffect(() => {
    const files = settings.savedFiles || [];
    if (files.length < 3) return;
    const now = Date.now();
    const last = settings.lastWeeklyRecap || 0;
    if (last > 0 && (now - last) < 6 * 86400000) return;
    if (last === 0) {
      const oldest = Math.min(...files.map(f => f.ts || now));
      if ((now - oldest) < 7 * 86400000) return;
    }
    setShowWeeklyRecap(true);
  }, [settings.savedFiles, settings.lastWeeklyRecap]);

  const dismissWeeklyRecap = () => {
    settings.setLastWeeklyRecap(Date.now());
    setShowWeeklyRecap(false);
  };

  const stats = useMemo(() => {
    const today0 = new Date();
    today0.setHours(0, 0, 0, 0);
    const todayStart = today0.getTime();
    const goal = settings.dailyGoal || { count: 3, durationSec: 30 };
    const minDur = (goal.durationSec || 0) * 0.8;
    const matches = (f) => (f.duration || 0) >= minDur;
    const files = settings.savedFiles || [];
    const restSet = new Set(settings.restDays || []);
    const todayK = dayKey(todayStart);

    const qualifyingByDay = new Map();
    for (const f of files) {
      if (!matches(f)) continue;
      const k = dayKey(f.ts || 0);
      qualifyingByDay.set(k, (qualifyingByDay.get(k) || 0) + 1);
    }

    const todayFilesCount = qualifyingByDay.get(todayK) || 0;
    const isTodayRest = restSet.has(todayK);
    const todayMet = todayFilesCount >= goal.count;
    const todayPassed = todayMet || isTodayRest;

    let streak = todayPassed ? 1 : 0;
    const cursorDate = new Date(today0);
    for (let i = 0; i < 365; i++) {
      cursorDate.setDate(cursorDate.getDate() - 1);
      const k = dayKey(cursorDate.getTime());
      if (restSet.has(k)) continue;
      if ((qualifyingByDay.get(k) || 0) >= goal.count) streak++;
      else break;
    }

    const weekKeys = new Set();
    const wd = new Date(today0);
    for (let i = 0; i < 7; i++) { weekKeys.add(dayKey(wd.getTime())); wd.setDate(wd.getDate() - 1); }
    let weekCount = 0;
    for (const [k, c] of qualifyingByDay) { if (weekKeys.has(k)) weekCount += c; }

    const restUsedInWeek = (settings.restDays || []).filter(d => weekKeys.has(d)).length;
    const canRestToday = !isTodayRest && !todayMet && restUsedInWeek < 1;

    return {
      todayCount: todayFilesCount, weekCount,
      streak, goalCount: goal.count, goalDuration: goal.durationSec,
      todayMet, isTodayRest, todayPassed, canRestToday,
      todayK,
    };
  }, [settings.savedFiles, settings.dailyGoal, settings.restDays, todayKeyTick]);

  const growth = useMemo(() => {
    const files = settings.savedFiles || [];
    return computeGrowthStage(files.length, computeMaxStreak(files));
  }, [settings.savedFiles]);

  const heatmapCells = useMemo(
    () => getHeatmapGrid(settings.savedFiles || []),
    [settings.savedFiles, todayKeyTick]
  );
  const restDaySet = useMemo(() => new Set(settings.restDays || []), [settings.restDays]);

  const achievementsInfo = useMemo(() => {
    const files = settings.savedFiles || [];
    const persisted = new Set(settings.unlockedAchievements || []);
    const unlockedIds = new Set(persisted);
    for (const a of ACHIEVEMENTS) {
      try { if (a.test(files, stats.streak)) unlockedIds.add(a.id); } catch {}
    }
    const newly = detectNewlyUnlocked(settings.unlockedAchievements, [...unlockedIds]);
    return { unlockedIds, newly };
  }, [settings.savedFiles, settings.unlockedAchievements, stats.streak]);

  useEffect(() => {
    if (achievementsInfo.newly.length === 0) return;
    const t = setTimeout(() => settings.markAchievementsSeen(achievementsInfo.newly), 4000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [achievementsInfo.newly.join(',')]);

  const pendingTopic = tomorrowTopic && tomorrowTopic.forDate === dateKeyToday()
    ? tomorrowTopic.topic
    : null;
  const recommendation = pickRecommendedPractice(settings.savedFiles || [], pendingTopic || '');
  const recentItems = getRecentPracticeItems(settings.savedFiles || []).slice(0, 3);

  const startPresetAndClear = () => {
    if (!pendingTopic) return;
    const t = pendingTopic;
    clearTomorrowTopic();
    setTomorrowTopic(null);
    if (onStartWithTopic) onStartWithTopic(t);
    else onSelect && onSelect('improv');
  };

  const makeMonthlyReport = async () => {
    setReportLoading(true);
    try {
      const persisted = new Set(settings.unlockedAchievements || []);
      const unlocked = ACHIEVEMENTS.filter(a => {
        if (persisted.has(a.id)) return true;
        try { return a.test(settings.savedFiles || [], stats.streak); } catch { return false; }
      });
      const blob = await renderMonthlyReportPoster({
        files: settings.savedFiles || [],
        achievements: unlocked,
        restDays: settings.restDays || [],
        dailyGoal: settings.dailyGoal,
        month: new Date(),
      });
      setReportBlob(blob);
    } catch (e) {
      console.error('monthly report error', e);
      alert('生成战报失败：' + (e?.message || e));
    } finally {
      setReportLoading(false);
    }
  };

  const goalPct = stats.isTodayRest
    ? 100
    : Math.min(100, (stats.todayCount / Math.max(1, stats.goalCount)) * 100);
  const anchor = settings.routineAnchor ? getRoutineAnchor(settings.routineAnchor) : null;
  const unlockedAchievements = ACHIEVEMENTS.filter(a => achievementsInfo.unlockedIds.has(a.id));

  return (
    <div className="kobo-page">
      {/* 昨天预订的题 — 唯一例外的打断式卡片 */}
      {pendingTopic && (
        <button
          type="button"
          onClick={startPresetAndClear}
          className="kobo-rise block w-full mb-4 text-left p-4 bg-[#061A6C] text-white active:scale-[0.99] transition-transform"
          style={{ borderRadius: '8px', animationDelay: '0ms' }}
        >
          <div className="text-[10px] tracking-[0.2em] font-bold uppercase text-[#F1A23F] mb-2">
            你昨天给今天预订的题
          </div>
          <div className="font-display font-bold text-[16px] leading-snug mb-3 pr-2">
            {pendingTopic}
          </div>
          <div className="inline-flex items-center gap-2 bg-white text-[#061A6C] px-3.5 py-2 text-[12px] font-bold"
               style={{ borderRadius: '999px' }}>
            <Icon name="play" size={12} strokeWidth={1.8} /> 立即兑现 · 60s
          </div>
        </button>
      )}

      {/* 问候 */}
      <section className="kobo-rise mb-5" style={{ animationDelay: '40ms' }}>
        <div className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.16em]">
          {dateStr} · 星期{dayOfWeek}
        </div>
        <h1 className="font-display font-bold text-stone-950 text-[28px] leading-[1.15] mt-1 tracking-tight">
          今天的口播训练室
        </h1>
        <p className="text-[13px] text-stone-500 mt-1.5 leading-relaxed">
          一条就够。先开口，再复盘。
        </p>
      </section>

      {/* 主路径：下一条建议 = 唯一强 CTA（合并速练入口） */}
      <ActionPanel
        className="kobo-rise kobo-surface p-4 mb-4 border-l-[3px] border-l-[#A30236]"
        style={{ animationDelay: '80ms' }}
      >
        <div className="flex items-start justify-between gap-3 mb-3">
          <div className="min-w-0">
            <div className="text-[10px] font-bold uppercase text-[#A30236] mb-1 tracking-[0.16em]">
              下一条建议 · 速练入口
            </div>
            <h2 className="font-display font-bold text-[18px] leading-snug text-stone-950">
              {recommendation.topic}
            </h2>
            <p className="text-[12px] text-stone-500 mt-1.5 leading-relaxed">
              {recommendation.reason}
            </p>
          </div>
          <Tag color="red">{recommendation.focus}</Tag>
        </div>

        {/* 迷你进度：连续 + 今日目标 合一条 */}
        <div className="mb-4 p-3 bg-stone-50 border border-stone-100" style={{ borderRadius: '6px' }}>
          <div className="flex items-center justify-between gap-2 mb-2">
            <div className="flex items-center gap-3 text-[12px]">
              <span className="font-bold text-stone-900">
                <span className="text-[#A30236]">{stats.streak > 0 ? '🔥 ' : ''}</span>
                连续 {stats.streak} 天
              </span>
              <span className="text-stone-300">·</span>
              <span className="text-stone-600">
                今日 {stats.todayCount}/{stats.goalCount}
                {stats.isTodayRest && <span className="ml-1 text-sky-700">休息日</span>}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setEditingGoal(true)}
              className="text-[11px] text-stone-400 hover:text-[#A30236] transition-colors"
            >
              改目标
            </button>
          </div>
          <div className="h-1.5 bg-stone-200 overflow-hidden" style={{ borderRadius: '99px' }}>
            <div
              className={`kobo-bar h-full ${
                stats.isTodayRest ? 'bg-sky-400' : stats.todayMet ? 'bg-emerald-500' : 'bg-[#A30236]'
              }`}
              style={{ width: `${goalPct}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-2 gap-2">
            <div className="text-[11px] text-stone-500 min-w-0 truncate">
              {growth.current.emoji} {growth.current.name}
              {growth.next
                ? ` · 距「${growth.next.name}」${
                    growth.need.type === 'count'
                      ? `再 ${growth.need.remaining} 条`
                      : `再 ${growth.need.remaining} 天`
                  }`
                : ' · 最高阶段'}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {stats.canRestToday && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('今天作为休息日？streak 不断，7 天内只能用 1 次。')) {
                      settings.addRestDay(stats.todayK);
                    }
                  }}
                  className="text-[11px] text-sky-700 hover:text-sky-900"
                >
                  休息
                </button>
              )}
              {stats.isTodayRest && (
                <button
                  type="button"
                  onClick={() => {
                    if (window.confirm('取消今日休息日？')) settings.removeRestDay(stats.todayK);
                  }}
                  className="text-[11px] text-stone-500 hover:text-[#A30236]"
                >
                  取消休息
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-2">
          <Btn
            variant="primary"
            className="flex-1 kobo-press"
            onClick={() => {
              if (recommendation.mode === 'improv') onQuickStart?.();
              else onSelect(recommendation.mode);
            }}
          >
            <Icon name="play" size={15} /> 开始练习
          </Btn>
          <Btn variant="secondary" className="kobo-press" onClick={() => onSelect('improv')}>
            换个题目
          </Btn>
        </div>
      </ActionPanel>

      {/* 模式入口 — 只保留一处，5 格含循环 */}
      <section className="kobo-rise mb-5" style={{ animationDelay: '120ms' }}>
        <SectionHeader eyebrow="练习模式" title="选一种打开方式" detail="主路径不够时，从这里换节奏。" />
        <div className="grid grid-cols-2 gap-2">
          {MODE_TILES.map((item, i) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item.id)}
              className={`kobo-tile kobo-press text-left bg-white border border-stone-200 p-3.5 group ${
                item.id === 'endless' ? 'col-span-2' : ''
              }`}
              style={{ borderRadius: '8px', animationDelay: `${140 + i * 40}ms` }}
            >
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 shrink-0 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center group-hover:bg-[#A30236] group-hover:text-white transition-colors duration-300"
                  style={{ borderRadius: '6px', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                >
                  <Icon name={item.icon} size={18} />
                </div>
                <div className="min-w-0">
                  <div className="font-display font-bold text-[14px] text-stone-950">{item.title}</div>
                  <div className="text-[11px] text-stone-500 mt-0.5 leading-snug">{item.detail}</div>
                </div>
                {item.id === 'endless' && (
                  <Icon name="chevron" size={14} className="ml-auto text-stone-300 group-hover:text-[#A30236]" />
                )}
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* 最近练习 */}
      <section className="kobo-rise mb-5" style={{ animationDelay: '200ms' }}>
        <SectionHeader
          eyebrow="本地素材库"
          title="最近练习"
          detail={recentItems.length ? '录像只保存在当前设备。' : '完成一条后，这里开始积累。'}
        />
        <div className="space-y-2">
          {recentItems.length ? recentItems.map((item, i) => (
            <div
              key={item.filename}
              className="kobo-tile bg-white border border-stone-200 p-3 flex items-center justify-between gap-3"
              style={{ borderRadius: '8px', animationDelay: `${220 + i * 40}ms` }}
            >
              <div className="min-w-0">
                <div className="font-bold text-[13px] text-stone-900 truncate">
                  {item.tag === 'star' ? '⭐ ' : ''}{item.title}
                </div>
                <div className="text-[11px] text-stone-500 mt-0.5 truncate">{item.detail}</div>
              </div>
              <div className="text-[10px] text-stone-400 whitespace-nowrap">{item.date}</div>
            </div>
          )) : (
            <div
              className="bg-white border border-dashed border-stone-300 p-4 text-[13px] text-stone-500 leading-relaxed"
              style={{ borderRadius: '8px' }}
            >
              还没有录像。先从上面的「开始练习」开口 30 秒。
            </div>
          )}
        </div>
      </section>

      {/* 热力图 + 战报（合并成长形状） */}
      <section className="kobo-rise mb-5" style={{ animationDelay: '280ms' }}>
        <div className="kobo-surface p-4 border border-stone-200 bg-white" style={{ borderRadius: '10px' }}>
          <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
            <div>
              <div className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.16em]">训练形状</div>
              <div className="font-display font-bold text-stone-900 text-[15px] mt-0.5">过去 4 周</div>
            </div>
            <button
              type="button"
              onClick={makeMonthlyReport}
              disabled={reportLoading}
              className="kobo-press text-[11px] tracking-wider font-bold px-3 py-1.5 bg-[#A30236] text-white disabled:opacity-50"
              style={{ borderRadius: '999px' }}
            >
              {reportLoading ? '生成中…' : '本月战报'}
            </button>
          </div>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {['日', '一', '二', '三', '四', '五', '六'].map((d, i) => (
              <div key={i} className="text-center text-[9px] text-stone-400">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {heatmapCells.map((c, i) => {
              const k = dayKey(c.date.getTime());
              const isRest = restDaySet.has(k);
              const bg = isRest ? 'bg-sky-200'
                : c.count === 0 ? 'bg-stone-100'
                : c.count <= 2 ? 'bg-[#FBEFF2]'
                : c.count <= 5 ? 'bg-[#EEA5B4]'
                : 'bg-[#A30236]';
              const text = isRest ? 'text-sky-900'
                : c.count > 5 ? 'text-white'
                : c.count > 0 ? 'text-[#A30236]' : 'text-stone-400';
              return (
                <div
                  key={i}
                  className={`aspect-square flex flex-col items-center justify-center text-[9px] ${bg} ${text} ${
                    c.isToday ? 'ring-2 ring-[#A30236] ring-offset-1' : ''
                  }`}
                  style={{ borderRadius: '4px' }}
                  title={`${c.date.getMonth() + 1}/${c.date.getDate()} · ${isRest ? '休息日' : c.count + ' 条'}`}
                >
                  <span className="font-bold leading-none">{c.date.getDate()}</span>
                </div>
              );
            })}
          </div>
          <div className="text-[10px] text-stone-500 mt-2.5">
            {(() => {
              const activeDays = heatmapCells.filter(c => c.count > 0).length;
              const total = heatmapCells.reduce((a, b) => a + b.count, 0);
              return `${activeDays} 天有预演 · 累计 ${total} 条 · 本周 ${stats.weekCount} 条`;
            })()}
          </div>
        </div>
      </section>

      {/* 成就 — 紧凑横滑，去掉多余文案 */}
      <section className="kobo-rise mb-5" style={{ animationDelay: '320ms' }}>
        <div className="flex items-center justify-between mb-2.5">
          <div className="font-display font-bold text-stone-900 text-[14px]">成就</div>
          <span className="text-[10px] text-stone-400 tabular-nums">
            {unlockedAchievements.length}/{ACHIEVEMENTS.length}
          </span>
        </div>
        <div className="flex gap-2 overflow-x-auto no-scrollbar -mx-1 px-1 pb-1">
          {ACHIEVEMENTS.map(a => {
            const isUnlocked = achievementsInfo.unlockedIds.has(a.id);
            const isNew = achievementsInfo.newly.includes(a.id);
            return (
              <div
                key={a.id}
                className={`shrink-0 w-[64px] p-2 border text-center transition-all duration-500 ${
                  isUnlocked
                    ? (isNew ? 'border-[#F1A23F] bg-amber-50 kobo-pop' : 'border-[#A30236]/40 bg-[#FBEFF2]')
                    : 'border-stone-200 bg-stone-50 opacity-45'
                }`}
                style={{ borderRadius: '8px', transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
                title={a.desc}
              >
                <div className="text-[22px] leading-none">{a.emoji}</div>
                <div className="text-[9px] font-bold mt-1 leading-tight text-stone-700">{a.name}</div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 已绑锚点：一行状态即可；绑定入口在设置 */}
      {anchor && (
        <div
          className="kobo-rise flex items-center justify-between bg-stone-100 px-3 py-2.5 mb-5"
          style={{ borderRadius: '8px', animationDelay: '360ms' }}
        >
          <span className="text-[12px] text-stone-700 truncate">
            {anchor.emoji} 绑到「{anchor.label}」后提醒
          </span>
          <button
            type="button"
            onClick={() => settings.setRoutineAnchor('')}
            className="text-[11px] text-stone-400 hover:text-[#A30236] shrink-0 ml-2"
          >
            解绑
          </button>
        </div>
      )}

      {editingGoal && (
        <GoalEditor
          goal={settings.dailyGoal}
          onSave={g => { settings.setDailyGoal(g); setEditingGoal(false); }}
          onClose={() => setEditingGoal(false)}
        />
      )}
      {showWeeklyRecap && (
        <WeeklyRecapModal files={settings.savedFiles || []} onClose={dismissWeeklyRecap} />
      )}
      {reportBlob && (
        <PosterShareModal
          blob={reportBlob}
          onClose={() => setReportBlob(null)}
          fileName={`口播月报-${new Date().toISOString().slice(0, 7)}.png`}
        />
      )}

      <div className="kobo-rise pt-2 pb-1 border-t border-stone-200" style={{ animationDelay: '380ms' }}>
        <div className="flex items-center justify-between text-stone-400 text-[10px]">
          <span className="flex items-center gap-1.5">
            <Icon name="shield" size={11} strokeWidth={1.5} />
            录像仅存本地 · 不会上传
          </span>
          <button
            type="button"
            onClick={onOpenSettings}
            className="text-stone-400 hover:text-[#A30236] transition-colors"
          >
            设置
          </button>
        </div>
      </div>
    </div>
  );
};
