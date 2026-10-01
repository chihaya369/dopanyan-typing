// Unit tests for the typing engine (romaji judging and the problem pools). Run: node --test tests/*.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { romaFeed, guideFrom, makeProblem, makeRng, SKILLS_DEF, noujiruScore, rankOf } from '../app/js/typing.js';

const type = (yomi, keys) => {
  const st = { i: 0, buf: '', extraN: false, sub: -1 };
  let r;
  for (const k of keys) { r = romaFeed(yomi, st, k); if (r === 'miss') return 'miss'; }
  return r === 'done' || (r === 'skip' && st.i >= yomi.length) ? 'done' : `incomplete(${st.i}/${yomi.length})`;
};

test('romaji: alternative spellings are all accepted', () => {
  assert.equal(type('しんぶん', 'shinbun'), 'done');
  assert.equal(type('しんぶん', 'sinbunn'), 'done');
  assert.equal(type('がっこう', 'gakkou'), 'done');
  assert.equal(type('ちゃわん', 'chawan'), 'done');
  assert.equal(type('ちゃわん', 'tyawan'), 'done');
  assert.equal(type('きんようび', "kin'youbi"), 'done');
  assert.equal(type('まっちゃ', 'maccha'), 'done');
  assert.equal(type('ふんじゃった', 'funjatta'), 'done');
  assert.equal(type('ねこ', 'neko'), 'done');
});

test('romaji: wrong keys are misses', () => {
  assert.equal(type('ねこ', 'nako'), 'miss');
});

test('guide text is typeable', () => {
  for (const y of ['がっこう', 'しゅくだい', 'ねこがきーを', 'こんにちは']) assert.equal(type(y, guideFrom(y, 0)), 'done', y);
});

test('every skill produces real, typeable problems', () => {
  const rng = makeRng(7);
  for (const s of SKILLS_DEF) {
    for (let i = 0; i < 25; i++) {
      const p = makeProblem(s.id, rng);
      assert.ok(p.text && p.yomi, s.id);
      assert.equal(type(p.yomi, guideFrom(p.yomi, 0)), 'done', `${s.id}: ${p.text}/${p.yomi}`);
    }
  }
});

test('score and ranks', () => {
  assert.equal(noujiruScore(0, 0, 1000), 0);
  assert.ok(noujiruScore(300, 300, 60000) > noujiruScore(300, 400, 60000));
  assert.equal(rankOf(0).name, 'こねこ');
  assert.equal(rankOf(700).name, '脳汁ねこ神');
});
