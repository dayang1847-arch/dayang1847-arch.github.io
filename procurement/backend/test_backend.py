import json
import stat
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from pathlib import Path
from server import Store, Connections, SafeError, Server, parse_message


class BackendTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.store = Store(self.tmp.name)

    def tearDown(self):
        self.tmp.cleanup()

    def test_secrets_never_returned_and_changes_invalidate_test(self):
        self.store.configure('mail', {'host': 'imap.example.com', 'username': 'demo@example.com', 'password': 'test-mail-only', 'port': 993})
        self.store.configure('deepseek', {'api_key': 'test-api-only', 'model': 'test-model'})
        public = json.dumps(self.store.public())
        self.assertNotIn('test-mail-only', public)
        self.assertNotIn('test-api-only', public)
        self.assertEqual(stat.S_IMODE(self.store.path.stat().st_mode), 0o600)
        self.assertEqual(stat.S_IMODE(Path(self.tmp.name).stat().st_mode), 0o700)
        self.store.checked('mail', True)
        self.store.configure('mail', {'host': 'imap.example.com', 'username': 'demo@example.com', 'password': '', 'port': 993})
        self.assertEqual(self.store.snapshot()['mail']['password'], 'test-mail-only')
        self.assertNotIn('mail', self.store.public()['checks'])
        with self.assertRaises(SafeError):
            self.store.configure('mail', {'host': 'imap.other.com', 'username': 'demo@example.com', 'password': '', 'port': 993})
        self.store.clear('deepseek')
        self.assertFalse(self.store.public()['deepseek_key_set'])

    def test_mail_uses_readonly_and_peek(self):
        calls = []
        raw = b'Subject: quotation\r\nFrom: supplier@example.com\r\n\r\nUnit price 0.46 CNY.'
        class FakeIMAP:
            def __init__(self, *args, **kwargs): pass
            def login(self, *args): calls.append(('login',))
            def select(self, folder, readonly=False):
                calls.append(('select', readonly)); return 'OK', [b'1']
            def uid(self, action, *args):
                calls.append((action, args))
                return ('OK', [b'12']) if action == 'search' else ('OK', [(b'metadata', raw)])
            def logout(self): calls.append(('logout',))
        self.store.configure('mail', {'host': 'imap.example.com', 'username': 'demo@example.com', 'password': 'fake', 'port': 993})
        c = Connections(self.store); c.imap_factory = FakeIMAP
        self.assertEqual(c.mail_list()['messages'][0]['uid'], '12')
        self.assertIn('Unit price', c.mail_read('12')['body'])
        self.assertTrue(all(call[1] is True for call in calls if call[0] == 'select'))
        self.assertTrue(all('BODY.PEEK' in str(call[1]) for call in calls if call[0] == 'fetch'))
        self.assertFalse(any(call[0] in ('store', 'expunge', 'append') for call in calls))
        with self.assertRaises(SafeError): c.mail_read('12:*')

    def test_mime_html_scripts_are_excluded(self):
        raw = b'Subject: Sample\r\nContent-Type: text/html; charset=utf-8\r\n\r\n<p>price 10</p><script>steal()</script><style>bad</style>'
        parsed = parse_message(raw)
        self.assertIn('price 10', parsed['body'])
        self.assertNotIn('steal', parsed['body'])
        self.assertNotIn('bad', parsed['body'])

    def test_ai_requires_explicit_consent_and_keeps_missing_fields(self):
        self.store.configure('deepseek', {'api_key': 'fake', 'model': 'test-model'})
        c = Connections(self.store)
        calls = []
        def fake(path, payload=None):
            calls.append((path, payload))
            return {'choices': [{'finish_reason': 'stop', 'message': {'content': '{"supplier":"Demo","price":0.46,"tax_percent":null}'}}], 'usage': {'total_tokens': 20}}
        c.deepseek = fake
        with self.assertRaises(SafeError): c.analyze('报价文本', False)
        self.assertEqual(calls, [])
        result = c.analyze('报价文本', True)
        self.assertEqual(result['fields']['price'], .46)
        self.assertIsNone(result['fields']['tax_percent'])
        self.assertIsNone(result['fields']['freight_included'])
        self.assertTrue(result['review_required'])
        self.assertNotIn('tools', calls[0][1])

    def test_http_csrf_origin_and_static_path_protection(self):
        server = Server(('127.0.0.1', 0), self.store, Path(__file__).resolve().parent.parent)
        thread = threading.Thread(target=server.serve_forever, daemon=True); thread.start()
        base = 'http://127.0.0.1:' + str(server.server_address[1])
        try:
            def request(path, payload=None, headers=None):
                h = {'Content-Type': 'application/json', **(headers or {})}
                req = urllib.request.Request(base + path, data=json.dumps(payload).encode() if payload is not None else None, headers=h)
                with urllib.request.urlopen(req) as res: return res.status, json.load(res)
            token = request('/api/session')[1]['token']
            with self.assertRaises(urllib.error.HTTPError) as err: request('/api/status')
            self.assertEqual(err.exception.code, 403)
            with self.assertRaises(urllib.error.HTTPError) as err:
                request('/api/deepseek/config', {'api_key': 'fake'}, {'X-CSRF-Token': token, 'Origin': 'https://evil.example'})
            self.assertEqual(err.exception.code, 403)
            with self.assertRaises(urllib.error.HTTPError) as err: request('/backend/server.py')
            self.assertEqual(err.exception.code, 404)
            self.assertFalse(request('/api/status', headers={'X-CSRF-Token': token})[1]['deepseek_key_set'])
            parsed = request('/api/mail/parse-eml', {'raw': 'Subject: local\n\nhello'}, {'X-CSRF-Token': token})[1]
            self.assertEqual(parsed['subject'], 'local')
            self.assertIn('hello', parsed['body'])
        finally:
            server.shutdown(); server.server_close(); thread.join()


if __name__ == '__main__':
    unittest.main()
