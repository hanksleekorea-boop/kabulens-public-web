/* One public-address source for sharing, the in-app QR, and release reports. No credentials belong here. */
(function () {
  'use strict';
  var PUBLIC_URL = 'https://hanksleekorea-boop.github.io/kabulens-public-web/';
  window.KABULENS_PUBLIC_CONFIG = Object.freeze({
    publicUrl: PUBLIC_URL,
    qrUrl: PUBLIC_URL + 'kabulens-public-qr.png',
    releaseVersion: '0.30'
  });
}());
