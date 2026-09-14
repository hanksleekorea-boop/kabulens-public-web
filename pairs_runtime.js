(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const status = $('status');
  const result = $('result');
  const makeBars = (scale, phase) => {
    let price = 100;
    const rows = [];
    for (let index = 0; index < 252; index += 1) {
      const wave = Math.sin(index / 7 + phase) * 0.008 + Math.cos(index / 13 + phase) * 0.004;
      price *= 1 + 0.0005 + wave;
      rows.push({date: `2026-${String(1 + Math.floor(index / 28)).padStart(2, '0')}-${String(1 + (index % 28)).padStart(2, '0')}`, close: +(price * scale).toFixed(6)});
    }
    return rows;
  };
  const demoPayload = () => ({
    dataMode: 'SYNTHETIC_VALIDATION_ONLY',
    left: {instrumentId: 'US:XNAS:DEMO-A', currency: 'USD', shortStatus: 'AVAILABLE', bars: makeBars(1.03, 0.25)},
    right: {instrumentId: 'US:XNAS:DEMO-B', currency: 'USD', shortStatus: 'AVAILABLE', bars: makeBars(1, 0)},
    window: Number($('window').value), method: $('method').value, entryZ: Number($('entryZ').value), minimumCorrelation: Number($('minimumCorrelation').value), minimumObservations: Number($('window').value)
  });
  const metric = (label, value, note) => `<div class="metric"><dt>${label}</dt><dd>${value}<small>${note || ''}</small></dd></div>`;
  const render = (value) => {
    const signal = value.signal || {};
    const blocked = String(signal.status || '').startsWith('BLOCKED');
    result.innerHTML = `${metric('상관계수', value.correlation, '−1 ~ +1')}${metric('공통 관측치', value.observations, '거래일 교집합')}${metric('헤지비율', value.hedgeRatio, 'A 대비 B')}${metric('현재 z-score', value.spread.zScore, '상대가격 차이')}<div class="signal ${blocked ? 'blocked' : ''}"><b>${signal.status || '상태 미상'} · ${signal.action || 'FLAT'}</b><br>${signal.reason || '추가 검토가 필요합니다.'}<br><small>자료: ${value.quality.source} · 권리: ${value.quality.rightsStatus} · 공개: ${value.quality.publishable ? '허용' : '보류'}</small></div>`;
  };
  const run = async () => {
    $('run').disabled = true;
    status.textContent = '합성 예시를 계산하는 중입니다.';
    const payload = demoPayload();
    try {
      const response = await fetch('/v1/pairs/compare', {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify(payload)});
      if (!response.ok) throw new Error('PREVIEW_API_UNAVAILABLE');
      render(await response.json());
      status.textContent = '서버 계약으로 계산했습니다. 합성자료 전용입니다.';
    } catch (error) {
      status.textContent = '현재 공개판에는 서버 계산 경로가 없어 결과를 표시하지 않았습니다. 로컬 개발 서버에서 다시 시도하세요.';
      result.innerHTML = '<p class="empty">실제 시장자료 없이 임의 결과를 만들지 않았습니다.</p>';
    } finally {
      $('run').disabled = false;
    }
  };
  $('run').addEventListener('click', run);
})();
