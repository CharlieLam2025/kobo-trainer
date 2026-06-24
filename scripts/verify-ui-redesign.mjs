import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const source = readFileSync(resolve(root, 'src/app.jsx'), 'utf8');

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
