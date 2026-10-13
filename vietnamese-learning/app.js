import { units, lessons, phrases } from './course.js';
import { vocabulary, vocabularyGroups } from './vocabulary.js';
import { explainPhrase } from './explanations.js';
import { learningPrinciples } from './language-logic.js';
import { ipaSource, toneRecords } from './pronunciation.js';
import { IPA_BY_SYLLABLE } from './ipa-data.js';
import { getWordHistory } from './word-history.js';
import { getSpellingRule } from './spelling-rules.js';
import { allQuestions, dueReviews, finishAttempt, freshProgress, isCorrect, lessonByQuestionId, loadProgress, questionsFor, registerAnswer, saveProgress, unlocked } from './engine.js';

const app = document.querySelector('#app');
const announcer = document.querySelector('#announcer');
const questionMap = new Map(allQuestions().map(question => [question.id, question]));
let progress = loadProgress();
let page = 'home';
let session = null;
let result = null;
let activeAudio = null;
let audioMessage = '';
let audioRequestId = 0;
let vocabCategory = 'all';
let vocabSearch = '';
let pronunciationSession = null;
let pronunciationMode = 'course';
let pronunciationUnitId = units[0].id;
let pronunciationLessonId = lessons[0].id;
let pronunciationGroupId = vocabularyGroups[0].id;
let pronunciationSearch = '';
let wordDetail = null;
let expandedPhraseId = '';
let installPrompt = null;
let installMessage = '';
const logicAnswers = new Map();

const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const today = time => new Intl.DateTimeFormat('zh-CN', { month: 'numeric', day: 'numeric' }).format(new Date(time));
const stars = count => `<span class="stars" aria-label="${count} 星">${'★'.repeat(count)}${'☆'.repeat(3 - count)}</span>`;
const findLesson = id => lessons.find(lesson => lesson.id === id);
const findUnit = id => units.find(unit => unit.id === id);
const currentLesson = () => lessons.find(lesson => unlocked(progress, lesson.id) && !progress.clears[lesson.id]?.passed) || lessons.at(-1);
const due = () => dueReviews(progress).filter(id => questionMap.has(id));
const voice = () => {
  const browserVoice = 'speechSynthesis' in window ? speechSynthesis.getVoices().find(item => item.lang.toLowerCase().startsWith('vi')) : null;
  return window.AndroidVoice?.isAvailable() ? { lang: 'vi-VN', android: true } : browserVoice;
};
const canPlay = phrase => Boolean(phrase.audio?.url || voice());
const ipaFor = syllable => IPA_BY_SYLLABLE[syllable.toLocaleLowerCase('vi')] || '';

function announce(message) { announcer.textContent = ''; requestAnimationFrame(() => { announcer.textContent = message; }); }
function persist() { if (!saveProgress(progress)) document.querySelector('#storage-warning').hidden = false; }
function stopAudio() {
  audioRequestId++;
  if (activeAudio) { activeAudio.pause(); activeAudio = null; }
  if ('speechSynthesis' in window) speechSynthesis.cancel();
  window.AndroidVoice?.stop();
}
function setPage(next) {
  stopAudio();
  session = null;
  result = null;
  wordDetail = null;
  page = next;
  history.replaceState(null, '', `#${next}`);
  render(true);
}

function render(focus = false) {
  document.querySelector('#top-xp').textContent = `✦ ${progress.xp} XP`;
  document.querySelectorAll('.nav-link').forEach(button => button.classList.toggle('active', button.dataset.page === page));
  app.innerHTML = page === 'home' ? homeView()
    : page === 'map' ? mapView()
    : page === 'logic' ? logicView()
    : page === 'vocab' ? vocabView()
    : page === 'pronunciation' ? pronunciationView()
    : page === 'word-detail' ? wordDetailView()
    : page === 'review' ? reviewView()
    : page === 'records' ? recordsView()
    : page === 'intro' ? introView()
    : page === 'quiz' ? quizView()
    : resultView();
  if (page === 'vocab') filterVocabulary();
  if (focus) app.querySelector('[data-main-heading]')?.focus();
}

function pronunciationView() {
  const session = pronunciationSession;
  const question = session?.questions[session.cursor];
  const practice = !session ? `<section class="tone-practice card"><div><span class="eyebrow">LISTEN & IDENTIFY</span><h2>听一听，辨声调</h2><p>听“ma”系列的北部发音，选择你听到的声调。共 6 题，每轮覆盖六种声调。</p><button class="button button-accent" data-action="start-pronunciation">开始训练 →</button></div><div class="practice-mark" aria-hidden="true">ma?</div></section>`
    : session.complete ? `<section class="tone-practice card"><div><span class="eyebrow">PRACTICE COMPLETE</span><h2>本轮完成</h2><p>你答对 ${session.score} / ${session.questions.length} 题。可以再听一轮，逐渐熟悉声调轮廓。</p><button class="button button-accent" data-action="start-pronunciation">再练一轮 →</button></div><div class="practice-mark" aria-hidden="true">${session.score}/${session.questions.length}</div></section>`
    : `<section class="tone-practice card"><div class="practice-status"><span class="eyebrow">ROUND ${session.cursor + 1} / ${session.questions.length}</span><h2>这个音节是什么声调？</h2><p>先听发音，再按声调名称作答。</p><button class="button button-dark" data-action="play-tone" data-id="${question.id}">◖)) 播放「${question.mark}」</button></div><div class="tone-choices">${toneRecords.map(tone => `<button class="tone-choice ${session.selected === tone.id && !session.checked ? 'selected' : ''} ${session.checked && tone.id === question.id ? 'right' : ''} ${session.checked && session.selected === tone.id && session.selected !== question.id ? 'wrong' : ''}" data-action="choose-tone" data-id="${tone.id}" ${session.checked ? 'disabled' : ''}><b>${tone.name}</b><small>${tone.zh}</small></button>`).join('')}</div>${session.checked ? `<p class="tone-feedback" role="status">${session.selected === question.id ? '答对了！' : `正确答案：${question.name}（${question.zh}）`} · ${question.contour} · ${question.ipa}</p><button class="button button-accent" data-action="next-tone">${session.cursor === session.questions.length - 1 ? '查看本轮结果' : '下一题'} →</button>` : `<button class="button button-accent" data-action="check-tone" ${session.selected ? '' : 'disabled'}>确认答案</button>`}</section>`;
  return `${pageHead('PRONUNCIATION LAB · 北部参考', '声调与发音训练', '先认识音标，再通过听辨练习建立越南语声调的感觉。')}
    ${practice}${audioMessage ? `<p class="audio-note" role="status">${esc(audioMessage)}</p>` : !voice() ? '<p class="audio-note" role="status">此设备暂未提供越南语语音；可查看下方 IPA 和声调说明，听辨练习暂时无法播放。</p>' : ''}
    <section class="card tone-guide"><div class="section-heading"><span class="eyebrow">SIX TONES · 六声调</span><h2>用 ma 听出声调变化</h2><p>同一组辅音和元音，只改变声调符号，词义也会改变。</p></div><div class="tone-grid">${toneRecords.map(tone => `<article class="tone-card"><div class="tone-card-top"><span class="tone-mark" lang="vi">${tone.mark}</span><div><b>${tone.name}</b><small>${tone.zh}</small></div><button class="token-sound" data-action="play-tone" data-id="${tone.id}" aria-label="播放 ${tone.mark}">◖))</button></div><p>${tone.meaning}</p><div class="tone-meta"><span>${tone.contour}</span><code>${tone.ipa}</code></div></article>`).join('')}</div><p class="audio-note">声调不只靠音高区分，声门紧缩、气声和时长也很重要。这里的 IPA 是入门用宽式参考；练习需要设备提供越南语语音。</p></section>
    ${pronunciationCatalogView()}
    <section class="card ipa-phrase"><div class="section-heading"><span class="eyebrow">SOUND SOURCE · 发音依据</span><h2>如何阅读发音记录</h2></div><p>方括号内是北部越南语参考转写；上标数字标示音高走向，ˀ 标示喉部收紧。词句中的 368 个不同音节里，363 个已有转写；5 个外来写法保留文字与播放入口。</p><p class="source-note">转写由 <a href="${ipaSource.url}" target="_blank" rel="noopener noreferrer">${ipaSource.label}</a> 生成。它是单个音节的参考读法，连读、语速和说话人会影响实际声音。设备语音的具体口音也取决于设备提供的声音。</p></section>`;
}

