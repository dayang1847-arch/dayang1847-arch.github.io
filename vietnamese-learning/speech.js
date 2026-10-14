import { AUDIO_CLIPS, AUDIO_SOURCE } from './audio-data.js';

export const audioKey = text => String(text || '').normalize('NFC').trim().replace(/\s+/gu, ' ').toLocaleLowerCase('vi');
export const audioClipFor = text => AUDIO_CLIPS[audioKey(text)] || null;
export { AUDIO_SOURCE };

export function deviceVoice(env = globalThis) {
  try {
    if (env.AndroidVoice?.isAvailable()) return { lang: 'vi-VN', android: true };
    return env.speechSynthesis?.getVoices().find(voice => /^vi(?:[-_]|$)/iu.test(voice.lang)) || null;
  } catch { return null; }
}

export function playbackMessage(error) {
  if (error?.name === 'NotAllowedError' || error?.kind === 'blocked') return '浏览器暂未允许播放。请再点一次扬声器；微信内可在右上角菜单选择用浏览器打开。';
  if (error?.kind === 'unavailable') return '这条内容暂时没有可用发音，可查看文字和音标。';
  return '音频未能加载，请检查网络后重试。已完成首次缓存的课程可离线播放。';
}

const failure = (kind, message) => Object.assign(new Error(message), { kind });
const within = (promise, ms, message) => {
  let timer;
  return Promise.race([promise, new Promise((_, reject) => { timer = setTimeout(() => reject(failure('network', message)), ms); })]).finally(() => clearTimeout(timer));
};

