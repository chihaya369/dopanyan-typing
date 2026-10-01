// ドパにゃん！ 脳汁タイピング: romaji and flick judging, the skill pools and problems.
import DATA from '../data/typing.js';

// ---------------------------------------------------------------- romaji table
const S1 = {
  あ: 'a', い: 'i yi', う: 'u wu whu', え: 'e', お: 'o',
  か: 'ka ca', き: 'ki', く: 'ku cu qu', け: 'ke', こ: 'ko co',
  さ: 'sa', し: 'si shi ci', す: 'su', せ: 'se ce', そ: 'so',
  た: 'ta', ち: 'ti chi', つ: 'tu tsu', て: 'te', と: 'to',
  な: 'na', に: 'ni', ぬ: 'nu', ね: 'ne', の: 'no',
  は: 'ha', ひ: 'hi', ふ: 'hu fu', へ: 'he', ほ: 'ho',
  ま: 'ma', み: 'mi', む: 'mu', め: 'me', も: 'mo',
  や: 'ya', ゆ: 'yu', よ: 'yo',
  ら: 'ra', り: 'ri', る: 'ru', れ: 're', ろ: 'ro',
  わ: 'wa', を: 'wo', ゔ: 'vu',
  が: 'ga', ぎ: 'gi', ぐ: 'gu', げ: 'ge', ご: 'go',
  ざ: 'za', じ: 'zi ji', ず: 'zu', ぜ: 'ze', ぞ: 'zo',
  だ: 'da', ぢ: 'di', づ: 'du', で: 'de', ど: 'do',
  ば: 'ba', び: 'bi', ぶ: 'bu', べ: 'be', ぼ: 'bo',
  ぱ: 'pa', ぴ: 'pi', ぷ: 'pu', ぺ: 'pe', ぽ: 'po',
  ぁ: 'la xa', ぃ: 'li xi', ぅ: 'lu xu', ぇ: 'le xe', ぉ: 'lo xo',
  ゃ: 'lya xya', ゅ: 'lyu xyu', ょ: 'lyo xyo', っ: 'ltu xtu ltsu xtsu', ゎ: 'lwa xwa',
  ー: '-', '、': ',', '。': '.', '！': '!', '？': '?',
};
const SINGLE = Object.fromEntries(Object.entries(S1).map(([k, v]) => [k, v.split(' ')]));
const PAIR = {};
const YO = { き: 'ky', ぎ: 'gy', し: 'sy sh', じ: 'j jy zy', ち: 'ty ch cy', ぢ: 'dy', に: 'ny', ひ: 'hy', び: 'by', ぴ: 'py', み: 'my', り: 'ry' };
for (const [k, heads] of Object.entries(YO)) {
  for (const [sm, v] of [['ゃ', 'a'], ['ゅ', 'u'], ['ょ', 'o']]) PAIR[k + sm] = heads.split(' ').map((h) => h + v);
  PAIR[`${k}ぇ`] = heads.split(' ').map((h) => `${h}e`);
}
Object.assign(PAIR, { ふぁ: ['fa'], ふぃ: ['fi'], ふぇ: ['fe'], ふぉ: ['fo'], てぃ: ['thi'], でぃ: ['dhi'], うぃ: ['wi'], うぇ: ['we'], しぇ: ['she', 'sye'], ちぇ: ['che', 'tye', 'cye'], じぇ: ['je', 'jye', 'zye'] });
const SOFT_N = new Set([...'あいうえおなにぬねのやゆよん']);
const VOWEL = new Set([...'aeiou']);

// Options for the chunk starting at i: [{ rom, len }]
export function chunkOpts(y, i) {
  const out = [];
  const c = y[i];
  if (c === undefined) return out;
  const two = y.slice(i, i + 2);
  if (PAIR[two]) PAIR[two].forEach((rom) => out.push({ rom, len: 2 }));
  if (c === 'ん') {
    ['nn', 'xn', "n'"].forEach((rom) => out.push({ rom, len: 1 }));
    const next = y[i + 1];
    if (next === undefined || !SOFT_N.has(next)) out.push({ rom: 'n', len: 1, single: true });
    return out;
  }
  if (c === 'っ') {
    const seen = new Set();
    for (const o of chunkOpts(y, i + 1)) {
      const h = o.rom[0];
      if (!VOWEL.has(h) && h !== 'n' && /[a-z]/.test(h) && !seen.has(h)) { seen.add(h); out.push({ rom: h, len: 1, dbl: true }); }
    }
  }
  (SINGLE[c] || [c]).forEach((rom) => out.push({ rom, len: 1 }));
  return out;
}

