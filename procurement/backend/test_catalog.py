"""Catalog integrity and local-serving regressions; no real accounts used."""
import json,unittest,threading,tempfile,urllib.request,urllib.error
from pathlib import Path
from server import Server,Store
ROOT=Path(__file__).resolve().parent.parent
class CatalogTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):cls.data=json.loads((ROOT/'supplier-catalog.json').read_text())
    def test_page_coverage_and_source_bounds(self):
        d=self.data;docs={x['id']:x for x in d['documents']}
        self.assertEqual(len(d['suppliers']),5)
        self.assertEqual(sum(x['page_count'] for x in docs.values()),162)
        for key,doc in docs.items():
            self.assertEqual(sorted(x['pdf_page'] for x in d['coverage'] if x['document_id']==key),list(range(1,doc['page_count']+1)))
        for p in d['products']:
            limit=docs[p['source']['document_id']]['page_count']
            self.assertTrue(all(1<=s['source_page']<=limit for s in p['specifications']))
    def test_unknown_commercial_fields_and_claims_stay_unverified(self):
        for p in self.data['products']:
            self.assertTrue(all(x is None for x in p['procurement'].values()))
            self.assertEqual(p['status'],'catalog_extracted_unverified')
            self.assertTrue(all(c['verification']=='catalog_claim_unverified' for c in p['catalog_claims']))
    def test_conflicting_original_pitch_is_not_silently_corrected(self):
        p=next(x for x in self.data['products'] if x['id']=='changhe-p028-c2-s1')
        s=next(s for s in p['specifications'] if s['key']=='pitch')
        self.assertEqual(s['value'],950)
        self.assertEqual(s['verification'],'needs_review')
        self.assertIn('9.50',s['evidence'])
    def test_standard_ratings_and_explicit_variants_stay_separate(self):
        p=next(x for x in self.data['products'] if x['id']=='changhe-p006-c1-s1')
        ul=[s['value'] for s in p['specifications'] if s['key']=='rated_voltage' and 'UL' in (s['standard'] or '')]
        self.assertEqual(ul,[150,None,150])
        self.assertEqual([v['poles'] for v in p['variants']],[2,3,4,5,24])
        self.assertFalse(any(v['poles']==6 for v in p['variants']))
    def test_catalog_assets_served_but_source_and_user_files_are_not(self):
        with tempfile.TemporaryDirectory() as temp:
            server=Server(('127.0.0.1',0),Store(temp),ROOT)
            worker=threading.Thread(target=server.serve_forever,daemon=True);worker.start()
            base='http://127.0.0.1:'+str(server.server_address[1])
            try:
                for path in ['/catalog.js','/catalog.css','/supplier-catalog.json']:
                    with urllib.request.urlopen(base+path) as r:
                        self.assertEqual(r.status,200);r.read()
                for path in ['/backend/server.py','/connections.json','/supplier-catalog.sqlite','/../供应商数据库/']:
                    with self.assertRaises((urllib.error.HTTPError,UnicodeEncodeError)):
                        urllib.request.urlopen(base+path)
            finally:server.shutdown();server.server_close();worker.join()
if __name__=='__main__':unittest.main()
