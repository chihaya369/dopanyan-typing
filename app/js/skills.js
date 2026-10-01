// Skill tree for ドパにゃん！ 脳汁タイピング (defined in typing.js).
import { SKILLS_DEF, LANES as L } from './typing.js';

export const LANES = L;
export const MASTERY = { window: 6, need: 5 };
export const SKILLS = SKILLS_DEF.map((s) => ({ id: s.id, name: s.name, grade: s.grade, lane: s.lane, req: s.req, gen: ['type', {}] }));
export const SKILL = Object.fromEntries(SKILLS.map((s) => [s.id, s]));
export const DEPTH = (() => {
  const memo = {};
  const d = (id) => memo[id] ?? (memo[id] = SKILL[id].req.length ? 1 + Math.max(...SKILL[id].req.map(d)) : 0);
  for (const s of SKILLS) d(s.id);
  return memo;
})();
export const skillsOfGrade = (g) => SKILLS.filter((s) => s.grade === g);
// The kanji edition's zukan is not used here.
export const KANJI = {};
export const KANJI_LIST = [];
export const KANJI_COUNT = 0;
