import { Icon } from './icons.jsx';
import { formatTime } from '../lib/utils.jsx';
import { FILTER_PRESETS, BEAUTY_LEVELS } from '../hooks/use-camera.jsx';
import { cx, SectionHeader, ActionPanel } from './ui.jsx';
import { useState, useEffect, useRef } from '../react-hooks.jsx';

export const DeviceStatusItem = ({ icon, label, status, title }) => {
  const tone = {
    ready: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    checking: 'text-amber-700 bg-amber-50 border-amber-200',
    error: 'text-red-700 bg-red-50 border-red-200',
    off: 'text-stone-500 bg-stone-100 border-stone-200',
    idle: 'text-stone-500 bg-stone-100 border-stone-200',
  }[status] || 'text-stone-500 bg-stone-100 border-stone-200';
  const statusLabel = {
    ready: '已就绪',
    checking: '检查中',
    error: '不可用',
    off: '已关闭',
    idle: '待检查',
  }[status] || '待检查';
  return (
    <div className={`h-8 px-2.5 border flex items-center gap-1.5 ${tone}`} style={{borderRadius:'3px'}} title={title || `${label}${statusLabel}`}>
      <Icon name={icon} size={13} strokeWidth={1.9}/>
      <span className="text-[10px] font-bold whitespace-nowrap">{label}{statusLabel}</span>
    </div>
  );
};

export const CameraDeviceStrip = ({ cam, className = '' }) => {
  if (!cam) return null;
  return (
    <div className={`flex items-center gap-1.5 ${className}`} data-testid="camera-device-check">
      {!cam.voiceOnly && (
        <DeviceStatusItem
          icon="camera"
          label="镜头"
          status={cam.deviceCheck.camera}
          title={cam.deviceCheck.cameraLabel || '摄像头状态'}
        />
      )}
      <DeviceStatusItem
        icon="mic"
        label="收音"
        status={cam.deviceCheck.microphone}
        title={cam.deviceCheck.microphoneLabel || '麦克风状态'}
      />
    </div>
  );
};

export const CameraCompositionGuide = ({ visible }) => {
  if (!visible) return null;
  return (
    <div className="absolute inset-0 z-[2] pointer-events-none flex items-center justify-center" data-testid="composition-guide" aria-hidden="true">
      <div
        className="relative aspect-[9/16] border border-white/35 shadow-[0_0_0_9999px_rgba(0,0,0,0.04)]"
        style={{width:'min(100%, calc(100vh * 9 / 16))', maxHeight:'100%'}}
      >
        <div className="absolute top-1/3 left-0 right-0 border-t border-dashed border-amber-200/55" />
        <div className="absolute top-2/3 left-0 right-0 border-t border-dashed border-white/20" />
        <div className="absolute left-1/3 top-0 bottom-0 border-l border-dashed border-white/20" />
        <div className="absolute left-2/3 top-0 bottom-0 border-l border-dashed border-white/20" />
        <div className="absolute -top-5 left-0 text-[9px] font-bold text-white/65">9:16</div>
        <span className="absolute -top-px -left-px w-5 h-5 border-t-2 border-l-2 border-white/80" />
        <span className="absolute -top-px -right-px w-5 h-5 border-t-2 border-r-2 border-white/80" />
        <span className="absolute -bottom-px -left-px w-5 h-5 border-b-2 border-l-2 border-white/80" />
        <span className="absolute -bottom-px -right-px w-5 h-5 border-b-2 border-r-2 border-white/80" />
      </div>
    </div>
  );
};

