import test from 'node:test';
import assert from 'node:assert/strict';
import { phrases } from './course.js';
import { vocabulary } from './vocabulary.js';
import { explainPhrase } from './explanations.js';
import { languageLogic, learningPrinciples } from './language-logic.js';

const phrase = vi => ({ vi, zh: '' });
test('所有课程与日常词条的词块保留完整原句，复合词不逐音节硬拆', () => {
  for (const item of [...phrases, ...vocabulary]) {
    const result = explainPhrase(item);
    assert.equal(result.chunks.map(chunk => chunk.text).join(' '), item.vi, item.id);
    assert.equal(result.parts.map(part => part.text).join(' '), item.vi, item.id);
    assert.ok(result.chunks.every(chunk => chunk.gloss && chunk.syllables.length));
  }
  assert.deepEqual(explainPhrase(phrase('Chúng tôi là nhà cung cấp sản phẩm')).chunks.map(item => item.text), ['Chúng tôi', 'là', 'nhà cung cấp', 'sản phẩm']);
  assert.deepEqual(explainPhrase(phrase('Giá bao nhiêu')).chunks.map(item => item.text), ['Giá', 'bao nhiêu']);
});

test('带声调的 gì 识别 gi 声母与共享 i，同时保留 ê 的元音区别', () => {
  for (const text of ['gì', 'Gì', 'gì'.normalize('NFD')]) {
    const sound = explainPhrase(phrase(text)).parts[0].sound;
    assert.equal(sound.onset, 'gi');
    assert.equal(sound.rhyme, 'ì');
    assert.match(sound.cue, /\/z\//);
    assert.match(sound.cue, /同时参与/);
  }
  assert.equal(explainPhrase(phrase('Giá')).parts[0].sound.onset, 'gi');
  assert.equal(explainPhrase(phrase('gặp')).parts[0].sound.onset, 'g');
  assert.equal(explainPhrase(phrase('ghi')).parts[0].sound.onset, 'gh');
  assert.equal(explainPhrase(phrase('ghi')).parts[0].sound.rhyme, 'i');
  assert.equal(explainPhrase(phrase('điện')).parts[0].sound.rhyme, 'iện');
});

test('完成问句、未完成陈述和是否问句的解释不会互相套用', () => {
  assert.equal(languageLogic(phrase('Giá đã bao gồm thuế chưa')).rules[0].id, 'completion-question');
  assert.doesNotMatch(explainPhrase(phrase('Giá đã bao gồm thuế chưa')).logic, /强调事情已经发生/);
  assert.equal(languageLogic(phrase('Tôi chưa hiểu')).rules[0].id, 'not-yet');
  assert.equal(languageLogic(phrase('Anh có khỏe không')).rules[0].id, 'polar');
  assert.equal(languageLogic(phrase('Tôi không ăn cay')).rules[0].id, 'negative');
  assert.equal(languageLogic(phrase('Không sao')).rules[0].id, 'fixed');
  assert.match(languageLogic(phrase('Anh tên là gì')).usage[0].text, /年龄/);
  assert.match(languageLogic(phrase('Chúng tôi làm việc')).usage[0].text, /不包括/);
  assert.match(languageLogic(phrase('Chúng ta làm việc')).usage[0].text, /包括/);
});

test('规律练习包含可区分的答案、解释和参考依据', () => {
  assert.equal(learningPrinciples.length, 8);
  assert.equal(new Set(learningPrinciples.map(item => item.id)).size, 8);
  for (const item of learningPrinciples) {
    assert.ok(item.choices[item.answer] && item.feedback && item.source.url);
    assert.equal(new Set(item.choices).size, 2);
  }
});
