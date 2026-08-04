import { Icon } from './icons.jsx';
import { useSettings } from '../settings-context.jsx';
import { Btn, Card, Tag, ActionPanel } from './ui.jsx';
import { useState, useEffect, useMemo } from '../react-hooks.jsx';

const formatCount = (n) => {
  const v = Number(n) || 0;
  if (v >= 10000) return `${(v / 10000).toFixed(1)}万`;
  if (v >= 1000) return `${(v / 1000).toFixed(1)}k`;
  return String(v);
};

export const PosterShareModal = ({ blob, onClose, fileName = 'kobo-poster.png' }) => {
  const [url, setUrl] = useState(null);
  const [shared, setShared] = useState(false);
  useEffect(() => {
    if (!blob) return;
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);

  const download = () => {
    if (!url) return;
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const share = async () => {
    if (!blob || !navigator.share) { download(); return; }
    try {
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare && !navigator.canShare({ files: [file] })) {
        download();
        return;
      }
      await navigator.share({ files: [file], title: '模拟发布结果' });
      setShared(true);
    } catch (e) {
      // 用户取消 / 不支持
      if (e.name !== 'AbortError') download();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] bg-stone-950/80 backdrop-blur flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white max-w-md w-full p-4 max-h-[92vh] overflow-y-auto fade-in" style={{borderRadius:'4px'}} onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-display font-bold text-stone-900 text-base">📸 模拟发布晒图</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">✕</button>
        </div>
        {url && (
          <img src={url} alt="poster"
            className="w-full border border-stone-200 mb-3"
            style={{borderRadius:'3px'}}/>
        )}
        <div className="flex gap-2">
          <Btn variant="primary" onClick={share} className="flex-1">
            {navigator.share ? '📤 分享' : '💾 下载'}
          </Btn>
          {navigator.share && <Btn variant="secondary" onClick={download}>💾 下载</Btn>}
        </div>
        <div className="text-[10px] text-stone-500 mt-3 leading-relaxed">
          💡 长按图片可保存到相册 · 或点击上方按钮 · 海报已加 AI 生成标注
        </div>
      </div>
    </div>
  );
};

// ============ 录像打标签：高光 / 待重录 / 已发布 ============

export const TAG_OPTIONS = [
  { id:'star',      label:'⭐ 高光',     color:'#F1A23F', bg:'#FEF3C7' },
  { id:'redo',      label:'🔁 待重录',   color:'#A30236', bg:'#FBEFF2' },
  { id:'published', label:'📤 已发布',   color:'#10b981', bg:'#D1FAE5' },
];

export const FileTagger = ({ filename, compact = false }) => {
  const { savedFiles, updateSavedFile } = useSettings();
  const file = savedFiles.find(f => f.filename === filename);
  const current = file?.tag || null;

  const toggle = (id) => {
    updateSavedFile(filename, { tag: current === id ? null : id });
  };

  if (compact) {
    // 紧凑模式：用在列表里，仅显示当前标签 + 切换按钮
    return (
      <div className="flex items-center gap-1">
        {TAG_OPTIONS.map(opt => (
          <button key={opt.id} onClick={(e) => { e.stopPropagation(); toggle(opt.id); }}
            className={`text-[9px] tracking-wider font-bold px-1 py-0.5 transition-colors ${current === opt.id ? '' : 'opacity-30 hover:opacity-70'}`}
            style={{
              borderRadius:'2px',
              background: current === opt.id ? opt.bg : 'transparent',
              color: current === opt.id ? opt.color : '#737373',
              border: `1px solid ${current === opt.id ? opt.color : '#d6d3d1'}`,
            }}
            title={opt.label}>
            {opt.label.split(' ')[0]}
          </button>
        ))}
      </div>
    );
  }

  return (
    <div className="mt-3 pt-3 border-t border-stone-200">
      <div className="text-[10px] tracking-[0.22em] uppercase text-stone-500 font-bold mb-2">给这条录像标记 · 之后可在历史里筛</div>
      <div className="flex flex-wrap gap-2">
        {TAG_OPTIONS.map(opt => (
          <button key={opt.id} onClick={() => toggle(opt.id)}
            className="px-3 py-1.5 text-xs font-bold tracking-wider transition-all"
            style={{
              borderRadius: '3px',
              background: current === opt.id ? opt.bg : 'transparent',
              color: current === opt.id ? opt.color : '#525252',
              border: `1.5px solid ${current === opt.id ? opt.color : '#d6d3d1'}`,
            }}>
            {opt.label}
          </button>
        ))}
        {current && (
          <button onClick={() => updateSavedFile(filename, { tag: null })}
            className="px-3 py-1.5 text-xs text-stone-500 hover:text-stone-800 underline">
            清除
          </button>
        )}
      </div>
    </div>
  );
};

export const LibraryEmptyState = ({ onStart }) => (
  <ActionPanel className="p-5 text-center">
    <div className="mx-auto w-10 h-10 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center mb-3" style={{borderRadius:'4px'}}>
      <Icon name="mic" size={18} />
    </div>
    <h3 className="font-display font-bold text-[16px] text-stone-950">还没有练习素材</h3>
    <p className="text-[13px] text-stone-500 leading-relaxed mt-2">
      先录一条短练习，这里就会变成你的本地口播素材库。
    </p>
    {onStart && <Btn variant="primary" onClick={onStart} className="mt-4">开始第一条练习</Btn>}
  </ActionPanel>
);

// ============ 录像历史列表（带标签筛选）============

export const RecordingHistoryList = ({ settings: s }) => {
  const [filterTag, setFilterTag] = useState('all'); // all | star | redo | published | untagged

  const allFiles = s.savedFiles || [];
  const tagCounts = useMemo(() => {
    const c = { star: 0, redo: 0, published: 0, untagged: 0 };
    for (const f of allFiles) {
      if (f.tag && c[f.tag] !== undefined) c[f.tag]++;
      else c.untagged++;
    }
    return c;
  }, [allFiles]);

  const filtered = useMemo(() => {
    if (filterTag === 'all') return allFiles;
    if (filterTag === 'untagged') return allFiles.filter(f => !f.tag);
    return allFiles.filter(f => f.tag === filterTag);
  }, [allFiles, filterTag]);

  const FILTERS = [
    { id:'all',       label:'全部',     count: allFiles.length },
    { id:'star',      label:'⭐ 高光',   count: tagCounts.star },
    { id:'redo',      label:'🔁 待重录', count: tagCounts.redo },
    { id:'published', label:'📤 已发布', count: tagCounts.published },
    { id:'untagged',  label:'未标记',   count: tagCounts.untagged },
  ];

  return (
    <div className="mb-6 pt-6 border-t border-stone-200">
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm font-medium">录制历史 <span className="text-stone-400 text-xs ml-1">({allFiles.length}/50)</span></div>
        <button onClick={() => {
          if (window.confirm(`确定清空全部 ${allFiles.length} 条历史记录？\n\n如果当时保存到了目录，磁盘上的文件也会被删除。`)) {
            s.clearAllSavedFiles();
          }
        }} className="text-xs text-stone-500 hover:text-red-600">清空全部</button>
      </div>

      {/* 标签筛选 */}
      <div className="flex flex-wrap gap-1 mb-2">
        {FILTERS.map(f => (
          <button key={f.id} onClick={() => setFilterTag(f.id)}
            className={`px-2 py-1 text-[11px] tracking-wider font-bold transition-colors ${
              filterTag === f.id ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
            }`} style={{borderRadius:'2px'}}>
            {f.label} <span className="opacity-70 ml-0.5">{f.count}</span>
          </button>
        ))}
      </div>

      <div className="text-[10px] text-stone-400 mb-2 leading-relaxed">
        实际视频文件在 {s.saveDir ? '你绑定的目录' : '系统下载文件夹'} 里 · 标签只是给你方便筛选。
      </div>

      <div className="space-y-2 max-h-72 overflow-y-auto text-xs">
        {filtered.length === 0 && (
          <LibraryEmptyState />
        )}
        {filtered.map((f) => {
          const d = new Date(f.ts || Date.now());
          const pad = (n) => String(n).padStart(2,'0');
          const ds = `${d.getMonth()+1}/${d.getDate()} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
          const realIdx = allFiles.findIndex(x => x.filename === f.filename);
          return (
            <div key={f.filename} className="bg-white border border-stone-200 p-3 flex items-start justify-between gap-3 hover:border-[#A30236] transition-colors" style={{borderRadius:'4px'}}>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Tag color={f.tag === 'star' ? 'amber' : f.tag === 'redo' ? 'red' : f.tag === 'published' ? 'emerald' : 'stone'}>
                    {f.tag || (f.method === 'folder' ? 'folder' : 'local')}
                  </Tag>
                  <span className="text-[10px] text-stone-400">{ds}</span>
                </div>
                <div className="font-bold text-[13px] text-stone-950 truncate">
                  {f.label || f.filename}
                  {f.virtualPub && (
                    <span className="ml-1.5 text-[10px] text-purple-600"
                      title={`模拟发布过 · ${f.virtualPub.platform} · 评分 ${f.virtualPub.score ?? '?'} · ${formatCount(f.virtualPub.estimated?.likes || 0)} 赞`}>
                      🌐{f.virtualPub.score != null && <span className="ml-0.5 font-bold tabular-nums text-[9px]">{f.virtualPub.score}</span>}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-stone-500 mt-1">{Math.round(f.duration || 0)}s · {f.method || 'download'}</div>
              </div>
              <div className="flex items-center gap-1">
                {(s.savedFiles?.length || 0) >= 3 && <FileTagger filename={f.filename} compact />}
                <button onClick={() => {
                  if (window.confirm(`删除这条录像？\n\n${f.label || f.filename}\n${f.method === 'folder' ? '磁盘文件也会被删除。' : '只删除历史条目，系统下载夹里的文件保留。'}`)) {
                    if (realIdx >= 0) s.removeSavedFile(realIdx);
                  }
                }} className="shrink-0 text-stone-400 hover:text-red-600 text-base px-1" title="删除">🗑</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ============ 预演 → 发布链路 ============

export const PublishStep = ({ contextLabel }) => {
  const [open, setOpen]       = useState(false);
  const [done, setDone]       = useState(false);
  const [channel, setChannel] = useState(null);
  const settings = useSettings();

  const CHANNELS = [
    { id:'moments', emoji:'💬', name:'先发朋友圈',  hint:'最低压力 · 把熟人当作"第一波试听众"，看哪条 emoji 多 = 钩子成立' },
    { id:'group',   emoji:'👥', name:'先发小群',    hint:'找 3 个真实读者反馈 · 等他们 react 一下再决定要不要大号发' },
    { id:'public',  emoji:'📢', name:'直接发大号',  hint:'你预演过了，准备好了。冲。错过这个时机才是真损失' },
  ];

  if (done) {
    return (
      <Card className="p-5 mb-4 bg-emerald-50 border-emerald-200">
        <div className="flex items-center gap-2">
          <Icon name="check" size={18} className="text-emerald-700" strokeWidth={2.2}/>
          <div>
            <div className="font-display font-bold text-emerald-900 text-[14px]">已发布 ✓</div>
            <div className="text-[11px] text-emerald-700 mt-0.5">下一条预演继续 →</div>
          </div>
        </div>
      </Card>
    );
  }

  if (!open) {
    return (
      <Card className="p-5 mb-4">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
            <Icon name="arrow" size={16} strokeWidth={1.7}/>
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">从预演到发布</h3>
        </div>
        <p className="text-[12px] text-stone-600 leading-relaxed mb-4">
          预演已经够了 · 发出去才有反馈。挑一个发布路径，把这条变成真正的内容。
        </p>
        <Btn variant="primary" onClick={() => setOpen(true)} className="w-full">
          我准备发了 →
        </Btn>
      </Card>
    );
  }

  return (
    <Card className="p-5 mb-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-[#FBEFF2] text-[#A30236] flex items-center justify-center" style={{borderRadius:'3px'}}>
            <Icon name="arrow" size={16} strokeWidth={1.7}/>
          </div>
          <h3 className="font-display font-bold text-stone-900 text-[16px] m-0">选发布路径</h3>
        </div>
        <button onClick={() => { setOpen(false); setChannel(null); }} className="text-stone-400 text-xs">取消</button>
      </div>

      <div className="space-y-2 mb-4">
        {CHANNELS.map(c => (
          <button key={c.id} onClick={() => setChannel(c.id)}
            className={`w-full text-left p-3 border-2 transition-all ${
              channel === c.id ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
            }`}
            style={{borderRadius:'3px'}}>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{c.emoji}</span>
              <span className="font-semibold text-sm">{c.name}</span>
            </div>
            <div className="text-[11px] text-stone-500 leading-snug">{c.hint}</div>
          </button>
        ))}
      </div>

      {channel && (
        <Btn variant="primary" onClick={() => {
          // 把当前 saved file（最新一条）真正标记为 published ·
          // 这样历史列表的「已发布」筛选和统计才对得上（原来只改了本组件的局部 state）
          const files = settings.savedFiles || [];
          if (files.length > 0 && files[0]?.filename) {
            settings.updateSavedFile?.(files[0].filename, { tag: 'published', publishChannel: channel });
          }
          setDone(true);
        }} className="w-full">
          已选择 · 标记为已发布
        </Btn>
      )}
    </Card>
  );
};

// ============ Mobile Header (slim app bar) ============
