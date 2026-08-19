(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KabuMobile=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var PRIMARY=[['today','오늘'],['search','찾기'],['watchlist','관심'],['portfolio','보유']];
  var MORE=[['company','기업'],['disclosures','공시'],['promises','약속'],['capital','자본'],['benefits','우대'],['import','내 CSV'],['settings','설정'],['safety','자료보호']];
  var IOS_STEPS=['Safari 아래쪽 공유 버튼을 누릅니다.','홈 화면에 추가를 선택합니다.','이름과 주소를 확인하고 추가를 누릅니다.','홈 화면의 KABU LENS 아이콘으로 다시 엽니다.'];
  var MANUAL_STEPS=['브라우저 메뉴를 엽니다.','홈 화면에 추가 또는 앱 설치를 선택합니다.','추가한 아이콘으로 다시 엽니다.','처음 한 번은 온라인에서 열어 오프라인 준비 완료를 확인합니다.'];
  function installState(value){if(value.standalone)return {code:'INSTALLED',label:'홈 화면 앱으로 실행 중',canPrompt:false};if(value.prompt)return {code:'PROMPT_READY',label:'이 기기에 설치할 수 있습니다.',canPrompt:true};if(value.iosManual)return {code:'IOS_MANUAL',label:'iPhone Safari에서 공유 후 홈 화면에 추가하세요.',canPrompt:false};return {code:'MANUAL',label:'브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.',canPrompt:false};}
  function installSteps(value){if(value.standalone)return ['설치 상태 확인 완료. 홈 화면 앱으로 실행 중입니다.'];return (value.iosManual?IOS_STEPS:MANUAL_STEPS).slice();}
  function updateState(value){if(!value.worker)return {code:'UNSUPPORTED',label:'이 브라우저에서는 오프라인 업데이트를 확인할 수 없습니다.'};if(value.waiting)return {code:'UPDATE_READY',label:'새 버전이 준비됐습니다. 안전하게 새 버전 적용을 누르세요.'};if(value.controlled)return {code:'CURRENT',label:'오프라인 앱이 준비됐습니다. 새 버전 확인을 실행할 수 있습니다.'};return {code:'PREPARING',label:'첫 오프라인 준비 중입니다. 온라인 상태에서 잠시 기다리세요.'};}
  function keyboardOpen(innerHeight,visualHeight){return Number(innerHeight)-Number(visualHeight)>150;}
  function layout(width,height){return {small:Number(width)<=479,landscape:Number(width)>Number(height),bottomNavigation:Number(width)<900};}
  return {PRIMARY:PRIMARY,MORE:MORE,IOS_STEPS:IOS_STEPS,installState:installState,installSteps:installSteps,updateState:updateState,keyboardOpen:keyboardOpen,layout:layout};
});
