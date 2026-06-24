import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/app.jsx'), 'utf8');

const requiredMarkers = [
  'const DEFAULT_TOPIC_SOURCE_KEYS',
  'const getDefaultTopicSources',
  'const getDefaultTopicsPool',
  '精选混合',
  '已排除泛情感、闲聊、脑洞、生活问答',
  '更贴近你的长期议题',
];

const forbiddenMarkers = [
  '所有 17 个类别的题目混在一起抽',
  '17 类全部混在一起抽',
  'setTopic(pickRandom(getAllTopicsPool()',
  'source === ALL_SOURCE) pool = getAllTopicsPool();',
  'const pool = [].concat(...Object.values(TOPIC_TYPES).map(v => v.topics));',
];

const missing = requiredMarkers.filter(marker => !source.includes(marker));
const leaked = forbiddenMarkers.filter(marker => source.includes(marker));

const curatedMatch = source.match(/const DEFAULT_TOPIC_SOURCE_KEYS = \[([\s\S]*?)\];/);
if (!curatedMatch) {
  missing.push('parsable DEFAULT_TOPIC_SOURCE_KEYS array');
} else {
  const keys = (curatedMatch[1].match(/'([^']+)'/g) || []).map(item => item.slice(1, -1));
  const mustHave = ['小红书爆款', '人生哲学', '价值观', '社会议题', '时代与代际', '自我认知', '工作与职场', '金钱与财富'];
  const banned = ['爱情与婚恋', '家庭关系', '友情与社交', '假设与思想实验', '生活方式', '奇葩说', '脑洞', '文化与审美', '焦虑与情绪', '道德困境'];
  const missingKeys = mustHave.filter(key => !keys.includes(key));
  const bannedKeys = banned.filter(key => keys.includes(key));
  if (missingKeys.length) missing.push(`curated source keys: ${missingKeys.join(', ')}`);
  if (bannedKeys.length) leaked.push(`banned curated source keys: ${bannedKeys.join(', ')}`);
}

if (missing.length || leaked.length) {
  if (missing.length) console.error(`Missing topic curation markers: ${missing.join(', ')}`);
  if (leaked.length) console.error(`Uncurated topic pool markers still present: ${leaked.join(', ')}`);
  process.exit(1);
}

console.log('Topic curation verified.');
