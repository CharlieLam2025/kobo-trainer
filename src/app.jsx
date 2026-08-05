import './native.jsx';
import { IOSDevice } from './components/ios-shell.jsx';
import { deleteNativeSavedFile, persistSaveDirHandle, loadSaveDirHandle } from './lib/storage.jsx';
import { getRoutineAnchor, scheduleDailyReminder } from './lib/notifications.jsx';
import { SettingsContext } from './settings-context.jsx';
import { MobileHeader, NAV_ITEMS, BottomTabs, PageHeader } from './components/ui.jsx';
import { SettingsPanel } from './components/settings-panel.jsx';
import { Onboarding, UpdateBanner, VoiceUpgradePrompt } from './components/overlays.jsx';
import { HomeView } from './modes/home.jsx';
import { useState, useEffect, useRef, useMemo, useCallback } from './react-hooks.jsx';
import { normalizeTopicPreferences, updateTopicPreference } from './topic-preferences.mjs';
import { lsGet, lsSet, lsGetJson, lsSetJson } from './lib/utils.jsx';

// 模式懒加载：首屏只带首页 + shell · 点进模式再拉对应 chunk
const ImprovMode = React.lazy(() =>
  import('./modes/improv.jsx').then(m => ({ default: m.ImprovMode }))
);
const TeleprompterMode = React.lazy(() =>
  import('./modes/teleprompter.jsx').then(m => ({ default: m.TeleprompterMode }))
);
const HostMode = React.lazy(() =>
  import('./modes/host.jsx').then(m => ({ default: m.HostMode }))
);
const TutorialMode = React.lazy(() =>
  import('./modes/tutorial.jsx').then(m => ({ default: m.TutorialMode }))
);
const EndlessMode = React.lazy(() =>
  import('./modes/endless.jsx').then(m => ({ default: m.EndlessMode }))
);

const ModeFallback = () => (
  <div className="kobo-rise py-16 text-center">
    <div className="inline-block w-8 h-8 border-2 border-[#A30236] border-t-transparent rounded-full animate-spin mb-3" />
    <div className="text-[13px] text-stone-500">加载练习模式…</div>
  </div>
);

