'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const engine = require('../engine.js');

function product(id, overrides = {}) {
  return { id, brand: 'peer-a', role: 'peer', market: 'AU', category: 'floodlight', source: 'brand', model: id, powerW: 100, lumens: 12000, cctK: 4000, cri: 80, ip: 'IP65', price: 99, currency: 'AUD', ...overrides };
}

test('customer baseline crosses markets, while peers stay in the selected market and category', () => {
  const records = [
    product('c-au', { role: 'customer', brand: 'customer', powerW: 40 }),
    product('c-vn', { role: 'customer', brand: 'customer', market: 'VN', currency: 'VND', powerW: 60 }),
    product('p-au'),
    product('p-vn', { market: 'VN', currency: 'VND' }),
    product('c-street', { role: 'customer', brand: 'customer', category: 'streetlight' }),
    product('p-street', { category: 'streetlight' })
  ];
  const result = engine.compareProducts(records, { market: 'AU', category: 'floodlight' });
  assert.deepEqual(result.customer.records.map(p => p.id), ['c-au', 'c-vn']);
  assert.deepEqual(result.peers.records.map(p => p.id), ['p-au']);
  assert.equal(result.metrics.find(m => m.key === 'powerW').customerMedian, 50);
  assert.equal(result.metrics.some(m => m.key === 'price'), false);
});

test('efficacy is the median of per-record ratios, not a ratio of aggregate medians', () => {
  const records = [product('one', { powerW: 10, lumens: 1000 }), product('two', { powerW: 100, lumens: 30000 }), product('three', { powerW: 1000, lumens: 200000 })];
  const metric = engine.compareProducts(records, { market: 'AU', category: 'floodlight' }).metrics.find(m => m.key === 'efficacy');
  assert.equal(metric.peerMedian, 200);
  assert.notEqual(metric.peerMedian, engine.median(records.map(p => p.lumens)) / engine.median(records.map(p => p.powerW)));
});

test('comparison delta describes peers relative to the customer baseline', () => {
  const records = [
    product('customer', { role: 'customer', brand: 'customer', powerW: 110, lumens: 0, cri: 80 }),
    product('peer', { powerW: 130, lumens: 100, cri: 0 })
  ];
  const comparison = engine.compareProducts(records, { market: 'AU', category: 'floodlight' });
  const metric = key => comparison.metrics.find(item => item.key === key);
  assert.ok(Math.abs(metric('powerW').deltaPct - 18.18181818181818) < 1e-10);
  assert.equal(metric('lumens').deltaPct, null);
  assert.equal(metric('cri').deltaPct, -100);
});

test('finite extreme values do not produce overflowing medians or comparison gaps', () => {
  assert.equal(engine.median([1e308, 1e308]), 1e308);
  assert.equal(engine.median([-1e308, -1e308]), -1e308);
  assert.equal(engine.median([-1e308, 1e308]), 0);
  assert.equal(engine.median([Number.MIN_VALUE, Number.MIN_VALUE]), Number.MIN_VALUE);
  const records = [
    product('customer', { role: 'customer', brand: 'customer', powerW: 1e-300 }),
    product('peer', { powerW: 1e300 })
  ];
  const metric = engine.compareProducts(records, { market: 'AU', category: 'floodlight' }).metrics.find(item => item.key === 'powerW');
  assert.equal(metric.customerMedian, 1e-300);
  assert.equal(metric.peerMedian, 1e300);
  assert.equal(metric.deltaPct, null);
});

test('missing numeric values remain missing; zero power has no efficacy or valid power coverage', () => {
  const records = [product('one', { powerW: 0, lumens: 1000, cri: null }), product('two', { powerW: null, lumens: null, cri: 80 })];
  const comparison = engine.compareProducts(records, { market: 'AU', category: 'floodlight' });
  const efficacyMetric = comparison.metrics.find(m => m.key === 'efficacy');
  assert.equal(efficacyMetric.peerMedian, null);
  assert.deepEqual(efficacyMetric.peerCoverage, { present: 0, total: 2 });
  assert.equal(efficacyMetric.deltaPct, null);
  assert.equal(comparison.metrics.find(m => m.key === 'powerW').peerMedian, null);
  assert.equal(comparison.metrics.find(m => m.key === 'cri').peerMedian, 80);
  assert.equal(engine.efficacy(product('invalid', { powerW: -1 })), null);
  assert.equal(engine.efficacy(product('overflow', { powerW: 1e-300, lumens: 1e300 })), null);
  assert.equal(engine.median([]), null);
  assert.equal(engine.median([20, null, 10, NaN]), 15);
});

