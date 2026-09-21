"""Backend tests for ALI Customer Intelligence API (iteration 3)."""
import os
import pytest
import requests

BASE_URL = os.environ.get('REACT_APP_BACKEND_URL', 'https://usage-intel-1.preview.emergentagent.com').rstrip('/')
API = f"{BASE_URL}/api"


@pytest.fixture
def s():
    sess = requests.Session()
    sess.headers.update({"Content-Type": "application/json"})
    return sess


# --- Bootstrap ---
class TestBootstrap:
    def test_bootstrap_keys_and_c001(self, s):
        r = s.get(f"{API}/bootstrap", timeout=30)
        assert r.status_code == 200
        data = r.json()
        expected = ["customers", "portfolio", "actions", "opportunities", "anomalies",
                    "insights", "portfolioUsageTrend", "portfolioFeatures",
                    "adoptionStageDistribution", "expansionReadinessDistribution",
                    "meta", "actionOverrides"]
        for k in expected:
            assert k in data, f"missing key {k}"
        assert len(data["customers"]) == 10
        c001 = next(c for c in data["customers"] if c["id"] == "C001")
        assert c001["name"] == "Acme Technologies"
        assert c001["healthStatus"] == "At Risk"
        assert 35 <= c001["healthScore"] <= 45, c001["healthScore"]
        assert c001["usageGrowth"] < 0
        assert -30 <= c001["usageGrowth"] <= -18, c001["usageGrowth"]
        assert c001["arr"] == 500000
        assert c001["revenueAtRisk"] == 250000


# --- Customers ---
class TestCustomers:
    def test_list(self, s):
        r = s.get(f"{API}/customers", timeout=15)
        assert r.status_code == 200
        assert len(r.json()) == 10

    def test_get_c001(self, s):
        r = s.get(f"{API}/customers/C001", timeout=15)
        assert r.status_code == 200
        assert r.json()["name"] == "Acme Technologies"

    def test_get_bogus_404(self, s):
        r = s.get(f"{API}/customers/BOGUS", timeout=15)
        assert r.status_code == 404


# --- Portfolio ---
class TestPortfolio:
    def test_portfolio(self, s):
        r = s.get(f"{API}/portfolio", timeout=15)
        assert r.status_code == 200
        p = r.json()
        assert p["totalCustomers"] == 10
        assert p["customersAtRisk"] == 2
        assert p["revenueAtRisk"] == 525000


# --- Action overrides persistence ---
class TestActionOverrides:
    def test_update_persist_and_bootstrap_reflect(self, s):
        r = s.put(f"{API}/actions/C001-A1", json={"status": "Completed", "owner": "Maya Patel"}, timeout=15)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "Completed"
        assert body["owner"] == "Maya Patel"

        r2 = s.get(f"{API}/action-overrides", timeout=15)
        assert r2.status_code == 200
        ov = r2.json()
        assert "C001-A1" in ov
        assert ov["C001-A1"]["status"] == "Completed"
        assert ov["C001-A1"]["owner"] == "Maya Patel"

        r3 = s.get(f"{API}/bootstrap", timeout=30)
        assert r3.status_code == 200
        boot_ov = r3.json()["actionOverrides"]
        assert "C001-A1" in boot_ov
        assert boot_ov["C001-A1"]["status"] == "Completed"

    def test_empty_body_400(self, s):
        r = s.put(f"{API}/actions/C001-A1", json={}, timeout=15)
        assert r.status_code == 400
