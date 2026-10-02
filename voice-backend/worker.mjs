// Cloudflare Worker-compatible HTTP proxy. Secrets exist only in the server environment.
export const MAX_AUDIO_BYTES=10*1024*1024;
export async function handle(request,env,fetcher=fetch){
 const origin=request.headers.get('Origin');const allowed=env.ALLOWED_ORIGIN||'https://2ez4jz.github.io';
 const cors={'Access-Control-Allow-Origin':allowed,'Vary':'Origin','Access-Control-Allow-Methods':'POST, OPTIONS','Access-Control-Allow-Headers':'Content-Type, Authorization','Cache-Control':'no-store'};
 const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{...cors,'Content-Type':'application/json; charset=utf-8'}});
 if(new URL(request.url).pathname!=='/api/transcribe')return json({error:'接口不存在。'},404);
 if(origin&&origin!==allowed)return json({error:'此网页未获准使用语音服务。'},403);
 if(request.method==='OPTIONS')return new Response(null,{status:204,headers:cors});
 if(request.method!=='POST')return json({error:'不支持此请求方式。'},405);
 if(!env.OPENAI_API_KEY||!env.DEMO_ACCESS_TOKEN)return json({error:'语音服务尚未配置完成。'},503);
 if(request.headers.get('Authorization')!=='Bearer '+env.DEMO_ACCESS_TOKEN)return json({error:'演示口令不正确。'},401);
 const type=(request.headers.get('Content-Type')||'').split(';')[0].trim();const formats={'audio/webm':'webm','video/webm':'webm','audio/mp4':'mp4','video/mp4':'mp4','audio/mpeg':'mp3','audio/wav':'wav','audio/x-wav':'wav'};
 if(!formats[type])return json({error:'不支持这个录音格式。'},415);
 const length=Number(request.headers.get('Content-Length')||0);if(length>MAX_AUDIO_BYTES)return json({error:'录音太大，请分成短段。'},413);
 // Read with a hard bound even when Content-Length is absent.
 const reader=request.body?.getReader();if(!reader)return json({error:'没有收到录音。'},400);let bytes=0;const chunks=[];
 try{while(true){const {done,value}=await reader.read();if(done)break;bytes+=value.byteLength;if(bytes>MAX_AUDIO_BYTES){await reader.cancel();return json({error:'录音太大，请分成短段。'},413);}chunks.push(value);}}catch{return json({error:'录音上传中断，请重试。'},400);}
 if(!bytes)return json({error:'没有收到录音。'},400);
 const form=new FormData();form.append('file',new Blob(chunks,{type}),'sculpy-recording.'+formats[type]);form.append('model',env.TRANSCRIPTION_MODEL||'gpt-transcribe');
 form.append('prompt','这是一段 SCULP Studio 化妆师的工作记录或心情分享，以中文为主，可能夹杂英文。常见专有名词：SCULP、Sculpy、Miranda、Yuki、Mira、Angelina、Elaine、Giselle、Amy、Jessica、bridal trial、wedding-day styling、event styling、Casa Loma。仅转写听到的内容，保留原语言，不要添加这些词或猜测听不清的人名、日期。');
 try{const response=await fetcher('https://api.openai.com/v1/audio/transcriptions',{method:'POST',headers:{Authorization:'Bearer '+env.OPENAI_API_KEY},body:form,signal:AbortSignal.timeout(50000)});
  if(!response.ok)return json({error:response.status===429?'语音服务繁忙或额度不足，请稍后重试。':'语音服务暂时不可用，录音已在网页保留，可重试。'},response.status===429?429:502);
  const result=await response.json();if(typeof result.text!=='string'||!result.text.trim())return json({error:'没有识别到清晰语音，请回听录音检查。'},422);
  return json({text:result.text});
 }catch{return json({error:'语音处理超时或网络中断，请重试。'},504);}
}
export default {fetch(request,env){return handle(request,env);}};
