/* Optional production account bridge. It remains disabled until a separate HTTPS API is configured. */
(function () {
  'use strict';
  var TOKEN_KEY = 'kabulens.production.session.v1';
  function apiOrigin() {
    var config = window.KABULENS_AUTH_CONFIG || {};
    return typeof config.apiOrigin === 'string' && /^https:\/\//.test(config.apiOrigin) ? config.apiOrigin.replace(/\/$/, '') : '';
  }
  function status(text, kind) {
    var element = document.getElementById('productionAuthStatus');
    if (!element) return;
    element.textContent = text;
    element.className = kind || '';
  }
  function sessionToken() {
    try { return sessionStorage.getItem(TOKEN_KEY) || ''; } catch (error) { return ''; }
  }
  function rememberToken(value) {
    try { sessionStorage.setItem(TOKEN_KEY, value); } catch (error) { /* Private browsing may deny storage. */ }
  }
  function request(path, options) {
    var origin = apiOrigin();
    if (!origin) return Promise.reject(new Error('AUTH_API_NOT_CONFIGURED'));
    var next = Object.assign({ headers: {} }, options || {});
    next.headers = Object.assign({ 'Content-Type': 'application/json' }, next.headers);
    if (sessionToken()) next.headers.Authorization = 'Bearer ' + sessionToken();
    return fetch(origin + path, next).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok) throw new Error(data.message || data.error || 'AUTH_REQUEST_FAILED');
        return data;
      });
    });
  }
  function begin(provider) {
    var origin = apiOrigin();
    if (!origin) {
      status('운영 인증 서버 주소와 OAuth 등록값이 아직 연결되지 않았습니다. 이 기기의 로컬 저장은 그대로 유지됩니다.', 'warn');
      return;
    }
    location.assign(origin + '/v1/auth/' + provider + '/start?return_to=' + encodeURIComponent(location.origin + location.pathname));
  }
  function exchangeTicket() {
    var match = location.hash.match(/(?:^#|&)auth_ticket=([^&]+)/);
    if (!match) return;
    request('/v1/auth/tickets/exchange', { method: 'POST', body: JSON.stringify({ ticket: decodeURIComponent(match[1]) }) }).then(function (data) {
      rememberToken(String(data.token || ''));
      history.replaceState(null, '', location.pathname + location.search);
      status('Google·Apple 로그인 세션을 시작했습니다. 이 탭을 닫으면 다시 로그인해야 합니다.', 'ok');
    }).catch(function () { status('로그인 완료 정보를 안전하게 교환하지 못했습니다. 다시 시도하세요.', 'warn'); });
  }
  function sync() {
    if (!window.KabuStorage) { status('로컬 자료를 준비하는 중입니다.', 'warn'); return; }
    request('/v1/user-data/snapshot', { method: 'POST', body: JSON.stringify({ userData: KabuStorage.load(localStorage).data }) }).then(function (data) {
      status('이 기기의 자료를 계정 암호화 저장소에 저장했습니다. ' + data.bytes + '바이트', 'ok');
    }).catch(function (error) { status('계정 저장에 실패했습니다: ' + error.message, 'warn'); });
  }
  function restore() {
    request('/v1/user-data/snapshot').then(function (data) {
      if (!data.found) { status('계정에 저장된 자료가 없습니다.', 'warn'); return; }
      KabuStorage.save(localStorage, data.userData);
      status('계정 자료를 이 기기에 복원했습니다. 화면을 새로고침합니다.', 'ok');
      setTimeout(function () { location.reload(); }, 500);
    }).catch(function (error) { status('계정 복원에 실패했습니다: ' + error.message, 'warn'); });
  }
  function signOut() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (error) { /* no action needed */ }
    status('이 브라우저 탭의 로그인 세션을 끝냈습니다. 서버 저장 자료는 삭제하지 않았습니다.', '');
  }
  function init() {
    var google = document.getElementById('signInGoogle');
    var apple = document.getElementById('signInApple');
    var syncButton = document.getElementById('syncAccountData');
    var restoreButton = document.getElementById('restoreAccountData');
    var out = document.getElementById('signOutProduction');
    if (!google || !apple || !syncButton || !restoreButton || !out) return;
    google.addEventListener('click', function () { begin('google'); });
    apple.addEventListener('click', function () { begin('apple'); });
    syncButton.addEventListener('click', sync);
    restoreButton.addEventListener('click', restore);
    out.addEventListener('click', signOut);
    if (sessionToken()) status('이 브라우저 탭에 로그인 세션이 있습니다. 저장·복원·로그아웃을 사용할 수 있습니다.', 'ok');
    else status(apiOrigin() ? '로그인 공급자 준비 상태를 확인하세요.' : '운영 인증 서버 주소가 아직 공개 설정에 없습니다.', 'warn');
    exchangeTicket();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
