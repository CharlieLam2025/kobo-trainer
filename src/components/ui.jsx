import { Icon } from './icons.jsx';
import { useSettings } from '../settings-context.jsx';

export const Btn = ({ children, onClick, variant='primary', size='md', className='', disabled, ...rest }) => {
  const base = 'inline-flex items-center justify-center gap-2 font-medium disabled:opacity-40 disabled:cursor-not-allowed font-body tracking-wide focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30236] focus-visible:ring-offset-2 focus-visible:ring-offset-white kobo-press select-none';
  const sizes = {
    sm: 'px-3 py-1.5 text-[12px]',
    md: 'px-5 py-2.5 text-[13px]',
    lg: 'px-7 py-3.5 text-[14px]',
  };
  const radius = 'rounded-md';
  const variants = {
    primary:   'bg-[#A30236] text-white hover:bg-[#8E0230] active:bg-[#700024] shadow-sm',
    secondary: 'bg-white text-stone-900 border border-stone-200 hover:border-stone-400 hover:bg-stone-50',
    ghost:     'text-stone-700 hover:text-[#A30236] hover:bg-stone-100',
    danger:    'bg-stone-900 text-white hover:bg-stone-950',
    accent:    'bg-[#061A6C] text-white hover:bg-[#001A71]',
    record:    'bg-[#A30236] text-white hover:bg-[#8E0230] active:bg-[#700024] shadow-lg',
    quiet:     'bg-stone-100 text-stone-700 hover:bg-stone-200',
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${sizes[size]} ${radius} ${variants[variant]} ${className}`} {...rest}>
      {children}
    </button>
  );
};

export const Card = ({ children, className='', style, onClick }) => (
  <div
    className={`bg-white border border-stone-200 kobo-surface ${className}`}
    style={{ borderRadius: '10px', ...style }}
    onClick={onClick}
  >
    {children}
  </div>
);

export const Tag = ({ children, color='stone' }) => {
  // RANEPA-styled square tag, no rounded pill
  const map = {
    stone:   'bg-stone-100   text-stone-700 border-stone-200',
    amber:   'bg-[#FBEFF2]   text-[#A30236] border-[#F4D4DD]',
    rose:    'bg-[#FBEFF2]   text-[#A30236] border-[#F4D4DD]',
    red:     'bg-[#FBEFF2]   text-[#A30236] border-[#F4D4DD]',
    orange:  'bg-[#FFF6EC]   text-[#A30236] border-[#FCE6CC]',
    violet:  'bg-[#E9EBF5]   text-[#061A6C] border-[#C5CBE6]',
    emerald: 'bg-[#EEF6F0]   text-[#264F30] border-[#B6D8BC]',
    sky:     'bg-[#E9EBF5]   text-[#061A6C] border-[#C5CBE6]',
  };
  return (
    <span className={`inline-block px-2 py-[2px] text-[10px] tracking-[0.14em] uppercase font-medium border whitespace-nowrap ${map[color]||map.stone}`} style={{borderRadius:'2px'}}>{children}</span>
  );
};

export const RecordingModeChooser = ({ compact = false, className = '' }) => {
  const s = useSettings();
  const activeVideo = !s.voiceOnly;
  const itemBase = 'flex-1 text-left border transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-[#A30236] focus-visible:ring-offset-2 focus-visible:ring-offset-white';
  const itemActive = 'border-[#A30236] bg-[#FBEFF2] text-[#A30236]';
  const itemIdle = 'border-stone-200 bg-white text-stone-700 hover:border-stone-400 hover:bg-stone-50';
  return (
    <div className={`border border-stone-200 bg-stone-50 ${compact ? 'p-3' : 'p-4'} ${className}`} style={{borderRadius:'4px'}}>
      <div className="flex items-center justify-between gap-3 mb-3">
        <div>
          <div className="text-stone-400 text-[9px] tracking-[0.18em] uppercase font-semibold">REC MODE</div>
          <div className="font-display font-bold text-stone-900 text-[14px] leading-tight mt-0.5">录制方式</div>
        </div>
        <Tag color={activeVideo ? 'emerald' : 'amber'}>{activeVideo ? '视频录像' : '纯录音'}</Tag>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          aria-pressed={activeVideo}
          aria-label="视频录像 · 默认模式"
          title="视频录像 · 默认模式"
          onClick={() => s.setVoiceOnly(false)}
          className={`${itemBase} ${activeVideo ? itemActive : itemIdle} ${compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2 font-bold text-[13px]">
            <Icon name="rec" size={14} strokeWidth={1.8}/>
            <span className="leading-snug">
              <span className="whitespace-nowrap">视频录像</span>
              <span className="whitespace-nowrap"> · 默认模式</span>
            </span>
          </div>
          {!compact && <div className="text-[11px] leading-snug mt-1 opacity-75">打开摄像头，练镜头感、表情和停顿。</div>}
        </button>
        <button
          type="button"
          aria-pressed={!activeVideo}
          onClick={() => s.setVoiceOnly(true)}
          className={`${itemBase} ${!activeVideo ? itemActive : itemIdle} ${compact ? 'px-3 py-2.5' : 'px-3.5 py-3'}`}
          style={{borderRadius:'3px'}}
        >
          <div className="flex items-center gap-2 font-bold text-[13px]">
            <Icon name="mic" size={14} strokeWidth={1.8}/> 纯录音
          </div>
          {!compact && <div className="text-[11px] leading-snug mt-1 opacity-75">只练声音时再切换，适合通勤或怕打扰。</div>}
        </button>
      </div>
      {compact && (
        <div className="text-[10px] text-stone-500 mt-2 leading-snug">
          默认会打开摄像头；只练声音时再切换。
        </div>
      )}
    </div>
  );
};

export const UI = {
  crimson: '#A30236',
  crimsonDark: '#700024',
  amber: '#F1A23F',
  navy: '#061A6C',
  stoneBg: '#FAFAF9',
  border: '#E6E6E6',
};

export const cx = (...parts) => parts.filter(Boolean).join(' ');

export const SectionHeader = ({ eyebrow, title, detail, action }) => (
  <div className="flex items-start justify-between gap-4 mb-4">
    <div className="min-w-0">
      {eyebrow && (
        <div className="text-[10px] font-bold uppercase text-stone-400 mb-1 tracking-[0.16em]">
          {eyebrow}
        </div>
      )}
      <h2 className="font-display font-bold text-stone-900 text-[20px] leading-tight">
        {title}
      </h2>
      {detail && <p className="text-[12px] text-stone-500 mt-1 leading-relaxed">{detail}</p>}
    </div>
    {action}
  </div>
);

export const MetricTile = ({ label, value, detail, tone = 'stone', icon }) => {
  const tones = {
    stone: 'bg-white border-stone-200 text-stone-900',
    crimson: 'bg-[#FBEFF2] border-[#F4D4DD] text-[#A30236]',
    amber: 'bg-[#FFF6EC] border-[#FCE6CC] text-[#8E0230]',
    emerald: 'bg-[#EEF6F0] border-[#B6D8BC] text-[#264F30]',
    navy: 'bg-[#E9EBF5] border-[#C5CBE6] text-[#061A6C]',
  };
  return (
    <div className={cx('border p-3 min-w-0', tones[tone] || tones.stone)} style={{borderRadius: '4px'}}>
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-[10px] font-bold uppercase text-stone-500 tracking-[0.14em]">{label}</span>
        {icon}
      </div>
      <div className="font-display font-bold text-[22px] leading-none tabular-nums truncate">{value}</div>
      {detail && <div className="text-[11px] opacity-70 mt-1 truncate">{detail}</div>}
    </div>
  );
};

export const ActionPanel = ({ children, className = '', tone = 'default', style }) => {
  const toneClass = tone === 'dark'
    ? 'bg-stone-950 text-white border-stone-800'
    : 'bg-white text-stone-900 border-stone-200';
  return (
    <section
      className={cx('border shadow-sm kobo-surface', toneClass, className)}
      style={{ borderRadius: '10px', ...style }}
    >
      {children}
    </section>
  );
};

// ============ Top Bar ============

export const TopBar = ({ mode, onBack, onOpenSettings }) => {
  const labels = {
    improv:        { cn: '即兴练习',          no: '01', desc: '抛话题 + 倒计时' },
    teleprompter:  { cn: '爆款文案复刻',      no: '02', desc: '粘贴 → 提词器' },
    host:          { cn: '播客主持人引导',    no: '03', desc: '一步步追问' },
    tutorial:      { cn: '教程模式',          no: '04', desc: '学框架 → 立即实践' },
  };
  const cur = labels[mode] || { cn: '', no: '', desc: '' };
  return (
    <header className="border-b border-stone-200 bg-white sticky top-0 z-10">
      {/* slim crimson top edge */}
      <div className="h-[3px] bg-[#A30236]" />
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={onBack} className="text-stone-500 hover:text-[#A30236] text-[12px] font-medium flex items-center gap-2 tracking-wider">
            <span className="text-[14px]">←</span> 返回
          </button>
          <span className="w-px h-5 bg-stone-200" />
          <div className="flex items-baseline gap-3">
            <span className="stat-num" style={{fontSize:'22px'}}>{cur.no}</span>
            <span className="rule-crimson" />
            <div className="leading-tight">
              <h2 className="font-display font-bold text-[18px] text-stone-900 m-0">{cur.cn}</h2>
              <div className="text-stone-500 text-[12px] mt-0.5">{cur.desc}</div>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button onClick={onOpenSettings} className="text-stone-500 hover:text-[#A30236] text-[12px] font-medium tracking-wider" title="设置">
            ⌘ 设置</button>
        </div>
      </div>
    </header>
  );
};

export const MobileHeader = ({ title, sub, onOpenSettings, transparent }) => (
  <div className={cx(
    'px-4 pt-3 pb-2.5 flex items-center justify-between shrink-0 z-10',
    transparent ? 'bg-transparent' : 'bg-[#FAFAF9]/92 backdrop-blur-md border-b border-stone-200/80'
  )}>
    <div className="min-w-0">
      <div className="text-[10px] font-bold text-stone-400 tracking-[0.16em]">短视频口播练习器</div>
      <div className="font-display font-bold text-[15px] text-stone-950 truncate">{title || '口播练习器'}</div>
      {sub && <div className="text-[11px] text-stone-500 truncate">{sub}</div>}
    </div>
    <button onClick={onOpenSettings}
      className="kobo-press h-9 w-9 border border-stone-200 bg-white flex items-center justify-center text-stone-600 hover:text-[#A30236] shadow-sm"
      title="设置"
      style={{ borderRadius: '10px' }}>
      <Icon name="settings" size={17} />
    </button>
  </div>
);

// ============ Bottom Tab Bar ============
// 5 项：循环模式从底栏移到首页模式格 · 底栏更疏、点得更准

export const NAV_ITEMS = [
  { id: 'home',         icon: 'home',     no: '·',   cn: '今日', sub: '训练看板' },
  { id: 'improv',       icon: 'mic',      no: '01',  cn: '练习', sub: '随机题训练' },
  { id: 'teleprompter', icon: 'document', no: '02',  cn: '提词', sub: '提词器训练' },
  { id: 'host',         icon: 'live',     no: '03',  cn: '主持', sub: '追问压力' },
  { id: 'tutorial',     icon: 'book',     no: '04',  cn: '学习', sub: '框架训练' },
];

export const BottomTabs = ({ mode, onChange }) => (
  <nav className="shrink-0 bg-white/95 backdrop-blur-md border-t border-stone-200/80 relative"
       style={{ paddingBottom: 'max(4px, env(safe-area-inset-bottom, 0px))' }}>
    <div className="grid grid-cols-5">
      {NAV_ITEMS.map(it => {
        const active = mode === it.id;
        return (
          <button
            key={it.id}
            type="button"
            onClick={() => onChange(it.id)}
            className="relative flex flex-col items-center justify-center pt-2.5 pb-1.5 group kobo-press"
          >
            <span
              className={cx(
                'absolute top-0 left-1/2 -translate-x-1/2 h-[2px] bg-[#A30236] transition-all duration-300',
                active ? 'w-8 opacity-100' : 'w-0 opacity-0'
              )}
              style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}
            />
            <div className={cx(
              'relative flex items-center justify-center mb-1 transition-colors duration-300',
              active ? 'text-[#A30236]' : 'text-stone-400 group-hover:text-stone-700'
            )}>
              <span className={cx(
                'flex items-center justify-center transition-transform duration-300',
                active ? 'scale-110' : 'scale-100'
              )} style={{ transitionTimingFunction: 'cubic-bezier(0.32,0.72,0,1)' }}>
                <Icon name={it.icon} size={21} strokeWidth={active ? 2 : 1.55} />
              </span>
            </div>
            <span className={cx(
              'text-[10px] font-medium leading-none tracking-wide transition-colors duration-300',
              active ? 'text-[#A30236]' : 'text-stone-500 group-hover:text-stone-800'
            )}>
              {it.cn}
            </span>
          </button>
        );
      })}
    </div>
  </nav>
);

// ============ Page Header (within content area) ============

export const PageHeader = ({ no, title, desc, iconName, right }) => (
  <div className="kobo-rise mb-6 pb-5 border-b border-stone-200/80">
    <div className="flex items-start gap-3">
      {iconName && (
        <div
          className="w-11 h-11 shrink-0 bg-[#A30236] text-white flex items-center justify-center shadow-sm"
          style={{ borderRadius: '10px' }}
        >
          <Icon name={iconName} size={22} strokeWidth={1.8} />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1.5">
          {no && <span className="font-display font-bold text-[#A30236] tabular-nums text-[15px] leading-none">{no}</span>}
          <span className="rule-crimson" />
          <span className="eyebrow eyebrow--crimson" style={{ fontSize: '10px' }}>练习模式</span>
        </div>
        <h1 className="font-display font-bold text-stone-900 leading-[1.15] m-0 tracking-tight" style={{ fontSize: '24px' }}>{title}</h1>
        {desc && <p className="text-stone-500 text-[12px] mt-1 m-0">{desc}</p>}
      </div>
    </div>
    {right && <div className="mt-3">{right}</div>}
  </div>
);

// ============ Home View ============
// ===== 成就系统 =====
// 用日期对文件分组的工具