function pronunciationCatalogView() {
  const search = pronunciationSearch.toLocaleLowerCase();
  const isCourse = pronunciationMode === 'course';
  const unit = findUnit(pronunciationUnitId) || units[0];
  const lesson = findLesson(pronunciationLessonId) || unit.lessons[0];
  const group = vocabularyGroups.find(item => item.id === pronunciationGroupId) || vocabularyGroups[0];
  const pool = isCourse ? phrases : vocabulary;
  const visible = search
    ? pool.filter(item => `${item.vi} ${item.zh}`.toLocaleLowerCase().includes(search))
    : isCourse ? lesson.phrases : group.words;
  const scope = search ? `找到 ${visible.length} / ${pool.length} 条` : isCourse
    ? `${units.indexOf(unit) + 1} / ${units.length} 单元 · ${lessons.indexOf(lesson) + 1} / ${lessons.length} 课`
    : `${vocabularyGroups.indexOf(group) + 1} / ${vocabularyGroups.length} 组`;
  return `<section class="card pronunciation-catalog"><div class="section-heading"><span class="eyebrow">COMPLETE SOUND LIBRARY</span><h2>完整发音记录</h2><p>42 课全部 210 条词句和 96 个日常词条。每条可听整句，每个音节可单独听并查看 IPA、声母、韵母和声调。</p></div>
    <div class="catalog-tabs" role="group" aria-label="发音记录类别"><button class="catalog-tab ${isCourse ? 'active' : ''}" data-action="pronunciation-mode" data-id="course" aria-pressed="${isCourse}">课程词句 · ${phrases.length}</button><button class="catalog-tab ${isCourse ? '' : 'active'}" data-action="pronunciation-mode" data-id="words" aria-pressed="${!isCourse}">日常词汇 · ${vocabulary.length}</button></div>
    <div class="catalog-controls"><label>搜索越南语或中文<input id="pronunciation-search" type="search" value="${esc(pronunciationSearch)}" placeholder="搜索全部${isCourse ? '词句' : '词汇'}…" autocomplete="off"></label>${isCourse ? `<label>单元<select id="pronunciation-unit">${units.map(item => `<option value="${item.id}" ${item.id === unit.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label><label>课时<select id="pronunciation-lesson">${unit.lessons.map(item => `<option value="${item.id}" ${item.id === lesson.id ? 'selected' : ''}>${esc(item.title)}</option>`).join('')}</select></label>` : `<label>词汇分类<select id="pronunciation-group">${vocabularyGroups.map(item => `<option value="${item.id}" ${item.id === group.id ? 'selected' : ''}>${esc(item.name)}</option>`).join('')}</select></label>`}</div>
    <p class="catalog-count" role="status">${scope}${search ? ' · 搜索结果' : ''}</p>
    <div class="catalog-list">${visible.length ? visible.map(item => pronunciationRecordView(item, isCourse)).join('') : '<p class="empty">没有找到匹配的词句。试试另一种写法或中文关键词。</p>'}</div>
    <p class="audio-note">真人录音按每条来源与许可使用；其余内容通过本机越南语合成声音播放。设备没有越南语声音时仍可查看文字、IPA 和发音结构。</p></section>`;
}

function pronunciationRecordView(item, isCourse) {
  const breakdown = explainPhrase(item);
  const lesson = isCourse ? lessons.find(entry => entry.phrases.some(phrase => phrase.id === item.id)) : null;
  return `<article class="catalog-record"><div class="catalog-record-head"><div><span class="catalog-record-context">${esc(lesson?.title || vocabularyGroups.find(group => group.words.some(word => word.id === item.id))?.name || '')}</span><h3 lang="vi">${esc(item.vi)}</h3><p>${esc(item.zh)}</p></div><button class="sound-button" data-action="play-catalog" data-id="${item.id}" ${canPlay(item) ? '' : 'disabled'} aria-label="播放整句 ${esc(item.vi)}">◖))</button></div><div class="catalog-syllables">${breakdown.parts.map(part => `<div class="catalog-syllable"><div class="catalog-syllable-top"><b lang="vi">${esc(part.text)}</b><button class="token-sound" data-action="play-token" data-text="${esc(part.text)}" ${voice() ? '' : 'disabled'} aria-label="播放音节 ${esc(part.text)}">◖))</button></div><span>${esc(part.gloss)}</span>${ipaFor(part.text) ? `<code>${esc(ipaFor(part.text))}</code>` : `<small>外来写法：按整句听音</small>`}<small>声母 ${esc(part.sound.onset)} · 韵母 ${esc(part.sound.rhyme)}</small><small>${esc(part.sound.tone)} · ${esc(part.sound.contour)}</small><button class="word-detail-link" data-action="open-word-detail" data-text="${esc(part.text)}" data-id="${item.id}">发音与词源 →</button></div>`).join('')}</div><p class="catalog-sound-source">${item.audio?.url ? '真人录音优先，无法播放时使用设备语音' : '设备越南语语音'} · 点击音节可单独听</p></article>`;
}

function openWordDetail(text, itemId) {
  const item = phrases.find(entry => entry.id === itemId) || vocabulary.find(entry => entry.id === itemId);
  if (!item || !item.vi.split(/\s+/u).some(part => part.toLocaleLowerCase('vi') === text.toLocaleLowerCase('vi'))) return;
  const from = page;
  wordDetail = { text, itemId, from, fromHash: location.hash || '#map', scrollY: window.scrollY, hasHistoryEntry: true };
  if (from === 'intro') expandedPhraseId = itemId;
  stopAudio();
  audioMessage = '';
  page = 'word-detail';
  history.pushState(null, '', `#word/${encodeURIComponent(itemId)}/${encodeURIComponent(text)}`);
  render(true);
  window.scrollTo(0, 0);
}

function closeWordDetail(fromHistory = false) {
  if (!wordDetail) { setPage('map'); return; }
  const { from, fromHash, scrollY, hasHistoryEntry } = wordDetail;
  stopAudio();
  wordDetail = null;
  page = from;
  if (!fromHistory) {
    if (hasHistoryEntry) history.back();
    else history.replaceState(null, '', fromHash);
  }
  render(true);
  requestAnimationFrame(() => window.scrollTo(0, scrollY));
}

