import copy
import datetime as dt
import json
import tempfile
import unittest
from pathlib import Path
from market import Market, SOURCES, annotate, now, parse_sina, parse_sunsirs


def fixture(day=None, broken=False):
    day = day or now().date(); prev = day-dt.timedelta(days=1)
    head = f'<title>有色大宗榜({day.year}年{day.month}月{day.day}日)</title><table><tr><th>商品</th><th>行业</th><th>{prev.month}月{prev.day}日价格</th><th>{day.month}月{day.day}日价格</th><th>单位</th><th>日涨跌</th></tr>'
    return head + '<tr><td>铜</td><td>有色</td><td>100</td><td>102</td><td>元/吨</td><td>+2.00%</td></tr>' + ('' if broken else '<tr><td>铝</td><td>有色</td><td>20</td><td>21</td><td>元/吨</td><td>+5.00%</td></tr>') + '</table>'


class MarketTests(unittest.TestCase):
    def test_parse_prices_dates_units_and_unknown_terms(self):
        result = parse_sunsirs('sunsirs_metals', fixture(dt.date(2026,1,1)))
        self.assertEqual(result[0]['history'][0]['date'],'2025-12-31')
        self.assertEqual(result[0]['date'],'2026-01-01');self.assertEqual(result[0]['change_pct'],2)
        self.assertIsNone(result[0]['tax_included']);self.assertIsNone(result[0]['grade'])
        for bad in [fixture(broken=True), fixture().replace('元/吨','元/千克'), '<html>HW_CHECK</html>', fixture().replace('<td>102</td>','<td>NaN</td>')]:
            with self.assertRaises(ValueError):parse_sunsirs('sunsirs_metals',bad)
        with self.assertRaises(ValueError):parse_sunsirs('sunsirs_metals',fixture(now().date()+dt.timedelta(days=1)))

    def test_futures_close_is_separate_and_no_eval(self):
        raw='var _data=('+json.dumps([{'d':'2026-01-02','c':'100'}, {'d':'2026-01-05','c':'110'}])+');'
        record=parse_sina('sina_copper',raw)[0]
        self.assertEqual(record['kind'],'futures_close');self.assertEqual(record['price'],110);self.assertEqual(len(record['history']),2)
        for bad in ['var _data=(process.exit());', raw.replace('"110"','"Infinity"'),raw.replace('2026-01-05','2026-01-02')]:
            with self.assertRaises((ValueError,KeyError)):parse_sina('sina_copper',bad)

    def test_failed_refresh_keeps_values_and_observation_date(self):
        with tempfile.TemporaryDirectory() as d:
            m=Market(Path(d)/'market.json');m.data['records']=parse_sunsirs('sunsirs_metals',fixture())
            original=copy.deepcopy(m.data['records'])
            def fail(url):raise OSError('test-only upstream failure')
            m.fetch=fail;result=m.refresh(force=True)
            self.assertEqual([(r['date'],r['price']) for r in result['records']],[(r['date'],r['price']) for r in original])
            self.assertFalse(result['records'][0]['last_refresh_ok']);self.assertTrue(m.refresh()['rate_limited'])
            self.assertNotIn('test-only upstream failure',json.dumps(result))
            self.assertEqual(Market(Path(d)/'market.json').snapshot()['records'][0]['price'],102)

    def test_date_regression_and_staleness(self):
        with tempfile.TemporaryDirectory() as d:
            m=Market(Path(d)/'market.json');m.data['records']=parse_sunsirs('sunsirs_metals',fixture())
            m.fetch=lambda url:fixture(now().date()-dt.timedelta(days=10)) if url==SOURCES['sunsirs_metals'][1] else 'invalid'
            result=m.refresh(force=True)
            self.assertEqual(result['records'][0]['date'],now().date().isoformat());self.assertFalse(result['sources']['sunsirs_metals']['ok'])
            old={'records':parse_sunsirs('sunsirs_metals',fixture(now().date()-dt.timedelta(days=5)))}
            self.assertEqual(annotate(old)['records'][0]['freshness'],'stale');self.assertIsNone(old['records'][0].get('freshness'))

if __name__=='__main__':unittest.main()
