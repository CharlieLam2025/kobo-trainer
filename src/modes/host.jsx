import { Icon } from '../components/icons.jsx';
import { ISSUES } from '../data/topics.jsx';
import { HOST_QUESTIONS } from '../data/host-questions.jsx';
import { formatTime } from '../lib/utils.jsx';
import { deepseekHostFollowup } from '../lib/deepseek.jsx';
import { useSettings } from '../settings-context.jsx';
import { useCamera } from '../hooks/use-camera.jsx';
import { useRecorder } from '../hooks/use-recorder.jsx';
import { Btn, Card, Tag } from '../components/ui.jsx';
import { CameraFrame, BeautyButton, AudienceViewButton } from '../components/camera-ui.jsx';
import { DoneView } from '../components/review.jsx';
import { useState, useEffect, useRef, useMemo, useCallback } from '../react-hooks.jsx';

export const HostMode = () => {
  const [stage, setStage] = useState('config'); // config | running | done
  const [topic, setTopic] = useState('');
  const [customTopic, setCustomTopic] = useState('');
  const [turns, setTurns] = useState([]); // {role:'host'|'me', text, time}
  const [usedQs, setUsedQs] = useState({ opening: [], followup: [], closing: [] });
  const [recognition, setRecognition] = useState(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState('');
  const [accumText, setAccumText] = useState('');
  const [aiMode, setAiMode] = useState(false);        // false = 静态题库; true = AI 跟问
  const [aiAutoFollow, setAiAutoFollow] = useState(true); // 豆包式：停顿即追问 + TTS
  const [aiVoice, setAiVoice] = useState(true);       // TTS 是否朗读 AI 问题
  const [aiThinking, setAiThinking] = useState(false);
  const [aiError, setAiError] = useState('');
  const silenceTimerRef = useRef(null);
  const lastSpokenRef   = useRef('');
  const listeningRef    = useRef(false);  // Web SR onend 闭包读 state 是旧值 · 用 ref
  const hostRecognitionRef = useRef(null);
  const hostSessionRef  = useRef(0);      // finish/reset 时 +1 · 迟到的 AI 回复不再追加到 turns
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  // TTS：让 AI 提问出声（用 Android WebView 自带的语音合成）
  const speak = useCallback((text) => {
    try {
      const synth = window.speechSynthesis;
      if (!synth || !text) return;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'zh-CN';
      u.rate = 1.05;
      u.pitch = 1.0;
      synth.speak(u);
    } catch {}
  }, []);

  const pickQ = (kind) => {
    const pool = HOST_QUESTIONS[kind];
    const used = usedQs[kind];
    const remaining = pool.filter(q => !used.includes(q));
    const q = (remaining.length ? remaining : pool)[Math.floor(Math.random() * (remaining.length || pool.length))];
    setUsedQs({ ...usedQs, [kind]: [...used, q] });
    return q;
  };

  const seedTopics = useMemo(() => {
    const all = [];
    Object.entries(ISSUES).forEach(([k,v]) => v.topics.slice(0,3).forEach(t => all.push({k, t})));
    return all;
  }, []);

  const startSession = async () => {
    const finalTopic = customTopic.trim() || topic;
    if (!finalTopic) return;
    const s = await cam.start();
    if (!s) return;
    const session = ++hostSessionRef.current;
    setStage('running');
    rec.start(s);
    setupRecognition();
    setAiError('');

    // 开场问题：AI 模式调 DeepSeek 拿一个跟主题强相关的开场；静态模式从题库抽
    // 注意：不再要求 settings.apiKey 非空 —— 默认「免费代理」配置 apiKey 就是 ''
    // （chatComplete 空 key 自动走代理），原判断导致代理用户的 AI 跟问永远静默降级
    if (aiMode) {
      setAiThinking(true);
      try {
        const opening = await deepseekHostFollowup({
          apiKey: settings.apiKey,
          topic: finalTopic,
          history: [],
          lastUserSaid: '',
          kind: 'opening',
        });
        if (session !== hostSessionRef.current) return;  // 用户已结束 → 丢弃迟到回复
        setTurns([{ role: 'host', text: opening || pickQ('opening'), time: 0 }]);
      } catch (e) {
        if (session !== hostSessionRef.current) return;
        setAiError(e.message);
        setTurns([{ role: 'host', text: pickQ('opening'), time: 0 }]);
      } finally {
        if (session === hostSessionRef.current) setAiThinking(false);
      }
    } else {
      setTurns([{ role: 'host', text: pickQ('opening'), time: 0 }]);
    }
  };

  const setupRecognition = async () => {
    // 优先用 Capacitor 原生插件（系统级 ASR，国产手机也能用）
    const cap = window.Capacitor;
    const nativeSR = cap?.Plugins?.SpeechRecognition;
    if (nativeSR && cap.isNativePlatform?.()) {
      try {
        const avail = await nativeSR.available();
        if (!avail?.available) throw new Error('native SR not available');
        const perm = await nativeSR.checkPermissions();
        if (perm?.speechRecognition !== 'granted') {
          const req = await nativeSR.requestPermissions();
          if (req?.speechRecognition !== 'granted') throw new Error('permission denied');
        }
        // 用 partialResults 事件流监听
        const handler = (data) => {
          // data.matches 是字符串数组，最可信的是第 0 个
          const text = (data?.matches?.[0] || '').trim();
          if (!text) return;
          // 原生 ASR 返回的是累计文本；我们把它当作 interim，停下时再 finalize
          setInterim(text);
        };
        await nativeSR.removeAllListeners?.();
        nativeSR.addListener('partialResults', handler);
        // listening 状态：监听结束（语音断开）时把 interim → accumText 并自动重启
        const endHandler = () => {
          setInterim(prevInterim => {
            if (prevInterim) setAccumText(prevAcc => (prevAcc ? prevAcc + ' ' : '') + prevInterim);
            return '';
          });
          // 自动重启 —— 必须先确认用户没按「结束」（否则 200ms 后麦克风又被偷偷打开）
          if (!listeningRef.current) return;
          setTimeout(() => {
            if (!listeningRef.current) return;
            try {
              nativeSR.start({
                language: 'zh-CN',
                maxResults: 2,
                partialResults: true,
                popup: false,
              });
            } catch {}
          }, 200);
        };
        nativeSR.addListener('listeningState', (s) => {
          if (s?.status === 'stopped') endHandler();
        });
        await nativeSR.start({
          language: 'zh-CN',
          maxResults: 2,
          partialResults: true,
          popup: false,
        });
        // 用 ref-like 容器伪装成 web SR，以便 finish 时统一 stop
        const wrapper = { _native: true, stop: async () => { listeningRef.current = false; try { await nativeSR.stop(); await nativeSR.removeAllListeners(); } catch {} } };
        hostRecognitionRef.current = wrapper;
        setRecognition(wrapper);
        listeningRef.current = true;
        setListening(true);
        return;
      } catch (e) {
        console.warn('[Native SR] fallback to Web Speech:', e?.message || e);
      }
    }

    // 浏览器 fallback：Web Speech API
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { return; }
    const r = new SR();
    r.continuous = true;
    r.interimResults = true;
    r.lang = 'zh-CN';
    r.onresult = (e) => {
      let interimT = '';
      let finalT = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t;
        else interimT += t;
      }
      if (finalT) setAccumText(prev => prev + finalT);
      setInterim(interimT);
    };
    // 浏览器 SR 会隔几秒自发 onend：用 ref 判断（闭包里的 listening 永远是 setup 时的旧值 false）
    r.onend = () => { if (listeningRef.current) try { r.start(); } catch {} };
    hostRecognitionRef.current = r;
    setRecognition(r);
    try { r.start(); listeningRef.current = true; setListening(true); } catch {}
  };

  const finishedSpeaking = async () => {
    const said = (accumText + ' ' + interim).trim();
    const finalTopic = customTopic.trim() || topic;
    // 把刚说的存进 turns
    const myTurn = said ? { role: 'me', text: said, time: rec.duration } : null;
    if (myTurn) setTurns(prev => [...prev, myTurn]);
    setAccumText('');
    setInterim('');

    const hostTurns = turns.filter(t => t.role === 'host').length;
    const nextKind = hostTurns >= 5 ? 'closing' : 'followup';

    // AI 模式：基于对话历史 + 刚说的话，让 DeepSeek 生成针对性追问
    // （空 key = 免费代理 · 不再额外要求 settings.apiKey）
    if (aiMode) {
      const session = hostSessionRef.current;
      setAiThinking(true);
      setAiError('');
      try {
        // 用当前 turns + 这一轮的 myTurn 作为历史
        const historyForAI = myTurn ? [...turns, myTurn] : turns;
        const userSaid = said || '（用户没说话）';
        const nextQ = await deepseekHostFollowup({
          apiKey: settings.apiKey,
          topic: finalTopic,
          history: historyForAI,
          lastUserSaid: userSaid,
          kind: nextKind,
        });
        // 等待期间用户按了「结束/重来」→ 丢弃 · 不再把新问题追加到已结束的对话，
        // 也不让 TTS 在总结页突然开口念题
        if (session !== hostSessionRef.current) return;
        setTurns(prev => [...prev, { role: 'host', text: nextQ || pickQ(nextKind), time: rec.duration }]);
      } catch (e) {
        if (session !== hostSessionRef.current) return;
        setAiError(e.message);
        // 失败回落静态题库
        setTurns(prev => [...prev, { role: 'host', text: pickQ(nextKind), time: rec.duration }]);
      } finally {
        if (session === hostSessionRef.current) setAiThinking(false);
      }
    } else {
      setTurns(prev => [...prev, { role: 'host', text: pickQ(nextKind), time: rec.duration }]);
    }
  };

  const finish = () => {
    hostSessionRef.current += 1;      // 作废进行中的 AI 请求
    listeningRef.current = false;     // 阻断 ASR 自动重启
    if (recognition) try { recognition.stop(); } catch {}
    setListening(false);
    try { window.speechSynthesis?.cancel(); } catch {}  // TTS 念到一半也停（原来只有 reset 停）
    rec.stop();
    cam.stop();
    // 把剩余的口述也存进 turns
    const said = (accumText + ' ' + interim).trim();
    if (said) setTurns(prev => [...prev, { role: 'me', text: said, time: rec.duration }]);
    setStage('done');
  };

  const reset = () => {
    hostSessionRef.current += 1;
    listeningRef.current = false;
    if (recognition) try { recognition.stop(); } catch {}
    setListening(false);
    setStage('config');
    setTurns([]);
    setUsedQs({ opening: [], followup: [], closing: [] });
    setAccumText('');
    setInterim('');
    setAiThinking(false);
    try { window.speechSynthesis?.cancel(); } catch {}
    cam.stop();
  };

  // 卸载兜底：整个组件被换掉时停 ASR + TTS（否则没有任何 UI 能再关掉它们）
  useEffect(() => () => {
    hostSessionRef.current += 1;
    listeningRef.current = false;
    if (hostRecognitionRef.current) { try { hostRecognitionRef.current.stop(); } catch {} hostRecognitionRef.current = null; }
    try { window.speechSynthesis?.cancel(); } catch {}
  }, []);

  // ===== 豆包式实时对话：停顿即触发追问 =====
  // 仅当：AI 跟问 + 实时模式 + 正在听 + 不在思考中 + 录制中 + 已有识别文本 时启动 1.8s 静音计时
  useEffect(() => {
    if (silenceTimerRef.current) {
      clearTimeout(silenceTimerRef.current);
      silenceTimerRef.current = null;
    }
    if (!aiMode || !aiAutoFollow) return;
    if (stage !== 'running' || !listening || aiThinking) return;
    const said = (accumText + ' ' + interim).trim();
    if (!said) return;
    silenceTimerRef.current = setTimeout(() => {
      finishedSpeaking();
    }, 1800);
    return () => {
      if (silenceTimerRef.current) {
        clearTimeout(silenceTimerRef.current);
        silenceTimerRef.current = null;
      }
    };
    // eslint-disable-next-line
  }, [accumText, interim, listening, aiMode, aiAutoFollow, aiThinking, stage]);

  // ===== TTS：每次新增 host turn 自动朗读（仅 AI 模式 + 语音开启）=====
  useEffect(() => {
    if (!aiMode || !aiVoice) return;
    if (!turns.length) return;
    const last = turns[turns.length - 1];
    if (last.role !== 'host') return;
    if (last.text === lastSpokenRef.current) return;
    lastSpokenRef.current = last.text;
    speak(last.text);
  }, [turns, aiMode, aiVoice, speak]);

  if (stage === 'running') {
    const currentQ = turns.length && turns[turns.length-1].role === 'host' ? turns[turns.length-1].text : '';
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950 fade-in" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} cam={cam} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 顶部 HUD */}
              <div className="absolute left-3 right-3 flex items-start justify-between" style={{top:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
                <div className="flex items-center gap-2 bg-[#A30236] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold" style={{borderRadius:"2px"}}>
                  <span className="w-2 h-2 rounded-full bg-white pulse-rec" />录制 · {formatTime(rec.duration)}
                </div>
                {listening && (
                  <div className="bg-[#264F30] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold flex items-center gap-2" style={{borderRadius:"2px"}}>
                    <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />正在听
                  </div>
                )}
              </div>
              {/* 当前问题 —— 悬浮在摄像头上 */}
              <div className="absolute left-3 right-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 56px)'}}>
                <div className="bg-stone-950/85 backdrop-blur text-stone-100 px-5 py-4 max-w-2xl mx-auto border-l-[3px] border-[#A30236]" style={{borderRadius:"2px"}}>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="eyebrow eyebrow--crimson" style={{color:"#F1A23F",fontSize:"10px"}}>
                      主持人提问 {aiMode && <span className="opacity-70">· AI</span>}
                    </div>
                    {aiThinking && (
                      <span className="text-[10px] text-[#F1A23F] flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-[#F1A23F] pulse-rec" />思考中
                      </span>
                    )}
                  </div>
                  <div className="font-display font-bold leading-snug text-[16px]">
                    {aiThinking && !currentQ ? '...' : currentQ}
                  </div>
                </div>
              </div>
              {/* 底部：实时转写 + 操作 */}
              <div className="absolute left-3 right-3" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                {(accumText || interim) && (
                  <div className="mb-2 bg-stone-950/80 backdrop-blur text-stone-100 px-3 py-2 max-h-24 overflow-y-auto text-sm border-l-[3px] border-[#F1A23F]" style={{borderRadius:"2px"}}>
                    <div className="eyebrow eyebrow--white mb-0.5" style={{fontSize:"10px"}}>你刚说的（实时识别）</div>
                    <span>{accumText}</span>
                    <span className="text-stone-400">{interim}</span>
                  </div>
                )}
                {aiError && (
                  <div className="mb-2 bg-red-900/80 text-white text-[10px] px-3 py-1.5" style={{borderRadius:'2px'}}>
                    AI 失败：{aiError.slice(0, 80)} · 已回落静态题库
                  </div>
                )}
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {(aiMode && aiAutoFollow) ? (
                    // 豆包式：自动模式，不显示按钮，显示监听状态
                    <div className="flex items-center gap-2 bg-stone-950/80 backdrop-blur text-stone-100 px-3 py-1.5 text-[11px]" style={{borderRadius:'2px'}}>
                      {aiThinking ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-[#F1A23F] pulse-rec" />
                          <span className="font-medium tracking-wider">AI 思考中...</span>
                        </>
                      ) : ((accumText + interim).trim()) ? (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-300 pulse-rec" />
                          <span className="font-medium tracking-wider">说完停顿 1.8 秒自动追问</span>
                        </>
                      ) : (
                        <>
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-rec" />
                          <span className="font-medium tracking-wider">主持人在听...</span>
                        </>
                      )}
                    </div>
                  ) : (
                    // 手动模式
                    <Btn variant="accent" size="sm" onClick={finishedSpeaking} disabled={aiThinking}>
                      {aiThinking ? 'AI 思考中...' : '下一个问题 →'}
                    </Btn>
                  )}
                  <div className="flex items-center gap-1.5">
                    {aiMode && (
                      <button onClick={() => setAiVoice(v => !v)}
                        className="bg-stone-950/80 backdrop-blur text-white p-1.5"
                        style={{borderRadius:'2px'}}
                        title={aiVoice ? '语音播报开启' : '语音播报关闭'}>
                        <Icon name={aiVoice ? 'mic' : 'shield'} size={14} />
                      </button>
                    )}
                    <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                    <Btn variant="danger" size="sm" onClick={finish}>结束</Btn>
                  </div>
                </div>
              </div>
            </>
          }
        />
      </div>
    );
  }

  if (stage === 'done') {
    const transcript = (
      <Card className="p-6">
        <h4 className="font-display font-bold text-[18px] mb-4 text-stone-900">完整对话记录</h4>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {turns.map((t, i) => (
            <div key={i} className={`text-sm ${t.role === 'host' ? 'text-stone-900 font-medium' : 'text-stone-600 pl-4 border-l-2 border-amber-300'}`}>
              <div className="text-[10px] uppercase tracking-wider opacity-50 mb-0.5">{t.role === 'host' ? '主持人' : '你的回答'} · {formatTime(t.time)}</div>
              <div>{t.text}</div>
            </div>
          ))}
        </div>
      </Card>
    );
    return <DoneView
      blob={rec.blob}
      contextLabel={`主持人引导 · ${turns.filter(t=>t.role==='host').length} 个问题`}
      duration={rec.duration}
      onRetry={startSession}
      onNew={reset}
      extra={transcript}
      transcript={turns.filter(t => t.role === 'me').map(t => t.text).join('\n')}
    />;
  }

  return (
    <div className="space-y-6 fade-in">
      <Card className="p-6 border-l-[3px] border-[#A30236]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 bg-[#A30236] text-white flex items-center justify-center shrink-0" style={{borderRadius:"3px"}}><Icon name="mic" size={20}/></div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">关于这个模式</h3>
            <p className="text-sm text-stone-600 mt-1 leading-relaxed">
              主持人会从一个开场问题开始，每次你说完按一下"下一个问题"，会追问得更深。
              5 轮之后自动收尾。你的回答会自动转写下来，方便复盘。
            </p>
            {!(window.SpeechRecognition || window.webkitSpeechRecognition) && (
              <p className="text-[11px] text-[#A30236] mt-2 flex items-start gap-1.5"><Icon name="shield" size={12} strokeWidth={1.7} className="mt-0.5 shrink-0"/><span>你的浏览器不支持实时语音识别，建议用 Chrome；录制不受影响。</span></p>
            )}
          </div>
        </div>
      </Card>

      {/* 主持人脑子选择：静态题库 vs AI 跟问 */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="sparkle" size={16} strokeWidth={1.7} />
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">主持人脑子</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 mb-3">
          <button onClick={() => setAiMode(false)}
            className={`text-left p-3 border-2 transition-all ${
              !aiMode ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="list" size={14} />
              <span className="font-semibold text-sm">静态题库</span>
            </div>
            <div className="text-xs text-stone-500 leading-snug">25+ 经典追问随机抽 · 离线</div>
          </button>
          <button onClick={() => setAiMode(true)}
            className={`text-left p-3 border-2 transition-all ${
              aiMode ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-1">
              <Icon name="sparkle" size={14} />
              <span className="font-semibold text-sm">AI 跟问</span>
              <Tag color="violet">DeepSeek</Tag>
            </div>
            <div className="text-xs text-stone-500 leading-snug">基于你刚说的话生成针对性追问</div>
          </button>
        </div>

        {/* AI 模式下：实时 vs 手动 + TTS 朗读 */}
        {aiMode && (
          <div className="bg-stone-50 border border-stone-200 p-3 space-y-2.5" style={{borderRadius:'3px'}}>
            <div className="text-[10px] text-stone-500 font-bold tracking-[0.18em] uppercase mb-1">交互方式</div>
            <div className="grid grid-cols-2 gap-2">
              <button onClick={() => setAiAutoFollow(true)}
                className={`text-left p-2.5 border-2 transition-all ${
                  aiAutoFollow ? 'border-[#A30236] bg-white' : 'border-stone-200 bg-white hover:border-stone-300'
                }`} style={{borderRadius:'3px'}}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name="mic" size={12} />
                  <span className="font-semibold text-xs">实时对话</span>
                  <Tag color="orange">豆包式</Tag>
                </div>
                <div className="text-[10px] text-stone-500 leading-snug">停顿 1.8 秒自动追问 · 不用按按钮</div>
              </button>
              <button onClick={() => setAiAutoFollow(false)}
                className={`text-left p-2.5 border-2 transition-all ${
                  !aiAutoFollow ? 'border-[#A30236] bg-white' : 'border-stone-200 bg-white hover:border-stone-300'
                }`} style={{borderRadius:'3px'}}>
                <div className="flex items-center gap-1.5 mb-0.5">
                  <Icon name="play" size={12} />
                  <span className="font-semibold text-xs">手动控制</span>
                </div>
                <div className="text-[10px] text-stone-500 leading-snug">你说完按"下一问"才追问</div>
              </button>
            </div>
            <label className="flex items-center gap-2 cursor-pointer pt-1">
              <input type="checkbox" checked={aiVoice} onChange={e => setAiVoice(e.target.checked)}
                className="w-4 h-4 accent-[#A30236]" />
              <span className="text-xs text-stone-700">主持人问题用 TTS 念出来（手机自带语音合成）</span>
            </label>
          </div>
        )}

      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="mic" size={16} strokeWidth={1.7} />
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">选个聊的主题</h3>
        </div>
        <div className="space-y-3">
          {Object.entries(ISSUES).map(([k, v]) => (
            <div key={k}>
              <div className="text-xs text-stone-500 mb-2 font-medium">{k} <span className="text-stone-400">· {v.blurb}</span></div>
              <div className="flex flex-wrap gap-2">
                {v.topics.slice(0,4).map(t => (
                  <button key={t} onClick={() => { setTopic(t); setCustomTopic(''); }}
                    className={`px-3 py-1.5 text-sm rounded-lg transition-all ${
                      topic === t && !customTopic ? 'bg-stone-900 text-amber-300' : 'bg-stone-100 hover:bg-stone-200 text-stone-700'
                    }`}>{t}</button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-5 pt-5 border-t border-stone-200">
          <div className="text-xs text-stone-500 mb-2">或者，自己输入一个</div>
          <input
            value={customTopic}
            onChange={e => setCustomTopic(e.target.value)}
            placeholder="比如：为什么我决定不再做副业"
            className="w-full px-4 py-2.5 border border-stone-300 rounded-xl text-sm focus:outline-none focus:border-amber-400"
          />
        </div>
      </Card>

      <div className="flex justify-end gap-3">
        {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
        <Btn variant="primary" size="lg" onClick={startSession} disabled={!topic && !customTopic.trim()}>
          开始对话 →
        </Btn>
      </div>
    </div>
  );
};

// ============ Mode 4: 教程模式 ============
