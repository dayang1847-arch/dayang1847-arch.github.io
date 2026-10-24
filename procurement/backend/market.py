"""Public reference prices. Standard library only; never fabricates missing observations."""
import argparse
import copy
import datetime as dt
import json
import math
import os
import re
import threading
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from html.parser import HTMLParser
from pathlib import Path

TZ = dt.timezone(dt.timedelta(hours=8))
SOURCES = {
    'sunsirs_metals': ('生意社 · 有色日榜', 'https://top.100ppi.com/zdb/detail-day---12.html'),
    'sunsirs_plastics': ('生意社 · 橡塑日榜', 'https://top.100ppi.com/zdb/detail-day---15.html'),
    'sina_copper': ('新浪财经 · 沪铜连续日线', 'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_data=/InnerFuturesNewService.getDailyKLine?symbol=CU0'),
    'sina_aluminum': ('新浪财经 · 沪铝连续日线', 'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_data=/InnerFuturesNewService.getDailyKLine?symbol=AL0'),
}
SOURCES.update({
 'sina_tin': ('新浪财经 · 沪锡连续日线', SOURCES['sina_copper'][1].replace('CU0','SN0')),
 'sina_steel': ('新浪财经 · 热轧卷板连续日线', SOURCES['sina_copper'][1].replace('CU0','HC0'))})
MATERIALS = {'铜': 'copper', '铝': 'aluminum', 'PC': 'pc', 'PMMA': 'pmma',
             'ABS': 'abs', 'PS': 'ps', 'PP(拉丝)': 'pp', 'LLDPE': 'lldpe', 'PVC': 'pvc'}
EXPECTED = {'sunsirs_metals': ['copper', 'aluminum'],
            'sunsirs_plastics': ['pc', 'pmma', 'abs', 'ps', 'pp', 'lldpe', 'pvc'],
            'sina_copper': ['copper-futures'], 'sina_aluminum': ['aluminum-futures'], 'sina_tin':['tin-futures'], 'sina_steel':['steel-futures']}


def now():
    return dt.datetime.now(TZ)


def number(value):
    n = float(str(value).replace(',', '').replace('%', '').replace('+', ''))
    if not math.isfinite(n):
        raise ValueError('无效数字')
    return n


class Rows(HTMLParser):
    def __init__(self):
        super().__init__(); self.rows = []; self.row = None; self.cell = None
    def handle_starttag(self, tag, attrs):
        if tag == 'tr': self.row = []
        elif tag in ('td', 'th') and self.row is not None: self.cell = []
    def handle_data(self, data):
        if self.cell is not None: self.cell.append(data)
    def handle_endtag(self, tag):
        if tag in ('td', 'th') and self.cell is not None:
            if self.row is not None: self.row.append(' '.join(''.join(self.cell).split()))
            self.cell = None
        elif tag == 'tr' and self.row is not None:
            self.rows.append(self.row); self.row = None


def base_record(sid, rid, material, date, price, previous, kind):
    if price <= 0 or previous is not None and previous <= 0:
        raise ValueError('价格非正数')
    if dt.date.fromisoformat(date) > now().date():
        raise ValueError('来源日期在未来')
    return {'id': rid, 'material': material, 'source_id': sid, 'source_name': SOURCES[sid][0],
            'source_url': SOURCES[sid][1], 'date': date, 'price': price, 'previous_price': previous,
            'change_pct': round((price / previous - 1) * 100, 4) if previous else None,
            'kind': kind, 'currency': 'CNY', 'unit': '元/吨', 'grade': None,
            'tax_included': None, 'freight_included': None, 'region': None,
            'scope': '公开市场参考，非供应商报价；品牌牌号、税费、运费及交付条件需另行核定。'}


def parse_sunsirs(sid, html):
    title = re.search(r'<title[^>]*>(.*?)</title>', html, re.S | re.I)
    date = re.search(r'(\d{4})年(\d{1,2})月(\d{1,2})日', title.group(1) if title else '')
    if not date: raise ValueError('未找到来源日期，可能遇到校验页或页面结构变化')
    day = dt.date(*map(int, date.groups()))
    p = Rows(); p.feed(html)
    header = next((r for r in p.rows if r and r[0] == '商品' and len(r) >= 6), None)
    if not header or header[4] != '单位': raise ValueError('表头结构变化')
    def header_day(value):
        match = re.fullmatch(r'(\d{1,2})月(\d{1,2})日价格', value)
        if not match: raise ValueError('价格日期列缺失')
        month, d = map(int, match.groups())
        year = day.year - (1 if month > day.month else 0)
        return dt.date(year, month, d)
    before, current = header_day(header[2]), header_day(header[3])
    if current != day or before >= current: raise ValueError('表头和来源日期不一致')
    records = []
    for row in p.rows:
        if not row or row[0] not in MATERIALS: continue
        rid = MATERIALS[row[0]]
        if rid not in EXPECTED[sid]: continue
        if len(row) < 6 or row[4] != '元/吨': raise ValueError('价格单位或行结构变化')
        record = base_record(sid, rid, row[0], day.isoformat(), number(row[3]), number(row[2]), 'spot_reference')
        record['history'] = [{'date': before.isoformat(), 'price': record['previous_price']},
                             {'date': day.isoformat(), 'price': record['price']}]
        record['reported_change_pct'] = number(row[5])
        records.append(record)
    # Missing target rows invalidate this source; keep its entire previous successful snapshot.
    if {r['id'] for r in records} != set(EXPECTED[sid]): raise ValueError('监测品种缺失，未覆盖旧值')
    return records


