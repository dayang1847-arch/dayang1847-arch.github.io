(function (root, factory) {
  'use strict';
  var engine = factory();
  if (typeof module === 'object' && module.exports) module.exports = engine;
  if (root) root.MarketDemoEngine = engine;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  var CSV_FIELDS = ['id', 'brand', 'role', 'market', 'category', 'source', 'model', 'powerW', 'lumens', 'cctK', 'cri', 'ip', 'price', 'currency'];
  var NUMERIC_FIELDS = ['powerW', 'lumens', 'cctK', 'cri', 'price'];
  var ENUMS = {
    brand: ['customer', 'peer-a', 'peer-b'],
    role: ['customer', 'peer'],
    market: ['AU', 'VN', 'UK'],
    category: ['floodlight', 'streetlight', 'highbay'],
    source: ['amazon', 'shopee', 'brand'],
    currency: ['AUD', 'VND', 'GBP']
  };
  var MARKET_CURRENCY = { AU: 'AUD', VN: 'VND', UK: 'GBP' };

  function finite(value) {
    return typeof value === 'number' && Number.isFinite(value);
  }

  function efficacy(record) {
    if (!record || !finite(record.powerW) || record.powerW <= 0 || !finite(record.lumens) || record.lumens < 0) return null;
    var ratio = record.lumens / record.powerW;
    return Number.isFinite(ratio) ? ratio : null;
  }

  function median(values) {
    var sorted = values.filter(finite).slice().sort(function (a, b) { return a - b; });
    if (!sorted.length) return null;
    var middle = Math.floor(sorted.length / 2);
    if (sorted.length % 2) return sorted[middle];
    var sum = sorted[middle - 1] + sorted[middle];
    return Number.isFinite(sum) ? sum / 2 : sorted[middle - 1] / 2 + sorted[middle] / 2;
  }

  function selectProducts(products, options) {
    options = options || {};
    var query = String(options.query || '').trim().toLocaleLowerCase();
    return products.filter(function (record) {
      return (!options.market || options.market === 'all' || record.market === options.market)
        && (!options.category || options.category === 'all' || record.category === options.category)
        && (!options.brand || options.brand === 'all' || record.brand === options.brand)
        && (!options.source || options.source === 'all' || record.source === options.source)
        && (!query || ['model', 'brand', 'market', 'category', 'source', 'ip'].some(function (key) {
          return String(record[key] == null ? '' : record[key]).toLocaleLowerCase().includes(query);
        }));
    });
  }

  function metricValue(record, key) {
    if (key === 'efficacy') return efficacy(record);
    var value = record[key];
    if (!finite(value) || value < 0 || (key === 'powerW' && value === 0) || (key === 'cri' && value > 100)) return null;
    return value;
  }

  function compareProducts(products, options) {
    options = options || {};
    // Customer specifications describe the complete category baseline; peers describe one market.
    // Prices are intentionally excluded because the customer baseline can contain several currencies.
    var customer = products.filter(function (record) {
      return record.role === 'customer' && (!options.category || options.category === 'all' || record.category === options.category);
    });
    var peers = products.filter(function (record) {
      return record.role === 'peer'
        && (!options.market || options.market === 'all' || record.market === options.market)
        && (!options.category || options.category === 'all' || record.category === options.category);
    });
    var units = { powerW: 'W', lumens: 'lm', efficacy: 'lm/W', cri: 'Ra' };
    var metrics = Object.keys(units).map(function (key) {
      var customerValues = customer.map(function (record) { return metricValue(record, key); }).filter(finite);
      var peerValues = peers.map(function (record) { return metricValue(record, key); }).filter(finite);
      var customerMedian = median(customerValues);
      var peerMedian = median(peerValues);
      var delta = customerMedian === null || peerMedian === null || customerMedian <= 0 ? null : (peerMedian / customerMedian - 1) * 100;
      return {
        key: key,
        unit: units[key],
        customerMedian: customerMedian,
        peerMedian: peerMedian,
        customerCoverage: { present: customerValues.length, total: customer.length },
        peerCoverage: { present: peerValues.length, total: peers.length },
        deltaPct: finite(delta) ? delta : null
      };
    });
    return { customer: { count: customer.length, records: customer }, peers: { count: peers.length, records: peers }, metrics: metrics };
  }

  function buildRecommendation(products, options) {
    options = options || {};
    var priority = options.priority || 'balanced';
    if (!['balanced', 'efficiency', 'output'].includes(priority)) throw new Error('Unsupported recommendation priority.');
    var comparison = compareProducts(products, options);
    var caveatCodes = ['synthetic-data', 'cross-market-customer-baseline', 'price-not-compared', 'reference-not-product-design'];
    if (comparison.customer.count === 0) caveatCodes.push('no-customer-baseline');
    if (comparison.metrics.some(function (metric) {
      return metric.customerCoverage.present < metric.customerCoverage.total || metric.peerCoverage.present < metric.peerCoverage.total;
    })) caveatCodes.push('incomplete-specifications');
    var candidates = comparison.peers.records.filter(function (record) {
      if (priority === 'efficiency') return efficacy(record) !== null;
      if (priority === 'output') return metricValue(record, 'lumens') !== null;
      return efficacy(record) !== null && metricValue(record, 'lumens') !== null;
    });
    var target = {};
    comparison.metrics.forEach(function (metric) { target[metric.key] = metric.peerMedian; });
    function balancedDistance(record) {
      var terms = ['powerW', 'lumens', 'efficacy', 'cri'].map(function (key) {
        var value = metricValue(record, key);
        if (value === null || target[key] === null) return null;
        return Math.abs(value - target[key]) / Math.max(Math.abs(target[key]), 1);
      }).filter(finite);
      return terms.length ? terms.reduce(function (total, value) { return total + value; }, 0) / terms.length : Infinity;
    }
    candidates.sort(function (a, b) {
      var difference = priority === 'efficiency' ? efficacy(b) - efficacy(a)
        : priority === 'output' ? metricValue(b, 'lumens') - metricValue(a, 'lumens')
          : balancedDistance(a) - balancedDistance(b);
      return difference || String(a.id).localeCompare(String(b.id));
    });
    // Return one inspectable record rather than combining independent medians into a fictional product.
    var reference = candidates[0] || null;
    if (!reference) caveatCodes.push('no-eligible-peer');
    return {
      comparison: comparison,
      suggested: reference ? {
        powerW: metricValue(reference, 'powerW'),
        lumens: metricValue(reference, 'lumens'),
        efficacy: efficacy(reference),
        cri: metricValue(reference, 'cri'),
        ip: reference.ip || null
      } : { powerW: null, lumens: null, efficacy: null, cri: null, ip: null },
      reference: reference ? { id: reference.id, model: reference.model, brand: reference.brand, market: reference.market } : null,
      rationaleCodes: reference ? [priority === 'efficiency' ? 'highest-peer-efficacy' : priority === 'output' ? 'highest-peer-output' : 'closest-to-peer-medians'] : [],
      caveatCodes: caveatCodes
    };
  }

  function readCSVRows(text) {
    text = String(text).replace(/^\uFEFF/, '');
    var rows = [];
    var row = [];
    var value = '';
    var quoted = false;
    var closedQuote = false;
    function pushRow() {
      row.push(value);
      if (row.some(function (cell) { return cell.trim() !== ''; })) rows.push(row);
      row = [];
      value = '';
      closedQuote = false;
    }
    for (var i = 0; i < text.length; i += 1) {
      var char = text[i];
      if (quoted) {
        if (char === '"' && text[i + 1] === '"') { value += '"'; i += 1; }
        else if (char === '"') { quoted = false; closedQuote = true; }
        else value += char;
      } else if (char === ',') {
        row.push(value);
        value = '';
        closedQuote = false;
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && text[i + 1] === '\n') i += 1;
        pushRow();
      } else if (closedQuote) {
        if (!/\s/.test(char)) throw new Error('Unexpected text after a closing CSV quote.');
      } else if (char === '"') {
        if (value !== '') throw new Error('Unexpected quote in an unquoted CSV field.');
        quoted = true;
      } else value += char;
    }
    if (quoted) throw new Error('Unclosed CSV quote.');
    if (value !== '' || row.length || closedQuote) pushRow();
    return rows;
  }

  function parseCSV(text) {
    var rows = readCSVRows(text);
    if (!rows.length) throw new Error('CSV is empty.');
    var headers = rows.shift().map(function (field) { return field.trim(); });
    if (new Set(headers).size !== headers.length) throw new Error('CSV contains duplicate headers.');
    CSV_FIELDS.forEach(function (field) {
      if (!headers.includes(field)) throw new Error('Missing CSV column: ' + field + '.');
    });
    var ids = new Set();
    return rows.map(function (cells, index) {
      var rowNumber = index + 2;
      if (cells.length !== headers.length) throw new Error('CSV row ' + rowNumber + ' has an incorrect number of fields.');
      var record = {};
      CSV_FIELDS.forEach(function (field) {
        var value = cells[headers.indexOf(field)].trim();
        if (NUMERIC_FIELDS.includes(field)) {
          if (value === '') record[field] = null;
          else if (!/^(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(value) || !Number.isFinite(Number(value))) {
            throw new Error('Invalid number for ' + field + ' at CSV row ' + rowNumber + '.');
          } else record[field] = Number(value);
        } else record[field] = value || (field === 'ip' ? null : '');
      });
      ['id', 'model'].forEach(function (field) {
        if (!record[field]) throw new Error('Missing ' + field + ' at CSV row ' + rowNumber + '.');
        if (record[field].length > 240) throw new Error('Field ' + field + ' is too long at CSV row ' + rowNumber + '.');
      });
      if (ids.has(record.id)) throw new Error('Duplicate product id at CSV row ' + rowNumber + '.');
      ids.add(record.id);
      Object.keys(ENUMS).forEach(function (field) {
        if (!ENUMS[field].includes(record[field])) throw new Error('Invalid ' + field + ' at CSV row ' + rowNumber + '.');
      });
      if ((record.brand === 'customer') !== (record.role === 'customer')) throw new Error('Brand and role do not match at CSV row ' + rowNumber + '.');
      if (record.currency !== MARKET_CURRENCY[record.market]) throw new Error('Currency does not match market at CSV row ' + rowNumber + '.');
      if (record.cri !== null && record.cri > 100) throw new Error('CRI must be between 0 and 100 at CSV row ' + rowNumber + '.');
      if (record.ip !== null && !/^IP[0-6X][0-9X]$/i.test(record.ip)) throw new Error('Invalid IP rating at CSV row ' + rowNumber + '.');
      if (record.ip) record.ip = record.ip.toUpperCase();
      return record;
    });
  }

  function exportCSV(products) {
    function escapeCell(value) {
      if (value === null || value === undefined) return '';
      var text = String(value);
      // Quoting alone does not prevent spreadsheet formulas. Prefix hazardous text with an apostrophe.
      if (typeof value === 'string' && (/^[\s\u0000-\u001f]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text))) text = "'" + text;
      return /[",\r\n]/.test(text) ? '"' + text.replace(/"/g, '""') + '"' : text;
    }
    return '\uFEFF' + CSV_FIELDS.join(',') + '\r\n' + products.map(function (record) {
      return CSV_FIELDS.map(function (field) { return escapeCell(record[field]); }).join(',');
    }).join('\r\n') + '\r\n';
  }

  return {
    csvFields: CSV_FIELDS.slice(),
    selectProducts: selectProducts,
    compareProducts: compareProducts,
    buildRecommendation: buildRecommendation,
    parseCSV: parseCSV,
    exportCSV: exportCSV,
    median: median,
    efficacy: efficacy
  };
});
