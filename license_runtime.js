(function(global){'use strict';
  var states=['ALLOWED','BLOCKED','EXPIRED','UNKNOWN'];
  var allowCodes=['ALLOW','LINK_ONLY','ALLOW_WITH_ATTRIBUTION'];
  var denyCodes=['UNKNOWN_SOURCE','PERSONAL_PLAN_PROHIBITED','LICENSE_EXPIRED','LICENSE_UNVERIFIED','CONTRACT_REQUIRED','LICENSE_BLOCKED','LINK_ONLY_REQUIRED','OPERATION_NOT_ALLOWED','ATTRIBUTION_REQUIRED'];
  function unavailable(sourceId,operation,code){return {sourceId:sourceId,operation:operation,allowed:false,licenseState:'UNKNOWN',allowedOperations:[],code:code||'API_UNAVAILABLE',message:'서버 사용권을 확인하지 못해 요청을 차단합니다. 공개 시험 화면은 실제 계약 허가를 대신하지 않습니다.'};}
  function normalize(value,sourceId,operation){
    var invalid=unavailable(sourceId,operation,'INVALID_RESPONSE');
    if(!value||typeof value!=='object'||value.sourceId!==sourceId||typeof value.allowed!=='boolean'||states.indexOf(value.licenseState)<0||!Array.isArray(value.allowedOperations)||typeof value.message!=='string'||!value.message.trim())return invalid;
    var ops=value.allowedOperations;
    if(ops.some(function(op){return op!=='copy'&&op!=='link';}))return invalid;
    if(value.allowed&&(value.licenseState!=='ALLOWED'||ops.indexOf(operation)<0||allowCodes.indexOf(value.code)<0||(value.code==='LINK_ONLY'&&operation!=='link')))return invalid;
    if(!value.allowed&&denyCodes.indexOf(value.code)<0)return invalid;
    return {sourceId:sourceId,operation:operation,allowed:value.allowed,licenseState:value.licenseState,allowedOperations:ops.slice(),code:value.code,message:value.message.slice(0,1000)};
  }
  function createLoader(request,render){
    var latest=0;
    function reset(sourceId,operation){latest+=1;render(unavailable(sourceId,operation,'NOT_CHECKED'));}
    async function load(sourceId,operation){
      var sequence=++latest;render(unavailable(sourceId,operation,'CHECKING'));
      var value;
      try{value=normalize(await request(sourceId,operation),sourceId,operation);}catch(error){value=unavailable(sourceId,operation);}
      if(sequence===latest)render(value);
      return value;
    }
    return {load:load,reset:reset};
  }
  var api={unavailable:unavailable,normalize:normalize,createLoader:createLoader};
  if(typeof module==='object'&&module.exports)module.exports=api;
  global.KabuLicense=api;
})(typeof window!=='undefined'?window:globalThis);
