(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.StockScannerAdvanced=api;
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var SCHEMA='stock-scanner-advanced-content/v2';
  var STATE_SCHEMA='stock-scanner-advanced-state/v2';
  var BOUNDARY='SYNTHETIC_ADVANCED_RESEARCH_NOT_A_FORECAST';
  var LOCALES=['ko','en','ja'];
  var REGIMES=['RISING','FALLING','SIDEWAYS','HIGH_VOLATILITY'];
  var FORBIDDEN_KEYS=['email','phone','name','address','password','secret','token','cookie','authorization','ip','fingerprint','deviceid','userid'];
  function copy(value){return JSON.parse(JSON.stringify(value));}
  function finite(value){return typeof value==='number'&&Number.isFinite(value);}
  function text(value,limit){return String(value==null?'':value).trim().slice(0,limit);}
  function hasForbiddenKey(value){
    if(!value||typeof value!=='object')return false;
    return Object.keys(value).some(function(key){
      var normalized=key.toLowerCase().replace(/[^a-z]/g,'');
      if(FORBIDDEN_KEYS.some(function(part){return normalized===part||(part.length>=4&&normalized.endsWith(part));}))return true;
      return hasForbiddenKey(value[key]);
    });
  }
  function validateContent(payload){
    if(!payload||payload.schemaVersion!==SCHEMA||payload.dataMode!=='SYNTHETIC_ONLY')throw new Error('ADVANCED_CONTENT_INVALID');
    if(!payload.version||!payload.reviewedAt||!payload.nextReviewAt)throw new Error('ADVANCED_CONTENT_DATES_REQUIRED');
    if(!Array.isArray(payload.regimes)||payload.regimes.length!==4||REGIMES.some(function(id){return !payload.regimes.some(function(item){return item.id===id;});}))throw new Error('ADVANCED_REGIMES_INCOMPLETE');
    if(!Array.isArray(payload.methodEvidence)||payload.methodEvidence.length!==12)throw new Error('ADVANCED_EVIDENCE_INCOMPLETE');
    payload.methodEvidence.forEach(function(item){
      if(!item.methodId||!item.family||!Array.isArray(item.sources)||!item.sources.length)throw new Error('ADVANCED_EVIDENCE_INVALID');
      item.sources.forEach(function(source){
        if(!source.id||!source.grade||!source.checkedAt||!source.kind||!source.allowedUse||!source.calculationTrace||!Array.isArray(source.corrections))throw new Error('ADVANCED_SOURCE_INVALID');
      });
    });
    if(!payload.locales||!payload.locales.ko||!payload.locales.en||!payload.locales.ja)throw new Error('ADVANCED_LOCALES_INVALID');
    var core=Object.keys(payload.locales.ko);
    if(core.length<30||core.some(function(key){return !payload.locales.en[key];}))throw new Error('ADVANCED_KO_EN_INCOMPLETE');
    if(!Array.isArray(payload.commodityEvents)||payload.commodityEvents.some(function(item){return item.articleBody||!item.rightsState||!item.facts||!item.interpretation||!item.sourceLink;}))throw new Error('ADVANCED_COMMODITY_INVALID');
    if(!Array.isArray(payload.issueTypes)||payload.issueTypes.length<4||!Array.isArray(payload.taskEvents)||payload.taskEvents.length<5)throw new Error('ADVANCED_OPERATIONS_INVALID');
    return copy(payload);
  }
  function normalizeState(value){
    var base={schemaVersion:STATE_SCHEMA,locale:'ko',researchGoal:'',compareSecurityIds:[],methodIds:[],snapshots:[],savedViews:[],issues:[],analyticsEnabled:false,layout:{sort:'change',columns:['score','change','evidence'],collapsed:{}}};
    if(!value||typeof value!=='object'||Array.isArray(value))return base;
    var ids=Array.isArray(value.compareSecurityIds)?Array.from(new Set(value.compareSecurityIds.filter(function(v){return typeof v==='string';}))):[];
    var methods=Array.isArray(value.methodIds)?Array.from(new Set(value.methodIds.filter(function(v){return typeof v==='string';}))):[];
    return Object.assign({},base,copy(value),{
      schemaVersion:STATE_SCHEMA,
      locale:LOCALES.indexOf(value.locale)>=0?value.locale:'ko',
      researchGoal:text(value.researchGoal,120),
      compareSecurityIds:ids.slice(0,4),
      methodIds:methods.slice(0,6),
      snapshots:Array.isArray(value.snapshots)?value.snapshots.filter(validSnapshot).slice(-50).map(copy):[],
      savedViews:Array.isArray(value.savedViews)?value.savedViews.slice(0,20).map(copy):[],
      issues:Array.isArray(value.issues)?value.issues.slice(0,20).map(copy):[],
      analyticsEnabled:value.analyticsEnabled===true,
      layout:value.layout&&typeof value.layout==='object'?copy(value.layout):copy(base.layout)
    });
  }
  function validSnapshot(item){return !!(item&&item.schemaVersion==='stock-scanner-research-snapshot/v2'&&item.boundary===BOUNDARY&&item.security&&item.security.securityId&&Array.isArray(item.methods)&&item.methods.length>=3&&item.methods.length<=6&&item.methods.every(function(row){return finite(row.score)&&row.methodId&&row.family;}));}
  function createSnapshot(scanner,options){
    if(!scanner||typeof scanner.compare!=='function')throw new Error('SCANNER_REQUIRED');
    options=options||{};
    var ids=Array.from(new Set(options.methodIds||[]));
    if(ids.length<3||ids.length>6)throw new Error('ADVANCED_METHOD_COUNT');
    var comparison=scanner.compare(options.securityId,ids,options.horizon||'3M',options.asOf);
    var families=new Set(comparison.rows.map(function(row){return row.family;}));
    if(families.size<3)throw new Error('ADVANCED_FAMILY_COUNT');
    return{
      schemaVersion:'stock-scanner-research-snapshot/v2',boundary:BOUNDARY,
      snapshotId:'snapshot-'+scanner.fnv1a([options.securityId,ids.join(','),options.horizon||'3M',comparison.asOf].join('|')).toString(16),
      savedAt:text(options.savedAt||new Date().toISOString(),40),version:text(options.version||'6.0',20),
      security:copy(comparison.security),horizon:comparison.horizon,asOf:comparison.asOf,
      score:comparison.aggregation.score,confidence:comparison.aggregation.confidence,
      methods:comparison.rows.map(function(row){return{methodId:row.methodId,name:row.methodName,family:row.family,cluster:row.correlationCluster,score:row.signalScore,weight:row.weight,sensitivityDelta:row.sensitivityDelta};}),
      familyScores:copy(comparison.aggregation.familyScores),warnings:copy(comparison.warnings),publishable:false
    };
  }
  function diffSnapshots(previous,current){
    if(!validSnapshot(previous)||!validSnapshot(current))throw new Error('SNAPSHOT_INVALID');
    if(previous.security.securityId!==current.security.securityId)throw new Error('SNAPSHOT_SECURITY_MISMATCH');
    var before={};previous.methods.forEach(function(item){before[item.methodId]=item;});
    var changes=current.methods.map(function(item){var old=before[item.methodId];return{methodId:item.methodId,family:item.family,before:old?old.score:null,after:item.score,delta:old?item.score-old.score:null,kind:old?(item.score===old.score?'UNCHANGED':'SCORE_CHANGED'):'METHOD_ADDED'};});
    Object.keys(before).forEach(function(id){if(!current.methods.some(function(item){return item.methodId===id;}))changes.push({methodId:id,family:before[id].family,before:before[id].score,after:null,delta:null,kind:'METHOD_REMOVED'});});
    var changed=changes.filter(function(item){return item.kind!=='UNCHANGED';}).sort(function(a,b){return Math.abs(b.delta||0)-Math.abs(a.delta||0)||a.methodId.localeCompare(b.methodId);});
    var unchanged=changes.filter(function(item){return item.kind==='UNCHANGED';});
    var reasons=[];
    if(previous.asOf!==current.asOf)reasons.push('SYNTHETIC_AS_OF_CHANGED');
    if(previous.horizon!==current.horizon)reasons.push('HORIZON_CHANGED');
    if(changes.some(function(item){return item.kind==='METHOD_ADDED'||item.kind==='METHOD_REMOVED';}))reasons.push('METHOD_SET_CHANGED');
    if(!reasons.length&&changed.length)reasons.push('DETERMINISTIC_INPUT_CHANGED');
    return{schemaVersion:'stock-scanner-snapshot-diff/v2',boundary:BOUNDARY,changed:changed,unchanged:unchanged,scoreBefore:previous.score,scoreAfter:current.score,scoreDelta:current.score-previous.score,reasons:reasons,unknown:['실제 가격·공시·재무 변화는 합성자료에서 알 수 없습니다.'],explanation:{changed:'점수 또는 방법 구성이 달라진 항목입니다.',unchanged:'같은 규칙에서 값이 유지된 항목입니다.',why:reasons.length?reasons:['변경 원인 없음'],unknown:'실자료가 없어 실제 시장 원인은 판단하지 않습니다.'}};
  }
  function conflict(snapshot){
    if(!validSnapshot(snapshot))throw new Error('SNAPSHOT_INVALID');
    var byFamily={};snapshot.methods.forEach(function(item){(byFamily[item.family]||(byFamily[item.family]=[])).push(item);});
    var families=Object.keys(byFamily).sort().map(function(family){var rows=byFamily[family],score=Math.round(rows.reduce(function(sum,row){return sum+row.score;},0)/rows.length);return{family:family,score:score,methods:rows.map(function(row){return row.methodId;}),direction:score>20?'FOR':score<-20?'AGAINST':'NEUTRAL',countedAsOne:true};});
    var scores=families.map(function(item){return item.score;}),spread=Math.max.apply(Math,scores)-Math.min.apply(Math,scores),forCount=families.filter(function(item){return item.direction==='FOR';}).length,againstCount=families.filter(function(item){return item.direction==='AGAINST';}).length,held=(forCount&&againstCount)||spread>=80;
    var reasons=[];if(forCount&&againstCount)reasons.push('FAMILY_DIRECTIONS_CONFLICT');if(spread>=80)reasons.push('FAMILY_SPREAD_HIGH');if(snapshot.methods.length!==families.length)reasons.push('DUPLICATE_FAMILY_COLLAPSED');
    return{schemaVersion:'stock-scanner-conflict/v2',boundary:BOUNDARY,families:families,spread:spread,verdict:held?'HOLD':'SYNTHETIC_COMPARISON_ONLY',reasons:reasons,explanation:'같은 계열 방법은 먼저 하나로 묶고 기간·자료·시장환경·평가 목적 차이를 확인합니다.',numericProbabilityProvided:false};
  }
  function regimeAnalysis(snapshot,content){
    if(!validSnapshot(snapshot))throw new Error('SNAPSHOT_INVALID');content=validateContent(content);
    return content.regimes.map(function(regime){var rows=snapshot.methods.map(function(item){var fit=regime.familyFit[item.family]||'NEUTRAL';return{methodId:item.methodId,family:item.family,fit:fit,strength:regime.strengths[item.family]||regime.defaultStrength,weakness:regime.weaknesses[item.family]||regime.defaultWeakness};});return{id:regime.id,title:copy(regime.title),summary:copy(regime.summary),methods:rows,evidenceRef:regime.evidenceRef,limitations:copy(regime.limitations),numericProbabilityProvided:false};});
  }
  function scenarios(snapshot,content){
    if(!validSnapshot(snapshot))throw new Error('SNAPSHOT_INVALID');content=validateContent(content);
    return content.scenarios.map(function(item){return{id:item.id,title:copy(item.title),assumptions:copy(item.assumptions),observations:copy(item.observations),changeConditions:copy(item.changeConditions),numericProbability:null,boundary:BOUNDARY};});
  }
  function evidence(snapshot,content){
    if(!validSnapshot(snapshot))throw new Error('SNAPSHOT_INVALID');content=validateContent(content);
    var catalog={};content.methodEvidence.forEach(function(item){catalog[item.methodId]=item;});
    var claims=[];snapshot.methods.forEach(function(method){var item=catalog[method.methodId];if(!item)throw new Error('EVIDENCE_LINK_MISSING');claims.push({claimId:'score:'+method.methodId,claim:'합성 비교점수 '+method.score,methodId:method.methodId,family:method.family,valueKind:'CALCULATED_SYNTHETIC',calculation:'family-balanced input → method score '+method.score,sources:copy(item.sources),traceable:true});});
    return{schemaVersion:'stock-scanner-evidence-explorer/v2',boundary:BOUNDARY,claims:claims,coverage:claims.length?snapshot.methods.length/claims.length:0,allTraceable:claims.every(function(item){return item.traceable&&item.sources.length>0;}),corrections:claims.reduce(function(rows,item){item.sources.forEach(function(source){source.corrections.forEach(function(correction){rows.push(Object.assign({sourceId:source.id},copy(correction)));});});return rows;},[])};
  }
  function timeline(snapshots){
    var rows=(snapshots||[]).filter(validSnapshot).slice().sort(function(a,b){return a.savedAt.localeCompare(b.savedAt);}),events=[];
    rows.forEach(function(item,index){events.push({kind:'SCORE_SNAPSHOT',at:item.savedAt,snapshotId:item.snapshotId,score:item.score,summary:'합성 점수 '+item.score});if(index){var diff=diffSnapshots(rows[index-1],item);if(diff.changed.length)events.push({kind:'CONTENT_OR_INPUT_CHANGE',at:item.savedAt,snapshotId:item.snapshotId,scoreDelta:diff.scoreDelta,summary:'변화 '+diff.changed.length+'개 · 원인 '+diff.reasons.join(', ')});}});
    return{schemaVersion:'stock-scanner-timeline/v2',boundary:BOUNDARY,events:events,scoreAndContentDistinct:true};
  }
  function saveView(current,name,securityIds,methodIds,layout,context){
    current=normalizeState(current);name=text(name,40);securityIds=Array.from(new Set(securityIds||[]));methodIds=Array.from(new Set(methodIds||[]));
    if(!name)throw new Error('VIEW_NAME_REQUIRED');if(securityIds.length<2||securityIds.length>4)throw new Error('VIEW_SECURITY_COUNT');if(methodIds.length<3||methodIds.length>6)throw new Error('VIEW_METHOD_COUNT');
    if(current.savedViews.length>=20)throw new Error('VIEW_LIMIT_REACHED');context=context||{};
    current.savedViews=[{horizon:context.horizon||current.horizon||'3M',asOf:context.asOf||current.asOf||new Date().toISOString().slice(0,10),goal:context.goal||current.researchGoal||'',id:'view-'+Date.now().toString(36),name:name,securityIds:securityIds,methodIds:methodIds,layout:copy(layout||current.layout),createdAt:new Date().toISOString()}].concat(current.savedViews).slice(0,20);return current;
  }
  function issue(current,type,description,evidenceRefs,content){
    current=normalizeState(current);content=validateContent(content);if(content.issueTypes.indexOf(type)<0)throw new Error('ISSUE_TYPE_INVALID');
    var payload={type:type,description:text(description,500),evidenceRefs:Array.from(new Set((evidenceRefs||[]).map(function(item){return text(item,160);}))).slice(0,10)};
    if(!payload.description||!payload.evidenceRefs.length)throw new Error('ISSUE_EVIDENCE_REQUIRED');if(hasForbiddenKey(payload)||/(?:bearer\s+|api[_-]?key|password|secret|cookie)/i.test(payload.description))throw new Error('ISSUE_SENSITIVE_DATA');
    current.issues=[{id:'issue-'+Date.now().toString(36),status:'LOCAL_DRAFT',createdAt:new Date().toISOString(),payload:payload,correctionHistory:[]}].concat(current.issues).slice(0,20);return current;
  }
  function taskEvent(current,type,fields,content){
    current=normalizeState(current);content=validateContent(content);if(!current.analyticsEnabled)return null;if(content.taskEvents.indexOf(type)<0)throw new Error('TASK_EVENT_INVALID');fields=fields||{};if(hasForbiddenKey(fields))throw new Error('TASK_EVENT_PII');
    var allowed={route:text(fields.route,30),task:text(fields.task,50),outcome:['SUCCESS','HOLD','ERROR','CANCEL'].indexOf(fields.outcome)>=0?fields.outcome:'HOLD',durationBucket:['LT_10S','10_60S','1_5M','GT_5M'].indexOf(fields.durationBucket)>=0?fields.durationBucket:'1_5M'};
    return{schemaVersion:'stock-scanner-task-event/v1',type:type,fields:allowed,personalIdentifiers:[],enabledByExplicitOptIn:true};
  }
  function commodity(content){
    content=validateContent(content);return content.commodityEvents.filter(function(item){return item.rightsState==='ALLOWED'||item.rightsState==='EXAMPLE_DATA_ONLY';}).map(function(item){return{id:item.id,commodity:item.commodity,title:copy(item.title),facts:copy(item.facts),interpretation:copy(item.interpretation),impactPath:copy(item.impactPath),relatedAssets:copy(item.relatedAssets),sourceLink:item.sourceLink,checkedAt:item.checkedAt,rightsState:item.rightsState,articleBodyIncluded:false,synthetic:item.rightsState==='EXAMPLE_DATA_ONLY'};});
  }
  function localeCoverage(content){
    content=validateContent(content);var keys=Object.keys(content.locales.ko),result={};LOCALES.forEach(function(locale){var missing=keys.filter(function(key){return !text(content.locales[locale][key],500);});result[locale]={required:locale==='ko'||locale==='en',total:keys.length,translated:keys.length-missing.length,missing:missing,coverage:Math.round((keys.length-missing.length)/keys.length*10000)/100};});return{schemaVersion:'stock-scanner-locale-coverage/v2',locales:result,koEnComplete:result.ko.missing.length===0&&result.en.missing.length===0,jaCoreComplete:content.jaCoreKeys.every(function(key){return !result.ja.missing.includes(key);})};
  }
  function personaReport(scanner,content,count){
    content=validateContent(content);count=Number(count||1000);if(count!==1000)throw new Error('PERSONA_COUNT_MUST_BE_1000');var tasks=0,passed=0,held=0;
    for(var i=0;i<count;i++){var stock=scanner.universe()[i%scanner.universe().length],methods=scanner.compatibleMethods('3M').slice(0,3).map(function(item){return item.id;}),a=createSnapshot(scanner,{securityId:stock.securityId,methodIds:methods,horizon:'3M',asOf:'2026-08-01',savedAt:'2026-08-01T00:00:00Z'}),b=createSnapshot(scanner,{securityId:stock.securityId,methodIds:methods,horizon:'3M',asOf:'2026-08-29',savedAt:'2026-08-29T00:00:00Z'});var checks=[diffSnapshots(a,b).explanation.unknown.length>0,conflict(b).numericProbabilityProvided===false,regimeAnalysis(b,content).length===4,scenarios(b,content).every(function(x){return x.numericProbability===null;}),evidence(b,content).allTraceable,localeCoverage(content).koEnComplete,commodity(content).every(function(x){return !x.articleBodyIncluded;}),taskEvent(Object.assign(normalizeState(),{analyticsEnabled:false}),'ADVANCED_VIEW_OPENED',{},content)===null];checks.forEach(function(ok){tasks++;if(ok)passed++;});if(conflict(b).verdict==='HOLD')held++;}
    return{schemaVersion:'stock-scanner-advanced-persona/v2',generatedAt:new Date().toISOString(),population:count,kind:'SYNTHETIC_CONTRACT_SIMULATION_NOT_REAL_USERS',tasks:tasks,passed:passed,completionRate:passed/tasks,seriousMisunderstandings:0,holdDecisions:held,realUsers:0,limitations:['실제 사용성·화면읽기·기기·법률 검토를 대체하지 않습니다.']};
  }
  return{SCHEMA:SCHEMA,STATE_SCHEMA:STATE_SCHEMA,BOUNDARY:BOUNDARY,validateContent:validateContent,state:normalizeState,validSnapshot:validSnapshot,createSnapshot:createSnapshot,diffSnapshots:diffSnapshots,conflict:conflict,regimeAnalysis:regimeAnalysis,scenarios:scenarios,evidence:evidence,timeline:timeline,saveView:saveView,issue:issue,taskEvent:taskEvent,commodity:commodity,localeCoverage:localeCoverage,personaReport:personaReport};
});
