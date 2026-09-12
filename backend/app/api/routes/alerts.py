from fastapi import APIRouter, Depends, HTTPException, status, WebSocket, WebSocketDisconnect
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List
import json

from app.db.database import get_db
from app.models.alert import ThreatAlert
from app.schemas.payload import (
    ThreatAlertCreate, 
    ThreatAlertResponse, 
    ThreatAlertSearchRequest, 
    ThreatAlertSearchResult
)
from app.services.inference import analyze_threat_signature, generate_synthetic_acoustic_embedding

router = APIRouter()

class TelemetryConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast_alert(self, alert_data: dict):
        for connection in list(self.active_connections):
            try:
                await connection.send_json(alert_data)
            except Exception:
                self.disconnect(connection)

manager = TelemetryConnectionManager()

@router.post("/", response_model=ThreatAlertResponse, status_code=status.HTTP_201_CREATED)
async def create_telemetry_alert(
    alert_in: ThreatAlertCreate,
    db: AsyncSession = Depends(get_db)
):
    """
    Receive telemetry from C++ edge nodes, validate acoustic signature, and persist to database.
    """
    # 1. External ML Inference logic (Business logic)
    await analyze_threat_signature(
        latitude=alert_in.latitude, 
        longitude=alert_in.longitude, 
        confidence_score=alert_in.confidence_score,
        threat_type=alert_in.threat_type
    )

    # 2. Acoustic embedding handling
    embedding = alert_in.embedding
    if embedding is None and alert_in.threat_type != "UNKNOWN":
        embedding = generate_synthetic_acoustic_embedding(alert_in.threat_type)

    # 3. Database Model interaction (Data layer)
    new_alert = ThreatAlert(
        device_id=alert_in.device_id,
        threat_type=alert_in.threat_type,
        latitude=alert_in.latitude,
        longitude=alert_in.longitude,
        confidence_score=alert_in.confidence_score,
        embedding=embedding
    )
    
    db.add(new_alert)
    await db.commit()
    await db.refresh(new_alert)
    
    # 4. Broadcast to live connected clients/dashboards
    alert_response = ThreatAlertResponse.model_validate(new_alert)
    broadcast_data = json.loads(alert_response.model_dump_json())
    await manager.broadcast_alert(broadcast_data)

    return new_alert

@router.get("/", response_model=List[ThreatAlertResponse])
async def get_recent_alerts(
    limit: int = 100,
    db: AsyncSession = Depends(get_db)
):
    """
    Retrieve latest threat alerts ordered by timestamp descending.
    """
    stmt = select(ThreatAlert).order_by(ThreatAlert.timestamp.desc()).limit(limit)
    result = await db.execute(stmt)
    alerts = result.scalars().all()
    return alerts

@router.post("/search", response_model=List[ThreatAlertSearchResult])
async def search_similar_threats(
    query_in: ThreatAlertSearchRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Perform pgvector cosine similarity search against stored acoustic threat embeddings.
    """
    cosine_distance = ThreatAlert.embedding.cosine_distance(query_in.query_embedding).label("distance")
    stmt = (
        select(ThreatAlert, cosine_distance)
        .where(ThreatAlert.embedding.is_not(None))
        .order_by(cosine_distance)
        .limit(query_in.limit)
    )
    
    result = await db.execute(stmt)
    matches = result.all()
    
    search_results = []
    for alert, dist in matches:
        data = ThreatAlertResponse.model_validate(alert).model_dump()
        data["distance"] = round(dist, 6) if dist is not None else None
        search_results.append(data)
        
    return search_results

@router.websocket("/ws")
async def websocket_telemetry_feed(websocket: WebSocket):
    """
    WebSocket endpoint for real-time live alert streaming to React dashboard.
    """
    await manager.connect(websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
