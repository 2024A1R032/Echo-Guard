import io
import pytest
import numpy as np
import soundfile as sf
from httpx import AsyncClient


@pytest.mark.asyncio
async def test_audio_model_info(async_client: AsyncClient):
    response = await async_client.get("/api/v1/audio/model/info")
    assert response.status_code == 200
    data = response.json()
    assert "YAMNet" in data["model_type"]
    assert data["sample_rate_hz"] == 16000
    assert data["embedding_dimension"] == 128


@pytest.mark.asyncio
async def test_classify_uploaded_audio_endpoint(async_client: AsyncClient):
    # Generate in-memory WAV file at 16kHz
    sr = 16000
    t = np.linspace(0, 1.0, sr, endpoint=False)
    waveform = (0.5 * np.sin(2 * np.pi * 450 * t)).astype(np.float32)

    buf = io.BytesIO()
    sf.write(buf, waveform, sr, format="WAV")
    buf.seek(0)

    files = {"file": ("test_acoustic.wav", buf, "audio/wav")}
    response = await async_client.post("/api/v1/audio/classify", files=files)
    assert response.status_code == 200
    data = response.json()
    assert "threat_type" in data
    assert "confidence" in data
    assert "embedding" in data
    assert len(data["embedding"]) == 128
    assert "file_info" in data
