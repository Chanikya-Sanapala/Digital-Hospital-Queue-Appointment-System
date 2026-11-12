from typing import Dict, List, Any
from fastapi import WebSocket
import json
import logging

logger = logging.getLogger("queuesense.ws")

class WebSocketManager:
    def __init__(self):
        # Map: "org_id:dept_id" -> List[WebSocket]
        self.active_rooms: Dict[str, List[WebSocket]] = {}
        # Map: "user:user_id" -> List[WebSocket]
        self.user_rooms: Dict[str, List[WebSocket]] = {}

    def _room_key(self, organization_id: str, department_id: str) -> str:
        return f"{organization_id}:{department_id}"

    async def connect(self, websocket: WebSocket, organization_id: str, department_id: str):
        await websocket.accept()
        key = self._room_key(organization_id, department_id)
        if key not in self.active_rooms:
            self.active_rooms[key] = []
        self.active_rooms[key].append(websocket)
        logger.info(f"WS client connected to room {key}. Room size: {len(self.active_rooms[key])}")

    def disconnect(self, websocket: WebSocket, organization_id: str, department_id: str):
        key = self._room_key(organization_id, department_id)
        if key in self.active_rooms:
            if websocket in self.active_rooms[key]:
                self.active_rooms[key].remove(websocket)
            if not self.active_rooms[key]:
                del self.active_rooms[key]
        logger.info(f"WS client disconnected from room {key}.")

    async def broadcast_to_room(self, organization_id: str, department_id: str, event_type: str, data: Any):
        key = self._room_key(organization_id, department_id)
        message = json.dumps({
            "event": event_type,
            "organization_id": organization_id,
            "department_id": department_id,
            "data": data
        })
        if key in self.active_rooms:
            dead_connections = []
            for connection in self.active_rooms[key]:
                try:
                    await connection.send_text(message)
                except Exception as e:
                    logger.warning(f"Failed to send to client in {key}: {e}")
                    dead_connections.append(connection)
            for dead in dead_connections:
                if dead in self.active_rooms[key]:
                    self.active_rooms[key].remove(dead)

ws_manager = WebSocketManager()

