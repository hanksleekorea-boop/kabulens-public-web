(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StockScannerAdOrchestrator = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var NETWORK = /^\d{4,12}$/;
  var UNIT_PATH = /^\/\d{4,12}\/[A-Za-z0-9._/-]{1,120}$/;
  var SOURCES = ['google-certified-cmp', 'tcf-v2.3', 'gpp'];

  function text(value) { return String(value == null ? '' : value).trim(); }
  function list(value) { return Array.isArray(value) ? value : []; }
  function validateConfig(config) {
    var errors = [];
    if (!config || config.schemaVersion !== 'stock-scanner-ad-demand/v2') errors.push('DEMAND_SCHEMA_INVALID');
    if (config && config.adServer !== 'google-ad-manager') errors.push('AD_SERVER_NOT_ALLOWED_STAGE2');
    if (config && config.enabled && !NETWORK.test(text(config.networkCode))) errors.push('GAM_NETWORK_INVALID');
    var inventory = config && config.inventory || {};
    if (config && config.enabled && Object.keys(inventory).some(function (key) { return !UNIT_PATH.test(text(inventory[key].adUnitPath)); })) errors.push('GAM_AD_UNIT_INVALID');
    if (config && (!config.routing || config.routing.maxAdsPerPage !== 2)) errors.push('AD_DENSITY_INVALID');
    if (config && (!config.safety || config.safety.refreshEnabled !== false)) errors.push('AUTO_REFRESH_FORBIDDEN_STAGE2');
    if (config && (!config.reporting || config.reporting.aggregateOnly !== true || config.reporting.userIdentifiers !== false)) errors.push('REPORTING_PRIVACY_INVALID');
    return errors;
  }

  function routeName(locationLike) {
    var path = text(locationLike && locationLike.pathname).toLowerCase();
    if (/privacy-choices|\/legal\//.test(path)) return 'legal';
    if (/support/.test(path)) return 'support';
    if (/status/.test(path)) return 'status';
    if (/learn/.test(path)) return 'education';
    if (/stock-scanner/.test(path)) return text(locationLike && locationLike.hash).replace(/^#/, '') || 'today';
    return 'unknown';
  }

  function hashBucket(seed) {
    var hash = 2166136261;
    var value = text(seed);
    for (var i = 0; i < value.length; i += 1) { hash ^= value.charCodeAt(i); hash = Math.imul(hash, 16777619); }
    return (hash >>> 0) % 100;
  }

  function ephemeralSeed(windowLike) {
    var values = new Uint32Array(2);
    if (windowLike && windowLike.crypto && typeof windowLike.crypto.getRandomValues === 'function') {
      windowLike.crypto.getRandomValues(values);
      return values[0].toString(16) + values[1].toString(16);
    }
    return String(Date.now()) + '|' + String(Math.random());
  }

  function createMetrics() {
    return {requests: 0, impressions: 0, unfilled: 0, timeouts: 0, revenueMicros: 0, lcpMs: 0, cls: 0};
  }

  function recordMetric(metrics, name, value) {
    var allowed = Object.keys(createMetrics());
    if (allowed.indexOf(name) < 0 || !Number.isFinite(value) || value < 0) return false;
    metrics[name] = Number(metrics[name] || 0) + value;
    return true;
  }

  function consentDecision(config, context) {
    var privacy = config.privacy || {};
    var consent = context.consent || {};
    if (privacy.gpcOptOut === true && context.gpc === true) return {allowed: false, reason: 'GPC_OPT_OUT'};
    if (privacy.childDirected === true || privacy.underAgeOfConsent === true) return {allowed: false, reason: 'AGE_RESTRICTED_NO_ADS'};
    if (privacy.certifiedCmpRequired === true) {
      if (consent.certified !== true || SOURCES.indexOf(text(consent.source)) < 0) return {allowed: false, reason: 'CERTIFIED_CONSENT_REQUIRED'};
      if (consent.adsAllowed !== true) return {allowed: false, reason: 'AD_CONSENT_DENIED'};
    }
    return {allowed: true, mode: consent.mode === 'personalized' ? 'personalized' : 'contextual'};
  }

  function isCircuitOpen(health, now, safety) {
    health = health || {};
    now = Number.isFinite(now) ? now : Date.now();
    var failures = list(health.failures).filter(function (at) { return now - at <= safety.circuitWindowMs; });
    return failures.length >= safety.maxFailures;
  }

  function recordHealth(health, outcome, now, safety) {
    now = Number.isFinite(now) ? now : Date.now();
    var failures = list(health && health.failures).filter(function (at) { return now - at <= safety.circuitWindowMs; });
    if (outcome === 'failure') failures.push(now);
    if (outcome === 'success') failures = [];
    return Object.freeze({failures: Object.freeze(failures), circuitOpen: failures.length >= safety.maxFailures, updatedAt: now});
  }

  function selectDemand(config, context, health) {
    context = context || {};
    var errors = validateConfig(config);
    if (errors.length) return {provider: 'house', reason: errors[0]};
    if (config.enabled !== true) return {provider: 'house', reason: 'STAGE2_DISABLED_PRE_APPROVAL'};
    if (context.online === false) return {provider: 'house', reason: 'OFFLINE_NO_ADS'};
    if (context.printing === true) return {provider: 'house', reason: 'PRINT_NO_ADS'};
    if (list(config.routing.blockedRoutes).indexOf(text(context.route)) >= 0) return {provider: 'house', reason: 'CORE_OR_POLICY_ROUTE_BLOCKED'};
    if (list(config.routing.allowedSurfaces).indexOf(text(context.surface)) < 0) return {provider: 'house', reason: 'SURFACE_NOT_ALLOWED'};
    var privacy = consentDecision(config, context);
    if (!privacy.allowed) return {provider: 'house', reason: privacy.reason};
    if (hashBucket(text(context.experimentSeed) || 'anonymous-page') < config.routing.holdoutPercent) return {provider: 'house', reason: 'NO_AD_HOLDOUT'};
    if (isCircuitOpen(health, context.now, config.safety)) return {provider: 'house', reason: 'PROVIDER_CIRCUIT_OPEN'};
    var gam = list(config.demand).find(function (item) { return item.id === 'google-ad-manager'; });
    if (!gam || gam.enabled !== true || gam.verified !== true || gam.contractConfirmed !== true) return {provider: 'house', reason: 'GAM_NOT_VERIFIED'};
    return {provider: 'google-ad-manager', reason: 'ELIGIBLE_GAM_EDUCATION_SURFACE', mode: privacy.mode};
  }

  function renderHouse(slot, reason) {
    if (!slot) return;
    slot.replaceChildren();
    slot.dataset.adState = 'house';
    slot.dataset.adReason = reason;
    var box = slot.ownerDocument.createElement('div'); box.className = 'house-message';
    var label = slot.ownerDocument.createElement('span'); label.textContent = 'Stock Scanner learning';
    var copy = slot.ownerDocument.createElement('p'); copy.textContent = 'Advertising is not active. Research education remains available without an ad request.';
    var link = slot.ownerDocument.createElement('a'); link.href = 'stock-scanner.html#scan'; link.textContent = 'Open the synthetic scanner';
    box.append(label, copy, link); slot.append(box);
  }

  function loadGpt(windowLike, timeoutMs) {
    return new Promise(function (resolve, reject) {
      var documentLike = windowLike.document;
      windowLike.googletag = windowLike.googletag || {cmd: []};
      windowLike.googletag.cmd.push(function () { windowLike.googletag.setConfig({disableInitialLoad: true}); });
      if (documentLike.querySelector('script[data-stock-scanner-gpt]')) return resolve('existing');
      var script = documentLike.createElement('script');
      var timer = setTimeout(function () { script.remove(); reject(new Error('GAM_PROVIDER_TIMEOUT')); }, timeoutMs);
      script.async = true; script.crossOrigin = 'anonymous'; script.dataset.stockScannerGpt = 'true';
      script.src = 'https://securepubads.g.doubleclick.net/tag/js/gpt.js';
      script.onload = function () { clearTimeout(timer); resolve('loaded'); };
      script.onerror = function () { clearTimeout(timer); reject(new Error('GAM_PROVIDER_LOAD_FAILED')); };
      documentLike.head.append(script);
    });
  }

  function requestGam(windowLike, config, slots) {
    return loadGpt(windowLike, config.safety.requestTimeoutMs).then(function () {
      return new Promise(function (resolve) {
        windowLike.googletag.cmd.push(function () {
          var pubads = windowLike.googletag.pubads();
          windowLike.googletag.setConfig({privacySettings: {restrictDataProcessing: true}});
          pubads.setTargeting('ss_surface', 'education');
          if (!windowLike.__stockScannerAdMetricsBound) {
            pubads.addEventListener('slotRenderEnded', function (event) {
              var metrics = windowLike.STOCK_SCANNER_AD_METRICS || (windowLike.STOCK_SCANNER_AD_METRICS = createMetrics());
              recordMetric(metrics, event.isEmpty ? 'unfilled' : 'impressions', 1);
            });
            windowLike.__stockScannerAdMetricsBound = true;
          }
          var defined = slots.map(function (slot) {
            var key = text(slot.dataset.adSlotKey); var item = config.inventory[key];
            slot.id = slot.id || 'ss-ad-' + key;
            var unit = windowLike.googletag.defineSlot(item.adUnitPath, item.sizes, slot.id);
            if (!unit) return null;
            unit.setCollapseEmptyDiv(item.collapseEmpty !== false).addService(pubads);
            return {slot: slot, unit: unit};
          }).filter(Boolean);
          windowLike.googletag.enableServices();
          defined.forEach(function (item) { windowLike.googletag.display(item.slot.id); item.slot.dataset.adState = 'requested'; });
          if (defined.length) pubads.refresh(defined.map(function (item) { return item.unit; }));
          resolve(defined.length);
        });
      });
    });
  }

  function initialize(windowLike) {
    windowLike = windowLike || (typeof window !== 'undefined' ? window : null);
    if (!windowLike || !windowLike.document) return Promise.resolve({provider: 'house', reason: 'NO_DOCUMENT'});
    var config = windowLike.STOCK_SCANNER_AD_DEMAND_CONFIG || {};
    var slots = Array.from(windowLike.document.querySelectorAll('[data-ad-surface]'));
    slots.slice(config.routing && config.routing.maxAdsPerPage || 0).forEach(function (slot) { renderHouse(slot, 'AD_DENSITY_LIMIT'); });
    slots = slots.slice(0, config.routing && config.routing.maxAdsPerPage || 0);
    var decision = selectDemand(config, {
      route: routeName(windowLike.location), surface: slots[0] && slots[0].dataset.adSurface,
      online: !windowLike.navigator || windowLike.navigator.onLine !== false,
      printing: windowLike.matchMedia && windowLike.matchMedia('print').matches,
      gpc: !!(windowLike.navigator && windowLike.navigator.globalPrivacyControl === true),
      consent: windowLike.STOCK_SCANNER_CERTIFIED_CONSENT || {},
      experimentSeed: ephemeralSeed(windowLike), now: Date.now()
    }, windowLike.STOCK_SCANNER_AD_HEALTH || {});
    if (decision.provider !== 'google-ad-manager') { slots.forEach(function (slot) { renderHouse(slot, decision.reason); }); return Promise.resolve(decision); }
    var metrics = windowLike.STOCK_SCANNER_AD_METRICS || (windowLike.STOCK_SCANNER_AD_METRICS = createMetrics());
    recordMetric(metrics, 'requests', slots.length);
    return requestGam(windowLike, config, slots).then(function (count) {
      windowLike.STOCK_SCANNER_AD_HEALTH = recordHealth(windowLike.STOCK_SCANNER_AD_HEALTH || {}, 'success', Date.now(), config.safety);
      if (!count) { slots.forEach(function (slot) { renderHouse(slot, 'NO_VALID_GAM_SLOTS'); }); return {provider: 'house', reason: 'NO_VALID_GAM_SLOTS'}; }
      return decision;
    }).catch(function (error) {
      windowLike.STOCK_SCANNER_AD_HEALTH = recordHealth(windowLike.STOCK_SCANNER_AD_HEALTH || {}, 'failure', Date.now(), config.safety);
      if (error.message === 'GAM_PROVIDER_TIMEOUT') recordMetric(metrics, 'timeouts', 1);
      slots.forEach(function (slot) { renderHouse(slot, error.message); }); return {provider: 'house', reason: error.message};
    });
  }

  var api = Object.freeze({validateConfig: validateConfig, routeName: routeName, hashBucket: hashBucket, ephemeralSeed: ephemeralSeed, createMetrics: createMetrics, recordMetric: recordMetric, consentDecision: consentDecision, isCircuitOpen: isCircuitOpen, recordHealth: recordHealth, selectDemand: selectDemand, initialize: initialize});
  if (typeof window !== 'undefined' && window.document) window.addEventListener('DOMContentLoaded', function () { initialize(window); }, {once: true});
  return api;
}));
