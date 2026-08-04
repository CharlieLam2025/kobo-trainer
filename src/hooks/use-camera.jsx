import { SettingsContext } from '../settings-context.jsx';
import { useState, useEffect, useRef, useCallback } from '../react-hooks.jsx';

export const FILTER_PRESETS = [
  { id: 'none',    name: '原图', css: '' },
  // 柔光 —— 自然系，皮肤稍提亮 + 微暖 + 微饱和
  { id: 'soft',    name: '柔光', css: 'brightness(1.04) saturate(1.10) contrast(0.97) hue-rotate(-3deg)' },
  // 复古 —— 低饱和 + 棕调 · 暖色兜底
  { id: 'vintage', name: '复古', css: 'brightness(0.95) contrast(1.06) saturate(0.78) sepia(0.24)' },
];

// 美颜强度 —— 大幅降低 blur 上限（之前 1.3px 太糊）

export const BEAUTY_LEVELS = [
  { v: 0, label: '关', blur: 0,    bright: 1,    sat: 1    },
  { v: 1, label: '轻', blur: 0.25, bright: 1.03, sat: 1.04 },
  { v: 2, label: '中', blur: 0.45, bright: 1.05, sat: 1.07 },
  { v: 3, label: '重', blur: 0.70, bright: 1.08, sat: 1.10 },
];

// 滤镜顺序：先做轻微 blur（柔焦），再叠提亮/饱和度，最后套预设调色。
// 这样色调先在原图上跑、再被柔化的细节托住，比"先调色再糊"自然。

export const computeFilterCSS = (presetId, level) => {
  const p = FILTER_PRESETS.find(x => x.id === presetId) || FILTER_PRESETS[0];
  const b = BEAUTY_LEVELS[level] || BEAUTY_LEVELS[0];
  const parts = [];
  if (b.blur > 0)     parts.push(`blur(${b.blur}px)`);
  if (b.bright !== 1) parts.push(`brightness(${b.bright})`);
  if (b.sat !== 1)    parts.push(`saturate(${b.sat})`);
  if (p.css)          parts.push(p.css);
  return parts.join(' ').trim() || 'none';
};

// ===== 摄像头 Hook（带美颜/滤镜 + 录制流）=====
// 设计：raw stream 喂给一个隐藏 video，每帧画到 canvas 时套 ctx.filter。
// 显示用的 video 元素直接绑 raw stream + CSS filter（同样的效果，但走 GPU 渲染更顺）。
// MediaRecorder 接 canvas.captureStream() —— 滤镜直接烧进录像。
// ===== MediaPipe Face Landmark 索引（478 点中我们关心的） =====
// 砍掉了瘦脸 / 大眼 · 只剩真磨皮需要 face oval 36 点

export const FACE_OVAL_IDX = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109];

// 构造路径（landmarks 与成片 canvas 使用相同的观众视角坐标）

export const tracePath = (ctx, lm, idx, w, h) => {
  ctx.beginPath();
  for (let i = 0; i < idx.length; i++) {
    const p = lm[idx[i]];
    if (i === 0) ctx.moveTo(p.x * w, p.y * h);
    else         ctx.lineTo(p.x * w, p.y * h);
  }
  ctx.closePath();
};

// 带 progress 的 fetch · 用于 MediaPipe wasm/model 预热缓存
// 浏览器 HTTP cache + SW cache 自然记下 · MediaPipe 后续 fetch 同 URL 走缓存秒到位
// 不返回 body · 只为了让缓存有 · onProgress 收 0-100 整数（基于 Content-Length 比例）

export async function fetchWithProgress(url, onProgress) {
  try {
    const res = await fetch(url);
    if (!res.ok || !res.body) return false;
    const total = parseInt(res.headers.get('Content-Length') || '0', 10);
    const reader = res.body.getReader();
    let received = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      received += (value?.length || 0);
      if (total > 0 && typeof onProgress === 'function') {
        onProgress(Math.min(99, Math.round((received / total) * 100)));
      }
    }
    return true;
  } catch { return false; }
}

export const CAMERA_PREFS_KEY = 'kobo.cameraPreferences.v1';

export const DEFAULT_CAMERA_PREFS = Object.freeze({
  cameraFacing: 'user',
  mirrorPreview: true,
  compositionGuide: true,
});

export const loadCameraPreferences = () => {
  try {
    const stored = JSON.parse(localStorage.getItem(CAMERA_PREFS_KEY) || '{}');
    return {
      cameraFacing: stored.cameraFacing === 'environment' ? 'environment' : 'user',
      mirrorPreview: stored.mirrorPreview !== false,
      compositionGuide: stored.compositionGuide !== false,
    };
  } catch {
    return { ...DEFAULT_CAMERA_PREFS };
  }
};

export const cameraVideoConstraints = (cameraFacing) => ({
  width: { ideal: 720 },
  height: { ideal: 1280 },
  aspectRatio: { ideal: 9 / 16 },
  facingMode: { ideal: cameraFacing === 'environment' ? 'environment' : 'user' },
});

export const CAMERA_OUTPUT_WIDTH = 720;

