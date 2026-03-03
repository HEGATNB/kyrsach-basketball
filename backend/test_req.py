import urllib.request
import urllib.error

req = urllib.request.Request(
    'http://localhost:8000/api/auth/register',
    method='POST',
    headers={'Content-Type': 'application/json'},
    data=b'{"username":"test3","email":"test3@test.com","password":"password"}'
)

try:
    print(urllib.request.urlopen(req).read().decode())
except urllib.error.HTTPError as e:
    print('HTTP ERROR', e.code)
    print(e.read().decode())
except Exception as e:
    print(e)
