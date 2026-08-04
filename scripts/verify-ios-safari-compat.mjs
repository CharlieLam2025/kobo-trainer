import { readFileSync, existsSync } from 'node:fs';
import { resolve, relative } from 'node:path';
import { listSourceFiles, projectRoot } from './read-sources.mjs';

const root = projectRoot;
const files = [
  ...listSourceFiles().map(p => relative(root, p)),
  'bundle.js',
  'index.html',
].filter(file => existsSync(resolve(root, file)));

const unsupportedPatterns = [
  {
    name: 'RegExp lookbehind',
    regex: /\(\?<([=!])/g,
    reason: 'iOS Safari before 16.4 fails to parse JavaScript bundles that contain regex lookbehind.',
  },
];

const failures = [];

for (const file of files) {
  const source = readFileSync(resolve(root, file), 'utf8');
  for (const pattern of unsupportedPatterns) {
    let match;
    while ((match = pattern.regex.exec(source))) {
      const line = source.slice(0, match.index).split('\n').length;
      failures.push(`${file}:${line} contains ${pattern.name} (${match[0]}): ${pattern.reason}`);
    }
  }
}

if (failures.length) {
  console.error('iOS Safari compatibility check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('iOS Safari compatibility verified.');
