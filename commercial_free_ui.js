(function(){
  'use strict';
  var Commercial=window.StockScannerCommercialFree,Advanced=window.StockScannerAdvanced,Scanner=window.StockScanner,KEY='stockscanner.commercial-free.v1';
  var content,advancedContent,currentPack,state=load();
  function el(id){return document.getElementById(id);}
  function esc(value){return String(value==null?'':value).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c];});}
  function load(){try{return Commercial.state(JSON.parse(localStorage.getItem(KEY)||'{}'));}catch(error){return Commercial.state();}}
  function persist(){localStorage.setItem(KEY,JSON.stringify(state));}
  function download(name,value){var link=document.createElement('a'),blob=new Blob([JSON.stringify(value,null,2)],{type:'application/json'});link.href=URL.createObjectURL(blob);link.download=name;document.body.appendChild(link);link.click();link.remove();setTimeout(function(){URL.revokeObjectURL(link.href);},0);}
  function selection(){
    var securities=el('advancedSecurities')?Array.from(el('advancedSecurities').selectedOptions).map(function(x){return x.value;}):[];
    var methods=Array.from(document.querySelectorAll('input[name="advancedMethod"]:checked')).map(function(x){return x.value;});
    return{securityIds:securities,methodIds:methods,horizon:el('advancedHorizon').value,asOf:el('advancedAsOf').value,goal:el('advancedGoal').value};
  }
  function advancedState(){try{return Advanced.state(JSON.parse(localStorage.getItem('stockscanner.advanced.v2')||'{}'));}catch(error){return Advanced.state();}}
  function evidenceSummary(snapshot){var value=Advanced.evidence(snapshot,advancedContent);return{coverage:value.coverage,claims:value.claims.length,corrections:value.corrections.length};}
  function makePack(){
    var selected=selection();
    if(selected.securityIds.length<2||selected.methodIds.length<3)throw new Error('합성 종목 2개 이상과 방법 3개 이상을 먼저 선택하세요.');
    var createdAt=new Date().toISOString(),snapshots=selected.securityIds.map(function(securityId){return Advanced.createSnapshot(Scanner,{securityId:securityId,methodIds:selected.methodIds,horizon:selected.horizon,asOf:selected.asOf,savedAt:createdAt,version:'7.0'});});
    return Commercial.createPack({title:'Stock Scanner advanced free research',goal:selected.goal,createdAt:createdAt,asOf:selected.asOf,horizon:selected.horizon,securityIds:selected.securityIds,methodIds:selected.methodIds,snapshots:snapshots,evidenceSummary:evidenceSummary(snapshots[0]),limitations:[content.boundary.ko,'일치 확인용 지문은 보안 서명이 아닙니다.'],journal:state.journal});
  }
  function renderTrust(){el('commercialPromise').textContent=content.promise.ko;el('commercialBoundary').textContent=content.boundary.ko;el('commercialTrustFacts').innerHTML=content.trustFacts.map(function(x){return'<article><small>'+esc(x.labelKo)+'</small><b>'+esc(x.valueKo)+'</b><p>'+esc(x.detailKo)+'</p></article>';}).join('');el('commercialBriefing').innerHTML=content.briefing.stepsKo.map(function(x){return'<li>'+esc(x)+'</li>';}).join('');}
  function renderJournal(){el('commercialJournalList').innerHTML=state.journal.length?state.journal.map(function(x){return'<li><b>'+esc(x.hypothesis)+'</b><span>틀림 조건: '+esc(x.disconfirm)+'</span><small>다음 확인 '+esc(x.nextCheck)+'</small></li>';}).join(''):'<li class="empty">아직 판단 기록이 없습니다.</li>';}
  function renderReview(){var queue=Commercial.reviewQueue(advancedContent,el('advancedAsOf').value,content.reviewPolicy.maxEvidenceAgeDays);el('commercialReviewStatus').textContent=queue.clear?'현재 자동 검토 대기 항목이 없습니다.':'검토 대기 '+queue.items.length+'건';el('commercialReviewQueue').innerHTML=queue.clear?'<li class="pass-item">확인일·이용권한·정정 이력 자동 점검 통과</li>':queue.items.map(function(x){return'<li><b>'+esc(x.methodId)+'</b><span>'+esc(x.reasons.join(' · '))+'</span></li>';}).join('');}
  function markSectionFromUrl(){var key=new URLSearchParams(location.search).get('research');if(['conflict','regimes','scenarios','evidence','timeline','commodity'].indexOf(key)>=0&&!state.reviewedSections.includes(key)){state.reviewedSections.push(key);persist();}}
  function renderChecklist(){var selected=selection(),rows=Commercial.checklist(state,selected),labels=new Map(content.completionChecklist.map(function(x){return[x.id,x.labelKo];}));var pass=rows.filter(function(x){return x.pass;}).length;el('commercialCompletion').textContent=pass+' / '+rows.length+' 완료';el('commercialChecklist').innerHTML=rows.map(function(x){return'<li class="'+(x.pass?'pass-item':'pending-item')+'"><span aria-hidden="true">'+(x.pass?'✓':'○')+'</span>'+esc(labels.get(x.id))+'</li>';}).join('');}
  function renderPack(){var pack=currentPack||state.packs[0],verified=pack?Commercial.verifyPack(pack):null;el('commercialPackStatus').textContent=!pack?'연구 묶음을 만들면 입력·결과·근거·한계가 한 파일에 저장됩니다.':verified.valid?'일치 확인 완료 · '+pack.fingerprint:'연구 묶음 불일치 · '+verified.reason;el('commercialDownloadPack').disabled=!(pack&&verified.valid);}
  function render(){renderTrust();renderJournal();renderReview();renderChecklist();renderPack();}
  function wire(){
    el('commercialBoundaryConfirm').addEventListener('change',function(){state.boundaryConfirmed=this.checked;persist();renderChecklist();});
    el('commercialJournalForm').addEventListener('submit',function(event){event.preventDefault();try{state=Commercial.addJournal(state,{hypothesis:el('commercialHypothesis').value,disconfirm:el('commercialDisconfirm').value,nextCheck:el('commercialNextCheck').value});persist();this.reset();el('commercialJournalStatus').textContent='판단과 반증 조건을 이 기기에 저장했습니다.';renderJournal();renderChecklist();}catch(error){el('commercialJournalStatus').textContent='저장하지 못했습니다: '+error.message;}});
    el('commercialBuildPack').addEventListener('click',function(){try{currentPack=makePack();state=Commercial.savePack(state,currentPack);persist();el('commercialPackStatus').textContent='연구 묶음을 만들었습니다.';renderPack();renderChecklist();}catch(error){el('commercialPackStatus').textContent=error.message;}});
    el('commercialDownloadPack').addEventListener('click',function(){var pack=currentPack||state.packs[0];if(pack)download('stock-scanner-research-pack-'+pack.fingerprint+'.json',pack);});
    el('commercialImportPack').addEventListener('change',function(){var file=this.files&&this.files[0];if(!file)return;if(file.size>2*1024*1024){el('commercialPackStatus').textContent='2MB 이하 연구 묶음만 확인할 수 있습니다.';this.value='';return;}file.text().then(function(raw){var pack=JSON.parse(raw),verified=Commercial.verifyPack(pack);if(!verified.valid)throw new Error(verified.reason);currentPack=pack;state=Commercial.savePack(state,pack);persist();renderPack();renderChecklist();}).catch(function(error){el('commercialPackStatus').textContent='안전한 연구 묶음이 아닙니다: '+error.message;});});
    el('commercialCopySummary').addEventListener('click',function(){var pack=currentPack||state.packs[0];if(!pack){el('commercialPackStatus').textContent='먼저 연구 묶음을 만드세요.';return;}var text='Stock Scanner '+pack.payload.dataMode+' · '+pack.payload.securityIds.length+' securities · '+pack.payload.methodIds.length+' methods · '+pack.fingerprint;navigator.clipboard?navigator.clipboard.writeText(text).then(function(){el('commercialPackStatus').textContent='개인정보 없는 연구 요약을 복사했습니다.';}):el('commercialPackStatus').textContent='이 브라우저에서는 복사를 사용할 수 없습니다.';});
    ['advancedRun','advancedSaveSnapshot'].forEach(function(id){el(id).addEventListener('click',function(){setTimeout(function(){renderReview();renderChecklist();},0);});});
    el('deleteLocalData').addEventListener('click',function(){setTimeout(function(){if(/삭제했습니다/.test(el('localDataStatus').textContent)){localStorage.removeItem(KEY);state=Commercial.state();currentPack=null;render();}},0);});
    document.querySelectorAll('.advanced-jump a').forEach(function(link){link.addEventListener('click',function(){var key=new URL(link.href).searchParams.get('research');if(key&&!state.reviewedSections.includes(key)){state.reviewedSections.push(key);persist();renderChecklist();}});});
    window.addEventListener('stockscanner-delete-all',function(){localStorage.removeItem(KEY);state=Commercial.state();currentPack=null;render();});
  }
  function init(values){content=Commercial.validateContent(values[0]);advancedContent=Advanced.validateContent(values[1]);markSectionFromUrl();el('commercialBoundaryConfirm').checked=state.boundaryConfirmed;wire();render();setTimeout(renderChecklist,250);setTimeout(renderChecklist,1000);if(new URLSearchParams(location.search).get('research')==='desk')setTimeout(function(){el('commercialLaunchDesk').focus({preventScroll:false});},100);}
  function initWhenAdvancedReady(values){if(window.StockScannerAdvancedUIReady){init(values);return;}window.addEventListener('stockscanner-advanced-ready',function(){init(values);},{once:true});}
  function start(){Promise.all([fetch('./commercial_free_v1.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('COMMERCIAL_CONTENT_FETCH');return r.json();}),fetch('./advanced_research_v2.json',{cache:'no-cache'}).then(function(r){if(!r.ok)throw new Error('ADVANCED_CONTENT_FETCH');return r.json();})]).then(initWhenAdvancedReady).catch(function(error){if(el('commercialPackStatus'))el('commercialPackStatus').textContent='무료 고급 연구 데스크를 불러오지 못했습니다: '+error.message;console.error(error);});}
  var started=false;
  function requested(){return location.hash==='#reports'||new URLSearchParams(location.search).has('research');}
  function startOnce(){if(started)return;started=true;window.removeEventListener('hashchange',startWhenRequested);start();}
  function startWhenRequested(){if(requested())startOnce();}
  function schedule(){startWhenRequested();if(!started)window.addEventListener('hashchange',startWhenRequested);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',schedule);else schedule();
}());
