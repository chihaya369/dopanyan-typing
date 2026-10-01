// Trophies (id036): many small achievements, like the ones in mobile games.
// Each series is one measure with rising steps; every step is a trophy.
// Days and streaks get dense steps; volume series get wide ones so long
// sessions are not pushed too hard (docs/SPEC.md 14.7). Nothing is
// random, conditions are always shown (except a few secrets), and a trophy,
// once earned, is kept.
import { SKILLS, LANES, KANJI_LIST } from './skills.js';
import { RANKS as NEKO_RANKS } from './typing.js';
import { isUnlocked, isMastered, starsOf } from './session.js';

export const CATS = ['つづける', 'たくさん', 'スキル', 'せいちょう', 'エクストラ', 'コンボ', 'せいかく', 'ドパ', 'ふくしゅう', 'がくねん', 'コレクション', 'ひみつ'];

const fmt = (n) => (n >= 10000 && n % 10000 === 0 ? `${n / 10000}万` : n.toLocaleString('ja-JP'));
const DOPA_LABEL = { 2: '100', 3: '1000', 4: '1万', 5: '10万', 6: '100万', 7: '1000万', 8: '1億', 9: '10億' };
const RANKS = ['bronze', 'silver', 'gold', 'rainbow'];
export const RANK_NAME = { bronze: 'どう', silver: 'ぎん', gold: 'きん', rainbow: 'にじ', secret: 'ひみつ' };

// Rank by position in its series: first ~30% bronze, then silver, gold, and the last step rainbow.
function rankAt(i, n) {
  if (n === 1) return 'gold';
  if (i === n - 1) return 'rainbow';
  return RANKS[Math.min(2, Math.floor((i / (n - 1)) * 3.3))];
}

