/* One public-address source for sharing, QR, and release reports. No credentials belong here. */
(function () {
  'use strict';
  var PUBLIC_URL = 'https://hanksleekorea-boop.github.io/kabulens-public-web/';
  var config = Object.freeze({
    brandName: 'Stock Scanner',
    publicUrl: PUBLIC_URL,
    qrUrl: PUBLIC_URL + 'stock-scanner-qr.png',
    releaseVersion: '5.3'
  });
  window.STOCK_SCANNER_PUBLIC_CONFIG = config;
  /* Previous global name remains a read-only alias so older installed pages keep working. */
  window.KABULENS_PUBLIC_CONFIG = config;
}());
