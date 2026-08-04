import { ISSUES, TOPIC_TYPES } from '../data/topics.jsx';
import { pickRandom } from './utils.jsx';
import { buildAdaptiveTopicPool } from '../topic-preferences.mjs';

export const AI_SOURCE  = '__ai__';

export const ALL_SOURCE = '__all__';

export const FAVORITE_SOURCE = '__favorites__';

// 默认精选池：排除明显泛闲聊 / 泛生活 / 脑洞 / 情感八卦类，保留更贴近用户长期议题的题。
// 被排除的分类仍能手动选择，只是不再进入「精选混合」。

export const DEFAULT_TOPIC_SOURCE_KEYS = [
  '小红书爆款',
  '人生哲学',
  '价值观',
  '社会议题',
  '时代与代际',
  '自我认知',
  '工作与职场',
  '金钱与财富',
];

export const getDefaultTopicSources = () => {
  const sources = {};
  DEFAULT_TOPIC_SOURCE_KEYS.forEach(key => {
    if (TOPIC_TYPES[key]) sources[key] = TOPIC_TYPES[key];
  });
  Object.entries(ISSUES).forEach(([key, value]) => {
    sources[key] = value;
  });
  return sources;
};

// 题库是静态数据 → 合并结果做模块级缓存 · 不必每次抽题/每次 render 重新展开上千条

export let __defaultTopicsPoolCache = null;

export const getDefaultTopicsPool = () => {
  if (!__defaultTopicsPoolCache) {
    const pools = [
      ...DEFAULT_TOPIC_SOURCE_KEYS.map(key => TOPIC_TYPES[key]?.topics || []),
      ...Object.values(ISSUES).map(v => v.topics),
    ];
    __defaultTopicsPoolCache = [].concat(...pools);
  }
  return __defaultTopicsPoolCache;
};

// 全量题库仍保留给手动分类和旧数据兼容。

export let __allTopicsPoolCache = null;

export const getAllTopicsPool = () => {
  if (!__allTopicsPoolCache) {
    const pools = [
      ...Object.values(TOPIC_TYPES).map(v => v.topics),
      ...Object.values(ISSUES).map(v => v.topics),
    ];
    __allTopicsPoolCache = [].concat(...pools);
  }
  return __allTopicsPoolCache;
};

export const TOPIC_SOURCE_BY_VALUE = (() => {
  const index = new Map();
  Object.entries(TOPIC_TYPES).forEach(([key, value]) => {
    (value.topics || []).forEach(topic => { if (!index.has(topic)) index.set(topic, key); });
  });
  Object.entries(ISSUES).forEach(([key, value]) => {
    (value.topics || []).forEach(topic => { if (!index.has(topic)) index.set(topic, key); });
  });
  return index;
})();

export const findTopicSourceKey = (topic) => TOPIC_SOURCE_BY_VALUE.get(topic) || '';

export const pickAdaptiveTopic = (topics, preferences, exclude) => {
  const pool = buildAdaptiveTopicPool(topics, preferences, findTopicSourceKey);
  return pickRandom(pool.length ? pool : topics, exclude);
};