def parse_sina(sid, raw):
    match = re.search(r'=\s*\((\[.*\])\)\s*;?\s*$', raw, re.S)
    if not match: raise ValueError('期货接口未返回可识别日线')
    rows = json.loads(match.group(1))
    if not isinstance(rows, list) or not rows: raise ValueError('期货日线为空')
    points = []
    for r in rows:
        day = dt.date.fromisoformat(r['d'])
        if day > now().date(): raise ValueError('期货日期在未来')
        price = number(r['c'])
        if price <= 0: raise ValueError('期货收盘价无效')
        points.append({'date': day.isoformat(), 'price': price})
    if any(points[i]['date'] >= points[i+1]['date'] for i in range(len(points)-1)):
        raise ValueError('期货日期重复或乱序')
    points = points[-400:]
    if len(points) < 2: raise ValueError('期货数据不足两期')
    material = {'sina_copper':'铜','sina_aluminum':'铝','sina_tin':'锡','sina_steel':'热轧卷板'}[sid]
    record = base_record(sid, EXPECTED[sid][0], material + '（期货连续）', points[-1]['date'], points[-1]['price'], points[-2]['price'], 'futures_close')
    record['history'] = points
    record['scope'] = '连续合约日线收盘，可能含换月影响，非现货或采购结算价；当天日线在收市前可能变化。'
    return [record]


def fetch_public(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0', 'Referer': 'https://finance.sina.com.cn/'})
    with urllib.request.urlopen(req, timeout=15) as response:
        data = response.read(2000001)
        if len(data) > 2000000: raise ValueError('来源响应超过大小限制')
        return data.decode(response.headers.get_content_charset() or 'utf-8', errors='replace')


def annotate(data):
    data = copy.deepcopy(data)
    for r in data.get('records', []):
        age = (now().date() - dt.date.fromisoformat(r['date'])).days
        r['age_days'] = age
        r['freshness'] = 'stale' if age > 4 else 'current'
        source = data.get('sources', {}).get(r['source_id'], {})
        r['last_refresh_ok'] = source.get('ok', False)
    return data


class Market:
    def __init__(self, path, seed=None):
        self.path = Path(path); self.lock = threading.RLock(); self.last_attempt = 0
        selected = self.path if self.path.exists() else Path(seed) if seed else None
        self.data = {'schema_version': 1, 'records': [], 'sources': {}, 'updated_at': None}
        if selected and selected.exists():
            try: self.data = json.loads(selected.read_text())
            except (ValueError, OSError): pass
        self.fetch = fetch_public
    def snapshot(self):
        with self.lock: return annotate(self.data)
    def refresh(self, force=False):
        with self.lock:
            if not force and now().timestamp() - self.last_attempt < 60:
                result = annotate(self.data); result['rate_limited'] = True; return result
            self.last_attempt = now().timestamp()
            def collect(sid):
                try:
                    raw = self.fetch(SOURCES[sid][1])
                    records = parse_sina(sid, raw) if sid.startswith('sina_') else parse_sunsirs(sid, raw)
                    return sid, records, None
                except Exception:
                    return sid, None, '采集失败：网络、来源校验或字段结构变化；保留上次成功值。'
            with ThreadPoolExecutor(max_workers=6) as pool: results = list(pool.map(collect, SOURCES))
            timestamp = now().isoformat(timespec='seconds')
            existing = {r['id']: r for r in self.data.get('records', [])}
            sources = self.data.setdefault('sources', {})
            for sid, records, error in results:
                if records and any(r['id'] in existing and existing[r['id']]['date'] > r['date'] for r in records):
                    records, error = None, '来源日期倒退，保留上次较新的成功值。'
                meta = sources.setdefault(sid, {})
                meta.update(name=SOURCES[sid][0], url=SOURCES[sid][1], last_attempt_at=timestamp, ok=not error, error=error)
                if records:
                    meta['last_success_at'] = timestamp
                    for r in records:
                        r['fetched_at'] = timestamp; existing[r['id']] = r
            self.data.update(schema_version=1, records=list(existing.values()), updated_at=timestamp,
                             usage_note='参考价与期货日线分别展示；不提供牌号成交价或付费研究报告。采集按需运行，未配置无人值守定时更新。')
            self.path.parent.mkdir(parents=True, exist_ok=True)
            temporary = self.path.with_suffix('.tmp')
            temporary.write_text(json.dumps(self.data, ensure_ascii=False, indent=2, allow_nan=False))
            os.replace(temporary, self.path)
            return annotate(self.data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description='采集公开行情，不需要 API Key')
    parser.add_argument('--output', default=str(Path(__file__).resolve().parent.parent / 'market-data.json'))
    args = parser.parse_args()
    result = Market(args.output).refresh(force=True)
    print(json.dumps({'records': len(result['records']), 'updated_at': result['updated_at'],
                      'sources': {k: {'ok':v['ok'], 'error':v['error']} for k,v in result['sources'].items()}},ensure_ascii=False))
    if not all(v['ok'] for v in result['sources'].values()): raise SystemExit(1)