// A series: { key, cat, title, metric, steps, name(v), desc(v) } or explicit items.
const SERIES_DEFS = [
  { key: 'streak', cat: 'つづける', title: 'れんぞくで あそぶ', metric: 'bestStreak', steps: [3, 5, 7, 10, 14, 21, 30, 50, 75, 100, 150, 200, 365], name: (v) => `${v}日 れんぞく`, desc: (v) => `${v}日 つづけて あそぶ` },
  { key: 'days', cat: 'つづける', title: 'あそんだ日', metric: 'days', steps: [1, 3, 5, 7, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300, 365, 500, 730, 1000], name: (v) => `あそんだ日 ${fmt(v)}日`, desc: (v) => `あそんだ日が ぜんぶで ${fmt(v)}日` },
  { key: 'stickers', cat: 'つづける', title: 'ログインシール', metric: 'stickers', steps: [1, 7, 14, 30, 50, 100, 200, 365], name: (v) => `シール ${v}まい`, desc: (v) => `ログインボーナスの シールを ${v}まい あつめる` },
  { key: 'crowns', cat: 'つづける', title: 'おうかんシール', metric: 'crowns', steps: [1, 3, 5, 10, 20, 52], name: (v) => `おうかん ${v}こ`, desc: (v) => `7日めの おうかんシールを ${v}まい あつめる` },
  { key: 'problems', cat: 'たくさん', title: 'といた もんだい', metric: 'problems', steps: [10, 30, 50, 100, 200, 300, 500, 750, 1000, 1500, 2000, 3000, 5000, 7500, 10000, 20000, 30000, 50000, 100000], name: (v) => `${fmt(v)}もん とく`, desc: (v) => `もんだいを ぜんぶで ${fmt(v)}もん とく` },
  { key: 'cells', cat: 'たくさん', title: 'うった キー', metric: 'cells', steps: [100, 500, 1000, 3000, 5000, 10000, 30000, 50000, 100000, 300000], name: (v) => `${fmt(v)}打`, desc: (v) => `ただしく ${fmt(v)}回 うつ` },
  { key: 'plays', cat: 'たくさん', title: 'あそんだ回数', metric: 'plays', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300, 500, 1000, 2000], name: (v) => `${fmt(v)}回 あそぶ`, desc: (v) => `ドリルを ぜんぶで ${fmt(v)}回 さいごまで とく` },
  { key: 'minutes', cat: 'たくさん', title: 'あそんだ時間', metric: 'minutes', steps: [10, 30, 60, 120, 300, 600, 1200, 3000], name: (v) => (v >= 60 ? `あわせて ${v / 60}時間` : `あわせて ${v}ふん`), desc: (v) => `あそんだ時間が ぜんぶで ${v >= 60 ? `${v / 60}時間` : `${v}ふん`}` },
  { key: 'unlocked', cat: 'スキル', title: 'スキル かいほう', metric: 'unlocked', steps: [3, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, SKILLS.length], name: (v) => `かいほう ${v}こ`, desc: (v) => `スキルを ${v}こ かいほうする` },
  { key: 'mastered', cat: 'スキル', title: 'スキル マスター', metric: 'mastered', steps: [1, 3, 5, 10, 15, 20, 30, 40, 50, 60, 70, 80, 90, 100, SKILLS.length], name: (v) => `マスター ${v}こ`, desc: (v) => `スキルを ${v}こ マスターする` },
  { key: 'gradeDone', cat: 'スキル', title: '学年 ぜんぶ マスター', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeDone-${g}`, metric: `gradeDone${g}`, need: 1, name: `${g}年生 ぜんぶ マスター`, desc: `${g}年生の スキルを ぜんぶ マスターする` })) },
  { key: 'laneDone', cat: 'スキル', title: 'なかま ぜんぶ マスター', items: LANES.map((l, i) => ({ id: `laneDone-${i}`, metric: `laneDone${i}`, need: 1, name: `${l} マスター`, desc: `「${l}」の スキルを ぜんぶ マスターする` })) },
  { key: 'extras', cat: 'エクストラ', title: 'エクストラに いく', metric: 'extras', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => `エクストラ ${v}回`, desc: (v) => `エクストラに ${v}回 すすむ` },
  { key: 'extraBest', cat: 'エクストラ', title: 'エクストラ 1回の さいこう', metric: 'extraBest', steps: [3, 5, 7, 10, 12, 15, 18, 20, 23, 25, 30], name: (v) => `1回で ${v}もん`, desc: (v) => `1回の エクストラで ${v}もん とく` },
  { key: 'extraSolved', cat: 'エクストラ', title: 'エクストラで といた', metric: 'extraSolved', steps: [10, 30, 50, 100, 200, 300, 500, 1000, 2000, 3000], name: (v) => `エクストラ ${fmt(v)}もん`, desc: (v) => `エクストラで ぜんぶで ${fmt(v)}もん とく` },
  { key: 'combo', cat: 'コンボ', title: 'コンボ', metric: 'maxCombo', steps: [5, 10, 15, 20, 30, 40, 50, 75, 100, 150, 200, 300], name: (v) => `${v}コンボ`, desc: (v) => `${v}コンボを だす` },
  { key: 'perfects', cat: 'せいかく', title: 'ノーミスで かんそう', metric: 'perfects', steps: [1, 3, 5, 10, 20, 30, 50, 100, 200, 300], name: (v) => `ノーミス ${v}回`, desc: (v) => `初回正解率100%で ${v}回 さいごまで とく` },
  { key: 'firstTry', cat: 'せいかく', title: '初回正解', metric: 'firstTry', steps: [10, 50, 100, 300, 500, 1000, 3000, 5000, 10000, 30000], name: (v) => `初回正解 ${fmt(v)}もん`, desc: (v) => `いっかいで 正解した もんだいが ${fmt(v)}もん` },
  { key: 'mata', cat: 'コンボ', title: 'マタタビモード', metric: 'matatabi', steps: [1, 3, 5, 10, 30, 100], name: (v) => `マタタビ ${v}かい`, desc: (v) => `マタタビモードを ${v}かい はつどうする` },
  { key: 'rank', cat: 'スキル', title: 'ねこ段位', metric: 'bestRank', steps: [1, 2, 3, 4, 5, 6, 7, 8], name: (v) => NEKO_RANKS[v][1], desc: (v) => `ねこ段位「${NEKO_RANKS[v][1]}」に なる` },
  { key: 'song', cat: 'コンボ', title: '1きょく ひききる', items: [{ id: 'fullSong', metric: 'flag:fullSong', need: 1, name: 'ノーミスで 1きょく', desc: 'ねこふんじゃったを 1きょくぶん ミスなしで うつ' }] },
  { key: 'dopa', cat: 'ドパ', title: 'ドパ', metric: 'bestDopaL', steps: [2, 3, 4, 5, 6, 7, 8, 9], name: (v) => `${DOPA_LABEL[v]}ドパ`, desc: (v) => `1回の プレイで ドパ ${DOPA_LABEL[v]}を こえる` },
  { key: 'review', cat: 'ふくしゅう', title: 'ふくしゅう', metric: 'reviewSolved', steps: [1, 5, 10, 30, 50, 100, 200, 300], name: (v) => `ふくしゅう ${v}もん`, desc: (v) => `まちがえた もんだいを ${v}もん やりなおす` },
  ...[1, 2, 3, 4, 5, 6].map((g) => ({ key: `grade${g}`, cat: 'がくねん', title: `${g}ねんせいで あそぶ`, metric: `gradePlays${g}`, steps: [1, 10, 30], name: (v) => `${g}ねんせい ${v}回`, desc: (v) => `「${g}ねんせい」で ${v}回 あそぶ` })),
  { key: 'secret', cat: 'ひみつ', title: 'ひみつ', items: [
    { id: 'secret-perfect14', metric: 'flag:perfect14', need: 1, name: '14もん パーフェクト', desc: '14もんを おしい 0回で とく', secret: true },
    { id: 'secret-extraClean', metric: 'flag:extraClean', need: 1, name: 'エクストラ ノーミス', desc: 'エクストラで 5もん いじょう、おしい 0回', secret: true },
    { id: 'secret-sunday', metric: 'flag:sunday', need: 1, name: 'にちようびの タイピング', desc: 'にちようびに あそぶ', secret: true },
    { id: 'secret-newyear', metric: 'flag:newyear', need: 1, name: 'おしょうがつ ドリル', desc: '1月1日に あそぶ', secret: true },
    { id: 'secret-comeback', metric: 'flag:comeback', need: 1, name: 'おかえり！', desc: '1しゅうかん いじょう あいてから また あそぶ', secret: true },
    { id: 'secret-nekonohi', metric: 'flag:nekonohi', need: 1, name: 'ねこの日', desc: '2月22日に あそぶ', secret: true },
    { id: 'secret-allmodes', metric: 'allModes', need: 1, name: 'ぜんぶの あそびかた', desc: 'じぶんレベル・学年べつ・れんしゅう・ふくしゅうを ぜんぶ あそぶ', secret: true },
  ] },
];

// Other features add their own series (id045). Keep this list append-only.
export const SERIES = [];
export const TROPHIES = [];
export const TROPHY = {};
export function addSeries(def) {
  const items = def.items
    ? def.items.map((it, i, a) => ({ rank: it.secret ? 'secret' : rankAt(i, a.length), ...it }))
    : def.steps.map((v, i, a) => ({ id: `${def.key}-${v}`, metric: def.metric, need: v, name: def.name(v), desc: def.desc(v), rank: rankAt(i, a.length) }));
  const series = { key: def.key, cat: def.cat, title: def.title, items: items.map((it) => ({ ...it, series: def.key, cat: def.cat, reward: it.reward || null })) };
  SERIES.push(series);
  for (const it of series.items) { TROPHIES.push(it); TROPHY[it.id] = it; }
  return series;
}
SERIES_DEFS.forEach(addSeries);

// id045: the features added after id036 (stars, quests, hammer, rust,
// time capsule, "のびたよ", collection).
[
  { key: 'questDays', cat: 'つづける', title: 'クエスト コンプリート', metric: 'questDays', steps: [1, 3, 7, 14, 30, 50, 100, 200, 365], name: (v) => `コンプリート ${v}日`, desc: (v) => `きょうの クエストを ぜんぶ クリアした日が ${v}日` },
  { key: 'questRun', cat: 'つづける', title: 'クエスト れんぞく', metric: 'questRun', steps: [2, 3, 5, 7, 14, 30], name: (v) => `クエスト ${v}日 れんぞく`, desc: (v) => `${v}日 つづけて クエストを ぜんぶ クリアする` },
  { key: 'hammer', cat: 'つづける', title: 'ノーカンハンマー', metric: 'hammerUsed', steps: [1, 3, 10], name: (v) => (v === 1 ? 'はじめての ノーカン' : `ノーカン ${v}回`), desc: (v) => `ノーカンハンマーを ${v}回 つかう` },
  { key: 'starsTotal', cat: 'スキル', title: 'ほしの かず', metric: 'starsTotal', steps: [5, 10, 25, 50, 100, 150, 200, 300, 400, SKILLS.length * 5], name: (v) => `ほし ${v}こ`, desc: (v) => `スキルの ほしを ぜんぶで ${v}こ あつめる` },
  { key: 'star5', cat: 'スキル', title: '☆5の スキル', metric: 'star5', steps: [1, 3, 5, 10, 20, 30, 50, SKILLS.length], name: (v) => `☆5 ${v}こ`, desc: (v) => `☆5の スキルを ${v}こ つくる` },
  { key: 'gradeStar3', cat: 'スキル', title: '学年 ぜんぶ ☆3', items: [1, 2, 3, 4, 5, 6].map((g) => ({ id: `gradeStar3-${g}`, metric: `gradeStar3${g}`, need: 1, name: `${g}年生 ぜんぶ ☆3`, desc: `${g}年生の スキルを ぜんぶ ☆3 いじょうに する` })) },
  { key: 'polished', cat: 'せいちょう', title: 'さびを みがく', metric: 'polished', steps: [1, 3, 5, 10, 30, 50], name: (v) => `ピカピカ ${v}回`, desc: (v) => `さびた スキルを ${v}回 みがく` },
  { key: 'capsules', cat: 'せいちょう', title: 'タイムカプセル', metric: 'capsules', steps: [1, 3, 5, 10, 30], name: (v) => `カプセル ${v}こ`, desc: (v) => `タイムカプセルを ${v}こ あける` },
  { key: 'capsuleFaster', cat: 'せいちょう', title: 'あの日より はやい', metric: 'capsuleFaster', steps: [1, 5, 10], name: (v) => `あの日より はやく ${v}回`, desc: (v) => `タイムカプセルで あの日より はやく とく（${v}回）` },
  { key: 'grew', cat: 'せいちょう', title: 'のびたよ！', metric: 'grew', steps: [1, 5, 10, 30, 50, 100], name: (v) => `のびた ${v}回`, desc: (v) => `けっかで「のびたよ！」が ${v}回 でる` },
  { key: 'items', cat: 'コレクション', title: 'コレクション', metric: 'itemsOwned', steps: [10, 20, 30, 40, 47], name: (v) => `コレクション ${v}こ`, desc: (v) => `コレクションを ${v}こ あつめる` },
  { key: 'catComplete', cat: 'コレクション', title: 'ぜんぶ そろえた', metric: 'catComplete', steps: [1, 3, 5, 8], name: (v) => `${v}しゅるい コンプリート`, desc: (v) => `コレクションの ${v}しゅるいを ぜんぶ そろえる` },
].forEach(addSeries);

// Numbers every trophy is measured against, from the saved state.
// snap: { stats, prog, bestStreak, stickers, crowns, ...extra metrics }
export function trophyMetrics(snap) {
  const s = snap.stats || {};
  const prog = snap.prog || { skills: {} };
  const m = {
    bestStreak: snap.bestStreak || 0, days: s.days || 0, stickers: snap.stickers || 0, crowns: snap.crowns || 0,
    problems: s.problems || 0, cells: s.cells || 0, plays: s.plays || 0, minutes: Math.floor((s.playMs || 0) / 60000),
    unlocked: SKILLS.filter((x) => isUnlocked(prog, x.id)).length, mastered: SKILLS.filter((x) => isMastered(prog, x.id)).length,
    extras: s.extras || 0, extraBest: s.extraBest || 0, extraSolved: s.extraSolved || 0, maxCombo: s.maxCombo || 0,
    perfects: s.perfects || 0, firstTry: s.firstTry || 0, bestDopaL: Math.floor((s.bestDopaL || 0) + 1e-9), reviewSolved: s.reviewSolved || 0,
  };
  const stars = Object.fromEntries(SKILLS.map((x) => [x.id, starsOf(prog, x.id)]));
  m.starsTotal = Object.values(stars).reduce((a, b) => a + b, 0);
  m.star5 = Object.values(stars).filter((n) => n >= 5).length;
  m.bestRank = s.bestRank || 0;
  m.matatabi = s.matatabi || 0;
  m.polished = s.polished || 0; m.capsules = s.capsules || 0; m.capsuleFaster = s.capsuleFaster || 0; m.grew = s.grew || 0;
  for (let g = 1; g <= 6; g++) {
    m[`gradeStar3${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => stars[x.id] >= 3) ? 1 : 0;
    m[`gradeDone${g}`] = SKILLS.filter((x) => x.grade === g).every((x) => isMastered(prog, x.id)) ? 1 : 0;
    m[`gradePlays${g}`] = (s.grades || {})[g] || 0;
  }
  const z = prog.zukan || {};
    LANES.forEach((_, i) => { m[`laneDone${i}`] = SKILLS.filter((x) => x.lane === i).every((x) => isMastered(prog, x.id)) ? 1 : 0; });
  for (const [k, v] of Object.entries(s.flags || {})) if (v) m[`flag:${k}`] = 1;
  const modes = s.modes || {};
  m.allModes = ['level', 'grade', 'practice', 'review'].every((k) => modes[k]) ? 1 : 0;
  Object.assign(m, snap.extra || {});
  return m;
}
export const valueOf = (m, metric) => m[metric] || 0;

// Earn every trophy whose condition is met. Returns the new ones (in list order).
// `state` is the saved { got: { id: time } }; the first call earns what the
// existing records already reach and marks them as a batch.
export function evaluate(state, metrics, at = Date.now()) {
  state.got = state.got || {};
  const fresh = [];
  for (const t of TROPHIES) {
    if (state.got[t.id]) continue;
    if (valueOf(metrics, t.metric) >= t.need) { state.got[t.id] = at; fresh.push(t); }
  }
  if (!state.init) { state.init = true; state.batch = fresh.map((t) => t.id); return []; }
  return fresh;
}

export const earnedCount = (state) => TROPHIES.filter((t) => state.got && state.got[t.id]).length;

// Progress of one series for the list screen.
export function seriesView(series, state, metrics) {
  const got = series.items.filter((t) => state.got && state.got[t.id]);
  const next = series.items.find((t) => !(state.got && state.got[t.id]));
  const top = got[got.length - 1] || null;
  return { series, got, next, top, value: next ? valueOf(metrics, next.metric) : null };
}
