"""Diagnostic Django — lance avec : python diag.py"""
import os, sys, traceback
sys.path.insert(0, os.path.dirname(__file__))
os.environ['DJANGO_SETTINGS_MODULE'] = 'config.settings.dev'

print("=== DIAGNOSTIC DJANGO ===\n")

# 1. Setup Django
try:
    import django
    django.setup()
    print("[OK] django.setup()")
except Exception:
    print("[FAIL] django.setup():")
    traceback.print_exc()
    sys.exit(1)

# 2. Import URL conf
try:
    from django.urls import reverse
    from django.test import Client
    print("[OK] Imports OK")
except Exception:
    print("[FAIL] Imports:")
    traceback.print_exc()
    sys.exit(1)

# 3. Test login via Django test client (pas de serveur HTTP)
import json
client = Client()

print("\n--- Test login via Django test client ---")
try:
    r = client.post(
        '/api/v1/auth/login/',
        data=json.dumps({'email': 'etudiant@iscae.mr', 'password': 'Test1234!'}),
        content_type='application/json',
    )
    print(f"Status  : {r.status_code}")
    print(f"Contenu : {r.content[:300].decode('utf-8', errors='replace')}")
except Exception:
    print("[FAIL] Requete test client:")
    traceback.print_exc()

# 4. Test GET me/ sans token
print("\n--- Test GET /auth/me/ sans token ---")
try:
    r = client.get('/api/v1/auth/me/')
    print(f"Status  : {r.status_code}")
    print(f"Contenu : {r.content[:200].decode('utf-8', errors='replace')}")
except Exception:
    print("[FAIL] Requete test client:")
    traceback.print_exc()

# 5. Verifier les settings critiques
print("\n--- Settings ---")
from django.conf import settings
print(f"DEBUG             : {settings.DEBUG}")
print(f"INSTALLED_APPS    : {[a.split('.')[-1] for a in settings.INSTALLED_APPS]}")
print(f"ASGI_APPLICATION  : {getattr(settings, 'ASGI_APPLICATION', 'non defini')}")
print(f"CHANNEL_LAYERS    : {settings.CHANNEL_LAYERS}")
print(f"REST_FRAMEWORK    : EXCEPTION_HANDLER = {settings.REST_FRAMEWORK.get('EXCEPTION_HANDLER')}")
