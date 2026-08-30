/* Public advertising configuration. Never place account passwords or API secrets here. */
(function (root) {
  'use strict';
  root.STOCK_SCANNER_AD_CONFIG = Object.freeze({
    schemaVersion: 'stock-scanner-ad-config/v1',
    releaseMode: 'PRE_APPROVAL',
    enabled: false,
    provider: 'google-adsense',
    publisherId: '',
    cmp: Object.freeze({
      provider: 'google-privacy-messaging',
      accountConfigured: false,
      requireCertifiedSignal: true
    }),
    allowedSurfaces: Object.freeze(['education']),
    blockedRoutes: Object.freeze(['scanner', 'scan', 'today', 'watchlist', 'reports', 'more', 'legal', 'privacy', 'terms', 'support', 'status', 'print', 'offline']),
    slotIds: Object.freeze({
      learnTop: '',
      learnMiddle: ''
    }),
    maxAdsPerPage: 2,
    requestTimeoutMs: 900,
    privacyChoicesUrl: 'privacy-choices.html'
  });
}(typeof window === 'undefined' ? globalThis : window));
