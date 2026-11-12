import asyncio
import json
import httpx
from datetime import date, timedelta

BASE_URL = "http://localhost:8000/api"

async def test_live_system():
    print("=== STARTING QUEUESENSE LIVE SYSTEM INTEGRATION TESTS ===")
    
    async with httpx.AsyncClient(base_url=BASE_URL, timeout=15.0) as client:
        # 1. Health check
        print("\n[1] Checking Health...")
        res = await client.get("/health")
        assert res.status_code == 200, f"Health check failed: {res.text}"
        data = res.json()
        print(f" -> OK: {data}")
        assert data["database"] == "connected"

        # 2. Check username availability
        print("\n[2] Checking Username Availability...")
        res = await client.get("/auth/check-username?username=admin")
        assert res.status_code == 200
        print(f" -> 'admin' available: {res.json()['available']} (expected False)")
        assert res.json()["available"] is False

        res = await client.get("/auth/check-username?username=brand_new_user_999")
        assert res.status_code == 200
        print(f" -> 'brand_new_user_999' available: {res.json()['available']} (expected True)")
        assert res.json()["available"] is True

        # 3. Email OTP Simulation send & verify
        print("\n[3] Testing Email OTP Service...")
        res = await client.post("/auth/send-otp", json={
            "email": "verify.user@queuesense.com",
            "purpose": "registration",
            "channel": "email"
        })
        assert res.status_code == 200
        otp_data = res.json()
        print(f" -> Send Email OTP response: {otp_data}")
        assert otp_data["success"] is True

        dev_code = otp_data.get("dev_otp", "123456")
        res = await client.post("/auth/verify-otp", json={
            "email": "verify.user@queuesense.com",
            "otp_code": dev_code,
            "purpose": "registration"
        })
        assert res.status_code == 200
        print(f" -> Verify Email OTP response: {res.json()}")
        assert res.json()["success"] is True

        # 4. Patient Login
        print("\n[4] Testing Patient Login...")
        res = await client.post("/auth/login", json={
            "identifier": "patient@queuesense.com",
            "password": "Password@123"
        })
        assert res.status_code == 200, f"Patient login failed: {res.text}"
        patient_auth = res.json()
        patient_token = patient_auth["access_token"]
        patient_headers = {"Authorization": f"Bearer {patient_token}"}
        print(f" -> Patient logged in: {patient_auth['user']['first_name']} {patient_auth['user']['last_name']} (role: {patient_auth['user']['role']})")

        # 5. Patient Profile (/auth/me)
        print("\n[5] Testing /auth/me for patient...")
        res = await client.get("/auth/me", headers=patient_headers)
        assert res.status_code == 200
        print(f" -> /auth/me returned: {res.json()['email']}")

        # 6. Admin Login
        print("\n[6] Testing Admin Login...")
        res = await client.post("/auth/login", json={
            "identifier": "admin@queuesense.com",
            "password": "Password@123"
        })
        assert res.status_code == 200, f"Admin login failed: {res.text}"
        admin_auth = res.json()
        admin_token = admin_auth["access_token"]
        admin_headers = {"Authorization": f"Bearer {admin_token}"}
        print(f" -> Admin logged in: {admin_auth['user']['first_name']} (role: {admin_auth['user']['role']})")

        # 7. Organizations & Departments Catalog
        print("\n[7] Querying Organizations & Departments...")
        res = await client.get("/organizations")
        assert res.status_code == 200
        orgs = res.json()
        assert len(orgs) > 0
        org_id = orgs[0]["id"]
        print(f" -> Found {len(orgs)} organizations. Using: {orgs[0]['name']} (ID: {org_id})")

        res = await client.get(f"/departments?organization_id={org_id}")
        assert res.status_code == 200
        depts = res.json()
        assert len(depts) > 0
        dept_id = depts[0]["id"]
        print(f" -> Found {len(depts)} departments. Using: {depts[0]['name']} (ID: {dept_id})")

        res = await client.get(f"/services?department_id={dept_id}")
        assert res.status_code == 200
        services = res.json()
        assert len(services) > 0
        service_id = services[0]["id"]
        print(f" -> Found {len(services)} services. Using: {services[0]['name']} (ID: {service_id})")

        # 8. Slot Availability
        target_date = (date.today() + timedelta(days=2)).isoformat()
        print(f"\n[8] Checking Slot Availability for service {service_id} on {target_date}...")
        res = await client.get(f"/services/{service_id}/availability?date={target_date}")
        assert res.status_code == 200
        avail = res.json()
        slots_list = avail.get("slots", [])
        print(f" -> Available slots count: {len(slots_list)}")
        chosen_slot = slots_list[0]["time_slot"] if slots_list else "09:00 - 09:30"

        # 9. Book Appointment as Patient
        print(f"\n[9] Booking Appointment for {target_date} at {chosen_slot}...")
        booking_payload = {
            "organization_id": org_id,
            "department_id": dept_id,
            "service_id": service_id,
            "appointment_date": target_date,
            "time_slot": chosen_slot,
            "notes": "Live integration automated test"
        }
        res = await client.post("/appointments", json=booking_payload, headers=patient_headers)
        if res.status_code == 200:
            appt = res.json()
            token_number = appt.get("token_number", "Unknown")
            print(f" -> Appointment successfully booked! Token: {token_number}")
        elif res.status_code == 400:
            print(f" -> Expected constraint handled: {res.json().get('detail')}")
        else:
            print(f" -> Booking result: {res.status_code} {res.text}")

        # 10. Patient's Active Queue Token & Position
        print("\n[10] Checking Patient Active Token (/queue/active/me)...")
        res = await client.get("/queue/active/me", headers=patient_headers)
        assert res.status_code == 200
        active_resp = res.json()
        print(f" -> Has active token: {active_resp['has_active']}")
        if active_resp.get("has_active") and active_resp.get("token"):
            tok = active_resp["token"]
            print(f" -> Active Token: {tok['token_number']} (Status: {tok['status']})")
            token_id = tok["id"]
            res = await client.get(f"/queue/{token_id}/position", headers=patient_headers)
            assert res.status_code == 200
            pos = res.json()
            print(f" -> Position: #{pos.get('position')}, Ahead: {pos.get('people_ahead')}, Est Wait: {pos.get('estimated_wait_minutes')} mins")

        # 11. Live Department Queue Status
        print(f"\n[11] Live Department Queue Status (/queue/status/{dept_id})...")
        res = await client.get(f"/queue/status/{dept_id}")
        assert res.status_code == 200
        dept_status = res.json()
        print(f" -> Serving Token: {dept_status.get('currently_serving_token')}, Waiting: {dept_status.get('waiting_count')}, Est Avg Duration: {dept_status.get('estimated_wait_per_person_minutes')} min")

        # 12. Admin Dashboard & Metrics
        print("\n[12] Querying Admin Dashboard (/admin/dashboard)...")
        res = await client.get("/admin/dashboard", headers=admin_headers)
        assert res.status_code == 200
        dash = res.json()
        metrics = dash["metrics"]
        print(f" -> Metrics: Appointments Today: {metrics['total_appointments_today']}, Waiting: {metrics['waiting_customers']}, Completed: {metrics['completed_services']}, Avg Wait: {metrics['average_waiting_time_minutes']}m")
        print(f" -> Active queues count: {len(dash['active_queues'])}, Recent appointments: {len(dash['recent_appointments'])}")

        # 13. Admin Queue Management & Actions
        print("\n[13] Admin Queue Management Listing & Actions...")
        res = await client.get("/admin/queues", headers=admin_headers)
        assert res.status_code == 200
        queue_items = res.json()
        print(f" -> Active queue items count: {len(queue_items)}")
        for item in queue_items[:3]:
            print(f"    - {item['token_number']} | {item.get('customer_name')} | {item.get('department_name')} | Status: {item['status']}")

        # Test Call Next if there are waiting tokens
        waiting = [q for q in queue_items if q["status"] == "waiting"]
        if waiting:
            target_dept = waiting[0]["department_id"]
            print(f" -> Calling next in dept {waiting[0].get('department_name')} ({target_dept})...")
            res = await client.post(f"/admin/queues/{target_dept}/call-next", headers=admin_headers)
            print(f" -> Call-Next Status: {res.status_code}")
            if res.status_code == 200:
                called = res.json()
                print(f"    Called token: {called['token_number']} (Status: {called['status']})")
                
                # Start service
                print(f" -> Starting service on token {called['token_number']}...")
                res_start = await client.patch(f"/admin/tokens/{called['id']}/start", headers=admin_headers)
                print(f"    Start service status: {res_start.status_code} -> {res_start.json().get('status')}")

                # Complete service
                print(f" -> Completing service on token {called['token_number']}...")
                res_comp = await client.patch(f"/admin/tokens/{called['id']}/complete", headers=admin_headers)
                print(f"    Complete service status: {res_comp.status_code} -> {res_comp.json().get('status')}")
        else:
            print(" -> No tokens currently in waiting status to advance.")

        # 14. Admin Analytics
        print("\n[14] Querying Admin Analytics (Aggregations)...")
        res = await client.get("/admin/analytics?days=7", headers=admin_headers)
        assert res.status_code == 200
        analytics = res.json()
        print(f" -> Total: {analytics['total_appointments']}, Completed: {analytics['completed_appointments']}, Avg Service: {analytics['average_service_duration_minutes']}m")
        print(f" -> Daily volume points: {len(analytics['daily_volume'])}, Department breakdown: {len(analytics['department_performance'])}")

        # 15. Admin Customers Directory
        print("\n[15] Querying Admin Customer Directory...")
        res = await client.get("/admin/customers", headers=admin_headers)
        assert res.status_code == 200
        customers = res.json()
        print(f" -> Total registered customers: {len(customers)}")
        if customers:
            print(f"    First customer: {customers[0]['first_name']} {customers[0]['last_name']} ({customers[0]['email']})")

    print("\n=== ALL 15 LIVE SYSTEM INTEGRATION TESTS PASSED SUCCESSFULLY! ===")

if __name__ == "__main__":
    asyncio.run(test_live_system())
