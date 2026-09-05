(function(root,factory){
  var api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.StockScannerReliability=api;
})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var KEYS=['stockscanner.preview.v1','stockscanner.advanced.v2','stockscanner.commercial-free.v1','stockscanner.practice.v1'];
  var SCHEMA='stock-scanner-device-backup/v2',MAX=8*1024*1024;
  function utf8Length(value){return new TextEncoder().encode(value).length;}
  function checkDate(value){if(typeof value!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value)throw new Error('DATE_INVALID');return value;}
  function checksum(text){var n=2166136261;for(var i=0;i<text.length;i++){n^=text.charCodeAt(i);n=Math.imul(n,16777619)>>>0;}return 'fnv1a:'+n.toString(16).padStart(8,'0');}
  function capture(storage){var entries={};KEYS.forEach(function(key){entries[key]=storage.getItem(key);});return entries;}
  function validateEntries(entries){
    if(!entries||typeof entries!=='object'||Array.isArray(entries)||Object.keys(entries).some(function(k){return KEYS.indexOf(k)<0;}))throw new Error('BACKUP_SCOPE_INVALID');
    function object(v){return v&&typeof v==='object'&&!Array.isArray(v);}
    function unsafe(v){return object(v)&&Object.keys(v).some(function(k){return ['__proto__','prototype','constructor'].includes(k)||unsafe(v[k]);})||Array.isArray(v)&&v.some(unsafe);}
    Object.keys(entries).forEach(function(k){
      if(entries[k]===null)return;
      if(typeof entries[k]!=='string')throw new Error('BACKUP_VALUE_INVALID');
      var v=JSON.parse(entries[k]);if(!object(v)||unsafe(v))throw new Error('BACKUP_VALUE_INVALID');
      ['watchlist','savedScans','recentReports','legacyArchives','snapshots','savedViews','journal','packs','issues'].forEach(function(field){if(v[field]!==undefined&&!Array.isArray(v[field]))throw new Error('BACKUP_COLLECTION_INVALID');});
      if(k===KEYS[0]&&v.savedScans&&v.savedScans.some(function(x){return !object(x)||typeof x.id!=='string'||typeof x.name!=='string'||!object(x.filters)||!Array.isArray(x.filters.methodIds)||!x.filters.methodIds.every(function(id){return typeof id==='string';});}))throw new Error('BACKUP_SAVED_SCAN_INVALID');
      if(k===KEYS[0]&&v.recentReports&&v.recentReports.some(function(x){return !object(x)||typeof x.securityId!=='string'||typeof x.methodId!=='string';}))throw new Error('BACKUP_REPORT_INVALID');
    });
    if(utf8Length(JSON.stringify(entries))>MAX)throw new Error('BACKUP_TOO_LARGE');return entries;
  }
  function backup(storage,at){var value={schemaVersion:SCHEMA,exportedAt:at||new Date().toISOString(),entries:capture(storage)};validateEntries(value.entries);value.integrity=checksum(JSON.stringify(value));if(utf8Length(JSON.stringify(value,null,2))>MAX)throw new Error('BACKUP_TOO_LARGE');return value;}
  function inspect(value,scanner){
    if(value&&value.schemaVersion==='stock-scanner-local-backup/v1'){scanner.restoreLocalBackup(value);var legacy={};legacy[KEYS[0]]=JSON.stringify(value.appState);return{entries:legacy,legacy:true,count:1};}
    if(!value||value.schemaVersion!==SCHEMA)throw new Error('BACKUP_VERSION_UNSUPPORTED');
    var unsigned={schemaVersion:value.schemaVersion,exportedAt:value.exportedAt,entries:value.entries};
    if(value.integrity!==checksum(JSON.stringify(unsigned)))throw new Error('BACKUP_INTEGRITY_FAILED');
    validateEntries(value.entries);if(KEYS.some(function(k){return !Object.prototype.hasOwnProperty.call(value.entries,k);}))throw new Error('BACKUP_SCOPE_INCOMPLETE');
    return{entries:value.entries,legacy:false,count:Object.values(value.entries).filter(function(v){return v!==null;}).length};
  }
  // Validate every store before writing; restore exact prior bytes if any write fails.
  function apply(storage,entries){validateEntries(entries);var before=capture(storage),touched=[];try{Object.keys(entries).forEach(function(k){touched.push(k);if(entries[k]===null)storage.removeItem(k);else storage.setItem(k,entries[k]);});}catch(error){var rollbackFailed=false;touched.reverse().forEach(function(k){try{if(before[k]===null)storage.removeItem(k);else storage.setItem(k,before[k]);}catch(ignored){rollbackFailed=true;}});var failure=new Error(rollbackFailed?'RESTORE_ROLLBACK_FAILED':'RESTORE_NOT_APPLIED');failure.recovery=before;throw failure;}return true;}
  function clear(storage){var empty={};KEYS.forEach(function(k){empty[k]=null;});return apply(storage,empty);}
  function scanAll(scanner,options){var first=scanner.scan(Object.assign({},options,{offset:0,limit:100})),rows=first.rows.slice(),next=first.page.nextOffset;while(next!==null){var page=scanner.scan(Object.assign({},first.filters,{offset:next,limit:100}));rows=rows.concat(page.rows);if(page.page.nextOffset!==null&&page.page.nextOffset<=next)throw new Error('PAGINATION_INVALID');next=page.page.nextOffset;}return Object.assign({},first,{rows:rows,exportScope:'ALL_MATCHING_RESULTS',page:{offset:0,limit:100,returned:rows.length,hasMore:false,nextOffset:null}});}
  function context(report,ids){return{securityId:report.identity.securityId,methodId:report.method.id,methodIds:(ids||[report.method.id]).slice(),horizon:report.target.horizon,asOf:checkDate(report.target.asOf)};}
  function shareUrl(base,ctx){var url=new URL(base);url.search='';url.searchParams.set('symbol',ctx.securityId);url.searchParams.set('method',ctx.methodId);url.searchParams.set('horizon',ctx.horizon);url.searchParams.set('asOf',checkDate(ctx.asOf));url.searchParams.set('model','education-1');url.hash='reports';return url.href;}
  function parseLink(base,scanner){var p=new URL(base).searchParams;if(!p.has('symbol'))return null;if(p.get('model')!=='education-1')throw new Error('REPORT_VERSION_UNSUPPORTED');var ctx={securityId:p.get('symbol'),methodId:p.get('method'),horizon:p.get('horizon'),asOf:checkDate(p.get('asOf'))};scanner.report(ctx.securityId,ctx.methodId,ctx.horizon,ctx.asOf);ctx.methodIds=[ctx.methodId];return ctx;}
  function compatibleSelection(scanner,horizon,previous){var available=scanner.compatibleMethods(horizon),ids=(previous||[]).filter(function(id){return available.some(function(m){return m.id===id;});});var minimum=Math.min(3,new Set(available.map(function(m){return m.family;})).size);available.forEach(function(m){if(new Set(ids.map(function(id){return scanner.METHODS.find(function(x){return x.id===id;}).family;})).size<minimum&&ids.indexOf(m.id)<0)ids.push(m.id);});return ids;}
  return{KEYS:KEYS,MAX:MAX,SCHEMA:SCHEMA,capture:capture,validateEntries:validateEntries,checkDate:checkDate,backup:backup,inspect:inspect,apply:apply,clear:clear,scanAll:scanAll,context:context,shareUrl:shareUrl,parseLink:parseLink,compatibleSelection:compatibleSelection};
});
