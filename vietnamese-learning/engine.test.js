import test from 'node:test';
import assert from 'node:assert/strict';
import { units, lessons, phrases } from './course.js';
import { vocabulary } from './vocabulary.js';
import { explainPhrase } from './explanations.js';
import { allQuestions, dueReviews, finishAttempt, freshProgress, isCorrect, loadProgress, questionsFor, registerAnswer, saveProgress, unlocked } from './engine.js';

const DAY = 86400000;

test('课程和题目结构完整，四种题型均可判分', () => {
  assert.equal(units.length, 14);
  assert.equal(lessons.length, 42);
  assert.equal(phrases.length, 210);
  assert.equal(vocabulary.length, 96);
  assert.equal(new Set(phrases.map(item => item.id)).size, phrases.length);
  assert.equal(new Set(vocabulary.map(item => item.id)).size, vocabulary.length);
  assert.equal(allQuestions().length, 420);
  for (const lesson of lessons) {
    assert.equal(lesson.phrases.length, 5, lesson.id);
    const questions = questionsFor(lesson);
    assert.equal(questions.length, 10, lesson.id);
    assert.deepEqual(new Set(questions.map(q => q.type)), new Set(['listen', 'meaning', 'order', 'dialogue']));
    for (const phrase of lesson.phrases) {
      assert.ok(phrase.vi.trim() && phrase.zh.trim(), phrase.id);
      assert.ok(phrase.vi.split(/\s+/).length >= 2, phrase.id);
      if (phrase.audio) assert.ok(phrase.audio.url && phrase.audio.source && phrase.audio.author && phrase.audio.license && phrase.audio.accent);
    }
    for (const question of questions) {
      assert.ok(question.options.some(option => option.id === question.answer) || question.type === 'order', question.id);
      assert.ok(isCorrect(question, question.answer), question.id);
      assert.ok(!isCorrect(question, 'incorrect'), question.id);
      if (question.type !== 'order') assert.equal(new Set(question.options.map(option => option.label)).size, question.options.length, question.id);
      else assert.equal(new Set(question.options.map(option => option.id)).size, question.options.length, question.id);
    }
  }
});

test('日期与时间课使用可重复套用的问句，题目释义与新内容一致', () => {
  const lesson = lessons.find(item => item.title === '日期与时间');
  assert.deepEqual(lesson.phrases.slice(0, 3).map(item => [item.vi, item.zh]), [
    ['Hôm nay là thứ mấy', '今天星期几'],
    ['Ngày mai là thứ mấy', '明天星期几'],
    ['Bây giờ là mấy giờ', '现在几点'],
  ]);
  for (const question of questionsFor(lesson)) {
    assert.match(question.explanation, / = /);
    assert.ok(!/今天是星期一|明天是星期二|现在是九点/.test(question.explanation));
  }
  const order = questionsFor(lesson).find(item => item.type === 'order' && item.phrase.vi === 'Bây giờ là mấy giờ');
  assert.ok(order);
  assert.deepEqual([...order.options].sort((a, b) => Number(a.id) - Number(b.id)).map(item => item.label), ['Bây giờ', 'là', 'mấy giờ']);
  // 同字词卡仍按显示内容判分，兼容以前的音节排序与复习题。
  const repeated = { type: 'order', phrase: { vi: 'Bây giờ là mấy giờ' }, options: ['Bây', 'giờ', 'là', 'mấy', 'giờ'].map((label, i) => ({ id: String(i), label })) };
  assert.ok(isCorrect(repeated, '0,4,2,3,1'));
  assert.ok(!isCorrect(repeated, '0,4,3,2,1'));
  const checkout = phrases.find(item => item.vi === 'Mấy giờ trả phòng');
  assert.ok(checkout);
  assert.doesNotMatch(explainPhrase(checkout).logic, /bây giờ/);
});

test('连续达到 80% 可以解锁全部 42 课，星级按最好成绩保留', () => {
  let progress = freshProgress();
  for (const lesson of lessons) {
    assert.ok(unlocked(progress, lesson.id), lesson.id);
    const results = questionsFor(lesson).map((q, index) => ({ id: q.id, correct: index < 8, skipped: false }));
    progress = finishAttempt(progress, lesson.id, results, 1000).progress;
    assert.equal(progress.clears[lesson.id].stars, 1);
  }
  assert.equal(Object.keys(progress.clears).length, 42);
  assert.equal(progress.attemptCount, 42);
  assert.equal(progress.xp, 840);
  const first = lessons[0];
  const perfect = questionsFor(first).map(q => ({ id: q.id, correct: true, skipped: false }));
  progress = finishAttempt(progress, first.id, perfect).progress;
  assert.equal(progress.clears[first.id].stars, 3);
  progress = finishAttempt(progress, first.id, perfect.slice(0, 4).map(item => ({ ...item, correct: false }))).progress;
  assert.equal(progress.clears[first.id].stars, 3);
});

test('音频不可用的听力题跳过后不计分', () => {
  const lesson = lessons[0];
  let scored = 0;
  const results = questionsFor(lesson).map(q => {
    if (q.type === 'listen') return { id: q.id, skipped: true, correct: false };
    return { id: q.id, skipped: false, correct: ++scored <= 6 };
  });
  const { record, progress } = finishAttempt(freshProgress(), lesson.id, results);
  assert.equal(record.total, 7);
  assert.equal(record.skipped, 3);
  assert.equal(record.correct, 6);
  assert.equal(record.stars, 1);
  assert.ok(progress.clears[lesson.id].passed);
});

test('错题次日复习，答对后间隔依次为 3、7、14 天，结束后移除', () => {
  const q = questionsFor(lessons[0])[0];
  let progress = freshProgress();
  const start = Date.UTC(2026, 8, 23);
  progress = registerAnswer(progress, q, false, start).progress;
  assert.deepEqual(dueReviews(progress, start), []);
  assert.deepEqual(dueReviews(progress, start + DAY), [q.id]);
  for (const [stage, days] of [[1, 3], [2, 7], [3, 14]]) {
    const now = progress.reviews[q.id].dueAt;
    progress = registerAnswer(progress, q, true, now).progress;
    assert.equal(progress.reviews[q.id].stage, stage);
    assert.equal(progress.reviews[q.id].dueAt, now + days * DAY);
  }
  progress = registerAnswer(progress, q, true, progress.reviews[q.id].dueAt).progress;
  assert.equal(progress.reviews[q.id], undefined);
  const xp = progress.xp;
  progress = registerAnswer(progress, q, true).progress;
  assert.equal(progress.xp, xp);
});

test('本机存储损坏或不可写时安全回退', () => {
  const bad = { getItem: () => '{oops', setItem: () => { throw new Error('blocked'); } };
  assert.deepEqual(loadProgress(bad), freshProgress());
  assert.equal(saveProgress(freshProgress(), bad), false);
  const store = new Map();
  const storage = { getItem: key => store.get(key) ?? null, setItem: (key, value) => store.set(key, value) };
  const progress = { ...freshProgress(), xp: 120 };
  assert.equal(saveProgress(progress, storage), true);
  assert.equal(loadProgress(storage).xp, 120);
});
