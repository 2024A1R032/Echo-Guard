import logging
import hashlib
import math
from typing import List, Optional

logger = logging.getLogger(__name__)

async def analyze_threat_signature(
    latitude: float, 
    longitude: float, 
    confidence_score: float,
    threat_type: str = "UNKNOWN"
) -> bool:
    """
    Bioacoustic threat signature verification service.
    Simulates external ML service validating acoustic telemetry.
    """
    logger.info(
        f"Validating bioacoustic signature for {threat_type} at ({latitude}, {longitude}) "
        f"with confidence {confidence_score:.2f}"
    )
    # Threshold for verified threat
    return confidence_score >= 0.5

def generate_synthetic_acoustic_embedding(threat_type: str, seed_factor: float = 1.0) -> List[float]:
    """
    Generates a deterministic 128-dimensional unit normalized bioacoustic feature vector
    used when edge nodes report raw acoustic tags without precomputed embeddings.
    """
    # Deterministic seed using threat type
    base_hash = int(hashlib.md5(threat_type.encode()).hexdigest(), 16)
    vector = []
    for i in range(128):
        val = math.sin(base_hash + i * seed_factor) * math.cos(i * 0.1)
        vector.append(round(val, 6))
    
    # Normalize to unit length for cosine similarity
    norm = math.sqrt(sum(x * x for x in vector)) or 1.0
    return [round(x / norm, 6) for x in vector]