export const CAMERA_OUTPUT_HEIGHT = 1280;

// 与 canvas.captureStream(30) 对齐 · 避免 60fps rAF 做双倍无用绘制
export const CAMERA_PIPELINE_FPS = 30;
export const CAMERA_PIPELINE_FRAME_MS = 1000 / CAMERA_PIPELINE_FPS;

// 不透明视频帧 + desynchronized：跳过 alpha 合成、允许浏览器异步提交，减 CPU/GPU 同步等待
export const getPipeline2dContext = (canvas) => {
  try {
    return canvas.getContext('2d', { alpha: false, desynchronized: true }) || canvas.getContext('2d');
  } catch {
    return canvas.getContext('2d');
  }
};

export const getCoverCrop = (sourceWidth, sourceHeight) => {
  const targetAspect = CAMERA_OUTPUT_WIDTH / CAMERA_OUTPUT_HEIGHT;
  const sourceAspect = sourceWidth / sourceHeight;
  if (sourceAspect > targetAspect) {
    const width = sourceHeight * targetAspect;
    return { x: (sourceWidth - width) / 2, y: 0, width, height: sourceHeight };
  }
  const height = sourceWidth / targetAspect;
  return { x: 0, y: (sourceHeight - height) / 2, width: sourceWidth, height };
};

export const formatMediaDeviceError = (error, voiceOnly = false) => {
  const name = error?.name || '';
  if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
    return voiceOnly
      ? '麦克风权限被关闭，请在浏览器或系统设置中允许后重试。'
      : '摄像头或麦克风权限被关闭，请在浏览器或系统设置中允许后重试。';
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return voiceOnly ? '没有检测到可用麦克风。' : '没有检测到可用的摄像头或麦克风。';
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return '设备正被其他应用占用，请关闭其他相机或录音应用后重试。';
  }
  if (name === 'OverconstrainedError' || name === 'ConstraintNotSatisfiedError') {
    return '当前设备不支持所选镜头，请换一个摄像头后重试。';
  }
  if (name === 'SecurityError') {
    return '当前页面无法调用摄像头，请使用 HTTPS 地址或安装版应用。';
  }
  return error?.message ? `设备启动失败：${error.message}` : '设备启动失败，请重试。';
};

// ===== 美颜 hook：MediaPipe 检测 + canvas 2D 应用 =====

