import { Icon } from '../components/icons.jsx';
import { ISSUES, TOPIC_TYPES } from '../data/topics.jsx';
import { pickRandom } from '../lib/utils.jsx';
import { deepseekGenerateTopics } from '../lib/deepseek.jsx';
import { useSettings } from '../settings-context.jsx';
import { useCamera } from '../hooks/use-camera.jsx';
import { useRecorder } from '../hooks/use-recorder.jsx';
import { Btn, Card, Tag, RecordingModeChooser } from '../components/ui.jsx';
import { ReadyOverlay, CameraFrame, PracticeStageOverlay, BeautyButton, AudienceViewButton } from '../components/camera-ui.jsx';
import { AI_SOURCE, ALL_SOURCE, FAVORITE_SOURCE, getDefaultTopicsPool, findTopicSourceKey, pickAdaptiveTopic } from '../lib/topic-pools.jsx';
import { DoneView } from '../components/review.jsx';
import { TopicPreferenceControls } from '../components/topic-controls.jsx';
import { useState, useEffect, useRef, useMemo, useCallback } from '../react-hooks.jsx';
import { normalizeTopicPreferences } from '../topic-preferences.mjs';

export const DURATIONS = [
  { value: 30, label: '30s 钩动', desc: '极致钩子，逼你前 3 秒就抓人' },
  { value: 60, label: '60s 单点', desc: '一个观点讲清楚' },
  { value: 180, label: '3min 完整', desc: '一条完整的短视频' },
  { value: 0, label: '自由', desc: '不限时长，自己手动停' },
];

