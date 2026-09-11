import urllib.request
import json
import sys

BASE_URL = 'http://localhost:5000'
CLIENT_URL = 'http://localhost:3000'

def test_api():
    print("=" * 60)
    print("      AQ TRACK - OVERALL SYSTEM TEST SUITE")
    print("=" * 60)

    passed_tests = 0
    total_tests = 0

    def assert_test(name, condition, extra_info=""):
        nonlocal passed_tests, total_tests
        total_tests += 1
        if condition:
            passed_tests += 1
            print(f"  ✓ [PASS] {name} {extra_info}")
        else:
            print(f"  ✗ [FAIL] {name} {extra_info}")

    # 1. Test Backend Health
    try:
        with urllib.request.urlopen(f"{BASE_URL}/api/health") as resp:
            data = json.loads(resp.read().decode('utf-8'))
            assert_test("Backend API Health Endpoint", resp.status == 200 and data.get('status') == 'OK')
    except Exception as e:
        assert_test("Backend API Health Endpoint", False, str(e))

    # 2. Test Root Landing Page & 404 Fallback
    try:
        with urllib.request.urlopen(f"{BASE_URL}/") as resp:
            html = resp.read().decode('utf-8')
            assert_test("Backend Root Landing Page (HTTP 200)", resp.status == 200 and 'AQ TRACK' in html)
    except Exception as e:
        assert_test("Backend Root Landing Page", False, str(e))

    try:
        with urllib.request.urlopen(f"{BASE_URL}/goal") as resp:
            pass
    except urllib.error.HTTPError as e:
        assert_test("Friendly 404 Handler for /goal", e.code == 404)

    # 3. Test Authentication & Role Credentials
    roles_to_test = [
        ('admin', 'admin123', 'Admin'),
        ('op_intake', 'intake123', 'Operator'),
        ('op_process', 'process123', 'Operator'),
        ('op_dom_gard', 'domestic123', 'Operator'),
        ('op_treatment', 'treatment123', 'Operator'),
        ('manager', 'viewer123', 'Viewer')
    ]

    tokens = {}
    for uname, passw, role in roles_to_test:
        try:
            req_data = json.dumps({'username': uname, 'password': passw}).encode('utf-8')
            req = urllib.request.Request(f"{BASE_URL}/api/auth/login", data=req_data, headers={'Content-Type': 'application/json'})
            with urllib.request.urlopen(req) as resp:
                res = json.loads(resp.read().decode('utf-8'))
                tok = res.get('token')
                tokens[uname] = tok
                assert_test(f"Authentication for {uname} ({role})", resp.status == 200 and tok is not None)
        except Exception as e:
            assert_test(f"Authentication for {uname}", False, str(e))

    admin_token = tokens.get('admin')

    # 4. Test Live Dashboard API (2026 PDF Data)
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/dashboard?timeframe=daily", headers={'Authorization': f"Bearer {admin_token}"})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            series = res.get('dailySeries', [])
            kpi = res.get('latestKPI', {})
            assert_test("Dashboard 2026 Series API", resp.status == 200 and len(series) == 365, f"({len(series)} days loaded)")
            assert_test("Dashboard KPI Data (intake & ratio)", kpi.get('intake_kl', 0) > 0 and kpi.get('specific_total_kl_mt', 0) > 0)
    except Exception as e:
        assert_test("Dashboard 2026 Series API", False, str(e))

    # 5. Test Date Readings API
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/readings?date=2026-06-15&area=Water+Intake", headers={'Authorization': f"Bearer {admin_token}"})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            meters = res.get('meters', [])
            target = res.get('target', {})
            assert_test("Readings API for 2026-06-15", resp.status == 200 and len(meters) > 0 and target.get('production_mt', 0) > 0)
    except Exception as e:
        assert_test("Readings API for 2026-06-15", False, str(e))

    # 6. Test Excel Export Download Stream (.xlsx)
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/export/excel?startDate=2026-01-01&endDate=2026-12-31", headers={'Authorization': f"Bearer {admin_token}"})
        with urllib.request.urlopen(req) as resp:
            excel_bytes = resp.read()
            assert_test("Excel Export API (.xlsx generation)", resp.status == 200 and len(excel_bytes) > 50000, f"({len(excel_bytes)} bytes)")
    except Exception as e:
        assert_test("Excel Export API", False, str(e))

    # 7. Test Meter Config API
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/meters", headers={'Authorization': f"Bearer {admin_token}"})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            meters_arr = res if isinstance(res, list) else res.get('meters', [])
            assert_test("Meter Config API", resp.status == 200 and len(meters_arr) > 20, f"({len(meters_arr)} meters active)")
    except Exception as e:
        assert_test("Meter Config API", False, str(e))

    # 8. Test Audit Logs API
    try:
        req = urllib.request.Request(f"{BASE_URL}/api/audit", headers={'Authorization': f"Bearer {admin_token}"})
        with urllib.request.urlopen(req) as resp:
            res = json.loads(resp.read().decode('utf-8'))
            logs_arr = res if isinstance(res, list) else res.get('logs', [])
            assert_test("Audit Logs API", resp.status == 200 and len(logs_arr) > 0, f"({len(logs_arr)} log entries)")
    except Exception as e:
        assert_test("Audit Logs API", False, str(e))

    # 9. Test Frontend Client Server
    try:
        with urllib.request.urlopen(CLIENT_URL) as resp:
            html = resp.read().decode('utf-8')
            assert_test("Frontend Client Dev Server (http://localhost:3000)", resp.status == 200 and ('AQ TRACK' in html or 'vite' in html))
    except Exception as e:
        assert_test("Frontend Client Dev Server", False, str(e))

    print("=" * 60)
    print(f"      TEST RESULTS: {passed_tests} / {total_tests} PASSED ({int(passed_tests/total_tests*100)}%)")
    print("=" * 60)

if __name__ == '__main__':
    test_api()
