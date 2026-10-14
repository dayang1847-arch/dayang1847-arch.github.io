import test from 'node:test';
import assert from 'node:assert/strict';
import { audioKey, SpeechPlayer, deviceVoice, playbackMessage } from './speech.js';
const clip = { file:'./audio/test.m4a', start:.2, duration:1 };
function environment(fetchOverride) {
  const starts=[]; let loads=0;
  class Context {
    state='suspended'; destination={};
    resume(){ this.state='running'; return Promise.resolve(); }
    decodeAudioData(){ return Promise.resolve({duration:3}); }
    createBufferSource(){return {connect(){},disconnect(){},stop(){},start(...args){starts.push(args);}};}
  }
  return { starts, get loads(){return loads;}, env:{AudioContext:Context,fetch:fetchOverride || (async()=>{loads++; return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};}),speechSynthesis:{getVoices:()=>[],cancel(){}}} };
}

test('无越南语系统声音时，内置音频仍可播；重复点按复用已解码音频', async()=>{
  const fixture=environment();const player=new SpeechPlayer(fixture.env,{'xin chào':clip});
  assert.equal(deviceVoice(fixture.env),null);assert.equal(player.available('Xin chào'),true);
  let heard=0;
  await player.play('Xin chào',{onStart:()=>heard++});await player.play('Xin chào',{onStart:()=>heard++});
  assert.equal(heard,2);assert.equal(fixture.loads,1);assert.deepEqual(fixture.starts,[[0,.2,1],[0,.2,1]]);
});

test('离开页面或连点后，之前未加载完的音频不会突然出声',async()=>{
  let resolveFetch;const fixture=environment(()=>new Promise(resolve=>{resolveFetch=resolve;}));
  const player=new SpeechPlayer(fixture.env,{'xin chào':clip});let heard=0;
  const pending=player.play('Xin chào',{onStart:()=>heard++});
  await new Promise(resolve=>setImmediate(resolve));player.stop();
  resolveFetch({ok:true,arrayBuffer:async()=>new ArrayBuffer(2)});
  await assert.rejects(pending,error=>error.kind==='cancelled');assert.equal(heard,0);assert.equal(fixture.starts.length,0);
});

test('被浏览器拦截时提示再次点击，且不宣告已经播放',async()=>{
  const fixture=environment();fixture.env.AudioContext=class {state='suspended';resume(){return Promise.reject(Object.assign(new Error('blocked'),{name:'NotAllowedError'}));}};
  const player=new SpeechPlayer(fixture.env,{'xin chào':clip});let heard=0;
  await assert.rejects(player.play('Xin chào',{onStart:()=>heard++}),error=>error.kind==='blocked');
  assert.equal(heard,0);assert.match(playbackMessage({name:'NotAllowedError'}),/再点/);
});

test('下载失败可重试，不永久缓存失败的音频',async()=>{
  let fail=true;const fixture=environment(async()=>({ok:!fail,status:404,arrayBuffer:async()=>new ArrayBuffer(2)}));
  fixture.env.Audio=class{play(){return Promise.reject(new Error('network'));}pause(){}};
  const player=new SpeechPlayer(fixture.env,{'xin chào':clip});
  await assert.rejects(player.play('Xin chào'));assert.equal(player.buffers.size,0);
  fail=false;await player.play('Xin chào');assert.equal(fixture.starts.length,1);
});

test('远程真人录音不可用时回退到内置音频',async()=>{
  const fixture=environment();fixture.env.Audio=class{play(){return Promise.reject(new Error('recording missing'));}pause(){}};
  const player=new SpeechPlayer(fixture.env,{'việt nam':clip});let heard=0;
  await player.play('Việt Nam',{recordingUrl:'https://example.test/recording.ogg',onStart:()=>heard++});
  assert.equal(heard,1);assert.equal(fixture.starts.length,1);
});

test('文本规范化保留越南语声调；确实无发音时准确报告',async()=>{
  assert.equal(audioKey('  GIÁ  bao   nhiêu '),'giá bao nhiêu');assert.equal(audioKey('gì'.normalize('NFD')),'gì');
  assert.notEqual(audioKey('ma'),audioKey('má'));
  const fixture=environment();const player=new SpeechPlayer(fixture.env,{});assert.equal(player.available('不存在'),false);
  await assert.rejects(player.play('不存在'),error=>error.kind==='unavailable');
});


test('真人录音延迟失败时，备用声音通道已在原始点按中开启',async()=>{
  const fixture=environment();let unlockedBeforeRecording=false;
  const player=new SpeechPlayer(fixture.env,{'việt nam':clip});
  fixture.env.Audio=class{play(){unlockedBeforeRecording=player.context?.state==='running';return Promise.reject(new Error('late network error'));}pause(){}};
  await player.play('Việt Nam',{recordingUrl:'https://example.test/recording.ogg'});
  assert.ok(unlockedBeforeRecording);assert.equal(fixture.starts.length,1);
});

test('iPhone 的媒体播放通道在下载音频之前启用，避免静音开关影响',async()=>{
  const session={type:'ambient'};let channelAtFetch;
  const fixture=environment(async()=>{channelAtFetch=session.type;return {ok:true,arrayBuffer:async()=>new ArrayBuffer(2)};});
  fixture.env.navigator={audioSession:session};
  const player=new SpeechPlayer(fixture.env,{'xin chào':clip});
  await player.play('Xin chào');
  assert.equal(channelAtFetch,'playback');assert.equal(fixture.starts.length,1);
});

test('设备不支持设置 AudioSession 时，内置发音仍可正常播放',async()=>{
  const fixture=environment();
  fixture.env.navigator={audioSession:{set type(value){throw new Error('unsupported');}}};
  const player=new SpeechPlayer(fixture.env,{'xin chào':clip});
  await player.play('Xin chào');assert.equal(fixture.starts.length,1);
});
