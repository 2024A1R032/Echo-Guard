"""
Live Field Simulation API Routes
===================================
Endpoints for the interactive field simulation demo.
Serves pre-built audio scenario clips and triggers live classification.
"""

import logging
import base64
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from app.services.audio_generator import generate_scenario_audio, list_scenarios, SCENARIOS
from app.services.audio_classifier import classify_audio_file, get_yamnet_classifier
from app.services.inference import generate_synthetic_acoustic_embedding
from app.services.forensics import analyze_acoustic_forensics
from app.services.clustering import cluster_manager

import numpy as np
import tempfile
import os

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/simulation", tags=["simulation"])


@router.get("/scenarios")
async def get_scenarios():
    """List all available field simulation scenarios."""
    return {"scenarios": list_scenarios()}


@router.get("/scenarios/{scenario_id}/audio")
async def get_scenario_audio(scenario_id: str):
    """
    Generate and return WAV audio bytes for a scenario.
    Returns the raw WAV file as audio/wav.
    """
    try:
        result = generate_scenario_audio(scenario_id)
        return Response(
            content=result["wav_bytes"],
            media_type="audio/wav",
            headers={
                "Content-Disposition": f'inline; filename="{scenario_id}.wav"',
                "X-Duration-Sec": str(result["duration_sec"]),
                "X-Sample-Rate": str(result["sample_rate"]),
                "X-Threat-Type": result["scenario"]["threat_type"],
            }
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/scenarios/{scenario_id}/preview")
async def get_scenario_preview(scenario_id: str):
    """
    Return scenario metadata + a waveform preview (200 data points) 
    + base64-encoded WAV for in-browser playback.
    """
    try:
        result = generate_scenario_audio(scenario_id)
        wav_b64 = base64.b64encode(result["wav_bytes"]).decode("ascii")
        return {
            "scenario_id": result["scenario_id"],
            "scenario": result["scenario"],
            "duration_sec": result["duration_sec"],
            "sample_rate": result["sample_rate"],
            "waveform_preview": result["waveform_preview"],
            "wav_base64": wav_b64,
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/scenarios/{scenario_id}/classify")
async def classify_scenario(scenario_id: str):
    """
    Generate the scenario audio, write to a temp file,
    run it through the full YAMNet classification pipeline,
    and return the ML analysis results.
    """
    try:
        result = generate_scenario_audio(scenario_id)
        scenario = result["scenario"]

        # Write WAV to temp file for the classifier
        tmp_path = None
        try:
            with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
                f.write(result["wav_bytes"])
                tmp_path = f.name

            classification = await classify_audio_file(tmp_path)
        finally:
            if tmp_path and os.path.exists(tmp_path):
                os.remove(tmp_path)

        # Run forensics analysis
        embedding = classification.get("embedding", generate_synthetic_acoustic_embedding(scenario["threat_type"]))
        forensics = analyze_acoustic_forensics(
            classification.get("threat_type", scenario["threat_type"]),
            classification.get("confidence", 0.90),
            embedding
        )

        # Build cluster context
        alert_dict = {
            "id": f"sim-{scenario_id}",
            "device_id": scenario["node_id"],
            "threat_type": classification.get("threat_type", scenario["threat_type"]),
            "latitude": scenario["location"]["lat"],
            "longitude": scenario["location"]["lon"],
            "confidence_score": classification.get("confidence", 0.90),
            "timestamp": "simulation",
        }
        cluster = cluster_manager.process_alert(alert_dict)

        return {
            "scenario_id": scenario_id,
            "scenario": scenario,
            "classification": classification,
            "forensics": forensics,
            "cluster": cluster,
            "waveform_preview": result["waveform_preview"],
        }
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        logger.error(f"Classification failed for scenario {scenario_id}: {e}")
        raise HTTPException(status_code=500, detail=f"Classification error: {str(e)}")
