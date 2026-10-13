import test from 'node:test';
import assert from 'node:assert/strict';
import { getWordHistory } from './word-history.js';

test('词源按当前词组判断，同形或拆开的音节不误标为汉越词', () => {
  assert.equal(getWordHistory('Giá', 'Giá bao nhiêu').han, '價');
  assert.equal(getWordHistory('bao', 'Giá bao nhiêu').kind, '此义项非汉越词');
  assert.equal(getWordHistory('nhiêu', 'Giá bao nhiêu').kind, '需按词组判断');
  assert.equal(getWordHistory('phẩm', 'sản phẩm').headword, 'sản phẩm');
  assert.equal(getWordHistory('xin', 'Xin chào').verified, false);
});
