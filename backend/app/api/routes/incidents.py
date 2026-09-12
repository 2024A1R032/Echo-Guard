from fastapi import APIRouter, HTTPException, status
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field

from app.services.clustering import cluster_manager
from app.services.forensics import analyze_acoustic_forensics

router = APIRouter()

class ForensicVerificationRequest(BaseModel):
    threat_type: str = Field(..., description="Target threat class (e.g. CHAINSAW, GUNSHOT, ILLEGAL_VESSEL, BLAST_FISHING)")
    confidence_score: float = Field(default=0.95, ge=0.0, le=1.0, description="Inference confidence score")

@router.get("/")
async def get_active_incident_clusters():
    """
    Retrieve all active spatial-temporal consolidated incident clusters.
    """
    clusters = cluster_manager.get_all_clusters()
    metrics = cluster_manager.get_deduplication_metrics()
    return {
        "metrics": metrics,
        "clusters": clusters
    }

@router.get("/metrics")
async def get_deduplication_metrics():
    """
    Get redundancy elimination and noise reduction statistics.
    """
    return cluster_manager.get_deduplication_metrics()

@router.get("/{incident_id}")
async def get_incident_dossier(incident_id: str):
    """
    Fetch consolidated multi-sensor dossier for a specific incident.
    """
    cluster = cluster_manager.get_cluster(incident_id)
    if not cluster:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, 
            detail=f"Incident cluster {incident_id} not found."
        )
    
    # Generate attached forensic breakdown
    forensics = analyze_acoustic_forensics(cluster["threat_type"], cluster["peak_confidence"])
    
    return {
        "incident": cluster,
        "forensic_evidence": forensics
    }

@router.post("/verify-forensics")
async def verify_acoustic_forensics(payload: ForensicVerificationRequest):
    """
    Instructor Verification Endpoint: Run real-time acoustic physics & XAI explainability analysis.
    """
    forensics = analyze_acoustic_forensics(payload.threat_type, payload.confidence_score)
    return forensics