// Preferred spelling (learned per chunk); defaults to the shortest.
let prefs = {};
export function setPrefs(p) { prefs = p || {}; }
export const getPrefs = () => prefs;
function pick(y, i, opts) {
  const key = y.slice(i, i + (opts[0] ? opts[0].len : 1));
  const byLen = (a, b) => a.rom.length - b.rom.length;
  const lens = [...new Set(opts.map((o) => o.len))].sort((a, b) => b - a);
  // prefer the two-kana chunk (きゃ = kya) when it exists
  const group = opts.filter((o) => o.len === lens[0]);
  const pref = prefs[y.slice(i, i + lens[0])];
  const hit = pref && group.find((o) => o.rom === pref);
  if (hit) return hit;
  if (y[i] === 'ん' && y[i + 1] === undefined) return group.find((o) => o.rom === 'nn');
  if (y[i] === 'っ') return group.find((o) => o.dbl) || group.sort(byLen)[0];
  void key;
  return group.slice().sort(byLen)[0];
}

// Full guide text from position i, honouring the partly typed buffer.
export function guideFrom(y, i, buf = '') {
  let s = ''; let j = i; let first = true;
  while (j < y.length) {
    let opts = chunkOpts(y, j);
    if (first && buf) opts = opts.filter((o) => o.rom.startsWith(buf));
    const o = pick(y, j, opts) || opts[0];
    if (!o) break;
    s += first && buf ? o.rom.slice(buf.length) : o.rom;
    j += o.len; first = false;
  }
  return s;
}

// Romaji judge. state: { i, buf, extraN }. Returns 'hit' | 'done' | 'miss' | 'skip'.
export function romaFeed(y, st, ch) {
  const c = ch.toLowerCase();
  if (st.extraN && c === 'n') {
    st.extraN = false;
    const nx = chunkOpts(y, st.i);
    if (!nx.some((o) => o.rom.startsWith('n'))) return 'skip';
  }
  st.extraN = false;
  const opts = chunkOpts(y, st.i);
  const buf = st.buf + c;
  const m = opts.filter((o) => o.rom.startsWith(buf));
  if (!m.length) return 'miss';
  const exact = m.find((o) => o.rom === buf);
  const longer = m.some((o) => o.rom.length > buf.length);
  if (exact && (!longer || exact.single)) {
    const key = y.slice(st.i, st.i + exact.len);
    if (!exact.dbl) prefs[key] = exact.rom;
    st.i += exact.len; st.buf = '';
    if (exact.single) st.extraN = true;
    return st.i >= y.length ? 'done' : 'hit';
  }
  st.buf = buf;
  return 'hit';
}
export const nextLetters = (y, st) => [...new Set(chunkOpts(y, st.i).filter((o) => o.rom.startsWith(st.buf)).map((o) => o.rom[st.buf.length]).filter(Boolean))];

