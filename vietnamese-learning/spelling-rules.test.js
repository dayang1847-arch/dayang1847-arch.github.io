import test from 'node:test';
import assert from 'node:assert/strict';
import { getSpellingRule } from './spelling-rules.js';

test('北部 gi 与 g/gh 的规则分别解释，不按英语字母猜读音', () => {
  assert.equal(getSpellingRule('gi').sound, '/z/');
  assert.equal(getSpellingRule('g').sound, '/ɣ/');
  assert.equal(getSpellingRule('gh').sound, '/ɣ/');
  assert.match(getSpellingRule('gi').why, /一组声母/);
  assert.equal(getSpellingRule('unknown'), null);
});
