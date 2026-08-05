import { Icon } from '../components/icons.jsx';
import { ISSUES, TOPIC_TYPES } from '../data/topics.jsx';
import { pickRandom } from '../lib/utils.jsx';
import { useSettings } from '../settings-context.jsx';
import { useCamera } from '../hooks/use-camera.jsx';
import { useRecorder } from '../hooks/use-recorder.jsx';
import { Btn, RecordingModeChooser } from '../components/ui.jsx';
import { ReadyOverlay, CameraFrame, PracticeStageOverlay, BeautyButton, AudienceViewButton } from '../components/camera-ui.jsx';
import { AI_SOURCE, ALL_SOURCE, FAVORITE_SOURCE, getDefaultTopicsPool, findTopicSourceKey, pickAdaptiveTopic } from '../lib/topic-pools.jsx';
import { DoneView } from '../components/review.jsx';
import { TopicPreferenceControls } from '../components/topic-controls.jsx';
import { useState, useEffect, useRef, useMemo, useCallback } from '../react-hooks.jsx';
import { normalizeTopicPreferences } from '../topic-preferences.mjs';

export const DURATIONS = [
  { value: 30, label: '30s', desc: '钩子' },
  { value: 60, label: '60s', desc: '单点' },
  { value: 180, label: '3min', desc: '完整' },
  { value: 0, label: '自由', desc: '自停' },
];

