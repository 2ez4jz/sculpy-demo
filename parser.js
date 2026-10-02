(function(root){
  'use strict';
  const examples={
    bridal:'Sculpy，今天给 Amy 做了 bridal trial，她喜欢自然一点的妆，眼妆不要太重。婚礼是 2026 年 11 月 8 号，她妈妈可能也要做造型。',
    event:'今天给 Jessica 做了活动造型，她喜欢轻薄底妆和冷调妆容。她说 12 月可能还有公司年会，需要再联系。'
  };
  function localDate(now=new Date()) { return [now.getFullYear(),String(now.getMonth()+1).padStart(2,'0'),String(now.getDate()).padStart(2,'0')].join('-'); }
  function number(s){
    if(/^\d+$/.test(s))return Number(s);
    const digits={'零':0,'〇':0,'一':1,'二':2,'两':2,'三':3,'四':4,'五':5,'六':6,'七':7,'八':8,'九':9};
    if(s.includes('十')){const [a,b]=s.split('十');return (a?digits[a]:1)*10+(b?digits[b]:0);}
    return s.length>1?Number([...s].map(c=>digits[c]??'').join('')):digits[s];
  }
  function dateValue(year,month,day){const y=number(year),m=number(month),d=number(day);const dt=new Date(y,m-1,d);return dt.getFullYear()===y&&dt.getMonth()===m-1&&dt.getDate()===d?`${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`:'';}
  function parse(text,now=new Date()){
    const raw=text.trim();let customer='';
    const matched=raw.match(/(?:给|客人(?:叫|是)|客户(?:叫|是|姓名[：:]?)|for|customer\s*(?:is|named)?|client\s*(?:is|named)?)\s*([A-Za-z][A-Za-z'’-]*(?:\s+[A-Z][a-z'’-]+)?|[\u4e00-\u9fff]{2,8}?)(?=\s*(?:做|来|的|，|,|。|\s|$))/i);
    if(matched)customer=matched[1].trim().split(/\s+(?:bridal|wedding|event|photoshoot|trial|styling)\b/i)[0];
    if(!customer){const alias=raw.match(/\b(Amy|Jessica|Emily|Sarah|Alice|Jenny)\b|艾米|杰西卡|潔西卡|洁西卡/i);if(alias)customer=({'艾米':'Amy','杰西卡':'Jessica','潔西卡':'Jessica','洁西卡':'Jessica'}[alias[0]]||alias[0]);}
    let service='';
    if(/bridal\s*trial|试妆|試妝/i.test(raw))service='Bridal Trial';
    else if(/婚礼(?:当天|造型)|婚禮(?:當天|造型)|wedding[ -]?day\s*(?:styling|makeup)?/i.test(raw))service='Wedding-day Styling';
    else if(/活动造型|活動造型|event\s*(?:styling|makeup)/i.test(raw))service='Event Styling';
    else if(/拍摄|拍攝|photoshoot/i.test(raw))service='Photoshoot Styling';
    else if(/个人造型|個人造型|personal\s*styling/i.test(raw))service='Personal Styling';
    const preferences=[];
    if(/(?:喜欢|喜歡|想要|偏好)[^，。,.]{0,12}(?:自然|natural)|(?:natural\s*(?:makeup|look))/i.test(raw))preferences.push('自然妆感');
    if(/眼妆[^，。,.]{0,8}(?:不要太重|轻|輕)|light\s*eye\s*makeup/i.test(raw))preferences.push('眼妆轻一点');
    if(/轻薄(?:的)?底妆|底妆[^，。,.]{0,8}轻薄|lightweight\s*(?:base|foundation)/i.test(raw))preferences.push('轻薄底妆');
    if(/(?:喜欢|喜歡|想要|偏好)[^，。,.]{0,12}(?:冷调|冷調)|cool[ -]?toned/i.test(raw))preferences.push('冷调妆容');
    let weddingDate='',dateNote='';
    const wedding=raw.match(/(?:婚礼|婚禮|wedding)[^。;；]{0,80}/i);
    if(wedding){const part=wedding[0];
      const cn=part.match(/(?:([\d零〇一二三四五六七八九]{4})\s*年\s*)?([\d一二两三四五六七八九十]{1,3})\s*月\s*([\d一二两三四五六七八九十]{1,3})\s*[日号號]?/);
      const iso=part.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
      if(iso)weddingDate=dateValue(iso[1],iso[2],iso[3]);
      else if(cn){weddingDate=dateValue(cn[1]||String(now.getFullYear()),cn[2],cn[3]);if(!cn[1]&&weddingDate)dateNote='婚礼年份按今年补齐，请确认。';}
      else{const en=part.match(/(January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+(\d{1,2})(?:st|nd|rd|th)?(?:,?\s+(20\d{2}))?/i);if(en){const months=['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];weddingDate=dateValue(en[3]||String(now.getFullYear()),String(months.indexOf(en[1].slice(0,3).toLowerCase())+1),en[2]);if(!en[3])dateNote='婚礼年份按今年补齐，请确认。';}}
    }
    const needs=[];
    if(/妈妈[^。]{0,20}(?:可能|也要|需要)|母亲[^。]{0,20}(?:可能|也要|需要)|mother[^.]{0,35}(?:might|may|also|need)/i.test(raw))needs.push('妈妈造型（潜在需求，待确认）');
    if(/公司(?:年会|party)|公司活动|corporate\s*(?:party|event)/i.test(raw)){const m=raw.match(/([\d一二三四五六七八九十]{1,3})\s*月[^。]{0,18}(?:公司|年会)/);needs.push(`${m?number(m[1])+' 月':''}公司活动造型（待跟进）`);}
    const serviceDay=new Date(now);let dateAssumption='服务日期默认今天，请确认。';
    if(/昨天|yesterday/i.test(raw)){serviceDay.setDate(serviceDay.getDate()-1);dateAssumption='服务日期按昨天填写，请确认。';}
    const serviceExplicit=raw.match(/(?:服务日期|工作日期)[：:\s]*(20\d{2})[-/](\d{1,2})[-/](\d{1,2})/);
    let serviceDate=localDate(serviceDay);if(serviceExplicit){serviceDate=dateValue(...serviceExplicit.slice(1));dateAssumption='';}
    return {customer,service,serviceDate,weddingDate,preferences:preferences.join('；'),needs:needs.join('；'),raw,dateNote,dateAssumption};
  }
  const api={parse,localDate,examples};root.SculpyParser=api;if(typeof module!=='undefined')module.exports=api;
})(typeof window!=='undefined'?window:globalThis);
