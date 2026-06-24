import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const sw = readFileSync(resolve(root, 'sw.js'), 'utf8');

const checks = [
  {
    ok: /const CACHE = ['"]kobo-trainer-v6['"]/.test(sw),
    message: 'sw.js should bump CACHE to kobo-trainer-v6 so old cached bundles are evicted.',
  },
  {
    ok: sw.includes('NETWORK_FIRST_ASSETS') && sw.includes("'bundle.js'") && sw.includes("'styles.css'"),
    message: 'sw.js should treat bundle.js and styles.css as network-first assets.',
  },
  {
    ok: /NETWORK_FIRST_ASSETS\.has\(url\.pathname\.split\('\/'\)\.pop\(\)\)/.test(sw),
    message: 'sw.js should detect network-first assets by request pathname.',
  },
];

const failures = checks.filter(check => !check.ok).map(check => check.message);

if (failures.length) {
  console.error('Service worker update check failed:');
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log('Service worker update strategy verified.');
