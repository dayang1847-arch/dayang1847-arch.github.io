import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { phrases } from './course.js';
import { vocabulary } from './vocabulary.js';
import { explainPhrase } from './explanations.js';
import { learningPrinciples } from './language-logic.js';
import { toneRecords } from './pronunciation.js';
import { AUDIO_CLIPS, AUDIO_FILES, AUDIO_SOURCE } from './audio-data.js';
import { audioClipFor } from './speech.js';

test('每课、日常词条、词块、音节和声调均有随网站提供的音频',()=>{
  assert.equal(Object.keys(AUDIO_CLIPS).length,777);
  for (const item of [...phrases,...vocabulary]) {
    assert.ok(audioClipFor(item.vi),item.vi);
    for(const part of explainPhrase(item).parts)assert.ok(audioClipFor(part.text),part.text);
    for(const chunk of explainPhrase(item).chunks)assert.ok(audioClipFor(chunk.text),chunk.text);
  }
  for(const item of [...toneRecords.map(t=>t.mark),...learningPrinciples.map(p=>p.example)])assert.ok(audioClipFor(item),item);
  assert.equal(new Set(toneRecords.map(t=>audioClipFor(t.mark).start)).size,6);
});

test('音频目录、每条定位、编码文件及来源许可一致',()=>{
  const manifest=JSON.parse(readFileSync(new URL('./audio/manifest.json',import.meta.url),'utf8'));
  assert.deepEqual(AUDIO_FILES,manifest.files.map(f=>f.file));
  assert.deepEqual(AUDIO_CLIPS,manifest.clips);
  assert.equal(AUDIO_SOURCE.kind,'synthetic');assert.ok(AUDIO_SOURCE.modelAuthor && AUDIO_SOURCE.modelUrl && AUDIO_SOURCE.licenseUrl);
  const packs=new Map(manifest.files.map(f=>[f.file,f]));
  for(const file of manifest.files) {
    const bytes=readFileSync(new URL(file.file,import.meta.url));
    assert.equal(bytes.length,file.bytes,file.file);
    assert.equal(createHash('sha256').update(bytes).digest('hex'),file.sha256,file.file);
    assert.equal(bytes.subarray(4,8).toString(),'ftyp');
  }
  for(const clip of Object.values(AUDIO_CLIPS)) {
    assert.equal(clip.sourceId,AUDIO_SOURCE.id);assert.ok(clip.text);
    const file=packs.get(clip.file);assert.ok(file,clip.file);
    assert.ok(clip.start>=0 && clip.duration>0 && clip.start+clip.duration<=file.duration+.01,clip.text);
  }
});