function wordDetailView() {
  if (!wordDetail) return '';
  const item = phrases.find(entry => entry.id === wordDetail.itemId) || vocabulary.find(entry => entry.id === wordDetail.itemId);
  if (!item) return '';
  const breakdown = explainPhrase(item);
  const part = breakdown.parts.find(entry => entry.text.toLocaleLowerCase('vi') === wordDetail.text.toLocaleLowerCase('vi'));
  const chunk = breakdown.chunks.find(entry => entry.syllables.some(text => text.toLocaleLowerCase('vi') === wordDetail.text.toLocaleLowerCase('vi')));
  const entry = getWordHistory(wordDetail.text, item.vi);
  const spelling = getSpellingRule(part?.sound.onset);
  const ipa = ipaFor(wordDetail.text);
  const examples = phrases.filter(phrase => phrase.vi.split(/\s+/u).some(token => token.toLocaleLowerCase('vi') === wordDetail.text.toLocaleLowerCase('vi')));
  const orderedExamples = [item, ...examples.filter(example => example.id !== item.id)].slice(0, 3);
  const remembered = entry.memory || `把“${wordDetail.text}”的发音、${part?.sound.tone || '声调'}和“${part?.gloss || item.zh}”一起记；先听音节，再读完整词句。`;
  return `<div class="word-detail-top"><button class="back-button" data-action="close-word-detail">← 返回${wordDetail.from === 'intro' ? '本课词句' : wordDetail.from === 'pronunciation' ? '发音记录' : '上一页'}</button><span>词句 → 音节 → 词源</span></div>
    ${pageHead('WORD STORY · 词源与记忆', esc(wordDetail.text), `在“${esc(item.vi)}”中：${esc(part?.gloss || item.zh)}`)}
    <section class="card word-story-hero"><div><span class="eyebrow">SOUND & MEANING</span><h2 lang="vi">${esc(wordDetail.text)}</h2><p>${esc(part?.gloss || item.zh)}</p><div class="word-story-tags"><span>${ipa ? esc(ipa) : '外来写法'}</span><span>${esc(part?.sound.tone || '声调待核')}</span></div></div><button class="button button-outline" data-action="play-token" data-text="${esc(wordDetail.text)}" ${voice() ? '' : 'disabled'}>◖)) 听音节</button></section>
    ${chunk?.syllables.length > 1 ? `<p class="word-context-note">当前音节属于词块 <b lang="vi">${esc(chunk.text)}</b>：${esc(chunk.gloss)}。先记词块整体意思，再拆音节练发音。</p>` : ''}
    <section class="card story-card spelling-card"><span class="eyebrow">WHY IT SOUNDS THIS WAY · 拼写与读音</span><h2>为什么这样读？</h2>${spelling ? `<div class="spelling-formula"><b lang="vi">${esc(part.sound.onset)}</b><span>→</span><strong>${esc(spelling.sound)}</strong><span>+ ${esc(part.sound.rhyme)} · ${esc(part.sound.tone)}</span></div><p>${esc(spelling.why)}</p><p class="sound-rule-note">${esc(part.sound.cue)}</p><p><b>容易混淆：</b>${esc(spelling.contrast)}</p>${spelling.history ? `<p><b>拼写缘由：</b>${esc(spelling.history)}</p>` : ''}<p class="spelling-memory"><b>记忆法：</b>${esc(spelling.memory)}</p><div class="spelling-compare">${spelling.compare.map(sample => `<button class="spelling-sample" data-action="play-token" data-text="${esc(sample)}" ${voice() ? '' : 'disabled'}><span lang="vi">${esc(sample)}</span><small>◖)) 对比听</small></button>`).join('')}</div><p class="spelling-source">依据：${spelling.sources.map(ref => `<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a>`).join(' · ')}</p>` : `<p>${esc(part?.sound.cue || '这一写法需要结合整词听音。')}</p><p class="spelling-memory">先认完整声母，再接韵母和声调；不要直接套英语字母的读法。</p>`}</section>
    ${entry.headword.toLocaleLowerCase('vi') !== wordDetail.text.toLocaleLowerCase('vi') ? `<p class="word-context-note">本页结合词组 <b lang="vi">${esc(entry.headword)}</b> 解释。越南语的空格分隔音节，词源需要按整个词组判断。</p>` : ''}
    <div class="word-story-grid"><section class="card story-card"><span class="eyebrow">ORIGIN CHECK</span><h2>是不是汉越词？</h2><div class="origin-badge ${entry.verified ? '' : 'pending'}">${esc(entry.kind)}</div>${entry.han ? `<p class="han-character">相关汉字：<strong>${esc(entry.han)}</strong></p>` : ''}<p>${esc(entry.origin)}</p></section>
    <section class="card story-card"><span class="eyebrow">HOW IT CHANGED</span><h2>${entry.verified ? '词义怎么演变' : '词义演变待核'}</h2><p>${esc(entry.evolution)}</p></section></div>
    <section class="card story-card story-memory"><span class="eyebrow">MEMORY HOOK</span><h2>这样记更牢</h2><p>${esc(remembered)}</p><div class="memory-sound"><span>声母 ${esc(part?.sound.onset || '—')} + 韵母 ${esc(part?.sound.rhyme || '—')}</span><span>${esc(part?.sound.contour || '')}</span></div></section>
    <section class="card story-card"><span class="eyebrow">IN REAL SENTENCES</span><h2>放回词句里</h2><div class="word-example-list">${orderedExamples.map(example => `<div><div><strong lang="vi">${esc(example.vi)}</strong><small>${esc(example.zh)}</small></div><button class="token-sound" data-action="play-catalog" data-id="${example.id}" ${canPlay(example) ? '' : 'disabled'} aria-label="播放 ${esc(example.vi)}">◖))</button></div>`).join('')}</div></section>
    <section class="story-sources"><strong>词源依据</strong>${entry.sources.length ? entry.sources.map(ref => `<a href="${esc(ref.url)}" target="_blank" rel="noopener noreferrer">${esc(ref.title)} ↗</a>`).join('') : '<span>这一义项的词源资料仍在核对中。</span>'}</section>
    ${audioMessage ? `<p class="audio-note" role="status">${esc(audioMessage)}</p>` : ''}`;
}

function startPronunciation() {
  const questions = [...toneRecords].sort(() => Math.random() - .5);
  pronunciationSession = { questions, cursor: 0, selected: '', checked: false, score: 0, complete: false };
  page = 'pronunciation';
  render(true);
}

function answerTone() {
  if (!pronunciationSession || pronunciationSession.checked || !pronunciationSession.selected) return;
  const q = pronunciationSession.questions[pronunciationSession.cursor];
  pronunciationSession.checked = true;
  if (pronunciationSession.selected === q.id) pronunciationSession.score++;
  render();
}

function nextTone() {
  if (!pronunciationSession?.checked) return;
  if (pronunciationSession.cursor >= pronunciationSession.questions.length - 1) pronunciationSession.complete = true;
  else pronunciationSession.cursor++;
  pronunciationSession.selected = '';
  pronunciationSession.checked = false;
  render(true);
}

function pageHead(kicker, title, subtitle) {
  return `<div class="page-head"><div class="kicker">${kicker}</div><h1 tabindex="-1" data-main-heading>${title}</h1><p>${subtitle}</p></div>`;
}