export const CameraControlDock = ({ cam }) => {
  if (!cam || cam.voiceOnly) return null;
  const switchUnavailable = cam.switchingCamera || cam.cameraCount === 1;
  const controlClass = 'w-10 h-10 shrink-0 flex items-center justify-center border transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 disabled:opacity-35 disabled:cursor-not-allowed';
  const idleClass = 'bg-stone-950/80 border-white/15 text-white hover:bg-stone-900';
  const activeClass = 'bg-white border-white text-stone-950';
  return (
    <div className="absolute right-3 top-1/2 -translate-y-1/2 z-[45] flex flex-col gap-1.5" data-testid="camera-control-dock">
      <button
        type="button"
        onClick={cam.switchCamera}
        disabled={switchUnavailable}
        className={`${controlClass} ${idleClass}`}
        style={{borderRadius:'4px'}}
        aria-label={cam.cameraFacing === 'user' ? '切换到后置摄像头' : '切换到前置摄像头'}
        title={cam.cameraCount === 1 ? '当前只检测到一个摄像头' : (cam.cameraFacing === 'user' ? '切换到后置摄像头' : '切换到前置摄像头')}
        data-testid="switch-camera"
      >
        <Icon name="cameraSwitch" size={18} className={cam.switchingCamera ? 'animate-spin' : ''}/>
      </button>
      <button
        type="button"
        onClick={() => cam.setMirrorPreview(value => !value)}
        disabled={cam.cameraFacing !== 'user'}
        className={`${controlClass} ${cam.previewMirrored ? activeClass : idleClass}`}
        style={{borderRadius:'4px'}}
        aria-label={cam.previewMirrored ? '关闭自拍镜像' : '开启自拍镜像'}
        aria-pressed={cam.previewMirrored}
        title={cam.cameraFacing !== 'user' ? '后置镜头无需镜像' : '切换自拍镜像（只影响预览）'}
        data-testid="toggle-mirror"
      >
        <Icon name="mirror" size={18}/>
      </button>
      <button
        type="button"
        onClick={() => cam.setCompositionGuide(value => !value)}
        className={`${controlClass} ${cam.compositionGuide ? activeClass : idleClass}`}
        style={{borderRadius:'4px'}}
        aria-label={cam.compositionGuide ? '关闭九比十六构图线' : '开启九比十六构图线'}
        aria-pressed={cam.compositionGuide}
        title="9:16 构图辅助线"
        data-testid="toggle-composition-guide"
      >
        <Icon name="grid" size={17}/>
      </button>
      <div className="h-8 bg-stone-950/80 border border-white/15 flex items-center justify-center gap-1.5" style={{borderRadius:'4px'}} title="摄像头与麦克风设备状态">
        <span className={`w-1.5 h-1.5 rounded-full ${cam.deviceCheck.camera === 'ready' ? 'bg-emerald-400' : cam.deviceCheck.camera === 'checking' ? 'bg-amber-300 animate-pulse' : 'bg-red-400'}`} />
        <span className={`w-1.5 h-1.5 rounded-full ${cam.deviceCheck.microphone === 'ready' ? 'bg-emerald-400' : cam.deviceCheck.microphone === 'checking' ? 'bg-amber-300 animate-pulse' : 'bg-red-400'}`} />
      </div>
    </div>
  );
};

export const CameraErrorToast = ({ cam }) => cam?.error ? (
  <div className="absolute left-1/2 -translate-x-1/2 z-[55] w-[min(88%,420px)] bg-red-700/95 text-white px-3 py-2.5 text-[12px] font-medium shadow-lg" style={{top:'calc(env(safe-area-inset-top, 0px) + 64px)', borderRadius:'4px'}} role="alert">
    {cam.error}
  </div>
) : null;

// ============ Ready Overlay (3-2-1) ============