// ---------------------------------------------------------------- flick
export const FLICK = [
  { k: 'あ', v: 'あいうえお' }, { k: 'か', v: 'かきくけこ' }, { k: 'さ', v: 'さしすせそ' }, { k: '⌫', fn: 'del' },
  { k: 'た', v: 'たちつてと' }, { k: 'な', v: 'なにぬねの' }, { k: 'は', v: 'はひふへほ' }, { k: '␣', fn: 'none' },
  { k: 'ま', v: 'まみむめも' }, { k: 'や', v: 'や（ゆ）よ' }, { k: 'ら', v: 'らりるれろ' }, { k: '⏎', fn: 'none' },
  { k: '小゛゜', fn: 'mod' }, { k: 'わ', v: 'わをんー　' }, { k: '、。', v: '、。？！　' }, { k: '', fn: 'none' },
];
const CYCLE = {};
const cyc = (list) => list.forEach((c, i) => { CYCLE[c] = list[(i + 1) % list.length]; });
for (const row of ['かが', 'きぎ', 'くぐ', 'けげ', 'こご', 'さざ', 'しじ', 'すず', 'せぜ', 'そぞ', 'ただ', 'ちぢ', 'てで', 'とど']) cyc([...row]);
for (const row of ['はばぱ', 'ひびぴ', 'ふぶぷ', 'へべぺ', 'ほぼぽ', 'つっづ', 'あぁ', 'いぃ', 'うぅゔ', 'えぇ', 'おぉ', 'やゃ', 'ゆゅ', 'よょ', 'わゎ']) cyc([...row]);
const BASE = new Set(FLICK.flatMap((f) => (f.v ? [...f.v] : [])));
export function flickPath(t) {
  if (BASE.has(t)) return { base: t, n: 0 };
  for (const b of BASE) { let c = b; for (let n = 1; n <= 3; n++) { c = CYCLE[c]; if (!c) break; if (c === t) return { base: b, n }; } }
  return { base: t, n: 0 };
}
// state: { i, sub } sub = -1 before the base kana, else modifier presses so far.
export function flickFeed(y, st, x) {
  const t = y[st.i];
  const p = flickPath(t);
  if (x === 'mod') {
    if (st.sub >= 0 && st.sub < p.n) { st.sub += 1; if (st.sub === p.n) { st.i += 1; st.sub = -1; return st.i >= y.length ? 'done' : 'hit'; } return 'hit'; }
    return 'miss';
  }
  if (st.sub >= 0) return 'miss';
  if (x !== p.base) return 'miss';
  if (p.n === 0) { st.i += 1; return st.i >= y.length ? 'done' : 'hit'; }
  st.sub = 0;
  return 'hit';
}
export const flickNext = (y, st) => { const p = flickPath(y[st.i] || ''); return st.sub >= 0 ? 'mod' : p.base; };
export const flickStrokes = (y) => [...y].reduce((a, c) => a + 1 + flickPath(c).n, 0);
export function flickDir(base) { for (const f of FLICK) if (f.v && f.v.includes(base)) return { key: f.k, dir: f.v.indexOf(base) }; return null; }

// ---------------------------------------------------------------- skills
const ROWS = {
  a: 'あいうえお', ka: 'かきくけこ', sa: 'さしすせそ', ta: 'たちつてと', na: 'なにぬねの', ha: 'はひふへほ', ma: 'まみむめも', ya: 'やゆよ', ra: 'らりるれろ', wa: 'わをん',
  ga: 'がぎぐげござじずぜぞ', da: 'だぢづでどばびぶべぼぱぴぷぺぽ', yoon: 'ゃゅょ', tsu: 'っ', bar: 'ー、。',
};
const SEI = Object.values(ROWS).slice(0, 10).join('');
export const LANES = ['せいおん', 'だくおん・こもじ', 'ことば', 'ぶんしょう'];
export const SKILLS_DEF = [
  { id: 'k-a', name: 'あいうえお', grade: 1, lane: 0, req: [], row: 'a' },
  { id: 'k-ka', name: 'か行', grade: 1, lane: 0, req: ['k-a'], row: 'ka' },
  { id: 'k-sa', name: 'さ行', grade: 1, lane: 0, req: ['k-ka'], row: 'sa' },
  { id: 'k-ta', name: 'た行', grade: 1, lane: 0, req: ['k-sa'], row: 'ta' },
  { id: 'k-na', name: 'な行', grade: 1, lane: 0, req: ['k-ta'], row: 'na' },
  { id: 'k-ha', name: 'は行', grade: 1, lane: 0, req: ['k-na'], row: 'ha' },
  { id: 'k-ma', name: 'ま行', grade: 1, lane: 0, req: ['k-ha'], row: 'ma' },
  { id: 'k-ya', name: 'や行', grade: 1, lane: 0, req: ['k-ma'], row: 'ya' },
  { id: 'k-ra', name: 'ら行', grade: 1, lane: 0, req: ['k-ya'], row: 'ra' },
  { id: 'k-wa', name: 'わ・を・ん', grade: 1, lane: 0, req: ['k-ra'], row: 'wa' },
  { id: 'k-ga', name: 'が行・ざ行', grade: 2, lane: 1, req: ['k-ha'], row: 'ga' },
  { id: 'k-da', name: 'だ・ば・ぱ行', grade: 2, lane: 1, req: ['k-ga'], row: 'da' },
  { id: 'k-yoon', name: 'きゃ・しゅ・ちょ', grade: 2, lane: 1, req: ['k-da', 'k-ra'], row: 'yoon' },
  { id: 'k-tsu', name: 'ちいさい っ', grade: 2, lane: 1, req: ['k-yoon'], row: 'tsu' },
  { id: 'k-bar', name: 'ー と 、。', grade: 2, lane: 1, req: ['k-tsu'], row: 'bar' },
  { id: 'w-2', name: 'みじかい ことば', grade: 3, lane: 2, req: ['k-wa'], words: [2, 3] },
  { id: 'w-4', name: 'ことば', grade: 3, lane: 2, req: ['w-2', 'k-da'], words: [4, 5] },
  { id: 'w-6', name: 'ながい ことば', grade: 4, lane: 2, req: ['w-4', 'k-tsu'], words: [6, 9] },
  { id: 's-neko1', name: 'ねこ文', grade: 4, lane: 3, req: ['w-4', 'k-yoon'], sents: ['neko', 0, 13] },
  { id: 's-daily', name: 'にちじょう文', grade: 4, lane: 3, req: ['s-neko1'], sents: ['daily', 0, 99] },
  { id: 's-neko2', name: 'ながい ねこ文', grade: 5, lane: 3, req: ['s-daily', 'w-6', 'k-bar'], sents: ['neko', 14, 99] },
  { id: 's-koto', name: 'ことわざ', grade: 5, lane: 2, req: ['w-6', 's-neko1'], sents: ['kotowaza', 0, 99] },
  { id: 's-yoji', name: '四字熟語', grade: 5, lane: 2, req: ['s-koto'], sents: ['yoji', 0, 99] },
  { id: 's-haiku', name: 'はいく', grade: 5, lane: 2, req: ['s-yoji'], sents: ['haiku', 0, 99] },
  { id: 's-mix', name: 'なんでも ミックス', grade: 6, lane: 3, req: ['s-neko2', 's-haiku'], mix: true },
];
export const COURSE_NAMES = { 1: 'せいおん', 2: 'だくおん', 3: 'ことば', 4: 'みじかい文', 5: 'ながい文', 6: 'ミックス' };
// Cumulative kana allowed at a kana-row skill.
function allowedAt(id) {
  const out = new Set();
  const walk = (sid) => { const s = SKILLS_DEF.find((x) => x.id === sid); if (!s) return; if (s.row) [...ROWS[s.row]].forEach((c) => out.add(c)); s.req.forEach(walk); };
  walk(id);
  return out;
}

