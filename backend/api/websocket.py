from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.services.websocket_manager import ws_manager
import logging

logger = logging.getLogger("queuesense.websocket")
router = APIRouter(tags=["WebSocket"])

@router.websocket("/ws/queue/{organization_id}/{department_id}")
async def queue_websocket_endpoint(websocket: WebSocket, organization_id: str, department_id: str):
    await ws_manager.connect(websocket, organization_id, department_id)
    try:
        while True:
            # Keep connection open and receive optional ping messages
            data = await websocket.receive_text()
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_manager.disconnect(websocket, organization_id, department_id)
    except Exception as e:
        logger.warning(f"WebSocket error: {e}")
        ws_manager.disconnect(websocket, organization_id, department_id)