function installCard() {
  const installed = Boolean(window.AndroidVoice) || window.matchMedia('(display-mode: standalone)').matches;
  const secure = location.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(location.hostname);
  const detail = window.AndroidVoice ? '当前已打开 Android 手机版，课程内容已保存在安装包内。'
    : installed ? '当前从主屏幕打开，完成首次缓存后可离线查看课程。'
    : !secure ? '此局域网地址可以在手机上直接学习。完整离线安装需要将应用放在 HTTPS 地址上。'
    : installPrompt ? '点击安装后，可从 Android 主屏幕打开并离线查看已缓存的课程内容。'
    : 'Android Chrome 中打开右上角 ⋮ 菜单，选择“安装应用”或“添加到主屏幕”。';
  return `<section class="install-card card"><div><span class="eyebrow">MOBILE EDITION · 手机版</span><h3>把越语冒险放进手机</h3><p>${esc(installMessage || detail)}</p></div>${installPrompt && !installed ? '<button class="button button-dark" data-action="install-app">安装到手机 →</button>' : ''}</section>`;
}

function homeView() {
  const cleared = lessons.filter(lesson => progress.clears[lesson.id]?.passed).length;
  const starCount = Object.values(progress.clears).reduce((sum, clear) => sum + (clear.stars || 0), 0);
  const next = currentLesson();
  const unit = findUnit(next.unitId);
  const dueCount = due().length;
  const latest = progress.history[0];
  return `${pageHead('YOUR JOURNEY · 从今天开始', '每闯过一关，都更接近真实交流。', '从第一句问候走到照明行业的客户会议，按自己的节奏前进。')}
    <section class="hero"><div class="hero-content"><span class="hero-badge">越南语闯关地图 · 42 课</span><h2>今天，继续<br><em>向前一步。</em></h2><p>5 分钟一小课，学一句、答一题、掌握一个新场景。</p><button class="button button-accent" data-action="open-lesson" data-id="${next.id}">继续学习 <span aria-hidden="true">→</span></button></div><img class="hero-cover" src="./assets/cover-v2.jpg" width="1672" height="941" alt="成年男性学习者与越南街景，金色星星指引闯关路线"><div class="hero-shade" aria-hidden="true"></div></section>
    ${installCard()}<div class="logic-entry card"><div><span class="eyebrow">UNDERSTAND THE LANGUAGE</span><h3>会说一句，也知道为什么</h3><p>词块、句型、语境与发音，用 8 个小练习建立语言逻辑。</p></div><button class="button button-outline" data-page="logic">进入语言逻辑 →</button></div><div class="stats"><div class="stat"><span>已通关</span><strong>${cleared}<small> / 42 课</small></strong><div class="stat-track"><i style="width:${Math.round(cleared / 42 * 100)}%"></i></div></div><div class="stat"><span>累计星星</span><strong>${starCount}<small> ★</small></strong><p>满星共 126 颗</p></div><div class="stat"><span>今日待复习</span><strong>${dueCount}<small> 题</small></strong><button class="text-button" data-page="review">去复习 →</button></div></div>
    <div class="home-grid"><section class="card next-card"><div class="section-heading"><span class="eyebrow">NEXT CHALLENGE</span><h3>下一关</h3></div><div class="next-icon">${unit.icon}</div><span class="muted-small">第 ${units.indexOf(unit) + 1} 单元 · ${esc(unit.category)}</span><h4>${esc(next.title)}</h4><p>${esc(next.note)}</p><button class="button button-dark" data-action="open-lesson" data-id="${next.id}">进入关卡 →</button></section><section class="card reward-card"><div class="section-heading"><span class="eyebrow">RECENT REWARD</span><h3>最近的收获</h3></div>${latest ? `<div class="reward-medal">✦</div><h4>${latest.firstClear ? '新关卡已通关！' : '又完成一次练习'}</h4><p>${esc(findLesson(latest.lessonId)?.title || '课程')} · ${latest.correct}/${latest.total} 题正确</p>${stars(latest.stars)}<span class="reward-date">${today(latest.at)}</span>` : `<div class="reward-medal">☆</div><h4>第一颗星等着你</h4><p>完成第一课，就能点亮你的学习地图。</p>`}</section></div>
    <section class="section-tail"><div><span class="eyebrow">THE ROAD AHEAD</span><h3>四段旅程，逐步进阶</h3></div><button class="text-button" data-page="map">查看完整地图 →</button></section><div class="journey-strip">${[['基础', '01', '发音与句型'], ['日常', '02', '生活交流'], ['销售', '03', '客户与产品'], ['供应链', '04', '工厂与交付']].map(([name, num, caption]) => `<div><b>${num}</b><strong>${name}</strong><small>${caption}</small></div>`).join('')}</div>`;
}

function mapView() {
  return `${pageHead('LEARNING MAP · 14 个单元', '你的越语冒险地图', '按顺序点亮关卡；已解锁的课随时可以重玩。')}
    <div class="map-legend"><span><i class="legend-dot unlocked-dot"></i> 可挑战</span><span><i class="legend-dot cleared-dot"></i> 已通关</span><span><i class="legend-dot locked-dot"></i> 待解锁</span></div>
    <div class="unit-list">${units.map((unit, index) => {
      const count = unit.lessons.filter(lesson => progress.clears[lesson.id]?.passed).length;
      return `<section class="unit-card"><div class="unit-heading"><div class="unit-emblem">${unit.icon}</div><div><span class="eyebrow">UNIT ${String(index + 1).padStart(2, '0')} · ${esc(unit.category)}</span><h2>${esc(unit.title)}</h2></div><span class="unit-count">${count}/3 完成</span></div><div class="lesson-grid">${unit.lessons.map((lesson, lessonIndex) => {
        const open = unlocked(progress, lesson.id);
        const clear = progress.clears[lesson.id];
        return `<button class="lesson-tile ${open ? 'is-open' : 'is-locked'} ${clear?.passed ? 'is-cleared' : ''}" ${open ? `data-action="open-lesson" data-id="${lesson.id}"` : 'disabled'} aria-label="${esc(lesson.title)}，${clear?.passed ? `${clear.stars} 星，已通关` : open ? '可挑战' : '未解锁'}"><span class="lesson-number">${String(lessonIndex + 1).padStart(2, '0')}</span><strong>${esc(lesson.title)}</strong>${open ? stars(clear?.stars || 0) : '<span class="lock">⌑ 待解锁</span>'}</button>`;
      }).join('')}</div></section>`;
    }).join('')}</div>`;
}

function reviewView() {
  const ids = due();
  const upcoming = Object.entries(progress.reviews).filter(([id, review]) => questionMap.has(id) && review.dueAt > Date.now()).length;
  return `${pageHead('REVIEW · 记得更牢', '错题复习', '答错后次日再见；答对后按 3、7、14 天逐渐延长间隔。')}
    <div class="review-hero"><div class="review-symbol">↻</div><div><span class="eyebrow">SPACED REVIEW</span><h2>${ids.length ? `今天有 ${ids.length} 道题等你复习` : '今天的复习已完成'}</h2><p>未来待复习 ${upcoming} 题。复习答对会获得额外经验值。</p></div><button class="button button-accent" data-action="start-review" ${ids.length ? '' : 'disabled'}>开始复习 →</button></div>
    <div class="card review-list"><div class="section-heading"><span class="eyebrow">DUE TODAY</span><h3>今日题目</h3></div>${ids.length ? ids.map(id => { const q = questionMap.get(id); const lesson = lessonByQuestionId(id); return `<div class="review-row"><span class="review-mark">✦</span><div><strong>${esc(q.phrase.zh)}</strong><small>${esc(lesson?.title || '')} · ${q.type === 'listen' ? '听音选择' : q.type === 'order' ? '句子排序' : q.type === 'dialogue' ? '对话补全' : '词义选择'}</small></div><span>待复习</span></div>`; }).join('') : '<div class="empty">目前没有到期错题。继续闯关，新的知识正在地图上等你。</div>'}</div>`;
}

