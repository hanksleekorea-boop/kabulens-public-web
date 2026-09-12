/* Public advertising configuration. Never place account passwords or API secrets here. */
(function (root) {
  'use strict';
  root.STOCK_SCANNER_AD_CONFIG = Object.freeze({
    schemaVersion: 'stock-scanner-ad-config/v1',
    releaseMode: 'SITE_REVIEW_READY',
    enabled: false,
    liveAdsEnabled: false,
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
    blockedRoutes: Object.freeze(['scanner', 'scan', 'today', 'watchlist', 'reports', 'more', 'markets', 'dashboard', 'account', 'payment', 'personal-data', 'input', 'working-state', 'legal', 'privacy', 'terms', 'support', 'status', 'print', 'offline']),
    slotIds: Object.freeze({
      learnTop: '',
      learnMiddle: '',
      'LM26-22-stockscanner-education-pc-inarticle-v1': '',
      'LM26-22-stockscanner-glossary-pc-display-v1': '',
      'LM26-22-stockscanner-guide-end-pc-multiplex-v1': '',
      'LM26-22-stockscanner-education-m-inarticle-v1': ''
    }),
    slotFormats: Object.freeze({
      learnTop: 'responsive-display',
      learnMiddle: 'in-article',
      'LM26-22-stockscanner-education-pc-inarticle-v1': 'in-article',
      'LM26-22-stockscanner-glossary-pc-display-v1': 'responsive-display',
      'LM26-22-stockscanner-guide-end-pc-multiplex-v1': 'multiplex',
      'LM26-22-stockscanner-education-m-inarticle-v1': 'in-article'
    }),
    slotManifestPath: 'adsense-slot-manifest.js',
    pilotSlotKeys: Object.freeze([
      'LM26-22-stockscanner-education-pc-inarticle-v1',
      'LM26-22-stockscanner-education-m-inarticle-v1'
    ]),
    autoAds: Object.freeze({
      enabled: false,
      reason: 'ACCOUNT_READY_AND_PAGE_EXCLUSIONS_NOT_VERIFIED'
    }),
    maxAdsPerPage: 2,
    requestTimeoutMs: 900,
    privacyChoicesUrl: 'privacy-choices.html'
  });
}(typeof window === 'undefined' ? globalThis : window));
