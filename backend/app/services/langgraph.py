import uuid
from datetime import datetime, timezone
from typing import Dict, Any, List
from app.schemas.payload import IncidentReportResponse, AgentDispatchRecommendation

class MultiAgentIncidentOrchestrator:
    """
    Simulated LangGraph Multi-Agent Architecture for Rapid Incident Response:
    - Agent 1 (Bioacoustic Analyst): Evaluates frequency signatures & spectral confidence.
    - Agent 2 (Ecological Impact Officer): Estimates canopy damage, poaching risk, & wildlife disruption.
    - Agent 3 (Tactical Dispatch Commander): Selects nearest ranger unit, arrival estimate & equipment.
    """

    @staticmethod
    def analyze_bioacoustics(threat_type: str, confidence: float) -> Dict[str, Any]:
        threat_descriptions = {
            "CHAINSAW": "Harmonic two-stroke engine resonance (400-500Hz) indicative of high-yield timber felling.",
            "GUNSHOT": "High-amplitude ballistic impulse transient (<15ms rise time) with severe anti-poaching signature.",
            "ILLEGAL_VESSEL": "Continuous low-frequency underwater cavitation detected across hydrophone transducers.",
            "BLAST_FISHING": "Catastrophic underwater shockwave reverberation causing wide-area marine habitat destruction.",
            "VEHICLE_ENGINE": "Heavy diesel internal combustion signature traversing unauthorized perimeter trail.",
            "UNKNOWN": "Anomalous acoustic spectrum exceeding ambient canopy baseline threshold."
        }
        assessment = threat_descriptions.get(
            threat_type.upper(), 
            f"Uncategorized acoustic perturbation detected with {confidence*100:.1f}% confidence."
        )
        return {"assessment": assessment, "confidence": confidence}

    @staticmethod
    def compute_ecological_risk(threat_type: str, confidence: float) -> float:
        risk_weights = {
            "CHAINSAW": 0.88,
            "GUNSHOT": 0.95,
            "BLAST_FISHING": 0.98,
            "ILLEGAL_VESSEL": 0.76,
            "VEHICLE_ENGINE": 0.70,
            "UNKNOWN": 0.50
        }
        base_weight = risk_weights.get(threat_type.upper(), 0.60)
        return round(min(1.0, base_weight * (0.8 + (confidence * 0.2))), 2)

    @staticmethod
    def generate_ranger_dispatch(threat_type: str, latitude: float, longitude: float) -> AgentDispatchRecommendation:
        t_upper = threat_type.upper()
        if t_upper in ("GUNSHOT", "BLAST_FISHING"):
            return AgentDispatchRecommendation(
                ranger_unit="Rapid Tactical Intercept Team (Alpha Unit)",
                urgency_level="CRITICAL - IMMEDIATE INTERVENTION",
                estimated_arrival_minutes=12,
                containment_strategy="Establish 360-degree perimeter roadblock and deploy acoustic tracking drone.",
                recommended_equipment=["Tactical Recon Drone", "Thermal Night Optics", "GPS Transponders", "Ballistic Shields"]
            )
        elif t_upper == "CHAINSAW":
            return AgentDispatchRecommendation(
                ranger_unit="Forest Protection Taskforce (Canopy Squad 4)",
                urgency_level="HIGH - ACTIVE DEFORESTATION",
                estimated_arrival_minutes=18,
                containment_strategy="Deploy overhead thermal surveillance to pinpoint logging vehicle egress routes.",
                recommended_equipment=["Chainsaw Seizure Kit", "Long-Range Telephoto Cameras", "Drone Grid Survey"]
            )
        elif t_upper == "ILLEGAL_VESSEL":
            return AgentDispatchRecommendation(
                ranger_unit="Riverine Interceptor Patrol (Boat Echo-2)",
                urgency_level="MEDIUM-HIGH - WATERWAY SANCTUARY BREACH",
                estimated_arrival_minutes=15,
                containment_strategy="Intercept vessel downstream at confluence checkpoint.",
                recommended_equipment=["High-Speed Patrol Boat", "Hydrophone Search Array", "Searchlights"]
            )
        else:
            return AgentDispatchRecommendation(
                ranger_unit="Sector Patrol Patrol Team (Bravo Unit)",
                urgency_level="EVALUATION & RECONNAISSANCE",
                estimated_arrival_minutes=25,
                containment_strategy="Conduct ground survey and inspect localized transducer node.",
                recommended_equipment=["Handheld Acoustic Inspector", "Bioacoustic Recorder"]
            )

    @classmethod
    def generate_report(
        cls, 
        threat_type: str, 
        device_id: str, 
        confidence_score: float, 
        latitude: float, 
        longitude: float,
        alert_id: str = None
    ) -> IncidentReportResponse:
        bioacoustic = cls.analyze_bioacoustics(threat_type, confidence_score)
        risk_score = cls.compute_ecological_risk(threat_type, confidence_score)
        dispatch = cls.generate_ranger_dispatch(threat_type, latitude, longitude)

        return IncidentReportResponse(
            report_id=f"REP-{uuid.uuid4().hex[:8].upper()}",
            alert_id=alert_id or f"ALT-{uuid.uuid4().hex[:6].upper()}",
            threat_type=threat_type,
            device_id=device_id,
            threat_assessment=bioacoustic["assessment"],
            ecological_risk_score=risk_score,
            ranger_dispatch=dispatch,
            generated_at=datetime.now(timezone.utc).isoformat(),
            status="ACTIVE_DISPATCH"
        )