export function App() {
  const [mode, setMode] = useState('home');
  // 从首页 HERO 按钮进 ImprovMode 时传一个「快速速记」意图 · 让 ImprovMode 跳过 3 屏 config
  // improvIntent 形态：
  //   - 'quick30'                          → 30s + 全题库随机
  //   - { type: 'preset', topic: 'xxx' }   → 60s + 指定题目（明天的话题用）
  const [improvIntent, setImprovIntent] = useState(null);
  const quickStartImprov = useCallback(() => {
    setImprovIntent('quick30');
    setMode('improv');
  }, []);
  const startWithTopic = useCallback((topic) => {
    if (!topic) return;
    setImprovIntent({ type: 'preset', topic });
    setMode('improv');
  }, []);
  const clearImprovIntent = useCallback(() => setImprovIntent(null), []);
  const [settingsOpen, setSettingsOpen] = useState(false);
  // 首次打开 / 用户重看 → 显示引导
  const [showOnboarding, setShowOnboarding] = useState(() => !lsGet('kobo.onboarded'));
  const dismissOnboarding = useCallback(() => {
    lsSet('kobo.onboarded', '1');
    setShowOnboarding(false);
  }, []);
  const replayOnboarding = useCallback(() => {
    setShowOnboarding(true);
  }, []);
  // 用户自己填的 key（localStorage）· 不填的话 chatComplete 会自动走代理
  const [userApiKey, setUserApiKeyState] = useState(() => lsGet('kobo.deepseekKey', '') || '');
  // 实际传给 deepseek* 函数的 key · 空字符串 → 走代理
  const apiKey = userApiKey;
  const [saveDir, setSaveDirState] = useState(null);
  // 绑定/解绑目录时同步写 IndexedDB · 下次启动 loadSaveDirHandle 能恢复
  const setSaveDir = useCallback((handle) => {
    setSaveDirState(handle);
    persistSaveDirHandle(handle || null);
  }, []);
  // 启动时恢复上次绑定的目录句柄（权限在真正写文件时再校验/申请）
  useEffect(() => {
    let cancelled = false;
    loadSaveDirHandle().then(handle => {
      if (!cancelled && handle) setSaveDirState(prev => prev || handle);
    });
    return () => { cancelled = true; };
  }, []);
  // 保存历史：localStorage 持久化，最多 50 条
  const [savedFiles, setSavedFiles] = useState(() => {
    const arr = lsGetJson('kobo.savedFiles', []);
    return Array.isArray(arr) ? arr.slice(0, 50) : [];
  });
  const saveDirRef = useRef(null); // saveDir 可能 stale，用 ref 给 removeSavedFile 用

  const [topicPreferences, setTopicPreferences] = useState(() =>
    normalizeTopicPreferences(lsGetJson('kobo.topicPreferences.v1', {}) || {})
  );
  const changeTopicPreference = useCallback((payload) => {
    setTopicPreferences(prev => {
      const next = updateTopicPreference(prev, payload);
      lsSetJson('kobo.topicPreferences.v1', next);
      return next;
    });
  }, []);
  const clearTopicPreferences = useCallback(() => {
    const next = normalizeTopicPreferences();
    setTopicPreferences(next);
    lsSet('kobo.topicPreferences.v1', null);
  }, []);

  // 🎙️ 纯语音模式（不开摄像头 · 节电 + 隐私 · 仅录音）
  // 新用户默认视频录像；用户显式切过纯录音时尊重本地设置。
  const [voiceOnly, setVoiceOnlyState] = useState(() => {
    const stored = lsGet('kobo.voiceOnly');
    if (stored !== null) return stored === '1'; // 用户显式设过 · 尊重
    return false;
  });
  const setVoiceOnly = useCallback((v) => {
    setVoiceOnlyState(v);
    lsSet('kobo.voiceOnly', v ? '1' : '0');
  }, []);

  // 🔔 本地推送提醒（仅 Capacitor / Android · Web 端有限支持）
  const [reminderEnabled, setReminderEnabledState] = useState(() => lsGet('kobo.reminderEnabled') === '1');
  const [reminderTime, setReminderTimeState] = useState(() => lsGet('kobo.reminderTime', '19:00') || '19:00');
  const setReminderEnabled = useCallback((v) => {
    setReminderEnabledState(v);
    lsSet('kobo.reminderEnabled', v ? '1' : '0');
  }, []);
  const setReminderTime = useCallback((t) => {
    setReminderTimeState(t);
    lsSet('kobo.reminderTime', t);
  }, []);

  // 🪝 routine anchor · 「After I [既有动作], I will [新习惯]」绑定
  // 影响：通知文案 + HomeView 轻提示
  const [routineAnchor, setRoutineAnchorState] = useState(() => lsGet('kobo.routineAnchor', '') || '');
  const setRoutineAnchor = useCallback((id) => {
    setRoutineAnchorState(id || '');
    lsSet('kobo.routineAnchor', id || null);
    // 设置 anchor 时自动建议它的时间（仅当用户没改过 reminderTime）
    const a = getRoutineAnchor(id);
    if (a && lsGet('kobo.reminderTimeUserSet') !== '1') {
      const newTime = `${String(a.hour).padStart(2,'0')}:${String(a.minute).padStart(2,'0')}`;
      setReminderTimeState(newTime);
      lsSet('kobo.reminderTime', newTime);
    }
  }, []);

  // 当 enabled / time / anchor 变化 · 重新调度（anchor 影响通知文案）
  useEffect(() => {
    const [h, m] = reminderTime.split(':').map(x => parseInt(x) || 0);
    scheduleDailyReminder({ hour: h, minute: m, enabled: reminderEnabled, anchorId: routineAnchor || null }).then(r => {
      console.log('[Reminder]', r);
    });
  }, [reminderEnabled, reminderTime, routineAnchor]);

  // 已"见过"的成就（避免每次访问都弹动画）
  // JSON.parse 成功但形状不对（如老版本写入 "{}"）也要兜底成数组 · 否则后续 .includes 直接崩
  const [unlockedAchievements, setUnlockedAchievementsState] = useState(() => {
    const v = lsGetJson('kobo.unlockedAchievements', []);
    return Array.isArray(v) ? v : [];
  });
  const markAchievementsSeen = useCallback((ids) => {
    setUnlockedAchievementsState(prev => {
      const merged = Array.from(new Set([...(prev || []), ...ids]));
      lsSetJson('kobo.unlockedAchievements', merged);
      return merged;
    });
  }, []);

  // 休息日（dayKey 字符串数组），streak 计算时跳过
  const [restDays, setRestDaysState] = useState(() => {
    const v = lsGetJson('kobo.restDays', []);
    return Array.isArray(v) ? v : [];
  });
  const addRestDay = useCallback((dayK) => {
    setRestDaysState(prev => {
      if (prev.includes(dayK)) return prev;
      const next = [...prev, dayK].sort();
      lsSetJson('kobo.restDays', next);
      return next;
    });
  }, []);
  const removeRestDay = useCallback((dayK) => {
    setRestDaysState(prev => {
      const next = prev.filter(d => d !== dayK);
      lsSetJson('kobo.restDays', next);
      return next;
    });
  }, []);

  // 每周复盘上次显示时间戳
  const [lastWeeklyRecap, setLastWeeklyRecapState] = useState(() =>
    parseInt(lsGet('kobo.lastWeeklyRecap', '0') || '0', 10) || 0
  );
  const setLastWeeklyRecap = useCallback((ts) => {
    setLastWeeklyRecapState(ts);
    lsSet('kobo.lastWeeklyRecap', String(ts));
  }, []);

  // 每日打卡目标
  const [dailyGoal, setDailyGoalState] = useState(() => {
    const g = lsGetJson('kobo.dailyGoal', null);
    if (g && typeof g.count === 'number' && typeof g.durationSec === 'number') return g;
    // 默认 30s：跟产品承诺「30 秒就能完成一次预演」对齐 ·
    // 原来默认 60s → 用户走默认速练路径（30s）录完却「不计入打卡」· 习惯环第一步就挫败
    return { count: 3, durationSec: 30 };
  });
  const setDailyGoal = useCallback((g) => {
    setDailyGoalState(g);
    lsSetJson('kobo.dailyGoal', g);
  }, []);

  // Detect "this is a phone" — Capacitor native OR viewport < 600px → fill the whole screen,
  // no fake iPhone frame (otherwise the user sees a tiny phone-in-phone view).
  const [isPhone, setIsPhone] = useState(() => {
    try {
      if (typeof window === 'undefined') return false;
      if (window.Capacitor) return true;
      return window.innerWidth < 600;
    } catch { return false; }
  });
  useEffect(() => {
    const onResize = () => {
      const v = !!window.Capacitor || window.innerWidth < 600;
      setIsPhone(v);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  const setApiKey = useCallback((k) => {
    setUserApiKeyState(k);
    lsSet('kobo.deepseekKey', k || null);
  }, []);

  // 同步 saveDir 到 ref，便于 removeSavedFile 拿到最新值（不重建回调）
  useEffect(() => { saveDirRef.current = saveDir; }, [saveDir]);

  // 持久化 savedFiles 到 localStorage
  const persistSavedFiles = (arr) => { lsSetJson('kobo.savedFiles', arr); };

  const addSavedFile = useCallback((f) => {
    setSavedFiles(prev => {
      const entry = { ...f, ts: f.ts || Date.now(), tag: f.tag || null };
      const next = [entry, ...prev].slice(0, 50);
      persistSavedFiles(next);
      return next;
    });
  }, []);

  // 更新单条 metadata（用于打标签 / 改备注）— 用 filename 定位，避免 idx 漂移
  const updateSavedFile = useCallback((filename, patch) => {
    setSavedFiles(prev => {
      const next = prev.map(f => f.filename === filename ? { ...f, ...patch } : f);
      persistSavedFiles(next);
      return next;
    });
  }, []);

  // 删除单条：从 localStorage 移除 + 如果是 folder 保存且目录还在 → 同步删磁盘文件
  const removeSavedFile = useCallback(async (idx) => {
    let target = null;
    setSavedFiles(prev => {
      target = prev[idx];
      const next = prev.filter((_, i) => i !== idx);
      persistSavedFiles(next);
      return next;
    });
    // 异步尝试删除磁盘文件（不阻塞 UI）
    setTimeout(async () => {
      if (target && target.method === 'folder' && target.filename && saveDirRef.current) {
        try {
          await saveDirRef.current.removeEntry(target.filename);
        } catch (e) { /* 文件可能不存在或权限失效 */ }
      }
      if (target && target.method === 'native') {
        try { await deleteNativeSavedFile(target); } catch (e) { /* 文件可能不存在或权限失效 */ }
      }
    }, 0);
  }, []);

  const clearAllSavedFiles = useCallback(async () => {
    const toDelete = savedFiles.filter(f => f.method === 'folder' || f.method === 'native');
    setSavedFiles([]);
    persistSavedFiles([]);
    for (const f of toDelete) {
      if (f.method === 'folder' && saveDirRef.current) {
        try { await saveDirRef.current.removeEntry(f.filename); } catch {}
      }
      if (f.method === 'native') {
        try { await deleteNativeSavedFile(f); } catch {}
      }
    }
  }, [savedFiles]);

  const isBuiltinKey = !userApiKey;
  const ctxValue = useMemo(() => ({
    apiKey, userApiKey, isBuiltinKey, setApiKey,
    saveDir, setSaveDir, savedFiles, addSavedFile, updateSavedFile, removeSavedFile, clearAllSavedFiles,
    dailyGoal, setDailyGoal,
    unlockedAchievements, markAchievementsSeen,
    lastWeeklyRecap, setLastWeeklyRecap,
    restDays, addRestDay, removeRestDay,
    voiceOnly, setVoiceOnly,
    reminderEnabled, setReminderEnabled, reminderTime, setReminderTime,
    routineAnchor, setRoutineAnchor,
    topicPreferences, changeTopicPreference, clearTopicPreferences,
  }), [apiKey, userApiKey, isBuiltinKey, setApiKey, saveDir, savedFiles, addSavedFile, updateSavedFile, removeSavedFile, clearAllSavedFiles, dailyGoal, setDailyGoal, unlockedAchievements, markAchievementsSeen, lastWeeklyRecap, setLastWeeklyRecap, restDays, addRestDay, removeRestDay, voiceOnly, setVoiceOnly, reminderEnabled, setReminderEnabled, reminderTime, setReminderTime, routineAnchor, setRoutineAnchor, topicPreferences, changeTopicPreference, clearTopicPreferences]);

  // Mode → title for MobileHeader（endless 不在底栏 · 单独标注）
  const headerSub = useMemo(() => {
    if (mode === 'endless') return '02 · 循环';
    const it = NAV_ITEMS.find(n => n.id === mode);
    return it ? (it.no === '·' ? '本地训练工作台' : `${it.no} · ${it.cn}`) : '本地训练工作台';
  }, [mode]);

  const phoneInner = (
    <>
      <MobileHeader title="口播练习器" sub={headerSub} onOpenSettings={() => setSettingsOpen(true)} />

      {/* Scrollable main area */}
      <main style={{flex:1, overflowY:'auto', overflowX:'hidden', minHeight:0}}>
        <div className="px-5 py-5">
          {mode === 'home' ? (
            <HomeView onSelect={setMode} onOpenSettings={() => setSettingsOpen(true)} onQuickStart={quickStartImprov} onStartWithTopic={startWithTopic} />
          ) : (
            <>
              {(() => {
                const MODE_META = {
                  improv:       { no: '01', icon: 'mic',      title: '即兴练习',     desc: '随机题训练' },
                  endless:      { no: '02', icon: 'refresh',  title: '循环模式',     desc: '连续换题不停' },
                  teleprompter: { no: '03', icon: 'document', title: '爆款文案复刻', desc: '提词器训练' },
                  host:         { no: '04', icon: 'live',     title: '主持人引导',   desc: '追问压力' },
                  tutorial:     { no: '05', icon: 'book',     title: '教程模式',     desc: '框架训练' },
                };
                const meta = MODE_META[mode];
                if (!meta) return null;
                return <PageHeader no={meta.no} iconName={meta.icon} title={meta.title} desc={meta.desc} />;
              })()}
              <React.Suspense fallback={<ModeFallback />}>
                {mode === 'improv'       && <ImprovMode key="improv" intent={improvIntent} clearIntent={clearImprovIntent} />}
                {mode === 'endless'      && <EndlessMode key="endless" />}
                {mode === 'teleprompter' && <TeleprompterMode key="tele" />}
                {mode === 'host'         && <HostMode key="host" />}
                {mode === 'tutorial'     && <TutorialMode key="tut" />}
              </React.Suspense>
            </>
          )}
        </div>
      </main>

      <BottomTabs mode={mode} onChange={setMode} />

      {/* Settings rendered INSIDE phone shell so it's contained */}
      {settingsOpen && <SettingsPanel onClose={() => setSettingsOpen(false)} />}

      {/* SW 新版本就绪横幅（fixed 定位 · 自动浮在底部 tab 上方） */}
      <UpdateBanner />

      {/* 第一周渐进路径：录满 7 条纯语音后 · 一次性提示开摄像头 */}
      <VoiceUpgradePrompt />
    </>
  );

  return (
    <SettingsContext.Provider value={ctxValue}>
      {isPhone ? (
        // Real phone / Capacitor: fullscreen, no iOS frame chrome
        <div style={{
          position: 'fixed', inset: 0,
          display: 'flex', flexDirection: 'column',
          background: '#FAFAF9',
          paddingTop: 'env(safe-area-inset-top, 0px)',
          paddingBottom: 'env(safe-area-inset-bottom, 0px)',
        }}>
          {phoneInner}
        </div>
      ) : (
        // Desktop preview: show app inside a centred iPhone frame
        <div className="min-h-screen w-full flex items-start justify-center py-6 px-4"
             style={{background:'radial-gradient(ellipse at 50% 30%, #2a2826 0%, #1a1918 70%, #0e0d0c 100%)'}}>
          <IOSDevice width={402} height={874}>
            <div style={{position:'absolute', inset:0, paddingTop:62, paddingBottom:34, display:'flex', flexDirection:'column', background:'#FAFAF9'}}>
              {phoneInner}
            </div>
          </IOSDevice>
        </div>
      )}

      {/* 首次打开 / 用户主动重看 · 引导覆盖层 */}
      {showOnboarding && <Onboarding onDone={dismissOnboarding} />}

      {/* 给 SettingsSheet 一条访问入口（通过 window 暴露） */}
      {(() => { try { window.__koboReplayOnboarding = replayOnboarding; } catch {} return null; })()}
    </SettingsContext.Provider>
  );
}

// ============ ErrorBoundary · 单组件崩溃不要白屏整个 App ============

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, info: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    this.setState({ info });
    // 上报到 Sentry（如果已加载）
    try {
      if (window.Sentry && typeof window.Sentry.captureException === 'function') {
        window.Sentry.captureException(error, { extra: { componentStack: info?.componentStack } });
      }
    } catch {}
    // 浏览器控制台保留（开发者能 F12 看到）
    console.error('[ErrorBoundary]', error, info);
  }

  reset = () => {
    this.setState({ hasError: false, error: null, info: null });
  };

  hardReload = () => {
    try { window.location.reload(); } catch {}
  };

  render() {
    if (!this.state.hasError) return this.props.children;
    const errMsg = String(this.state.error?.message || this.state.error || '未知错误');
    return (
      <div style={{
        position:'fixed', inset:0, padding:24,
        background:'#FAFAF9', color:'#1c1917',
        display:'flex', flexDirection:'column', alignItems:'stretch', justifyContent:'center',
        fontFamily:'system-ui, -apple-system, sans-serif',
        overflowY:'auto',
      }}>
        <div style={{maxWidth: 480, margin:'0 auto', width:'100%'}}>
          <div style={{fontSize: 56, marginBottom: 16}}>🫠</div>
          <h1 style={{fontSize:24, fontWeight:800, marginBottom:8, letterSpacing:'-0.01em'}}>
            页面碎了一下
          </h1>
          <p style={{fontSize:14, color:'#78716c', marginBottom:20, lineHeight:1.6}}>
            应用里某个组件出错 · 已自动上报让作者修 · 你的数据没丢（视频 / 打卡 / 设置都在本地存储）。
          </p>
          <div style={{
            background:'#FBEFF2', border:'1px solid #f4d4dd', padding:'12px 14px',
            borderRadius: 3, fontSize: 12, color:'#7E001E', marginBottom:20,
            fontFamily:'ui-monospace, monospace', wordBreak:'break-all',
          }}>
            {errMsg.slice(0, 300)}
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button onClick={this.reset}
              style={{
                padding:'12px 18px', background:'#A30236', color:'#fff',
                border:'none', borderRadius: 3, fontWeight:700, cursor:'pointer',
                fontSize: 13, letterSpacing: '0.04em',
              }}>
              试着继续 →
            </button>
            <button onClick={this.hardReload}
              style={{
                padding:'12px 18px', background:'#fff', color:'#1c1917',
                border:'1.5px solid #d6d3d1', borderRadius: 3, fontWeight:700, cursor:'pointer',
                fontSize: 13, letterSpacing: '0.04em',
              }}>
              重启应用
            </button>
          </div>
          <div style={{marginTop:24, fontSize:11, color:'#a8a29e'}}>
            帮 CharlieLam 修这个问题：截屏上面的错误信息 · 发到
            {' '}<a href="https://github.com/CharlieLam2025/kobo-trainer/issues" target="_blank" rel="noopener"
              style={{color:'#A30236', textDecoration:'underline'}}>项目反馈页</a>
          </div>
        </div>
      </div>
    );
  }
}

export const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