function vocabView() {
  return `${pageHead('DAILY WORDS · 随手查', '日常越南语词汇', '96 个高频词，覆盖问候、称呼、时间、饮食和出行。点按声音按钮练习听音。')}
    <div class="vocab-tools"><label class="search-label" for="vocab-search">查找词汇</label><input id="vocab-search" class="vocab-search" type="search" placeholder="搜索越南语或中文…" value="${esc(vocabSearch)}" autocomplete="off"><div class="vocab-tabs" role="group" aria-label="词汇分类"><button class="vocab-tab ${vocabCategory === 'all' ? 'active' : ''}" data-action="vocab-category" data-id="all">全部</button>${vocabularyGroups.map(group => `<button class="vocab-tab ${vocabCategory === group.id ? 'active' : ''}" data-action="vocab-category" data-id="${group.id}">${group.icon} ${esc(group.name)}</button>`).join('')}</div></div>
    <div class="vocab-count" id="vocab-count"></div><div class="vocab-grid">${vocabularyGroups.map(group => group.words.map(word => `<div class="vocab-item" data-vocab-item data-category="${group.id}" data-search="${esc((word.vi + ' ' + word.zh).toLowerCase())}"><span class="vocab-icon">${group.icon}</span><div><strong lang="vi">${esc(word.vi)}</strong><small>${esc(word.zh)}</small></div><button class="sound-button" data-action="play-vocab" data-id="${word.id}" ${canPlay(word) ? '' : 'disabled'} aria-label="播放 ${esc(word.vi)} 的发音">◖))</button><details class="phrase-explain vocab-explain"><summary>词块与发音详解</summary>${phraseExplanationView(word)}</details></div>`).join('')).join('')}</div><p class="audio-note">部分称呼依年龄、身份和关系变化；词汇卡用于认识词义，使用时请结合课程中的完整句子。</p>`;
}

function filterVocabulary() {
  if (page !== 'vocab') return;
  let visible = 0;
  app.querySelectorAll('[data-vocab-item]').forEach(item => {
    const match = (vocabCategory === 'all' || item.dataset.category === vocabCategory) && item.dataset.search.includes(vocabSearch.toLowerCase());
    item.hidden = !match;
    if (match) visible++;
  });
  const count = app.querySelector('#vocab-count');
  if (count) count.textContent = `显示 ${visible} / ${vocabulary.length} 个词汇`;
}

function recordsView() {
  const cleared = lessons.filter(lesson => progress.clears[lesson.id]?.passed).length;
  const historyRows = progress.history.slice(0, 15);
  return `${pageHead('YOUR PROGRESS · 慢慢积累', '学习记录', '每次闯关都留下一点进步。记录只保存在当前浏览器。')}
    <div class="records-summary"><div><span>累计经验</span><b>${progress.xp} XP</b></div><div><span>通关课时</span><b>${cleared} / 42</b></div><div><span>练习次数</span><b>${progress.attemptCount || 0}</b></div></div>
    <section class="card"><div class="section-heading"><span class="eyebrow">RECENT ACTIVITY</span><h3>最近练习</h3></div>${historyRows.length ? historyRows.map(record => `<div class="history-row"><div><strong>${esc(findLesson(record.lessonId)?.title || '课程')}</strong><small>${today(record.at)} · ${record.correct}/${record.total} 题正确${record.skipped ? ` · ${record.skipped} 题因音频不可用跳过` : ''}</small></div>${stars(record.stars)}</div>`).join('') : '<div class="empty">完成一课后，这里会出现你的学习轨迹。</div>'}</section>
    <section class="card credits"><div class="section-heading"><span class="eyebrow">ABOUT THE AUDIO</span><h3>音频与内容说明</h3></div><p>课程以北部口音为目标。已核实的真人录音优先播放；其他词句使用设备提供的越南语合成声音。浏览器没有可用声音时，相关听力题自动跳过且不计入分数。</p><p>真人录音：<a href="https://commons.wikimedia.org/wiki/File:Vietnam.ogg" target="_blank" rel="noopener noreferrer">“Việt Nam”</a>，作者 Grenouille vert，北部口音，<a href="https://creativecommons.org/licenses/by-sa/3.0/" target="_blank" rel="noopener noreferrer">CC BY-SA 3.0</a>；本站未修改音频。课程内容经 AI 多轮校对；如发现译文或行业术语问题，可在 <code>course.js</code> 修订。</p></section>`;
}


function sourceView(source) {
  return source ? `<a class="language-source" href="${esc(source.url)}" target="_blank" rel="noopener noreferrer">参考：${esc(source.title)} ↗</a>` : '';
}

function phraseExplanationView(item) {
  const explanation = explainPhrase(item);
  return `<div class="explain-body">
    <h4 class="breakdown-label">01 · 先理解词块</h4><div class="meaning-chunks">${explanation.chunks.map(chunk => `<div class="meaning-chunk"><div><b lang="vi">${esc(chunk.text)}</b><button class="token-sound" data-action="play-token" data-text="${esc(chunk.text)}" ${voice() ? '' : 'disabled'} aria-label="播放词块 ${esc(chunk.text)}">◖))</button></div><span>${esc(chunk.gloss)}</span></div>`).join('')}</div>
    <p class="chunk-note">词块按本课常用词和搭配划分；空格通常分隔音节，音节不一定是独立的词。</p>
    <h4 class="breakdown-label">02 · 看懂句型与语境</h4><p><b>整句逻辑</b>${esc(explanation.logic)}</p><div class="grammar-cues">${explanation.grammar.map(rule => `<div class="grammar-cue"><b>${esc(rule.title)}</b><code>${esc(rule.pattern)}</code><p>${esc(rule.contrast)}</p>${sourceView(rule.source)}</div>`).join('')}</div>
    ${explanation.usage.map(note => `<p class="usage-cue">${esc(note.text)} ${sourceView(note.source)}</p>`).join('')}
    <details class="syllable-details" open><summary>03 · 逐音节发音与词源</summary><div class="word-breakdown">${explanation.parts.map(part => `<span class="word-piece"><span class="word-top"><b lang="vi">${esc(part.text)}</b><button class="token-sound" data-action="play-token" data-text="${esc(part.text)}" ${voice() ? '' : 'disabled'} aria-label="播放音节 ${esc(part.text)}">◖))</button></span><small>${esc(part.gloss)}</small>${ipaFor(part.text) ? `<code class="word-ipa">${esc(ipaFor(part.text))}</code>` : '<small>外来写法，按整词听音</small>'}<span class="pronunciation-logic"><span><b>音节结构</b>${esc(part.sound.onset)} + ${esc(part.sound.rhyme)}</span><span><b>声调</b>${esc(part.sound.tone)} · ${esc(part.sound.contour)}</span><small>${esc(part.sound.cue)}</small></span><button class="word-detail-link" data-action="open-word-detail" data-text="${esc(part.text)}" data-id="${item.id}">为什么这样读 · 词源 →</button></span>`).join('')}</div></details>
    <p class="sound-rule-note">先合成声母与韵母，再带上声调。音节构词提示用于记忆；历史来源以详解页的核实记录为准。</p></div>`;
}

