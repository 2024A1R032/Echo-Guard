import pytest
from httpx import AsyncClient
from app.services.clustering import cluster_manager, haversine_distance_meters
from app.services.forensics import analyze_acoustic_forensics

def test_haversine_distance():
    # Distance between two close points in Amazon reserve (~111m per 0.001 deg lat)
    d = haversine_distance_meters(-3.4650, -62.2150, -3.4660, -62.2150)
    assert 100.0 < d < 120.0

def test_forensics_analysis():
    forensics = analyze_acoustic_forensics("CHAINSAW", 0.95)
    assert forensics["threat_classification"] == "CHAINSAW"
    assert 210 <= forensics["fundamental_frequency_hz"] <= 340
    assert len(forensics["detected_harmonics_hz"]) > 0
    assert "Husqvarna" in forensics["reference_benchmark_match"] or "Stihl" in forensics["reference_benchmark_match"]
    assert "why_not_wildlife" in forensics["explainable_reasons"]

@pytest.mark.asyncio
async def test_get_incidents_api(async_client: AsyncClient):
    response = await async_client.get("/api/v1/incidents/")
    assert response.status_code == 200
    data = response.json()
    assert "metrics" in data
    assert "clusters" in data

@pytest.mark.asyncio
async def test_verify_forensics_api(async_client: AsyncClient):
    payload = {
        "threat_type": "GUNSHOT",
        "confidence_score": 0.92
    }
    response = await async_client.post("/api/v1/incidents/verify-forensics", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["threat_classification"] == "GUNSHOT"
    assert data["rise_time_ms"] < 10.0
    assert "Ballistic" in data["physical_source_mechanism"]
