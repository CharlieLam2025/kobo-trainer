import { Icon } from './icons.jsx';
import { useSettings } from '../settings-context.jsx';
import { Btn, Card } from './ui.jsx';
import { useState, useEffect } from '../react-hooks.jsx';

export const ONBOARDING_SLIDES = [
  {
    no: '',
    bg: 'linear-gradient(145deg, #A30236 0%, #6E001E 55%, #3a0716 100%)',
    emoji: '🎙️',
    title: '这是预演 · 不是发布',
    body: '抽题 → 镜头前讲一遍 → 看回放。\n30 秒就能完成一次。录像只在你手机。',
    bullets: [
      '一个主按钮：今天练什么 · 直接开录',
      '录完有 AI 教练复盘 · 可同题二刷',
      '累了就声明休息日 · 连续天数不会断',
    ],
    ctaLabel: '开始第一条预演',
  },
];

export const Onboarding = ({ onDone }) => {
  const [idx, setIdx] = useState(0);
  const slide = ONBOARDING_SLIDES[idx];
  const last = idx === ONBOARDING_SLIDES.length - 1;

  return (
    <div className="fixed inset-0 z-[200] kobo-scrim" style={{ background: slide.bg, color: '#fff' }}>
      <div className="absolute inset-0 flex flex-col"
           style={{ paddingTop: 'calc(env(safe-area-inset-top, 0px) + 20px)', paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 24px)' }}>

        <div className="flex items-center justify-between px-6 mb-6">
          <div className="text-[10px] tracking-[0.3em] uppercase font-bold opacity-70">{slide.no || 'KOBO'}</div>
          <button type="button" onClick={onDone} className="text-[12px] tracking-wider opacity-60 hover:opacity-100 transition-opacity">
            跳过 →
          </button>
        </div>

        <div className="flex-1 flex flex-col justify-center px-7 max-w-md mx-auto w-full">
          <div className="kobo-rise text-[64px] leading-none mb-5" style={{ animationDelay: '60ms' }}>{slide.emoji}</div>
          <h2 className="kobo-rise font-display font-bold text-[28px] leading-tight mb-3" style={{ fontWeight: 800, animationDelay: '120ms' }}>
            {slide.title}
          </h2>
          <p className="kobo-rise text-[14px] opacity-90 leading-relaxed mb-5 whitespace-pre-line" style={{ animationDelay: '180ms' }}>
            {slide.body}
          </p>
          <ul className="space-y-2.5">
            {slide.bullets.map((b, i) => (
              <li key={i} className="kobo-rise text-[13px] flex items-start gap-2.5 opacity-95" style={{ animationDelay: `${240 + i * 60}ms` }}>
                <span className="mt-1.5 w-1 h-1 rounded-full bg-[#F1A23F] shrink-0" />
                <span className="leading-relaxed">{b}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="px-6 mt-6 kobo-rise" style={{ animationDelay: '420ms' }}>
          <div className="flex items-center gap-2 max-w-md mx-auto">
            <button
              type="button"
              onClick={() => { last ? onDone() : setIdx(idx + 1); }}
              className="kobo-press flex-1 px-4 py-3.5 text-[14px] font-bold tracking-wider bg-white text-stone-900 hover:bg-stone-100"
              style={{ borderRadius: '999px' }}
            >
              {last ? (slide.ctaLabel || '开始') : '下一步 →'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// ============ SW 更新提醒 ============
// PWA 装到桌面后用户大多不刷新 · 推了新版也看不到
// 机制：sw.js 在 install 时已经 skipWaiting + claim → 新 SW 接管时触发
//   navigator.serviceWorker.controllerchange → index.html 派发 kobo:sw-update-ready
//   → 本组件监听到 → 弹横幅「新版本已就绪」→ 用户点 = location.reload()

export const UpdateBanner = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const onUpdate = () => setShow(true);
    window.addEventListener('kobo:sw-update-ready', onUpdate);
    return () => window.removeEventListener('kobo:sw-update-ready', onUpdate);
  }, []);
  if (!show) return null;
  return (
    <div className="fixed left-1/2 -translate-x-1/2 z-[150] kobo-rise"
         style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 76px)' }}>
      <div className="flex items-center gap-3 px-4 py-2.5 bg-[#061A6C] text-white shadow-lg border border-white/10"
           style={{ borderRadius: '999px', minWidth: 280 }}>
        <Icon name="sparkle" size={18} className="text-[#F1A23F] shrink-0" strokeWidth={2} />
        <div className="flex-1 text-[13px] font-medium leading-tight">
          新版本已就绪 · 一键加载
        </div>
        <button type="button" onClick={() => window.location.reload()}
          className="kobo-press px-3 py-1.5 text-[12px] font-bold bg-white text-[#061A6C] hover:bg-stone-100"
          style={{ borderRadius: '999px' }}>
          刷新
        </button>
        <button type="button" onClick={() => setShow(false)}
          className="text-white/50 hover:text-white text-lg leading-none px-1"
          aria-label="关闭">×</button>
      </div>
    </div>
  );
};

// ============ 兼容纯语音用户：录满 7 条后提醒试试摄像头 ============
// 用户主动选择 voiceOnly 后，录满 7 条触发一次性升级提示。

export const VoiceUpgradePrompt = () => {
  const { voiceOnly, setVoiceOnly, savedFiles } = useSettings();
  const [show, setShow] = useState(false);

  useEffect(() => {
    if (!voiceOnly) return;
    if (!savedFiles || savedFiles.length < 7) return;
    try {
      if (localStorage.getItem('kobo.voiceUpgradePrompted') === '1') return;
    } catch { return; }
    setShow(true);
  }, [voiceOnly, savedFiles]);

  const dismiss = (upgrade) => {
    try { localStorage.setItem('kobo.voiceUpgradePrompted', '1'); } catch {}
    if (upgrade) setVoiceOnly(false);
    setShow(false);
  };

  if (!show) return null;
  return (
    <div className="fixed inset-0 z-[200] bg-stone-950/70 flex items-center justify-center px-5 fade-in">
      <Card className="w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
        <div className="text-center mb-4">
          <div className="text-[48px] mb-2">🎬</div>
          <div className="eyebrow eyebrow--crimson mb-2">7 条纯语音 · 拐点到了</div>
          <h2 className="font-display font-bold text-stone-900 text-[20px] leading-tight mb-2">
            准备好打开摄像头了吗？
          </h2>
          <p className="text-[13px] text-stone-600 leading-relaxed">
            你这一周已经录了 7 条纯语音 · 开口的习惯有了。<br/>
            现在试试看镜头里的自己 —— 随时可以切回纯语音。
          </p>
        </div>
        <div className="flex flex-col gap-2 mt-5">
          <Btn variant="primary" size="lg" onClick={() => dismiss(true)} className="w-full">
            <Icon name="rec" size={14}/> 现在试试摄像头
          </Btn>
          <Btn variant="ghost" onClick={() => dismiss(false)} className="w-full">
            还没准备好 · 继续语音
          </Btn>
        </div>
      </Card>
    </div>
  );
};

// ============ App ============
// DeepSeek key 不再硬编码 · 没填 key 时走 Cloudflare Worker 代理（每 IP 50 次/天）
// 用户在"设置"里可填自己的 key 解锁无限调用
