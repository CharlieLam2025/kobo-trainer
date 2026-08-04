/** 安全读 localStorage · 失败返回 fallback（隐私模式 / 配额满时常见） */
export const lsGet = (key, fallback = null) => {
  try {
    const v = localStorage.getItem(key);
    return v === null ? fallback : v;
  } catch {
    return fallback;
  }
};

/** 安全写 localStorage · 返回是否成功 */
export const lsSet = (key, value) => {
  try {
    if (value === null || value === undefined) localStorage.removeItem(key);
    else localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/** 安全 JSON.parse localStorage · 形状不对时返回 fallback */
export const lsGetJson = (key, fallback = null) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const lsSetJson = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
};

export const formatTime = (s) => {
  if (s < 0) s = 0;
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${String(m).padStart(2,'0')}:${String(sec).padStart(2,'0')}`;
};

export const pickRandom = (arr, exclude) => {
  let pool = arr.filter(x => x !== exclude);
  if (!pool.length) pool = arr;
  return pool[Math.floor(Math.random() * pool.length)];
};

export const splitTeleprompterSentences = (value) => {
  const out = [];
  let current = '';
  const push = () => {
    const sentence = current.trim();
    if (sentence) out.push(sentence);
    current = '';
  };

  for (const ch of String(value || '')) {
    if (ch === '\r') continue;
    if (ch === '\n') {
      push();
      continue;
    }
    current += ch;
    if ('。！？!?'.includes(ch)) push();
  }
  push();
  return out;
};

export const sanitizeFilename = (s) => {
  const cleaned = (s || 'untitled')
    .replace(/[\\/:*?"<>|\n\r\t]/g, '')
    .replace(/\s+/g, '_');
  // Array.from 按码点截断，避免把 emoji 等代理对从中间剪断产生非法文件名
  return Array.from(cleaned).slice(0, 28).join('').trim() || 'untitled';
};

export const tsForFilename = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${p(d.getMonth()+1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
};

// 分块转 base64：readAsDataURL 一次性物化整段视频（≈2.7× 内存峰值），
// 长视频在 Android WebView 里有 OOM 风险 → 8MB 一块转换后拼接