export const ImprovMode = ({ intent, clearIntent }) => {
  const [stage, setStage] = useState('config');
  const [duration, setDuration] = useState(60);
  const [customDuration, setCustomDuration] = useState(90);
  const [useCustom, setUseCustom] = useState(false);
  const [source, setSource] = useState(ALL_SOURCE);   // 默认从精选池里抽
  // 从首页 HERO 一键进来 → 进入「速记模式」：渲染极简 QuickStartView 而不是 3 屏 config
  const [quickMode, setQuickMode] = useState(false);
  const [presetTake, setPresetTake] = useState(false); // true = 「明天预订」进来的 · 题目是承诺不可换
  // 当从 intent 强行指定 topic 时（比如「明天的话题」），抑制 source useEffect 抢占一次
  const skipNextSourceDrawRef = useRef(false);
  const [topic, setTopic] = useState('');
  const [preCount, setPreCount] = useState(3);
  const [timeLeft, setTimeLeft] = useState(0);
  const [aiTheme, setAiTheme] = useState('');
  const [aiPool, setAiPool] = useState([]);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
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

  // 接住 intent 意图：
  // - 'quick30'                      → 速练 + 全题库随机
  // - { type:'preset', topic:'xxx' } → 指定题目（明天的话题用）
  // 时长跟随每日目标（默认 30s）：速练的承诺是「录完就能打卡」·
  // 用户把目标调到 60s/90s 时 · 速练时长自动跟上 · 不再出现「练完却不计入」
  // 不在 useEffect 里调 cam.start() · 那会丢失 iOS 的 user-gesture 链
  // 用户在 QuickStartView 里点「立即开练」时 begin() 才被触发 · gesture 链完整
  const goalDuration = Math.max(30, settings.dailyGoal?.durationSec || 30);
  useEffect(() => {
    if (intent === 'quick30') {
      setDuration(goalDuration);
      setUseCustom(false);
      setSource(ALL_SOURCE);
      setQuickMode(true);
      setPresetTake(false);
      clearIntent && clearIntent();
    } else if (intent && intent.type === 'preset' && intent.topic) {
      setDuration(goalDuration);
      setUseCustom(false);
      setPresetTake(true);
      // 关键：先开抑制 flag · 再 setSource · 这样 source useEffect 不会覆盖我们的 topic
      skipNextSourceDrawRef.current = true;
      setSource(ALL_SOURCE);
      setTopic(intent.topic);
      setQuickMode(true);
      clearIntent && clearIntent();
    }
  }, [intent, clearIntent, goalDuration]);

  const generateAI = async () => {
    if (!aiTheme.trim()) return;
    setAiLoading(true);
    setAiError('');
    try {
      const topics = await deepseekGenerateTopics({ apiKey: settings.apiKey, theme: aiTheme.trim(), count: 6 });
      setAiPool(topics);
      setSource(AI_SOURCE);
      if (topics.length) setTopic(topics[0]);
    } catch (e) {
      setAiError(e.message);
    } finally {
      setAiLoading(false);
    }
  };

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

  // 「速记」模式 · 跳过 3 屏 config 直接给一张「题目 + 立即开练」卡
  // 两种入口共用这张卡（时长都跟随每日目标）：
  //   速记 · 首页 HERO 进来 · 全题库随机 · 可换一题
  //   预订 · 「明天的话题」进来 · 题目已经写好 · 不显示换一题
  if (stage === 'config' && quickMode) {
    const isPresetTake = presetTake;
    return (
      <div className="fade-in py-4">
        <div className="eyebrow eyebrow--crimson mb-2" style={{fontSize:'10px'}}>
          {isPresetTake ? '今天的预订 · 你昨天给自己选的' : `${effectiveDuration} 秒速记 · 从首页一键进入`}
        </div>
        <h1 className="font-display font-bold text-stone-900 m-0 mb-1 leading-[1.1] tracking-tight" style={{fontSize:'22px'}}>
          {topic ? (isPresetTake ? '今天要讲这个' : '抽到这一题') : '抽题中...'}
        </h1>
        <p className="text-[11px] text-stone-500 mb-5 leading-tight">
          {isPresetTake ? `一题一录 · ${effectiveDuration} 秒 · 这是你给自己的承诺` : '从精选池随机 · 不喜欢可换'}
        </p>

        <div className="border-l-[3px] border-[#A30236] bg-white border-y border-r border-stone-200 p-5 mb-5 relative">
          <div className="absolute top-3 right-3 w-7 h-7 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
            <Icon name="target" size={14} strokeWidth={1.7}/>
          </div>
          <div className="text-[10px] text-[#A30236] mb-2 font-medium tracking-[0.12em] uppercase">
            {isPresetTake ? '昨天预订的题目' : `精选混合 · ${totalDefaultTopics}+ 题`}
          </div>
          <div className="font-display font-bold text-stone-900 leading-snug text-[20px] mt-1 pr-8">
            {topic || '...'}
          </div>
          {!isPresetTake && (
            <TopicPreferenceControls topic={topic} sourceKey={topicSourceKey} onHide={drawTopic} compact />
          )}
        </div>

        <RecordingModeChooser compact className="mb-4" />

        <Btn variant="primary" size="lg" onClick={begin} disabled={!topic} className="w-full mb-3">
          <Icon name="rec" size={16} strokeWidth={1.8}/> 立即开练 · {effectiveDuration} 秒
        </Btn>

        {cam.error && <div className="text-red-600 text-xs mb-3 text-center">{cam.error}</div>}

        <div className="flex items-center justify-between text-[12px] mt-4 pt-4 border-t border-stone-200">
          {/* 预订题目隐藏「换一题」· 不能换 · 这是承诺 */}
          {isPresetTake ? (
            <span className="text-stone-400 italic">题目你已经承诺过了 · 不换</span>
          ) : (
            <button onClick={drawTopic} className="text-stone-600 hover:text-[#A30236] flex items-center gap-1.5 transition-colors">
              <Icon name="refresh" size={12} strokeWidth={1.8}/> 换一题
            </button>
          )}
          <button onClick={() => setQuickMode(false)} className="text-stone-400 hover:text-stone-700 transition-colors">
            完整配置 →
          </button>
        </div>
      </div>
    );
  }

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

  // config stage
  return (
    <div className="space-y-6 fade-in">
      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="clock" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">STEP 01</div>
            <div className="font-display font-bold text-[#A30236] text-[13px] leading-none mt-0.5">第一步 · 选时长</div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2.5 mb-3">
          {DURATIONS.map(d => (
            <button key={d.value} onClick={() => { setUseCustom(false); setDuration(d.value); }}
              className={`text-left p-4 rounded-xl border-2 transition-all ${
                !useCustom && duration === d.value ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
              }`}>
              <div className="font-semibold">{d.label}</div>
              <div className="text-xs text-stone-500 mt-1">{d.desc}</div>
            </button>
          ))}
        </div>
        <div onClick={() => setUseCustom(true)}
          className={`p-4 rounded-xl border-2 transition-all flex items-center gap-3 flex-wrap cursor-pointer ${
            useCustom ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
          }`}>
          <div className="font-semibold whitespace-nowrap">⚙ 自定义</div>
          <input
            type="number" min="5" max="600" value={customDuration}
            onClick={e => { e.stopPropagation(); setUseCustom(true); }}
            onChange={e => { setUseCustom(true); setCustomDuration(e.target.value); }}
            className="w-20 px-2 py-1 border border-stone-300 rounded text-center text-sm focus:outline-none focus:border-amber-400"
          />
          <span className="text-stone-500 text-sm">秒</span>
          <div className="text-xs text-stone-500 ml-auto whitespace-nowrap">想练多久就多久</div>
        </div>
      </Card>

      <RecordingModeChooser className="mb-6" />

      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="list" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">STEP 02</div>
            <div className="font-display font-bold text-[#A30236] text-[13px] leading-none mt-0.5">第二步 · 话题来源</div>
          </div>
        </div>
        {/* 精选混合抽 —— 默认选项 */}
        <button onClick={() => setSource(ALL_SOURCE)}
          className={`w-full mb-4 p-3 text-left transition-all border-2 ${
            source === ALL_SOURCE ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
          }`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2">
            <Icon name="refresh" size={14} className={source === ALL_SOURCE ? 'text-[#A30236]' : 'text-stone-500'} />
            <span className="font-semibold text-sm">精选混合</span>
            <Tag color="amber">{totalDefaultTopics}+ 题</Tag>
            <span className="ml-auto text-[10px] text-stone-500">推荐 · 更贴近你的长期议题</span>
          </div>
          <div className="text-xs text-stone-500 mt-1">已排除泛情感、闲聊、脑洞、生活问答；保留观点、小红书、职业、金钱和长期议题。</div>
        </button>

        {favoriteTopics.length > 0 && (
          <button
            onClick={() => setSource(FAVORITE_SOURCE)}
            className={`w-full mb-4 p-3 text-left transition-all border ${
              source === FAVORITE_SOURCE ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 bg-white hover:border-[#A30236]'
            }`}
            style={{borderRadius:'3px'}}
          >
            <div className="flex items-center gap-2">
              <Icon name="heart" size={14} className="text-[#A30236]" />
              <span className="font-semibold text-sm">我的收藏</span>
              <Tag color="amber">{favoriteTopics.length} 题</Tag>
              <span className="ml-auto text-[10px] text-stone-500">只练你留下来的题</span>
            </div>
          </button>
        )}

        <div className="mb-3 text-xs text-stone-500 font-medium tracking-wider uppercase">通用类别</div>
        <div className="flex flex-wrap gap-2 mb-5">
          {Object.entries(TOPIC_TYPES).map(([k,v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                source === k ? 'bg-stone-900 text-amber-300' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}>
              {k} <span className="text-xs opacity-60">· {v.topics.length}</span>
            </button>
          ))}
        </div>
        <div className="mb-3 text-xs text-stone-500 font-medium tracking-wider uppercase">你的 5 个长期议题</div>
        <div className="flex flex-wrap gap-2">
          {Object.entries(ISSUES).map(([k,v]) => (
            <button key={k} onClick={() => setSource(k)}
              className={`px-3 py-2 rounded-lg text-sm transition-all ${
                source === k ? 'bg-stone-900 text-amber-300' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'
              }`}>
              {k} <span className="text-xs opacity-60">· {v.topics.length}</span>
            </button>
          ))}
        </div>

        {/* AI 选题（输入主题 → 生成 6 题）已经砍掉。
            第一性原理：「不知道讲什么」的痛点 · 用精选题池随机抽 1 步就能解
            AI 选题要 4 步：想主题 → 输入 → 等 → 挑一条。本末倒置。
            想练特定主题的高级用户可以用提词器模式自己写。 */}
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="target" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">STEP 03</div>
            <div className="font-display font-bold text-[#A30236] text-[13px] leading-none mt-0.5">第三步 · 抽到的话题</div>
          </div>
        </div>
        <div className="border-l-[3px] border-[#A30236] bg-white border-y border-r border-stone-200 p-5 mb-4 relative">
          <div className="absolute top-3 right-3 w-7 h-7 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="target" size={14} strokeWidth={1.7}/>
          </div>
          <div className="text-[10px] text-[#A30236] mb-2 font-medium tracking-[0.12em] uppercase">
            {source === AI_SOURCE ? `AI 生成 · 主题：${aiTheme}`
              : source === ALL_SOURCE ? `精选混合 · ${totalDefaultTopics}+ 题随机`
              : source === FAVORITE_SOURCE ? `我的收藏 · ${favoriteTopics.length} 题`
              : `${source} · ${allSources[source]?.blurb}`}
          </div>
          <div className="font-display font-bold text-stone-900 leading-snug text-[18px] mt-1">{topic || '...'}</div>
          <TopicPreferenceControls topic={topic} sourceKey={topicSourceKey} onHide={drawTopic} />
        </div>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <Btn variant="ghost" onClick={drawTopic} disabled={source === AI_SOURCE && !aiPool.length}><Icon name="refresh" size={14}/> 换一题</Btn>
          <div className="flex gap-3">
            {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
            <Btn variant="primary" size="lg" onClick={begin} disabled={!topic}>开始录制 →</Btn>
          </div>
        </div>
      </Card>
    </div>
  );
};

// ============ Mode 2: 提词器 ============
// 关键词模板：内置 10 套常用骨架 + 用户保存的自定义模板
