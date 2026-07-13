export const EMPTY_TOPIC_PREFERENCES = Object.freeze({
  interestedTopics: [],
  hiddenTopics: [],
  favoriteTopics: [],
  sourceScores: {},
});

const uniqueStrings = (value) => Array.from(new Set(
  (Array.isArray(value) ? value : []).filter(item => typeof item === 'string' && item.trim())
));

export function normalizeTopicPreferences(value) {
  const input = value && typeof value === 'object' ? value : {};
  const sourceScores = {};
  if (input.sourceScores && typeof input.sourceScores === 'object') {
    Object.entries(input.sourceScores).forEach(([key, score]) => {
      const number = Number(score);
      if (key && Number.isFinite(number) && number !== 0) {
        sourceScores[key] = Math.max(-5, Math.min(5, Math.round(number)));
      }
    });
  }
  return {
    interestedTopics: uniqueStrings(input.interestedTopics),
    hiddenTopics: uniqueStrings(input.hiddenTopics),
    favoriteTopics: uniqueStrings(input.favoriteTopics),
    sourceScores,
  };
}

export function updateTopicPreference(value, { topic, sourceKey, action }) {
  const current = normalizeTopicPreferences(value);
  if (!topic || !action) return current;

  const interested = new Set(current.interestedTopics);
  const hidden = new Set(current.hiddenTopics);
  const favorites = new Set(current.favoriteTopics);
  const sourceScores = { ...current.sourceScores };
  const adjustSource = (delta) => {
    if (!sourceKey) return;
    const next = Math.max(-5, Math.min(5, (sourceScores[sourceKey] || 0) + delta));
    if (next === 0) delete sourceScores[sourceKey];
    else sourceScores[sourceKey] = next;
  };

  if (action === 'interested') {
    hidden.delete(topic);
    if (interested.has(topic)) {
      interested.delete(topic);
      adjustSource(-1);
    } else {
      interested.add(topic);
      adjustSource(1);
    }
  } else if (action === 'hide') {
    interested.delete(topic);
    favorites.delete(topic);
    if (!hidden.has(topic)) adjustSource(-1);
    hidden.add(topic);
  } else if (action === 'favorite') {
    hidden.delete(topic);
    if (favorites.has(topic)) favorites.delete(topic);
    else favorites.add(topic);
  }

  return normalizeTopicPreferences({
    interestedTopics: [...interested],
    hiddenTopics: [...hidden],
    favoriteTopics: [...favorites],
    sourceScores,
  });
}

export function buildAdaptiveTopicPool(topics, value, getSourceKey = () => '') {
  const preferences = normalizeTopicPreferences(value);
  const hidden = new Set(preferences.hiddenTopics);
  const interested = new Set(preferences.interestedTopics);
  const favorites = new Set(preferences.favoriteTopics);
  const candidates = uniqueStrings(topics).filter(topic => !hidden.has(topic));
  const fallback = candidates.length ? candidates : uniqueStrings(topics);
  const weighted = [];

  fallback.forEach(topic => {
    const sourceKey = getSourceKey(topic) || '';
    const sourceScore = preferences.sourceScores[sourceKey] || 0;
    let weight = Math.max(1, 3 + sourceScore);
    if (interested.has(topic)) weight += 3;
    if (favorites.has(topic)) weight += 5;
    for (let i = 0; i < weight; i++) weighted.push(topic);
  });

  return weighted;
}
