import { COURSE_VERSION, lessons } from './course.js';

export const STORAGE_KEY = 'vietnamese-quest-progress-v1';
const DAY = 86400000;

export function freshProgress() {
  return { schema: 1, courseVersion: COURSE_VERSION, xp: 0, attemptCount: 0, earned: [], clears: {}, reviews: {}, history: [] };
}

export function loadProgress(storage = globalThis.localStorage) {
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (!raw) return freshProgress();
    const parsed = JSON.parse(raw);
    if (parsed?.schema !== 1 || typeof parsed.xp !== 'number') return freshProgress();
    return { ...freshProgress(), ...parsed, attemptCount: Number.isInteger(parsed.attemptCount) ? parsed.attemptCount : (Array.isArray(parsed.history) ? parsed.history.length : 0), earned: Array.isArray(parsed.earned) ? parsed.earned : [], clears: parsed.clears && typeof parsed.clears === 'object' ? parsed.clears : {}, reviews: parsed.reviews && typeof parsed.reviews === 'object' ? parsed.reviews : {}, history: Array.isArray(parsed.history) ? parsed.history : [] };
  } catch { return freshProgress(); }
}

export function saveProgress(progress, storage = globalThis.localStorage) {
  try { storage.setItem(STORAGE_KEY, JSON.stringify(progress)); return true; }
  catch { return false; }
}

function hash(value) {
  let h = 2166136261;
  for (const char of value) { h ^= char.codePointAt(0); h = Math.imul(h, 16777619); }
  return h >>> 0;
}

function stableShuffle(items, seed) {
  const result = [...items];
  let value = hash(seed);
  for (let i = result.length - 1; i > 0; i--) {
    value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
    const j = value % (i + 1);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export function questionsFor(lesson) {
  const first = lesson.phrases.map((phrase, index) => {
    const listening = index % 2 === 0;
    return {
      id: `${phrase.id}-a`, phraseId: phrase.id, lessonId: lesson.id,
      type: listening ? 'listen' : 'meaning', phrase,
      prompt: listening ? '听发音，选出正确的中文意思' : `“${phrase.vi}”是什么意思？`,
      options: stableShuffle(lesson.phrases.map(p => ({ id: p.id, label: p.zh })), phrase.id + '-zh'),
      answer: phrase.id,
      explanation: `${phrase.vi} = ${phrase.zh}`,
    };
  });
  const second = lesson.phrases.map((phrase, index) => {
    const order = index % 2 === 0;
    const words = phrase.vi.split(/\s+/).map((word, i) => ({ id: String(i), label: word }));
    return {
      id: `${phrase.id}-b`, phraseId: phrase.id, lessonId: lesson.id,
      type: order ? 'order' : 'dialogue', phrase,
      prompt: order ? `把词语排成“${phrase.zh}”` : `在这个场景，你想说“${phrase.zh}”。选哪一句？`,
      options: order ? stableShuffle(words, phrase.id + '-order') : stableShuffle(lesson.phrases.map(p => ({ id: p.id, label: p.vi })), phrase.id + '-vi'),
      answer: order ? words.map(w => w.id).join(',') : phrase.id,
      explanation: `${phrase.vi} = ${phrase.zh}`,
    };
  });
  return [...first, ...second];
}

export function isCorrect(question, answer) {
  if (question.type === 'order') {
    const ids = String(answer).split(',');
    if (ids.length !== question.options.length || new Set(ids).size !== ids.length) return false;
    const labels = ids.map(id => question.options.find(option => option.id === id)?.label);
    return labels.every(Boolean) && labels.join(' ') === question.phrase.vi;
  }
  return String(answer) === question.answer;
}

export function unlocked(progress, lessonId) {
  const index = lessons.findIndex(lesson => lesson.id === lessonId);
  return index === 0 || (index > 0 && Boolean(progress.clears[lessons[index - 1].id]?.passed));
}

export function dueReviews(progress, now = Date.now()) {
  return Object.entries(progress.reviews)
    .filter(([, review]) => Number.isFinite(review.dueAt) && review.dueAt <= now)
    .map(([questionId]) => questionId);
}

export function allQuestions() { return lessons.flatMap(questionsFor); }

export function registerAnswer(progress, question, correct, now = Date.now()) {
  const next = structuredClone(progress);
  const old = next.reviews[question.id];
  let xp = 0;
  if (correct) {
    if (!next.earned.includes(question.id)) { next.earned.push(question.id); xp += 10; }
    if (old) {
      const stage = Math.min((old.stage || 0) + 1, 4);
      if (stage >= 4) delete next.reviews[question.id];
      else next.reviews[question.id] = { stage, dueAt: now + [0, 3, 7, 14][stage] * DAY };
      xp += 3;
    }
  } else {
    next.reviews[question.id] = { stage: 0, dueAt: now + DAY };
  }
  next.xp += xp;
  return { progress: next, xp };
}

export function finishAttempt(progress, lessonId, results, now = Date.now()) {
  const next = structuredClone(progress);
  const available = results.filter(result => !result.skipped);
  const correct = available.filter(result => result.correct).length;
  const total = available.length;
  const ratio = total ? correct / total : 0;
  const stars = ratio === 1 ? 3 : ratio >= .9 ? 2 : ratio >= .8 ? 1 : 0;
  const previous = next.clears[lessonId] || { stars: 0, passed: false };
  const firstClear = stars > 0 && !previous.passed;
  if (firstClear) next.xp += 20;
  next.clears[lessonId] = {
    stars: Math.max(previous.stars || 0, stars),
    passed: previous.passed || stars > 0,
    best: Math.max(previous.best || 0, correct),
    lastPlayedAt: now,
  };
  const record = { lessonId, correct, total, skipped: results.length - total, stars, firstClear, at: now };
  next.attemptCount = (next.attemptCount || 0) + 1;
  next.history = [record, ...next.history].slice(0, 100);
  return { progress: next, record };
}

export function lessonByQuestionId(questionId) {
  const lessonId = questionId?.match(/^u\d+l\d+/)?.[0];
  return lessons.find(lesson => lesson.id === lessonId);
}
