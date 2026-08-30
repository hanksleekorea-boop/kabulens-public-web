/* Stage-two demand configuration. Public identifiers only; never place secrets here. */
(function (root) {
  'use strict';
  root.STOCK_SCANNER_AD_DEMAND_CONFIG = Object.freeze({
    schemaVersion: 'stock-scanner-ad-demand/v2',
    releaseMode: 'PRE_APPROVAL_STAGE2',
    enabled: false,
    adServer: 'google-ad-manager',
    networkCode: '',
    customDomain: '',
    inventory: Object.freeze({
      learnTop: Object.freeze({adUnitPath: '', sizes: Object.freeze([[728, 90], [320, 100]]), collapseEmpty: true}),
      learnMiddle: Object.freeze({adUnitPath: '', sizes: Object.freeze([[728, 90], [300, 250]]), collapseEmpty: true})
    }),
    demand: Object.freeze([
      Object.freeze({id: 'google-ad-manager', kind: 'ad-server', enabled: false, verified: false, contractConfirmed: false, priority: 10}),
      Object.freeze({id: 'open-bidding', kind: 'server-side-yield', enabled: false, verified: false, contractConfirmed: false, priority: 20}),
      Object.freeze({id: 'house', kind: 'first-party-fallback', enabled: true, verified: true, contractConfirmed: true, priority: 100})
    ]),
    privacy: Object.freeze({
      certifiedCmpRequired: true,
      gpcOptOut: true,
      childDirected: false,
      underAgeOfConsent: false,
      contextualOnlyDefault: true,
      allowedConsentSources: Object.freeze(['google-certified-cmp', 'tcf-v2.3', 'gpp'])
    }),
    routing: Object.freeze({
      allowedSurfaces: Object.freeze(['education']),
      blockedRoutes: Object.freeze(['scanner', 'scan', 'today', 'watchlist', 'reports', 'more', 'legal', 'privacy', 'terms', 'support', 'status', 'print', 'offline']),
      maxAdsPerPage: 2,
      holdoutPercent: 10
    }),
    safety: Object.freeze({
      requestTimeoutMs: 1200,
      maxFailures: 3,
      circuitWindowMs: 300000,
      refreshEnabled: false,
      minimumRefreshSeconds: 30,
      maxCumulativeLayoutShift: 0.1,
      blockedCategories: Object.freeze(['get-rich-quick', 'gambling', 'high-risk-loans', 'unlicensed-brokerage', 'guaranteed-returns'])
    }),
    reporting: Object.freeze({
      enabled: false,
      aggregateOnly: true,
      userIdentifiers: false,
      retentionDays: 30,
      metrics: Object.freeze(['requests', 'impressions', 'unfilled', 'timeouts', 'revenueMicros', 'lcpMs', 'cls'])
    }),
    privacyChoicesUrl: 'privacy-choices.html'
  });
}(typeof window === 'undefined' ? globalThis : window));
