(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  root.StockScannerCommercialFree=api;
}(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var STATE_SCHEMA='stock-scanner-commercial-state/v1';
  var PACK_SCHEMA='stock-scanner-research-pack/v1';
  var secretPattern=/(password\s*[:=]|api[_-]?key\s*[:=]|client[_-]?secret|private[_-]?key|bearer\s+[a-z0-9._-]{10,})/i;
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function text(value,limit){return String(value==null?'':value).trim().slice(0,limit);}
  function canonical(value){
    if(Array.isArray(value))return '['+value.map(canonical).join(',')+']';
    if(value&&typeof value==='object')return '{'+Object.keys(value).sort().map(function(key){return JSON.stringify(key)+':'+canonical(value[key]);}).join(',')+'}';
    return JSON.stringify(value);
  }
  function fingerprint(value){
    var input=canonical(value),hash=2166136261;
    for(var i=0;i<input.length;i++){hash^=input.charCodeAt(i);hash=Math.imul(hash,16777619);}
    return 'FNV1A-'+('00000000'+(hash>>>0).toString(16).toUpperCase()).slice(-8);
  }
  function isoDate(value){return /^\d{4}-\d{2}-\d{2}$/.test(String(value||''));}
  function validateContent(value){
    if(!value||value.schemaVersion!=='stock-scanner-commercial-free/v1')throw new Error('COMMERCIAL_CONTENT_SCHEMA');
    if(value.version!=='7.0'||value.dataMode!=='SYNTHETIC_ONLY'||value.serviceLevel!=='ADVANCED_FREE_COMMERCIAL')throw new Error('COMMERCIAL_CONTENT_BOUNDARY');
    if(!value.promise||!value.promise.ko||!value.promise.en||!value.promise.ja)throw new Error('COMMERCIAL_CONTENT_LOCALE');
    if(!Array.isArray(value.trustFacts)||value.trustFacts.length!==4)throw new Error('COMMERCIAL_TRUST_FACTS');
    if(!Array.isArray(value.completionChecklist)||value.completionChecklist.length!==8)throw new Error('COMMERCIAL_CHECKLIST');
    return copy(value);
  }
  function state(value){
    value=value&&typeof value==='object'?value:{};
    return {
      schemaVersion:STATE_SCHEMA,
      journal:Array.isArray(value.journal)?value.journal.slice(0,50).filter(function(x){return x&&x.id&&x.hypothesis&&x.disconfirm&&isoDate(x.nextCheck);}):[],
      packs:Array.isArray(value.packs)?value.packs.slice(0,20).filter(function(x){return verifyPack(x).valid;}):[],
      boundaryConfirmed:value.boundaryConfirmed===true,
      reviewedSections:Array.from(new Set(Array.isArray(value.reviewedSections)?value.reviewedSections:[])).slice(0,20)
    };
  }
  function addJournal(current,input){
    var next=state(current),hypothesis=text(input&&input.hypothesis,300),disconfirm=text(input&&input.disconfirm,300),nextCheck=text(input&&input.nextCheck,10),createdAt=text(input&&input.createdAt,30)||new Date().toISOString();
    if(next.journal.length>=50)throw new Error('JOURNAL_LIMIT_REACHED');
    if(hypothesis.length<10)throw new Error('JOURNAL_HYPOTHESIS_REQUIRED');
    if(disconfirm.length<10)throw new Error('JOURNAL_DISCONFIRM_REQUIRED');
    if(!isoDate(nextCheck))throw new Error('JOURNAL_NEXT_CHECK_REQUIRED');
    if(secretPattern.test(hypothesis+' '+disconfirm))throw new Error('JOURNAL_SECRET_REJECTED');
    var item={id:'JR-'+fingerprint({hypothesis:hypothesis,disconfirm:disconfirm,nextCheck:nextCheck,createdAt:createdAt}).slice(-8),hypothesis:hypothesis,disconfirm:disconfirm,nextCheck:nextCheck,createdAt:createdAt,reportRef:input.reportRef?copy(input.reportRef):null,status:'OPEN'};
    next.journal=[item].concat(next.journal).slice(0,50);
    return next;
  }
  function packPayload(input){
    var securityIds=Array.from(new Set((input.securityIds||[]).map(function(x){return text(x,80);}))).filter(Boolean);
    var methodIds=Array.from(new Set((input.methodIds||[]).map(function(x){return text(x,80);}))).filter(Boolean);
    if(securityIds.length<2||securityIds.length>4)throw new Error('PACK_SECURITY_COUNT');
    if(methodIds.length<3||methodIds.length>6)throw new Error('PACK_METHOD_COUNT');
    if(!Array.isArray(input.snapshots)||input.snapshots.length<securityIds.length||input.snapshots.length>20)throw new Error('PACK_SNAPSHOTS_REQUIRED');
    if(secretPattern.test(canonical(input)))throw new Error('PACK_SECRET_REJECTED');
    return {
      product:'Stock Scanner',releaseVersion:'7.0',dataMode:'SYNTHETIC_ONLY',createdAt:text(input.createdAt,30)||new Date().toISOString(),
      title:text(input.title,120)||'Advanced free research pack',goal:text(input.goal,200),asOf:text(input.asOf,10),horizon:text(input.horizon,8),
      securityIds:securityIds,methodIds:methodIds,snapshots:copy(input.snapshots),
      evidenceSummary:copy(input.evidenceSummary||{coverage:0,claims:0,corrections:0}),
      limitations:Array.from(new Set((input.limitations||[]).map(function(x){return text(x,240);}))).filter(Boolean).slice(0,12),
      journal:copy((input.journal||[]).slice(0,20)),
      disclaimer:'SYNTHETIC EXAMPLE ONLY — NOT A REAL-SECURITY FORECAST OR PERSONALIZED INVESTMENT ADVICE'
    };
  }
  function createPack(input){
    var payload=packPayload(input||{}),pack={schemaVersion:PACK_SCHEMA,payload:payload,fingerprintAlgorithm:'FNV1A-32-CANONICAL-NONCRYPTO',fingerprint:fingerprint(payload)};
    pack.verification={valid:true,checkedAt:payload.createdAt,meaning:'The fingerprint detects accidental or casual changes; it is not a cryptographic signature.'};
    return pack;
  }
  function verifyPack(pack){
    try{
      if(!pack||pack.schemaVersion!==PACK_SCHEMA||pack.fingerprintAlgorithm!=='FNV1A-32-CANONICAL-NONCRYPTO')return{valid:false,reason:'PACK_SCHEMA'};
      var payload=packPayload(pack.payload||{}),expected=fingerprint(payload);
      if(expected!==pack.fingerprint)return{valid:false,reason:'PACK_FINGERPRINT'};
      return{valid:true,reason:'MATCH',fingerprint:expected,payload:payload};
    }catch(error){return{valid:false,reason:error.message};}
  }
  function savePack(current,pack){
    var next=state(current),verified=verifyPack(pack);
    if(!verified.valid)throw new Error(verified.reason);
    next.packs=[copy(pack)].concat(next.packs.filter(function(x){return x.fingerprint!==pack.fingerprint;})).slice(0,20);
    return next;
  }
  function daysBetween(from,to){return Math.floor((Date.parse(to+'T00:00:00Z')-Date.parse(from+'T00:00:00Z'))/86400000);}
  function reviewQueue(advancedContent,asOf,maxAgeDays){
    var rows=[],today=isoDate(asOf)?asOf:new Date().toISOString().slice(0,10),limit=Number(maxAgeDays)||365;
    (advancedContent&&advancedContent.methodEvidence||[]).forEach(function(item){
      (item.sources||[]).forEach(function(source){
        var checkedAt=text(source.checkedAt,10),age=isoDate(checkedAt)?daysBetween(checkedAt,today):null,reasons=[];
        if(age===null)reasons.push('확인일 없음');else if(age>limit)reasons.push('근거 '+age+'일 경과');
        if(!source.allowedUse||source.allowedUse==='UNKNOWN')reasons.push('이용 권한 미확인');
        if(!Array.isArray(source.corrections))reasons.push('정정 이력 없음');
        if(reasons.length)rows.push({methodId:item.methodId,sourceId:source.id||source.url||'SOURCE',checkedAt:checkedAt||null,ageDays:age,reasons:reasons,status:'REVIEW'});
      });
    });
    return{asOf:today,maxAgeDays:limit,items:rows,clear:rows.length===0};
  }
  function checklist(current,context){
    var next=state(current),ids=context&&context.securityIds||[],methods=context&&context.methodIds||[],seen=new Set(next.reviewedSections);
    return [
      {id:'METHODS',pass:methods.length>=3},{id:'SECURITIES',pass:ids.length>=2},{id:'COUNTER',pass:seen.has('conflict')},
      {id:'REGIME',pass:seen.has('regimes')},{id:'SCENARIO',pass:seen.has('scenarios')},{id:'JOURNAL',pass:next.journal.length>0},
      {id:'PACK',pass:next.packs.length>0},{id:'BOUNDARY',pass:next.boundaryConfirmed}
    ];
  }
  function personaReport(content,count){
    validateContent(content);var population=Math.max(1,Math.min(1000,Number(count)||1000));
    return{schemaVersion:'stock-scanner-commercial-personas/v1',releaseVersion:'9.1',kind:'SYNTHETIC_PERSONAS_NOT_REAL_USERS',executionStatus:'NOT_EXECUTED',population:population,tasksPerPersona:10,plannedTasks:population*10,tasks:0,passed:0,failed:0,realUsers:0,limitation:'This function creates a coverage plan only. It does not execute user journeys or prove usability.',coverage:['onboarding','method-selection','counter-evidence','regime','scenario','journal','pack-create','pack-verify','offline-boundary','local-delete']};
  }
  return{STATE_SCHEMA:STATE_SCHEMA,PACK_SCHEMA:PACK_SCHEMA,canonical:canonical,fingerprint:fingerprint,validateContent:validateContent,state:state,addJournal:addJournal,createPack:createPack,verifyPack:verifyPack,savePack:savePack,reviewQueue:reviewQueue,checklist:checklist,personaReport:personaReport};
}));
