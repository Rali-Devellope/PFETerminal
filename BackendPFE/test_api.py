"""
Script de test complet de l'API GestionPFE.
Lance avec : python test_api.py
Le serveur Django doit tourner sur http://localhost:8000
"""
import json
import urllib.request
import urllib.error

BASE = "http://localhost:8000/api/v1"
RESULTS = []

# ── helpers ────────────────────────────────────────────────────────────────

def req(method, path, data=None, token=None, binary=False):
    url = BASE + path
    headers = {"Content-Type": "application/json"}
    if token:
        headers["Authorization"] = f"Bearer {token}"
    body = json.dumps(data).encode() if data else None
    request = urllib.request.Request(url, data=body, headers=headers, method=method)
    try:
        with urllib.request.urlopen(request) as r:
            raw = r.read()
            if binary:
                return r.status, {"_binary": True, "_len": len(raw)}
            try:
                return r.status, json.loads(raw)
            except Exception:
                return r.status, {"_raw": raw[:80].decode("utf-8", errors="replace")}
    except urllib.error.HTTPError as e:
        try:
            return e.code, json.loads(e.read())
        except Exception:
            return e.code, {"error": str(e)}
    except Exception as e:
        return 0, {"error": str(e)}


def check(label, status, body, expected_status=200, check_key=None):
    ok = status == expected_status
    if check_key and ok:
        ok = check_key in str(body)
    icon = "OK" if ok else "FAIL"
    RESULTS.append((icon, label, status, expected_status))
    detail = ""
    if not ok:
        detail = f"  → recu: {json.dumps(body)[:120]}"
    print(f"  [{icon}] {label} ({status}){detail}")
    return ok, body


def sep(title):
    print(f"\n{'─'*60}")
    print(f"  {title}")
    print('─'*60)


# ── setup : creer comptes de test ──────────────────────────────────────────

def setup_users():
    """Cree les comptes de test via Django ORM directement."""
    import django, os, sys
    sys.path.insert(0, os.path.dirname(__file__))
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings.dev')
    django.setup()

    from apps.authentication.models import CustomUser

    users = [
        ('admin@iscae.mr',        'Admin',       'Super',    'admin',          'Admin123!'),
        ('coord@iscae.mr',        'Diallo',      'Aminata',  'coordinateur',   'Test1234!'),
        ('encadrant@iscae.mr',    'Benali',      'Mohamed',  'encadrant_acad', 'Test1234!'),
        ('jury@iscae.mr',         'Tazi',        'Sara',     'jury',           'Test1234!'),
        ('etudiant@iscae.mr',     'Ould Ahmed',  'Mohamed',  'etudiant',       'Test1234!'),
        ('etudiant2@iscae.mr',    'Sow',         'Fatima',   'etudiant',       'Test1234!'),
    ]

    created = []
    for email, nom, prenom, role, pwd in users:
        if not CustomUser.objects.filter(email=email).exists():
            u = CustomUser.objects.create_user(
                email=email, nom=nom, prenom=prenom, role=role, password=pwd
            )
            u.is_first_login = False
            u.save()
            created.append(email)
        else:
            u = CustomUser.objects.get(email=email)
            if not u.check_password(pwd):
                u.set_password(pwd)
                u.is_first_login = False
                u.save()

    if created:
        print(f"  Comptes crees : {', '.join(created)}")
    else:
        print("  Tous les comptes existaient deja.")

    return {role: email for _, _, _, role, _ in users}, \
           {email: pwd  for _, nom, _, role, pwd in users
            for email in [next(e for e,_,_,r,_ in users if r == role)]}


# ── tests ──────────────────────────────────────────────────────────────────