// Hand-picked real words for the first rows (kana only, easy to read).
const STARTER = {
  a: ['あい', 'あお', 'いえ', 'うえ', 'おい', 'いう', 'あう', 'おう'],
  ka: ['かき', 'かお', 'いけ', 'こい', 'えき', 'あき', 'いか', 'かい', 'きく', 'こえ', 'おか', 'あかい'],
  sa: ['さか', 'いす', 'すし', 'あさ', 'うし', 'かさ', 'せき', 'そこ', 'しお', 'あせ', 'すいか', 'さけ'],
  ta: ['たこ', 'いた', 'くつ', 'たき', 'つき', 'とけい', 'ちかい', 'した', 'あした', 'たいこ', 'ちかてつ'],
  na: ['なつ', 'ねこ', 'いぬ', 'あな', 'にく', 'なす', 'きのこ', 'おなか', 'ねつ', 'さかな'],
  ha: ['はな', 'ひと', 'ふね', 'へそ', 'ほし', 'はこ', 'ひこうき', 'ふく', 'はしる', 'ほね'],
  ma: ['まめ', 'みみ', 'むし', 'もも', 'まつ', 'あめ', 'うみ', 'くま', 'みかん', 'まくら'],
  ya: ['やま', 'ゆき', 'よる', 'やね', 'ゆめ', 'よこ', 'へや', 'やさい', 'ゆかた'],
  ra: ['りす', 'そら', 'くるま', 'さくら', 'はれ', 'くろ', 'とり', 'はる', 'くすり'],
  wa: ['わに', 'かわ', 'にわ', 'ほん', 'てんき', 'わたし', 'きりん', 'えほん', 'しんぶん'],
  ga: ['がっこう', 'ごま', 'かぎ', 'ぞう', 'かぜ', 'すずめ', 'ぎんが', 'めがね'],
  da: ['だんご', 'ばなな', 'ぶどう', 'でんわ', 'ぼうし', 'えんぴつ', 'ぱんだ', 'ぷりん', 'ぺんぎん'],
  yoon: ['きゃべつ', 'しゃしん', 'ちょうちょ', 'きゅうり', 'りょこう', 'じゃんけん', 'にんぎょう', 'ひゃく'],
  tsu: ['きって', 'らっぱ', 'がっき', 'しっぽ', 'ねっこ', 'まっちゃ', 'きっぷ', 'はっぱ'],
  bar: ['けーき', 'すーぷ', 'かーど', 'ぼーる', 'のーと', 'きーぼーど', 'こーひー', 'はい、そうです。', 'ねこ、にゃー。', 'らーめん'],
};
const pools = {};
const within = (y, set) => [...y].every((c) => set.has(c));
function poolOf(id) {
  if (pools[id]) return pools[id];
  const s = SKILLS_DEF.find((x) => x.id === id);
  let list = [];
  if (s.row) {
    const allow = allowedAt(id);
    const fresh = new Set([...ROWS[s.row]]);
    // Real words only: made of the kana learned so far, using the new row.
    const cand = DATA.words.filter((w) => w.y.length <= 6 && within(w.y, allow) && [...w.y].some((c) => fresh.has(c)));
    const st = (STARTER[s.row] || []).map((y) => ({ t: y, y }));
    list = [...st, ...st, ...cand.slice(0, 200).map((w) => ({ t: w.t, y: w.y }))];
    s.allow = [...allow]; s.fresh = [...fresh];
  } else if (s.words) {
    const [a, b] = s.words;
    list = DATA.words.filter((w) => w.y.length >= a && w.y.length <= b && within(w.y, new Set(SEI + ROWS.ga + ROWS.da + ROWS.yoon + ROWS.tsu + ROWS.bar))).map((w) => ({ t: w.t, y: w.y }));
  } else if (s.sents) {
    const [kind, a, b] = s.sents;
    list = DATA.sents.filter((x) => x.k === kind && x.y.length >= a && x.y.length <= b).map((x) => ({ t: x.t, y: x.y, m: x.m }));
  } else if (s.mix) list = DATA.sents.map((x) => ({ t: x.t, y: x.y, m: x.m }));
  pools[id] = list;
  return list;
}