function logicCardView(principle) {
  const picked = logicAnswers.get(principle.id);
  const checked = picked !== undefined;
  return `<span class="eyebrow">RULE ${String(learningPrinciples.indexOf(principle) + 1).padStart(2, '0')}</span><h2>${esc(principle.title)}</h2><p>${esc(principle.body)}</p><div class="logic-example"><b lang="vi">${esc(principle.example)}</b><button class="token-sound" data-action="play-token" data-text="${esc(principle.example)}" ${voice() ? '' : 'disabled'} aria-label="播放示例 ${esc(principle.example)}">◖))</button></div><h3>${esc(principle.prompt)}</h3><div class="logic-choices">${principle.choices.map((choice, index) => `<button class="logic-choice ${checked && index === principle.answer ? 'right' : ''} ${checked && picked === index && index !== principle.answer ? 'wrong' : ''}" data-action="choose-logic" data-id="${principle.id}" data-choice="${index}" ${checked ? 'disabled' : ''}><span>${String.fromCharCode(65 + index)}</span>${esc(choice)}</button>`).join('')}</div>${checked ? `<div class="logic-feedback ${picked === principle.answer ? 'good' : 'bad'}" role="status" tabindex="-1"><b>${picked === principle.answer ? '理解对了' : '看看差别，再记一次'}</b><p>${esc(principle.feedback)}</p></div><button class="text-button" data-action="retry-logic" data-id="${principle.id}">再练一次 ↻</button>` : ''}${sourceView(principle.source)}`;
}

function logicView() {
  return `${pageHead('LANGUAGE LOGIC · 理解后再记忆', '越南语为什么这样说？', '从词块、词序与语境理解一句话，再用发音规则把它读出来。')}
    <section class="card logic-path"><span>词块 · 完整意思</span><i aria-hidden="true">→</i><span>句型 · 信息顺序</span><i aria-hidden="true">→</i><span>语境 · 对谁说</span><i aria-hidden="true">→</i><span>发音 · 声母韵母声调</span></section>
    <div class="logic-grid">${learningPrinciples.map(principle => `<article class="card logic-card" data-logic-card="${principle.id}">${logicCardView(principle)}</article>`).join('')}</div>
    <p class="audio-note" role="status">${audioMessage ? esc(audioMessage) : '这些是入门观察点，具体表达请结合课程例句。点击参考链接可查看语言资料；发音由本机越南语声音提供。'}</p><button class="button button-dark" data-page="map">把规律用到闯关中 →</button>`;
}

function introView() {
  const lesson = session?.lesson;
  if (!lesson) return '';
  const unit = findUnit(lesson.unitId);
  return `<div class="lesson-top"><button class="back-button" data-page="map">← 返回地图</button><span>${esc(unit.category)} · ${esc(unit.title)}</span></div>
    ${pageHead('LESSON PREVIEW · 先学再练', esc(lesson.title), esc(lesson.note))}
    <div class="intro-layout"><section class="card phrase-card"><div class="section-heading"><span class="eyebrow">5 USEFUL PHRASES</span><h3>本课词句</h3></div>${lesson.phrases.map((phrase, index) => {
      return `<div class="phrase-row"><span class="phrase-index">${String(index + 1).padStart(2, '0')}</span><div class="phrase-copy"><strong lang="vi">${esc(phrase.vi)}</strong><small>${esc(phrase.zh)}</small><details class="phrase-explain" ${expandedPhraseId === phrase.id ? 'open' : ''}><summary>单词逻辑解释</summary>${phraseExplanationView(phrase)}</details></div><button class="sound-button" data-action="play-phrase" data-id="${phrase.id}" ${canPlay(phrase) ? '' : 'disabled'} aria-label="播放 ${esc(phrase.vi)} 的发音">◖))</button></div>`;
    }).join('')}</section><aside class="lesson-aside"><div class="aside-symbol">✦</div><span class="eyebrow">READY TO PLAY?</span><h3>听、选、排、说</h3><p>共 10 道互动题。达到 80% 正确率即可点亮下一关。</p><div class="aside-rule"><span>★</span> 80% 通关 <span>★★★</span> 全对满星</div><button class="button button-accent button-wide" data-action="start-quiz">开始挑战 →</button></aside></div><p class="audio-note">${audioMessage ? esc(audioMessage) : '点击“单词逻辑解释”拆解词义与句子结构，也可用扬声器练习听音。'}</p>`;
}

function quizView() {
  if (!session) return '';
  const q = session.questions[session.cursor];
  if (!q) return '';
  const total = session.questions.length;
  const checked = session.checked;
  const picked = session.selected;
  const order = q.type === 'order';
  const label = q.type === 'listen' ? '听音选择' : q.type === 'meaning' ? '词义选择' : order ? '句子排序' : '对话补全';
  const answerReady = order ? picked.length === q.options.length : Boolean(picked);
  const canCheck = answerReady && (q.type !== 'listen' || session.heard);
  return `<div class="quiz-frame"><div class="quiz-top"><button class="back-button" data-action="quit-quiz">← 退出挑战</button><span>${session.kind === 'review' ? '错题复习' : esc(session.lesson.title)}</span><span class="quiz-count">${session.cursor + 1} / ${total}</span></div><div class="quiz-progress" role="progressbar" aria-label="挑战进度" aria-valuenow="${session.cursor + 1}" aria-valuemin="1" aria-valuemax="${total}"><i style="width:${(session.cursor + 1) / total * 100}%"></i></div>
    <section class="question-panel"><div class="question-kicker"><span class="type-chip">${label}</span><span>${session.kind === 'review' ? '巩固记忆' : '答对解锁下一关'}</span></div><h1 tabindex="-1" data-main-heading>${esc(q.prompt)}</h1>${q.type === 'listen' ? `<button class="play-large" data-action="play-question" aria-label="播放越南语音频">◖)) <span>${session.heard ? '再听一次' : '点按听发音'}</span></button>` : ''}
    ${order ? `<div class="answer-line" aria-label="已选词语">${picked.length ? picked.map(id => { const word = q.options.find(option => option.id === id); return `<button data-action="remove-word" data-id="${id}" ${checked ? 'disabled' : ''}>${esc(word?.label || '')} ×</button>`; }).join('') : '<span>按顺序点选下方词语</span>'}</div><div class="word-bank">${q.options.map(option => `<button class="word-button" data-action="add-word" data-id="${option.id}" ${picked.includes(option.id) || checked ? 'disabled' : ''}>${esc(option.label)}</button>`).join('')}</div>` : `<div class="answer-options">${q.options.map((option, index) => `<button class="answer-option ${picked === option.id ? 'selected' : ''} ${checked && option.id === q.answer ? 'right' : ''} ${checked && picked === option.id && picked !== q.answer ? 'wrong' : ''}" data-action="select-option" data-id="${option.id}" ${checked ? 'disabled' : ''}><span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${esc(option.label)}</span></button>`).join('')}</div>`}
    ${checked ? `<div class="feedback ${session.lastCorrect ? 'good' : 'bad'}" role="status" tabindex="-1"><strong>${session.lastCorrect ? '答对了！' : '再记住这一句'}</strong><span>${esc(q.explanation)}</span><p class="answer-logic"><b>为什么这样说：</b>${esc(q.logic)}</p>${session.lastXp ? `<small>+${session.lastXp} XP</small>` : ''}</div>` : ''}
    <div class="question-actions"><span>${checked ? '继续向前' : q.type === 'listen' && !session.heard ? '先播放发音，再选择答案' : '选好后确认答案'}</span>${checked ? `<button class="button button-dark" data-action="next-question">${session.cursor === total - 1 ? '查看结果' : '下一题'} →</button>` : `<button class="button button-dark" data-action="check-answer" ${canCheck ? '' : 'disabled'}>确认答案</button>`}</div></section><p class="quiz-tip">${audioMessage ? esc(audioMessage) : '提示：可使用 1–5 键选择选项，Enter 键确认或进入下一题。'}</p></div>`;
}

