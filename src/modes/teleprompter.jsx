import { Icon } from '../components/icons.jsx';
import { formatTime, splitTeleprompterSentences } from '../lib/utils.jsx';
import { deepseekExtractKeywords, deepseekGenerateScript } from '../lib/deepseek.jsx';
import { useSettings } from '../settings-context.jsx';
import { useCamera } from '../hooks/use-camera.jsx';
import { useRecorder } from '../hooks/use-recorder.jsx';
import { Btn, Card, Tag } from '../components/ui.jsx';
import { CameraFrame, PromptWorkbench, BeautyButton, AudienceViewButton } from '../components/camera-ui.jsx';
import { DoneView } from '../components/review.jsx';
import { useState, useEffect, useRef, useMemo } from '../react-hooks.jsx';

export const KEYWORD_TEMPLATES = [
  { id:'hook',     name:'🪝 钩子结构',   keywords:['钩子开头', '观点', '论证', '收尾'] },
  { id:'prep',     name:'📐 PREP',       keywords:['观点', '理由', '例子', '重申观点'] },
  { id:'golden',   name:'⭕ 黄金圈',     keywords:['Why', 'How', 'What'] },
  { id:'story',    name:'📖 故事三幕',   keywords:['背景', '冲突', '顿悟'] },
  { id:'fcf',      name:'🎯 FCF',        keywords:['事实', '冲突', '收获'] },
  { id:'pain',     name:'💔 痛点共鸣',   keywords:['现象', '危害', '原因', '解决办法'] },
  { id:'reveal',   name:'🔍 行业揭秘',   keywords:['揭秘', '塑造期待', '解决方案'] },
  { id:'list',     name:'📋 干货盘点',   keywords:['炸裂开头', '盘点 1', '盘点 2', '盘点 3', '互动结尾'] },
  { id:'contrast', name:'⚔️ 反差式',     keywords:['反差钩子', '信任背书', '解决方案'] },
  { id:'sandao',   name:'🗡 三把刀通用', keywords:['钩子', '信任背书', '解决方案', '互动 CTA'] },
];

