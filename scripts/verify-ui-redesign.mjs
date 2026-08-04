import { readAllSource } from './read-sources.mjs';

const source = readAllSource();

const requiredMarkers = [
  'const SectionHeader',
  'const MetricTile',
  'const ActionPanel',
  '今天的口播训练室',
  '下一条建议',
  'const PracticeStageOverlay',
  'const ReviewHero',
  'const LibraryEmptyState',
];

const missing = requiredMarkers.filter(marker => !source.includes(marker));

if (missing.length) {
  console.error(`Missing UI redesign markers: ${missing.join(', ')}`);
  process.exit(1);
}

console.log('UI redesign markers verified.');
