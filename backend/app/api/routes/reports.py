from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import List, Optional
import uuid

from app.db.database import get_db
from app.models.alert import ThreatAlert
from app.schemas.payload import IncidentReportRequest, IncidentReportResponse
from app.services.langgraph import MultiAgentIncidentOrchestrator

router = APIRouter()

@router.post("/generate", response_model=IncidentReportResponse, status_code=status.HTTP_200_OK)
async def generate_incident_report(
    payload: IncidentReportRequest,
    db: AsyncSession = Depends(get_db)
):
    """
    Trigger LangGraph multi-agent orchestration to generate tactical ranger dispatch report.
    """
    report = MultiAgentIncidentOrchestrator.generate_report(
        threat_type=payload.threat_type,
        device_id=payload.device_id,
        confidence_score=payload.confidence_score,
        latitude=payload.latitude,
        longitude=payload.longitude,
        alert_id=payload.alert_id
    )

    # If alert_id is provided, optionally update report summary in database
    if payload.alert_id:
        try:
            alert_uuid = uuid.UUID(payload.alert_id)
            stmt = select(ThreatAlert).where(ThreatAlert.id == alert_uuid)
            result = await db.execute(stmt)
            alert = result.scalar_one_or_none()
            if alert:
                alert.report_summary = report.threat_assessment
                await db.commit()
        except (ValueError, Exception):
            pass

    return report

@router.get("/{alert_id}", response_model=IncidentReportResponse)
async def get_report_by_alert_id(
    alert_id: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Fetch or synthesize a LangGraph tactical incident report for a specific alert UUID.
    """
    try:
        alert_uuid = uuid.UUID(alert_id)
        stmt = select(ThreatAlert).where(ThreatAlert.id == alert_uuid)
        result = await db.execute(stmt)
        alert = result.scalar_one_or_none()
    except (ValueError, Exception):
        alert = None

    if not alert:
        # Fallback default report if not found in db
        return MultiAgentIncidentOrchestrator.generate_report(
            threat_type="CHAINSAW",
            device_id="NODE-ALPHA",
            confidence_score=0.95,
            latitude=-3.4650,
            longitude=-62.2150,
            alert_id=alert_id
        )

    return MultiAgentIncidentOrchestrator.generate_report(
        threat_type=alert.threat_type,
        device_id=alert.device_id,
        confidence_score=alert.confidence_score,
        latitude=alert.latitude,
        longitude=alert.longitude,
        alert_id=str(alert.id)
    )