function resultView() {
  if (!result) return '';
  const record = result.record;
  const review = result.kind === 'review';
  const nextIndex = lessons.findIndex(lesson => lesson.id === result.lessonId) + 1;
  const next = lessons[nextIndex];
  return `<div class="result-wrap"><div class="result-confetti" aria-hidden="true">✦ · ✧ · ✦</div><div class="result-medal">${record.stars ? '★' : review ? '↻' : '✧'}</div><span class="eyebrow">${review ? 'REVIEW COMPLETE' : 'CHALLENGE COMPLETE'}</span><h1 tabindex="-1" data-main-heading>${review ? '今天的复习完成了' : record.stars ? '关卡通关！' : '再试一次，就能点亮下一关'}</h1><p>${review ? '把容易忘记的句子再记牢一点。' : record.stars ? '你的越语地图又亮起了一格。' : '看看解析，再挑战一次。'}</p><div class="result-score"><strong>${record.correct}<small> / ${record.total}</small></strong><span>答对题目</span></div>${review ? '' : stars(record.stars)}${record.skipped ? `<p class="skip-note">${record.skipped} 道听力题因没有可用音频已跳过，不计入成绩。</p>` : ''}<div class="result-actions">${!review ? `<button class="button button-outline" data-action="open-lesson" data-id="${result.lessonId}">再练一次</button>` : ''}<button class="button button-dark" data-page="map">返回地图</button>${!review && record.stars && next && unlocked(progress, next.id) ? `<button class="button button-accent" data-action="open-lesson" data-id="${next.id}">下一关 →</button>` : ''}</div></div>`;
}

function openLesson(id) {
  const lesson = findLesson(id);
  if (!lesson || !unlocked(progress, id)) return;
  stopAudio();
  session = { kind: 'lesson', lesson, questions: questionsFor(lesson), cursor: 0, results: [], selected: '', checked: false, heard: false };
  audioMessage = '';
  page = 'intro';
  render(true);
}

function startQuiz() {
  if (!session) return;
  session.cursor = 0;
  session.results = [];
  session.selected = '';
  session.checked = false;
  session.heard = false;
  page = 'quiz';
  advanceUnavailable();
  render(true);
}

function startReview() {
  const questions = due().map(id => questionMap.get(id)).filter(Boolean);
  if (!questions.length) return;
  stopAudio();
  session = { kind: 'review', lesson: null, questions, cursor: 0, results: [], selected: '', checked: false, heard: false };
  page = 'quiz';
  advanceUnavailable();
  render(true);
}

function advanceUnavailable() {
  while (session && session.cursor < session.questions.length) {
    const q = session.questions[session.cursor];
    if (q.type !== 'listen' || canPlay(q.phrase)) break;
    session.results.push({ id: q.id, skipped: true, correct: false });
    session.cursor++;
    audioMessage = '设备没有可用的越南语音频，听力题已跳过。';
  }
  if (session && session.cursor >= session.questions.length) completeSession();
}

function checkAnswer() {
  if (!session || session.checked) return;
  const q = session.questions[session.cursor];
  const answer = q.type === 'order' ? session.selected.join(',') : session.selected;
  if (!answer || (q.type === 'listen' && !session.heard)) return;
  const correct = isCorrect(q, answer);
  const update = registerAnswer(progress, q, correct);
  progress = update.progress;
  persist();
  session.results.push({ id: q.id, correct, skipped: false });
  session.checked = true;
  session.lastCorrect = correct;
  session.lastXp = update.xp;
  announce(correct ? `答对了。${q.explanation}` : `答错了。${q.explanation}`);
  render();
  app.querySelector('.feedback')?.focus();
}

function nextQuestion() {
  if (!session?.checked) return;
  stopAudio();
  session.cursor++;
  if (session.cursor >= session.questions.length) { completeSession(); return; }
  session.selected = session.questions[session.cursor].type === 'order' ? [] : '';
  session.checked = false;
  session.heard = false;
  session.lastXp = 0;
  audioMessage = '';
  advanceUnavailable();
  if (page === 'quiz') render(true);
}

function completeSession() {
  if (!session) return;
  stopAudio();
  let record;
  const lessonId = session.lesson?.id;
  if (session.kind === 'lesson') {
    const update = finishAttempt(progress, lessonId, session.results);
    progress = update.progress;
    record = update.record;
    persist();
  } else {
    const answered = session.results.filter(item => !item.skipped);
    record = { correct: answered.filter(item => item.correct).length, total: answered.length, skipped: session.results.length - answered.length, stars: 0 };
  }
  result = { kind: session.kind, lessonId, record };
  session = null;
  page = 'result';
  render(true);
}

function speak(text, onStart, onFailure) {
  const chosen = voice();
  if (!chosen) { onFailure(); return; }
  if (chosen.android) {
    if (window.AndroidVoice.speak(text)) onStart(); else onFailure();
    return;
  }
  const utterance = new SpeechSynthesisUtterance(text);
  utterance.voice = chosen;
  utterance.lang = chosen.lang;
  utterance.rate = .82;
  utterance.onstart = onStart;
  utterance.onerror = onFailure;
  speechSynthesis.cancel();
  speechSynthesis.speak(utterance);
}

async function playPhrase(phrase, question = false) {
  stopAudio();
  const requestId = audioRequestId;
  const success = () => {
    if (requestId !== audioRequestId) return;
    if (question && session?.questions[session.cursor]?.phraseId === phrase.id) { session.heard = true; render(); }
    audioMessage = '';
  };
  const fail = () => {
    if (requestId !== audioRequestId) return;
    audioMessage = '这条词句暂时没有可用音频。';
    if (question && session?.questions[session.cursor]?.phraseId === phrase.id) {
      session.results.push({ id: session.questions[session.cursor].id, skipped: true, correct: false });
      session.cursor++;
      session.selected = '';
      session.checked = false;
      session.heard = false;
      advanceUnavailable();
      if (page === 'quiz') render(true);
    } else render();
  };
  if (phrase.audio?.url) {
    const player = new Audio(phrase.audio.url);
    activeAudio = player;
    player.onerror = () => { if (activeAudio === player) { activeAudio = null; speak(phrase.vi, success, fail); } };
    try { await player.play(); success(); }
    catch { if (activeAudio === player) { activeAudio = null; speak(phrase.vi, success, fail); } }
  } else speak(phrase.vi, success, fail);
}

function playToken(text) {
  stopAudio();
  const requestId = audioRequestId;
  speak(text, () => {}, () => {
    if (requestId !== audioRequestId) return;
    audioMessage = '此设备没有可用的越南语发音声音。';
    render();
  });
}

