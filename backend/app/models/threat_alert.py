import uuid
from datetime import datetime, timezone
from typing import List, Optional
from pgvector.sqlalchemy import Vector
from sqlalchemy import Float, DateTime, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

class Base(DeclarativeBase):
    pass

class ThreatAlert(Base):
    __tablename__ = "threat_alerts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    device_id: Mapped[str] = mapped_column(String(50), nullable=False, default="NODE-001", index=True)
    threat_type: Mapped[str] = mapped_column(String(50), nullable=False, default="UNKNOWN", index=True)
    latitude: Mapped[float] = mapped_column(Float, nullable=False)
    longitude: Mapped[float] = mapped_column(Float, nullable=False)
    confidence_score: Mapped[float] = mapped_column(Float, nullable=False)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), 
        default=lambda: datetime.now(timezone.utc), 
        nullable=False, 
        index=True
    )
    embedding: Mapped[Optional[List[float]]] = mapped_column(Vector(128), nullable=True)

