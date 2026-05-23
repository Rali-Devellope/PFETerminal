"""Capture le traceback exact du serveur Django. Lance: python get_error.py"""
import urllib.request, urllib.error

url = 'http://localhost:8000/api/v1/auth/login/'
data = b'{"email":"etudiant@iscae.mr","password":"Test1234!"}'
req = urllib.request.Request(
    url, data=data,
    headers={'Content-Type': 'application/json', 'Accept': 'text/html,application/json'},
    method='POST'
)
try:
    with urllib.request.urlopen(req) as r:
        print("OK!", r.status)
except urllib.error.HTTPError as e:
    body = e.read().decode('utf-8', errors='replace')
    print(f"HTTP {e.code} — longueur: {len(body)} chars\n")

    # Chercher le traceback dans la page HTML de debug Django
    import re

    # Cherche le bloc <pre class="exception_value">
    m = re.search(r'exception_value.*?</pre>', body, re.DOTALL)
    if m:
        clean = re.sub(r'<[^>]+>', '', m.group())
        print("=== EXCEPTION ===")
        print(clean[:500])

    # Cherche les frames du traceback
    frames = re.findall(r'<li class="frame[^"]*".*?</li>', body, re.DOTALL)
    if frames:
        print("\n=== FRAMES ===")
        for f in frames[-5:]:
            clean = re.sub(r'<[^>]+>', ' ', f)
            clean = ' '.join(clean.split())
            print(clean[:200])
    elif 'Traceback' in body:
        idx = body.find('Traceback')
        print("\n=== RAW TRACEBACK ===")
        print(body[idx:idx+2000])
    else:
        # Juste les 1000 premiers chars du corps brut
        print("=== BODY (debut) ===")
        print(body[:1000])
except Exception as e:
    print(f"Erreur connexion: {e}")
    print("Le serveur tourne-t-il sur http://localhost:8000 ?")
