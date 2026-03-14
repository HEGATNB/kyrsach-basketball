import urllib.request
import urllib.error
import urllib.parse

data = urllib.parse.urlencode({
    'username': 'admin',
    'password': 'admin'
}).encode('utf-8')

req = urllib.request.Request(
    'http://127.0.0.1:8000/api/auth/login',
    method='POST',
    headers={'Content-Type': 'application/x-www-form-urlencoded'},
    data=data
)

try:
    print(urllib.request.urlopen(req).read().decode())
except urllib.error.HTTPError as e:
    print('HTTP ERROR', e.code)
    print(e.read().decode())
except Exception as e:
    print(e)
