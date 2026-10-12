import os
import pytest
import numpy as np
import tempfile
import soundfile as sf
from app.services.audio_classifier import (
    classify_audio_file,
    get_yamnet_classifier,
    TARGET_SR,
    THREAT_CLASS_MAPPING,
)

@pytest.mark.asyncio
async def test_yamnet_classifier_initialization():
    classifier = get_yamnet_classifier()
    assert classifier is not None
    assert len(classifier._class_names) > 0


@pytest.mark.asyncio
async def test_yamnet_inference_waveform():
    classifier = get_yamnet_classifier()
    # 1.5s synthetic waveform at 16kHz
    duration = 1.5
    t = np.linspace(0, duration, int(TARGET_SR * duration), endpoint=False)
    # 450Hz tone with harmonics (chainsaw-like)
    waveform = 0.6 * np.sin(2 * np.pi * 450 * t) + 0.3 * np.sin(2 * np.pi * 900 * t)

    result = classifier.predict(waveform)
    assert "threat_type" in result
    assert "confidence" in result
    assert "embedding" in result
    assert len(result["embedding"]) == 128  # Must match pgvector 128-dim schema
    assert "spectral_analysis" in result
    assert result["pipeline"]["sample_rate_hz"] == 16000


@pytest.mark.asyncio
async def test_classify_audio_file_wav():
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
        wav_path = f.name

    try:
        t = np.linspace(0, 1.0, TARGET_SR, endpoint=False)
        waveform = 0.5 * np.sin(2 * np.pi * 1200 * t)
        sf.write(wav_path, waveform.astype(np.float32), TARGET_SR)

        result = await classify_audio_file(wav_path)
        assert "threat_type" in result
        assert "confidence" in result
        assert "embedding" in result
        assert len(result["embedding"]) == 128
        assert "spectral_analysis" in result
    finally:
        if os.path.exists(wav_path):
            os.remove(wav_path)
