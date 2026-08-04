import { Icon } from '../components/icons.jsx';
import { FRAMEWORKS } from '../data/frameworks.jsx';
import { formatTime } from '../lib/utils.jsx';
import { useSettings } from '../settings-context.jsx';
import { useCamera } from '../hooks/use-camera.jsx';
import { useRecorder } from '../hooks/use-recorder.jsx';
import { Btn, Card } from '../components/ui.jsx';
import { ReadyOverlay, CameraFrame, BeautyButton, AudienceViewButton } from '../components/camera-ui.jsx';
import { getDefaultTopicsPool, pickAdaptiveTopic } from '../lib/topic-pools.jsx';
import { DoneView } from '../components/review.jsx';
import { useState, useEffect, useRef } from '../react-hooks.jsx';

export const TutorialMode = () => {
  const [selected, setSelected] = useState(FRAMEWORKS[0]);
  const [stage, setStage] = useState('learn'); // learn | practice | done
  const [practiceTopic, setPracticeTopic] = useState('');
  const [practiceDuration, setPracticeDuration] = useState(60);
  const [timeLeft, setTimeLeft] = useState(0);
  const [preCount, setPreCount] = useState(3);
  const preCountTimerRef = useRef(null);  // 3-2-1 倒计时 · 卸载时必须清（见 ImprovMode 同款注释）
  const cam = useCamera();
  const rec = useRecorder();
  const settings = useSettings();

  useEffect(() => () => { if (preCountTimerRef.current) clearInterval(preCountTimerRef.current); }, []);

  useEffect(() => { setStage('learn'); }, [selected]);

  const startPractice = async () => {
    if (!practiceTopic) {
      // 随便给一个
      const pool = getDefaultTopicsPool();
      setPracticeTopic(pickAdaptiveTopic(pool, settings.topicPreferences));
      return;
    }
    const s = await cam.start();
    if (!s) return;
    setStage('preroll');
    let n = 3;
    setPreCount(n);
    preCountTimerRef.current = setInterval(() => {
      n--;
      if (n >= 0) setPreCount(n);
      if (n < 0) {
        clearInterval(preCountTimerRef.current);
        preCountTimerRef.current = null;
        setStage('practice');
        setTimeLeft(practiceDuration);
        rec.start(s);
      }
    }, 1000);
  };

  useEffect(() => {
    if (stage !== 'practice') return;
    if (timeLeft <= 0) { finishPractice(); return; }
    const t = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
    return () => clearTimeout(t);
    // eslint-disable-next-line
  }, [stage, timeLeft]);

  const finishPractice = () => {
    rec.stop();
    cam.stop();
    setStage('done');
  };

  // 计算当前阶段（在 practice 中）
  const elapsed = practiceDuration - timeLeft;
  const elapsedPercent = practiceDuration ? (elapsed / practiceDuration) * 100 : 0;
  let cumulative = 0;
  let currentStep = null;
  let nextStep = null;
  let stepProgress = 0;
  for (let i = 0; i < selected.steps.length; i++) {
    const step = selected.steps[i];
    const stepStart = cumulative;
    const stepEnd = cumulative + step.percent;
    if (elapsedPercent >= stepStart && elapsedPercent <= stepEnd) {
      currentStep = step;
      nextStep = selected.steps[i+1] || null;
      stepProgress = ((elapsedPercent - stepStart) / step.percent) * 100;
      break;
    }
    cumulative = stepEnd;
  }
  if (!currentStep && selected.steps.length) currentStep = selected.steps[selected.steps.length-1];

  if (stage === 'preroll') return <ReadyOverlay countdown={preCount} cam={cam} hint={`框架：${selected.name} · 话题：${practiceTopic}`} />;

  if (stage === 'practice') {
    return (
      <div className="absolute inset-0 z-[70] bg-stone-950 fade-in" style={{borderRadius:0}}>
        <CameraFrame videoRef={cam.videoRef} voiceOnly={cam.voiceOnly} streamRef={cam.streamRef} cam={cam} className="w-full h-full" status="recording"
          overlay={
            <>
              {/* 进度条 + 阶段切片 (top) */}
              <div className="absolute top-0 left-0 right-0 h-1.5 flex bg-stone-900/40">
                {selected.steps.map((s, i) => {
                  const cum = selected.steps.slice(0,i).reduce((a,b) => a + b.percent, 0);
                  const filled = Math.max(0, Math.min(s.percent, elapsedPercent - cum));
                  return (
                    <div key={i} style={{width: `${s.percent}%`}} className="h-full border-r border-stone-800/50 relative">
                      <div className="h-full bg-[#A30236]" style={{width: `${(filled/s.percent)*100}%`}} />
                    </div>
                  );
                })}
              </div>
              {/* 顶部话题 + 计时 + REC */}
              <div className="absolute left-3 right-3 flex items-start justify-between gap-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 12px)'}}>
                <div className="bg-stone-950/80 text-stone-100 px-3 py-2.5 backdrop-blur max-w-md border-l-[3px] border-[#A30236]" style={{borderRadius:"2px"}}>
                  <div className="eyebrow eyebrow--crimson mb-1" style={{color:"#F1A23F",fontSize:"10px"}}>{selected.name} · {practiceTopic}</div>
                  <div className="font-display font-bold text-sm leading-snug">{currentStep?.name}</div>
                </div>
                <div className="bg-stone-950/80 text-white px-3 py-2.5 backdrop-blur text-center" style={{borderRadius:"2px"}}>
                  <div className="eyebrow eyebrow--white mb-0.5" style={{fontSize:"10px"}}>剩余</div>
                  <div className={`font-display text-xl font-bold tabular-nums ${timeLeft <= 5 ? 'text-red-400 pulse-rec' : ''}`}>{formatTime(timeLeft)}</div>
                </div>
              </div>
              {/* REC 中央贴标（顶部进度条下方） + 美颜按钮（右侧） */}
              <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 bg-[#A30236] text-white px-2.5 py-1 text-[10px] tracking-[0.2em] font-bold" style={{top:'calc(env(safe-area-inset-top, 0px) + 96px)', borderRadius:'2px'}}>
                <span className="w-1.5 h-1.5 rounded-full bg-white pulse-rec" />REC
              </div>
              <div className="absolute right-3" style={{top:'calc(env(safe-area-inset-top, 0px) + 92px)'}}>
                <BeautyButton cam={cam} /><AudienceViewButton cam={cam} />
              </div>
              {/* 底部当前提示 */}
              <div className="absolute left-3 right-3" style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
                <div className="bg-[#A30236] text-white px-4 py-3 flex items-center justify-between gap-3" style={{borderRadius:'3px'}}>
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] font-bold opacity-70 mb-0.5 tracking-wider uppercase">现在该讲 · {currentStep?.name}</div>
                    <div className="font-display font-bold text-sm leading-snug">{currentStep?.hint}</div>
                    {nextStep && <div className="text-[10px] opacity-60 mt-1">下一段：{nextStep.name}</div>}
                  </div>
                  <Btn variant="danger" size="sm" onClick={finishPractice}>结束</Btn>
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
      contextLabel={`${selected.name} · ${practiceTopic}`}
      duration={rec.duration}
      onRetry={() => { setStage('learn'); setTimeout(startPractice, 30); }}
      onNew={() => { setStage('learn'); setPracticeTopic(''); }}
    />;
  }

  // learn stage
  return (
    <div className="space-y-5 fade-in">

      {/* ╭ 1. 框架选择列表 ─────────────╮ */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="book" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[15px] m-0 leading-tight">选一个表达框架</h3>
            <div className="text-stone-500 text-[11px] mt-0.5">先学结构，再上镜头</div>
          </div>
        </div>
        <div className="space-y-2">
          {FRAMEWORKS.map((f, i) => {
            const active = selected.id === f.id;
            return (
              <button key={f.id} onClick={() => setSelected(f)}
                className={`w-full text-left p-3 transition-colors flex items-start gap-3 ${
                  active ? 'bg-[#FBEFF2] border border-[#A30236]' : 'bg-white border border-stone-200 hover:bg-stone-50'
                }`}
                style={{borderRadius:'3px'}}>
                <div className={`w-9 h-9 shrink-0 flex items-center justify-center font-display font-bold text-[14px] tabular-nums ${
                  active ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-600'
                }`} style={{borderRadius:'3px'}}>
                  {String(i + 1).padStart(2, '0')}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-2 mb-0.5 flex-wrap">
                    <span className={`font-display font-bold text-[14px] ${active ? 'text-[#A30236]' : 'text-stone-900'}`}>{f.name}</span>
                    <span className="text-[9px] tracking-[0.12em] uppercase text-stone-400 font-semibold border border-stone-200 px-1.5 py-px" style={{borderRadius:'2px'}}>{f.tag}</span>
                  </div>
                  <p className="text-stone-500 text-[11px] leading-relaxed m-0">{f.description}</p>
                </div>
                {active && <Icon name="check" size={16} className="text-[#A30236] shrink-0 mt-1" strokeWidth={2}/>}
              </button>
            );
          })}
        </div>
      </Card>

      {/* ╭ 2. 当前框架详解 ─────────────╮ */}
      <Card className="p-5">
        {/* Header */}
        <div className="mb-5 pb-4 border-b border-stone-200">
          <div className="eyebrow eyebrow--crimson mb-1.5" style={{fontSize:'10px'}}>当前框架</div>
          <h3 className="font-display font-bold text-stone-900 text-[20px] m-0 leading-tight">{selected.name}</h3>
          <p className="text-stone-500 text-[12px] mt-1.5 m-0 leading-relaxed">{selected.description}</p>
        </div>

        {/* Proportional bar (visual only) */}
        <div className="mb-2">
          <div className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold mb-2">时长分配</div>
          <div className="flex h-2 overflow-hidden border border-stone-200" style={{borderRadius:'2px'}}>
            {selected.steps.map((s, i) => (
              <div key={i} style={{width: `${s.percent}%`}}
                className={i === 0 ? 'bg-[#A30236]' :
                           i === 1 ? 'bg-[#BE003E]' :
                           i === 2 ? 'bg-[#F1A23F]' :
                           i === 3 ? 'bg-stone-700' : 'bg-stone-500'}>
              </div>
            ))}
          </div>
          {/* Percentage labels */}
          <div className="flex mt-1">
            {selected.steps.map((s, i) => (
              <div key={i} style={{width: `${s.percent}%`}} className="text-center">
                <span className="text-stone-400 text-[9px] tabular-nums">{s.percent}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* Vertical step list — readable, no squeeze */}
        <div className="space-y-2 mt-5">
          {selected.steps.map((s, i) => {
            const colors = [
              {dot:'bg-[#A30236]',  text:'text-[#A30236]'},
              {dot:'bg-[#BE003E]',  text:'text-[#BE003E]'},
              {dot:'bg-[#F1A23F]',  text:'text-[#A30236]'},
              {dot:'bg-stone-700',  text:'text-stone-900'},
            ];
            const c = colors[i] || colors[0];
            return (
              <div key={i} className="flex items-start gap-3 p-3 border border-stone-200" style={{borderRadius:'3px'}}>
                <div className="shrink-0 flex flex-col items-center">
                  <span className={`w-7 h-7 ${c.dot} text-white flex items-center justify-center font-display font-bold text-[13px] tabular-nums`} style={{borderRadius:'3px'}}>
                    {i + 1}
                  </span>
                  <span className="text-stone-400 text-[10px] tabular-nums mt-1 font-medium">{s.percent}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`font-display font-bold text-[14px] leading-tight ${c.text}`}>{s.name}</div>
                  <div className="text-stone-600 text-[12px] leading-relaxed mt-1">{s.hint}</div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Example block */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="sparkle" size={13} className="text-[#A30236]" strokeWidth={1.7}/>
            <span className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold">范例</span>
          </div>
          <div className="bg-stone-50 border-l-[3px] border-[#A30236] border-y border-r border-stone-200 p-3.5 text-[12px] leading-relaxed whitespace-pre-wrap text-stone-700"
               style={{borderRadius:'3px'}}>
            {selected.example}
          </div>
        </div>
      </Card>

      {/* ╭ 3. 上手实操 ─────────────╮ */}
      <Card className="p-5">
        <div className="flex items-center gap-2.5 mb-4">
          <div className="w-8 h-8 bg-[#A30236] text-white flex items-center justify-center" style={{borderRadius:"3px"}}>
            <Icon name="rec" size={16} strokeWidth={1.7} />
          </div>
          <div>
            <h3 className="font-display font-bold text-stone-900 text-[15px] m-0 leading-tight">立即镜头前实操</h3>
            <div className="text-stone-500 text-[11px] mt-0.5">屏幕会按阶段提示你该讲什么</div>
          </div>
        </div>

        {/* Topic */}
        <div className="mb-4">
          <div className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold mb-2">练习话题</div>
          <div className="flex gap-2">
            <input
              value={practiceTopic}
              onChange={e => setPracticeTopic(e.target.value)}
              placeholder="自己输入，或点右侧随机"
              className="flex-1 px-3 py-2.5 border border-stone-300 text-[13px] focus:outline-none focus:border-[#A30236]"
              style={{borderRadius:'3px'}}
            />
            <Btn variant="secondary" size="sm" onClick={() => {
              const pool = getDefaultTopicsPool();
              setPracticeTopic(pickAdaptiveTopic(pool, settings.topicPreferences, practiceTopic));
            }}><Icon name="dice" size={13}/> 随机</Btn>
          </div>
        </div>

        {/* Duration */}
        <div className="mb-5">
          <div className="text-stone-400 text-[10px] tracking-[0.16em] uppercase font-semibold mb-2">时长</div>
          <div className="grid grid-cols-3 gap-2">
            {[{v:30,l:'30s',sub:'极短'},{v:60,l:'60s',sub:'单点'},{v:180,l:'3min',sub:'完整'}].map(d => {
              const active = practiceDuration === d.v;
              return (
                <button key={d.v} onClick={() => setPracticeDuration(d.v)}
                  className={`p-2.5 border transition-colors text-center ${
                    active ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:bg-stone-50'
                  }`}
                  style={{borderRadius:'3px'}}>
                  <div className={`font-display font-bold text-[15px] tabular-nums ${active ? 'text-[#A30236]' : 'text-stone-900'}`}>{d.l}</div>
                  <div className={`text-[10px] mt-0.5 ${active ? 'text-[#A30236]' : 'text-stone-500'}`}>{d.sub}</div>
                </button>
              );
            })}
          </div>
        </div>

        {cam.error && <div className="text-[12px] text-[#A30236] mb-3 flex items-center gap-1.5"><Icon name="close" size={12}/>{cam.error}</div>}

        <Btn variant="primary" className="w-full" onClick={startPractice} disabled={!practiceTopic.trim()}>
          <Icon name="play" size={14}/> 带框架提示开始录制
        </Btn>
      </Card>

    </div>
  );
};

// ============ Mode 5: 无限模式（自动换题） ============