export const TeleprompterMode = () => {
  const [stage, setStage] = useState('config'); // config | recording | done
  const [tpMode, setTpMode] = useState('script'); // script (完整稿) | keywords (关键词 freestyle)
  const [text, setText] = useState('');
  const [fontSize, setFontSize] = useState(32);
  const [speed, setSpeed] = useState(40); // px / s
  const [mode, setMode] = useState('sentence'); // scroll | sentence  —— 默认分句更适合跟读
  const [running, setRunning] = useState(false);
  const [sentenceIdx, setSentenceIdx] = useState(0);
  const [voiceFollow, setVoiceFollow] = useState(true); // 跟读模式默认开启
  const [recognition, setRecognition] = useState(null);
  const [transcript, setTranscript] = useState(''); // 累计 + 当前识别文本（合并）
  const transcriptRef = useRef('');
  // 关键词模式
  const [keywords, setKeywords]   = useState([]);
  const [kwInput, setKwInput]     = useState('');
  const [kwIdx, setKwIdx]         = useState(0);
  const [extractText, setExtractText] = useState('');
  const [extractLoading, setExtractLoading] = useState(false);
  const [extractError, setExtractError]     = useState('');
  // ✨ AI 帮我写 60s 稿
  const [aiTopic, setAiTopic]         = useState('');
  const [aiDuration, setAiDuration]   = useState(60);
  const [aiScriptOpen, setAiScriptOpen] = useState(false);
  const [aiScriptLoading, setAiScriptLoading] = useState(false);
  const [aiScriptError, setAiScriptError] = useState('');
  const [aiScriptStructure, setAiScriptStructure] = useState(null); // 上次生成的结构标签
  // 用户自定义模板
  const [userTemplates, setUserTemplates] = useState(() => {
    try { return JSON.parse(localStorage.getItem('kobo.keywordTemplates') || '[]'); } catch { return []; }
  });
  const persistTemplates = (arr) => {
    try { localStorage.setItem('kobo.keywordTemplates', JSON.stringify(arr)); } catch {}
  };
  const applyTemplate = (tpl) => {
    setKeywords([...tpl.keywords]);
    setKwIdx(0);
  };
  const saveCurrentAsTemplate = () => {
    if (!keywords.length) return;
    const name = (window.prompt('给这套关键词起个名字（10 字以内）：') || '').trim();
    if (!name) return;
    setUserTemplates(prev => {
      const next = [{ id: 'u_' + Date.now(), name, keywords: [...keywords], ts: Date.now() }, ...prev].slice(0, 30);
      persistTemplates(next);
      return next;
    });
  };
  const deleteUserTemplate = (id) => {
    setUserTemplates(prev => {
      const next = prev.filter(t => t.id !== id);
      persistTemplates(next);
      return next;
    });
  };
  const scrollerRef = useRef(null);
  const rafRef = useRef(null);
  const settings = useSettings();
  const cam = useCamera();
  const rec = useRecorder();

  // 关键词录入：从输入框 commit（Enter 或 逗号 触发）
  const commitKeyword = () => {
    const parts = kwInput.split(/[,，\s]+/).map(s => s.trim()).filter(Boolean);
    if (!parts.length) return;
    setKeywords(prev => [...prev, ...parts]);
    setKwInput('');
  };
  const removeKeyword = (i) => setKeywords(prev => prev.filter((_, j) => j !== i));
  const clearKeywords = () => { setKeywords([]); setKwIdx(0); };

  const aiExtractKeywords = async () => {
    if (!extractText.trim()) { setExtractError('先粘贴一段长文本'); return; }
    setExtractLoading(true);
    setExtractError('');
    try {
      const kws = await deepseekExtractKeywords({ apiKey: settings.apiKey, text: extractText.trim(), count: 10 });
      setKeywords(kws);
      setKwIdx(0);
    } catch (e) {
      setExtractError(e.message);
    } finally {
      setExtractLoading(false);
    }
  };

  // ✨ AI 帮我写 60s 稿
  const aiGenerateScript = async () => {
    if (!aiTopic.trim()) { setAiScriptError('请先填话题'); return; }
    setAiScriptLoading(true);
    setAiScriptError('');
    setAiScriptStructure(null);
    try {
      const r = await deepseekGenerateScript({
        apiKey: settings.apiKey,
        topic: aiTopic.trim(),
        durationSec: aiDuration,
      });
      // 灌入主 textarea
      setText(r.script || '');
      setAiScriptStructure(r.structure || null);
      setAiScriptOpen(false); // 关闭面板 · 让用户看到 textarea 已填好
    } catch (e) {
      setAiScriptError(e.message);
    } finally {
      setAiScriptLoading(false);
    }
  };

  const sentences = useMemo(() => splitTeleprompterSentences(text), [text]);
  // 每句去掉空白和标点后的纯中文/字母字数，用于计算 ASR 已读到哪一句
  const sentenceCharLens = useMemo(() =>
    sentences.map(s => s.replace(/[\s\p{P}]/gu, '').length),
    [sentences]
  );

  // 滚动模式（仅在 不开跟读 + scroll 模式 下走自动滚）
  useEffect(() => {
    if (stage !== 'recording' || mode !== 'scroll' || !running || voiceFollow) return;
    let last = performance.now();
    const tick = (now) => {
      const dt = (now - last) / 1000;
      last = now;
      if (scrollerRef.current) {
        scrollerRef.current.scrollTop += speed * dt;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [stage, mode, running, speed, voiceFollow]);

  // ===== 跟读模式：ASR 听你念到哪儿，提词器跳到哪儿 =====
  // srActiveRef：会话开关 · 供自动重启回调判断「用户是否已结束」（闭包读 state 会拿到旧值）
  // 同时兼做 setupRecognition 的去重锁（begin 与 [voiceFollow,stage] effect 会双触发）
  const srActiveRef = useRef(false);
  const recognitionRef = useRef(null); // 与 recognition state 同步 · 供卸载清理用
  const nativeAccumRef = useRef('');   // 原生 ASR 跨自动重启的累计转写
  const nativePartialRef = useRef(''); // 当前原生识别段的 partial
  const setupRecognition = async () => {
    if (srActiveRef.current) return;
    srActiveRef.current = true;
    nativeAccumRef.current = '';
    nativePartialRef.current = '';
    // Capacitor 原生 ASR 优先
    const cap = window.Capacitor;
    const nativeSR = cap?.Plugins?.SpeechRecognition;
    if (nativeSR && cap.isNativePlatform?.()) {
      try {
        const a = await nativeSR.available();
        if (!a?.available) throw new Error('no native SR');
        const p = await nativeSR.checkPermissions();
        if (p?.speechRecognition !== 'granted') {
          const r = await nativeSR.requestPermissions();
          if (r?.speechRecognition !== 'granted') throw new Error('perm denied');
        }
        await nativeSR.removeAllListeners?.();
        nativeSR.addListener('partialResults', (data) => {
          const t = (data?.matches?.[0] || '').trim();
          if (!t) return;
          nativePartialRef.current = t;
          // 累计前几段 + 当前段 · 否则每次自动重启后字数归零 · 跟读进度就卡死了
          const full = nativeAccumRef.current + t;
          transcriptRef.current = full;
          setTranscript(full);
        });
        nativeSR.addListener('listeningState', (s) => {
          if (s?.status === 'stopped') {
            // 把当前段落沉淀进累计 · 再看是否需要自动重启
            if (nativePartialRef.current) {
              nativeAccumRef.current += nativePartialRef.current;
              nativePartialRef.current = '';
            }
            if (!srActiveRef.current) return;  // 用户已结束 → 不要 200ms 后偷偷重开麦克风
            setTimeout(() => {
              if (!srActiveRef.current) return;
              try { nativeSR.start({ language:'zh-CN', maxResults:2, partialResults:true, popup:false }); } catch {}
            }, 200);
          }
        });
        await nativeSR.start({ language:'zh-CN', maxResults:2, partialResults:true, popup:false });
        const wrapper = { _native: true, stop: async () => { srActiveRef.current = false; try { await nativeSR.stop(); await nativeSR.removeAllListeners(); } catch {} } };
        recognitionRef.current = wrapper;
        setRecognition(wrapper);
        return;
      } catch (e) { console.warn('[Teleprompter SR] native failed, fall back:', e?.message || e); }
    }
    // Web Speech 兜底
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { srActiveRef.current = false; return; }
    const r = new SR();
    r.continuous = true; r.interimResults = true; r.lang = 'zh-CN';
    let acc = '';
    r.onresult = (e) => {
      let interimT = '', finalT = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalT += t; else interimT += t;
      }
      if (finalT) acc += finalT;
      const full = acc + interimT;
      transcriptRef.current = full;
      setTranscript(full);
    };
    // stop() 也会触发 onend · 只有会话仍在时才自动重启（否则 done 页麦克风永远关不掉）
    r.onend = () => { if (srActiveRef.current) { try { r.start(); } catch {} } };
    try { r.start(); } catch {}
    recognitionRef.current = r;
    setRecognition(r);
  };

  // 手动 ←/→ 校准偏移：把「当前识别字数」重映射到手动选中句的开头 ·
  // 否则下一次 transcript 更新会立刻把句子又拽回 ASR 算出来的位置（← 形同虚设）
  const manualCharBaseRef = useRef(0);
  const navToSentence = (idx) => {
    const clamped = Math.max(0, Math.min(sentences.length - 1, idx));
    setSentenceIdx(clamped);
    const cleanCount = (transcriptRef.current || '').replace(/[\s\p{P}]/gu, '').length;
    let cumBefore = 0;
    for (let i = 0; i < clamped; i++) cumBefore += sentenceCharLens[i] || 0;
    manualCharBaseRef.current = cleanCount - (cumBefore * 0.7 + 1);
  };

  // 跟读 → 根据已识别字数推算当前句子
  useEffect(() => {
    if (stage !== 'recording' || !voiceFollow) return;
    const rawCount = transcript.replace(/[\s\p{P}]/gu, '').length;
    const cleanCount = Math.max(0, rawCount - manualCharBaseRef.current);
    let cum = 0;
    for (let i = 0; i < sentenceCharLens.length; i++) {
      cum += sentenceCharLens[i];
      // 加点容差：识别比脚本短 30% 也算"念到这句了"
      if (cum * 0.7 >= cleanCount) {
        setSentenceIdx(i);
        // scroll mode 下也同步 scrollTop
        if (mode === 'scroll' && scrollerRef.current) {
          // 估算字符到 px 的比例：用整个文本高度除以总字数
          const totalLen = sentenceCharLens.reduce((a,b)=>a+b,0) || 1;
          const ratio = Math.min(1, cleanCount / totalLen);
          const sc = scrollerRef.current;
          const targetTop = ratio * Math.max(0, sc.scrollHeight - sc.clientHeight);
          sc.scrollTop = targetTop;
        }
        return;
      }
    }
    setSentenceIdx(sentences.length - 1);
  }, [transcript, voiceFollow, sentenceCharLens, mode, sentences.length, stage]);

  const loadSample = (s) => { setText(s.text); };

  const begin = async () => {
    if (tpMode === 'script' && !text.trim()) return;
    if (tpMode === 'keywords' && !keywords.length) return;
    const s = await cam.start();
    if (!s) return;
    setStage('recording');
    setSentenceIdx(0);
    setKwIdx(0);
    manualCharBaseRef.current = 0;
    transcriptRef.current = '';
    setTranscript('');
    if (scrollerRef.current) scrollerRef.current.scrollTop = 0;
    rec.start(s);
    setRunning(true);
    if (voiceFollow) setupRecognition();
  };

  const stopRecognition = () => {
    srActiveRef.current = false;  // 先关会话开关 · 再 stop（阻断 onend/listeningState 的自动重启）
    if (recognitionRef.current) try { recognitionRef.current.stop(); } catch {}
    recognitionRef.current = null;
    setRecognition(null);
  };

  const finish = () => {
    setRunning(false);
    stopRecognition();
    rec.stop();
    cam.stop();
    setStage('done');
  };

  const reset = () => {
    setRunning(false);
    stopRecognition();
    setStage('config');
    cam.stop();
  };

  // 跟读模式开/关 → 启动 / 停止 ASR（在录制中）
  useEffect(() => {
    if (stage !== 'recording') return;
    if (voiceFollow && !srActiveRef.current) setupRecognition();
    if (!voiceFollow && srActiveRef.current) stopRecognition();
    // eslint-disable-next-line
  }, [voiceFollow, stage]);

  // 卸载兜底：录制中组件被整棵换掉（如 ErrorBoundary）时不要留下自动重启的 ASR
  useEffect(() => () => {
    srActiveRef.current = false;
    if (recognitionRef.current) { try { recognitionRef.current.stop(); } catch {} recognitionRef.current = null; }
  }, []);

  if (stage === 'recording') {
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950 fade-in" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} cam={cam} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 顶部 HUD：REC + 时长 + 美颜 */}
              <div className="absolute left-3 right-3 flex items-center justify-between gap-2" style={{top:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
                <div className="flex items-center gap-1.5">
                  <div className="flex items-center gap-2 bg-[#A30236] text-white px-3 py-1.5 text-[11px] tracking-[0.2em] font-bold" style={{borderRadius:"2px"}}>
                    <span className="w-2 h-2 rounded-full bg-white pulse-rec" />录制 · {formatTime(rec.duration)}
                  </div>
                  <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
                </div>
                <div className="flex items-center gap-1.5">
                  {voiceFollow && tpMode === 'script' && (
                    <div className="bg-emerald-600/90 text-white px-2.5 py-1.5 text-[10px] tracking-wider font-bold flex items-center gap-1.5" style={{borderRadius:'2px'}}>
                      <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />跟读
                    </div>
                  )}
                  {tpMode === 'keywords' && keywords.length > 0 && (
                    <div className="bg-[#F1A23F] text-stone-900 px-2.5 py-1.5 text-[10px] tracking-wider font-bold" style={{borderRadius:'2px'}}>
                      关键词 {kwIdx + 1} / {keywords.length}
                    </div>
                  )}
                  {tpMode === 'script' && mode === 'sentence' && (
                    <div className="bg-stone-950/80 text-white px-2.5 py-1.5 text-[10px] tracking-wider font-bold" style={{borderRadius:'2px'}}>
                      {sentenceIdx + 1} / {sentences.length}
                    </div>
                  )}
                </div>
              </div>
              {/* 提词器叠加 —— 占下半屏 */}
              <div className="absolute inset-x-0 bottom-0 pointer-events-none" style={{paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 92px)'}}>
                {tpMode === 'keywords' ? (
                  /* 关键词模式：进度点 + 上一个 + 当前（巨大居中）+ 下一个 */
                  <div className="w-full bg-stone-950/90 px-6 py-7">
                    <div className="flex items-center justify-center gap-1 mb-4">
                      {keywords.map((_, i) => (
                        <span key={i} className={`h-1 rounded-full transition-all ${
                          i === kwIdx ? 'w-8 bg-[#F1A23F]' : i < kwIdx ? 'w-3 bg-stone-500' : 'w-3 bg-stone-700'
                        }`} />
                      ))}
                    </div>
                    {kwIdx > 0 && (
                      <div className="text-center text-stone-500 leading-tight mb-3" style={{fontSize: `${Math.round(fontSize*0.4)}px`}}>
                        ← {keywords[kwIdx - 1]}
                      </div>
                    )}
                    <div className="text-center text-white leading-tight font-display font-bold tracking-wider"
                         style={{fontSize: `${Math.round(fontSize*1.4)}px`}}>
                      {keywords[kwIdx] || ''}
                    </div>
                    <div className="flex justify-center mt-3">
                      <span className="h-[2px] bg-[#A30236]" style={{width:'56px'}} />
                    </div>
                    {kwIdx + 1 < keywords.length && (
                      <div className="text-center text-stone-400 leading-tight mt-3" style={{fontSize: `${Math.round(fontSize*0.55)}px`}}>
                        {keywords[kwIdx + 1]} →
                      </div>
                    )}
                  </div>
                ) : mode === 'scroll' ? (
                  <div ref={scrollerRef} className="w-full overflow-hidden bg-stone-950/85" style={{maxHeight:'44vh'}}>
                    <div className="px-7 py-5 text-stone-100 leading-relaxed whitespace-pre-wrap" style={{fontSize: `${fontSize}px`, paddingBottom: '120px', paddingTop: '40px'}}>
                      {text}
                    </div>
                  </div>
                ) : (
                  <div className="w-full bg-stone-950/90 px-7 py-8">
                    {/* 当前句突出 + 下一句弱显（"已念过的"灰掉，"正在念的"亮色） */}
                    {sentenceIdx > 0 && (
                      <div className="text-stone-500 leading-snug mb-2" style={{fontSize: `${Math.round(fontSize*0.55)}px`}}>
                        {sentences[sentenceIdx - 1] || ''}
                      </div>
                    )}
                    <div className="text-stone-100 leading-snug font-display font-bold" style={{fontSize: `${fontSize}px`}}>
                      {sentences[sentenceIdx] || ''}
                    </div>
                    {sentenceIdx + 1 < sentences.length && (
                      <div className="text-stone-400 leading-snug mt-2" style={{fontSize: `${Math.round(fontSize*0.65)}px`}}>
                        {sentences[sentenceIdx + 1]}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {/* 底部控件 —— 悬浮在提词器下方 */}
              <div className="absolute left-3 right-3 flex items-center justify-between flex-wrap gap-2" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="flex items-center gap-1.5 bg-stone-950/80 backdrop-blur px-2 py-1.5" style={{borderRadius:'2px'}}>
                  {tpMode === 'keywords' ? (
                    /* 关键词模式：手动切关键词 */
                    <>
                      <Btn size="sm" variant="secondary" onClick={() => setKwIdx(Math.max(0, kwIdx - 1))}>←</Btn>
                      <Btn size="sm" variant="accent" onClick={() => setKwIdx(Math.min(keywords.length - 1, kwIdx + 1))}>下一个 →</Btn>
                    </>
                  ) : voiceFollow ? (
                    <>
                      <button onClick={() => setVoiceFollow(false)}
                        className="bg-emerald-600 text-white px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                        style={{borderRadius:'2px'}}
                        title="切到手动模式"
                      ><Icon name="mic" size={11}/>跟读 ON</button>
                      {/* 跟读模式下手动后退/前进作为修正手段 */}
                      <Btn size="sm" variant="secondary" onClick={() => navToSentence(sentenceIdx-1)}>←</Btn>
                      <Btn size="sm" variant="secondary" onClick={() => navToSentence(sentenceIdx+1)}>→</Btn>
                    </>
                  ) : mode === 'scroll' ? (
                    <>
                      <button onClick={() => setVoiceFollow(true)}
                        className="bg-stone-800 text-white/80 px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                        style={{borderRadius:'2px'}}
                        title="开跟读：ASR 听你念到哪儿就滚到哪儿"
                      ><Icon name="mic" size={11}/>跟读 OFF</button>
                      <Btn size="sm" variant="secondary" onClick={() => setRunning(r=>!r)}>{running ? '⏸' : '▶'}</Btn>
                      <input type="range" min="10" max="120" value={speed} onChange={e => setSpeed(+e.target.value)} className="w-20" />
                      <span className="text-[10px] text-stone-300 tabular-nums px-1">{speed}</span>
                    </>
                  ) : (
                    <>
                      <button onClick={() => setVoiceFollow(true)}
                        className="bg-stone-800 text-white/80 px-2 py-1 text-[10px] font-bold flex items-center gap-1"
                        style={{borderRadius:'2px'}}
                        title="开跟读"
                      ><Icon name="mic" size={11}/>跟读 OFF</button>
                      <Btn size="sm" variant="secondary" onClick={() => navToSentence(sentenceIdx-1)}>←</Btn>
                      <Btn size="sm" variant="accent" onClick={() => navToSentence(sentenceIdx+1)}>→</Btn>
                    </>
                  )}
                </div>
                <Btn variant="danger" size="sm" onClick={finish}>停止</Btn>
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
      contextLabel={tpMode === 'keywords'
        ? `提词器 · 关键词 freestyle · ${keywords.length} 词 · ${formatTime(rec.duration)}`
        : `提词器 · 完整稿 · ${text.length} 字 · ${formatTime(rec.duration)}`}
      duration={rec.duration}
      onRetry={begin}
      onNew={reset}
      transcript={transcript}
    />;
  }

  return (
    <div className="space-y-6 fade-in">
      {/* 提词器模式切换 */}
      <Card className="p-3">
        <div className="grid grid-cols-2 gap-2">
          <button onClick={() => setTpMode('script')}
            className={`text-left p-3 border-2 transition-all ${
              tpMode === 'script' ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="document" size={13} />
              <span className="font-semibold text-sm">完整稿模式</span>
            </div>
            <div className="text-[11px] text-stone-500 leading-snug">字字念 · 滚动或分句</div>
          </button>
          <button onClick={() => setTpMode('keywords')}
            className={`text-left p-3 border-2 transition-all ${
              tpMode === 'keywords' ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`} style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-1.5 mb-0.5">
              <Icon name="sparkle" size={13} />
              <span className="font-semibold text-sm">关键词模式</span>
              <Tag color="orange">freestyle</Tag>
            </div>
            <div className="text-[11px] text-stone-500 leading-snug">只看关键词 · 自由发挥串联</div>
          </button>
        </div>
      </Card>

      {tpMode === 'keywords' ? (
        <>
          {/* 关键词模板库 */}
          <Card className="p-5">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
                <Icon name="list" size={16} strokeWidth={1.7}/>
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">关键词模板</h3>
              <Tag color="amber">点一下应用</Tag>
            </div>
            <div className="text-[11px] text-stone-500 mb-3 leading-relaxed">
              内置 10 套表达骨架 · 一键填入。可以应用后再增减关键词。
            </div>
            <div className="grid grid-cols-2 gap-1.5 mb-2">
              {KEYWORD_TEMPLATES.map(tpl => (
                <button key={tpl.id} onClick={() => applyTemplate(tpl)}
                  className="text-left p-2 border border-stone-200 hover:border-[#A30236] bg-white transition-colors"
                  style={{borderRadius:'2px'}}>
                  <div className="text-xs font-semibold leading-tight">{tpl.name}</div>
                  <div className="text-[9px] text-stone-500 mt-0.5 leading-tight truncate">
                    {tpl.keywords.join(' · ')}
                  </div>
                </button>
              ))}
            </div>
            {userTemplates.length > 0 && (
              <>
                <div className="text-[10px] text-stone-500 mt-3 mb-2 tracking-wider uppercase font-bold">我的模板（{userTemplates.length}）</div>
                <div className="space-y-1.5">
                  {userTemplates.map(tpl => (
                    <div key={tpl.id} className="flex items-center gap-2 p-2 border border-stone-200 bg-white" style={{borderRadius:'2px'}}>
                      <button onClick={() => applyTemplate(tpl)} className="flex-1 text-left">
                        <div className="text-xs font-semibold">{tpl.name}</div>
                        <div className="text-[9px] text-stone-500 mt-0.5 truncate">
                          {tpl.keywords.join(' · ')}
                        </div>
                      </button>
                      <button onClick={() => {
                        if (window.confirm(`删除模板"${tpl.name}"？`)) deleteUserTemplate(tpl.id);
                      }} className="text-stone-400 hover:text-red-600 text-sm shrink-0 px-2">×</button>
                    </div>
                  ))}
                </div>
              </>
            )}
          </Card>

          {/* 关键词录入 */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="list" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">手动录入关键词</h3>
              {keywords.length > 0 && (
                <button onClick={saveCurrentAsTemplate} className="ml-auto text-[11px] text-[#A30236] hover:underline flex items-center gap-1">
                  💾 存为模板
                </button>
              )}
            </div>
            <div className="text-xs text-stone-500 mb-3 leading-relaxed">
              逐个录入串联你这段口播的核心词。<br/>
              <span className="text-stone-700">配合豆包语音输入法</span>可以边说边录，比打字快 3 倍。<br/>
              一个一个回车提交，也支持逗号 / 空格分隔批量录入。
            </div>
            <div className="flex gap-2 mb-3">
              <input
                value={kwInput}
                onChange={e => setKwInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitKeyword(); } }}
                placeholder="如：反差 / 故事 / 数据 / 收尾..."
                className="flex-1 px-3 py-2 border border-stone-300 text-sm focus:outline-none focus:border-[#A30236]"
                style={{borderRadius:'2px'}}
              />
              <Btn size="md" variant="secondary" onClick={commitKeyword} disabled={!kwInput.trim()}>添加</Btn>
            </div>
            {keywords.length > 0 ? (
              <>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {keywords.map((k, i) => (
                    <span key={i} className="inline-flex items-center gap-1 bg-stone-900 text-white px-2.5 py-1 text-xs font-medium" style={{borderRadius:'2px'}}>
                      <span className="text-amber-300 tabular-nums">{String(i + 1).padStart(2, '0')}</span>
                      {k}
                      <button onClick={() => removeKeyword(i)} className="text-stone-400 hover:text-red-300 ml-1">×</button>
                    </span>
                  ))}
                </div>
                <button onClick={clearKeywords} className="text-xs text-stone-500 hover:text-red-600">清空全部</button>
              </>
            ) : (
              <div className="text-[11px] text-stone-400 italic">还没录入关键词</div>
            )}
          </Card>

          {/* AI 一键提取 */}
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="sparkle" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0 flex items-center gap-2">
                AI 一键提取 <Tag color="violet">DeepSeek</Tag>
              </h3>
            </div>
            <div className="text-xs text-stone-500 mb-3">
              粘贴你写好的稿子 / 大纲 / 长文本，AI 自动提炼 10 个串联关键词。
            </div>
            <textarea
              value={extractText}
              onChange={e => setExtractText(e.target.value)}
              placeholder="把要提取的长文本粘贴进来..."
              className="w-full h-32 p-3 border border-stone-300 text-sm leading-relaxed focus:outline-none focus:border-[#A30236] resize-none"
              style={{borderRadius:'3px'}}
            />
            <div className="mt-3 flex items-center justify-between gap-2 flex-wrap">
              <div className="text-xs text-stone-500">{extractText.length} 字</div>
              <Btn variant="accent" onClick={aiExtractKeywords} disabled={!extractText.trim() || extractLoading}>
                {extractLoading ? '提取中...' : 'AI 提取 10 个关键词'}
              </Btn>
            </div>
            {extractError && <div className="text-xs text-red-600 mt-2">{extractError}</div>}
          </Card>

          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-3">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="settings" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">字号</h3>
            </div>
            <input type="range" min="18" max="56" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full" />
            <div className="bg-stone-950 rounded p-3 mt-2 text-center">
              <div className="text-white font-display font-bold" style={{fontSize:`${fontSize}px`}}>关键词</div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
            <Btn variant="primary" size="lg" onClick={begin} disabled={!keywords.length}>
              开始 freestyle 录制 →
            </Btn>
          </div>
        </>
      ) : (
        <>
          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4 flex-wrap">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="document" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">粘贴文案</h3>
              <button onClick={() => setAiScriptOpen(o => !o)}
                className="ml-auto flex items-center gap-1 px-2.5 py-1 text-[11px] tracking-wider font-bold bg-gradient-to-r from-purple-100 to-amber-100 text-purple-700 hover:from-purple-200 hover:to-amber-200 transition-all"
                style={{borderRadius:'3px'}}>
                <Icon name="sparkle" size={12} /> ✨ AI 帮我写
              </button>
            </div>

            {/* AI 剧本生成内联面板 */}
            {aiScriptOpen && (
              <div className="mb-4 p-3 border-2 border-purple-300 bg-purple-50/50 fade-in" style={{borderRadius:'3px'}}>
                <div className="text-[10px] text-purple-700 tracking-wider uppercase font-bold mb-2 flex items-center gap-2">
                  ✨ AI 60 秒剧本生成
                  <span className="text-stone-400 normal-case tracking-normal">🤖 内容由 AI 生成 · 仅供参考</span>
                </div>
                <input type="text"
                  value={aiTopic}
                  onChange={e => setAiTopic(e.target.value)}
                  placeholder="话题（如：为什么我不再追求自律）"
                  className="w-full px-3 py-2 border border-purple-300 text-sm mb-2"
                  style={{borderRadius:'2px'}}
                  disabled={aiScriptLoading}
                />
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] text-stone-600">时长</span>
                  {[30, 60, 90, 120].map(d => (
                    <button key={d} onClick={() => setAiDuration(d)}
                      className={`px-2 py-1 text-[11px] font-bold ${aiDuration === d ? 'bg-purple-600 text-white' : 'bg-white border border-stone-300 text-stone-600'}`}
                      style={{borderRadius:'2px'}}
                      disabled={aiScriptLoading}>
                      {d}s
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button onClick={aiGenerateScript} disabled={aiScriptLoading || !aiTopic.trim()}
                    className="px-3 py-1.5 text-xs font-bold bg-purple-600 text-white hover:bg-purple-700 transition-colors disabled:opacity-40"
                    style={{borderRadius:'2px'}}>
                    {aiScriptLoading ? '思考中...' : '🚀 生成稿子'}
                  </button>
                  <button onClick={() => { setAiScriptOpen(false); setAiScriptError(''); }}
                    className="text-xs text-stone-500 hover:text-stone-800">
                    收起
                  </button>
                  {aiScriptError && <span className="text-[11px] text-red-600">{aiScriptError}</span>}
                </div>
                <div className="text-[10px] text-stone-500 mt-2 leading-relaxed">
                  💡 生成的稿子会自动填到下方文本框 · 你可以再编辑 · {aiDuration}s 大约 {Math.round(aiDuration * 4)} 字
                </div>
              </div>
            )}

            {/* 上次 AI 生成的结构标签（提示用户稿子按什么结构写的） */}
            {aiScriptStructure && Array.isArray(aiScriptStructure) && aiScriptStructure.length > 0 && (
              <div className="mb-3 flex flex-wrap items-center gap-1">
                <span className="text-[10px] text-stone-500 tracking-wider uppercase font-bold mr-1">结构</span>
                {aiScriptStructure.map((s, i) => (
                  <React.Fragment key={i}>
                    <span className="text-[10px] bg-amber-100 text-amber-900 px-1.5 py-0.5 font-bold tracking-wider" style={{borderRadius:'2px'}}>{s}</span>
                    {i < aiScriptStructure.length - 1 && <span className="text-amber-700 text-[10px] font-bold">→</span>}
                  </React.Fragment>
                ))}
              </div>
            )}

            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={'把你刷到的爆款文案粘贴进来 · 或点上方"✨ AI 帮我写"让 AI 生成。也可以直接选下方样本试用。'}
              className="w-full h-48 p-4 border border-stone-300 rounded-xl text-sm leading-relaxed focus:outline-none focus:border-amber-400 resize-none"
            />
            <div className="mt-3 flex items-center justify-between text-xs text-stone-500">
              <span>{text.length} 字 · 约 {sentences.length} 句 · 预估口播 {Math.round(text.length/4)} 秒</span>
              {text && <button onClick={() => setText('')} className="text-stone-500 hover:text-red-600">清空</button>}
            </div>
          </Card>

          <PromptWorkbench
            title="稿件工作台"
            detail="粘贴自己的稿子，生成 60 秒口播稿，或从长文里提取关键词。"
            bullets={[
              '开头只保留一个清楚的钩子。',
              '第一遍练节奏，第二遍练镜头感。',
              '好用的表达可以存成你自己的模板。',
            ]}
          />

          <Card className="p-6">
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
                <Icon name="settings" size={16} strokeWidth={1.7} />
              </div>
              <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">提词器设置</h3>
            </div>
            <div className="space-y-5">
              <div>
                <div className="text-sm font-medium mb-2">显示模式</div>
                <div className="flex gap-2">
                  {[{v:'scroll',l:'滚动',d:'整段连续向上滚'},{v:'sentence',l:'分句',d:'一次显示一句，最自然'}].map(o => (
                    <button key={o.v} onClick={() => setMode(o.v)}
                      className={`flex-1 text-left p-3 rounded-lg border-2 transition-all ${
                        mode === o.v ? 'border-amber-400 bg-amber-50' : 'border-stone-200 hover:border-stone-300'
                      }`}>
                      <div className="font-medium text-sm">{o.l}</div>
                      <div className="text-xs text-stone-500 mt-0.5">{o.d}</div>
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <div className="text-sm font-medium mb-2">字号 <span className="text-stone-400 font-normal">({fontSize}px)</span></div>
                <input type="range" min="18" max="56" value={fontSize} onChange={e => setFontSize(+e.target.value)} className="w-full" />
                <div className="bg-stone-950 rounded-lg p-3 mt-2">
                  <div className="text-stone-100" style={{fontSize:`${fontSize*0.5}px`}}>预览：这是你录制时看到的字号</div>
                </div>
              </div>
            </div>
          </Card>

          <div className="flex justify-end gap-3">
            {cam.error && <span className="text-sm text-red-600 self-center">{cam.error}</span>}
            <Btn variant="primary" size="lg" onClick={begin} disabled={!text.trim()}>开始录制 →</Btn>
          </div>
        </>
      )}
    </div>
  );
};

// ============ Mode 3: 播客主持人 ============