test('visible table filters apply category, market, source, brand and case-insensitive model query', () => {
  const records = [product('kept', { model: 'Demo Bright', source: 'amazon' }), product('source'), product('market', { market: 'UK' }), product('brand', { brand: 'peer-b' }), product('category', { category: 'highbay' })];
  assert.deepEqual(engine.selectProducts(records, { market: 'AU', category: 'floodlight', brand: 'peer-a', source: 'amazon', query: ' BRIGHT ' }).map(p => p.id), ['kept']);
  assert.equal(engine.selectProducts(records, { market: 'all', category: 'all', source: 'all', brand: 'all' }).length, 5);
});

test('recommendations cite actual peer records and react to the chosen priority', () => {
  const records = [product('efficient', { powerW: 100, lumens: 18000 }), product('output', { powerW: 200, lumens: 30000 }), product('middle', { powerW: 150, lumens: 24000 })];
  assert.equal(engine.buildRecommendation(records, { market: 'AU', category: 'floodlight', priority: 'efficiency' }).reference.id, 'efficient');
  assert.equal(engine.buildRecommendation(records, { market: 'AU', category: 'floodlight', priority: 'output' }).reference.id, 'output');
  const balanced = engine.buildRecommendation(records, { market: 'AU', category: 'floodlight', priority: 'balanced' });
  assert.equal(balanced.reference.id, 'middle');
  assert.equal(balanced.suggested.efficacy, 160);
  assert.ok(balanced.caveatCodes.includes('synthetic-data'));
  assert.ok(balanced.caveatCodes.includes('no-customer-baseline'));
  const empty = engine.buildRecommendation(records, { market: 'UK', category: 'floodlight' });
  assert.equal(empty.reference, null);
  assert.ok(empty.caveatCodes.includes('no-eligible-peer'));
});

test('CSV round trip handles BOM, CRLF, commas, escaped quotes, quoted newline and missing data', () => {
  const records = [product('one', { model: 'Demo, "Line"\nTwo', powerW: null, cri: null, ip: null, price: null }), product('two')];
  const csv = engine.exportCSV(records);
  assert.ok(csv.startsWith('\uFEFF'));
  assert.deepEqual(engine.parseCSV(csv), records);
  const reordered = engine.csvFields.slice().reverse();
  const header = reordered.join(',');
  const row = reordered.map(field => records[1][field]).join(',');
  assert.deepEqual(engine.parseCSV(`${header}\n${row}\n`), [records[1]]);
});

test('CSV import rejects malformed quotes, duplicate ids, invalid schema, invalid currency and invalid numbers', () => {
  assert.throws(() => engine.parseCSV('id,model\n1,2'), /Missing CSV column/);
  assert.throws(() => engine.parseCSV('"id,model'), /Unclosed CSV quote/);
  assert.throws(() => engine.parseCSV('"id"bad,model'), /Unexpected text/);
  assert.throws(() => engine.parseCSV(engine.exportCSV([product('same'), product('same')])), /Duplicate product id/);
  assert.throws(() => engine.parseCSV(engine.exportCSV([product('one', { currency: 'GBP' })])), /Currency does not match market/);
  assert.throws(() => engine.parseCSV(engine.exportCSV([product('one', { powerW: -10 })])), /Invalid number/);
  assert.throws(() => engine.parseCSV(engine.exportCSV([product('one', { cri: 101 })])), /CRI/);
});

test('CSV export neutralizes spreadsheet formulas even when text starts with whitespace', () => {
  ['=HYPERLINK("evil")', '+SUM(1,2)', '-1+2', '@SUM(A1)', '   =1+1', '\t=1+1', '\n=1+1'].forEach(model => {
    const parsed = engine.parseCSV(engine.exportCSV([product('formula', { model })]));
    assert.equal(parsed[0].model[0], "'");
    assert.equal(parsed[0].model.slice(1), model);
  });
});
