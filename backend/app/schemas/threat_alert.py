import uuid
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, Field, ConfigDict

class ThreatAlertBase(BaseModel):
    latitude: float = Field(..., ge=-90.0, le=90.0, description="GPS Latitude")
    longitude: float = Field(..., ge=-180.0, le=180.0, description="GPS Longitude")
    confidence_score: float = Field(..., ge=0.0, le=1.0, description="Confidence score from ML inference (0 to 1)")
    threat_type: str = Field(default="UNKNOWN", description="Classification (e.g. CHAINSAW, GUNSHOT, VEHICLE, WILDLIFE)")
    device_id: str = Field(default="NODE-001", description="Unique identifier of reporting edge sensor node")
    embedding: Optional[List[float]] = Field(default=None, description="128-dimensional bioacoustic feature embedding")

class ThreatAlertCreate(ThreatAlertBase):
    pass

class ThreatAlertResponse(ThreatAlertBase):
    id: uuid.UUID
    timestamp: datetime

    model_config = ConfigDict(from_attributes=True)

class ThreatAlertSearchRequest(BaseModel):
    query_embedding: List[float] = Field(..., min_length=128, max_length=128, description="128-dim acoustic query embedding vector")
    limit: int = Field(default=10, ge=1, le=100, description="Maximum number of nearest alerts to return")

class ThreatAlertSearchResult(ThreatAlertResponse):
    distance: Optional[float] = Field(default=None, description="Cosine distance from query vector")

