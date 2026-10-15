/*
 * FICTIONAL DEMONSTRATION DATA ONLY.
 * These synthetic products, anonymous brands, specifications, prices and source
 * labels are invented to demonstrate filtering and calculations. No record was
 * scraped, and none represents an actual product, company, person or market fact.
 */
globalThis.MarketDemoData = {
  products: [
    { id: 'demo-fl-c-au-01', brand: 'customer', role: 'customer', market: 'AU', category: 'floodlight', source: 'brand', model: 'DEMO-FL-C050', powerW: 50, lumens: 5500, cctK: 4000, cri: 80, ip: 'IP65', price: 69, currency: 'AUD' },
    { id: 'demo-fl-c-au-02', brand: 'customer', role: 'customer', market: 'AU', category: 'floodlight', source: 'brand', model: 'DEMO-FL-C100', powerW: 100, lumens: 11000, cctK: 5000, cri: 80, ip: 'IP65', price: 119, currency: 'AUD' },
    { id: 'demo-fl-c-vn-01', brand: 'customer', role: 'customer', market: 'VN', category: 'floodlight', source: 'brand', model: 'DEMO-FL-C080', powerW: 80, lumens: 8800, cctK: 4000, cri: 80, ip: 'IP65', price: 790000, currency: 'VND' },
    { id: 'demo-fl-c-uk-01', brand: 'customer', role: 'customer', market: 'UK', category: 'floodlight', source: 'brand', model: 'DEMO-FL-C150', powerW: 150, lumens: 16500, cctK: 5000, cri: 80, ip: 'IP65', price: 89, currency: 'GBP' },
    { id: 'demo-fl-p-au-01', brand: 'peer-a', role: 'peer', market: 'AU', category: 'floodlight', source: 'amazon', model: 'DEMO-FL-A050', powerW: 50, lumens: 6500, cctK: 4000, cri: 80, ip: 'IP66', price: 79, currency: 'AUD' },
    { id: 'demo-fl-p-au-02', brand: 'peer-b', role: 'peer', market: 'AU', category: 'floodlight', source: 'brand', model: 'DEMO-FL-B100', powerW: 100, lumens: 14000, cctK: 5000, cri: 80, ip: 'IP66', price: 139, currency: 'AUD' },
    { id: 'demo-fl-p-au-03', brand: 'peer-a', role: 'peer', market: 'AU', category: 'floodlight', source: 'amazon', model: 'DEMO-FL-A150', powerW: 150, lumens: 21750, cctK: null, cri: 80, ip: 'IP66', price: 189, currency: 'AUD' },
    { id: 'demo-fl-p-vn-01', brand: 'peer-a', role: 'peer', market: 'VN', category: 'floodlight', source: 'shopee', model: 'DEMO-FL-A080', powerW: 80, lumens: 7600, cctK: 6500, cri: 70, ip: 'IP65', price: 590000, currency: 'VND' },
    { id: 'demo-fl-p-vn-02', brand: 'peer-b', role: 'peer', market: 'VN', category: 'floodlight', source: 'brand', model: 'DEMO-FL-B120', powerW: 120, lumens: 12000, cctK: 4000, cri: 80, ip: 'IP65', price: 890000, currency: 'VND' },
    { id: 'demo-fl-p-vn-03', brand: 'peer-b', role: 'peer', market: 'VN', category: 'floodlight', source: 'shopee', model: 'DEMO-FL-B060', powerW: null, lumens: 6300, cctK: 6500, cri: null, ip: 'IP65', price: 390000, currency: 'VND' },
    { id: 'demo-fl-p-uk-01', brand: 'peer-a', role: 'peer', market: 'UK', category: 'floodlight', source: 'amazon', model: 'DEMO-FL-A030', powerW: 30, lumens: 3600, cctK: 4000, cri: 80, ip: 'IP65', price: 32, currency: 'GBP' },
    { id: 'demo-fl-p-uk-02', brand: 'peer-b', role: 'peer', market: 'UK', category: 'floodlight', source: 'brand', model: 'DEMO-FL-B080', powerW: 80, lumens: 10000, cctK: 5000, cri: 80, ip: 'IP66', price: 69, currency: 'GBP' },

    { id: 'demo-sl-c-au-01', brand: 'customer', role: 'customer', market: 'AU', category: 'streetlight', source: 'brand', model: 'DEMO-SL-C060', powerW: 60, lumens: 7200, cctK: 4000, cri: 70, ip: 'IP66', price: 129, currency: 'AUD' },
    { id: 'demo-sl-c-au-02', brand: 'customer', role: 'customer', market: 'AU', category: 'streetlight', source: 'brand', model: 'DEMO-SL-C100', powerW: 100, lumens: 12000, cctK: 4000, cri: 70, ip: 'IP66', price: 179, currency: 'AUD' },
    { id: 'demo-sl-c-vn-01', brand: 'customer', role: 'customer', market: 'VN', category: 'streetlight', source: 'brand', model: 'DEMO-SL-C080', powerW: 80, lumens: 9600, cctK: 5000, cri: 70, ip: 'IP66', price: 1190000, currency: 'VND' },
    { id: 'demo-sl-c-uk-01', brand: 'customer', role: 'customer', market: 'UK', category: 'streetlight', source: 'brand', model: 'DEMO-SL-C120', powerW: 120, lumens: 14400, cctK: 4000, cri: 70, ip: 'IP66', price: 109, currency: 'GBP' },
    { id: 'demo-sl-p-au-01', brand: 'peer-a', role: 'peer', market: 'AU', category: 'streetlight', source: 'brand', model: 'DEMO-SL-A060', powerW: 60, lumens: 8700, cctK: 3000, cri: 70, ip: 'IP66', price: 149, currency: 'AUD' },
    { id: 'demo-sl-p-au-02', brand: 'peer-b', role: 'peer', market: 'AU', category: 'streetlight', source: 'amazon', model: 'DEMO-SL-B080', powerW: 80, lumens: 12000, cctK: 4000, cri: 80, ip: 'IP66', price: 169, currency: 'AUD' },
    { id: 'demo-sl-p-au-03', brand: 'peer-a', role: 'peer', market: 'AU', category: 'streetlight', source: 'brand', model: 'DEMO-SL-A120', powerW: 120, lumens: 18600, cctK: 4000, cri: 70, ip: null, price: 219, currency: 'AUD' },
    { id: 'demo-sl-p-vn-01', brand: 'peer-a', role: 'peer', market: 'VN', category: 'streetlight', source: 'shopee', model: 'DEMO-SL-A050', powerW: 50, lumens: 5500, cctK: 6500, cri: 70, ip: 'IP65', price: 690000, currency: 'VND' },
    { id: 'demo-sl-p-vn-02', brand: 'peer-b', role: 'peer', market: 'VN', category: 'streetlight', source: 'brand', model: 'DEMO-SL-B100', powerW: 100, lumens: 11500, cctK: 4000, cri: 70, ip: 'IP66', price: 1390000, currency: 'VND' },
    { id: 'demo-sl-p-vn-03', brand: 'peer-a', role: 'peer', market: 'VN', category: 'streetlight', source: 'shopee', model: 'DEMO-SL-A150', powerW: 150, lumens: 17700, cctK: 6500, cri: 70, ip: 'IP66', price: null, currency: 'VND' },
    { id: 'demo-sl-p-uk-01', brand: 'peer-a', role: 'peer', market: 'UK', category: 'streetlight', source: 'brand', model: 'DEMO-SL-A070', powerW: 70, lumens: 9100, cctK: 3000, cri: 70, ip: 'IP66', price: 79, currency: 'GBP' },
    { id: 'demo-sl-p-uk-02', brand: 'peer-b', role: 'peer', market: 'UK', category: 'streetlight', source: 'amazon', model: 'DEMO-SL-B100', powerW: 100, lumens: 13500, cctK: 4000, cri: 80, ip: 'IP66', price: 99, currency: 'GBP' },

    { id: 'demo-hb-c-au-01', brand: 'customer', role: 'customer', market: 'AU', category: 'highbay', source: 'brand', model: 'DEMO-HB-C080', powerW: 80, lumens: 10000, cctK: 4000, cri: 80, ip: 'IP65', price: 119, currency: 'AUD' },
    { id: 'demo-hb-c-au-02', brand: 'customer', role: 'customer', market: 'AU', category: 'highbay', source: 'brand', model: 'DEMO-HB-C120', powerW: 120, lumens: 15000, cctK: 5000, cri: 80, ip: 'IP65', price: 159, currency: 'AUD' },
    { id: 'demo-hb-c-vn-01', brand: 'customer', role: 'customer', market: 'VN', category: 'highbay', source: 'brand', model: 'DEMO-HB-C100', powerW: 100, lumens: 12500, cctK: 5000, cri: 80, ip: 'IP65', price: 990000, currency: 'VND' },
    { id: 'demo-hb-c-uk-01', brand: 'customer', role: 'customer', market: 'UK', category: 'highbay', source: 'brand', model: 'DEMO-HB-C160', powerW: 160, lumens: 20000, cctK: 5000, cri: 80, ip: 'IP65', price: 99, currency: 'GBP' },
    { id: 'demo-hb-p-au-01', brand: 'peer-a', role: 'peer', market: 'AU', category: 'highbay', source: 'amazon', model: 'DEMO-HB-A100', powerW: 100, lumens: 15500, cctK: 4000, cri: 80, ip: 'IP65', price: 149, currency: 'AUD' },
    { id: 'demo-hb-p-au-02', brand: 'peer-b', role: 'peer', market: 'AU', category: 'highbay', source: 'brand', model: 'DEMO-HB-B150', powerW: 150, lumens: 24000, cctK: 5000, cri: 80, ip: 'IP65', price: 199, currency: 'AUD' },
    { id: 'demo-hb-p-au-03', brand: 'peer-a', role: 'peer', market: 'AU', category: 'highbay', source: 'amazon', model: 'DEMO-HB-A200', powerW: 200, lumens: null, cctK: 5000, cri: 80, ip: 'IP65', price: 249, currency: 'AUD' },
    { id: 'demo-hb-p-vn-01', brand: 'peer-a', role: 'peer', market: 'VN', category: 'highbay', source: 'shopee', model: 'DEMO-HB-A080', powerW: 80, lumens: 9200, cctK: 6500, cri: 70, ip: 'IP54', price: 690000, currency: 'VND' },
    { id: 'demo-hb-p-vn-02', brand: 'peer-b', role: 'peer', market: 'VN', category: 'highbay', source: 'brand', model: 'DEMO-HB-B120', powerW: 120, lumens: 14400, cctK: 5000, cri: 80, ip: 'IP65', price: 1190000, currency: 'VND' },
    { id: 'demo-hb-p-vn-03', brand: 'peer-b', role: 'peer', market: 'VN', category: 'highbay', source: 'shopee', model: 'DEMO-HB-B180', powerW: 180, lumens: 21960, cctK: 6500, cri: null, ip: 'IP65', price: 1690000, currency: 'VND' },
    { id: 'demo-hb-p-uk-01', brand: 'peer-a', role: 'peer', market: 'UK', category: 'highbay', source: 'amazon', model: 'DEMO-HB-A090', powerW: 90, lumens: 12600, cctK: 4000, cri: 80, ip: 'IP65', price: 69, currency: 'GBP' },
    { id: 'demo-hb-p-uk-02', brand: 'peer-b', role: 'peer', market: 'UK', category: 'highbay', source: 'brand', model: 'DEMO-HB-B140', powerW: 140, lumens: 20300, cctK: 5000, cri: 80, ip: 'IP65', price: 95, currency: 'GBP' }
  ]
};
