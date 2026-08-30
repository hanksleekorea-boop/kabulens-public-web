(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StockScannerAdMarketplace = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var NETWORK = /^\d{4,12}$/;
  var UNIT_PATH = /^\/\d{4,12}\/[A-Za-z0-9._/-]{1,120}$/;
  var LOCAL_BUNDLE = /^vendor\/prebid\/[A-Za-z0-9._-]+\.js$/;
  var SRI = /^sha256-[A-Za-z0-9+/]{43}=$/;
  var VERSION = /^\d+\.\d+\.\d+$/;
  var CONSENT_SOURCES = ['google-certified-cmp', 'tcf-v2.3', 'gpp'];

  function text(value) { return String(value == null ? '' : value).trim(); }
  function list(value) { return Array.isArray(value) ? value : []; }
  function channel(config, id) { return list(config && config.channels).find(function (item) { return item.id === id; }); }
  function verified(item) { return !!item && item.enabled === true && item.verified === true && item.contractConfirmed === true; }
  function hasDuplicates(left, right) { return left.some(function (value) { return right.indexOf(value) >= 0; }); }

  function validateConfig(config) {
    var errors = [];
    if (!config || config.schemaVersion !== 'stock-scanner-ad-marketplace/v3') return ['MARKETPLACE_SCHEMA_INVALID'];
    if (config.adServer !== 'google-ad-manager' || !config.auction || config.auction.gamFinalDecision !== true) errors.push('GAM_FINAL_DECISION_REQUIRED');
    if (!config.routing || config.routing.maxAdsPerPage !== 2) errors.push('AD_DENSITY_INVALID');
    if (!config.auction || config.auction.automaticRefresh !== false) errors.push('AUTO_REFRESH_FORBIDDEN_STAGE3');
    if (!config.reporting || config.reporting.aggregateOnly !== true || config.reporting.userIdentifiers !== false) errors.push('REPORTING_PRIVACY_INVALID');
    if (!config.targeting || config.targeting.contextualOnly !== true || list(config.targeting.forbiddenKeys).length < 5) errors.push('CONTEXTUAL_TARGETING_INVALID');
    if (hasDuplicates(list(config.auction.openBiddingPartnerIds), list(config.auction.prebidPartnerIds))) errors.push('DUPLICATE_BIDDER_CHANNEL');
    if (config.enabled === true) {
      if (!NETWORK.test(text(config.networkCode))) errors.push('GAM_NETWORK_INVALID');
      if (Object.keys(config.inventory || {}).some(function (key) { return !UNIT_PATH.test(text(config.inventory[key].adUnitPath)); })) errors.push('GAM_AD_UNIT_INVALID');
      if (!config.customDomain || /github\.io$/i.test(config.customDomain)) errors.push('CUSTOM_DOMAIN_INVALID');
    }
    var prebid = config.prebid || {};
    if (prebid.enabled === true) {
      if (!LOCAL_BUNDLE.test(text(prebid.selfHostedBundlePath)) || !SRI.test(text(prebid.bundleSri)) || !VERSION.test(text(prebid.pinnedVersion))) errors.push('PREBID_BUNDLE_INVALID');
      if (!Number.isInteger(prebid.auctionTimeoutMs) || prebid.auctionTimeoutMs < 300 || prebid.auctionTimeoutMs > 800) errors.push('PREBID_TIMEOUT_INVALID');
      if (!Number.isInteger(prebid.maximumBiddersPerSlot) || prebid.maximumBiddersPerSlot < 1 || prebid.maximumBiddersPerSlot > 3) errors.push('PREBID_BIDDER_LIMIT_INVALID');
      if (!Number.isInteger(prebid.rolloutPercent) || prebid.rolloutPercent < 0 || prebid.rolloutPercent > 50) errors.push('PREBID_ROLLOUT_INVALID');
      if (prebid.userSyncEnabled !== false || prebid.deviceAccess !== false || prebid.allowTopWindowRenderers !== false) errors.push('PREBID_IDENTITY_OR_RENDERER_FORBIDDEN');
      if (!verified(channel(config, 'prebid')) || !list(prebid.allowedAdapters).length) errors.push('PREBID_PARTNERS_UNVERIFIED');
    }
    if (config.directSales && config.directSales.enabled === true) {
      if (!verified(channel(config, 'direct-sold')) || config.directSales.insertionOrderRequired !== true || config.directSales.creativeApprovalRequired !== true || config.directSales.invoiceAndTaxVerified !== true || config.directSales.advertiserCannotInfluenceResearch !== true) errors.push('DIRECT_SALES_CONTROLS_INCOMPLETE');
    }
    return errors;
  }

  function hashBucket(seed) {
    var hash = 2166136261; var value = text(seed);
    for (var i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0) % 100;
  }

  function ephemeralSeed(windowLike) {
    var values = new Uint32Array(2);
    if (windowLike && windowLike.crypto && typeof windowLike.crypto.getRandomValues === 'function') {
      windowLike.crypto.getRandomValues(values); return values[0].toString(16) + values[1].toString(16);
    }
    return String(Date.now()) + '|' + String(Math.random());
  }

  function privacyDecision(config, context) {
    var privacy = config.privacy || {}; var consent = context.consent || {};
    if (privacy.gpcOptOut === true && context.gpc === true) return {allowed: false, reason: 'GPC_OPT_OUT'};
    if (privacy.childDirected === true || privacy.underAgeOfConsent === true) return {allowed: false, reason: 'AGE_RESTRICTED_NO_ADS'};
    if (privacy.certifiedCmpRequired === true && (consent.certified !== true || CONSENT_SOURCES.indexOf(text(consent.source)) < 0)) return {allowed: false, reason: 'CERTIFIED_CONSENT_REQUIRED'};
    if (consent.adsAllowed !== true) return {allowed: false, reason: 'AD_CONSENT_DENIED'};
    return {allowed: true, mode: 'contextual'};
  }

  function isCircuitOpen(health, now, safety) {
    now = Number.isFinite(now) ? now : Date.now(); safety = safety || {};
    return list(health && health.failures).filter(function (at) { return now - at <= safety.circuitWindowMs; }).length >= safety.maxFailures;
  }

  function recordHealth(health, outcome, now, safety) {
    now = Number.isFinite(now) ? now : Date.now(); safety = safety || {};
    var failures = list(health && health.failures).filter(function (at) { return now - at <= safety.circuitWindowMs; });
    if (outcome === 'failure') failures.push(now); if (outcome === 'success') failures = [];
    return Object.freeze({failures: Object.freeze(failures), circuitOpen: failures.length >= safety.maxFailures, updatedAt: now});
  }

  function choosePlan(config, context, health) {
    context = context || {}; var errors = validateConfig(config);
    if (errors.length) return {provider: 'house', reason: errors[0], usePrebid: false};
    if (config.enabled !== true || config.emergencyDisabled === true) return {provider: 'house', reason: 'STAGE3_DISABLED_PRE_APPROVAL', usePrebid: false};
    if (context.online === false) return {provider: 'house', reason: 'OFFLINE_NO_ADS', usePrebid: false};
    if (context.printing === true) return {provider: 'house', reason: 'PRINT_NO_ADS', usePrebid: false};
    if (list(config.routing.blockedRoutes).indexOf(text(context.route)) >= 0) return {provider: 'house', reason: 'CORE_OR_POLICY_ROUTE_BLOCKED', usePrebid: false};
    if (list(config.routing.allowedSurfaces).indexOf(text(context.surface)) < 0) return {provider: 'house', reason: 'SURFACE_NOT_ALLOWED', usePrebid: false};
    var privacy = privacyDecision(config, context); if (!privacy.allowed) return {provider: 'house', reason: privacy.reason, usePrebid: false};
    var bucket = hashBucket(text(context.experimentSeed) || 'anonymous-page');
    if (bucket < config.routing.noAdHoldoutPercent) return {provider: 'house', reason: 'NO_AD_HOLDOUT', usePrebid: false};
    if (isCircuitOpen(health, context.now, config.safety)) return {provider: 'house', reason: 'MARKETPLACE_CIRCUIT_OPEN', usePrebid: false};
    if (!verified(channel(config, 'ad-exchange')) && !verified(channel(config, 'open-bidding')) && !verified(channel(config, 'direct-sold')) && !verified(channel(config, 'prebid'))) return {provider: 'house', reason: 'NO_VERIFIED_DEMAND', usePrebid: false};
    var usePrebid = config.prebid.enabled === true && verified(channel(config, 'prebid')) && bucket < config.prebid.rolloutPercent;
    return {provider: 'google-ad-manager', reason: usePrebid ? 'ELIGIBLE_STAGE3_PREBID_AND_GAM' : 'ELIGIBLE_STAGE3_GAM', usePrebid: usePrebid, mode: 'contextual'};
  }

  function sanitizeTargeting(config, values) {
    var allowed = list(config.targeting && config.targeting.allowedKeys); var forbidden = list(config.targeting && config.targeting.forbiddenKeys); var result = {};
    Object.keys(values || {}).forEach(function (key) {
      var value = text(values[key]);
      if (allowed.indexOf(key) >= 0 && forbidden.indexOf(key) < 0 && /^[A-Za-z0-9._-]{1,40}$/.test(value)) result[key] = value;
    });
    return result;
  }

  function createMetrics() { return {requests: 0, impressions: 0, unfilled: 0, timeouts: 0, prebidAuctions: 0, prebidTimeouts: 0, bidResponses: 0, revenueMicros: 0, lcpMs: 0, cls: 0}; }
  function recordMetric(metrics, name, value) {
    if (Object.keys(createMetrics()).indexOf(name) < 0 || !Number.isFinite(value) || value < 0) return false;
    metrics[name] = Number(metrics[name] || 0) + value; return true;
  }

  function renderHouse(slot, reason) {
    if (!slot) return; slot.replaceChildren(); slot.dataset.adState = 'house'; slot.dataset.adReason = reason;
    var box = slot.ownerDocument.createElement('div'); box.className = 'house-message';
    var label = slot.ownerDocument.createElement('span'); label.textContent = 'Stock Scanner learning';
    var copy = slot.ownerDocument.createElement('p'); copy.textContent = 'Advertising is not active. Research education remains available without an ad request.';
    var link = slot.ownerDocument.createElement('a'); link.href = 'stock-scanner.html#scan'; link.textContent = 'Open the synthetic scanner';
    box.append(label, copy, link); slot.append(box);
  }

  function loadScript(windowLike, path, marker, integrity, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var documentLike = windowLike.document; var existing = documentLike.querySelector('script[' + marker + ']'); if (existing) return resolve('existing');
      var url = new URL(path, windowLike.location.href); if (url.origin !== windowLike.location.origin) return reject(new Error('CROSS_ORIGIN_PROVIDER_FORBIDDEN'));
      var script = documentLike.createElement('script'); var timer = setTimeout(function () { script.remove(); reject(new Error('PROVIDER_TIMEOUT')); }, timeoutMs);
      script.async = true; script.setAttribute(marker, 'true'); if (integrity) { script.integrity = integrity; script.crossOrigin = 'anonymous'; }
      script.src = url.href; script.onload = function () { clearTimeout(timer); resolve('loaded'); }; script.onerror = function () { clearTimeout(timer); reject(new Error('PROVIDER_LOAD_FAILED')); };
      documentLike.head.append(script);
    });
  }

  function buildAdUnits(config, slots) {
    return slots.map(function (slot) {
      var key = text(slot.dataset.adSlotKey); var item = config.inventory[key];
      var bids = list(config.prebid.allowedAdapters).slice(0, config.prebid.maximumBiddersPerSlot).map(function (adapter) { return {bidder: adapter.code, params: adapter.placements[key] || {}}; });
      return {code: slot.id, mediaTypes: {banner: {sizes: item.sizes}}, bids: bids};
    });
  }

  function runPrebid(windowLike, config, slots, metrics) {
    return loadScript(windowLike, config.prebid.selfHostedBundlePath, 'data-stock-scanner-prebid', config.prebid.bundleSri, config.prebid.auctionTimeoutMs).then(function () {
      return new Promise(function (resolve) {
        var pbjs = windowLike.pbjs = windowLike.pbjs || {que: []}; var settled = false;
        var finish = function (timedOut) { if (settled) return; settled = true; if (timedOut) recordMetric(metrics, 'prebidTimeouts', 1); resolve({timedOut: timedOut}); };
        var timer = setTimeout(function () { finish(true); }, config.prebid.auctionTimeoutMs + 50);
        pbjs.que.push(function () {
          pbjs.setConfig({bidderTimeout: config.prebid.auctionTimeoutMs, enableSendAllBids: false, useBidCache: false, deviceAccess: false, allowActivities: {accessDevice: {default: false}, syncUser: {default: false}, transmitUfpd: {default: false}}, allowTopWindowRenderers: false});
          pbjs.addAdUnits(buildAdUnits(config, slots)); recordMetric(metrics, 'prebidAuctions', 1);
          pbjs.requestBids({adUnitCodes: slots.map(function (slot) { return slot.id; }), timeout: config.prebid.auctionTimeoutMs, bidsBackHandler: function (responses, timedOut) { clearTimeout(timer); recordMetric(metrics, 'bidResponses', Object.keys(responses || {}).length); if (typeof pbjs.setTargetingForGPTAsync === 'function') pbjs.setTargetingForGPTAsync(); finish(!!timedOut); }});
        });
      });
    });
  }

  function loadGpt(windowLike, timeoutMs) {
    windowLike.googletag = windowLike.googletag || {cmd: []};
    windowLike.googletag.cmd.push(function () { windowLike.googletag.setConfig({disableInitialLoad: true}); });
    var found = windowLike.document.querySelector('script[data-stock-scanner-gpt]'); if (found) return Promise.resolve('existing');
    return new Promise(function (resolve, reject) {
      var script = windowLike.document.createElement('script'); var timer = setTimeout(function () { script.remove(); reject(new Error('GAM_PROVIDER_TIMEOUT')); }, timeoutMs);
      script.async = true; script.crossOrigin = 'anonymous'; script.dataset.stockScannerGpt = 'true'; script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
      script.onload = function () { clearTimeout(timer); resolve('loaded'); }; script.onerror = function () { clearTimeout(timer); reject(new Error('GAM_PROVIDER_LOAD_FAILED')); }; windowLike.document.head.append(script);
    });
  }

  function requestGam(windowLike, config, slots, metrics) {
    return loadGpt(windowLike, config.auction.totalTimeoutMs).then(function () { return new Promise(function (resolve) {
      windowLike.googletag.cmd.push(function () {
        var pubads = windowLike.googletag.pubads(); var targeting = sanitizeTargeting(config, config.targeting.staticValues);
        Object.keys(targeting).forEach(function (key) { pubads.setTargeting(key, targeting[key]); });
        windowLike.googletag.setConfig({privacySettings: {restrictDataProcessing: true}});
        if (!windowLike.__stockScannerStage3MetricsBound) { pubads.addEventListener('slotRenderEnded', function (event) { recordMetric(metrics, event.isEmpty ? 'unfilled' : 'impressions', 1); }); windowLike.__stockScannerStage3MetricsBound = true; }
        var defined = slots.map(function (slot) { var key = text(slot.dataset.adSlotKey); var item = config.inventory[key]; var unit = windowLike.googletag.defineSlot(item.adUnitPath, item.sizes, slot.id); if (!unit) return null; unit.setTargeting('ss_slot', item.position); return unit.setCollapseEmptyDiv(item.collapseEmpty !== false).addService(pubads); }).filter(Boolean);
        windowLike.googletag.enableServices(); defined.forEach(function (unit, index) { windowLike.googletag.display(slots[index].id); slots[index].dataset.adState = 'requested'; });
        if (defined.length) pubads.refresh(defined); resolve(defined.length);
      });
    }); });
  }

  function routeName(locationLike) {
    var path = text(locationLike && locationLike.pathname).toLowerCase();
    if (/privacy-choices|\/legal\//.test(path)) return 'legal'; if (/support/.test(path)) return 'support'; if (/status/.test(path)) return 'status'; if (/learn/.test(path)) return 'education'; if (/stock-scanner/.test(path)) return text(locationLike && locationLike.hash).replace(/^#/, '') || 'today'; return 'unknown';
  }

  function initialize(windowLike) {
    windowLike = windowLike || (typeof window !== 'undefined' ? window : null); if (!windowLike || !windowLike.document) return Promise.resolve({provider: 'house', reason: 'NO_DOCUMENT'});
    var config = windowLike.STOCK_SCANNER_AD_MARKETPLACE_CONFIG || {}; var maximum = config.routing && config.routing.maxAdsPerPage || 0;
    var slots = Array.from(windowLike.document.querySelectorAll('[data-ad-surface]')); slots.slice(maximum).forEach(function (slot) { renderHouse(slot, 'AD_DENSITY_LIMIT'); }); slots = slots.slice(0, maximum);
    slots.forEach(function (slot, index) { slot.id = slot.id || 'ss-marketplace-' + text(slot.dataset.adSlotKey || index); });
    var plan = choosePlan(config, {route: routeName(windowLike.location), surface: slots[0] && slots[0].dataset.adSurface, online: !windowLike.navigator || windowLike.navigator.onLine !== false, printing: windowLike.matchMedia && windowLike.matchMedia('print').matches, gpc: !!(windowLike.navigator && windowLike.navigator.globalPrivacyControl === true), consent: windowLike.STOCK_SCANNER_CERTIFIED_CONSENT || {}, experimentSeed: ephemeralSeed(windowLike), now: Date.now()}, windowLike.STOCK_SCANNER_MARKETPLACE_HEALTH || {});
    if (plan.provider !== 'google-ad-manager') { slots.forEach(function (slot) { renderHouse(slot, plan.reason); }); return Promise.resolve(plan); }
    var metrics = windowLike.STOCK_SCANNER_MARKETPLACE_METRICS || (windowLike.STOCK_SCANNER_MARKETPLACE_METRICS = createMetrics()); recordMetric(metrics, 'requests', slots.length);
    var prebid = plan.usePrebid ? runPrebid(windowLike, config, slots, metrics) : Promise.resolve({timedOut: false});
    return prebid.then(function () { return requestGam(windowLike, config, slots, metrics); }).then(function (count) { windowLike.STOCK_SCANNER_MARKETPLACE_HEALTH = recordHealth(windowLike.STOCK_SCANNER_MARKETPLACE_HEALTH || {}, 'success', Date.now(), config.safety); if (!count) throw new Error('NO_VALID_GAM_SLOTS'); return plan; }).catch(function (error) { windowLike.STOCK_SCANNER_MARKETPLACE_HEALTH = recordHealth(windowLike.STOCK_SCANNER_MARKETPLACE_HEALTH || {}, 'failure', Date.now(), config.safety); if (/TIMEOUT/.test(error.message)) recordMetric(metrics, 'timeouts', 1); slots.forEach(function (slot) { renderHouse(slot, error.message); }); return {provider: 'house', reason: error.message, usePrebid: false}; });
  }

  var api = Object.freeze({validateConfig: validateConfig, hashBucket: hashBucket, privacyDecision: privacyDecision, isCircuitOpen: isCircuitOpen, recordHealth: recordHealth, choosePlan: choosePlan, sanitizeTargeting: sanitizeTargeting, createMetrics: createMetrics, recordMetric: recordMetric, buildAdUnits: buildAdUnits, routeName: routeName, initialize: initialize});
  if (typeof window !== 'undefined' && window.document) window.addEventListener('DOMContentLoaded', function () { initialize(window); }, {once: true});
  return api;
}));
