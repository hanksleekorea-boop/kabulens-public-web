/* Single public, secret-free slot manifest. All slots stay disabled until external approval and IDs exist. */
(function (root) {
  'use strict';
  root.STOCK_SCANNER_AD_SLOT_MANIFEST = Object.freeze({
    schemaVersion: 'stock-scanner-adsense-slot-manifest/v1',
    defaultEnabled: false,
    pilotSlotKeys: Object.freeze([
      'LM26-22-stockscanner-education-pc-inarticle-v1',
      'LM26-22-stockscanner-education-m-inarticle-v1'
    ]),
    slots: Object.freeze([
      Object.freeze({
        key: 'LM26-22-stockscanner-education-pc-inarticle-v1',
        viewport: 'desktop',
        surface: 'education',
        route: 'education',
        format: 'in-article',
        enabled: false,
        pilot: true,
        file: 'learn.html',
        anchor: '#stockScannerEducationPilotAd',
        component: 'education-method-guide',
        contentBoundary: 'after-complete-general-education-section',
        houseCreative: true,
        slotId: ''
      }),
      Object.freeze({
        key: 'LM26-22-stockscanner-glossary-pc-display-v1',
        viewport: 'desktop',
        surface: 'education',
        route: 'education',
        format: 'responsive-display',
        enabled: false,
        pilot: false,
        file: 'learn.html',
        anchor: '#glossary',
        component: 'education-glossary',
        contentBoundary: 'below-complete-glossary-and-risk-notice',
        houseCreative: true,
        slotId: ''
      }),
      Object.freeze({
        key: 'LM26-22-stockscanner-guide-end-pc-multiplex-v1',
        viewport: 'desktop',
        surface: 'education',
        route: 'education',
        format: 'multiplex',
        enabled: false,
        pilot: false,
        file: 'learn.html',
        anchor: '#guide-end-ad',
        component: 'education-guide-end',
        contentBoundary: 'after-guide-conclusion',
        houseCreative: true,
        slotId: ''
      }),
      Object.freeze({
        key: 'LM26-22-stockscanner-education-m-inarticle-v1',
        viewport: 'mobile',
        surface: 'education',
        route: 'education',
        format: 'in-article',
        enabled: false,
        pilot: true,
        file: 'learn.html',
        anchor: '#stockScannerEducationPilotAd',
        component: 'education-method-guide',
        contentBoundary: 'after-complete-general-education-section',
        houseCreative: true,
        slotId: ''
      })
    ])
  });
}(typeof window === 'undefined' ? globalThis : window));
