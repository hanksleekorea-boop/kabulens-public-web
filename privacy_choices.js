(function () {
  'use strict';
  var button = document.getElementById('clearAdPreferences');
  var status = document.getElementById('clearAdStatus');
  if (!button || !status) return;
  button.addEventListener('click', function () {
    try {
      localStorage.removeItem('stock-scanner-ad-preference-v1');
      sessionStorage.removeItem('stock-scanner-ad-session-v1');
      status.textContent = 'Stock Scanner advertising preferences were cleared in this browser.';
    } catch (error) {
      status.textContent = 'This browser did not allow local preference storage. No live advertising setting was changed.';
    }
  });
}());
