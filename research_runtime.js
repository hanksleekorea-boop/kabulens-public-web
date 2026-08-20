(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.KabuResearch=api;})(typeof globalThis!=='undefined'?globalThis:null,function(){
  'use strict';
  var FIXTURES=[
    {code:'7203',name:'토요타자동차',sector:'자동차',evidence:'고정 시험자료'},
    {code:'6758',name:'소니그룹',sector:'전자',evidence:'고정 시험자료'},
    {code:'9984',name:'소프트뱅크그룹',sector:'통신',evidence:'고정 시험자료'},
    {code:'9432',name:'NTT',sector:'통신',evidence:'고정 시험자료'},
    {code:'8306',name:'미쓰비시UFJ',sector:'금융',evidence:'고정 시험자료'}
  ];
  function filterRows(rows,value){value=value||{};var q=String(value.query||'').trim().toLowerCase(),sort=['code','name','sector'].indexOf(value.sort)>=0?value.sort:'code',direction=value.direction==='desc'?-1:1;return (rows||[]).filter(function(row){return !q||[row.code,row.name,row.sector].some(function(field){return String(field).toLowerCase().indexOf(q)>=0;});}).slice().sort(function(a,b){return String(a[sort]).localeCompare(String(b[sort]),'ko')*direction;});}
  function toggleCompare(codes,code){var next=Array.isArray(codes)?codes.slice(0,4):[],index=next.indexOf(code);if(index>=0){next.splice(index,1);return {codes:next,changed:true};}if(next.length>=4)return {codes:next,changed:false,error:'COMPARE_LIMIT'};next.push(code);return {codes:next,changed:true};}
  function savedSearch(value,now){value=value||{};var name=String(value.name||'').trim().slice(0,40);if(!name)return null;return {id:'search:'+String(now||Date.now()),name:name,query:String(value.query||'').trim().slice(0,40),sort:['code','name','sector'].indexOf(value.sort)>=0?value.sort:'code',direction:value.direction==='desc'?'desc':'asc',createdAt:new Date(now||Date.now()).toISOString()};}
  return {FIXTURES:FIXTURES,filterRows:filterRows,toggleCompare:toggleCompare,savedSearch:savedSearch};
});
