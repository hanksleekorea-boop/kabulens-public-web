/* Public advertising configuration. Never place account passwords or API secrets here. */
(function (root) {
  'use strict';
  root.STOCK_SCANNER_AD_CONFIG = Object.freeze({
    schemaVersion: 'stock-scanner-ad-config/v1',
    releaseMode: 'SITE_REVIEW_READY',
    enabled: false,
    provider: 'google-adsense',
    publisherId: 'ca-pub-2476023536699107',
    verification: Object.freeze({
      method: 'PUBLIC_ROOT_META_AND_ADS_TXT',
      siteUrl: 'https://hanksleekorea-boop.github.io/',
      rootAdsTxtUrl: 'https://hanksleekorea-boop.github.io/ads.txt',
      verifiedAt: '2026-08-31'
    }),
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
    slotFormats: Object.freeze({
      learnTop: 'responsive-display',
      learnMiddle: 'in-article'
    }),
    autoAds: Object.freeze({
      enabled: false,
      reason: 'ACCOUNT_READY_AND_PAGE_EXCLUSIONS_NOT_VERIFIED'
    }),
    maxAdsPerPage: 2,
    requestTimeoutMs: 900,
    privacyChoicesUrl: 'privacy-choices.html'
  });
}(typeof window === 'undefined' ? globalThis : window));
