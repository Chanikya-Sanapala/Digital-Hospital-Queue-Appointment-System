import pytest
from httpx import AsyncClient, ASGITransport
from backend.main import app
from backend.core.database import connect_to_mongo, close_mongo_connection, get_database

@pytest.mark.asyncio
async def test_complete_e2e_hospital_flow():
    await connect_to_mongo()
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # 1. Health check
        res = await client.get("/api/health")
        assert res.status_code == 200
        assert res.json()["status"] == "healthy"

        # 2. Check username availability
        avail_res = await client.get("/api/auth/check-username?username=unique_user_9999")
        assert avail_res.status_code == 200
        assert avail_res.json()["available"] is True

        # 3. Patient Login
        login_res = await client.post("/api/auth/login", json={
            "identifier": "patient@queuesense.com",
            "password": "Password@123"
        })
        assert login_res.status_code == 200
        patient_token = login_res.json()["access_token"]
        headers_patient = {"Authorization": f"Bearer {patient_token}"}

        # 4. Patient profile & active token
        me_res = await client.get("/api/auth/me", headers=headers_patient)
        assert me_res.status_code == 200
        assert me_res.json()["username"] == "john_doe"

        active_res = await client.get("/api/queue/active/me", headers=headers_patient)
        assert active_res.status_code == 200
        assert active_res.json()["has_active"] is True
        token_num = active_res.json()["token"]["token_number"]
        assert "-" in token_num

        # 5. Organizations & Services
        orgs_res = await client.get("/api/organizations")
        assert orgs_res.status_code == 200
        assert len(orgs_res.json()) >= 1
        org_id = orgs_res.json()[0]["id"]

        depts_res = await client.get(f"/api/organizations/{org_id}/departments")
        assert depts_res.status_code == 200
        assert len(depts_res.json()) >= 1
        dept_id = depts_res.json()[0]["id"]

        services_res = await client.get(f"/api/services?department_id={dept_id}")
        assert services_res.status_code == 200
        assert len(services_res.json()) >= 1
        serv_id = services_res.json()[0]["id"]

        # 6. Admin Login
        admin_login = await client.post("/api/auth/login", json={
            "identifier": "admin@queuesense.com",
            "password": "Password@123"
        })
        assert admin_login.status_code == 200
        admin_token = admin_login.json()["access_token"]
        headers_admin = {"Authorization": f"Bearer {admin_token}"}

        # 7. Admin Dashboard & Metrics
        dash_res = await client.get("/api/admin/dashboard", headers=headers_admin)
        assert dash_res.status_code == 200
        assert "metrics" in dash_res.json()
        assert "total_appointments_today" in dash_res.json()["metrics"]

        # 8. Admin Analytics
        analytics_res = await client.get("/api/admin/analytics?days=7", headers=headers_admin)
        assert analytics_res.status_code == 200
        assert "department_performance" in analytics_res.json()
        assert "daily_volume" in analytics_res.json()

    await close_mongo_connection()
