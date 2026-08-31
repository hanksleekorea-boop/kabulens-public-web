(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StockScannerAds = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var PUBLISHER_PATTERN = /^ca-pub-\d{16}$/;
  var SLOT_PATTERN = /^\d{6,12}$/;
  var SLOT_FORMATS = ['responsive-display', 'in-article', 'multiplex'];
  var CERTIFIED_SOURCES = ['google-certified-cmp', 'tcf-v2.3', 'gpp'];

  function text(value) { return String(value == null ? '' : value).trim(); }
  function list(value) { return Array.isArray(value) ? value.map(text).filter(Boolean) : []; }
  function validateConfig(config) {
    var errors = [];
    if (!config || config.schemaVersion !== 'stock-scanner-ad-config/v1') errors.push('CONFIG_SCHEMA_INVALID');
    if (config && config.provider !== 'google-adsense') errors.push('PROVIDER_NOT_ALLOWED_STAGE1');
    if (config && config.enabled && !PUBLISHER_PATTERN.test(text(config.publisherId))) errors.push('PUBLISHER_ID_INVALID');
    if (config && config.enabled && (!config.cmp || config.cmp.accountConfigured !== true)) errors.push('CERTIFIED_CMP_NOT_CONFIGURED');
    if (config && config.enabled && config.slotFormats && Object.keys(config.slotFormats).some(function (key) { return SLOT_FORMATS.indexOf(text(config.slotFormats[key])) < 0; })) errors.push('AD_FORMAT_INVALID');
    if (config && (!Number.isInteger(config.maxAdsPerPage) || config.maxAdsPerPage < 0 || config.maxAdsPerPage > 2)) errors.push('AD_DENSITY_INVALID');
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

  function decide(input) {
    input = input || {};
    var config = input.config || {};
    var errors = validateConfig(config);
    var surface = text(input.surface);
    var route = text(input.route);
    var consent = input.consent || {};
    if (errors.length) return { allowed: false, reason: errors[0] };
    if (config.enabled !== true) return { allowed: false, reason: 'ADS_DISABLED_PRE_APPROVAL' };
    if (input.online === false) return { allowed: false, reason: 'OFFLINE_NO_ADS' };
    if (input.printing === true) return { allowed: false, reason: 'PRINT_NO_ADS' };
    if (list(config.blockedRoutes).indexOf(route) >= 0) return { allowed: false, reason: 'CORE_OR_POLICY_ROUTE_BLOCKED' };
    if (list(config.allowedSurfaces).indexOf(surface) < 0) return { allowed: false, reason: 'SURFACE_NOT_ALLOWED' };
    if (config.cmp.requireCertifiedSignal === true) {
      if (consent.certified !== true || CERTIFIED_SOURCES.indexOf(text(consent.source)) < 0) return { allowed: false, reason: 'CERTIFIED_CONSENT_REQUIRED' };
      if (consent.adsAllowed !== true) return { allowed: false, reason: 'AD_CONSENT_DENIED' };
    }
    return { allowed: true, reason: 'ELIGIBLE_CONTEXTUAL_EDUCATION_SURFACE' };
  }

  function renderFallback(slot, reason) {
    if (!slot) return;
    slot.replaceChildren();
    slot.dataset.adState = 'house';
    slot.dataset.adReason = reason;
    var box = slot.ownerDocument.createElement('div');
    box.className = 'house-message';
    var label = slot.ownerDocument.createElement('span');
    label.textContent = 'Stock Scanner learning';
    var copy = slot.ownerDocument.createElement('p');
    copy.textContent = 'Advertising is not active. Explore the free methodology guide without tracking.';
    var link = slot.ownerDocument.createElement('a');
    link.href = 'stock-scanner.html#scan';
    link.textContent = 'Open the synthetic scanner';
    box.append(label, copy, link);
    slot.append(box);
  }

  function renderAdSlot(slot, config) {
    var key = text(slot.dataset.adSlotKey);
    var slotId = text(config.slotIds && config.slotIds[key]);
    var format = text(config.slotFormats && config.slotFormats[key]) || 'responsive-display';
    if (!SLOT_PATTERN.test(slotId)) {
      renderFallback(slot, 'AD_SLOT_ID_INVALID');
      return false;
    }
    slot.replaceChildren();
    slot.dataset.adState = 'requested';
    var label = slot.ownerDocument.createElement('span');
    label.className = 'ad-label';
    label.textContent = 'Advertisement';
    var ad = slot.ownerDocument.createElement('ins');
    ad.className = 'adsbygoogle';
    ad.style.display = 'block';
    ad.dataset.adClient = config.publisherId;
    ad.dataset.adSlot = slotId;
    if (format === 'in-article') {
      ad.dataset.adLayout = 'in-article';
      ad.dataset.adFormat = 'fluid';
    } else if (format === 'multiplex') {
      ad.dataset.adFormat = 'autorelaxed';
    } else {
      ad.dataset.adFormat = 'auto';
      ad.dataset.fullWidthResponsive = 'true';
    }
    slot.dataset.adFormat = format;
    slot.append(label, ad);
    return true;
  }

  function loadProvider(documentLike, config, timeoutMs) {
    return new Promise(function (resolve, reject) {
      if (documentLike.querySelector('script[data-stock-scanner-ad-provider]')) return resolve('existing');
      var script = documentLike.createElement('script');
      var timeout = setTimeout(function () { script.remove(); reject(new Error('AD_PROVIDER_TIMEOUT')); }, timeoutMs || 900);
      script.async = true;
      script.crossOrigin = 'anonymous';
      script.dataset.stockScannerAdProvider = 'google-adsense';
      script.src = 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=' + encodeURIComponent(config.publisherId);
      script.onload = function () { clearTimeout(timeout); resolve('loaded'); };
      script.onerror = function () { clearTimeout(timeout); reject(new Error('AD_PROVIDER_LOAD_FAILED')); };
      documentLike.head.append(script);
    });
  }

  function initialize(rootLike) {
    rootLike = rootLike || (typeof window !== 'undefined' ? window : null);
    if (!rootLike || !rootLike.document) return Promise.resolve({ allowed: false, reason: 'NO_DOCUMENT' });
    var config = rootLike.STOCK_SCANNER_AD_CONFIG || {};
    var slots = Array.from(rootLike.document.querySelectorAll('[data-ad-surface]'));
    var surface = slots.length ? text(slots[0].dataset.adSurface) : '';
    var decision = decide({
      config: config,
      consent: rootLike.STOCK_SCANNER_CERTIFIED_CONSENT || {},
      route: routeName(rootLike.location),
      surface: surface,
      online: rootLike.navigator ? rootLike.navigator.onLine !== false : true,
      printing: rootLike.matchMedia ? rootLike.matchMedia('print').matches : false
    });
    slots.slice(config.maxAdsPerPage || 0).forEach(function (slot) { renderFallback(slot, 'AD_DENSITY_LIMIT'); });
    slots = slots.slice(0, config.maxAdsPerPage || 0);
    if (!decision.allowed) {
      slots.forEach(function (slot) { renderFallback(slot, decision.reason); });
      return Promise.resolve(decision);
    }
    var requested = slots.filter(function (slot) { return renderAdSlot(slot, config); });
    if (!requested.length) return Promise.resolve({ allowed: false, reason: 'NO_VALID_AD_SLOTS' });
    return loadProvider(rootLike.document, config, config.requestTimeoutMs).then(function () {
      requested.forEach(function () {
        try { (rootLike.adsbygoogle = rootLike.adsbygoogle || []).push({}); }
        catch (error) { /* Provider failures never break educational content. */ }
      });
      return decision;
    }).catch(function (error) {
      requested.forEach(function (slot) { renderFallback(slot, error.message); });
      return { allowed: false, reason: error.message };
    });
  }

  function setCertifiedConsent(rootLike, signal) {
    if (!rootLike || !signal || signal.certified !== true || CERTIFIED_SOURCES.indexOf(text(signal.source)) < 0) return false;
    rootLike.STOCK_SCANNER_CERTIFIED_CONSENT = Object.freeze({
      certified: true,
      source: text(signal.source),
      adsAllowed: signal.adsAllowed === true,
      mode: signal.mode === 'personalized' ? 'personalized' : 'contextual'
    });
    return true;
  }

  var api = Object.freeze({ validateConfig: validateConfig, routeName: routeName, decide: decide, initialize: initialize, setCertifiedConsent: setCertifiedConsent });
  if (typeof window !== 'undefined' && window.document) window.addEventListener('DOMContentLoaded', function () {
    if (!window.STOCK_SCANNER_AD_DEMAND_CONFIG) initialize(window);
  }, { once: true });
  return api;
}));
