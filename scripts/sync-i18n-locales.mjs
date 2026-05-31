/**
 * Sync missing i18n keys from vi.json into en.json and ja.json using supplement patches.
 * Run: node scripts/sync-i18n-locales.mjs
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..', 'FrontEnd', 'client', 'src', 'locales', 'lang', 'common');

function deepMergeMissing(target, source) {
  if (!source || typeof source !== 'object' || Array.isArray(source)) return target;
  for (const key of Object.keys(source)) {
    const sv = source[key];
    if (sv && typeof sv === 'object' && !Array.isArray(sv)) {
      if (!target[key] || typeof target[key] !== 'object') target[key] = {};
      deepMergeMissing(target[key], sv);
    } else if (!(key in target)) {
      target[key] = sv;
    }
  }
  return target;
}

function sortKeys(obj) {
  if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return obj;
  const sorted = {};
  for (const k of Object.keys(obj).sort()) {
    sorted[k] = sortKeys(obj[k]);
  }
  return sorted;
}

const vi = JSON.parse(fs.readFileSync(path.join(root, 'vi.json'), 'utf8'));
let en = JSON.parse(fs.readFileSync(path.join(root, 'en.json'), 'utf8'));
let ja = JSON.parse(fs.readFileSync(path.join(root, 'ja.json'), 'utf8'));

const enSupplement = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'i18n-en-supplement.json'), 'utf8'),
);
const jaSupplement = JSON.parse(
  fs.readFileSync(path.join(__dirname, 'i18n-ja-supplement.json'), 'utf8'),
);

deepMergeMissing(en, enSupplement);
deepMergeMissing(ja, jaSupplement);

// Fill any still-missing en keys from vi (should be none after supplement)
function flat(obj, prefix = '') {
  const r = {};
  for (const [k, v] of Object.entries(obj || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(r, flat(v, key));
    else r[key] = v;
  }
  return r;
}

const enFlat = flat(en);
const viFlat = flat(vi);
const stillMissing = Object.keys(viFlat).filter((k) => !(k in enFlat));
if (stillMissing.length) {
  console.warn(`en still missing ${stillMissing.length} keys (using vi fallback):`);
  stillMissing.slice(0, 20).forEach((k) => console.warn('  ', k));
  for (const key of stillMissing) {
    const parts = key.split('.');
    let t = en;
    let s = vi;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!t[parts[i]]) t[parts[i]] = {};
      t = t[parts[i]];
      s = s[parts[i]];
    }
    t[parts[parts.length - 1]] = s[parts[parts.length - 1]];
  }
}

const jaFlat = flat(ja);
const jaMissing = Object.keys(viFlat).filter((k) => !(k in jaFlat));
if (jaMissing.length) {
  console.warn(`ja still missing ${jaMissing.length} keys (using en then vi fallback)`);
  for (const key of jaMissing) {
    const parts = key.split('.');
    let t = ja;
    let s = en;
    for (let i = 0; i < parts.length - 1; i++) {
      if (!t[parts[i]]) t[parts[i]] = {};
      if (!s[parts[i]]) s = vi;
      else s = s[parts[i]];
      t = t[parts[i]];
    }
    const leaf = parts[parts.length - 1];
    t[leaf] = enFlat[key] ?? viFlat[key];
  }
}

fs.writeFileSync(path.join(root, 'en.json'), JSON.stringify(sortKeys(en), null, 2) + '\n');
fs.writeFileSync(path.join(root, 'ja.json'), JSON.stringify(sortKeys(ja), null, 2) + '\n');
console.log('Synced en.json and ja.json');
