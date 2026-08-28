/* Optional production account bridge. It remains disabled until a separate HTTPS API is configured. */
(function () {
  'use strict';
  var TOKEN_KEY = 'kabulens.production.session.v1';
  var loginInProgress = false;
  var subscribers = [];
  var authState = { state: 'checking', profile: null };
  function publishAuthState(value, profile) {
    authState = { state: value, profile: profile || null };
    window.dispatchEvent(new CustomEvent('kabulens-auth-state', { detail: authState }));
    subscribers.slice().forEach(function (subscriber) { subscriber(authState); });
  }
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
        var detail = data && data.detail && typeof data.detail === 'object' ? data.detail : data;
        if (!response.ok) throw new Error(detail.message || detail.error || 'AUTH_REQUEST_FAILED');
        return data;
      });
    });
  }
  function begin(provider) {
    var origin = apiOrigin();
    if (!origin) {
      status('운영 인증 서버 주소와 OAuth 등록값이 아직 연결되지 않았습니다. 이 기기의 로컬 저장은 그대로 유지됩니다.', 'warn');
      publishAuthState('configurationError');
      return;
    }
    if (loginInProgress) return;
    loginInProgress = true;
    var button = document.getElementById('signInGoogle');
    if (button) button.disabled = true;
    status('Google 로그인으로 이동하는 중입니다.', '');
    publishAuthState('signingIn');
    location.assign(origin + '/v1/auth/' + provider + '/start?return_to=' + encodeURIComponent(location.origin + location.pathname));
  }
  function exchangeTicket() {
    var match = location.hash.match(/(?:^#|&)auth_ticket=([^&]+)/);
    if (!match) return Promise.resolve(false);
    return request('/v1/auth/tickets/exchange', { method: 'POST', body: JSON.stringify({ ticket: decodeURIComponent(match[1]) }) }).then(function (data) {
      rememberToken(String(data.token || ''));
      history.replaceState(null, '', location.pathname + location.search);
      status('Google 로그인 세션을 시작했습니다. 이 탭을 닫으면 다시 로그인해야 합니다.', 'ok');
      return refreshAuthState().then(function () { return true; });
    }).catch(function () { status('로그인 완료 정보를 안전하게 교환하지 못했습니다. 다시 시도하세요.', 'warn'); publishAuthState('recoverableError'); return false; });
  }
  function clearToken() {
    try { sessionStorage.removeItem(TOKEN_KEY); } catch (error) { /* no action needed */ }
  }
  function refreshAuthState() {
    if (!apiOrigin()) {
      publishAuthState('configurationError');
      return Promise.resolve(authState);
    }
    if (!sessionToken()) {
      publishAuthState('signedOut');
      return Promise.resolve(authState);
    }
    publishAuthState('checking');
    return request('/v1/auth/session').then(function (profile) {
      loginInProgress = false;
      status('Google 로그인 세션이 확인되었습니다. 저장·복원·로그아웃은 각각 버튼을 눌러야 실행됩니다.', 'ok');
      publishAuthState('signedIn', profile);
      return authState;
    }).catch(function () {
      clearToken();
      status('로그인 세션이 만료되었습니다. 다시 로그인할 수 있습니다.', 'warn');
      publishAuthState('signedOut');
      return authState;
    });
  }
  function initializeAuthState() {
    if (!apiOrigin()) {
      status('운영 인증 서버 주소가 아직 공개 설정에 없습니다.', 'warn');
      publishAuthState('configurationError');
      return Promise.resolve(authState);
    }
    return refreshAuthState();
  }
  function subscribeAuthState(callback) {
    if (typeof callback !== 'function') return function () {};
    subscribers.push(callback);
    callback(authState);
    return function () { subscribers = subscribers.filter(function (value) { return value !== callback; }); };
  }
  function updateDisplayName(displayName) {
    return request('/v1/auth/profile', {
      method: 'POST',
      body: JSON.stringify({ displayName: String(displayName || '').trim().slice(0, 60) })
    }).then(function (profile) {
      publishAuthState('signedIn', profile);
      return profile;
    });
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
    var hadToken = !!sessionToken();
    var action = hadToken ? request('/v1/auth/session', { method: 'DELETE' }) : Promise.resolve({ signedOut: true });
    return action.then(function () {
      status('서버와 이 브라우저 탭의 로그인 세션을 끝냈습니다. 서버 저장 자료는 삭제하지 않았습니다.', '');
    }).catch(function () {
      status('이 탭에서는 로그아웃했습니다. 네트워크 문제로 서버 세션 종료 확인은 하지 못했습니다.', 'warn');
    }).then(function () {
      clearToken();
      loginInProgress = false;
      publishAuthState('signedOut');
    });
  }
  function init() {
    var google = document.getElementById('signInGoogle');
    var syncButton = document.getElementById('syncAccountData');
    var restoreButton = document.getElementById('restoreAccountData');
    var out = document.getElementById('signOutProduction');
    if (!google || !syncButton || !restoreButton || !out) return;
    google.addEventListener('click', function () { begin('google'); });
    syncButton.addEventListener('click', sync);
    restoreButton.addEventListener('click', restore);
    out.addEventListener('click', signOut);
    exchangeTicket().then(function (exchanged) { if (!exchanged) initializeAuthState(); });
    window.addEventListener('focus', function () { if (sessionToken()) refreshAuthState(); });
  }
  window.KabuAuth = Object.freeze({
    initializeAuthState: initializeAuthState,
    signInWithGoogle: function () { return begin('google'); },
    subscribeAuthState: subscribeAuthState,
    refreshAuthState: refreshAuthState,
    updateDisplayName: updateDisplayName,
    signOut: signOut,
    getAuthState: function () { return authState; },
    syncAccountData: sync,
    restoreAccountData: restore
  });
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true }); else init();
}());
