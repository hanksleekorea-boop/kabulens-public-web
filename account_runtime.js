/* Local account preferences and public sharing. Authentication remains in auth_runtime.js. */
(function () {
  'use strict';
  var KEY = 'kabulens.account-preferences.v1';
  var currentAuthState = 'checking';
  function read() { try { var value = JSON.parse(localStorage.getItem(KEY) || '{}'); return { displayName: typeof value.displayName === 'string' ? value.displayName.slice(0, 60) : '', dailyGoal: ['5','10','15','20','30'].indexOf(String(value.dailyGoal)) >= 0 ? String(value.dailyGoal) : '10' }; } catch (error) { return { displayName: '', dailyGoal: '10' }; } }
  function write(value) { localStorage.setItem(KEY, JSON.stringify(value)); }
  function config() { return window.KABULENS_PUBLIC_CONFIG || {}; }
  function configuredAuth() { return !!(window.KABULENS_AUTH_CONFIG && /^https:\/\//.test(window.KABULENS_AUTH_CONFIG.apiOrigin || '')); }
  function byId(id) { return document.getElementById(id); }
  function routeSettings() { location.hash = 'settings'; setTimeout(function () { var target = byId('myAccount'); if (target) target.scrollIntoView({ block: 'start' }); }, 0); }
  function renderAuthState(value) { var entry = byId('accountEntry'), summary = byId('accountSummary'), status = byId('accountEntryStatus'); currentAuthState = value || 'checking'; if (!entry || !summary || !status) return; if (value === 'signedIn') { entry.textContent = '내 계정'; summary.textContent = 'Google 로그인 세션이 확인되었습니다. 표시 이름은 저장 버튼을 눌렀을 때만 계정에 반영됩니다.'; status.textContent = 'Google 로그인됨'; } else if (value === 'signingIn') { entry.textContent = '로그인 진행 중'; summary.textContent = 'Google 로그인으로 이동하는 중입니다. 창을 닫지 마세요.'; status.textContent = 'Google 로그인 진행 중'; } else if (value === 'configurationError') { entry.textContent = '로그인·무료 가입'; summary.textContent = 'Google 로그인은 운영 인증 연결을 준비 중입니다. 표시 이름과 하루 목표는 이 기기에만 저장할 수 있습니다.'; status.textContent = 'Google 로그인 운영 설정 필요'; } else if (value === 'checking') { entry.textContent = '계정 확인 중'; summary.textContent = '이 브라우저 탭의 로그인 상태를 안전하게 확인하고 있습니다.'; status.textContent = 'Google 로그인 확인 중'; } else { entry.textContent = '로그인·무료 가입'; summary.textContent = 'Google 로그인·무료 가입을 사용할 수 있습니다. 실제 로그인 전에는 이 기기의 설정만 변경됩니다.'; status.textContent = 'Google 로그인 준비됨'; } }
  function init() {
    var preferences = read(), entry = byId('accountEntry'), summary = byId('accountSummary'), name = byId('accountDisplayName'), goal = byId('accountDailyGoal'), status = byId('accountPreferenceStatus'), qr = byId('publicQrImage'), qrLink = byId('publicQrLink'), sharing = byId('sharingStatus'), publicConfig = config();
    name.value = preferences.displayName; goal.value = preferences.dailyGoal;
    renderAuthState(configuredAuth() ? 'signedOut' : 'configurationError');
    window.addEventListener('kabulens-auth-state', function (event) { renderAuthState(event.detail && event.detail.state); });
    if (window.KabuAuth && window.KabuAuth.subscribeAuthState) window.KabuAuth.subscribeAuthState(function (value) { renderAuthState(value.state); });
    entry.addEventListener('click', routeSettings);
    byId('saveAccountDisplayName').addEventListener('click', function () { var button = byId('saveAccountDisplayName'), nextName = name.value.trim().slice(0, 60); function saveLocal(message) { preferences.displayName = nextName; write(preferences); status.textContent = message; } if (currentAuthState === 'signedIn' && window.KabuAuth && window.KabuAuth.updateDisplayName) { button.disabled = true; window.KabuAuth.updateDisplayName(nextName).then(function () { saveLocal(nextName ? '표시 이름을 이 기기와 로그인 계정에 저장했습니다.' : '표시 이름을 이 기기와 로그인 계정에서 지웠습니다.'); }).catch(function () { saveLocal('표시 이름은 이 기기에 저장했지만 계정 서버에는 저장하지 못했습니다. 다시 시도하세요.'); }).then(function () { button.disabled = false; }); } else { saveLocal(nextName ? '표시 이름을 이 기기에 저장했습니다. 로그인 전에는 서버로 보내지 않습니다.' : '이 기기의 표시 이름을 지웠습니다. 서버에는 요청하지 않았습니다.'); } });
    byId('saveAccountPreferences').addEventListener('click', function () { preferences.dailyGoal = goal.value; write(preferences); status.textContent = '하루 목표 ' + goal.value + '분을 이 기기에 저장했습니다. 자동 업로드는 하지 않습니다.'; });
    byId('openManualBackup').addEventListener('click', function () { location.hash = 'safety'; });
    if (publicConfig.publicUrl && publicConfig.qrUrl) { qr.src = publicConfig.qrUrl; qr.hidden = false; qrLink.href = publicConfig.qrUrl; sharing.textContent = '대표 공개 주소: ' + publicConfig.publicUrl; }
    byId('sharePublicApp').addEventListener('click', function () { var payload = { title: 'KABU LENS', text: 'KABU LENS 무료 공개 베타', url: publicConfig.publicUrl }; if (navigator.share) navigator.share(payload).catch(function () { sharing.textContent = '공유를 취소했거나 완료하지 않았습니다.'; }); else if (navigator.clipboard && publicConfig.publicUrl) navigator.clipboard.writeText(publicConfig.publicUrl).then(function () { sharing.textContent = '공개 링크를 클립보드에 복사했습니다.'; }).catch(function () { sharing.textContent = '공개 링크: ' + publicConfig.publicUrl; }); else sharing.textContent = '공개 링크: ' + publicConfig.publicUrl; });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
