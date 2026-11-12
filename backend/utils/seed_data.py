import asyncio
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorClient
from backend.core.config import settings
from backend.core.security import hash_password

async def seed_database():
    print(f"Connecting to MongoDB at {settings.DATABASE_NAME}...")
    client = AsyncIOMotorClient(settings.MONGODB_URI)
    db = client[settings.DATABASE_NAME]
    
    now = datetime.now(timezone.utc)
    today_str = now.strftime("%Y-%m-%d")
    
    print("Clearing test collections for fresh seed...")
    await db.organizations.delete_many({})
    await db.branches.delete_many({})
    await db.departments.delete_many({})
    await db.services.delete_many({})
    await db.users.delete_many({})
    await db.appointments.delete_many({})
    await db.queue_tokens.delete_many({})
    await db.queue_events.delete_many({})
    
    print("Seeding Organizations...")
    org1_res = await db.organizations.insert_one({
        "name": "Apex Memorial Hospital",
        "code": "AMH",
        "address": "742 Evergreen Medical Blvd",
        "city": "Metropolis",
        "contact_phone": "+1 (555) 019-2834",
        "contact_email": "care@apexmemorial.org",
        "is_active": True,
        "created_at": now
    })
    org1_id = str(org1_res.inserted_id)

    org2_res = await db.organizations.insert_one({
        "name": "City Care Specialty Clinic",
        "code": "CSC",
        "address": "104 Healthcare Way, Suite 400",
        "city": "Springfield",
        "contact_phone": "+1 (555) 024-8819",
        "contact_email": "info@citycareclinic.org",
        "is_active": True,
        "created_at": now
    })
    org2_id = str(org2_res.inserted_id)
    
    print("Seeding Branches...")
    await db.branches.insert_many([
        {
            "organization_id": org1_id,
            "name": "Downtown Central Hospital Tower",
            "address": "742 Evergreen Medical Blvd, Central Wing",
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "name": "Westside Outpatient Pavilion",
            "address": "320 West End Avenue",
            "is_active": True
        }
    ])
    
    print("Seeding Departments for Apex Memorial Hospital...")
    depts_data = [
        {
            "organization_id": org1_id,
            "name": "General Medicine",
            "code": "GEN",
            "description": "Primary healthcare, diagnostics, adult preventive care and routine exams.",
            "floor": "Floor 1",
            "room_number": "Room 101",
            "queue_prefix": "GM",
            "max_daily_capacity": 100,
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "name": "Cardiology",
            "code": "CARD",
            "description": "Cardiovascular screening, ECG, echocardiograms, and hypertension management.",
            "floor": "Floor 2",
            "room_number": "Room 205",
            "queue_prefix": "CD",
            "max_daily_capacity": 60,
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "name": "Dermatology",
            "code": "DERM",
            "description": "Specialized diagnosis and treatment for skin disorders, allergies and biopsies.",
            "floor": "Floor 3",
            "room_number": "Room 310",
            "queue_prefix": "DM",
            "max_daily_capacity": 80,
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "name": "Orthopedics",
            "code": "ORTH",
            "description": "Bones, joints, sports injuries, fracture management, and physical rehabilitation.",
            "floor": "Floor 1",
            "room_number": "Room 114",
            "queue_prefix": "OP",
            "max_daily_capacity": 70,
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "name": "Pediatrics",
            "code": "PED",
            "description": "Comprehensive infant, child, and adolescent healthcare, immunizations and development.",
            "floor": "Floor 2",
            "room_number": "Room 220",
            "queue_prefix": "PD",
            "max_daily_capacity": 90,
            "is_active": True
        }
    ]
    
    dept_map = {}
    for d in depts_data:
        res = await db.departments.insert_one(d)
        dept_map[d["name"]] = str(res.inserted_id)

    print("Seeding Services...")
    services_data = [
        # General Medicine
        {
            "organization_id": org1_id,
            "department_id": dept_map["General Medicine"],
            "name": "Routine Health Consultation",
            "description": "Comprehensive checkup with a licensed General Physician.",
            "duration_minutes": 15,
            "price": 40.0,
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "department_id": dept_map["General Medicine"],
            "name": "Executive Wellness Physical",
            "description": "Full blood panel review, vitals examination and diagnostic assessment.",
            "duration_minutes": 30,
            "price": 95.0,
            "is_active": True
        },
        # Cardiology
        {
            "organization_id": org1_id,
            "department_id": dept_map["Cardiology"],
            "name": "Comprehensive Cardiac Consultation",
            "description": "In-depth heart health consultation with Cardiologist.",
            "duration_minutes": 25,
            "price": 120.0,
            "is_active": True
        },
        {
            "organization_id": org1_id,
            "department_id": dept_map["Cardiology"],
            "name": "Standard ECG & Vitals Evaluation",
            "description": "12-lead Electrocardiogram screening and rhythm evaluation.",
            "duration_minutes": 20,
            "price": 75.0,
            "is_active": True
        },
        # Dermatology
        {
            "organization_id": org1_id,
            "department_id": dept_map["Dermatology"],
            "name": "Skin Condition & Rash Assessment",
            "description": "Specialized dermatological evaluation and prescription.",
            "duration_minutes": 20,
            "price": 65.0,
            "is_active": True
        },
        # Orthopedics
        {
            "organization_id": org1_id,
            "department_id": dept_map["Orthopedics"],
            "name": "Joint & Mobility Evaluation",
            "description": "Examination of knee, hip, shoulder or spine discomfort.",
            "duration_minutes": 20,
            "price": 70.0,
            "is_active": True
        },
        # Pediatrics
        {
            "organization_id": org1_id,
            "department_id": dept_map["Pediatrics"],
            "name": "Well-Child Pediatric Exam",
            "description": "General pediatric growth, milestone, and health evaluation.",
            "duration_minutes": 20,
            "price": 50.0,
            "is_active": True
        }
    ]
    
    service_map = {}
    for s in services_data:
        res = await db.services.insert_one(s)
        service_map[s["name"]] = str(res.inserted_id)

    print("Seeding Users (Admin, Staff, Customer)...")
    admin_hash = hash_password("Password@123")
    
    admin_res = await db.users.insert_one({
        "first_name": "Hospital",
        "last_name": "Administrator",
        "email": "admin@queuesense.com",
        "username": "admin",
        "mobile": "+19876543210",
        "gender": "Other",
        "dob": "1985-06-15",
        "password_hash": admin_hash,
        "role": "admin",
        "is_verified": True,
        "is_active": True,
        "organization_id": org1_id,
        "created_at": now,
        "updated_at": now
    })
    admin_id = str(admin_res.inserted_id)

    staff_res = await db.users.insert_one({
        "first_name": "Dr. Sarah",
        "last_name": "Smith",
        "email": "staff@queuesense.com",
        "username": "staff_dr_smith",
        "mobile": "+19876543211",
        "gender": "Female",
        "dob": "1990-03-22",
        "password_hash": admin_hash,
        "role": "staff",
        "is_verified": True,
        "is_active": True,
        "organization_id": org1_id,
        "created_at": now,
        "updated_at": now
    })
    staff_id = str(staff_res.inserted_id)

    customer_res = await db.users.insert_one({
        "first_name": "John",
        "last_name": "Doe",
        "email": "patient@queuesense.com",
        "username": "john_doe",
        "mobile": "+19876543212",
        "gender": "Male",
        "dob": "1995-10-12",
        "password_hash": admin_hash,
        "role": "customer",
        "is_verified": True,
        "is_active": True,
        "created_at": now,
        "updated_at": now
    })
    customer_id = str(customer_res.inserted_id)

    print("Seeding Sample Appointments and Live Queue Tokens for Today...")
    gen_dept_id = dept_map["General Medicine"]
    gen_service_id = service_map["Routine Health Consultation"]
    
    # 1. First completed token (to establish real service duration metrics)
    c1_time = now - timedelta(hours=2)
    app1_res = await db.appointments.insert_one({
        "user_id": customer_id,
        "customer_name": "David Miller",
        "customer_mobile": "+19876543001",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": gen_dept_id,
        "department_name": "General Medicine",
        "service_id": gen_service_id,
        "service_name": "Routine Health Consultation",
        "appointment_date": today_str,
        "time_slot": "09:00 - 09:15",
        "token_number": "GM-001",
        "status": "completed",
        "created_at": c1_time,
        "updated_at": c1_time + timedelta(minutes=15)
    })
    await db.queue_tokens.insert_one({
        "token_number": "GM-001",
        "sequence_number": 1,
        "appointment_id": str(app1_res.inserted_id),
        "user_id": customer_id,
        "customer_name": "David Miller",
        "customer_mobile": "+19876543001",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": gen_dept_id,
        "department_name": "General Medicine",
        "service_id": gen_service_id,
        "service_name": "Routine Health Consultation",
        "appointment_date": today_str,
        "appointment_time": "09:00 - 09:15",
        "status": "completed",
        "called_at": c1_time + timedelta(minutes=2),
        "started_at": c1_time + timedelta(minutes=3),
        "completed_at": c1_time + timedelta(minutes=18),
        "actual_duration_seconds": 900,
        "served_by_user_id": staff_id,
        "created_at": c1_time,
        "updated_at": c1_time + timedelta(minutes=18)
    })

    # 2. Currently Called / In Service token
    c2_time = now - timedelta(minutes=10)
    app2_res = await db.appointments.insert_one({
        "user_id": customer_id,
        "customer_name": "Emily Watson",
        "customer_mobile": "+19876543002",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": gen_dept_id,
        "department_name": "General Medicine",
        "service_id": gen_service_id,
        "service_name": "Routine Health Consultation",
        "appointment_date": today_str,
        "time_slot": "09:30 - 09:45",
        "token_number": "GM-002",
        "status": "in_service",
        "created_at": c2_time,
        "updated_at": now
    })
    await db.queue_tokens.insert_one({
        "token_number": "GM-002",
        "sequence_number": 2,
        "appointment_id": str(app2_res.inserted_id),
        "user_id": customer_id,
        "customer_name": "Emily Watson",
        "customer_mobile": "+19876543002",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": gen_dept_id,
        "department_name": "General Medicine",
        "service_id": gen_service_id,
        "service_name": "Routine Health Consultation",
        "appointment_date": today_str,
        "appointment_time": "09:30 - 09:45",
        "status": "in_service",
        "called_at": now - timedelta(minutes=6),
        "started_at": now - timedelta(minutes=4),
        "completed_at": None,
        "served_by_user_id": staff_id,
        "created_at": c2_time,
        "updated_at": now
    })

    # 3. Active Waiting token assigned to our customer `john_doe`!
    c3_time = now - timedelta(minutes=5)
    app3_res = await db.appointments.insert_one({
        "user_id": customer_id,
        "customer_name": "John Doe",
        "customer_mobile": "+19876543212",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": gen_dept_id,
        "department_name": "General Medicine",
        "service_id": gen_service_id,
        "service_name": "Routine Health Consultation",
        "appointment_date": today_str,
        "time_slot": "10:00 - 10:15",
        "token_number": "GM-003",
        "status": "booked",
        "notes": "Annual physical and blood pressure check.",
        "created_at": c3_time,
        "updated_at": c3_time
    })
    token3_res = await db.queue_tokens.insert_one({
        "token_number": "GM-003",
        "sequence_number": 3,
        "appointment_id": str(app3_res.inserted_id),
        "user_id": customer_id,
        "customer_name": "John Doe",
        "customer_mobile": "+19876543212",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": gen_dept_id,
        "department_name": "General Medicine",
        "service_id": gen_service_id,
        "service_name": "Routine Health Consultation",
        "appointment_date": today_str,
        "appointment_time": "10:00 - 10:15",
        "status": "waiting",
        "called_at": None,
        "started_at": None,
        "completed_at": None,
        "served_by_user_id": None,
        "created_at": c3_time,
        "updated_at": c3_time
    })
    # Link token id
    await db.appointments.update_one(
        {"_id": app3_res.inserted_id},
        {"$set": {"token_id": str(token3_res.inserted_id)}}
    )

    # 4. Another waiting token in Cardiology
    card_dept_id = dept_map["Cardiology"]
    card_service_id = service_map["Standard ECG & Vitals Evaluation"]
    app4_res = await db.appointments.insert_one({
        "user_id": customer_id,
        "customer_name": "Robert Chen",
        "customer_mobile": "+19876543004",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": card_dept_id,
        "department_name": "Cardiology",
        "service_id": card_service_id,
        "service_name": "Standard ECG & Vitals Evaluation",
        "appointment_date": today_str,
        "time_slot": "10:30 - 10:50",
        "token_number": "CD-001",
        "status": "booked",
        "created_at": now,
        "updated_at": now
    })
    t4 = await db.queue_tokens.insert_one({
        "token_number": "CD-001",
        "sequence_number": 1,
        "appointment_id": str(app4_res.inserted_id),
        "user_id": customer_id,
        "customer_name": "Robert Chen",
        "customer_mobile": "+19876543004",
        "organization_id": org1_id,
        "organization_name": "Apex Memorial Hospital",
        "department_id": card_dept_id,
        "department_name": "Cardiology",
        "service_id": card_service_id,
        "service_name": "Standard ECG & Vitals Evaluation",
        "appointment_date": today_str,
        "appointment_time": "10:30 - 10:50",
        "status": "waiting",
        "created_at": now,
        "updated_at": now
    })
    await db.appointments.update_one({"_id": app4_res.inserted_id}, {"$set": {"token_id": str(t4.inserted_id)}})

    print("\nDatabase seeded successfully!")
    print("--------------------------------------------------")
    print(f"Admin Account:    admin@queuesense.com / Password@123")
    print(f"Staff Account:    staff@queuesense.com / Password@123")
    print(f"Customer Account: patient@queuesense.com / Password@123")
    print(f"Active Token for John Doe: GM-003 (General Medicine)")
    print("--------------------------------------------------")
    client.close()

if __name__ == "__main__":
    asyncio.run(seed_database())