// Beginner drills: the row itself and pseudo words from the allowed kana.
function drill(s, rng) {
  const fresh = s.fresh; const allow = s.allow;
  const r = rng();
  if (r < 0.25) return { t: fresh.join(''), y: fresh.join('') };
  const n = 2 + Math.floor(rng() * 3);
  let y = '';
  for (let i = 0; i < n; i++) {
    const src = i === 0 || rng() < 0.5 ? fresh : allow;
    let c = src[Math.floor(rng() * src.length)];
    if (c === 'ん' && i === 0) c = fresh[0];
    y += c;
  }
  if (y.startsWith('ー')) y = `あ${y}`;
  return { t: y, y };
}

// weak: kana the player misses most (weighted in).
export function makeProblem(skillId, rng, recent = null, weak = []) {
  const s = SKILLS_DEF.find((x) => x.id === skillId);
  if (!s) throw new Error(`unknown skill ${skillId}`);
  const list = poolOf(skillId);
  let it = null;
  for (let tries = 0; tries < 30; tries++) {
    it = list[Math.floor(rng() * list.length)];
    if (weak.length && tries < 10 && !s.row && rng() < 0.3 && ![...it.y].some((c) => weak.includes(c))) continue;
    if (!recent || !recent.has(`${it.t}|${it.y}`)) break;
  }
  const y = it.y;
  const steps = Array.from({ length: Math.max(1, guideFrom(y, 0).length) }, (_, i) => ({ cell: `c${i}`, digit: '', label: 'タイプ', after: [] }));
  return { kind: 'type', title: s.name, text: it.t, yomi: y, meaning: it.m || '', answer: y, answerText: it.m ? `${it.t}：${it.m}` : it.t, skill: skillId, steps, cells: [], lines: [], rows: 1, cols: 1 };
}
export const signature = (p) => `${p.text}|${p.yomi}`;
export function makeRng(seed) {
  let s = seed >>> 0;
  return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

// ---------------------------------------------------------------- score & rank
export const RANKS = [[0, 'こねこ'], [60, 'のらねこ'], [100, 'いえねこ'], [150, 'ボスねこ'], [200, 'ねこ番長'], [280, 'ねこ仙人'], [360, '化けねこ'], [450, 'ねこ神'], [600, '脳汁ねこ神']];
export const MODE_FACTOR = { roma: 1, flick: 0.8 };
export function noujiruScore(okKeys, allKeys, ms) {
  if (!ms || !allKeys) return 0;
  const perMin = okKeys / (ms / 60000);
  const acc = okKeys / allKeys;
  return Math.floor(perMin * acc * acc);
}
export function rankOf(score, mode = 'roma') {
  const f = MODE_FACTOR[mode] || 1;
  let r = RANKS[0][1]; let i = 0;
  RANKS.forEach(([th, name], k) => { if (score >= th * f) { r = name; i = k; } });
  return { name: r, index: i };
}
