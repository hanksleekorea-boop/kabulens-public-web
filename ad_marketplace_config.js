/* Stage-three marketplace configuration. Public identifiers only; never place secrets here. */
(function (root) {
  'use strict';
  root.STOCK_SCANNER_AD_MARKETPLACE_CONFIG = Object.freeze({
    schemaVersion: 'stock-scanner-ad-marketplace/v3',
    releaseMode: 'PRE_APPROVAL_STAGE3',
    enabled: false,
    emergencyDisabled: true,
    adServer: 'google-ad-manager',
    networkCode: '',
    customDomain: '',
    inventory: Object.freeze({
      learnTop: Object.freeze({adUnitPath: '', sizes: Object.freeze([[728, 90], [320, 100]]), position: 'top', collapseEmpty: true}),
      learnMiddle: Object.freeze({adUnitPath: '', sizes: Object.freeze([[728, 90], [300, 250]]), position: 'middle', collapseEmpty: true})
    }),
    channels: Object.freeze([
      Object.freeze({id: 'direct-sold', kind: 'gam-line-items', enabled: false, verified: false, contractConfirmed: false}),
      Object.freeze({id: 'open-bidding', kind: 'server-side-yield', enabled: false, verified: false, contractConfirmed: false}),
      Object.freeze({id: 'prebid', kind: 'client-header-bidding', enabled: false, verified: false, contractConfirmed: false}),
      Object.freeze({id: 'ad-exchange', kind: 'google-demand', enabled: false, verified: false, contractConfirmed: false}),
      Object.freeze({id: 'house', kind: 'first-party-fallback', enabled: true, verified: true, contractConfirmed: true})
    ]),
    prebid: Object.freeze({
      enabled: false,
      selfHostedBundlePath: '',
      bundleSri: '',
      pinnedVersion: '',
      auctionTimeoutMs: 700,
      rolloutPercent: 0,
      maximumBiddersPerSlot: 3,
      allowedAdapters: Object.freeze([]),
      prohibitedModules: Object.freeze(['userId', 'sharedIdSystem', 'identityLink', 'rtdModule', 'analyticsAdapter']),
      userSyncEnabled: false,
      deviceAccess: false,
      allowTopWindowRenderers: false
    }),
    privacy: Object.freeze({
      certifiedCmpRequired: true,
      gpcOptOut: true,
      childDirected: false,
      underAgeOfConsent: false,
      contextualOnly: true,
      allowedConsentSources: Object.freeze(['google-certified-cmp', 'tcf-v2.3', 'gpp'])
    }),
    routing: Object.freeze({
      allowedSurfaces: Object.freeze(['education']),
      blockedRoutes: Object.freeze(['scanner', 'scan', 'today', 'watchlist', 'reports', 'more', 'legal', 'privacy', 'terms', 'support', 'status', 'print', 'offline']),
      maxAdsPerPage: 2,
      noAdHoldoutPercent: 10
    }),
    auction: Object.freeze({
      gamFinalDecision: true,
      totalTimeoutMs: 1500,
      automaticRefresh: false,
      currency: 'USD',
      duplicateBidderPolicy: 'FORBID_ACROSS_OPEN_BIDDING_AND_PREBID',
      openBiddingPartnerIds: Object.freeze([]),
      prebidPartnerIds: Object.freeze([]),
      floors: Object.freeze({enabled: false, evidenceDaysRequired: 30, skipRatePercent: 10, rules: Object.freeze([])})
    }),
    targeting: Object.freeze({
      contextualOnly: true,
      allowedKeys: Object.freeze(['ss_surface', 'ss_slot', 'ss_language', 'ss_synthetic']),
      forbiddenKeys: Object.freeze(['user_id', 'email', 'symbol', 'company', 'portfolio', 'search_query', 'watchlist']),
      staticValues: Object.freeze({ss_surface: 'education', ss_language: 'en', ss_synthetic: '1'})
    }),
    directSales: Object.freeze({
      enabled: false,
      insertionOrderRequired: true,
      creativeApprovalRequired: true,
      invoiceAndTaxVerified: false,
      frequencyCapRequired: true,
      advertiserCannotInfluenceResearch: true,
      disclosureUrl: 'advertiser-disclosure.html'
    }),
    supplyChain: Object.freeze({
      ownerDomain: '',
      managerDomain: '',
      adsTxtVerified: false,
      sellersJsonVerified: false,
      schainComplete: false,
      nodes: Object.freeze([])
    }),
    safety: Object.freeze({
      maxFailures: 3,
      circuitWindowMs: 300000,
      maxCumulativeLayoutShift: 0.1,
      blockedCategories: Object.freeze(['get-rich-quick', 'gambling', 'high-risk-loans', 'unlicensed-brokerage', 'guaranteed-returns'])
    }),
    reporting: Object.freeze({
      enabled: false,
      aggregateOnly: true,
      userIdentifiers: false,
      retentionDays: 30,
      metrics: Object.freeze(['requests', 'impressions', 'unfilled', 'timeouts', 'prebidAuctions', 'prebidTimeouts', 'bidResponses', 'revenueMicros', 'lcpMs', 'cls'])
    }),
    privacyChoicesUrl: 'privacy-choices.html'
  });
}(typeof window === 'undefined' ? globalThis : window));