export const ImprovMode = ({ intent, clearIntent }) => {
  const [stage, setStage] = useState('config');
  // 默认 30s：跟产品「30 秒一条」承诺对齐 · 也跟默认打卡门槛一致
  const [duration, setDuration] = useState(30);
  const [customDuration, setCustomDuration] = useState(90);
  const [useCustom, setUseCustom] = useState(false);
  const [source, setSource] = useState(ALL_SOURCE);
  // 高级选项（题源 / 自定义时长）默认折叠 · 主路径一屏完成
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [presetTake, setPresetTake] = useState(false);
  const skipNextSourceDrawRef = useRef(false);
  const [topic, setTopic] = useState('');
  const [preCount, setPreCount] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [aiPool, setAiPool] = useState([]);
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  const effectiveDuration = useCustom ? Math.max(5, parseInt(customDuration) || 60) : duration;

  const allSources = useMemo(() => {
    const result = {};
    Object.entries(TOPIC_TYPES).forEach(([k,v]) => { result[k] = { ...v, kind: 'general' }; });
    Object.entries(ISSUES).forEach(([k,v]) => { result[k] = { ...v, kind: 'issue' }; });
    return result;
  }, []);

  const topicPreferences = useMemo(
    () => normalizeTopicPreferences(settings.topicPreferences),
    [settings.topicPreferences]
  );
  const favoriteTopics = topicPreferences.favoriteTopics;
  const totalDefaultTopics = useMemo(() => {
    const hidden = new Set(topicPreferences.hiddenTopics);
    return getDefaultTopicsPool().filter(item => !hidden.has(item)).length;
  }, [settings.topicPreferences]);
  const topicSourceKey = source === ALL_SOURCE || source === FAVORITE_SOURCE
    ? findTopicSourceKey(topic)
    : source === AI_SOURCE ? '' : source;

  const drawTopic = useCallback(() => {
    if (source === AI_SOURCE) {
      if (aiPool.length) setTopic(pickAdaptiveTopic(aiPool, settings.topicPreferences, topic));
      return;
    }
    if (source === FAVORITE_SOURCE) {
      if (favoriteTopics.length) setTopic(pickRandom(favoriteTopics, topic));
      return;
    }
    if (source === ALL_SOURCE) {
      setTopic(pickAdaptiveTopic(getDefaultTopicsPool(), settings.topicPreferences, topic));
      return;
    }
    const src = allSources[source];
    if (!src) return;
    setTopic(pickAdaptiveTopic(src.topics, settings.topicPreferences, topic));
  }, [source, topic, allSources, aiPool, favoriteTopics, settings.topicPreferences]);

  useEffect(() => {
    // intent 指定 topic 时跳过本轮自动抽题（避免覆盖 preset topic）
    if (skipNextSourceDrawRef.current) {
      skipNextSourceDrawRef.current = false;
      return;
    }
    if (source === AI_SOURCE) {
      if (aiPool.length) setTopic(pickAdaptiveTopic(aiPool, settings.topicPreferences));
      return;
    }
    if (source === FAVORITE_SOURCE) {
      if (favoriteTopics.length) setTopic(pickRandom(favoriteTopics));
      return;
    }
    if (source === ALL_SOURCE) {
      setTopic(pickAdaptiveTopic(getDefaultTopicsPool(), settings.topicPreferences));
      return;
    }
    drawTopic();
  /* eslint-disable-next-line */
  }, [source]);

  // 接住 intent：
  // - 'quick30'                      → 时长跟每日目标 · 精选池
  // - { type:'preset', topic:'xxx' } → 指定题目（明天的话题）
  // 不在 useEffect 里 cam.start() · 保留 iOS user-gesture 链到「立即开练」
  const goalDuration = Math.max(30, settings.dailyGoal?.durationSec || 30);
  useEffect(() => {
    if (intent === 'quick30') {
      setDuration(goalDuration);
      setUseCustom(false);
      setSource(ALL_SOURCE);
      setPresetTake(false);
      setAdvancedOpen(false);
      clearIntent && clearIntent();
    } else if (intent && intent.type === 'preset' && intent.topic) {
      setDuration(goalDuration);
      setUseCustom(false);
      setPresetTake(true);
      skipNextSourceDrawRef.current = true;
      setSource(ALL_SOURCE);
      setTopic(intent.topic);
      setAdvancedOpen(false);
      clearIntent && clearIntent();
    }
  }, [intent, clearIntent, goalDuration]);

  // 3-2-1 倒计时的 interval 放 ref · 组件卸载/中途退出时必须清掉，
  // 否则它会在卸载后照样触发 rec.start(s)（对着已释放的流开录，麦克风保持热启动）
  const preCountTimerRef = useRef(null);
  const clearPreCount = () => {
    if (preCountTimerRef.current) { clearInterval(preCountTimerRef.current); preCountTimerRef.current = null; }
  };
  useEffect(() => () => clearPreCount(), []);

  const begin = async () => {
    const s = await cam.start();
    if (!s) return;
    clearPreCount();
    setStage('ready');
    let n = 3;
    setPreCount(n);
    preCountTimerRef.current = setInterval(() => {
      n--;
      if (n >= 0) setPreCount(n);
      if (n < 0) {
        clearPreCount();
        setStage('recording');
        setTimeLeft(effectiveDuration || 0);
        rec.start(s);
      }
    }, 1000);
  };

  useEffect(() => {
    if (stage !== 'recording') return;
    if (effectiveDuration === 0) return;
    if (timeLeft <= 0) { finish(); return; }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [stage, timeLeft]);

  const finish = () => {
    clearPreCount();
    rec.stop();
    cam.stop();
    setStage('done');
  };
  const resetAll = () => { clearPreCount(); setStage('config'); cam.stop(); };
  const retrySame = async () => {
    rec.stop();
    await begin();
  };

  if (stage === 'ready') return <ReadyOverlay countdown={preCount} cam={cam} hint={topic} />;

  if (stage === 'recording') {
    const progress = effectiveDuration ? Math.max(0, timeLeft) / effectiveDuration : 0;
    const urgent = effectiveDuration && timeLeft <= 5 && timeLeft > 0;
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} cam={cam} className="w-full h-full" status="recording"
          overlay={
            <>
              <PracticeStageOverlay
                topic={topic}
                modeLabel="自由口播"
                elapsed={effectiveDuration ? Math.max(0, effectiveDuration - timeLeft) : rec.duration}
                duration={effectiveDuration}
                status={urgent ? 'ending' : 'recording'}
                onStop={finish}
              />
              {effectiveDuration > 0 && (
                <div className="absolute top-0 left-0 right-0 h-1 bg-stone-800/40">
                  <div className="h-full bg-[#A30236] transition-all duration-1000 ease-linear" style={{width: `${progress*100}%`}} />
                </div>
              )}
              <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-[#A30236] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold" style={{borderRadius:"2px"}}>
                    <span className="w-2 h-2 rounded-full bg-white pulse-rec" />REC
                  </div>
                  <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                </div>
                <div className="flex items-center gap-1.5">
                  <button onClick={() => { drawTopic(); setTimeLeft(effectiveDuration); }}
                    className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold"
                    style={{borderRadius:'2px'}}
                    title="换一道题，倒计时归零"
                  >
                    <Icon name="refresh" size={13} />换题
                  </button>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    return <DoneView
      blob={rec.blob}
      contextLabel={`话题：${topic}`}
      duration={rec.duration}
      onRetry={retrySame}
      onNew={() => { drawTopic(); resetAll(); }}
    />;
  }

  // ── 主路径一屏：题 + 时长 + 开练；高级选项折叠 ──
  const isPresetTake = presetTake;
  const sourceLabel = source === ALL_SOURCE
    ? `精选混合 · ${totalDefaultTopics}+ 题`
    : source === FAVORITE_SOURCE
      ? `我的收藏 · ${favoriteTopics.length} 题`
      : source === AI_SOURCE
        ? 'AI 题池'
        : `${source}`;

  return (
    <div className="kobo-page space-y-4">
      <div className="kobo-rise">
        <div className="text-[10px] font-bold uppercase text-[#A30236] tracking-[0.16em] mb-1">
          {isPresetTake ? '今天的预订' : '即兴练习 · 速练入口'}
        </div>
        <h2 className="font-display font-bold text-stone-950 text-[22px] leading-tight m-0">
          {topic ? (isPresetTake ? '今天要讲这个' : '抽到这一题') : '抽题中…'}
        </h2>
        <p className="text-[12px] text-stone-500 mt-1">
          {isPresetTake
            ? `一题一录 · ${effectiveDuration || '自由'} 秒 · 你昨天的承诺`
            : '一屏搞定 · 不喜欢就换题'}
        </p>
      </div>

      {/* 题目卡 */}
      <div
        className="kobo-rise kobo-surface border-l-[3px] border-[#A30236] bg-white border-y border-r border-stone-200 p-4 relative"
        style={{ borderRadius: '10px', animationDelay: '40ms' }}
      >
        <div className="text-[10px] text-[#A30236] mb-2 font-bold tracking-[0.12em] uppercase">
          {isPresetTake ? '昨天预订的题目' : sourceLabel}
        </div>
        <div className="font-display font-bold text-stone-900 leading-snug text-[18px] pr-2">
          {topic || '…'}
        </div>
        {!isPresetTake && (
          <div className="mt-3">
            <TopicPreferenceControls topic={topic} sourceKey={topicSourceKey} onHide={drawTopic} compact />
          </div>
        )}
      </div>

      {/* 时长：一行四选 */}
      <div className="kobo-rise" style={{ animationDelay: '80ms' }}>
        <div className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.14em] mb-2">时长</div>
        <div className="grid grid-cols-4 gap-1.5">
          {DURATIONS.map(d => {
            const on = !useCustom && duration === d.value;
            return (
              <button
                key={d.value}
                type="button"
                onClick={() => { setUseCustom(false); setDuration(d.value); }}
                className={`kobo-press py-2.5 text-center border transition-colors ${
                  on
                    ? 'border-[#A30236] bg-[#FBEFF2] text-[#A30236]'
                    : 'border-stone-200 bg-white text-stone-700 hover:border-stone-300'
                }`}
                style={{ borderRadius: '8px' }}
              >
                <div className="font-display font-bold text-[14px] leading-none">{d.label}</div>
                <div className="text-[9px] mt-1 opacity-70">{d.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      <RecordingModeChooser compact className="kobo-rise" />

      <Btn
        variant="primary"
        size="lg"
        onClick={begin}
        disabled={!topic}
        className="kobo-rise w-full"
      >
        <Icon name="rec" size={16} strokeWidth={1.8} />
        {effectiveDuration ? `立即开练 · ${effectiveDuration} 秒` : '立即开练 · 自由时长'}
      </Btn>

      {cam.error && (
        <div className="text-red-600 text-xs text-center">{cam.error}</div>
      )}

      <div className="kobo-rise flex items-center justify-between text-[12px] pt-1">
        {isPresetTake ? (
          <span className="text-stone-400">题目已承诺 · 不换</span>
        ) : (
          <button
            type="button"
            onClick={drawTopic}
            disabled={source === AI_SOURCE && !aiPool.length}
            className="kobo-press text-stone-600 hover:text-[#A30236] flex items-center gap-1.5 disabled:opacity-40"
          >
            <Icon name="refresh" size={12} strokeWidth={1.8} /> 换一题
          </button>
        )}
        <button
          type="button"
          onClick={() => setAdvancedOpen(v => !v)}
          className="kobo-press text-stone-400 hover:text-stone-700"
        >
          {advancedOpen ? '收起高级选项' : '高级选项'}
        </button>
      </div>

      {advancedOpen && (
        <div className="kobo-rise space-y-3 pt-1 border-t border-stone-200">
          <div>
            <div className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.14em] mb-2">自定义时长</div>
            <div
              className={`p-3 border flex items-center gap-2 flex-wrap ${
                useCustom ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 bg-white'
              }`}
              style={{ borderRadius: '8px' }}
            >
              <span className="text-[12px] font-semibold text-stone-700">秒数</span>
              <input
                type="number"
                min="5"
                max="600"
                value={customDuration}
                onChange={e => { setUseCustom(true); setCustomDuration(e.target.value); }}
                onFocus={() => setUseCustom(true)}
                className="w-20 px-2 py-1.5 border border-stone-300 text-center text-sm focus:outline-none focus:border-[#A30236]"
                style={{ borderRadius: '6px' }}
              />
              <span className="text-[11px] text-stone-500">5–600 秒</span>
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold uppercase text-stone-400 tracking-[0.14em] mb-2">题源</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              <button
                type="button"
                onClick={() => setSource(ALL_SOURCE)}
                className={`kobo-press px-2.5 py-1.5 text-[12px] border ${
                  source === ALL_SOURCE ? 'border-[#A30236] bg-[#FBEFF2] text-[#A30236] font-bold' : 'border-stone-200 bg-white text-stone-700'
                }`}
                style={{ borderRadius: '6px' }}
              >
                精选混合
              </button>
              {favoriteTopics.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSource(FAVORITE_SOURCE)}
                  className={`kobo-press px-2.5 py-1.5 text-[12px] border ${
                    source === FAVORITE_SOURCE ? 'border-[#A30236] bg-[#FBEFF2] text-[#A30236] font-bold' : 'border-stone-200 bg-white text-stone-700'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  收藏 · {favoriteTopics.length}
                </button>
              )}
            </div>
            <div className="text-[10px] text-stone-400 mb-1.5">通用类别</div>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {Object.entries(TOPIC_TYPES).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSource(k)}
                  className={`kobo-press px-2.5 py-1.5 text-[11px] border ${
                    source === k ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 bg-stone-50 text-stone-700'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  {k} · {v.topics.length}
                </button>
              ))}
            </div>
            <div className="text-[10px] text-stone-400 mb-1.5">长期议题</div>
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(ISSUES).map(([k, v]) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setSource(k)}
                  className={`kobo-press px-2.5 py-1.5 text-[11px] border ${
                    source === k ? 'bg-stone-900 text-white border-stone-900' : 'border-stone-200 bg-stone-50 text-stone-700'
                  }`}
                  style={{ borderRadius: '6px' }}
                >
                  {k} · {v.topics.length}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// ============ Mode 2: 提词器 ============
// 关键词模板：内置 10 套常用骨架 + 用户保存的自定义模板
