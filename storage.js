(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KabuStorage=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var KEY='kabulens.user.v7', LEGACY=['kabulens.user.v6','kabulens.user.v5','kabulens.user.v4','kabulens.user.v3','kabulens.user.v2','kabulens.user.v1'];
  function cleanList(value){return Array.isArray(value)?value.filter(function(x){return typeof x==='string'&&/^[0-9A-Z]{4,5}$/.test(x);}).slice(0,200):[];}
  function cleanSearches(value){return Array.isArray(value)?value.filter(function(x){return x&&typeof x==='object'&&typeof x.id==='string'&&typeof x.name==='string';}).map(function(x){return {id:x.id.slice(0,64),name:x.name.trim().slice(0,40),query:String(x.query||'').trim().slice(0,40),sort:['code','name','sector'].indexOf(x.sort)>=0?x.sort:'code',direction:x.direction==='desc'?'desc':'asc',createdAt:String(x.createdAt||'').slice(0,24)};}).filter(function(x){return x.id&&x.name;}).slice(0,50):[];}
  function cleanResearchNotes(value){var output={};if(!value||typeof value!=='object'||Array.isArray(value))return output;Object.keys(value).slice(0,200).forEach(function(code){if(/^[0-9A-Z]{4,5}$/.test(code)&&typeof value[code]==='string')output[code]=value[code].slice(0,500);});return output;}
  function fresh(){return {schemaVersion:7,watchlist:[],positions:[],savedSearches:[],compareCodes:[],selectedResearchCode:'',researchNotes:{},settings:{largeText:false,reduceMotion:false,highContrast:false,compactView:false},unknown:{}};}
  function migrate(raw){
    var source=raw&&typeof raw==='object'?raw:{};var next=fresh();
    next.watchlist=cleanList(source.watchlist||source.favorites);
    next.positions=Array.isArray(source.positions)?source.positions.filter(function(x){return x&&/^[0-9A-Z]{4,5}$/.test(String(x.code||''));}).map(function(x){return {code:String(x.code),memo:String(x.memo||'').slice(0,80)};}).slice(0,200):[];
    next.savedSearches=cleanSearches(source.savedSearches);next.compareCodes=cleanList(source.compareCodes).slice(0,4);next.selectedResearchCode=/^[0-9A-Z]{4,5}$/.test(String(source.selectedResearchCode||''))?String(source.selectedResearchCode):'';next.researchNotes=cleanResearchNotes(source.researchNotes);
    if(source.settings&&typeof source.settings==='object'){next.settings.largeText=source.settings.largeText===true;next.settings.reduceMotion=source.settings.reduceMotion===true;next.settings.highContrast=source.settings.highContrast===true;next.settings.compactView=source.settings.compactView===true;var extra={};Object.keys(source.settings).forEach(function(k){if(!Object.prototype.hasOwnProperty.call(next.settings,k))extra[k]=source.settings[k];});if(Object.keys(extra).length)next.unknown.settings=extra;}
    Object.keys(source).forEach(function(k){if(['schemaVersion','watchlist','favorites','positions','savedSearches','compareCodes','selectedResearchCode','researchNotes','settings','unknown'].indexOf(k)<0)next.unknown[k]=source[k];});
    if(source.unknown&&typeof source.unknown==='object')Object.assign(next.unknown,source.unknown);
    return next;
  }
  function load(store){var value=null,key=KEY;try{value=store.getItem(KEY);if(!value){for(var i=0;i<LEGACY.length;i++){value=store.getItem(LEGACY[i]);if(value){key=LEGACY[i];break;}}}var parsed=value?JSON.parse(value):fresh();var next=migrate(parsed);store.setItem(KEY,JSON.stringify(next));return {data:next,migratedFrom:key===KEY?null:key,error:null,recovery:null};}catch(err){return {data:fresh(),migratedFrom:null,error:'STORAGE_RECOVERED_WITHOUT_OVERWRITE',recovery:typeof value==='string'?{key:key,raw:value}:null};}}
  function save(store,data){var next=migrate(data);store.setItem(KEY,JSON.stringify(next));return next;}
  function restore(store,text){var parsed=JSON.parse(text);if(!parsed||typeof parsed!=='object')throw new Error('BACKUP_INVALID');if(parsed.schema==='kabulens-research-bundle/v1')parsed=parsed.userData;if(!parsed||typeof parsed!=='object'||Array.isArray(parsed))throw new Error('BACKUP_INVALID');return save(store,parsed);}
  return {KEY:KEY,fresh:fresh,migrate:migrate,load:load,save:save,restore:restore};
});
