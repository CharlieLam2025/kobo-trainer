import { Icon } from '../components/icons.jsx';
import { ISSUES, TOPIC_TYPES } from '../data/topics.jsx';
import { formatTime } from '../lib/utils.jsx';
import { deepseekGenerateTopics } from '../lib/deepseek.jsx';
import { useSettings } from '../settings-context.jsx';
import { useCamera } from '../hooks/use-camera.jsx';
import { useRecorder } from '../hooks/use-recorder.jsx';
import { Btn, Card, Tag } from '../components/ui.jsx';
import { ReadyOverlay, CameraFrame, BeautyButton, AudienceViewButton } from '../components/camera-ui.jsx';
import { AI_SOURCE, ALL_SOURCE, getDefaultTopicsPool, findTopicSourceKey } from '../lib/topic-pools.jsx';
import { DoneView } from '../components/review.jsx';
import { useState, useEffect, useRef, useMemo, useCallback } from '../react-hooks.jsx';
import { buildAdaptiveTopicPool } from '../topic-preferences.mjs';

export const ENDLESS_INTERVALS = [
  { value: 30,  label: '30s',  desc: '钩动节奏' },
  { value: 60,  label: '60s',  desc: '单点输出' },
  { value: 90,  label: '90s',  desc: '展开论证' },
  { value: 120, label: '2min', desc: '完整短视频' },
];

// 训练课程预设：6 套覆盖「短/中/长 + 微/框架/挑战」六个维度，消除重复
// 选择疲劳是真实存在的 · 16 套预设里大多数差异 < 30% · 用户会进入「不知道选哪个」的瘫痪状态

export const SESSION_PRESET_GROUPS = [
  {
    id: 'daily',
    label: '🌱 日常训练',
    blurb: '从短到长 · 一日三档随心选',
    presets: [
      { id:'quick',    emoji:'⚡', name:'短闪训练', sessionMin:10, intervalSec:60, source:'__all__',  desc:'10 题 × 60s · 全类别混合 · 通勤档' },
      { id:'standard', emoji:'💪', name:'标准集训', sessionMin:20, intervalSec:60, source:'__all__',  desc:'20 题 × 60s · 每日主力档' },
      { id:'marathon', emoji:'🏃', name:'马拉松',   sessionMin:60, intervalSec:60, source:'__all__',  desc:'60 题 × 60 分钟 · 周末长档' },
    ],
  },
  {
    id: 'focus',
    label: '🎯 重点突破',
    blurb: '想专门攻一个能力时来这里',
    presets: [
      { id:'hook',  emoji:'🪝', name:'钩子专训', sessionMin:5,  intervalSec:15, source:'__all__',  desc:'20 题 × 15s · 只练前 5 秒抓人',    tip:'只要前 5 秒抓人 · 后面别管' },
      { id:'prep',  emoji:'📐', name:'PREP 集训', sessionMin:15, intervalSec:90, source:'观点表达', desc:'10 题 × 90s · Point-Reason-Example-Point', framework:['观点','理由','例子','重申'], tip:'P → R → E → P · 严格走结构' },
      { id:'devil', emoji:'😈', name:'反向辩护', sessionMin:15, intervalSec:90, source:'即兴反驳', desc:'10 题 × 90s · 站对立面 · 把舒适区往外推', tip:'不管认不认同 · 必须为对立面辩护' },
    ],
  },
];

// 扁平化数组（用于按 id 查找 / 渲染）

export const SESSION_PRESETS = SESSION_PRESET_GROUPS.flatMap(g => g.presets);

export const SESSION_TIME_PRESETS = [
  { value: 0,  label: '不限',  desc: '手动结束' },
  { value: 5,  label: '5 min', desc: '快速训练' },
  { value: 10, label: '10 min',desc: '短闪' },
  { value: 20, label: '20 min',desc: '标准集训' },
  { value: 30, label: '30 min',desc: '高强度' },
  { value: 60, label: '60 min',desc: '马拉松' },
];

