// Turns the official USCIS question list (text from the PDF) into data and drops it into the page.
// usage: node build.mjs <questions.txt> <app.template.html> <out.html> <preview.html>
import fs from 'node:fs';

const [, , src, tpl, out, preview] = process.argv;
const lines = fs.readFileSync(src, 'latin1').split(/\r?\n/);

const MAIN = ['AMERICAN GOVERNMENT', 'AMERICAN HISTORY', 'SYMBOLS AND HOLIDAYS'];
const SHORT = {
  'Principles of American Government': 'Principles of Government',
  'System of Government': 'System of Government',
  'Rights and Responsibilities': 'Rights and Responsibilities',
  'Colonial Period and Independence': 'Colonial Period and Independence',
  '1800s': 'The 1800s',
  'Recent American History and Other Important Historical Information': 'Recent History',
  'Symbols': 'Symbols',
  'Holidays': 'Holidays',
};
const KEYS = { 23: 'senators', 29: 'rep', 30: 'speaker', 38: 'president', 39: 'vp', 57: 'chief', 61: 'governor', 62: 'capital' };
const NEED = { 10: 2, 48: 2, 65: 3, 67: 2, 69: 2, 81: 5, 126: 3 };

let started = false, main = '', subs = [], qs = [], cur = null, last = null;
for (let line of lines) {
  line = line.replace(/uscis\.gov\/citizenship/g, '').replace(/\b\d+ of 19\b/g, '');
  const t = line.trim();
  if (!t) continue;
  if (MAIN.includes(t)) { started = true; main = t; continue; }
  if (!started) continue;
  let m;
  if ((m = t.match(/^([A-C]): (.+)$/))) {
    if (!(m[2] in SHORT)) throw new Error('unknown sub-section: ' + m[2]);
    subs.push({ main, name: m[2], short: SHORT[m[2]] });
    continue;
  }
  if ((m = t.match(/^(\d{1,3})\.\s+(.*)$/))) {
    cur = { n: +m[1], q: m[2], a: [], s: subs.length - 1 };
    qs.push(cur); last = 'q';
    continue;
  }
  if (/^[^\x00-\x7f]/.test(t)) { cur.a.push(t.replace(/^[^\x00-\x7f]+\s*/, '')); last = 'a'; continue; }
  if (/^For a complete list/.test(t)) { cur.note = t; continue; }
  if (last === 'a') cur.a[cur.a.length - 1] += ' ' + t; else cur.q += ' ' + t;
}

const tidy = (s) => s.replace(/\s+/g, ' ').trim();
for (const q of qs) {
  q.q = tidy(q.q);
  if (/\*$/.test(q.q)) { q.star = 1; q.q = tidy(q.q.slice(0, -1)); }
  q.a = q.a.map(tidy);
  if (KEYS[q.n]) { q.key = KEYS[q.n]; q.a = []; }
  if (NEED[q.n]) q.need = NEED[q.n];
}

// checks
const fail = (msg) => { console.error('CHECK FAILED: ' + msg); process.exit(1); };
if (qs.length !== 128) fail('expected 128 questions, got ' + qs.length);
qs.forEach((q, i) => { if (q.n !== i + 1) fail('numbering breaks at ' + q.n); });
if (qs.filter((q) => q.star).length !== 20) fail('expected 20 starred, got ' + qs.filter((q) => q.star).length);
if (subs.length !== 8) fail('expected 8 sub-sections, got ' + subs.length);
for (const q of qs) {
  if (!q.key && q.a.length === 0) fail('no answers for ' + q.n);
  if (!/[?.]$/.test(q.q)) fail('question ' + q.n + ' ends oddly: ' + q.q);
  if (/[^\x00-\x7f]/.test(q.q + q.a.join(''))) fail('non-ASCII text left in ' + q.n);
  if (q.need && q.a.length < q.need) fail('too few answers for ' + q.n);
}

const json = JSON.stringify({ subs, qs }).replace(/</g, '\\u003c');
const page = fs.readFileSync(tpl, 'utf8');
if (!page.includes('__DATA__')) fail('template has no __DATA__ marker');
const built = page.replace('__DATA__', () => json);
fs.writeFileSync(out, built);
if (preview) {
  fs.writeFileSync(preview,
    '<!doctype html><html lang="en"><head><meta charset="utf8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover"><meta name="robots" content="noindex">' +
    '<style>:root{color-scheme:light;padding:env(safe-area-inset-top,0px) 0 env(safe-area-inset-bottom,0px)}body{margin:0;font:14px system-ui}img{max-width:100%}[hidden]{display:none!important}</style></head><body>' +
    built + '</body></html>');
}
console.log(`ok: ${qs.length} questions, ${subs.length} topics, ${qs.filter((q) => q.star).length} starred, ${(built.length / 1024).toFixed(0)} KB`);
console.log(subs.map((s, i) => `${i} ${s.short}: ${qs.filter((q) => q.s === i).length}`).join(' | '));
