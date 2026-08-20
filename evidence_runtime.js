(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root)root.KabuEvidence=api;
})(typeof globalThis!=='undefined'?globalThis:null,function(){
  var REQUIRED=['sourceTitle','sourceAnchor','observedAt','calculationVersion','confidence','status'];
  var HOLD='보류';
  function text(value){return String(value==null?'':value).trim();}
  function isoDay(value){return /^\d{4}-\d{2}-\d{2}$/.test(text(value));}
  function escapeHtml(value){return text(value).replace(/[&<>'"]/g,function(char){return {'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[char];});}
  function normalize(input){
    var card=Object.assign({status:HOLD,confidence:'미확인',holdReason:'근거 검토 전에는 판정을 공개하지 않습니다.'},input||{});
    var missing=REQUIRED.filter(function(key){return !text(card[key]);});
    if(!isoDay(card.observedAt))missing.push('observedAt');
    var unique=[...new Set(missing)],complete=unique.length===0;
    if(!complete){card.status=HOLD;card.holdReason=card.holdReason||'필수 근거가 부족합니다.';}
    return {card:card,complete:complete,missing:unique};
  }
  function render(input){
    var result=normalize(input),card=result.card;
    var detail=result.complete
      ? '<dl class="evidence-grid"><div><dt>원문</dt><dd>'+escapeHtml(card.sourceTitle)+'</dd></div><div><dt>원문 위치</dt><dd>'+escapeHtml(card.sourceAnchor)+'</dd></div><div><dt>확인일</dt><dd>'+escapeHtml(card.observedAt)+'</dd></div><div><dt>계산식 판</dt><dd>'+escapeHtml(card.calculationVersion)+'</dd></div><div><dt>신뢰도</dt><dd>'+escapeHtml(card.confidence)+'</dd></div></dl>'
      : '<p class="evidence hold">판정을 공개하지 않습니다. 빠진 근거: '+escapeHtml(result.missing.join(', '))+'.</p>';
    return '<article class="evidence-card" data-evidence-status="'+escapeHtml(card.status)+'"><span class="tag">근거 검토 · '+escapeHtml(card.verdictId||'E03')+'</span><h3>'+escapeHtml(card.title||'약속 이행 근거 카드')+'</h3><p class="score '+(card.status===HOLD?'warn':'up')+'">'+escapeHtml(card.status)+'</p>'+detail+'<p class="evidence">'+escapeHtml(card.holdReason||'')+'</p></article>';
  }
  function attach(doc){
    if(!doc||doc.getElementById('evidenceCard'))return false;
    var host=doc.querySelector('[data-screen="promises"]');
    if(!host)return false;
    var node=doc.createElement('section');
    node.id='evidenceCard';node.className='cards';node.setAttribute('aria-label','약속 이행 근거 상태');
    node.innerHTML=render({verdictId:'E03',title:'약속 이행 판정',status:HOLD,confidence:'미확인',holdReason:'실제 공시 문서 30건의 이중 검토 전에는 예시 수치나 색상으로 이행 여부를 단정하지 않습니다.'});
    host.appendChild(node);return true;
  }
  function ready(){if(typeof document==='undefined')return;var start=function(){attach(document);};if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();}
  ready();return {REQUIRED:REQUIRED,HOLD:HOLD,normalize:normalize,render:render,attach:attach};
});
