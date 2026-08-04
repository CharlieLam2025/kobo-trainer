import { useState, useEffect, useRef, useCallback } from '../react-hooks.jsx';

export function useRecorder() {
  const [recording, setRecording] = useState(false);
  const [blob, setBlob] = useState(null);
  const [duration, setDuration] = useState(0);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const startTimeRef = useRef(0);
  const intervalRef = useRef(null);

  const start = useCallback((stream) => {
    if (!stream) return;
    chunksRef.current = [];
    setBlob(null);
    // 检查是否仅音频流（纯语音模式）· 没有 video track
    const hasVideo = stream.getVideoTracks && stream.getVideoTracks().length > 0;
    let options = {};
    const candidates = hasVideo
      ? ['video/webm;codecs=vp9,opus', 'video/webm;codecs=vp8,opus', 'video/webm']
      : ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus'];
    for (const c of candidates) {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported(c)) { options.mimeType = c; break; }
    }
    // 码率封顶：720×1280@30 口播够用 · 省编码 CPU + 本地存储
    // （不设的话部分浏览器默认偏高，手机发热/文件体积都更糟）
    if (hasVideo) {
      options.videoBitsPerSecond = 2_500_000;
      options.audioBitsPerSecond = 128_000;
    } else {
      options.audioBitsPerSecond = 96_000;
    }
    let r;
    try {
      r = new MediaRecorder(stream, options);
    } catch {
      // 个别引擎不认 bitsPerSecond · 退回仅 mimeType
      const { videoBitsPerSecond, audioBitsPerSecond, ...mimeOnly } = options;
      try {
        r = new MediaRecorder(stream, mimeOnly);
        options = mimeOnly;
      } catch {
        r = new MediaRecorder(stream);
        options = {};
      }
    }
    r.ondataavailable = (e) => { if (e.data && e.data.size) chunksRef.current.push(e.data); };
    r.onstop = () => {
      const b = new Blob(chunksRef.current, { type: options.mimeType || (hasVideo ? 'video/webm' : 'audio/webm') });
      setBlob(b);
    };
    // 250ms 分片：停录时数据更及时落盘 · 比 1s 少等一轮 ondataavailable
    r.start(250);
    recorderRef.current = r;
    startTimeRef.current = Date.now();
    setDuration(0);
    setRecording(true);
    intervalRef.current = setInterval(() => {
      setDuration(Math.floor((Date.now() - startTimeRef.current) / 1000));
    }, 250);
  }, []);

  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try { recorderRef.current.stop(); } catch {}
    }
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
    setRecording(false);
  }, []);

  useEffect(() => () => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    // 组件带着录制中状态卸载（如 ErrorBoundary 兜底切换）时停掉 MediaRecorder，
    // 否则它会一直往已卸载组件的 chunks 里塞数据并在 onstop 时 setState
    const r = recorderRef.current;
    if (r) {
      r.ondataavailable = null;
      r.onstop = null;
      if (r.state !== 'inactive') { try { r.stop(); } catch {} }
      recorderRef.current = null;
    }
  }, []);

  return { recording, blob, duration, start, stop };
}

// ============ 通用 UI ============
