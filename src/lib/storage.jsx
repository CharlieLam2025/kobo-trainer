import { KOBO_NATIVE, Filesystem, Directory } from '../native.jsx';
import { sanitizeFilename, tsForFilename } from './utils.jsx';

export const blobToBase64 = async (blob) => {
  const CHUNK = 8 * 1024 * 1024;
  if (blob.size <= CHUNK) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(reader.error || new Error('读取录制文件失败'));
      reader.readAsDataURL(blob);
    });
  }
  // base64 以 3 字节为单位编码 · 块大小是 3 的倍数才能安全拼接
  const parts = [];
  for (let offset = 0; offset < blob.size; offset += CHUNK) {
    const slice = blob.slice(offset, offset + CHUNK);
    // eslint-disable-next-line no-await-in-loop
    const part = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result || '').split(',')[1] || '');
      reader.onerror = () => reject(reader.error || new Error('读取录制文件失败'));
      reader.readAsDataURL(slice);
    });
    parts.push(part);
  }
  return parts.join('');
};

export async function saveBlobToNativeDocuments(blob, filename) {
  if (!KOBO_NATIVE?.isNative || !KOBO_NATIVE.Filesystem) return null;
  const data = await blobToBase64(blob);
  const path = `recordings/${filename}`;
  const writeTo = async (directory) => {
    await Filesystem.mkdir({ path: 'recordings', directory, recursive: true }).catch(() => {});
    return Filesystem.writeFile({ path, data, directory, recursive: true });
  };

  try {
    await Filesystem.requestPermissions?.().catch(() => null);
    const result = await writeTo(Directory.Documents);
    return { method: 'native', filename, path, uri: result?.uri || '', directory: 'Documents' };
  } catch (e) {
    console.warn('Native Documents write failed, fallback to app data:', e);
    const result = await writeTo(Directory.Data);
    return { method: 'native', filename, path, uri: result?.uri || '', directory: 'Data' };
  }
}

export async function deleteNativeSavedFile(file) {
  if (!KOBO_NATIVE?.isNative || !KOBO_NATIVE.Filesystem || file?.method !== 'native') return;
  const directory = file.directory === 'Data' ? Directory.Data : Directory.Documents;
  const path = file.path || (file.filename ? `recordings/${file.filename}` : '');
  if (!path) return;
  await Filesystem.deleteFile({ path, directory });
}

// ============ 保存目录句柄持久化（IndexedDB）============
// FileSystemDirectoryHandle 没法进 localStorage · 只有 IndexedDB 能存
// （原实现只放 React state → 刷新/重开 App 绑定就丢了，用户以为一直在写文件夹）

export const idbOpenHandles = () => new Promise((resolve, reject) => {
  const req = indexedDB.open('kobo-fs-handles', 1);
  req.onupgradeneeded = () => { try { req.result.createObjectStore('handles'); } catch {} };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export async function persistSaveDirHandle(handle) {
  if (typeof indexedDB === 'undefined') return;
  try {
    const db = await idbOpenHandles();
    await new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readwrite');
      if (handle) tx.objectStore('handles').put(handle, 'saveDir');
      else tx.objectStore('handles').delete('saveDir');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {}
}

export async function loadSaveDirHandle() {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await idbOpenHandles();
    const handle = await new Promise((resolve, reject) => {
      const tx = db.transaction('handles', 'readonly');
      const rq = tx.objectStore('handles').get('saveDir');
      rq.onsuccess = () => resolve(rq.result || null);
      rq.onerror = () => reject(rq.error);
    });
    db.close();
    return handle || null;
  } catch { return null; }
}
// 写文件前确保句柄仍有读写权限（重启后授权可能降级为 prompt）

export async function ensureDirPermission(dirHandle) {
  if (!dirHandle) return false;
  try {
    if (dirHandle.queryPermission) {
      const q = await dirHandle.queryPermission({ mode: 'readwrite' });
      if (q === 'granted') return true;
    }
    if (dirHandle.requestPermission) {
      const r = await dirHandle.requestPermission({ mode: 'readwrite' });
      return r === 'granted';
    }
    return true;
  } catch { return false; }
}

// 保存视频：Android App 内优先写原生文件系统；Web 端优先写入用户选定目录，否则触发自动下载

export async function saveVideoToDisk(blob, label, dirHandle) {
  // 仅音频（纯语音模式）走 audio- 前缀 · 仍用 .webm（WebM 也能装音频）
  const isAudio = blob.type && blob.type.startsWith('audio/');
  const prefix = isAudio ? '口播-audio' : '口播';
  const filename = `${prefix}-${tsForFilename()}-${sanitizeFilename(label)}.webm`;
  if (KOBO_NATIVE?.isNative) {
    try {
      const nativeResult = await saveBlobToNativeDocuments(blob, filename);
      if (nativeResult) return nativeResult;
    } catch (e) {
      // Android WebView 对 blob: URL 的 <a download> 通常无效 → 假装下载成功会静默丢录像
      // 原生两级写入（Documents → Data）都失败时直接把错误抛给上层提示用户
      console.warn('Native save failed (Documents & Data):', e);
      throw new Error('视频保存失败：' + (e?.message || e) + ' · 请检查存储空间/权限后重录');
    }
  }
  if (dirHandle && window.showDirectoryPicker) {
    try {
      const permitted = await ensureDirPermission(dirHandle);
      if (!permitted) throw new Error('folder permission not granted');
      const fh = await dirHandle.getFileHandle(filename, { create: true });
      const w = await fh.createWritable();
      await w.write(blob);
      await w.close();
      return { method: 'folder', filename };
    } catch (e) {
      console.warn('FS write failed, fallback to download:', e);
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { try { document.body.removeChild(a); } catch{}; URL.revokeObjectURL(url); }, 1000);
  return { method: 'download', filename };
}

// ============ DeepSeek 调用入口 ============
// 部署 Cloudflare Worker 之后，把 URL 填到这里（详见 kobo-trainer-proxy/README.md）
// 没填用户 key → 走代理（每 IP 50 次/天）· 填了用户 key → 直连无限
