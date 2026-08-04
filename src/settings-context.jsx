import { EMPTY_TOPIC_PREFERENCES } from './topic-preferences.mjs';

export const SettingsContext = React.createContext({
  apiKey: '', userApiKey: '', isBuiltinKey: true, setApiKey: () => {},
  saveDir: null, setSaveDir: () => {},
  savedFiles: [], addSavedFile: () => {}, updateSavedFile: () => {}, removeSavedFile: () => {}, clearAllSavedFiles: () => {},
  dailyGoal: { count: 3, durationSec: 30 }, setDailyGoal: () => {},
  unlockedAchievements: [], markAchievementsSeen: () => {},
  lastWeeklyRecap: 0, setLastWeeklyRecap: () => {},
  voiceOnly: false, setVoiceOnly: () => {},
  reminderEnabled: false, setReminderEnabled: () => {},
  reminderTime: '19:00', setReminderTime: () => {},
  routineAnchor: '', setRoutineAnchor: () => {},
  topicPreferences: EMPTY_TOPIC_PREFERENCES,
  changeTopicPreference: () => {}, clearTopicPreferences: () => {},
});

export const useSettings = () => React.useContext(SettingsContext);

// ============ Hooks ============
// 用 callback ref 模式：每当 <video ref={cam.videoRef}> 挂载/重新挂载（比如 stage 切换），
// React 会调用 attachVideo(el)，自动把 stream 接到当前的视频元素上。
// ===== 美颜 + 滤镜预设 =====
// 没有人脸识别的前提下，纯 CSS filter 做"磨皮"只能用 blur，而 blur 是均匀的
// （眼睛 / 头发都会糊）。所以这套预设的设计思路是：
//   1) blur 控制极轻（0.25 – 0.7 px），主要给观感上一层"柔焦"
//   2) 重头戏放在 brightness / saturate / hue-rotate / sepia 这些**调色**参数
//      上 —— 调出来的肤色变化更接近真正的"美颜"，而不是糊。
// 第一性原理：「让你能看见自己 · 而不是看见你想象中的自己」
// 训练工具不需要 8 种调色 · 砍到 3 套：原图 / 柔光（自然提亮）/ 复古（暖调兜底）
// 砍掉：奶油 / 粉嫩 / 冷白 / 港风 / 黑白 ·
// 这些是「让自己变成另一个样子」的滤镜 · 不是「让你能看着自己讲话」的滤镜
