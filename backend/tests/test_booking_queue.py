import pytest
from datetime import datetime, timezone
from backend.core.database import get_database
from backend.services.queue_service import QueueService
from backend.services.appointment_service import AppointmentService

@pytest.mark.asyncio
async def test_queue_position_and_transitions():
    db = get_database()
    token = await db.queue_tokens.find_one({"token_number": "GM-003"})
    assert token is not None
    assert token["status"] == "waiting"
    
    pos = await QueueService.get_queue_position(str(token["_id"]))
    assert pos["token_number"] == "GM-003"
    assert pos["position"] >= 1
    assert "currently_serving" in pos

@pytest.mark.asyncio
async def test_service_availability_slots():
    db = get_database()
    service = await db.services.find_one({"name": "Routine Health Consultation"})
    assert service is not None
    
    today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    avail = await AppointmentService.get_service_availability(str(service["_id"]), today_str)
    assert avail["service_id"] == str(service["_id"])
    assert len(avail["slots"]) > 0
    assert "available" in avail["slots"][0]
