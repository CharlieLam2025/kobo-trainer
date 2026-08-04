import { readAllSource } from './read-sources.mjs';

const source = readAllSource();

const requiredMarkers = [
  'const RecordingModeChooser',
  '视频录像 · 默认模式',
  '只练声音时再切换',
  'const XHS_HOT_TOPICS',
  '小红书爆款',
  '小红书爆款选题',
  '为什么你越努力越没内容',
  '别再发流水账了',
  '普通人做小红书最容易犯的 3 个错',
];

const missing = requiredMarkers.filter(marker => !source.includes(marker));

const forbiddenMarkers = [
  'return isNewUser; // 新用户：true（纯语音）· 老用户：false（开摄像头）',
  '第一周默认纯语音 · 不用面对镜头里的自己',
];

const leaked = forbiddenMarkers.filter(marker => source.includes(marker));

const chooserUsages = (source.match(/<RecordingModeChooser/g) || []).length;
if (chooserUsages < 2) {
  missing.push('RecordingModeChooser used in quick and full setup flows');
}

const xhsMatch = source.match(/const XHS_HOT_TOPICS = \[([\s\S]*?)\];/);
if (!xhsMatch) {
  missing.push('parsable XHS_HOT_TOPICS array');
} else {
  const topicCount = (xhsMatch[1].match(/`[^`]+`|'[^']+'/g) || []).length;
  if (topicCount < 36) missing.push(`at least 36 XHS topics, found ${topicCount}`);
}

if (missing.length || leaked.length) {
  if (missing.length) console.error(`Missing video/XHS experience markers: ${missing.join(', ')}`);
  if (leaked.length) console.error(`Outdated voice-first markers still present: ${leaked.join(', ')}`);
  process.exit(1);
}

console.log('Video recording defaults and XHS topic experience verified.');
