(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KabuEvidence=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  var REQUIRED=['sourceTitle','sourceAnchor','observedAt','calculationVersion','confidence','status'];
  var HOLD='보류';
  var MAX_AGE_DAYS=30;
  var STATES=['LOADING','EMPTY','READY','STALE','BLOCKED','ERROR','RECOVERY'];
  var LAUNCH_ENGINES=[['E02','회사 예상 신뢰도'],['E03','약속 이행'],['E04','약속 변경'],['E05','자사주 진행'],['E15','위험 문구 변경'],['E18','사업부 합계'],['E20','지배구조'],['E25','중기계획 진행']];
  function text(value){return String(value==null?'':value).trim();}
  function isoDay(value){return /^\d{4}-\d{2}-\d{2}$/.test(text(value));}
  function dayNumber(value){return Date.parse(text(value)+'T00:00:00Z');}
  function escapeHtml(value){return text(value).replace(/[&<>'"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});}
  function normalize(input,now){
    var card=Object.assign({status:HOLD,confidence:'미확인',holdReason:'근거 검토 전에는 판정을 공개하지 않습니다.'},input||{});
    var missing=REQUIRED.filter(function(key){return !text(card[key]);});
    if(!isoDay(card.observedAt))missing.push('observedAt');
    var unique=[...new Set(missing)],complete=unique.length===0;
    var state='READY',ageDays=null,reason='';
    if(!complete){state='MISSING_EVIDENCE';reason='필수 근거가 부족합니다.';}
    else if(card.sourceReachable===false){state='SOURCE_UNAVAILABLE';reason='원문 연결을 확인하지 못했습니다.';}
    else{
      ageDays=Math.floor((dayNumber(now||new Date().toISOString().slice(0,10))-dayNumber(card.observedAt))/86400000);
      if(!Number.isFinite(ageDays)||ageDays<0){state='MISSING_EVIDENCE';reason='확인일이 올바르지 않습니다.';}
      else if(ageDays>MAX_AGE_DAYS){state='STALE';reason='확인일이 '+MAX_AGE_DAYS+'일을 지났습니다.';}
    }
    if(state!=='READY'){card.status=HOLD;card.holdReason=reason;}
    return {card:card,complete:complete,missing:unique,state:state,ageDays:ageDays};
  }
  function render(input,now){
    var result=normalize(input,now),card=result.card;
    var detail=result.complete
      ? '<dl class="evidence-grid"><div><dt>원문</dt><dd>'+escapeHtml(card.sourceTitle)+'</dd></div><div><dt>원문 위치</dt><dd>'+escapeHtml(card.sourceAnchor)+'</dd></div><div><dt>확인일</dt><dd>'+escapeHtml(card.observedAt)+'</dd></div><div><dt>계산식 판</dt><dd>'+escapeHtml(card.calculationVersion)+'</dd></div><div><dt>신뢰도</dt><dd>'+escapeHtml(card.confidence)+'</dd></div></dl>'
      : '<p class="evidence hold">판정을 공개하지 않습니다. 빠진 근거: '+escapeHtml(result.missing.join(', '))+'.</p>';
    var sourceLink=result.state==='READY'&&/^https:\/\//.test(text(card.sourceUrl))?'<p><a href="'+escapeHtml(card.sourceUrl)+'" target="_blank" rel="noopener noreferrer">공식 원문 위치 열기</a></p>':'';
    var recovery=result.state==='SOURCE_UNAVAILABLE'?'<p class="evidence hold">원문 연결을 다시 확인하거나 공식 사이트에서 문서명을 검색하세요.</p>':'';
    return '<article class="evidence-card" tabindex="0" data-evidence-status="'+escapeHtml(card.status)+'" data-evidence-state="'+escapeHtml(result.state)+'"><span class="tag">근거 검토 · '+escapeHtml(card.verdictId||'E03')+'</span><h3>'+escapeHtml(card.title||'약속 이행 근거 카드')+'</h3><p class="score '+(card.status===HOLD?'warn':'up')+'">'+escapeHtml(card.status)+'</p>'+detail+sourceLink+recovery+'<p class="evidence">'+escapeHtml(card.holdReason||'')+'</p></article>';
  }
  function renderUiState(state,title){var normalized=STATES.indexOf(state)>=0?state:'ERROR',copy={LOADING:'근거를 불러오는 중입니다.',EMPTY:'아직 등록된 근거가 없습니다.',READY:'근거 검토가 완료됐습니다.',STALE:'근거 확인일이 오래되어 판정을 보류합니다.',BLOCKED:'사용권 또는 검토가 끝나지 않아 판정을 보류합니다.',ERROR:'근거를 읽지 못했습니다. 저장자료는 유지됩니다.',RECOVERY:'공식 원문을 다시 연결해 복구할 수 있습니다.'};return '<article class="evidence-card" tabindex="0" data-evidence-state="'+normalized+'"><span class="tag">'+normalized+'</span><h3>'+escapeHtml(title||'근거 상태')+'</h3><p class="evidence '+(normalized==='READY'?'':'hold')+'">'+copy[normalized]+'</p></article>';}
  function attach(doc){
    if(!doc||doc.getElementById('evidenceCard'))return false;
    var host=doc.querySelector('[data-screen="promises"]');
    if(!host)return false;
    var node=doc.createElement('section');
    node.id='evidenceCard';node.className='cards';node.setAttribute('aria-label','8개 출시 판정 근거 상태');
    node.innerHTML=LAUNCH_ENGINES.map(function(item){return render({verdictId:item[0],title:item[1]+' 판정',status:HOLD,confidence:'미확인',holdReason:'실제 공시·사용권·독립 검토가 끝나기 전에는 결과를 공개하지 않습니다.'});}).join('');
    host.appendChild(node);return true;
  }
  function ready(){if(typeof document==='undefined')return;var start=function(){attach(document);};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
  ready();return {REQUIRED:REQUIRED,HOLD:HOLD,MAX_AGE_DAYS:MAX_AGE_DAYS,STATES:STATES,LAUNCH_ENGINES:LAUNCH_ENGINES,normalize:normalize,render:render,renderUiState:renderUiState,attach:attach};
});