export const EndlessMode = () => {
  const [stage, setStage] = useState('config'); // config | ready | running | done
  const [intervalSec, setIntervalSec] = useState(60);
  const [customInterval, setCustomInterval] = useState(60);
  const [useCustom, setUseCustom] = useState(false);
  const [source, setSource] = useState(ALL_SOURCE);   // 默认精选混合抽
  const [topic, setTopic] = useState('');
  const [topicTimeLeft, setTopicTimeLeft] = useState(0);
  const [topicsHistory, setTopicsHistory] = useState([]);
  const [skipCount, setSkipCount] = useState(0);
  const [sessionDuration, setSessionDuration] = useState(0);
  const sessionDurationRef = useRef(0);  // master tick 闭包读这里 · 避免依赖数组每秒变化
  const [sessionLimitMin, setSessionLimitMin] = useState(20); // 总训练时长（分钟，0=不限）
  const [customSessionMin, setCustomSessionMin] = useState(20);
  const [useCustomSession, setUseCustomSession] = useState(false);
  const [activePresetId, setActivePresetId] = useState(null);
  const [preCount, setPreCount] = useState(3);
  const [aiTheme, setAiTheme] = useState('');
  const [aiPool, setAiPool] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  const effectiveInterval = useCustom ? Math.max(5, parseInt(customInterval) || 60) : intervalSec;
  const effectiveSessionLimitSec = useCustomSession
    ? Math.max(1, parseInt(customSessionMin) || 0) * 60
    : sessionLimitMin * 60;
  // 估算这次能练多少题（用于预览）
  const estimatedTopicCount = effectiveSessionLimitSec > 0
    ? Math.max(1, Math.floor(effectiveSessionLimitSec / effectiveInterval))
    : null;

  // 应用预设
  const applyPreset = useCallback((p) => {
    if (p.id === 'custom') {
      setActivePresetId('custom');
      return;
    }
    setActivePresetId(p.id);
    // 每题时长：非标准值（不在 ENDLESS_INTERVALS）走自定义
    const stdIntervals = ENDLESS_INTERVALS.map(d => d.value);
    if (stdIntervals.includes(p.intervalSec)) {
      setUseCustom(false);
      setIntervalSec(p.intervalSec);
    } else {
      setUseCustom(true);
      setCustomInterval(p.intervalSec);
    }
    // 总时长：非标准值（不在 SESSION_TIME_PRESETS）走自定义
    const stdSessions = SESSION_TIME_PRESETS.map(d => d.value);
    if (stdSessions.includes(p.sessionMin)) {
      setUseCustomSession(false);
      setSessionLimitMin(p.sessionMin);
    } else {
      setUseCustomSession(true);
      setCustomSessionMin(p.sessionMin);
    }
    if (p.source) setSource(p.source);
  }, []);

  const allSources = useMemo(() => {
    const r = {};
    Object.entries(TOPIC_TYPES).forEach(([k, v]) => { r[k] = v; });
    Object.entries(ISSUES).forEach(([k, v]) => { r[k] = v; });
    return r;
  }, []);

  // Pick a topic that's not in the last 5 used
  const pickFromPool = useCallback((history) => {
    let pool;
    if (source === AI_SOURCE) pool = aiPool;
    else if (source === ALL_SOURCE) pool = getDefaultTopicsPool();
    else pool = allSources[source]?.topics;
    if (!pool || !pool.length) return '';
    const recentTopics = history.slice(-5).map(h => h.topic);
    const adaptive = buildAdaptiveTopicPool(pool, settings.topicPreferences, findTopicSourceKey);
    const candidates = adaptive.filter(t => !recentTopics.includes(t));
    const usable = candidates.length ? candidates : adaptive;
    return usable[Math.floor(Math.random() * usable.length)];
  }, [source, aiPool, allSources, settings.topicPreferences]);

  const generateAI = async () => {
    if (!aiTheme.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const topics = await deepseekGenerateTopics({
        apiKey: settings.apiKey,
        theme: aiTheme.trim(),
        count: 10,
      });
      setAiPool(topics);
      setSource(AI_SOURCE);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

  // 3-2-1 倒计时放 ref · 卸载/退出时清掉（避免对已释放的流 rec.start）
  const preCountTimerRef = useRef(null);
  const clearPreCount = () => {
    if (preCountTimerRef.current) { window.clearInterval(preCountTimerRef.current); preCountTimerRef.current = null; }
  };
  useEffect(() => () => clearPreCount(), []);

  const begin = async () => {
    const s = await cam.start();
    if (!s) return;
    clearPreCount();
    setStage('ready');
    setTopicsHistory([]);
    setSessionDuration(0);
    sessionDurationRef.current = 0;
    setSkipCount(0);
    let n = 3;
    setPreCount(n);
    preCountTimerRef.current = window.setInterval(() => {
      n--;
      if (n >= 0) setPreCount(n);
      if (n < 0) {
        clearPreCount();
        const first = pickFromPool([]);
        setTopic(first);
        setTopicsHistory([{ topic: first, at: 0 }]);
        setTopicTimeLeft(effectiveInterval);
        setStage('running');
        rec.start(s);
      }
    }, 1000);
  };

  // 手动切题（用户跳过）
  const rotateTopic = useCallback(() => {
    setSkipCount(c => c + 1);
    setTopicsHistory(prevHist => {
      const next = pickFromPool(prevHist);
      setTopic(next);
      return [...prevHist, { topic: next, at: sessionDuration }];
    });
    setTopicTimeLeft(effectiveInterval);
  }, [pickFromPool, sessionDuration, effectiveInterval]);

  // Master tick: session timer + topic countdown + auto-rotate + 自动结束
  // sessionDuration 通过 ref 读取 → 依赖数组不含每秒变化的值 · interval 不再每秒拆建
  useEffect(() => {
    if (stage !== 'running') return;
    const id = window.setInterval(() => {
      setSessionDuration(d => {
        const next = d + 1;
        sessionDurationRef.current = next;
        // 总时长到了 → 自动结束（异步避免在 setState 里直接调用 setState）
        if (effectiveSessionLimitSec > 0 && next >= effectiveSessionLimitSec) {
          setTimeout(() => finish(), 0);
        }
        return next;
      });
      setTopicTimeLeft(t => {
        if (t <= 1) {
          setTopicsHistory(prevHist => {
            const next = pickFromPool(prevHist);
            setTopic(next);
            return [...prevHist, { topic: next, at: sessionDurationRef.current }];
          });
          return effectiveInterval;
        }
        return t - 1;
      });
    }, 1000);
    return () => window.clearInterval(id);
    // eslint-disable-next-line
  }, [stage, effectiveInterval, pickFromPool, effectiveSessionLimitSec]);

  const finish = () => {
    clearPreCount();
    rec.stop();
    cam.stop();
    setStage('done');
  };

  const resetAll = () => {
    clearPreCount();
    setStage('config');
    cam.stop();
  };

  if (stage === 'ready') {
    const activePreset = activePresetId ? SESSION_PRESETS.find(p => p.id === activePresetId) : null;
    const presetHint = activePreset
      ? `${activePreset.emoji} ${activePreset.name} · 每 ${effectiveInterval}s 自动换题${activePreset.tip ? ' · ' + activePreset.tip : ''}`
      : `无限模式 · 每 ${effectiveInterval}s 自动换题`;
    return <ReadyOverlay countdown={preCount} cam={cam} hint={presetHint} />;
  }

  if (stage === 'running') {
    const pct = (topicTimeLeft / effectiveInterval) * 100;
    const urgent = topicTimeLeft <= 5;
    // 总时长进度
    const sessionPct = effectiveSessionLimitSec > 0
      ? Math.min(100, (sessionDuration / effectiveSessionLimitSec) * 100)
      : 0;
    const sessionRemain = effectiveSessionLimitSec > 0
      ? Math.max(0, effectiveSessionLimitSec - sessionDuration)
      : 0;
    // 是否最后一题（剩余时长 ≤ 当前题时长 + 5s 余量）
    const isLastTopic = effectiveSessionLimitSec > 0
      && sessionRemain <= effectiveInterval + 5
      && sessionRemain > 0;
    // 当前激活的预设（用于在录制时显示结构提示 / tip）
    const activePreset = activePresetId ? SESSION_PRESETS.find(p => p.id === activePresetId) : null;
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} cam={cam} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 顶部双条进度：上=本题（深红）下=总训练（琥珀）*/}
              <div className="absolute top-0 left-0 right-0">
                <div className="h-1 bg-stone-900/40">
                  <div className="h-full bg-[#A30236] transition-all duration-1000 ease-linear" style={{ width: `${pct}%` }} />
                </div>
                {effectiveSessionLimitSec > 0 && (
                  <div className="h-0.5 bg-stone-900/40">
                    <div className="h-full bg-[#F1A23F] transition-all duration-1000 ease-linear" style={{ width: `${sessionPct}%` }} />
                  </div>
                )}
              </div>
              {/* Top: current topic + per-topic countdown + 训练总时长 */}
              <div className="absolute left-3 right-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 18px)'}}>
                <div className="bg-stone-950/85 backdrop-blur text-stone-100 px-4 py-3 border-l-[3px] border-[#A30236]" style={{borderRadius: '3px'}}>
                  <div className="flex items-baseline justify-between gap-2 mb-1.5">
                    <span style={{color: '#F1A23F', fontSize: '9px', letterSpacing: '0.18em', fontWeight: 700, textTransform: 'uppercase'}}>
                      {isLastTopic ? '最后一题' : `第 ${topicsHistory.length} 题`}
                      {effectiveSessionLimitSec > 0 && estimatedTopicCount && ` / 共约 ${estimatedTopicCount} 题`}
                    </span>
                    <span className={`font-display font-bold tabular-nums text-2xl ${urgent ? 'text-red-300 pulse-rec' : (isLastTopic ? 'text-amber-300 pulse-rec' : 'text-amber-300')}`}>
                      {topicTimeLeft}s
                    </span>
                  </div>
                  <div className="font-display font-bold text-lg leading-snug">{topic}</div>

                  {/* 结构框架提示（PREP / 黄金圈 / 故事三幕 等） */}
                  {activePreset?.framework && (
                    <div className="flex flex-wrap items-center gap-1 mt-2.5">
                      {activePreset.framework.map((f, i) => (
                        <React.Fragment key={i}>
                          <span className="text-[10px] bg-amber-400/20 text-amber-200 px-1.5 py-0.5 font-bold tracking-wider" style={{borderRadius:'2px'}}>{f}</span>
                          {i < activePreset.framework.length - 1 && <span className="text-amber-400/60 text-[10px] font-bold">→</span>}
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                  {/* 额外提示文案 */}
                  {activePreset?.tip && (
                    <div className="text-[11px] text-amber-200/90 mt-2 leading-snug flex items-start gap-1">
                      <span className="opacity-70">💡</span><span>{activePreset.tip}</span>
                    </div>
                  )}

                  {effectiveSessionLimitSec > 0 && (
                    <div className="text-[10px] text-stone-400 mt-2 tabular-nums tracking-wider">
                      训练已用 {formatTime(sessionDuration)} / 共 {formatTime(effectiveSessionLimitSec)} · 还剩 {formatTime(sessionRemain)}
                    </div>
                  )}
                </div>
              </div>
              {/* Bottom: REC + 美颜 + 跳过 + stop */}
              <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-[#A30236] text-white px-2.5 py-1.5 text-[10px] tracking-[0.2em] font-bold" style={{borderRadius: '2px'}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />录制 · {formatTime(sessionDuration)}
                  </div>
                  <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                </div>
                <div className="flex items-center gap-1.5">
                  {!isLastTopic && (
                    <button onClick={rotateTopic}
                      className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold"
                      style={{borderRadius:'2px'}}
                      title="跳过这一题，立刻切到下一题"
                    >
                      <Icon name="refresh" size={13} />跳过
                    </button>
                  )}
                  <Btn variant="danger" size="sm" onClick={finish}>结束</Btn>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    const totalTopics = topicsHistory.length;
    const avgPerTopic = totalTopics > 0 ? Math.round(sessionDuration / totalTopics) : 0;
    const goalPct = effectiveSessionLimitSec > 0
      ? Math.min(100, Math.round((sessionDuration / effectiveSessionLimitSec) * 100))
      : null;
    const isPresetMatched = SESSION_PRESETS.find(p => p.id === activePresetId);

    const trainingReport = (
      <>
        {/* 训练报告 */}
        <Card className="p-5 mt-3">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-7 h-7 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
              <Icon name="target" size={14} strokeWidth={1.7}/>
            </div>
            <h4 className="font-display font-bold text-[16px] text-stone-900 m-0">训练报告</h4>
            {isPresetMatched && <Tag color="amber">{isPresetMatched.emoji} {isPresetMatched.name}</Tag>}
          </div>
          {/* 显示这次训练的结构提示（如果有） */}
          {isPresetMatched?.framework && (
            <div className="flex flex-wrap items-center gap-1 mb-3">
              <span className="text-[10px] text-stone-500 tracking-wider uppercase font-bold mr-1">结构</span>
              {isPresetMatched.framework.map((f, i) => (
                <React.Fragment key={i}>
                  <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold tracking-wider" style={{borderRadius:'2px'}}>{f}</span>
                  {i < isPresetMatched.framework.length - 1 && <span className="text-amber-700 text-[10px] font-bold">→</span>}
                </React.Fragment>
              ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-[#A30236] text-2xl tabular-nums leading-none">{totalTopics}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">题数</div>
            </div>
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-stone-900 text-2xl tabular-nums leading-none">{formatTime(sessionDuration)}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">总时长</div>
            </div>
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-stone-900 text-2xl tabular-nums leading-none">{avgPerTopic}s</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">平均每题</div>
            </div>
            <div className="border border-stone-200 p-3" style={{borderRadius:'3px'}}>
              <div className={`font-display font-bold text-2xl tabular-nums leading-none ${skipCount > 3 ? 'text-amber-600' : 'text-stone-900'}`}>{skipCount}</div>
              <div className="text-[10px] tracking-[0.16em] uppercase text-stone-500 mt-1 font-semibold">跳过次数</div>
            </div>
          </div>
          {goalPct !== null && (
            <div className="mb-3">
              <div className="flex justify-between text-[11px] text-stone-600 mb-1">
                <span>目标完成度</span>
                <span className="font-bold">{goalPct}%</span>
              </div>
              <div className="h-2 bg-stone-200 overflow-hidden" style={{borderRadius:'2px'}}>
                <div className={`h-full ${goalPct >= 95 ? 'bg-emerald-500' : goalPct >= 50 ? 'bg-[#A30236]' : 'bg-amber-500'}`} style={{width:`${goalPct}%`}}/>
              </div>
            </div>
          )}
          {/* 一句话点评 */}
          <div className="bg-stone-50 px-3 py-2 text-[12px] text-stone-700 leading-relaxed" style={{borderRadius:'2px'}}>
            {goalPct !== null && goalPct >= 95 ? (
              <>✓ <span className="font-bold text-emerald-700">完成训练目标</span> · 共练 {totalTopics} 题 · 平均每题 {avgPerTopic}s</>
            ) : skipCount > totalTopics / 3 ? (
              <>⚠ 跳过太多（{skipCount}/{totalTopics}）· 下次试着"硬着头皮讲"，逃避是杀手</>
            ) : (
              <>👏 这次练了 <span className="font-bold text-[#A30236]">{totalTopics}</span> 题 · 用 {formatTime(sessionDuration)} · 平均节奏 {avgPerTopic}s/题</>
            )}
          </div>
        </Card>

        {/* 题目流水 */}
        {totalTopics > 0 && (
          <Card className="p-4 mt-3">
            <div className="text-xs text-stone-500 font-medium mb-2 tracking-wider">
              题目流水（{totalTopics} 题）
            </div>
            <div className="space-y-1.5 max-h-72 overflow-y-auto text-sm">
              {topicsHistory.map((h, i) => (
                <div key={i} className="flex items-baseline gap-2 text-stone-700">
                  <span className="text-stone-400 tabular-nums text-xs shrink-0 w-5">{String(i + 1).padStart(2, '0')}</span>
                  <span className="text-stone-400 tabular-nums text-xs shrink-0">{formatTime(h.at)}</span>
                  <span className="flex-1">{h.topic}</span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </>
    );
    return <DoneView
      blob={rec.blob}
      contextLabel={`无限模式 · ${isPresetMatched ? isPresetMatched.name + ' · ' : ''}${totalTopics} 题 · ${formatTime(sessionDuration)}`}
      duration={sessionDuration}
      onRetry={begin}
      onNew={resetAll}
      extra={trainingReport}
    />;
  }

  // config stage
  return (
    <div className="space-y-4 fade-in">
      {/* 训练计划库 —— 一键应用预设 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>·</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">训练计划</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-2 text-stone-900">选一套预设 · 一键开练</h3>
        <p className="text-[11px] text-stone-500 mb-4 leading-relaxed">
          {SESSION_PRESETS.length} 套训练 · 涵盖基础节奏 / 极短钩子 / 框架结构 / 深度反向 / 议题专训。下方还可手动微调。
        </p>
        {SESSION_PRESET_GROUPS.map(grp => (
          <div key={grp.id} className="mb-4 last:mb-0">
            <div className="flex items-baseline gap-2 mb-1.5">
              <span className="text-[11px] tracking-[0.18em] uppercase font-bold text-stone-800">{grp.label}</span>
              <span className="text-[10px] text-stone-400">· {grp.blurb}</span>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {grp.presets.map(p => {
                const active = activePresetId === p.id;
                const hasStruct = !!(p.framework || p.tip);
                return (
                  <button key={p.id} onClick={() => applyPreset(p)}
                    className={`text-left p-3 border-2 transition-all relative ${
                      active ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
                    }`}
                    style={{borderRadius:'3px'}}
                  >
                    <div className="flex items-center gap-1.5 mb-1">
                      <span className="text-base">{p.emoji}</span>
                      <span className="font-semibold text-sm">{p.name}</span>
                      {hasStruct && (
                        <span className="ml-auto text-[8px] tracking-wider font-bold px-1 py-0.5 bg-amber-100 text-amber-800" style={{borderRadius:'2px'}}>带提示</span>
                      )}
                    </div>
                    <div className="text-[10px] text-stone-500 leading-snug">{p.desc}</div>
                    {p.framework && (
                      <div className="flex flex-wrap gap-0.5 mt-1.5">
                        {p.framework.map((f, i) => (
                          <span key={i} className="text-[9px] bg-stone-100 text-stone-700 px-1 py-0.5 font-medium" style={{borderRadius:'2px'}}>{f}</span>
                        ))}
                      </div>
                    )}
                    <div className="text-[10px] text-[#A30236] mt-1.5 font-bold tracking-wider">{p.sessionMin} MIN · {p.intervalSec}s/题</div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </Card>

      {/* 总训练时长 */}
      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>01</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">总训练时长</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-3 text-stone-900">这次练多久</h3>
        <div className="grid grid-cols-3 gap-2 mb-3">
          {SESSION_TIME_PRESETS.map(d => (
            <button key={d.value} onClick={() => { setUseCustomSession(false); setSessionLimitMin(d.value); setActivePresetId(null); }}
              className={`text-left p-3 border-2 transition-all ${
                !useCustomSession && sessionLimitMin === d.value ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
              }`}
              style={{ borderRadius: '3px' }}
            >
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="text-[10px] text-stone-500 mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
        <div onClick={() => { setUseCustomSession(true); setActivePresetId(null); }}
          className={`p-3 border-2 transition-all flex items-center gap-2 flex-wrap cursor-pointer ${
            useCustomSession ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200'
          }`}
          style={{ borderRadius: '3px' }}
        >
          <Icon name="settings" size={14} />
          <span className="font-semibold text-sm whitespace-nowrap">自定义</span>
          <input
            type="number" min="1" max="180" value={customSessionMin}
            onClick={e => { e.stopPropagation(); setUseCustomSession(true); setActivePresetId(null); }}
            onChange={e => { setUseCustomSession(true); setCustomSessionMin(e.target.value); setActivePresetId(null); }}
            className="w-16 px-2 py-1 border border-stone-300 text-center text-sm focus:outline-none focus:border-[#A30236]"
            style={{ borderRadius: '2px' }}
          />
          <span className="text-stone-500 text-sm">分钟</span>
        </div>
        {effectiveSessionLimitSec > 0 && estimatedTopicCount && (
          <div className="mt-3 text-[12px] text-stone-700 bg-stone-50 px-3 py-2" style={{borderRadius:'2px'}}>
            预计能练 <span className="font-bold text-[#A30236]">{estimatedTopicCount}</span> 题 ·
            到时间自动停 · 进度条会显示剩余
          </div>
        )}
        {effectiveSessionLimitSec === 0 && (
          <div className="mt-3 text-[12px] text-stone-500 bg-stone-50 px-3 py-2" style={{borderRadius:'2px'}}>
            不限时长 · 手动按"结束"才停（适合无所事事的自由训练）
          </div>
        )}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>02</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">每题时长</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-3 text-stone-900">题目之间多久切换</h3>
        <div className="grid grid-cols-2 gap-2 mb-3">
          {ENDLESS_INTERVALS.map(d => (
            <button key={d.value} onClick={() => { setUseCustom(false); setIntervalSec(d.value); }}
              className={`text-left p-3 border-2 transition-all ${
                !useCustom && intervalSec === d.value ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
              }`}
              style={{ borderRadius: '3px' }}
            >
              <div className="font-semibold text-sm">{d.label}</div>
              <div className="text-xs text-stone-500 mt-0.5">{d.desc}</div>
            </button>
          ))}
        </div>
        <div onClick={() => setUseCustom(true)}
          className={`p-3 border-2 transition-all flex items-center gap-2 flex-wrap cursor-pointer ${
            useCustom ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200'
          }`}
          style={{ borderRadius: '3px' }}
        >
          <Icon name="settings" size={14} />
          <span className="font-semibold text-sm whitespace-nowrap">自定义</span>
          <input
            type="number" min="5" max="600" value={customInterval}
            onClick={e => { e.stopPropagation(); setUseCustom(true); }}
            onChange={e => { setUseCustom(true); setCustomInterval(e.target.value); }}
            className="w-16 px-2 py-1 border border-stone-300 text-center text-sm focus:outline-none focus:border-[#A30236]"
            style={{ borderRadius: '2px' }}
          />
          <span className="text-stone-500 text-sm">秒/题</span>
        </div>
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>03</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">题目池</span>
        </div>
        <h3 className="font-display font-bold text-lg mb-3 text-stone-900">从哪儿抽题</h3>
        {/* 精选混合 —— 推荐 */}
        <button onClick={() => setSource(ALL_SOURCE)}
          className={`w-full mb-3 p-3 text-left transition-all border-2 ${
            source === ALL_SOURCE ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
          }`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2">
            <Icon name="refresh" size={14} className={source === ALL_SOURCE ? 'text-[#A30236]' : 'text-stone-500'} />
            <span className="font-semibold text-sm">精选混合</span>
            <Tag color="amber">{getDefaultTopicsPool().length}+ 题</Tag>
            <span className="ml-auto text-[10px] text-stone-500">推荐</span>
          </div>
          <div className="text-[11px] text-stone-500 mt-0.5">已排除泛情感、闲聊、脑洞、生活问答；更贴近你的长期议题。</div>
        </button>
        <div className="text-xs text-stone-500 mb-2 font-medium tracking-wider uppercase">或按类别</div>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {Object.entries(TOPIC_TYPES).map(([k, v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-2.5 py-1.5 text-sm transition-all ${
                source === k ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {k} <span className="opacity-60 text-xs">· {v.topics.length}</span>
            </button>
          ))}
        </div>
        <div className="text-xs text-stone-500 mb-2 font-medium tracking-wider uppercase">5 个长期议题</div>
        <div className="flex flex-wrap gap-1.5">
          {Object.entries(ISSUES).map(([k, v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-2.5 py-1.5 text-sm transition-all ${
                source === k ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}
              style={{ borderRadius: '2px' }}
            >
              {k} <span className="opacity-60 text-xs">· {v.topics.length}</span>
            </button>
          ))}
        </div>
        {/* AI 实时生成已经砍掉 · 跟 ImprovMode 同理 · 精选题池随机抽足够覆盖 */}
      </Card>

      <Card className="p-5">
        <div className="flex items-center gap-2 mb-3">
          <span className="stat-num" style={{ fontSize: '18px' }}>04</span>
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson">规则确认</span>
        </div>
        <ul className="text-sm text-stone-700 space-y-1.5 leading-relaxed mb-4">
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>训练总时长 <span className="font-bold text-[#A30236]">{effectiveSessionLimitSec === 0 ? '不限' : `${Math.round(effectiveSessionLimitSec/60)} 分钟`}</span>{estimatedTopicCount && ` · 预计 ${estimatedTopicCount} 题`}</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>每 <span className="font-bold text-[#A30236]">{effectiveInterval}</span> 秒自动切下一题</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>摄像头开启 · 全程一段录像</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>最近 5 题不会重复出现 · 跳过次数会进训练报告</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>到时间自动停 · 也能手动"结束"</li>
          <li className="flex items-baseline gap-2"><span className="text-[#A30236] shrink-0">▍</span>结束后给训练报告：题数 / 平均节奏 / 跳过统计</li>
        </ul>
        <div className="flex items-center justify-end gap-2 flex-wrap">
          {cam.error && <span className="text-xs text-red-600 self-center">{cam.error}</span>}
          <Btn variant="primary" size="md" onClick={begin}>
            <Icon name="play" size={14} />开始训练
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ============ Settings Panel ============