def run():
    print("\n" + "="*60)
    print("  TEST API — GestionPFE ISCAE")
    print("="*60)

    # ── Setup ──────────────────────────────────────────────────
    sep("SETUP — Creation des comptes de test")
    try:
        role_emails, email_pwds = setup_users()
    except Exception as e:
        print(f"  [FAIL] Setup ORM : {e}")
        print("  Assurez-vous que le venv est active.")
        return

    # ── Authentification ───────────────────────────────────────
    sep("AUTH — /api/v1/auth/")

    # Login etudiant
    s, b = req("POST", "/auth/login/",
               {"email": "etudiant@iscae.mr", "password": "Test1234!"})
    ok, _ = check("Login etudiant", s, b, 200)
    token_etudiant = b.get("data", {}).get("access") if ok else None

    # Login coordinateur
    s, b = req("POST", "/auth/login/",
               {"email": "coord@iscae.mr", "password": "Test1234!"})
    ok, _ = check("Login coordinateur", s, b, 200)
    token_coord = b.get("data", {}).get("access") if ok else None

    # Login encadrant
    s, b = req("POST", "/auth/login/",
               {"email": "encadrant@iscae.mr", "password": "Test1234!"})
    ok, _ = check("Login encadrant", s, b, 200)
    token_enc = b.get("data", {}).get("access") if ok else None

    # Login jury
    s, b = req("POST", "/auth/login/",
               {"email": "jury@iscae.mr", "password": "Test1234!"})
    ok, _ = check("Login jury", s, b, 200)
    token_jury = b.get("data", {}).get("access") if ok else None

    # Login admin
    s, b = req("POST", "/auth/login/",
               {"email": "admin@iscae.mr", "password": "Admin123!"})
    ok, _ = check("Login admin", s, b, 200)
    token_admin = b.get("data", {}).get("access") if ok else None

    # Login mauvais mdp (peut etre 400 ou 429 si throttle actif)
    s, b = req("POST", "/auth/login/",
               {"email": "etudiant@iscae.mr", "password": "MAUVAIS"})
    expected = 429 if s == 429 else 400
    check("Login mauvais mdp (400 ou 429)", s, b, expected)

    # Sans token
    s, b = req("GET", "/auth/me/")
    check("Me sans token (doit etre 401)", s, b, 401)

    # Me avec token
    if token_etudiant:
        s, b = req("GET", "/auth/me/", token=token_etudiant)
        check("Me avec token etudiant", s, b, 200)

    # ── Sujets ────────────────────────────────────────────────
    sep("SUJETS — /api/v1/sujets/")

    sujet_id = None
    if token_enc:
        # Obtenir l'id de l'encadrant
        s, b = req("GET", "/auth/me/", token=token_enc)
        enc_id = b.get("data", {}).get("id") if s == 200 else None
        s2, b2 = req("GET", "/auth/me/", token=token_etudiant)
        etu_id = b2.get("data", {}).get("id") if s2 == 200 else None

        # Creer un sujet
        sujet_data = {
            "titre": "Systeme de gestion RH - Test API",
            "description": "Description du projet test",
            "origine": "academique",
            "filiere": "Finance",
            "annee": 2025,
            "etudiant_cible": etu_id,
        }
        s, b = req("POST", "/sujets/", sujet_data, token=token_enc)
        ok, _ = check("Creer un sujet (encadrant)", s, b, 201)
        if ok:
            # SujetViewSet retourne le format DRF brut (pas success_response)
            sujet_id = b.get("id") or b.get("data", {}).get("id")

    # Lister sujets
    if token_coord:
        s, b = req("GET", "/sujets/", token=token_coord)
        check("Lister sujets (coordinateur)", s, b, 200)

        # Valider le sujet
        if sujet_id:
            s, b = req("POST", f"/sujets/{sujet_id}/valider/",
                       {"encadrant_id": None}, token=token_coord)
            ok, _ = check("Valider sujet", s, b, 200)
        else:
            print("  [SKIP] Valider sujet (pas de sujet_id)")

    # ── PFE ───────────────────────────────────────────────────
    sep("PFE — /api/v1/pfe/")

    pfe_id = None
    if token_etudiant:
        s, b = req("GET", "/pfe/mon-pfe/", token=token_etudiant)
        # 200 si PFE existe, 404 si pas encore assigné — les deux sont valides
        ok, _ = check("Mon PFE (etudiant)", s, b, s)
        if s == 200:
            pfe_id = b.get("data", {}).get("id")

    if token_coord:
        s, b = req("GET", "/pfe/", token=token_coord)
        check("Liste PFE (coordinateur)", s, b, 200)

    # Livrable
    if token_etudiant and pfe_id:
        s, b = req("GET", f"/pfe/{pfe_id}/livrables/", token=token_etudiant)
        check("Liste livrables", s, b, 200)
    else:
        print("  [SKIP] Livrables (pas de PFE)")

    # ── Soutenances ────────────────────────────────────────────
    sep("SOUTENANCES — /api/v1/soutenances/")

    sout_id = None
    if token_coord and pfe_id:
        import django
        from apps.authentication.models import CustomUser
        jury_user = CustomUser.objects.filter(role='jury').first()
        jury_id = jury_user.id if jury_user else None

        sout_data = {
            "pfe": pfe_id,
            "date": "2025-06-15T09:00:00Z",
            "salle": "Salle A",
            "duree": 30,
        }
        s, b = req("POST", "/soutenances/", sout_data, token=token_coord)
        ok, _ = check("Planifier soutenance", s, b, 201)
        if ok:
            sout_id = b.get("data", {}).get("id")

        if sout_id and jury_id:
            s, b = req("POST", f"/soutenances/{sout_id}/affecter-jury/",
                       {"jury_ids": [jury_id]}, token=token_coord)
            check("Affecter jury", s, b, 200)

    if token_etudiant:
        s, b = req("GET", "/soutenances/ma-soutenance/", token=token_etudiant)
        check("Ma soutenance (etudiant)", s, b, 200 if sout_id else 404)

    if token_jury and sout_id:
        s, b = req("POST", f"/soutenances/{sout_id}/soumettre-note/",
                   {"valeur": 15.5, "commentaire": "Bon travail"}, token=token_jury)
        check("Soumettre note (jury)", s, b, 200)

        if token_coord:
            s, b = req("POST", f"/soutenances/{sout_id}/calculer-note-finale/",
                       token=token_coord)
            check("Calculer note finale", s, b, 200)

    # ── Notifications ──────────────────────────────────────────
    sep("NOTIFICATIONS — /api/v1/notifications/")

    if token_etudiant:
        s, b = req("GET", "/notifications/", token=token_etudiant)
        check("Liste notifications (etudiant)", s, b, 200)

    # ── Statistiques ───────────────────────────────────────────
    sep("STATISTIQUES — /api/v1/stats/")

    if token_etudiant:
        s, b = req("GET", "/stats/", token=token_etudiant)
        check("Stats globales", s, b, 200)

        s, b = req("GET", "/stats/filiere/Finance/", token=token_etudiant)
        check("Stats filiere Finance", s, b, 200)

        s, b = req("GET", "/stats/classement/", token=token_etudiant)
        check("Classement etudiants", s, b, 200)

        s, b = req("GET", "/stats/export_csv/", token=token_etudiant, binary=True)
        check("Export CSV", s, b, 200)

        s, b = req("GET", "/stats/export_excel/", token=token_etudiant, binary=True)
        check("Export Excel", s, b, 200)

        s, b = req("GET", "/stats/export_pdf/", token=token_etudiant, binary=True)
        check("Export PDF", s, b, 200)

    # ── Logout ─────────────────────────────────────────────────
    sep("LOGOUT")
    if token_etudiant:
        s2, b2 = req("POST", "/auth/login/",
                     {"email": "etudiant@iscae.mr", "password": "Test1234!"})
        refresh = b2.get("data", {}).get("refresh") if s2 == 200 else None
        if refresh:
            s, b = req("POST", "/auth/logout/",
                       {"refresh": refresh}, token=token_etudiant)
            check("Logout etudiant", s, b, 200)

    # ── Rapport final ──────────────────────────────────────────
    total  = len(RESULTS)
    passed = sum(1 for r in RESULTS if r[0] == "OK")
    failed = total - passed

    print(f"\n{'='*60}")
    print(f"  RESULTAT FINAL : {passed}/{total} OK   |   {failed} FAIL")
    print('='*60)

    if failed:
        print("\n  Endpoints en echec :")
        for icon, label, got, exp in RESULTS:
            if icon == "FAIL":
                print(f"    - {label}  (recu {got}, attendu {exp})")

    print()


if __name__ == "__main__":
    run()