export const ReadyOverlay = ({ countdown, cam, hint }) => (
  <div className="absolute inset-0 bg-stone-950 z-50" style={{borderRadius:0}}>
    {/* 摄像头 —— 自拍模式（镜像），全屏可见以便用户构图 · 纯语音模式不渲染 video */}
    {cam.voiceOnly ? (
      <div className="absolute inset-0 flex items-center justify-center" style={{background:'linear-gradient(135deg, #3a0716 0%, #1c1917 100%)'}}>
        <div className="text-7xl opacity-50">🎙️</div>
      </div>
    ) : (
      <video ref={cam.videoRef} autoPlay playsInline muted
        className="absolute inset-0 w-full h-full object-contain"
        style={{ transform: cam.previewMirrored ? 'scaleX(-1)' : 'none' }}
      />
    )}
    {/* 半透明遮罩让倒计时更易读 */}
    <div className="absolute inset-0" style={{background:'linear-gradient(to bottom, rgba(15,15,15,0.78) 0%, rgba(15,15,15,0.45) 40%, rgba(15,15,15,0.45) 60%, rgba(15,15,15,0.78) 100%)'}} />
    {!cam.voiceOnly && <CameraCompositionGuide visible={cam.compositionGuide} />}

    {/* RANEPA frame chrome: thin crimson rules + corner ticks */}
    <div className="absolute inset-0 pointer-events-none">
      <div className="absolute top-0 left-0 right-0 h-[3px] bg-[#A30236]" />
      <div className="absolute top-6 left-8 right-8 flex items-center justify-between text-white/80 text-[11px] tracking-[0.22em] font-bold">
        <span>准备录制</span>
        <span>{countdown > 0 ? countdown : 0} 秒后开录</span>
      </div>
      <div className="absolute bottom-6 left-8 right-8 flex items-center justify-between text-white/60 text-[10px] tracking-[0.22em] font-bold">
        <span>KOBO · 口播练习器</span>
        <span>2026 · № 01</span>
      </div>
    </div>

    {/* 中央倒计时 + 话题提示 */}
    <div className="absolute inset-0 flex flex-col items-center justify-center text-center fade-in px-6">
      {hint && (
        <div className="mb-8 max-w-2xl border border-white/20 bg-stone-950/70 px-7 py-5 text-stone-100" style={{borderRadius:'4px'}}>
          <div className="eyebrow eyebrow--crimson mb-2" style={{color:"#F1A23F"}}>本次话题</div>
          <div className="font-display font-bold leading-snug text-[18px]">{hint}</div>
        </div>
      )}
      <div className="relative" key={countdown}>
        <div className="kobo-countdown font-display font-bold tabular-nums leading-none"
             style={{fontSize:'clamp(120px, 22vw, 260px)', color:'#fff', letterSpacing:'-0.04em', textShadow:'0 8px 40px rgba(163,2,54,0.35)'}}>
          {countdown > 0 ? countdown : 'GO'}
        </div>
        <div className="mx-auto mt-4 h-[3px] bg-[#A30236]" style={{width:'min(60vw, 360px)', borderRadius:'2px'}} />
      </div>
      {countdown > 0 && (
        <div className="mt-4 text-white/70 text-[12px] tracking-[0.22em] font-bold">{countdown} 秒后开始录制</div>
      )}
    </div>

    <CameraDeviceStrip cam={cam} className="absolute top-12 left-8 z-[45]" />
    <CameraControlDock cam={cam} />
    <CameraErrorToast cam={cam} />
  </div>
);

// ============ Camera Frame ============

export const CameraFrame = ({ videoRef, overlay, className='', voiceOnly = false, streamRef = null, status = 'idle', cam = null }) => {
  const statusRing = status === 'recording'
    ? 'ring-2 ring-[#A30236] ring-offset-1 ring-offset-stone-950'
    : status === 'preparing'
      ? 'ring-2 ring-[#F1A23F] ring-offset-1 ring-offset-stone-950'
      : 'border border-stone-800';
  const frameClass = cx('relative overflow-hidden bg-stone-950 min-h-[360px]', statusRing, className);
  if (voiceOnly) {
    return (
      <div className={cx(frameClass, 'bg-gradient-to-br from-stone-950 via-stone-900 to-[#3a0716]')}>
        <AudioVisualizer streamRef={streamRef} />
        {overlay}
      </div>
    );
  }
  return (
    <div className={frameClass}>
      <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" style={{transform: cam?.previewMirrored ? 'scaleX(-1)' : 'none'}} />
      <CameraCompositionGuide visible={!!cam?.compositionGuide} />
      {overlay}
      <CameraControlDock cam={cam} />
      <CameraErrorToast cam={cam} />
    </div>
  );
};

export const PracticeStageOverlay = ({ topic, modeLabel, elapsed, duration, status, onStop }) => {
  const statusText = {
    recording: '录制中',
    preparing: '准备中',
    idle: '待开始',
  }[status] || status;
  return (
  <div className="absolute inset-0 pointer-events-none">
    <div className="absolute top-3 left-3 right-3 flex items-start justify-between gap-3">
      <div className="bg-stone-950/80 text-white px-3 py-2 backdrop-blur max-w-[70%]" style={{borderRadius:'4px'}}>
        <div className="text-[9px] font-bold text-white/50 mb-1 tracking-[0.16em]">{modeLabel}</div>
        <div className="font-display font-bold text-[14px] leading-snug line-clamp-3">{topic}</div>
      </div>
      <div className="bg-white text-stone-950 px-3 py-2 text-right" style={{borderRadius:'4px'}}>
        <div className="text-[9px] font-bold text-stone-400 tracking-[0.16em]">{statusText}</div>
        <div className="font-display font-bold text-[18px] tabular-nums">{formatTime(elapsed || 0)}</div>
        {duration ? <div className="text-[10px] text-stone-500">总时长 {formatTime(duration)}</div> : null}
      </div>
    </div>
    {status === 'recording' && (
      <div
        data-testid="recording-stop"
        className="absolute left-1/2 -translate-x-1/2 pointer-events-auto z-10"
        style={{bottom:'calc(env(safe-area-inset-bottom, 0px) + 72px)'}}
      >
        <button onClick={onStop}
          className="bg-[#A30236] text-white px-5 py-3 font-bold flex items-center gap-2 shadow-lg"
          style={{borderRadius:'999px'}}>
          <span className="w-2 h-2 rounded-full bg-white pulse-rec" />
          停止录制
        </button>
      </div>
    )}
  </div>
  );
};

