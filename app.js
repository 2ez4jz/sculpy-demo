'use strict';
const $=id=>document.getElementById(id);
const parser=window.SculpyParser,storageKey='sculpy-demo-records-v1';
let records=[],recognition=null,listening=false,listenTimer=null,toastTimer=null,speechError=false,storageAvailable=true,starting=false,startTimer=null;
try{const loaded=JSON.parse(localStorage.getItem(storageKey)||'[]');if(!Array.isArray(loaded))throw Error();records=loaded.filter(r=>r&&typeof r.id==='string'&&typeof r.raw==='string');}catch{storageAvailable=false;}
$('day').value=parser.localDate();
function status(text,error=false){$('status').textContent=text;$('status').classList.toggle('error',error);}
function message(text,role='assistant'){const item=document.createElement('div');item.className='message '+role;const who=document.createElement('span');who.className='speaker';who.textContent=role==='assistant'?'SCULPY':'YOU';const p=document.createElement('p');p.textContent=text;item.append(who,p);$('messages').append(item);$('messages').scrollTop=$('messages').scrollHeight;}
function say(text){if(!$('speak').checked||!('speechSynthesis'in window))return;window.speechSynthesis.cancel();const u=new SpeechSynthesisUtterance(text);u.lang='zh-CN';window.speechSynthesis.speak(u);}
function toast(text){clearTimeout(toastTimer);$('toast').textContent=text;$('toast').hidden=false;toastTimer=setTimeout(()=>$('toast').hidden=true,3500);}
function persist(next){try{localStorage.setItem(storageKey,JSON.stringify(next));records=next;storageAvailable=true;return true;}catch{status('本机保存失败，输入文字已保留在对话中。',true);toast('保存失败，请保留当前页面。');return false;}}
function el(tag,cls,text){const x=document.createElement(tag);if(cls)x.className=cls;if(text!==undefined)x.textContent=text;return x;}
function renderSessions(){const staff=$('current-staff').value,day=$('day').value;const list=records.filter(r=>r.staff===staff&&r.serviceDate===day);$('day-heading').textContent=staff+(day===parser.localDate()?' 的今天':' 的这一天');$('day-summary').textContent=list.length?`留下了 ${list.length} 场工作，也留下了 ${list.length} 次用心。`:'还没有场次。说说今天的客人，我帮你留下来。';const wrap=$('sessions');wrap.replaceChildren();if(!list.length){const empty=el('div','session-empty');empty.append(el('span','empty-symbol','✦'),el('p','','每一场工作，慢慢积累。'));wrap.append(empty);}
 for(const [i,r] of list.entries()){const card=el('article','session-card');const top=el('div','session-title');top.append(el('span','session-index',String(i+1).padStart(2,'0')),el('h3','',r.customer||'姓名待补充'));card.append(top,el('p','session-service',r.service||'工作记录'));
 const notes=[r.preferences,r.weddingDate?'婚礼 · '+r.weddingDate:'',r.needs].filter(Boolean);for(const note of notes)card.append(el('p','session-note',note));
 const details=el('details','session-details');details.append(el('summary','','查看 / 修改'));const raw=el('p','session-raw',r.raw);details.append(raw);const form=el('form','session-edit');const nameLabel=el('label','','客户姓名');const name=el('input');name.value=r.customer||'';name.maxLength=100;nameLabel.append(name);form.append(nameLabel);
 const serviceLabel=el('label','','项目');const service=el('input');service.value=r.service||'';service.maxLength=100;serviceLabel.append(service);form.append(serviceLabel);const noteLabel=el('label','','偏好 / 备注');const note=el('textarea');note.value=r.preferences||'';note.rows=2;note.maxLength=1000;noteLabel.append(note);form.append(noteLabel);const button=el('button','primary','保存修改');button.type='submit';form.append(button);form.addEventListener('submit',e=>{e.preventDefault();const next=records.map(item=>item.id===r.id?{...item,customer:name.value.trim(),service:service.value.trim(),preferences:note.value.trim()}:item);if(persist(next)){renderSessions();toast('修改已保存。');}});details.append(form);card.append(details);wrap.append(card);}
}
function companion(text,data,staff,saved){const tired=/累|疲惫|疲憊|辛苦|tired|exhausted/i.test(text);const upset=/难过|難過|委屈|做得不够好|做得不好|压力|壓力|焦虑|焦慮|sad|stress/i.test(text);if(!saved){if(upset)return `${staff}，我听到了。觉得自己做得不够好，听起来挺不好受的。你愿意说说，今天哪件事让你有这种感觉吗？我陪你慢慢聊。`;if(tired)return `${staff}，今天累了呀。可以先缓一缓，喝口水，不用急着把每件事都做完。想说说今天最累的是哪一段吗？我在这里。`;return `${staff}，我在听呀。工作里的小事，或者心里的小事，都可以和我说。`;}
 const who=data.customer||'这位客人';const care=data.preferences?`你连${data.preferences}都记得，这些小细节，就是你对 ${who} 的用心。`:`你为 ${who} 做的这场工作，我帮你留下来了。`;return `${staff}，辛苦啦 ✨ ${care}${tired?'今天累了，就先让自己缓一缓。':''}场次已经记到右侧了，你不用再填一张表。`;
}
$('chat-form').addEventListener('submit',e=>{e.preventDefault();if(listening||starting)cancelVoice();const text=$('input').value.trim();if(!text){status('先输入一句话，或点击上方「试试」填入示例。',true);$('input').focus();return;}if(!$('day').value){status('先选一个日期吧。',true);$('day').focus();return;}message(text,'user');const data=parser.parse(text);const isWork=!!(data.customer||data.service||/帮我记|记录一下|記錄一下/.test(text));let saved=false;
 if(isWork){const entry={...data,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),staff:$('current-staff').value,serviceDate:$('day').value,saved:true};saved=persist([...records,entry]);if(saved)renderSessions();}
 const reply=companion(text,data,$('current-staff').value,saved);message(reply);say(reply);$('input').value='';if(!isWork)status('我在这里，慢慢说就好。');else if(saved)status('场次已记下 · 本机演示记录');
});
$('current-staff').addEventListener('change',()=>{renderSessions();status(`现在是 ${$('current-staff').value} 的记录。`);});$('day').addEventListener('change',renderSessions);
document.querySelectorAll('[data-example]').forEach(b=>b.addEventListener('click',()=>{if(listening||starting)cancelVoice();$('input').value=parser.examples[b.dataset.example];$('input').focus();status('可以直接发给 Sculpy，也可以加一句今天的感受。');}));
$('guide-button').addEventListener('click',()=>$('guide').showModal());$('close-guide').addEventListener('click',()=>$('guide').close());
$('presentation').addEventListener('click',()=>{const on=document.body.classList.toggle('presenting');$('presentation').textContent=on?'退出投屏模式':'投屏模式';$('presentation').setAttribute('aria-pressed',String(on));});
$('reset').addEventListener('click',()=>{if(!confirm('清空本机演示记录和对话，重新开始？'))return;if(listening||starting)cancelVoice();try{localStorage.removeItem(storageKey);}catch{toast('无法清空浏览器存储。');return;}records=[];$('messages').replaceChildren();message('我在这里呀 ✨ 今天忙得怎么样？');$('input').value='';renderSessions();status('演示已重置。');if('speechSynthesis'in window)window.speechSynthesis.cancel();});
function idleMic(){clearTimeout(listenTimer);clearTimeout(startTimer);listening=false;starting=false;$('mic').disabled=false;$('mic').classList.remove('active');$('mic-label').textContent='点击说话';$('mic').setAttribute('aria-label','开始语音输入');$('send').disabled=false;$('language').disabled=false;}
function cancelVoice(){const previous=recognition;recognition=null;idleMic();if(previous){try{previous.abort();}catch{}}}
const Recognition=window.SpeechRecognition||window.webkitSpeechRecognition;
if(Recognition){$('mic').addEventListener('click',()=>{
  if(listening||starting){cancelVoice();status($('input').value.trim()?'语音已停止，可以直接发送这段文字。':'语音已停止。可以重新说话，或直接输入文字。');return;}
  if('speechSynthesis'in window)window.speechSynthesis.cancel();const base=$('input').value.trim();let finalText='',failed=false;const rec=new Recognition();recognition=rec;rec.lang=$('language').value;rec.continuous=true;rec.interimResults=true;rec.maxAlternatives=1;
  starting=true;$('mic-label').textContent='取消启动';status('正在启动语音，请允许麦克风权限。也可以直接输入文字。');
  startTimer=setTimeout(()=>{if(rec!==recognition)return;cancelVoice();status('语音启动超时。请检查麦克风权限，文字输入仍可使用。',true);},10000);
  rec.onstart=()=>{if(rec!==recognition)return;clearTimeout(startTimer);starting=false;listening=true;$('mic').classList.add('active');$('mic-label').textContent='结束说话';$('mic').setAttribute('aria-label','结束语音输入');$('language').disabled=true;status('正在听。说完点「结束说话」，或直接点击「告诉 Sculpy」发送当前文字。');listenTimer=setTimeout(()=>{if(rec!==recognition)return;cancelVoice();status('已结束这一段语音，可以检查文字后发送。');},60000);};
  rec.onresult=event=>{if(rec!==recognition)return;let interim='';for(let i=event.resultIndex;i<event.results.length;i++){const t=event.results[i][0].transcript;if(event.results[i].isFinal)finalText+=t;else interim+=t;}$('input').value=[base,finalText+interim].filter(Boolean).join(' ').slice(0,4000);};
  rec.onerror=event=>{if(rec!==recognition)return;failed=true;const errors={'not-allowed':'麦克风权限未允许，请在地址栏的网站权限中允许麦克风；也可以直接输入文字。','service-not-allowed':'浏览器未允许语音服务，请使用 Chrome 或文字输入。','audio-capture':'没有检测到麦克风，请检查设备设置。文字输入仍可使用。','network':'语音服务网络出错，可重试或使用示例文字。','no-speech':'没有听到声音，可以重试或直接输入文字。','aborted':'语音输入已取消。'};const text=errors[event.error]||'语音转写未完成，可以重试或直接输入文字。';cancelVoice();status(text,true);};
  rec.onend=()=>{if(rec!==recognition)return;recognition=null;idleMic();if(!failed)status($('input').value.trim()?'转写结束，点击「告诉 Sculpy」即可发送。':'没有获取到文字，可以重试或点击上方示例。');};
  try{rec.start();}catch{cancelVoice();status('语音服务无法启动，可以重试或直接输入文字。',true);}
});}else{$('mic').disabled=true;$('mic-label').textContent='语音暂不支持';status('此浏览器不支持语音转写，请直接输入文字或使用示例。',true);}
document.addEventListener('visibilitychange',()=>{if(document.hidden&&(listening||starting))cancelVoice();});
renderSessions();if(!storageAvailable)status('无法读取本机记录，请检查浏览器存储设置。',true);
