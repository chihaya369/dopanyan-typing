// Problems for ドパにゃん！ 脳汁タイピング (see typing.js).
import { makeProblem as mk, signature as sig, makeRng as rng } from './typing.js';

export const makeRng = rng;
export const signature = sig;
let weak = () => [];
export function setWeak(fn) { weak = fn; }
export function makeProblem(skillId, r, recent = null) { return mk(skillId, r, recent, weak()); }
export function setZukan() {}
export const typeLabel = () => '';
export const BASIC_SETS = {
  6: ['k-a', 'k-ka', 'w-2', 'w-4', 's-neko1', 's-neko1'],
  10: ['k-a', 'k-ka', 'k-sa', 'w-2', 'w-4', 'w-4', 's-neko1', 's-neko1', 's-daily', 's-neko2'],
  14: ['k-a', 'k-ka', 'k-sa', 'k-ta', 'w-2', 'w-2', 'w-4', 'w-4', 's-neko1', 's-neko1', 's-daily', 's-daily', 's-neko2', 's-neko2'],
};
export const EXTRA_TIERS = [['s-neko1', 'w-4'], ['s-daily', 's-neko1'], ['s-neko2', 's-koto'], ['s-mix', 's-neko2'], ['s-mix', 's-haiku']];
export function generate(template, r) { return makeProblem(template, r); }
