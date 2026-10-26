"""
Audio Classification API Routes
=================================
Provides endpoints for real .wav file upload and ML classification.
"""

import os
import uuid
import logging
import tempfile
from fastapi import APIRouter, UploadFile, File, HTTPException

from app.services.audio_classifier import classify_audio_file, get_classifier

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/audio", tags=["audio"])

# Upload directory
UPLOAD_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))),
    "uploads"
)
os.makedirs(UPLOAD_DIR, exist_ok=True)


@router.post("/classify")
async def classify_uploaded_audio(file: UploadFile = File(...)):
    """
    Upload a .wav audio file for real-time ML classification.
    
    The pipeline:
      1. Accepts .wav file upload (multipart/form-data)
      2. Saves to temp storage
      3. Runs librosa FFT + Mel-spectrogram feature extraction
      4. Classifies via Random Forest
      5. Returns threat type, confidence, embedding, and spectral analysis
    """
    # Validate file type
    if not file.filename or not file.filename.lower().endswith(('.wav', '.mp3', '.ogg', '.flac')):
        raise HTTPException(
            status_code=400,
            detail="Unsupported file format. Please upload a .wav, .mp3, .ogg, or .flac file."
        )
    
    # Validate file size (max 10MB)
    contents = await file.read()
    if len(contents) > 10 * 1024 * 1024:
        raise HTTPException(
            status_code=400,
            detail="File too large. Maximum size is 10MB."
        )
    
    # Save to temp file
    file_id = str(uuid.uuid4())[:8]
    safe_filename = f"{file_id}_{file.filename}"
    filepath = os.path.join(UPLOAD_DIR, safe_filename)
    
    try:
        with open(filepath, "wb") as f:
            f.write(contents)
        
        # Run the real ML classification pipeline
        result = await classify_audio_file(filepath)
        
        result["file_info"] = {
            "filename": file.filename,
            "size_bytes": len(contents),
            "file_id": file_id,
        }
        
        logger.info(
            f"Classified '{file.filename}' as {result['threat_type']} "
            f"with confidence {result['confidence']:.2%}"
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Classification failed for '{file.filename}': {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Classification failed: {str(e)}"
        )
    finally:
        # Clean up uploaded file
        if os.path.exists(filepath):
            os.remove(filepath)


@router.get("/model/info")
async def get_model_info():
    """
    Reports which model is actually active. "ONLINE" means real YAMNet is loaded;
    "FALLBACK" means the signal heuristic is being used instead.
    """
    try:
        classifier, _ = get_classifier()
        classifier._load_model()
        real_model = bool(classifier._is_loaded)
        return {
            "model_type": "Google YAMNet (TensorFlow Hub)",
            "model_url": "https://tfhub.dev/google/yamnet/1",
            "sample_rate_hz": 16000,
            "input_format": "16kHz Mono Float32",
            "audioset_classes_count": len(classifier._class_names),
            "mapped_threat_categories": ["CHAINSAW", "GUNSHOT", "ILLEGAL_VESSEL", "VEHICLE_ENGINE", "BLAST_FISHING", "UNKNOWN"],
            "embedding_dimension": 128,
            "status": "ONLINE" if real_model else "FALLBACK",
            "using_real_yamnet": real_model,
            "load_error": classifier.load_error,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Model not available: {str(e)}")
