import { readFileSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const files = [
  'src/app.jsx',
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
