// Unlockable show (id041): backgrounds, correct marks, particles, music,
// Dopakichi's costume and colour, the crowd and the finale. Each item is the
// reward of one trophy (never random), so what is unlocked follows from the
// trophies earned; only the player's choice per category is saved.
import { TROPHY } from './trophies.js';

export const CATS = [
  { key: 'bg', name: 'はいけい' },
  { key: 'mark', name: 'せいかいの しるし' },
  { key: 'particle', name: 'かみふぶき' },
  { key: 'tune', name: 'きょく' },
  { key: 'music', name: 'おとの しゅるい' },
  { key: 'costume', name: 'きせかえ' },
  { key: 'color', name: 'ギンの けいろ' },
  { key: 'crowd', name: 'おきゃくさん' },
  { key: 'finale', name: 'フィナーレ' },
];

// base: available from the start. trophy: the trophy whose reward it is.
export const ITEMS = [];
export const ITEM = {};
export function addItems(list) {
  for (const it of list) {
    ITEMS.push(it); ITEM[it.id] = it;
    if (it.trophy && TROPHY[it.trophy]) TROPHY[it.trophy].reward = it.id;
  }
}
addItems([
  { id: 'tune:neko', cat: 'tune', name: 'ねこふんじゃった', base: true },
  { id: 'tune:kira', cat: 'tune', name: 'きらきら星', trophy: 'plays-1' },
  { id: 'tune:kaeru', cat: 'tune', name: 'かえるの がっしょう', trophy: 'combo-10' },
  { id: 'tune:chocho', cat: 'tune', name: 'ちょうちょう', trophy: 'problems-30' },
  { id: 'tune:mary', cat: 'tune', name: 'メリーさんの ひつじ', trophy: 'unlocked-3' },
  { id: 'tune:london', cat: 'tune', name: 'ロンドン橋', trophy: 'rank-1' },
  { id: 'tune:yankee', cat: 'tune', name: 'アルプス一万尺', trophy: 'combo-50' },
  { id: 'tune:camptown', cat: 'tune', name: '草競馬', trophy: 'plays-20' },
  { id: 'tune:saints', cat: 'tune', name: '聖者の行進', trophy: 'rank-3' },
  { id: 'tune:joy', cat: 'tune', name: 'よろこびの うた', trophy: 'fullSong' },
  { id: 'tune:turkey', cat: 'tune', name: 'トルコ行進曲', trophy: 'rank-5' },
  { id: 'bg:classic', cat: 'bg', name: 'ねこまんだら', base: true },
  { id: 'mark:hanamaru', cat: 'mark', name: 'はなまる', base: true },
  { id: 'particle:classic', cat: 'particle', name: 'かみふぶき', base: true },
  { id: 'music:classic', cat: 'music', name: 'マリンバ', base: true },
  { id: 'costume:none', cat: 'costume', name: 'なし', base: true },
  { id: 'color:pink', cat: 'color', name: 'シルバータビー', base: true },
  { id: 'crowd:classic', cat: 'crowd', name: 'ねこの おきゃくさん', base: true },
  { id: 'finale:classic', cat: 'finale', name: 'きょだい ギン', base: true },
]);
// id041: one sample per category, to prove the pipeline end to end.
// Rewards follow effort and coming back (plays, days, streaks, stars earned by
// practice), not the placement check, which can master many skills at once.
addItems([
  { id: 'costume:cap', cat: 'costume', name: 'ぼうし', trophy: 'days-1' },
  { id: 'particle:note', cat: 'particle', name: 'おんぷ', trophy: 'days-3' },
  { id: 'mark:stamp', cat: 'mark', name: 'にくきゅう スタンプ', trophy: 'plays-3' },
  { id: 'bg:night', cat: 'bg', name: 'よぞら', trophy: 'streak-3' },
  { id: 'color:blue', cat: 'color', name: 'ブルー', trophy: 'plays-5' },
  { id: 'finale:fireworks', cat: 'finale', name: 'はなびたいかい', trophy: 'extras-5' },
  { id: 'music:chip', cat: 'music', name: '8ビット', trophy: 'plays-10' },
  { id: 'crowd:costume', cat: 'crowd', name: 'きせかえ おきゃくさん', trophy: 'firstTry-50' },
]);
// id042: backgrounds, correct marks and particles.
addItems([
  { id: 'bg:sea', cat: 'bg', name: 'うみと あわ', trophy: 'problems-100' },
  { id: 'bg:festival', cat: 'bg', name: 'おまつり', trophy: 'days-15' },
  { id: 'bg:paper', cat: 'bg', name: 'はんし と すみ', trophy: 'problems-200' },
  { id: 'bg:space', cat: 'bg', name: 'うちゅう', trophy: 'extras-10' },
  { id: 'mark:medal', cat: 'mark', name: 'メダル', trophy: 'streak-7' },
  { id: 'mark:crown', cat: 'mark', name: 'おうかん', trophy: 'perfects-3' },
  { id: 'mark:ring', cat: 'mark', name: 'はなびの わ', trophy: 'combo-30' },
  { id: 'particle:petal', cat: 'particle', name: 'はなびら', trophy: 'stickers-7' },
  { id: 'particle:digit', cat: 'particle', name: 'かな', trophy: 'cells-1000' },
  { id: 'particle:bubble', cat: 'particle', name: 'あわ', trophy: 'review-10' },
  { id: 'particle:candy', cat: 'particle', name: 'にぼし', trophy: 'extraBest-10' },
  { id: 'particle:matatabi', cat: 'particle', name: 'マタタビ', trophy: 'mata-1' },
  { id: 'particle:jarashi', cat: 'particle', name: 'ねこじゃらし', trophy: 'combo-15' },
  { id: 'particle:paw', cat: 'particle', name: 'にくきゅう', trophy: 'combo-40' },
  { id: 'particle:neko', cat: 'particle', name: 'ねこの かお', trophy: 'plays-30' },
  { id: 'particle:yarn', cat: 'particle', name: 'けいとだま', trophy: 'combo-75' },
]);
// id043: songs (8ビット is the id041 sample).
addItems([
  { id: 'music:matsuri', cat: 'music', name: 'おまつり', trophy: 'streak-5' },
  { id: 'music:brass', cat: 'music', name: 'ブラス', trophy: 'days-5' },
  { id: 'music:electro', cat: 'music', name: 'エレクトロ', trophy: 'extras-3' },
]);
// id044: costumes, colours, crowd and finales (id045 moved three rewards to the new series).
addItems([
  { id: 'costume:hachimaki', cat: 'costume', name: 'はちまき', trophy: 'problems-50' },
  { id: 'costume:cape', cat: 'costume', name: 'マント', trophy: 'combo-20' },
  { id: 'costume:glasses', cat: 'costume', name: 'まるめがね', trophy: 'firstTry-100' },
  { id: 'costume:ribbon', cat: 'costume', name: 'リボン', trophy: 'stickers-14' },
  { id: 'costume:crown', cat: 'costume', name: 'おうかん', trophy: 'streak-14' },
  { id: 'costume:wizard', cat: 'costume', name: 'まほうの ぼうし', trophy: 'star5-1' },
  { id: 'costume:headphones', cat: 'costume', name: 'ヘッドホン', trophy: 'capsules-1' },
  { id: 'color:mint', cat: 'color', name: 'みけ', trophy: 'days-7' },
  { id: 'color:snow', cat: 'color', name: 'ネヴァマスカレード', trophy: 'questDays-7' },
  { id: 'color:yellow', cat: 'color', name: 'ゴールデン', trophy: 'problems-300' },
  { id: 'color:violet', cat: 'color', name: 'サバトラ', trophy: 'extraSolved-100' },
  { id: 'color:gold', cat: 'color', name: 'レッド', trophy: 'streak-30' },
  { id: 'color:rainbow', cat: 'color', name: 'にじいろ', trophy: 'days-100' },
  { id: 'crowd:rainbow', cat: 'crowd', name: 'にじいろ おきゃくさん', trophy: 'days-30' },
  { id: 'crowd:twins', cat: 'crowd', name: 'おそろい おきゃくさん', trophy: 'starsTotal-100' },
  { id: 'finale:parade', cat: 'finale', name: 'ねこの だいこうしん', trophy: 'streak-10' },
  { id: 'finale:rocket', cat: 'finale', name: 'ロケット', trophy: 'extras-20' },
]);

// The secret command (コナミコマンド) opens everything in the collection.
let SECRET = false;
export function setSecret(v) { SECRET = !!v; }
export const isUnlocked = (it, got = {}) => !!(it && (it.base || SECRET || (it.trophy && got[it.trophy])));
export const unlockedIn = (cat, got) => ITEMS.filter((it) => it.cat === cat && isUnlocked(it, got));
export const defaultEquip = () => Object.fromEntries(CATS.map((c) => [c.key, 'auto']));

// The look for one play: fixed choices stay; "auto" picks among the unlocked
// ones so every play can look and sound a little different.
export function pickLook(equip = {}, got = {}, rng = Math.random) {
  const look = {};
  for (const { key } of CATS) {
    const want = equip[key];
    const own = unlockedIn(key, got);
    if (want && want !== 'auto' && own.some((it) => it.id === want)) look[key] = want;
    else look[key] = own[Math.floor(rng() * own.length)].id;
  }
  return look;
}
// The part after "cat:" (what the show modules switch on).
export const variant = (id) => (id ? id.split(':')[1] : 'classic');
