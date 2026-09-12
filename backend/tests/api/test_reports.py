import pytest
import uuid
from unittest.mock import AsyncMock, MagicMock
from httpx import AsyncClient

from app.models.alert import ThreatAlert

@pytest.mark.asyncio
async def test_generate_incident_report(async_client: AsyncClient, mock_db_session: AsyncMock):
    payload = {
        "threat_type": "CHAINSAW",
        "device_id": "NODE-001",
        "confidence_score": 0.94,
        "latitude": -3.4653,
        "longitude": -62.2159
    }
    
    response = await async_client.post("/api/v1/reports/generate", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["threat_type"] == "CHAINSAW"
    assert data["device_id"] == "NODE-001"
    assert "report_id" in data
    assert "threat_assessment" in data
    assert "ranger_dispatch" in data
    assert data["ranger_dispatch"]["ranger_unit"] != ""
    assert data["status"] == "ACTIVE_DISPATCH"

@pytest.mark.asyncio
async def test_get_report_by_alert_id(async_client: AsyncClient, mock_db_session: AsyncMock):
    fake_alert_id = str(uuid.uuid4())
    mock_result = MagicMock()
    mock_result.scalar_one_or_none.return_value = None
    mock_db_session.execute.return_value = mock_result

    response = await async_client.get(f"/api/v1/reports/{fake_alert_id}")
    assert response.status_code == 200
    data = response.json()
    assert "report_id" in data
    assert data["status"] == "ACTIVE_DISPATCH"
