(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KabuPc=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var ROUTES=[
    ['today','오늘'],['search','기업찾기'],['company','기업'],['watchlist','관심'],
    ['portfolio','보유'],['disclosures','공시'],['promises','약속'],['capital','자본'],
    ['benefits','우대'],['import','내 CSV'],['settings','설정'],['safety','자료보호']
  ];
  function filterRoutes(query){var q=String(query||'').trim().toLowerCase();return ROUTES.filter(function(item){return !q||item[0].indexOf(q)>=0||item[1].toLowerCase().indexOf(q)>=0;});}
  function shortcut(event){var key=String(event.key||'').toLowerCase();if((event.ctrlKey||event.metaKey)&&!event.shiftKey&&key==='k')return {type:'command'};if(event.ctrlKey&&event.shiftKey&&key==='l')return {type:'privacy'};if(event.altKey&&!event.ctrlKey&&!event.metaKey&&/^[1-9]$/.test(key))return {type:'route',route:ROUTES[Number(key)-1][0]};return null;}
  function capabilities(value){return [
    ['로컬 저장',value.storage===true],['오프라인 준비',value.worker===true],
    ['백업 파일',value.file===true],['대화상자',value.dialog===true]
  ];}
  return {ROUTES:ROUTES,filterRoutes:filterRoutes,shortcut:shortcut,capabilities:capabilities};
});
