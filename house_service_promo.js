/* First-party house creative for Stock Scanner. It never loads an ad network. */
(function (root, factory) {
  'use strict';
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.StockScannerHouseServicePromo = api;
}(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  var LOGO_PATH = 'icon.svg';
  var TRUST_LINE = '투자 자문이 아니며 손실 가능성과 정보 시점을 직접 확인해야 합니다.';
  var COPY = Object.freeze({
    'LM26-22-stockscanner-education-pc-inarticle-v1': Object.freeze({
      label: '자체 서비스 안내',
      headline: '주식 정보를 배우고 기준으로 살펴보기',
      description: '시장 데이터와 교육 자료를 살펴보고 나만의 종목 확인 기준을 차분하게 정리하세요.',
      trustLine: TRUST_LINE,
      cta: '시장 공부',
      destination: 'learn.html#methods'
    }),
    'LM26-22-stockscanner-glossary-pc-display-v1': Object.freeze({
      label: '자체 서비스 안내',
      headline: '종목 탐색과 시장 공부를 한곳에서',
      description: '종목 화면·조건 검색·알림을 활용해 시장을 공부하는 정보 서비스입니다.',
      trustLine: TRUST_LINE,
      cta: '종목 탐색',
      destination: 'stock-scanner.html#scan'
    }),
    'LM26-22-stockscanner-guide-end-pc-multiplex-v1': Object.freeze({
      label: '자체 서비스 안내',
      headline: '알림보다 먼저 투자 기준을 점검',
      description: '상승을 약속하지 않고 데이터의 시점과 위험을 함께 보여주도록 설계했습니다.',
      trustLine: TRUST_LINE,
      cta: '기준 확인',
      destination: 'learn.html#combine'
    }),
    'LM26-22-stockscanner-education-m-inarticle-v1': Object.freeze({
      label: '자체 서비스 안내',
      headline: '주식 정보를 배우고 기준으로 살펴보기',
      description: '시장 데이터와 교육 자료를 살펴보고 나만의 종목 확인 기준을 차분하게 정리하세요.',
      trustLine: TRUST_LINE,
      cta: '시장 공부',
      destination: 'learn.html#methods'
    })
  });

  function text(value) { return String(value == null ? '' : value).trim(); }
  function slotKeys() { return Object.keys(COPY); }
  function copyFor(key) { return COPY[text(key)] || null; }
  function isLiveAdsEnabled(rootLike, options) {
    options = options || {};
    if (options.liveAdsEnabled === true) return true;
    var configs = [
      rootLike && rootLike.STOCK_SCANNER_AD_CONFIG,
      rootLike && rootLike.STOCK_SCANNER_AD_DEMAND_CONFIG,
      rootLike && rootLike.STOCK_SCANNER_AD_MARKETPLACE_CONFIG
    ];
    return configs.some(function (config) { return config && config.liveAdsEnabled === true; });
  }
  function selectedKey(slot, rootLike) {
    if (!slot) return '';
    if (rootLike && rootLike.StockScannerAds && typeof rootLike.StockScannerAds.selectSlotKey === 'function') return text(rootLike.StockScannerAds.selectSlotKey(slot, rootLike));
    if (slot.dataset.adPilot === 'true' && rootLike && rootLike.matchMedia && rootLike.matchMedia('(max-width: 899px)').matches) return text(slot.dataset.adSlotKeyMobile || slot.dataset.adSlotKey);
    return text(slot.dataset.adSlotKey);
  }
  function manifestHas(manifest, key) {
    if (!manifest || !Array.isArray(manifest.slots)) return true;
    return !!manifest.slots.find(function (entry) { return entry && text(entry.key) === text(key); });
  }
  function render(slot, key, rootLike, options) {
    if (!slot || !slot.ownerDocument) return false;
    key = text(key || slot.dataset.adSlotKey);
    var copy = copyFor(key);
    if (!copy) return false;
    if (isLiveAdsEnabled(rootLike, options)) {
      var existing = slot.querySelector('[data-house-service-promo]');
      if (existing) existing.remove();
      slot.dataset.houseCreative = 'hidden-live-ads';
      return false;
    }
    var documentLike = slot.ownerDocument;
    var card = documentLike.createElement('div');
    var titleId = 'housePromoTitle-' + key.replace(/[^A-Za-z0-9_-]/g, '-');
    card.className = 'house-service-promo';
    card.dataset.houseServicePromo = 'true';
    card.dataset.houseSlotKey = key;
    card.setAttribute('role', 'complementary');
    card.setAttribute('aria-labelledby', titleId);
    var header = documentLike.createElement('div');
    header.className = 'house-service-promo-header';
    var logo = documentLike.createElement('img');
    logo.className = 'house-service-promo-logo';
    logo.src = LOGO_PATH;
    logo.alt = 'Stock Scanner 로고';
    logo.width = 32;
    logo.height = 32;
    var label = documentLike.createElement('span');
    label.className = 'house-service-promo-label';
    label.textContent = copy.label;
    header.append(logo, label);
    var title = documentLike.createElement('h3');
    title.id = titleId;
    title.textContent = copy.headline;
    var description = documentLike.createElement('p');
    description.className = 'house-service-promo-description';
    description.textContent = copy.description;
    var trust = documentLike.createElement('p');
    trust.className = 'house-service-promo-trust';
    trust.textContent = copy.trustLine;
    var cta = documentLike.createElement('a');
    cta.className = 'house-service-promo-cta';
    cta.href = copy.destination;
    cta.textContent = copy.cta;
    cta.setAttribute('aria-label', copy.cta + ' · Stock Scanner');
    card.append(header, title, description, trust, cta);
    var old = slot.querySelector('[data-house-service-promo]');
    if (old) old.remove();
    slot.append(card);
    slot.dataset.houseCreative = 'shown';
    slot.dataset.adState = 'house';
    slot.dataset.adReason = 'HOUSE_SERVICE_PROMO';
    return true;
  }
  function renderAll(rootLike, options) {
    rootLike = rootLike || (typeof window !== 'undefined' ? window : null);
    if (!rootLike || !rootLike.document) return { rendered: 0, hidden: 0 };
    var manifest = rootLike.STOCK_SCANNER_AD_SLOT_MANIFEST || null;
    var rendered = 0;
    var hidden = 0;
    Array.from(rootLike.document.querySelectorAll('[data-ad-surface]')).forEach(function (slot) {
      var key = selectedKey(slot, rootLike);
      if (!copyFor(key) || !manifestHas(manifest, key)) return;
      if (render(slot, key, rootLike, options)) rendered += 1;
      else if (isLiveAdsEnabled(rootLike, options)) hidden += 1;
    });
    return { rendered: rendered, hidden: hidden };
  }
  var api = Object.freeze({
    logoPath: LOGO_PATH,
    trustLine: TRUST_LINE,
    slotKeys: slotKeys,
    copyFor: copyFor,
    isLiveAdsEnabled: isLiveAdsEnabled,
    render: render,
    renderAll: renderAll
  });
  if (typeof window !== 'undefined' && window.document) window.addEventListener('DOMContentLoaded', function () { renderAll(window); }, { once: true });
  return api;
}));
