// Kana helpers: the 12-key kana pad and romaji typing on a PC keyboard.

// Gojuon order used to lay out the pad (small kana next to their big form).
const ORDER = 'あぁいぃうぅゔえぇおぉかがきぎくぐけげこごさざしじすずせぜそぞただちぢつっづてでとどなにぬねのはばぱひびぴふぶぷへべぺほぼぽまみむめもやゃゆゅよょらりるれろわゎをん';
const RANK = Object.fromEntries([...ORDER].map((c, i) => [c, i]));
const ROWS = ['あいうえお', 'かきくけこ', 'がぎぐげご', 'さしすせそ', 'ざじずぜぞ', 'たちつてと', 'だぢづでど', 'なにぬねの', 'はひふへほ', 'ばびぶべぼ', 'ぱぴぷぺぽ', 'まみむめも', 'やゆよ', 'らりるれろ', 'わをん'];
const rowOf = {}; const colOf = {};
ROWS.forEach((r, i) => [...r].forEach((c, j) => { rowOf[c] = i; colOf[c] = j; }));
const COLS = [0, 1, 2, 3, 4].map((j) => ROWS.filter((r) => r.length === 5).map((r) => r[j]));
const PAIRS = [['か', 'が'], ['き', 'ぎ'], ['く', 'ぐ'], ['け', 'げ'], ['こ', 'ご'], ['さ', 'ざ'], ['し', 'じ'], ['す', 'ず'], ['せ', 'ぜ'], ['そ', 'ぞ'], ['た', 'だ'], ['ち', 'ぢ'], ['つ', 'づ'], ['て', 'で'], ['と', 'ど'],
  ['は', 'ば'], ['ひ', 'び'], ['ふ', 'ぶ'], ['へ', 'べ'], ['ほ', 'ぼ'], ['は', 'ぱ'], ['ひ', 'ぴ'], ['ふ', 'ぷ'], ['へ', 'ぺ'], ['ほ', 'ぽ'], ['ば', 'ぱ'], ['び', 'ぴ'], ['ぶ', 'ぷ'], ['べ', 'ぺ'], ['ぼ', 'ぽ'],
  ['や', 'ゃ'], ['ゆ', 'ゅ'], ['よ', 'ょ'], ['つ', 'っ'], ['あ', 'ぁ'], ['い', 'ぃ'], ['う', 'ぅ'], ['え', 'ぇ'], ['お', 'ぉ'], ['じ', 'ぢ'], ['ず', 'づ'], ['う', 'お'], ['ゅ', 'ょ'], ['ゃ', 'ょ']];
const NEAR = {};
for (const [a, b] of PAIRS) { (NEAR[a] ||= []).push(b); (NEAR[b] ||= []).push(a); }
const COMMON = [...'いうかきくこしじすせたちつとなにのはまもよらりるれんうゃゅょっがごどぶ'];

export const kataToHira = (s) => s.replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));
export const hiraToKata = (s) => s.replace(/[ぁ-ゖ]/g, (c) => String.fromCharCode(c.charCodeAt(0) + 0x60));

// Characters that may come next, given what is already typed.
export function acceptable(readings, typed) {
  const out = [];
  for (const r of readings) if (r.startsWith(typed) && r.length > typed.length && !out.includes(r[typed.length])) out.push(r[typed.length]);
  return out;
}

// Twelve keys: the right answer(s) plus near misses, in gojuon order.
export function padKeys(accept, extra = [], rng = Math.random, n = 12) {
  const set = new Set(accept);
  const add = (c) => { if (c && set.size < n && RANK[c] !== undefined) set.add(c); };
  for (const a of accept) (NEAR[a] || []).forEach(add);
  extra.forEach(add);
  for (const a of accept) {
    const r = rowOf[a];
    if (r !== undefined) [...ROWS[r]].forEach((c) => { if (rng() < 0.6) add(c); });
    const c = colOf[a];
    if (c !== undefined) COLS[c].forEach((x) => { if (rng() < 0.25) add(x); });
  }
  let guard = 0;
  while (set.size < n && guard++ < 200) add(COMMON[Math.floor(rng() * COMMON.length)]);
  return [...set].sort((a, b) => RANK[a] - RANK[b]);
}

// Six of the keys to keep when hinting (always including the answers).
export function narrowKeys(keys, accept, rng = Math.random) {
  const keep = new Set(accept);
  const rest = keys.filter((k) => !keep.has(k));
  while (keep.size < 6 && rest.length) keep.add(rest.splice(Math.floor(rng() * rest.length), 1)[0]);
  return keep;
}

