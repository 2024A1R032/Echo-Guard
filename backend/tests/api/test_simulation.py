import io
import json
import uuid
from datetime import datetime, timezone
from unittest.mock import AsyncMock

import numpy as np
import pytest
import soundfile as sf
from httpx import AsyncClient

from app.api.routes import simulation as simulation_route
from app.services.audio_classifier import AUDIOSET_CLASSES_SAMPLE, YAMNetClassifier
from tests.services.test_audio_simulation import NODES, chainsaw_like

SR = 16000


@pytest.fixture(autouse=True)
def fallback_classifier(monkeypatch):
    classifier = YAMNetClassifier()
    monkeypatch.setattr(classifier, "_load_model", lambda: None)
    classifier._class_names = AUDIOSET_CLASSES_SAMPLE
    classifier._is_loaded = False
    monkeypatch.setattr(simulation_route, "get_yamnet_classifier", lambda: classifier)
    return classifier


@pytest.fixture
def saved_alerts(mock_db_session: AsyncMock):
    added = []
    mock_db_session.add.side_effect = lambda obj: added.append(obj)

    async def mock_refresh(instance):
        instance.id = uuid.uuid4()
        instance.timestamp = datetime.now(timezone.utc)

    mock_db_session.refresh.side_effect = mock_refresh
    return added


def wav_bytes(waveform):
    buffer = io.BytesIO()
    sf.write(buffer, waveform, SR, format="WAV")
    buffer.seek(0)
    return buffer


def form(**overrides):
    data = {
        "nodes": json.dumps(NODES),
        "source_lat": "-3.4653",
        "source_lon": "-62.2162",
        "loudness": "normal",
    }
    data.update(overrides)
    return data


@pytest.mark.asyncio
async def test_drop_detects_and_stores_alerts(async_client: AsyncClient, saved_alerts):
    files = {"file": ("chainsaw.wav", wav_bytes(chainsaw_like()), "audio/wav")}
    response = await async_client.post("/api/v1/simulate/audio-drop", files=files, data=form())
    assert response.status_code == 200
    body = response.json()

    assert body["nearest_node"] == "NEAR"
    assert body["strongest_node"] == "NEAR"
    assert body["alerts_sent"] == len(saved_alerts) >= 1
    near = next(n for n in body["nodes"] if n["id"] == "NEAR")
    assert near["heard"] and near["alert_id"]
    far = next(n for n in body["nodes"] if n["id"] == "FAR")
    assert far["alert_id"] is None
    assert saved_alerts[0].threat_type == "CHAINSAW"
    assert len(saved_alerts[0].embedding) == 128
    assert body["model_is_real_yamnet"] is False


@pytest.mark.asyncio
async def test_preview_does_not_store_alerts(async_client: AsyncClient, saved_alerts):
    files = {"file": ("chainsaw.wav", wav_bytes(chainsaw_like()), "audio/wav")}
    response = await async_client.post("/api/v1/simulate/audio-drop", files=files, data=form(send_alerts="false"))
    assert response.status_code == 200
    assert response.json()["alerts_sent"] == 0
    assert saved_alerts == []


@pytest.mark.asyncio
async def test_unsupported_extension_rejected(async_client: AsyncClient):
    files = {"file": ("notes.txt", io.BytesIO(b"hello"), "text/plain")}
    response = await async_client.post("/api/v1/simulate/audio-drop", files=files, data=form())
    assert response.status_code == 400


@pytest.mark.asyncio
async def test_corrupt_audio_gives_clear_error(async_client: AsyncClient):
    files = {"file": ("bad.mp3", io.BytesIO(b"not audio"), "audio/mpeg")}
    response = await async_client.post("/api/v1/simulate/audio-drop", files=files, data=form())
    assert response.status_code == 400
    assert response.json()["detail"]


@pytest.mark.asyncio
async def test_bad_nodes_and_loudness_rejected(async_client: AsyncClient):
    files = lambda: {"file": ("c.wav", wav_bytes(chainsaw_like(2.0)), "audio/wav")}
    bad_nodes = await async_client.post("/api/v1/simulate/audio-drop", files=files(), data=form(nodes="not json"))
    assert bad_nodes.status_code == 422
    no_nodes = await async_client.post("/api/v1/simulate/audio-drop", files=files(), data=form(nodes="[]"))
    assert no_nodes.status_code == 422
    bad_loudness = await async_client.post("/api/v1/simulate/audio-drop", files=files(), data=form(loudness="deafening"))
    assert bad_loudness.status_code == 422


@pytest.mark.asyncio
async def test_model_info_reports_fallback_honestly(async_client: AsyncClient, monkeypatch):
    from app.api.routes import audio as audio_route
    classifier = YAMNetClassifier()
    monkeypatch.setattr(classifier, "_load_model", lambda: None)
    classifier._class_names = AUDIOSET_CLASSES_SAMPLE
    classifier._is_loaded = False
    monkeypatch.setattr(audio_route, "get_classifier", lambda: (classifier, None))
    response = await async_client.get("/api/v1/audio/model/info")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "FALLBACK"
    assert data["using_real_yamnet"] is False


@pytest.mark.asyncio
async def test_coverage_endpoint_lists_ranges(async_client: AsyncClient):
    response = await async_client.get("/api/v1/simulate/coverage")
    assert response.status_code == 200
    radii = response.json()["detection_radius_m"]
    assert radii["quiet"] < radii["normal"] < radii["loud"]