export function useCamera() {
  // 读取全局"纯语音"设置 · settings 可能在 Context 外被调用，因此用 try/catch 兜底
  let voiceOnlySetting = false;
  try {
    const settingsCtx = React.useContext(SettingsContext);
    voiceOnlySetting = !!settingsCtx?.voiceOnly;
  } catch {}
  const voiceOnlyRef = useRef(voiceOnlySetting);
  voiceOnlyRef.current = voiceOnlySetting;

  const initialCameraPrefsRef = useRef(null);
  if (!initialCameraPrefsRef.current) initialCameraPrefsRef.current = loadCameraPreferences();
  const [cameraFacing, setCameraFacingState] = useState(initialCameraPrefsRef.current.cameraFacing);
  const [mirrorPreview, setMirrorPreviewState] = useState(initialCameraPrefsRef.current.mirrorPreview);
  const [compositionGuide, setCompositionGuideState] = useState(initialCameraPrefsRef.current.compositionGuide);
  const cameraPrefsRef = useRef(initialCameraPrefsRef.current);
  const cameraFacingRef = useRef(cameraFacing);
  cameraFacingRef.current = cameraFacing;

  const streamRef        = useRef(null); // 原始 getUserMedia 流
  const videoElRef       = useRef(null); // 显示用 <video>（优先绑定最终 canvas 流）
  const hiddenVideoRef   = useRef(null); // 隐藏 <video>，喂给 canvas
  const canvasRef        = useRef(null); // 输出 canvas（送录像器）
  const scratchRef       = useRef(null); // 临时 canvas（磨皮模糊/区域捕获）
  const filteredStreamRef= useRef(null); // canvas.captureStream + audio
  const rafRef           = useRef(null);
  const filterCSSRef     = useRef('none');
  const cameraSessionRef = useRef(0);

  const landmarkerRef    = useRef(null); // MediaPipe FaceLandmarker 实例
  const segmenterRef     = useRef(null); // MediaPipe ImageSegmenter 实例（selfie）
  const landmarkerPromiseRef = useRef(null); // 进行中的 Landmarker 初始化（去重并发触发）
  const segmenterPromiseRef  = useRef(null); // 进行中的 Segmenter 初始化
  const disposedRef      = useRef(false);    // hook 是否已卸载（供异步初始化判断释放）
  const maskCanvasRef    = useRef(null); // 缓存的人像 mask（用于背景虚化合成）

  const [filterPreset, setFilterPreset] = useState('none');
  const [beautyLevel,  setBeautyLevel]  = useState(0);
  // 真磨皮 / 背景虚化（0-1 浮点）· 砍掉瘦脸 / 大眼
  // 第一性原理：训练工具不变形脸 · 只柔焦皮肤 + 模糊背景 · 让你看到的是真的你 · 只是更舒服
  const [skinSmooth,   setSkinSmooth]   = useState(0);
  const [bgBlur,       setBgBlur]       = useState(0);
  const [faceFxReady,  setFaceFxReady]  = useState(false); // MediaPipe 是否加载就绪
  const [faceFxLoading,setFaceFxLoading]= useState(false);
  // 0-100 · 用 fetchWithProgress 预热缓存的实时进度 · 让用户知道在下东西 · 不是 app 卡死
  const [faceFxProgress, setFaceFxProgress] = useState(0);
  const skinRef = useRef(0); skinRef.current = skinSmooth;
  const bgBlurRef = useRef(0); bgBlurRef.current = bgBlur;

  const [active, setActive] = useState(false);
  const [error,  setError]  = useState(null);
  const [switchingCamera, setSwitchingCamera] = useState(false);
  const switchingCameraRef = useRef(false);
  const [cameraCount, setCameraCount] = useState(null);
  const [deviceCheck, setDeviceCheck] = useState({
    status: 'idle',
    camera: voiceOnlySetting ? 'off' : 'idle',
    microphone: 'idle',
    cameraLabel: '',
    microphoneLabel: '',
  });

  const saveCameraPreference = useCallback((key, value) => {
    const next = { ...cameraPrefsRef.current, [key]: value };
    cameraPrefsRef.current = next;
    try { localStorage.setItem(CAMERA_PREFS_KEY, JSON.stringify(next)); } catch {}
  }, []);

  const setMirrorPreview = useCallback((value) => {
    const next = typeof value === 'function' ? value(cameraPrefsRef.current.mirrorPreview) : value;
    const normalized = !!next;
    setMirrorPreviewState(normalized);
    saveCameraPreference('mirrorPreview', normalized);
  }, [saveCameraPreference]);

  const setCompositionGuide = useCallback((value) => {
    const next = typeof value === 'function' ? value(cameraPrefsRef.current.compositionGuide) : value;
    const normalized = !!next;
    setCompositionGuideState(normalized);
    saveCameraPreference('compositionGuide', normalized);
  }, [saveCameraPreference]);

  const refreshCameraCount = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return;
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      setCameraCount(devices.filter(device => device.kind === 'videoinput').length);
    } catch {}
  }, []);

  const releaseMediaResources = useCallback(() => {
    if (rafRef.current != null) {
      // rAF handle 或 { type:'rvfc', id } · 兼容 requestVideoFrameCallback 路径
      if (typeof rafRef.current === 'object' && rafRef.current.type === 'rvfc') {
        try { hiddenVideoRef.current?.cancelVideoFrameCallback?.(rafRef.current.id); } catch {}
      } else {
        const id = typeof rafRef.current === 'object' ? rafRef.current.id : rafRef.current;
        try { cancelAnimationFrame(id); } catch {}
      }
      rafRef.current = null;
    }
    const tracks = new Set([
      ...(filteredStreamRef.current?.getTracks?.() || []),
      ...(streamRef.current?.getTracks?.() || []),
    ]);
    tracks.forEach(track => track.stop());
    filteredStreamRef.current = null;
    streamRef.current = null;
    if (hiddenVideoRef.current) {
      try { hiddenVideoRef.current.srcObject = null; } catch {}
      hiddenVideoRef.current = null;
    }
    if (videoElRef.current) {
      try { videoElRef.current.srcObject = null; } catch {}
    }
  }, []);

  // 监听 MediaPipe ready
  // __loadMediaPipe 存在即视为「能力可用」：ESM 是真懒加载的 · 开美颜时才 import
  useEffect(() => {
    if (window.__MEDIAPIPE || typeof window.__loadMediaPipe === 'function') setFaceFxReady(true);
    const onReady = () => setFaceFxReady(true);
    window.addEventListener('mediapipe-ready', onReady);
    return () => window.removeEventListener('mediapipe-ready', onReady);
  }, []);

  // 同步 CSS 滤镜到显示元素
  useEffect(() => {
    const css = computeFilterCSS(filterPreset, beautyLevel);
    filterCSSRef.current = css;
    if (videoElRef.current) {
      // 录像预览绑定 canvas 输出时，滤镜已经烧进画面，不能再套第二遍。
      videoElRef.current.style.filter = filteredStreamRef.current ? 'none' : css;
    }
  }, [filterPreset, beautyLevel]);

  // 懒加载 FaceLandmarker：用户开启任一面部 FX 时才初始化
  // 关键改造：在调 MediaPipe 之前 · 用 fetchWithProgress 预热 wasm + model 的缓存
  //   · 14MB 下载用真实进度条 · 不再「点了等 10 秒以为 app 死了」
  const ensureLandmarker = useCallback(async () => {
    if (landmarkerRef.current) return landmarkerRef.current;
    if (!window.__MEDIAPIPE && typeof window.__loadMediaPipe !== 'function') return null;
    // in-flight 去重：滑杆连续变化会并发触发多次 · 每次都实例化一个 GPU/WASM
    // FaceLandmarker 且互相覆盖 → 只保留一个进行中的 Promise
    if (landmarkerPromiseRef.current) return landmarkerPromiseRef.current;
    setFaceFxLoading(true);
    setFaceFxProgress(0);
    const task = (async () => {
      try {
        // ESM 真懒加载：第一次开美颜时才 import vision_bundle.mjs（137KB）
        const mp = window.__MEDIAPIPE || await window.__loadMediaPipe();
        if (!mp) return null;
        const { FilesetResolver, FaceLandmarker } = mp;
        const wasmUrl  = new URL('./mediapipe/vision_wasm_internal.wasm', window.location.href).href;
        const modelUrl = new URL('./mediapipe/face_landmarker.task', window.location.href).href;
        // 预热缓存 · wasm (~9.5MB) 占 70% · model (~3.8MB) 占 30%
        await Promise.all([
          fetchWithProgress(wasmUrl,  p => setFaceFxProgress(Math.round(p * 0.7))),
          fetchWithProgress(modelUrl, p => setFaceFxProgress(70 + Math.round(p * 0.3))),
        ]);
        setFaceFxProgress(95);  // 真正实例化 MediaPipe（拿缓存 · 通常 < 1s）
        const vision = await FilesetResolver.forVisionTasks(new URL('./mediapipe/', window.location.href).href);
        const lm = await FaceLandmarker.createFromOptions(vision, {
          baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
          outputFaceBlendshapes: false,
          runningMode: 'VIDEO',
          numFaces: 1,
        });
        if (disposedRef.current) { try { lm.close(); } catch {} return null; }  // hook 已卸载 → 立刻释放
        landmarkerRef.current = lm;
        setFaceFxProgress(100);
        return lm;
      } catch (e) {
        console.warn('[FaceLandmarker] init failed:', e?.message || e);
        return null;
      } finally {
        landmarkerPromiseRef.current = null;
        setFaceFxLoading(false);
      }
    })();
    landmarkerPromiseRef.current = task;
    return task;
  }, []);

  // 懒加载 ImageSegmenter：背景虚化打开时才初始化
  // 同样先用 fetchWithProgress 预热 · 跟 ensureLandmarker 共用同一 progress state
  const ensureSegmenter = useCallback(async () => {
    if (segmenterRef.current) return segmenterRef.current;
    if (!window.__MEDIAPIPE && typeof window.__loadMediaPipe !== 'function') return null;
    if (segmenterPromiseRef.current) return segmenterPromiseRef.current;  // in-flight 去重（同 ensureLandmarker）
    setFaceFxLoading(true);
    setFaceFxProgress(0);
    const task = (async () => {
      try {
        const mp = window.__MEDIAPIPE || await window.__loadMediaPipe();
        if (!mp) return null;
        const { FilesetResolver, ImageSegmenter } = mp;
        const wasmUrl  = new URL('./mediapipe/vision_wasm_internal.wasm', window.location.href).href;
        const modelUrl = new URL('./mediapipe/selfie_segmenter.tflite', window.location.href).href;
        // wasm 占 90%（9.5MB）· segmenter 模型只有 ~240KB · 占 10% 已足够
        await Promise.all([
          fetchWithProgress(wasmUrl,  p => setFaceFxProgress(Math.round(p * 0.9))),
          fetchWithProgress(modelUrl, p => setFaceFxProgress(90 + Math.round(p * 0.1))),
        ]);
        setFaceFxProgress(95);
        const vision = await FilesetResolver.forVisionTasks(new URL('./mediapipe/', window.location.href).href);
        const sg = await ImageSegmenter.createFromOptions(vision, {
          baseOptions: { modelAssetPath: modelUrl, delegate: 'GPU' },
          runningMode: 'VIDEO',
          outputCategoryMask: true,
          outputConfidenceMasks: false,
        });
        if (disposedRef.current) { try { sg.close(); } catch {} return null; }
        segmenterRef.current = sg;
        setFaceFxProgress(100);
        return sg;
      } catch (e) {
        console.warn('[ImageSegmenter] init failed:', e?.message || e);
        return null;
      } finally {
        segmenterPromiseRef.current = null;
        setFaceFxLoading(false);
      }
    })();
    segmenterPromiseRef.current = task;
    return task;
  }, []);

  // 任意面部 FX 强度变化 → 触发初始化
  useEffect(() => {
    if (skinSmooth > 0) {
      ensureLandmarker();
    }
    if (bgBlur > 0) {
      ensureSegmenter();
    }
  }, [skinSmooth, bgBlur, ensureLandmarker, ensureSegmenter]);

  const attachVideo = useCallback((el) => {
    videoElRef.current = el;
    if (el) {
      const previewStream = filteredStreamRef.current || streamRef.current;
      el.style.filter = filteredStreamRef.current ? 'none' : filterCSSRef.current;
      if (previewStream) {
        el.srcObject = previewStream;
        el.muted = true;
        el.play().catch(() => {});
      }
    }
  }, []);

  const start = useCallback(async () => {
    const sessionId = cameraSessionRef.current + 1;
    cameraSessionRef.current = sessionId;
    releaseMediaResources();
    setActive(false);
    setError(null);
    setDeviceCheck({
      status: 'checking',
      camera: voiceOnlyRef.current ? 'off' : 'checking',
      microphone: 'checking',
      cameraLabel: '',
      microphoneLabel: '',
    });
    try {
      // 🎙️ 纯语音模式：跳过所有 video 设置 · audio-only 流
      if (voiceOnlyRef.current) {
        const s = await navigator.mediaDevices.getUserMedia({ video: false, audio: true });
        if (sessionId !== cameraSessionRef.current) {
          s.getTracks().forEach(track => track.stop());
          return null;
        }
        const audioTrack = s.getAudioTracks()[0];
        if (!audioTrack) {
          s.getTracks().forEach(track => track.stop());
          throw new DOMException('Microphone track unavailable', 'NotFoundError');
        }
        streamRef.current = s;
        filteredStreamRef.current = s; // 没有 canvas 处理 · 录制直接录 audio
        setDeviceCheck({
          status: 'ready',
          camera: 'off',
          microphone: 'ready',
          cameraLabel: '',
          microphoneLabel: audioTrack.label || '默认麦克风',
        });
        setActive(true);
        setError(null);
        return s;
      }
      const s = await navigator.mediaDevices.getUserMedia({
        video: cameraVideoConstraints(cameraFacingRef.current),
        audio: true,
      });
      if (sessionId !== cameraSessionRef.current) {
        s.getTracks().forEach(track => track.stop());
        return null;
      }
      const videoTrack = s.getVideoTracks()[0];
      const audioTrack = s.getAudioTracks()[0];
      if (!videoTrack || !audioTrack) {
        s.getTracks().forEach(track => track.stop());
        throw new DOMException('Required media track unavailable', 'NotFoundError');
      }
      streamRef.current = s;
      const actualFacing = videoTrack.getSettings?.().facingMode;
      if (actualFacing === 'user' || actualFacing === 'environment') {
        cameraFacingRef.current = actualFacing;
        setCameraFacingState(actualFacing);
        saveCameraPreference('cameraFacing', actualFacing);
      }
      setDeviceCheck({
        status: 'ready',
        camera: 'ready',
        microphone: 'ready',
        cameraLabel: videoTrack.label || (cameraFacingRef.current === 'environment' ? '后置摄像头' : '前置摄像头'),
        microphoneLabel: audioTrack.label || '默认麦克风',
      });
      refreshCameraCount();

      const hv = document.createElement('video');
      hv.srcObject = s;
      hv.muted = true; hv.playsInline = true; hv.autoplay = true;
      try { await hv.play(); } catch {}
      // hv.play() 是异步的 · 期间用户可能已经退出（stop() 把 session 加一了）
      // 不再继续搭建管线，否则会启动一个永远无人取消的 rAF 循环
      if (sessionId !== cameraSessionRef.current) {
        s.getTracks().forEach(track => track.stop());
        try { hv.srcObject = null; } catch {}
        return null;
      }
      hiddenVideoRef.current = hv;

      const canvas = canvasRef.current || (() => {
        const c = document.createElement('canvas');
        c.width = CAMERA_OUTPUT_WIDTH; c.height = CAMERA_OUTPUT_HEIGHT;
        canvasRef.current = c;
        return c;
      })();
      // 复用已有 context · 避免每次 start 都 getContext（部分浏览器会丢 desync 选项）
      const ctx = canvas.__koboCtx || (canvas.__koboCtx = getPipeline2dContext(canvas));

      const scratch = scratchRef.current || (() => {
        const c = document.createElement('canvas');
        c.width = CAMERA_OUTPUT_WIDTH; c.height = CAMERA_OUTPUT_HEIGHT;
        scratchRef.current = c;
        return c;
      })();
      const sctx = scratch.__koboCtx || (scratch.__koboCtx = getPipeline2dContext(scratch));

      // 限频面部检测：每 ~80ms（≈12fps）跑一次，结果缓存到下次绘制
      let lastDetectTime = 0;
      let lastDrawTime = 0;
      let cachedLandmarks = null;
      let cachedMappedLm = null;   // 已映射到输出坐标的 landmarks · 检测时算一次，不必每帧 map 478 个点
      // 限频人像分割：每 ~100ms 跑一次，mask 缓存在 maskCanvasRef
      let lastSegTime = 0;
      // 裁切参数只依赖源分辨率 · 分辨率不变就不必每帧重新算/分配对象
      let cachedCrop = null;
      let cropSrcW = 0, cropSrcH = 0;
      const useRvfc = typeof hv.requestVideoFrameCallback === 'function';

      const scheduleNext = () => {
        if (sessionId !== cameraSessionRef.current) return;
        if (useRvfc) {
          const id = hv.requestVideoFrameCallback(() => {
            // drawFrame 返回 false 表示已挂 visibility 恢复或 session 结束 · 不再续订
            if (drawFrame(performance.now())) scheduleNext();
          });
          rafRef.current = { type: 'rvfc', id };
        } else {
          const id = requestAnimationFrame((t) => {
            if (drawFrame(t)) scheduleNext();
          });
          rafRef.current = { type: 'raf', id };
        }
      };

      /** @returns {boolean} 是否应继续调度下一帧 */
      const drawFrame = (now) => {
        // session 已被 stop()/新 start() 取代 → 停止循环 · 不再 reschedule
        if (sessionId !== cameraSessionRef.current) return false;

        // 后台 tab：停掉重绘制（captureStream 停在最后一帧）· 可见时再续调度
        if (typeof document !== 'undefined' && document.hidden) {
          const onVis = () => {
            if (!document.hidden && sessionId === cameraSessionRef.current) {
              document.removeEventListener('visibilitychange', onVis);
              scheduleNext();
            }
          };
          document.addEventListener('visibilitychange', onVis);
          return false;
        }

        // rAF 路径节流到 ~30fps，与 captureStream 对齐；rVFC 本身跟视频帧走，通常已 ≤30
        if (!useRvfc && now - lastDrawTime < CAMERA_PIPELINE_FRAME_MS - 1) {
          return true; // 继续调度，下一帧再画
        }
        lastDrawTime = now;

        if (hv.videoWidth) {
          const W = canvas.width, H = canvas.height;
          const sourceWidth = hv.videoWidth, sourceHeight = hv.videoHeight;
          if (!cachedCrop || cropSrcW !== sourceWidth || cropSrcH !== sourceHeight) {
            cachedCrop = getCoverCrop(sourceWidth, sourceHeight);
            cropSrcW = sourceWidth; cropSrcH = sourceHeight;
          }
          const crop = cachedCrop;
          const skin = skinRef.current;
          const needFx = skin > 0;
          const bgB = bgBlurRef.current;
          const filterCss = filterCSSRef.current;
          const needFilter = !!(filterCss && filterCss !== 'none');

          // 面部检测（限频）
          if (needFx && landmarkerRef.current) {
            if (now - lastDetectTime > 80) {
              try {
                const r = landmarkerRef.current.detectForVideo(hv, now);
                cachedLandmarks = (r.faceLandmarks && r.faceLandmarks.length) ? r.faceLandmarks[0] : null;
                cachedMappedLm = cachedLandmarks ? cachedLandmarks.map(point => ({
                  x: ((point.x * sourceWidth) - crop.x) / crop.width,
                  y: ((point.y * sourceHeight) - crop.y) / crop.height,
                })) : null;
              } catch (e) { /* swallow */ }
              lastDetectTime = now;
            }
          } else {
            cachedLandmarks = null;
            cachedMappedLm = null;
          }

          // 第一步：清空 + 把观众视角的原始帧画到主 canvas（不带 ctx.filter）。
          // 居中裁成真正的 9:16；自拍镜像只属于预览层，成片文字方向始终正常。
          try { ctx.filter = 'none'; } catch {}
          ctx.drawImage(hv, crop.x, crop.y, crop.width, crop.height, 0, 0, W, H);

          // 第二步：如果检测到人脸 + 用户开启了真磨皮 → 在主 canvas 上局部柔焦
          // 砍掉了瘦脸 / 大眼形变 · 训练工具不变形脸 · 只在皮肤区域柔焦
          if (cachedMappedLm && needFx && skin > 0) {
            const lm = cachedMappedLm;
            const blurPx = 5 + skin * 9; // 强度 0→1 时 5→14 px
            sctx.clearRect(0, 0, W, H);
            try { sctx.filter = `blur(${blurPx}px)`; } catch {}
            sctx.drawImage(canvas, 0, 0);
            try { sctx.filter = 'none'; } catch {}
            ctx.save();
            tracePath(ctx, lm, FACE_OVAL_IDX, W, H);
            ctx.clip();
            ctx.globalAlpha = Math.min(0.92, skin * 0.85);
            ctx.drawImage(scratch, 0, 0);
            ctx.globalAlpha = 1;
            ctx.restore();
          }

          // 第三步：背景虚化 —— 用 selfie 分割把人物保留清晰、背景做高斯模糊
          if (bgB > 0 && segmenterRef.current) {
            // 限频跑一次 segmentation，写入 maskCanvas
            if (now - lastSegTime > 100) {
              try {
                const seg = segmenterRef.current.segmentForVideo(hv, now);
                if (seg && seg.categoryMask) {
                  const mk = seg.categoryMask;
                  const mw = mk.width, mh = mk.height;
                  const arr = mk.getAsUint8Array();
                  let mc = maskCanvasRef.current;
                  if (!mc) { mc = document.createElement('canvas'); maskCanvasRef.current = mc; }
                  if (mc.width !== mw)  mc.width  = mw;
                  if (mc.height !== mh) mc.height = mh;
                  // mask 需要读写 ImageData · willReadFrequently 提示浏览器走 CPU 路径
                  let mctx = mc.__koboCtx;
                  if (!mctx) {
                    try { mctx = mc.getContext('2d', { willReadFrequently: true }); } catch { mctx = mc.getContext('2d'); }
                    mc.__koboCtx = mctx;
                  }
                  // ImageData 复用 + Uint32 一次写 4 通道 · 每次分割少一次大数组分配和 4 次逐字节写
                  if (!mc.__md || mc.__md.width !== mw || mc.__md.height !== mh) {
                    mc.__md = mctx.createImageData(mw, mh);
                    mc.__md32 = new Uint32Array(mc.__md.data.buffer);
                  }
                  const md = mc.__md, md32 = mc.__md32;
                  // selfie_segmenter（Tasks Vision）：class 0 = 背景，class 1 = 人物。
                  // 用 arr[i] !== 0 既兼容 0/1 也兼容 0/255 的输出。
                  // 0xFFFFFFFF = 白色不透明（前景）· 0x00FFFFFF = 白色全透明（背景）· 小端序 alpha 在最高字节
                  for (let i = 0; i < arr.length; i++) {
                    md32[i] = arr[i] !== 0 ? 0xFFFFFFFF : 0x00FFFFFF;
                  }
                  mctx.putImageData(md, 0, 0);
                  try { mk.close(); } catch {}
                }
              } catch (e) { /* swallow */ }
              lastSegTime = now;
            }

            // 用缓存的 mask 合成：sharp 前景 + blurred 背景
            const mc = maskCanvasRef.current;
            if (mc && mc.width > 0) {
              // 备份当前 canvas（带面部 FX 的清晰版）到 scratch
              sctx.save();
              sctx.globalCompositeOperation = 'source-over';
              sctx.clearRect(0, 0, W, H);
              sctx.drawImage(canvas, 0, 0);
              sctx.restore();

              // 主 canvas 改成高斯模糊版（用 scratch 当源，避免 in-place blur 兼容性问题）
              const blurPx = 6 + bgB * 22; // 6 ~ 28 px
              ctx.save();
              try { ctx.filter = `blur(${blurPx}px)`; } catch {}
              ctx.clearRect(0, 0, W, H);
              ctx.drawImage(scratch, 0, 0);
              try { ctx.filter = 'none'; } catch {}
              ctx.restore();

              // 把 mask 乘到 scratch 上（destination-in：只保留人物像素）。
              // mask 与原视频同坐标，使用相同的 9:16 裁切映射到输出画布。
              sctx.save();
              sctx.globalCompositeOperation = 'destination-in';
              const maskX = (crop.x / sourceWidth) * mc.width;
              const maskY = (crop.y / sourceHeight) * mc.height;
              const maskWidth = (crop.width / sourceWidth) * mc.width;
              const maskHeight = (crop.height / sourceHeight) * mc.height;
              sctx.drawImage(mc, maskX, maskY, maskWidth, maskHeight, 0, 0, W, H);
              sctx.restore();

              // sharp 前景叠到模糊背景上
              ctx.drawImage(scratch, 0, 0);
            }
          }

          // 第四步：套 CSS 滤镜（套到整张图上，作为最终调色）
          if (needFilter) {
            // 通过 scratch 中转避免 ctx.filter 多次应用的开销
            sctx.clearRect(0, 0, W, H);
            try { sctx.filter = filterCss; } catch {}
            sctx.drawImage(canvas, 0, 0);
            try { sctx.filter = 'none'; } catch {}
            ctx.clearRect(0, 0, W, H);
            ctx.drawImage(scratch, 0, 0);
          }
        }

        return true;
      };
      scheduleNext();

      const canvasStream = canvas.captureStream(CAMERA_PIPELINE_FPS);
      s.getAudioTracks().forEach(t => canvasStream.addTrack(t));
      filteredStreamRef.current = canvasStream;

      if (videoElRef.current) {
        videoElRef.current.srcObject = canvasStream;
        videoElRef.current.muted = true;
        videoElRef.current.style.filter = 'none';
        try { await videoElRef.current.play(); } catch {}
      }

      // play() 之后再校验一次 · 避免退出后把 active 置回 true
      if (sessionId !== cameraSessionRef.current) {
        s.getTracks().forEach(track => track.stop());
        canvasStream.getTracks().forEach(track => track.stop());
        return null;
      }
      setActive(true);
      setError(null);
      return canvasStream;
    } catch (err) {
      if (sessionId !== cameraSessionRef.current) return null;
      releaseMediaResources();
      const message = formatMediaDeviceError(err, voiceOnlyRef.current);
      setDeviceCheck(prev => ({
        ...prev,
        status: 'error',
        camera: voiceOnlyRef.current ? 'off' : (prev.camera === 'ready' ? 'ready' : 'error'),
        microphone: prev.microphone === 'ready' ? 'ready' : 'error',
      }));
      setError(message);
      return null;
    }
  }, [refreshCameraCount, releaseMediaResources, saveCameraPreference]);

  const switchCamera = useCallback(async () => {
    if (voiceOnlyRef.current || switchingCameraRef.current || !streamRef.current) return false;
    const rawStream = streamRef.current;
    const sessionId = cameraSessionRef.current;
    const currentFacing = cameraFacingRef.current;
    const nextFacing = currentFacing === 'user' ? 'environment' : 'user';
    const oldVideoTracks = rawStream.getVideoTracks();

    switchingCameraRef.current = true;
    setSwitchingCamera(true);
    setError(null);
    setDeviceCheck(prev => ({ ...prev, status: 'checking', camera: 'checking' }));

    const attachTrack = async (track) => {
      if (sessionId !== cameraSessionRef.current || streamRef.current !== rawStream) {
        track.stop();
        return false;
      }
      rawStream.addTrack(track);
      const hv = hiddenVideoRef.current;
      if (hv) {
        hv.srcObject = null;
        hv.srcObject = rawStream;
        try { await hv.play(); } catch {}
      }
      // 正常录制时预览绑定 canvas 流；仅在 canvas 尚未建立时才回退到原始流。
      if (videoElRef.current && !filteredStreamRef.current) {
        videoElRef.current.srcObject = rawStream;
        try { await videoElRef.current.play(); } catch {}
      }
      return true;
    };

    oldVideoTracks.forEach(track => {
      rawStream.removeTrack(track);
      track.stop();
    });

    try {
      const replacementStream = await navigator.mediaDevices.getUserMedia({
        video: cameraVideoConstraints(nextFacing),
        audio: false,
      });
      if (sessionId !== cameraSessionRef.current || streamRef.current !== rawStream) {
        replacementStream.getTracks().forEach(track => track.stop());
        return false;
      }
      const replacementTrack = replacementStream.getVideoTracks()[0];
      if (!replacementTrack) throw new DOMException('Camera track unavailable', 'NotFoundError');
      if (!(await attachTrack(replacementTrack))) return false;

      const actualFacing = replacementTrack.getSettings?.().facingMode;
      const resolvedFacing = actualFacing === 'user' || actualFacing === 'environment' ? actualFacing : nextFacing;
      cameraFacingRef.current = resolvedFacing;
      setCameraFacingState(resolvedFacing);
      saveCameraPreference('cameraFacing', resolvedFacing);
      setDeviceCheck(prev => ({
        ...prev,
        status: prev.microphone === 'ready' ? 'ready' : prev.status,
        camera: 'ready',
        cameraLabel: replacementTrack.label || (resolvedFacing === 'environment' ? '后置摄像头' : '前置摄像头'),
      }));
      refreshCameraCount();
      return true;
    } catch (switchError) {
      if (sessionId !== cameraSessionRef.current || streamRef.current !== rawStream) return false;
      // iOS 切镜头需要先释放旧轨道；若新镜头不可用，立即尝试恢复原镜头。
      try {
        const fallbackStream = await navigator.mediaDevices.getUserMedia({
          video: cameraVideoConstraints(currentFacing),
          audio: false,
        });
        const fallbackTrack = fallbackStream.getVideoTracks()[0];
        if (fallbackTrack) {
          if (!(await attachTrack(fallbackTrack))) return false;
          setDeviceCheck(prev => ({
            ...prev,
            status: prev.microphone === 'ready' ? 'ready' : prev.status,
            camera: 'ready',
            cameraLabel: fallbackTrack.label || (currentFacing === 'environment' ? '后置摄像头' : '前置摄像头'),
          }));
        }
      } catch {
        setDeviceCheck(prev => ({ ...prev, status: 'error', camera: 'error' }));
      }
      setError(`镜头切换失败。${formatMediaDeviceError(switchError, false)}`);
      return false;
    } finally {
      if (sessionId === cameraSessionRef.current) {
        switchingCameraRef.current = false;
        setSwitchingCamera(false);
      }
    }
  }, [refreshCameraCount, saveCameraPreference]);

  const stop = useCallback(() => {
    cameraSessionRef.current += 1;
    releaseMediaResources();
    setActive(false);
    setSwitchingCamera(false);
    switchingCameraRef.current = false;
    setDeviceCheck({
      status: 'idle',
      camera: voiceOnlyRef.current ? 'off' : 'idle',
      microphone: 'idle',
      cameraLabel: '',
      microphoneLabel: '',
    });
  }, [releaseMediaResources]);

  useEffect(() => () => {
    disposedRef.current = true;  // 让进行中的 MediaPipe 初始化完成后自行 close
    cameraSessionRef.current += 1;
    releaseMediaResources();
    if (landmarkerRef.current) { try { landmarkerRef.current.close(); } catch {} landmarkerRef.current = null; }
    if (segmenterRef.current)  { try { segmenterRef.current.close(); }  catch {} segmenterRef.current  = null; }
    maskCanvasRef.current = null;
  }, [releaseMediaResources]);

  return {
    videoRef: attachVideo,
    active, error, start, stop,
    cameraFacing, switchCamera, switchingCamera, cameraCount,
    mirrorPreview, setMirrorPreview,
    compositionGuide, setCompositionGuide,
    previewMirrored: cameraFacing === 'user' && mirrorPreview,
    deviceCheck,
    filterPreset, setFilterPreset,
    beautyLevel,  setBeautyLevel,
    skinSmooth,   setSkinSmooth,
    bgBlur,       setBgBlur,
    faceFxReady,  faceFxLoading,  faceFxProgress,
    voiceOnly: voiceOnlySetting,
    streamRef, // 给 AudioVisualizer 用
  };
}