app.addEventListener('click', event => {
  const button = event.target.closest('button');
  if (!button || button.disabled) return;
  const action = button.dataset.action;
  if (button.dataset.page) { setPage(button.dataset.page); return; }
  if (action === 'open-lesson') openLesson(button.dataset.id);
  if (action === 'choose-logic') {
    const principle = learningPrinciples.find(item => item.id === button.dataset.id);
    const choice = Number(button.dataset.choice);
    if (!principle || !Number.isInteger(choice) || choice < 0 || choice >= principle.choices.length) return;
    logicAnswers.set(principle.id, choice);
    const card = button.closest('[data-logic-card]');
    card.innerHTML = logicCardView(principle);
    card.querySelector('.logic-feedback')?.focus();
  }
  if (action === 'retry-logic') {
    logicAnswers.delete(button.dataset.id);
    const principle = learningPrinciples.find(item => item.id === button.dataset.id);
    if (principle) {
      const card = button.closest('[data-logic-card]');
      card.innerHTML = logicCardView(principle);
      card.querySelector('[data-action="choose-logic"]')?.focus();
    }
  }
  if (action === 'start-quiz') startQuiz();
  if (action === 'start-review') startReview();
  if (action === 'vocab-category') { vocabCategory = button.dataset.id; render(); filterVocabulary(); }
  if (action === 'quit-quiz') setPage(session?.kind === 'review' ? 'review' : 'map');
  if (action === 'play-phrase') { const phrase = phrases.find(item => item.id === button.dataset.id); if (phrase) playPhrase(phrase); }
  if (action === 'play-token') playToken(button.dataset.text || '');
  if (action === 'open-word-detail') openWordDetail(button.dataset.text || '', button.dataset.id || '');
  if (action === 'close-word-detail') closeWordDetail();
  if (action === 'install-app' && installPrompt) {
    const prompt = installPrompt;
    installPrompt = null;
    prompt.prompt();
    prompt.userChoice.then(choice => {
      installMessage = choice.outcome === 'accepted' ? '安装已开始，可在 Android 主屏幕找到越语冒险。' : '稍后仍可从 Chrome 菜单安装。';
      if (page === 'home') render();
    });
  }
  if (action === 'start-pronunciation') startPronunciation();
  if (action === 'choose-tone' && pronunciationSession && !pronunciationSession.checked) { pronunciationSession.selected = button.dataset.id; render(); }
  if (action === 'check-tone') answerTone();
  if (action === 'next-tone') nextTone();
  if (action === 'play-tone') { const tone = toneRecords.find(item => item.id === button.dataset.id); if (tone) playToken(tone.mark); }
  if (action === 'play-ipa-token') playToken(button.dataset.text || '');
  if (action === 'play-catalog') { const item = phrases.find(entry => entry.id === button.dataset.id) || vocabulary.find(entry => entry.id === button.dataset.id); if (item) playPhrase(item); }
  if (action === 'pronunciation-mode') { pronunciationMode = button.dataset.id; pronunciationSearch = ''; stopAudio(); audioMessage = ''; render(); }
  if (action === 'play-vocab') { const word = vocabulary.find(item => item.id === button.dataset.id); if (word) playPhrase(word); }
  if (action === 'play-question' && session) playPhrase(session.questions[session.cursor].phrase, true);
  if (action === 'select-option' && session && !session.checked) { session.selected = button.dataset.id; render(); }
  if (action === 'add-word' && session && !session.checked) { if (!Array.isArray(session.selected)) session.selected = []; if (!session.selected.includes(button.dataset.id)) session.selected.push(button.dataset.id); render(); }
  if (action === 'remove-word' && session && !session.checked) { session.selected = session.selected.filter(id => id !== button.dataset.id); render(); }
  if (action === 'check-answer') checkAnswer();
  if (action === 'next-question') nextQuestion();
});

app.addEventListener('input', event => {
  if (event.target.id === 'vocab-search') { vocabSearch = event.target.value.trim(); filterVocabulary(); }
  if (event.target.id === 'pronunciation-search' && !event.isComposing) updatePronunciationSearch(event.target);
});

function updatePronunciationSearch(input) {
  pronunciationSearch = input.value;
  const position = input.selectionStart;
  render();
  const replacement = app.querySelector('#pronunciation-search');
  replacement?.focus();
  if (position != null) replacement?.setSelectionRange(position, position);
}

app.addEventListener('compositionend', event => {
  if (event.target.id === 'pronunciation-search') updatePronunciationSearch(event.target);
});

app.addEventListener('change', event => {
  if (event.target.id === 'pronunciation-unit') {
    pronunciationUnitId = event.target.value;
    pronunciationLessonId = findUnit(pronunciationUnitId)?.lessons[0]?.id || lessons[0].id;
    pronunciationSearch = '';
    render();
  }
  if (event.target.id === 'pronunciation-lesson') { pronunciationLessonId = event.target.value; pronunciationSearch = ''; render(); }
  if (event.target.id === 'pronunciation-group') { pronunciationGroupId = event.target.value; pronunciationSearch = ''; render(); }
});

document.querySelectorAll('.nav-link').forEach(button => button.addEventListener('click', () => setPage(button.dataset.page)));
document.querySelector('.brand').addEventListener('click', event => { event.preventDefault(); setPage('home'); });
window.addEventListener('beforeinstallprompt', event => {
  event.preventDefault();
  installPrompt = event;
  if (page === 'home') render();
});
window.addEventListener('appinstalled', () => {
  installPrompt = null;
  installMessage = '已安装完成，可以从 Android 主屏幕打开。';
  if (page === 'home') render();
});
function showWordHash() {
  const match = /^#word\/([^/]+)\/(.+)$/u.exec(location.hash);
  if (!match) return false;
  let itemId, text;
  try { itemId = decodeURIComponent(match[1]); text = decodeURIComponent(match[2]); } catch { return false; }
  const item = phrases.find(entry => entry.id === itemId) || vocabulary.find(entry => entry.id === itemId);
  if (!item || !item.vi.split(/\s+/u).some(part => part.toLocaleLowerCase('vi') === text.toLocaleLowerCase('vi'))) return false;
  wordDetail = { text, itemId, from: 'map', fromHash: '#map', scrollY: 0, hasHistoryEntry: false };
  page = 'word-detail';
  return true;
}
window.addEventListener('popstate', () => {
  if (page === 'word-detail' && wordDetail && !location.hash.startsWith('#word/')) closeWordDetail(true);
  else if (location.hash.startsWith('#word/')) { showWordHash(); render(true); window.scrollTo(0, 0); }
});
document.addEventListener('keydown', event => {
  if (page !== 'quiz' || !session || event.altKey || event.ctrlKey || event.metaKey) return;
  const q = session.questions[session.cursor];
  if (!session.checked && q.type !== 'order' && /^[1-5]$/.test(event.key)) {
    const option = q.options[Number(event.key) - 1];
    if (option) { session.selected = option.id; render(); }
  }
  if (event.key === 'Enter' && !['BUTTON', 'A'].includes(document.activeElement?.tagName)) {
    event.preventDefault();
    if (session.checked) nextQuestion(); else checkAnswer();
  }
});

if ('speechSynthesis' in window) speechSynthesis.addEventListener?.('voiceschanged', () => { if (['home', 'intro', 'pronunciation', 'word-detail', 'vocab', 'logic'].includes(page)) render(); });
window.addEventListener('androidvoicechange', () => { if (['home', 'intro', 'pronunciation', 'word-detail', 'quiz', 'vocab', 'logic'].includes(page)) render(); });
showWordHash();
if (page !== 'word-detail') {
  const requestedPage = location.hash.slice(1);
  if (['home', 'map', 'logic', 'vocab', 'pronunciation', 'review', 'records'].includes(requestedPage)) page = requestedPage;
}
render();
filterVocabulary();