export const PromptWorkbench = ({ title, detail, bullets = [], action }) => (
  <ActionPanel className="p-4">
    <SectionHeader eyebrow="提词" title={title} detail={detail} action={action} />
    {bullets.length > 0 && (
      <div className="space-y-2">
        {bullets.map((item, idx) => (
          <div key={`${idx}-${item}`} className="flex gap-3 text-[13px] text-stone-700 leading-relaxed">
            <span className="font-display font-bold text-[#A30236] tabular-nums">{String(idx + 1).padStart(2, '0')}</span>
            <span>{item}</span>
          </div>
        ))}
      </div>
    )}
  </ActionPanel>
);

// 音频可视化：脉动圆 + 实时振幅条

export const AudioVisualizer = ({ streamRef }) => {
  const canvasRef = useRef(null);
  const rafRef = useRef(null);
  const ctxRef = useRef(null);
  const analyserRef = useRef(null);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 摄像头/麦克风的 start() 是异步的：挂载时 streamRef.current 往往还是 null。
    // 轮询等流出现（或换流）再接 analyser，否则可视化永远是死的。
    let pollTimer = null;
    let attachedStream = null;
    let disposed = false;

    const detach = () => {
      if (rafRef.current) { cancelAnimationFrame(rafRef.current); rafRef.current = null; }
      try { ctxRef.current?.close(); } catch {}
      ctxRef.current = null;
      analyserRef.current = null;
      attachedStream = null;
    };

    const attach = (stream) => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        ctxRef.current = audioCtx;
        // iOS Safari：AudioContext 可能以 suspended 状态创建
        if (audioCtx.state === 'suspended') { audioCtx.resume().catch(() => {}); }
        const source = audioCtx.createMediaStreamSource(stream);
        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        source.connect(analyser);
        analyserRef.current = analyser;
        attachedStream = stream;

        const dataArr = new Uint8Array(analyser.frequencyBinCount);
        let lastLevelUpdate = 0;
        let cachedGrad = null;
        let cachedH = 0;
        const tick = () => {
          if (disposed) return;
          analyser.getByteFrequencyData(dataArr);
          // 计算平均振幅（0-255）
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
          const avg = sum / dataArr.length / 255;
          // setLevel 触发整棵子树 re-render · 限到 ~10Hz 足够（文案/脉动圈有 CSS 过渡兜底）
          const now = performance.now();
          if (now - lastLevelUpdate > 100) { setLevel(avg); lastLevelUpdate = now; }

          // 绘制柱状波形
          const canvas = canvasRef.current;
          if (canvas) {
            const dpr = window.devicePixelRatio || 1;
            const targetW = Math.round(canvas.clientWidth * dpr);
            const targetH = Math.round(canvas.clientHeight * dpr);
            // 只有尺寸变化才重设 width/height（每次赋值都会强制清空+重分配缓冲）
            if (canvas.width !== targetW)  canvas.width  = targetW;
            if (canvas.height !== targetH) canvas.height = targetH;
            const w = canvas.width, h = canvas.height;
            const cctx = canvas.getContext('2d');
            cctx.clearRect(0, 0, w, h);
            if (!cachedGrad || cachedH !== h) {
              cachedGrad = cctx.createLinearGradient(0, 0, 0, h);
              cachedGrad.addColorStop(0, '#F1A23F');
              cachedGrad.addColorStop(1, '#A30236');
              cachedH = h;
            }
            cctx.fillStyle = cachedGrad;
            const bars = 48;
            const bw = w / bars / 2;
            const step = Math.floor(dataArr.length / bars);
            for (let i = 0; i < bars; i++) {
              const v = dataArr[i * step] / 255;
              const bh = v * h * 0.65;
              const x = i * (bw * 2) + bw;
              const y = h - bh - 4;
              cctx.fillRect(x, y, bw * 1.4, bh);
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        tick();
      } catch (e) {
        setError(e.message || String(e));
      }
    };

    const ensureAttached = () => {
      if (disposed) return;
      const stream = streamRef?.current;
      const liveAudio = stream?.getAudioTracks?.().some(t => t.readyState === 'live');
      if (stream !== attachedStream || (attachedStream && !liveAudio)) {
        detach();
        if (stream && liveAudio) attach(stream);
      }
    };

    ensureAttached();
    pollTimer = setInterval(ensureAttached, 500);

    return () => {
      disposed = true;
      if (pollTimer) clearInterval(pollTimer);
      detach();
    };
  }, [streamRef]);

  const ringScale = 1 + level * 0.45;
  const ringOpacity = 0.35 + level * 0.4;

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center overflow-hidden">
      {/* 脉动圆 */}
      <div className="relative w-44 h-44 flex items-center justify-center mb-6">
        <div className="absolute inset-0 rounded-full bg-[#A30236]/20 transition-transform duration-100 ease-out"
          style={{transform: `scale(${ringScale * 1.2})`, opacity: ringOpacity * 0.6}} />
        <div className="absolute inset-4 rounded-full bg-[#A30236]/30 transition-transform duration-100 ease-out"
          style={{transform: `scale(${ringScale})`, opacity: ringOpacity}} />
        <div className="relative w-24 h-24 rounded-full bg-gradient-to-br from-[#F1A23F] to-[#A30236] flex items-center justify-center text-5xl shadow-2xl">
          🎙️
        </div>
      </div>

      {/* 实时波形 */}
      <canvas ref={canvasRef} className="w-full h-24 max-w-md px-6" />

      {/* 状态字 */}
      <div className="text-center mt-4 px-6">
        <div className="text-[10px] tracking-[0.3em] uppercase font-bold text-amber-300 mb-1">
          🎙️ 纯语音模式 · 摄像头关闭
        </div>
        <div className="text-white/50 text-[11px]">
          {level < 0.02 ? '听不到声音 · 试着说话' : level < 0.15 ? '声音偏轻 · 可以放大' : level > 0.6 ? '声音偏大 · 可以收一点' : '✓ 音量正好'}
        </div>
        {error && <div className="text-red-300 text-[10px] mt-2">{error}</div>}
      </div>
    </div>
  );
};

