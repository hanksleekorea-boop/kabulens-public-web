(function(root,factory){var api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.KabuMobile=api;})(typeof self!=='undefined'?self:this,function(){
  'use strict';
  var PRIMARY=[['today','오늘'],['search','찾기'],['watchlist','관심'],['portfolio','보유']];
  var MORE=[['company','기업'],['disclosures','공시'],['promises','약속'],['capital','자본'],['benefits','우대'],['import','내 CSV'],['settings','설정'],['safety','자료보호']];
  function installState(value){if(value.standalone)return {code:'INSTALLED',label:'홈 화면 앱으로 실행 중',canPrompt:false};if(value.prompt)return {code:'PROMPT_READY',label:'이 기기에 설치할 수 있습니다.',canPrompt:true};return {code:'MANUAL',label:'브라우저 메뉴에서 홈 화면에 추가할 수 있습니다.',canPrompt:false};}
  function keyboardOpen(innerHeight,visualHeight){return Number(innerHeight)-Number(visualHeight)>150;}
  function layout(width,height){return {small:Number(width)<=479,landscape:Number(width)>Number(height),bottomNavigation:Number(width)<900};}
  return {PRIMARY:PRIMARY,MORE:MORE,installState:installState,keyboardOpen:keyboardOpen,layout:layout};
});
