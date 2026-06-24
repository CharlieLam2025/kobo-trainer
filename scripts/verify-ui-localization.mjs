import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/app.jsx'), 'utf8');

const requiredChinese = [
  '今天的口播训练室',
  '下一条建议',
  '开始练习',
  '换个题目',
  '练习设置',
  '高级选项',
  '本地素材库',
  '复盘报告',
  '短视频口播练习器',
  '停止录制',
  '总时长',
  '同题复练',
  '速练入口',
  'DeepSeek 密钥',
  '重启应用',
  '项目反馈页',
];

const forbiddenEnglish = [
  'Today speaking studio',
  'Recommended next',
  'Start drill',
  'Change topic',
  'Freestyle',
  'Script workspace',
  'Practice setup',
  'Advanced options',
  'Session report',
  'Practice again',
  'New topic',
  'No practice assets yet',
  'Start first drill',
  'Recent practice',
  'Random topic practice',
  'Make copy sound natural',
  'Answer follow-up pressure',
  'Practice with structure',
  'Saved locally on this device.',
  'Complete one drill to start your archive.',
  'No recordings yet.',
  'Stop recording',
  'SAME TOPIC',
  'Kobo Trainer',
  'made by',
  'DeepSeek API Key',
  'REC · 一键开练',
  'HABIT ANCHOR',
  'SCORE',
  'NEW!',
  'GitHub Issues',
  '重启 App',
  'App 某个组件出错',
];

const missing = requiredChinese.filter(text => !source.includes(text));
const leaked = forbiddenEnglish.filter(text => source.includes(text));

if (missing.length || leaked.length) {
  if (missing.length) console.error(`Missing Chinese UI copy: ${missing.join(', ')}`);
  if (leaked.length) console.error(`Leaked English UI copy: ${leaked.join(', ')}`);
  process.exit(1);
}

console.log('Chinese UI localization verified.');
