(function () {
  'use strict';
  var button = document.getElementById('clearAdPreferences');
  var status = document.getElementById('clearAdStatus');
  var gpcStatus = document.getElementById('gpcStatus');
  if (gpcStatus) gpcStatus.textContent = navigator.globalPrivacyControl === true
    ? 'Global Privacy Control is enabled. Stock Scanner treats it as an advertising opt-out.'
    : 'No Global Privacy Control opt-out signal was detected. Certified regional consent is still required before advertising.';
  if (!button || !status) return;
  button.addEventListener('click', function () {
    try {
      localStorage.removeItem('stock-scanner-ad-preference-v1');
      localStorage.removeItem('stock-scanner-ad-preference-v2');
      sessionStorage.removeItem('stock-scanner-ad-session-v1');
      sessionStorage.removeItem('stock-scanner-ad-session-v2');
      status.textContent = 'Stock Scanner advertising preferences were cleared in this browser.';
    } catch (error) {
      status.textContent = 'This browser did not allow local preference storage. No live advertising setting was changed.';
    }
  });
}());
