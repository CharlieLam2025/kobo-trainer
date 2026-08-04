import { Icon } from './icons.jsx';
import { deepseekGenerateTopics } from '../lib/deepseek.jsx';
import { ROUTINE_ANCHORS } from '../lib/notifications.jsx';
import { useSettings } from '../settings-context.jsx';
import { Btn, Card, Tag, SectionHeader } from './ui.jsx';
import { RecordingHistoryList } from './library.jsx';
import { useState, useMemo } from '../react-hooks.jsx';
import { normalizeTopicPreferences } from '../topic-preferences.mjs';

export const SettingsPanel = ({ onClose }) => {
  const s = useSettings();
  const [keyInput, setKeyInput] = useState(s.userApiKey);
  const [testStatus, setTestStatus] = useState(null);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const fsSupported = !!window.showDirectoryPicker;
  // memo：否则 API key 输入框每敲一个字都要整套 normalize 一遍
  const topicPreferenceSummary = useMemo(
    () => normalizeTopicPreferences(s.topicPreferences),
    [s.topicPreferences]
  );

  const save = () => {
    s.setApiKey(keyInput.trim());
    onClose();
  };
  const clearKey = () => {
    setKeyInput('');
    s.setApiKey('');
    setTestStatus(null);
  };

  const test = async () => {
    setTestStatus({ state: 'testing' });
    try {
      // 测试当前生效的 key：用户填的优先，否则用内置
      const effectiveTestKey = keyInput.trim() || s.apiKey;
      const out = await deepseekGenerateTopics({ apiKey: effectiveTestKey, theme: '内卷', count: 2 });
      setTestStatus({ state: 'ok', sample: out });
    } catch (e) {
      setTestStatus({ state: 'fail', error: e.message });
    }
  };

  const pickDir = async () => {
    try {
      const h = await window.showDirectoryPicker({ id: 'kobo-trainer-save', mode: 'readwrite' });
      s.setSaveDir(h);
    } catch (e) { /* user canceled */ }
  };

  return (
    <div className="absolute inset-0 z-50 bg-stone-950/70 flex items-end justify-center p-3" onClick={onClose}>
      <Card className="w-full p-5 fade-in max-h-[86%] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="font-display font-bold text-[18px] text-stone-950">设置</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-900">✕</button>
        </div>

        <SectionHeader
          eyebrow="设置"
          title="练习设置"
          detail="常用录制、提醒、隐私和 AI 复盘设置留在这里；低频工具放进高级区。"
        />

        <div className="mb-6">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">DeepSeek 密钥</label>
            {s.isBuiltinKey
              ? <Tag color="emerald">免费代理 · 每日 50 次</Tag>
              : <Tag color="amber">自用密钥 · 无限</Tag>}
          </div>
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3 text-[11px] text-stone-600 leading-relaxed" style={{borderRadius:'2px'}}>
            {s.isBuiltinKey
              ? <>默认走免费代理 · 每个网络地址每天 50 次免费 AI 调用。<br/>想无限调，把自己的 DeepSeek 密钥填到下面框 · 直连 · 走你自己的余额（DeepSeek 1 元能用很久）。</>
              : <>✓ 正在用你自己的密钥 · 直连 DeepSeek · 无次数限制 · 不再走代理</>}
          </div>
          <input
            type="password"
            value={keyInput}
            onChange={e => setKeyInput(e.target.value)}
            placeholder="sk-... （留空 = 走免费代理）"
            className="w-full px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:outline-none focus:border-amber-400"
          />
          <div className="text-xs text-stone-500 mt-2">
            自己的密钥从 <a href="https://platform.deepseek.com/api_keys" target="_blank" rel="noopener" className="text-amber-700 underline">DeepSeek 控制台</a> 获取（充值 1 元够用几个月）。
            仅保存在你的浏览器本地存储 · 不会上传任何服务器。
            {keyInput && <> · <button onClick={clearKey} className="underline text-stone-600 hover:text-red-600">清除，恢复免费代理</button></>}
          </div>
          <div className="flex items-center gap-2 mt-3">
            {/* 不要求先填 key：test() 本来就会回落到当前生效的 key/免费代理 */}
            <Btn size="sm" variant="secondary" onClick={test} disabled={testStatus?.state === 'testing'}>
              {testStatus?.state === 'testing' ? '测试中...' : '测试连接'}
            </Btn>
            {testStatus?.state === 'ok' && <span className="text-xs text-emerald-700">✓ 通过 · 样例：{testStatus.sample.join(' / ')}</span>}
            {testStatus?.state === 'fail' && <span className="text-xs text-red-600">{testStatus.error}</span>}
          </div>
        </div>

        {/* 数据 / 隐私承诺 */}
        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">🔒 数据 & 隐私</label>
            <Tag color="emerald">全本地</Tag>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 p-3 text-[12px] text-emerald-900 leading-relaxed space-y-1.5" style={{borderRadius:'3px'}}>
            <div>✅ 所有<strong>视频 / 转录稿 / 打卡数据</strong>都只存在你的设备本地</div>
            <div>✅ 不需要登录、不需要账号、不收集任何用户行为</div>
            <div>✅ AI 调用仅传输<strong>话题 / 转录文字</strong>（不上传视频）· 走 DeepSeek</div>
            <div>✅ 仅在应用崩溃时上报<strong>报错信息</strong>给作者修问题（无任何个人内容 · 可关闭）</div>
            <div>✅ 代码<a href="https://github.com/CharlieLam2025/kobo-trainer" target="_blank" rel="noopener" className="underline font-bold">开源在 GitHub</a> · 可自行审计</div>
          </div>
        </div>

        {/* 🔔 每日打卡提醒（本地通知 · 仅安卓应用端有效） */}
        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">🔔 每日打卡提醒</label>
            <Tag color={s.reminderEnabled ? 'amber' : 'stone'}>{s.reminderEnabled ? '已开启' : '未开启'}</Tag>
            {typeof window !== 'undefined' && !window.Capacitor && <Tag color="stone">仅应用端</Tag>}
          </div>
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3 text-[11px] text-stone-600 leading-relaxed" style={{borderRadius:'2px'}}>
            每天定时弹个温和提醒"60s 预演一条" · 仅本地通知 · 不联网 · 不上传数据。<br/>
            <span className="text-amber-700">仅安卓应用端真正可靠 · 网页 / iOS 浏览器需要保持页面打开</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <button onClick={() => s.setReminderEnabled(!s.reminderEnabled)}
              className={`kobo-press px-3 py-1.5 text-xs font-bold transition-colors ${s.reminderEnabled ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              style={{borderRadius:'6px'}}>
              {s.reminderEnabled ? '✓ 已开启 · 点击关闭' : '🔔 开启提醒'}
            </button>
            <label className="text-xs text-stone-600 flex items-center gap-2">
              提醒时间
              <input type="time"
                value={s.reminderTime}
                onChange={e => {
                  s.setReminderTime(e.target.value);
                  try { localStorage.setItem('kobo.reminderTimeUserSet', '1'); } catch {}
                }}
                disabled={!s.reminderEnabled}
                className="px-2 py-1 border border-stone-300 text-xs font-mono disabled:opacity-40"
                style={{borderRadius:'6px'}} />
            </label>
          </div>
          <div className="mt-3">
            <div className="text-[11px] text-stone-500 mb-2">习惯锚点 · 绑到日常动作后，通知文案会更贴你</div>
            <div className="grid grid-cols-2 gap-1.5">
              {ROUTINE_ANCHORS.map(a => {
                const on = s.routineAnchor === a.id;
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => s.setRoutineAnchor(on ? '' : a.id)}
                    className={`kobo-press text-left p-2.5 border flex items-center gap-2 transition-colors ${
                      on ? 'border-[#A30236] bg-[#FBEFF2]' : 'border-stone-200 hover:border-stone-300'
                    }`}
                    style={{ borderRadius: '6px' }}
                  >
                    <span className="text-[16px] leading-none">{a.emoji}</span>
                    <span className="text-[12px] font-semibold text-stone-700 truncate">{a.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* 🎙️ 录制模式 · 纯语音 / 完整视频 */}
        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">🎙️ 录制模式</label>
            <Tag color={s.voiceOnly ? 'amber' : 'stone'}>{s.voiceOnly ? '仅录音' : '视频 + 音频'}</Tag>
          </div>
          <div className="bg-stone-50 border border-stone-200 p-2.5 mb-3 text-[11px] text-stone-600 leading-relaxed" style={{borderRadius:'2px'}}>
            纯语音模式：不开摄像头 · 只录声音 · 节电 + 隐私友好 · 适合"先练声音再练镜头"
          </div>
          <div className="flex gap-2">
            <button onClick={() => s.setVoiceOnly(false)}
              className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${!s.voiceOnly ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              style={{borderRadius:'2px'}}>
              📹 完整视频
            </button>
            <button onClick={() => s.setVoiceOnly(true)}
              className={`flex-1 px-3 py-2 text-xs font-bold transition-colors ${s.voiceOnly ? 'bg-[#A30236] text-white' : 'bg-stone-100 text-stone-700 hover:bg-stone-200'}`}
              style={{borderRadius:'2px'}}>
              🎙️ 纯语音
            </button>
          </div>
          {s.voiceOnly && (
            <div className="mt-3 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1.5" style={{borderRadius:'3px'}}>
              💡 已切到纯语音 · 美颜 / 滤镜 / 背景虚化暂时无效 · 录制时显示音频波形
            </div>
          )}
        </div>

        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2 flex-wrap">
            <label className="text-sm font-medium">选题偏好</label>
            <Tag color="emerald">仅保存在本机</Tag>
          </div>
          <div className="grid grid-cols-3 gap-2 mb-3">
            <div className="bg-stone-50 border border-stone-200 p-2.5 text-center" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-[18px] text-emerald-700">{topicPreferenceSummary.interestedTopics.length}</div>
              <div className="text-[10px] text-stone-500">想聊</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 p-2.5 text-center" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-[18px] text-[#A30236]">{topicPreferenceSummary.favoriteTopics.length}</div>
              <div className="text-[10px] text-stone-500">收藏</div>
            </div>
            <div className="bg-stone-50 border border-stone-200 p-2.5 text-center" style={{borderRadius:'3px'}}>
              <div className="font-display font-bold text-[18px] text-stone-700">{topicPreferenceSummary.hiddenTopics.length}</div>
              <div className="text-[10px] text-stone-500">已跳过</div>
            </div>
          </div>
          <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500">
            <span>抽题会自动减少你不想聊的方向，并优先想聊与收藏题目。</span>
            {(topicPreferenceSummary.interestedTopics.length > 0 || topicPreferenceSummary.favoriteTopics.length > 0 || topicPreferenceSummary.hiddenTopics.length > 0) && (
              <button onClick={s.clearTopicPreferences} className="shrink-0 text-[#A30236] underline">重置偏好</button>
            )}
          </div>
        </div>

        <div className="mb-6 pt-6 border-t border-stone-200">
          <div className="flex items-center gap-2 mb-2">
            <label className="text-sm font-medium">视频保存目录</label>
            <Tag color={fsSupported ? 'emerald' : 'stone'}>{fsSupported ? '可选' : '不支持当前浏览器'}</Tag>
          </div>
          {fsSupported ? (
            <>
              <div className="text-xs text-stone-500 mb-2">
                选一个目录后，所有录制完成的视频会自动写入该目录（不需要每次点下载）。<br />
                若不设置，视频会自动下载到浏览器默认下载文件夹。
              </div>
              <div className="flex items-center gap-2">
                <Btn size="sm" variant="secondary" onClick={pickDir}><Icon name="folder" size={13}/> 选择目录</Btn>
                {s.saveDir && (
                  <>
                    <span className="text-xs text-emerald-700">✓ 已绑定：{s.saveDir.name}</span>
                    <button onClick={() => s.setSaveDir(null)} className="text-xs text-stone-500 hover:text-red-600 ml-2">解绑</button>
                  </>
                )}
                {!s.saveDir && <span className="text-xs text-stone-500">未选 · 将自动下载</span>}
              </div>
            </>
          ) : (
            <div className="text-xs text-stone-500">
              当前浏览器不支持 File System Access API（建议用 Chrome / Edge）。视频将自动下载到默认下载文件夹。
            </div>
          )}
        </div>

        <div className="mb-4 pt-4 border-t border-stone-200">
          <button
            onClick={() => setAdvancedOpen(v => !v)}
            className="w-full flex items-center justify-between bg-stone-100 px-3 py-2 text-[12px] font-bold text-stone-700 hover:bg-stone-200 transition-colors"
            style={{borderRadius:'4px'}}
          >
            <span>高级选项</span>
            <span>{advancedOpen ? '收起' : '展开'}</span>
          </button>
          {advancedOpen && (
            <div className="mt-3 space-y-4">
              {s.savedFiles.length > 0 && <RecordingHistoryList settings={s} />}

              {/* 重看引导 */}
              <div className="pt-4 border-t border-stone-200">
                <div className="text-sm font-medium mb-2">引导与帮助</div>
                <button
                  onClick={() => {
                    try { window.__koboReplayOnboarding && window.__koboReplayOnboarding(); } catch {}
                    onClose();
                  }}
                  className="px-3 py-1.5 text-xs font-bold tracking-wider bg-stone-100 text-stone-700 hover:bg-stone-200 transition-colors"
                  style={{borderRadius:'3px'}}>
                  🎬 重看新手引导
                </button>
                <div className="text-[10px] text-stone-400 mt-1">1 屏 · 核心哲学 + 三步循环 + 隐私承诺。</div>
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Btn variant="ghost" onClick={onClose}>取消</Btn>
          <Btn variant="primary" onClick={save}>保存</Btn>
        </div>

        {/* 水印 */}
        <div className="mt-5 pt-4 border-t border-stone-200 text-center">
          <div className="text-[10px] tracking-[0.22em] font-bold text-[#A30236]">
            CharlieLam 制作
          </div>
          <div className="text-[9px] text-stone-400 mt-1">口播练习器 · v.1.0</div>
        </div>
      </Card>
    </div>
  );
};

// ============ Onboarding 引导（首次打开 · 1 屏）============
// 4 屏 → 1 屏：用户没耐心翻 4 屏，第 2 屏就划走了。
// 一屏一定要传达：是什么 / 怎么做 / 隐私承诺 / 立刻开始。