// Audio files are supplied with the site; Vietnamese system voices are fallback.
export class SpeechPlayer {
  constructor(env = globalThis, clips = AUDIO_CLIPS) {
    this.env = env;
    this.clips = clips;
    this.request = 0;
    this.context = null;
    this.node = null;
    this.media = null;
    this.utterance = null;
    this.buffers = new Map();
  }
  available(text, recordingUrl = '') { return Boolean(recordingUrl || this.clips[audioKey(text)] || deviceVoice(this.env)); }
  stop() {
    this.request++;
    if (this.node) { this.node.onended = null; try { this.node.stop(); } catch {} this.node.disconnect(); this.node = null; }
    if (this.media) { this.media.onended = null; this.media.onerror = null; this.media.pause(); this.media = null; }
    this.utterance = null;
    try { this.env.speechSynthesis?.cancel(); this.env.AndroidVoice?.stop(); } catch {}
  }
  current(id) { if (id !== this.request) throw failure('cancelled', 'Playback superseded'); }
  async loadBuffer(file) {
    if (this.buffers.has(file)) return this.buffers.get(file);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const promise = (async () => {
      try {
        const response = await this.env.fetch(file, { signal: controller.signal });
        if (!response.ok) throw failure('network', 'Audio HTTP ' + response.status);
        const bytes = await response.arrayBuffer();
        return await this.context.decodeAudioData(bytes);
      } finally { clearTimeout(timer); }
    })();
    this.buffers.set(file, promise);
    // Keep a small number of decoded packs to limit memory on phones.
    while (this.buffers.size > 4) this.buffers.delete(this.buffers.keys().next().value);
    promise.catch(() => { if (this.buffers.get(file) === promise) this.buffers.delete(file); });
    return promise;
  }
  async play(text, { recordingUrl = '', onStart = () => {}, onEnd = () => {} } = {}) {
    this.stop();
    const id = this.request;
    const clip = this.clips[audioKey(text)];
    let lastError;
    if (recordingUrl) {
      try { await this.playMedia(recordingUrl, null, id, onStart, onEnd); return; }
      catch (error) { this.current(id); lastError = error; }
    }
    if (clip) {
      try { await this.playClip(clip, id, onStart, onEnd); return; }
      catch (error) {
        this.current(id);
        lastError = error;
        // A playback block requires another tap, not a silent question skip.
        if (error.name === 'NotAllowedError' || error.kind === 'blocked') throw error;
        try { await this.playMedia(clip.file, clip, id, onStart, onEnd); return; }
        catch (mediaError) { this.current(id); lastError = mediaError; }
      }
    }
    if (deviceVoice(this.env)) {
      try { await this.playDevice(text, id, onStart); return; }
      catch (error) { this.current(id); lastError = lastError || error; }
    }
    throw lastError || failure('unavailable', 'No audio for this text');
  }
  async playClip(clip, id, onStart, onEnd) {
    const Context = this.env.AudioContext || this.env.webkitAudioContext;
    if (!Context) throw failure('unsupported', 'No Web Audio');
    if (!this.context) this.context = new Context();
    // Resume immediately within the user's tap, before fetching or decoding.
    if (this.context.state !== 'running') {
      try { await within(this.context.resume(), 3000, 'Audio context did not start'); }
      catch (error) { throw Object.assign(error, { kind: 'blocked' }); }
    }
    this.current(id);
    if (this.context.state !== 'running') throw failure('blocked', 'Audio context suspended');
    const buffer = await this.loadBuffer(clip.file);
    this.current(id);
    if (!Number.isFinite(clip.start) || !Number.isFinite(clip.duration) || clip.start < 0 || clip.duration <= 0 || clip.start + clip.duration > buffer.duration + 0.12) throw failure('decode', 'Audio clip outside its pack');
    const node = this.context.createBufferSource();
    node.buffer = buffer;
    node.connect(this.context.destination);
    node.onended = () => { node.disconnect(); if (id === this.request) { this.node = null; onEnd(); } };
    this.node = node;
    node.start(0, clip.start, Math.min(clip.duration, buffer.duration - clip.start));
    onStart();
  }
  async playMedia(file, clip, id, onStart, onEnd) {
    const media = new this.env.Audio(file);
    this.media = media;
    media.preload = 'auto';
    const end = clip ? clip.start + clip.duration : null;
    const ended = () => { if (id === this.request) { media.pause(); this.media = null; onEnd(); } };
    media.onended = ended;
    if (clip) {
      try { media.currentTime = clip.start; } catch {}
      media.onloadedmetadata = () => { if (id === this.request) media.currentTime = clip.start; };
      media.ontimeupdate = () => { if (end !== null && media.currentTime >= end) ended(); };
    }
    try {
      await within(media.play(), 15000, 'Audio file did not start');
      this.current(id);
      onStart();
      if (clip) {
        const timer = setTimeout(() => { if (id === this.request && this.media === media) ended(); }, (clip.duration + 0.05) * 1000);
        media.onended = () => { clearTimeout(timer); ended(); };
      }
    } catch (error) { media.pause(); if (this.media === media) this.media = null; throw error; }
  }
  async playDevice(text, id, onStart) {
    const chosen = deviceVoice(this.env);
    if (!chosen) throw failure('unavailable', 'No Vietnamese device voice');
    this.current(id);
    if (chosen.android) {
      if (!this.env.AndroidVoice.speak(text)) throw failure('unavailable', 'Android voice failed');
      onStart(); return;
    }
    const utterance = new this.env.SpeechSynthesisUtterance(text);
    this.utterance = utterance; // Retain it until completion, including on mobile.
    utterance.voice = chosen; utterance.lang = chosen.lang; utterance.rate = .82;
    await within(new Promise((resolve, reject) => {
      utterance.onstart = () => { if (id === this.request) { onStart(); resolve(); } else reject(failure('cancelled', 'Speech superseded')); };
      utterance.onend = () => { if (this.utterance === utterance) this.utterance = null; };
      utterance.onerror = event => reject(failure(event.error === 'not-allowed' ? 'blocked' : 'unavailable', event.error));
      this.env.speechSynthesis.resume();
      this.env.speechSynthesis.speak(utterance);
    }), 6000, 'Device speech did not start');
  }
}