// ---------------------------------------------------------------- romaji
const R = {};
const put = (k, v) => { R[k] = v; };
const V = { a: 'あ', i: 'い', u: 'う', e: 'え', o: 'お' };
Object.entries(V).forEach(([k, v]) => put(k, v));
const CONS = {
  k: 'かきくけこ', g: 'がぎぐげご', s: 'さしすせそ', z: 'ざじずぜぞ', t: 'たちつてと', d: 'だぢづでど', n: 'なにぬねの', h: 'はひふへほ',
  b: 'ばびぶべぼ', p: 'ぱぴぷぺぽ', m: 'まみむめも', r: 'らりるれろ',
};
for (const [c, row] of Object.entries(CONS)) 'aiueo'.split('').forEach((v, i) => put(c + v, row[i]));
Object.assign(R, { ya: 'や', yu: 'ゆ', yo: 'よ', wa: 'わ', wo: 'を', shi: 'し', chi: 'ち', tsu: 'つ', fu: 'ふ', ji: 'じ', si: 'し', ti: 'ち', tu: 'つ', hu: 'ふ', zi: 'じ', di: 'ぢ', du: 'づ', la: 'ぁ', li: 'ぃ', lu: 'ぅ', le: 'ぇ', lo: 'ぉ', xa: 'ぁ', xi: 'ぃ', xu: 'ぅ', xe: 'ぇ', xo: 'ぉ', lya: 'ゃ', lyu: 'ゅ', lyo: 'ょ', xya: 'ゃ', xyu: 'ゅ', xyo: 'ょ', ltu: 'っ', xtu: 'っ', ltsu: 'っ', xtsu: 'っ', lwa: 'ゎ', xwa: 'ゎ', "n'": 'ん', nn: 'ん', xn: 'ん', '-': 'ー', ye: 'いぇ', wi: 'うぃ', we: 'うぇ', fa: 'ふぁ', fi: 'ふぃ', fe: 'ふぇ', fo: 'ふぉ', va: 'ゔぁ', vu: 'ゔ' });
const YO = { k: 'き', g: 'ぎ', s: 'し', z: 'じ', t: 'ち', d: 'ぢ', n: 'に', h: 'ひ', b: 'び', p: 'ぴ', m: 'み', r: 'り' };
for (const [c, base] of Object.entries(YO)) { put(`${c}ya`, `${base}ゃ`); put(`${c}yu`, `${base}ゅ`); put(`${c}yo`, `${base}ょ`); }
Object.assign(R, { sha: 'しゃ', shu: 'しゅ', sho: 'しょ', she: 'しぇ', cha: 'ちゃ', chu: 'ちゅ', cho: 'ちょ', che: 'ちぇ', cya: 'ちゃ', cyu: 'ちゅ', cyo: 'ちょ', ja: 'じゃ', ju: 'じゅ', jo: 'じょ', je: 'じぇ', jya: 'じゃ', jyu: 'じゅ', jyo: 'じょ', tya: 'ちゃ', tyu: 'ちゅ', tyo: 'ちょ', dya: 'ぢゃ', dyu: 'ぢゅ', dyo: 'ぢょ' });
const PREFIX = new Set();
for (const k of Object.keys(R)) for (let i = 1; i <= k.length; i++) PREFIX.add(k.slice(0, i));
const SOFT_AFTER_N = new Set([...'あいうえおなにぬねのやゆよん']);

// Feed one typed letter. `expect` is the next few expected kana (a string).
// Returns the kana to input now and the pending buffer.
export function romaji(buf, key, expect = '') {
  const k = key.toLowerCase();
  if (!/^[a-z'-]$/.test(k)) return { out: '', buf };
  let b = buf + k;
  let out = '';
  // "n" followed by a consonant other than y is ん.
  if (b.length >= 2 && b[0] === 'n' && !'aiueoyn\''.includes(b[1])) { out += 'ん'; b = b.slice(1); }
  // doubled consonant -> っ
  if (b.length >= 2 && b[0] === b[1] && !'aiueon'.includes(b[0])) { out += 'っ'; b = b.slice(1); }
  if (R[b] && !(b === 'n')) { out += R[b]; b = ''; }
  else if (!PREFIX.has(b)) { b = PREFIX.has(k) ? k : ''; }
  // Expected ん with no vowel/な/や coming: accept a single n at once.
  if (b === 'n' && expect.startsWith('ん') && !SOFT_AFTER_N.has(expect[1] || '')) { out += 'ん'; b = ''; }
  return { out, buf: b };
}
