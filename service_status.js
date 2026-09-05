(function(){
  'use strict';
  var entries=[['stock-scanner.html','PC·모바일 화면'],['reliability_runtime.js','이 기기 자료 관리'],['markets.html','실제 자료 검색 화면'],['twse-daily-fd1.json','대만 일별 자료'],['global-directory-fd1.json','세계 종목 발견 명부'],['support.html','지원 안내']];
  var list=document.getElementById('serviceChecks');
  entries.forEach(function(entry){var row=document.createElement('div'),label=document.createElement('dt'),value=document.createElement('dd');label.textContent=entry[1];value.textContent='확인 중';row.append(label,value);list.append(row);fetch(entry[0],{method:'HEAD',cache:'no-store'}).then(function(r){value.textContent=r.ok?'이 브라우저에서 응답 확인':'연결 문제 · '+r.status;}).catch(function(){value.textContent='응답 확인 불가 · 연결을 확인하세요';});});
  document.getElementById('serviceCheckedAt').textContent='확인 시작: '+new Date().toLocaleString()+' · 이 브라우저에서 확인한 파일 연결 상태이며 전체 서비스 가동률이나 기능 통과를 보증하지 않습니다.';
})();
