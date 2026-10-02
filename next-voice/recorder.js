'use strict';
(()=>{
 const ui=id=>document.getElementById(id),limitMs=120000;
 let phase='idle',recorder=null,stream=null,timer=null,blob=null,audioURL=null,generation=0;
 const config=window.SCULPY_VOICE_CONFIG||{};
 const hint=(text,error=false)=>{ui('status').textContent=text;ui('status').classList.toggle('error',error);};
 window.SculpyVoice={get recording(){return phase==='recording'||phase==='starting';}};
 function cleanup(){clearTimeout(timer);if(stream){stream.getTracks().forEach(t=>t.stop());stream=null;}ui('mic').classList.remove('active');ui('language').disabled=false;}
 function idle(){phase='idle';ui('mic').disabled=false;ui('mic-label').textContent='点击说话';ui('mic').setAttribute('aria-label','开始录音');cleanup();}
 function mime(){return ['audio/webm;codecs=opus','audio/mp4','audio/webm'].find(t=>MediaRecorder.isTypeSupported(t));}
 function endpoint(){return String(config.apiBase||'').replace(/\/$/,'')+'/api/transcribe';}
 async function transcribe(){if(!blob)return;if(!config.apiBase){hint('整段录音已经准备好了。语音 API 尚未连接，可以回听录音或继续输入文字。',true);return;}
  let token='';try{token=sessionStorage.getItem('sculpy-demo-access')||'';}catch{}token=token||prompt('请输入内部演示口令');if(!token){hint('未输入演示口令，录音已保留，可稍后重试。',true);ui('retry-audio').hidden=false;return;}try{sessionStorage.setItem('sculpy-demo-access',token);}catch{}
  phase='transcribing';ui('mic').disabled=true;ui('mic-label').textContent='正在整理语音…';ui('retry-audio').disabled=true;hint('说完啦，正在听完整段录音。');
  try{const result=await fetch(endpoint(),{method:'POST',headers:{'Content-Type':blob.type||'audio/webm','Authorization':'Bearer '+token},body:blob,signal:AbortSignal.timeout(60000)});const data=await result.json();if(!result.ok){if(result.status===401){try{sessionStorage.removeItem('sculpy-demo-access');}catch{}}throw Error(data.error||'语音转写失败。');}if(typeof data.text!=='string'||!data.text.trim())throw Error('这段录音没有识别到清晰文字。');ui('input').value=[ui('input').value.trim(),data.text.trim()].filter(Boolean).join('\n').slice(0,4000);ui('retry-audio').hidden=true;hint('整段文字已出来，检查后点击「告诉 Sculpy」。');}
  catch(e){ui('retry-audio').hidden=false;hint(e.name==='TimeoutError'?'转写超时，录音已保留，可以重试。':e.message||'语音服务暂时无法连接，录音已保留。',true);}
  finally{idle();ui('retry-audio').disabled=false;}
 }
 async function start(){const id=++generation;phase='starting';ui('mic-label').textContent='取消启动';hint('请允许麦克风，我在这里听你说。');
  timer=setTimeout(()=>{if(id!==generation)return;generation++;idle();hint('麦克风启动超时，可以重试或继续输入文字。',true);},10000);
  try{const acquired=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,autoGainControl:true}});if(id!==generation){acquired.getTracks().forEach(t=>t.stop());return;}clearTimeout(timer);stream=acquired;const type=mime();recorder=new MediaRecorder(stream,type?{mimeType:type}:undefined);const chunks=[];
   recorder.ondataavailable=e=>{if(e.data.size)chunks.push(e.data);};recorder.onerror=()=>{generation++;idle();hint('录音没有完成，请重试。文字输入仍可使用。',true);};
   recorder.onstop=()=>{if(id!==generation)return;blob=new Blob(chunks,{type:recorder.mimeType||type||'audio/webm'});idle();if(!blob.size){hint('没有录到声音，请检查麦克风后重试。',true);return;}if(audioURL)URL.revokeObjectURL(audioURL);audioURL=URL.createObjectURL(blob);ui('audio-preview').src=audioURL;ui('audio-review').hidden=false;transcribe();};
   recorder.start();phase='recording';ui('mic').classList.add('active');ui('mic-label').textContent='结束录音';ui('mic').setAttribute('aria-label','结束录音');ui('language').disabled=true;ui('retry-audio').hidden=true;hint('我在听。说完点「结束录音」，再一起整理。');timer=setTimeout(()=>{if(phase==='recording')recorder.stop();},limitMs);
  }catch(e){if(id!==generation)return;generation++;idle();hint(e.name==='NotAllowedError'?'没有获得麦克风权限，请允许后重试。':e.name==='NotFoundError'?'没有找到麦克风，请检查设备。':'录音无法启动，可以重试或直接输入文字。',true);}
 }
 ui('mic').disabled=false;ui('mic').addEventListener('click',()=>{if(phase==='starting'){generation++;idle();hint('已取消启动，文字输入仍可使用。');}else if(phase==='recording'){if(recorder.state==='recording')recorder.stop();}else if(phase==='idle')start();});
 ui('retry-audio').addEventListener('click',transcribe);
 if(!navigator.mediaDevices?.getUserMedia||!window.MediaRecorder){ui('mic').disabled=true;ui('mic-label').textContent='录音暂不支持';hint('此浏览器无法录音，请使用文字输入。',true);}
 window.addEventListener('pagehide',()=>{generation++;if(recorder?.state==='recording')recorder.stop();cleanup();if(audioURL)URL.revokeObjectURL(audioURL);});
})();
