import pytest
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient

from app.models.threat_alert import ThreatAlert
from app.services.inference import analyze_threat_signature, generate_synthetic_acoustic_embedding

@pytest.mark.asyncio
async def test_health_check(async_client: AsyncClient):
    response = await async_client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "ok"

@pytest.mark.asyncio
async def test_create_telemetry_alert_basic(async_client: AsyncClient, mock_db_session: AsyncMock):
    # Setup mock behavior
    mock_db_session.add.return_value = None
    mock_db_session.commit.return_value = None
    
    async def mock_refresh(instance):
        instance.id = uuid.uuid4()
        instance.timestamp = datetime.now(timezone.utc)
    
    mock_db_session.refresh.side_effect = mock_refresh

    payload = {
        "latitude": 34.0522,
        "longitude": -118.2437,
        "confidence_score": 0.95
    }

    response = await async_client.post("/api/v1/telemetry/", json=payload)
    
    assert response.status_code == 201
    data = response.json()
    assert data["latitude"] == 34.0522
    assert data["longitude"] == -118.2437
    assert data["confidence_score"] == 0.95
    assert data["device_id"] == "NODE-001"
    assert data["threat_type"] == "UNKNOWN"
    assert "id" in data
    assert "timestamp" in data

@pytest.mark.asyncio
async def test_create_telemetry_alert_with_bioacoustics(async_client: AsyncClient, mock_db_session: AsyncMock):
    mock_db_session.add.return_value = None
    mock_db_session.commit.return_value = None
    
    async def mock_refresh(instance):
        instance.id = uuid.uuid4()
        instance.timestamp = datetime.now(timezone.utc)
    
    mock_db_session.refresh.side_effect = mock_refresh

    # 128-dimensional synthetic embedding
    custom_embedding = [0.01 * (i % 10) for i in range(128)]
    payload = {
        "device_id": "EDGE-SENSOR-99",
        "threat_type": "CHAINSAW",
        "latitude": -3.4653,
        "longitude": -62.2159,
        "confidence_score": 0.88,
        "embedding": custom_embedding
    }

    response = await async_client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 201
    data = response.json()
    assert data["device_id"] == "EDGE-SENSOR-99"
    assert data["threat_type"] == "CHAINSAW"
    assert len(data["embedding"]) == 128

@pytest.mark.asyncio
async def test_create_telemetry_alert_invalid_score(async_client: AsyncClient):
    payload = {
        "latitude": 34.0522,
        "longitude": -118.2437,
        "confidence_score": 1.5 # Invalid, must be <= 1.0
    }

    response = await async_client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_create_telemetry_alert_invalid_coordinates(async_client: AsyncClient):
    payload = {
        "latitude": 195.0, # Invalid latitude > 90
        "longitude": -118.2437,
        "confidence_score": 0.9
    }

    response = await async_client.post("/api/v1/telemetry/", json=payload)
    assert response.status_code == 422

@pytest.mark.asyncio
async def test_get_recent_alerts(async_client: AsyncClient, mock_db_session: AsyncMock):
    # Mock query result
    fake_alert = ThreatAlert(
        id=uuid.uuid4(),
        device_id="NODE-001",
        threat_type="GUNSHOT",
        latitude=1.23,
        longitude=4.56,
        confidence_score=0.92,
        timestamp=datetime.now(timezone.utc),
        embedding=None
    )
    
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [fake_alert]
    mock_db_session.execute.return_value = mock_result

    response = await async_client.get("/api/v1/telemetry/?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["threat_type"] == "GUNSHOT"

@pytest.mark.asyncio
async def test_search_similar_threats(async_client: AsyncClient, mock_db_session: AsyncMock):
    fake_alert = ThreatAlert(
        id=uuid.uuid4(),
        device_id="NODE-002",
        threat_type="VEHICLE",
        latitude=1.23,
        longitude=4.56,
        confidence_score=0.85,
        timestamp=datetime.now(timezone.utc),
        embedding=[0.05] * 128
    )
    
    mock_result = MagicMock()
    # execute returns rows with (ThreatAlert, distance)
    mock_result.all.return_value = [(fake_alert, 0.082341)]
    mock_db_session.execute.return_value = mock_result

    search_payload = {
        "query_embedding": [0.05] * 128,
        "limit": 5
    }

    response = await async_client.post("/api/v1/telemetry/search", json=search_payload)
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 1
    assert data[0]["threat_type"] == "VEHICLE"
    assert data[0]["distance"] == 0.082341

@pytest.mark.asyncio
async def test_inference_service():
    is_threat = await analyze_threat_signature(10.0, 20.0, 0.95, "CHAINSAW")
    assert is_threat is True
    
    low_threat = await analyze_threat_signature(10.0, 20.0, 0.2, "WILDLIFE")
    assert low_threat is False

    embedding = generate_synthetic_acoustic_embedding("CHAINSAW")
    assert len(embedding) == 128
    # Should be unit normalized
    import math
    norm = math.sqrt(sum(x * x for x in embedding))
    assert abs(norm - 1.0) < 1e-4

def test_websocket_telemetry_feed():
    from starlette.testclient import TestClient
    from app.main import app
    client = TestClient(app)
    with client.websocket_connect("/api/v1/telemetry/ws") as websocket:
        # Verify connection stays active
        websocket.send_text("ping")