// ============ Beauty / Filter Sheet ============
// 滑杆组件（深色面板用）

export const Slider = ({ label, value, onChange, hint }) => (
  <div>
    <div className="flex items-baseline justify-between mb-1">
      <span className="text-white text-xs font-semibold">{label}</span>
      <span className="text-amber-300 text-[10px] tabular-nums">{Math.round(value * 100)}%</span>
    </div>
    <input type="range" min="0" max="100" value={Math.round(value * 100)}
      onChange={e => onChange((+e.target.value) / 100)}
      className="w-full accent-[#A30236]"
      style={{height:'4px'}} />
    {hint && <div className="text-[10px] text-white/40 mt-0.5">{hint}</div>}
  </div>
);

export const FilterSheet = ({ cam, onClose }) => {
  const [tab, setTab] = useState('beauty'); // beauty | filter
  return (
    <div className="absolute inset-x-0 bottom-0 z-[80] bg-stone-950/95 backdrop-blur px-4 pt-3 fade-in"
         style={{borderTop:'1px solid rgba(255,255,255,0.08)', paddingBottom:'calc(env(safe-area-inset-bottom, 0px) + 16px)'}}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Icon name="sparkle" size={14} style={{color:'#F1A23F'}} />
          <span className="text-white text-sm font-bold tracking-wider">美颜 + 滤镜</span>
        </div>
        <button onClick={onClose} className="text-white/60 hover:text-white text-sm">完成 ✓</button>
      </div>
      {/* tab 切换 */}
      <div className="flex gap-1 mb-3">
        {[{id:'beauty',l:'美颜'},{id:'filter',l:'滤镜'}].map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={`px-3 py-1.5 text-xs font-semibold transition-colors ${tab === t.id ? 'bg-[#A30236] text-white' : 'bg-stone-800 text-white/70'}`}
            style={{borderRadius:'2px'}}>{t.l}</button>
        ))}
      </div>

      {tab === 'beauty' && (
        <div className="space-y-3">
          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold flex items-center gap-2">
            柔光磨皮（不需要识别人脸 · 始终可用）
          </div>
          <div className="flex gap-1.5">
            {BEAUTY_LEVELS.map(l => (
              <button key={l.v} onClick={() => cam.setBeautyLevel(l.v)}
                className={`flex-1 py-1.5 text-xs transition-colors ${
                  cam.beautyLevel === l.v ? 'bg-[#A30236] text-white font-semibold' : 'bg-stone-800 text-white/80 hover:bg-stone-700'
                }`}
                style={{borderRadius:'2px'}}>{l.label}</button>
            ))}
          </div>

          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold pt-2 flex items-center gap-2 flex-wrap">
            真磨皮 · MediaPipe 人脸识别
            {cam.faceFxLoading && (
              <span className="text-amber-300 normal-case tracking-normal">
                · 下载美颜模型 {cam.faceFxProgress || 0}% · 14MB · 首次需要 5-15 秒
              </span>
            )}
            {!cam.faceFxReady && !cam.faceFxLoading && <span className="text-amber-300 normal-case tracking-normal">· 模型未就绪</span>}
            {cam.faceFxReady && !cam.faceFxLoading && <span className="text-emerald-400 normal-case tracking-normal">· MediaPipe ✓</span>}
          </div>
          {cam.faceFxLoading && (
            <div className="h-1 bg-stone-800 overflow-hidden" style={{borderRadius:'1px'}}>
              <div className="h-full bg-amber-300 transition-all duration-300 ease-out"
                style={{width: `${cam.faceFxProgress || 0}%`}} />
            </div>
          )}
          <div className="space-y-2.5">
            <Slider label="真磨皮" value={cam.skinSmooth} onChange={cam.setSkinSmooth}
              hint="只在皮肤区域柔焦 · 眼睛头发保留清晰 · 不变形" />
          </div>

          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] font-bold pt-2 flex items-center gap-2">
            背景虚化（人像分割 · 自动识别人和背景）
          </div>
          <div className="space-y-2.5">
            <Slider label="背景虚化" value={cam.bgBlur} onChange={cam.setBgBlur}
              hint="保留人物清晰 · 背景高斯模糊 6 ~ 28 px" />
          </div>
        </div>
      )}

      {tab === 'filter' && (
        <div>
          <div className="text-[10px] text-white/50 uppercase tracking-[0.2em] mb-2 font-bold">调色滤镜</div>
          <div className="grid grid-cols-4 gap-1.5">
            {FILTER_PRESETS.map(p => (
              <button key={p.id} onClick={() => cam.setFilterPreset(p.id)}
                className={`px-2 py-2 text-xs transition-colors ${
                  cam.filterPreset === p.id ? 'bg-[#A30236] text-white font-semibold' : 'bg-stone-800 text-white/80 hover:bg-stone-700'
                }`}
                style={{borderRadius:'2px'}}>{p.name}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export const BeautyButton = ({ cam, style = {}, className = '' }) => {
  const [open, setOpen] = useState(false);
  const on = cam.filterPreset !== 'none' || cam.beautyLevel > 0
          || cam.skinSmooth > 0 || cam.bgBlur > 0;
  return (
    <>
      <button onClick={() => setOpen(true)}
        className={`flex items-center gap-1.5 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold ${on ? 'bg-[#A30236]/90' : 'bg-stone-950/80'} ${className}`}
        style={{borderRadius: '2px', ...style}}
        title="美颜 / 滤镜"
      >
        <Icon name="sparkle" size={13} />美颜
      </button>
      {open && <FilterSheet cam={cam} onClose={() => setOpen(false)} />}
    </>
  );
};

// 观众视角预览：临时关美颜+滤镜 5s · 看真实的自己

export const AudienceViewButton = ({ cam, style = {}, className = '' }) => {
  const [previewing, setPreviewing] = useState(false);
  const [savedState, setSavedState] = useState(null);
  const savedStateRef = useRef(null);   // timeout 闭包读这里 · 避免拿到过期 state
  const timeoutRef = useRef(null);
  const [remaining, setRemaining] = useState(0);
  const tickRef = useRef(null);

  const start = () => {
    if (previewing) return;
    // 没开美颜/滤镜 → 没意义，给提示但仍然让 toast 显示
    const anyBeauty = cam.filterPreset !== 'none' || cam.beautyLevel > 0
      || cam.skinSmooth > 0 || cam.bgBlur > 0;

    // 保存当前状态 · 同步存进 ref：5 秒后的 timeout 闭包里读 state 拿到的是
    // start 那一刻的旧值（永远是 null → 用户的美颜设置回不来），ref 没这个问题
    const snapshot = {
      filterPreset: cam.filterPreset,
      beautyLevel: cam.beautyLevel,
      skinSmooth: cam.skinSmooth,
      bgBlur: cam.bgBlur,
      anyBeauty,
    };
    savedStateRef.current = snapshot;
    setSavedState(snapshot);
    // 全部归零（即"裸"画面）
    cam.setFilterPreset('none');
    cam.setBeautyLevel(0);
    cam.setSkinSmooth(0);
    cam.setBgBlur(0);
    setPreviewing(true);
    setRemaining(5);

    // 每秒 tick
    tickRef.current = window.setInterval(() => {
      setRemaining(r => Math.max(0, r - 1));
    }, 1000);

    // 5s 后恢复
    timeoutRef.current = window.setTimeout(() => {
      restore();
    }, 5000);
  };

  // 恢复：从 ref 读最新快照 · 不依赖闭包里的 state
  const restore = () => {
    const s = savedStateRef.current;
    if (s) {
      cam.setFilterPreset(s.filterPreset);
      cam.setBeautyLevel(s.beautyLevel);
      cam.setSkinSmooth(s.skinSmooth);
      cam.setBgBlur(s.bgBlur);
    }
    cleanup();
  };

  const cleanup = () => {
    if (timeoutRef.current) { window.clearTimeout(timeoutRef.current); timeoutRef.current = null; }
    if (tickRef.current)    { window.clearInterval(tickRef.current);   tickRef.current = null; }
    savedStateRef.current = null;
    setPreviewing(false);
    setSavedState(null);
    setRemaining(0);
  };

  // 用户手动取消
  const cancel = () => {
    restore();
  };

  // 卸载清理
  useEffect(() => () => {
    if (timeoutRef.current) window.clearTimeout(timeoutRef.current);
    if (tickRef.current)    window.clearInterval(tickRef.current);
  }, []);

  return (
    <>
      <button onClick={previewing ? cancel : start}
        className={`flex items-center gap-1.5 backdrop-blur text-white px-2.5 py-1.5 text-[11px] tracking-wider font-bold transition-colors ${previewing ? 'bg-amber-500/90' : 'bg-stone-950/80'} ${className}`}
        style={{borderRadius: '2px', ...style}}
        title="一键看真实的自己（5 秒）">
        <Icon name="search" size={13} />
        {previewing ? `真实 ${remaining}s` : '真实'}
      </button>

      {/* 全屏 toast · previewing 期间显示 */}
      {previewing && (
        <div className="fixed inset-x-0 z-[90] flex justify-center pointer-events-none px-4"
          style={{top:'calc(env(safe-area-inset-top, 0px) + 80px)'}}>
          <div className="bg-amber-500/95 text-white px-4 py-3 backdrop-blur fade-in"
            style={{borderRadius:'3px', maxWidth:'90%'}}>
            <div className="text-[11px] tracking-[0.22em] uppercase font-bold mb-0.5 opacity-80">
              👁 观众视角 · {remaining}s
            </div>
            <div className="text-sm font-bold">
              {savedState?.anyBeauty ? '这才是观众看到的你' : '没开美颜 · 你看到的就是观众看到的'}
            </div>
            <div className="text-[10px] mt-1 opacity-80">
              点击按钮可提前结束
            </div>
          </div>
        </div>
      )}
    </>
  );
};

// ============ 同题对比：今天 vs 上次同题 ============
// 视频本身没存（saveVideoToDisk 写到用户文件夹或下载夹），但 transcript / duration
// 存在 localStorage.savedFiles 里 · 所以能做「数据对比」：嗯啊数 / WPM / 时长
// 三个指标 + 展开看上次转录稿
