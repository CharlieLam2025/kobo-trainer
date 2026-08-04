import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import {
  buildAdaptiveTopicPool,
  normalizeTopicPreferences,
  updateTopicPreference,
} from '../src/topic-preferences.mjs';

const root = resolve(import.meta.dirname, '..');

const normalized = normalizeTopicPreferences({
  interestedTopics: ['A', 'A', null],
  sourceScores: { work: 99, bad: 'x' },
});
assert.deepEqual(normalized.interestedTopics, ['A']);
assert.equal(normalized.sourceScores.work, 5);
assert.equal(normalized.sourceScores.bad, undefined);

const hidden = updateTopicPreference({}, { topic: 'B', sourceKey: 'life', action: 'hide' });
assert.deepEqual(hidden.hiddenTopics, ['B']);
assert.equal(hidden.sourceScores.life, -1);

const interested = updateTopicPreference({}, { topic: 'A', sourceKey: 'work', action: 'interested' });
const pool = buildAdaptiveTopicPool(['A', 'B'], interested, topic => topic === 'A' ? 'work' : 'life');
assert.ok(pool.filter(topic => topic === 'A').length > pool.filter(topic => topic === 'B').length);
assert.ok(!buildAdaptiveTopicPool(['A', 'B'], hidden).includes('B'));

const { readAllSource } = await import('./read-sources.mjs');
const app = readAllSource();
for (const marker of [
  'TopicPreferenceControls',
  '我的收藏',
  '同题二刷',
  '下一遍只改这一件事',
  'buildNextTakeFocus',
  'data-testid="recording-stop"',
]) {
  assert.ok(app.includes(marker), `src missing personalized practice marker: ${marker}`);
}

console.log('Personalized topic and second-take experience verified.');
