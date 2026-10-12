import pytest
from app.services.langgraph import (
    incident_graph,
    MultiAgentIncidentOrchestrator,
    retrieve_context,
    correlate_nearby,
    draft_report,
    output,
    IncidentState,
)
from app.schemas.payload import IncidentReportResponse, AgentDispatchRecommendation


def test_langgraph_nodes_individually():
    state: IncidentState = {
        "threat_type": "GUNSHOT",
        "device_id": "NODE-BETA",
        "confidence_score": 0.96,
        "latitude": -3.4650,
        "longitude": -62.2150,
    }

    ctx = retrieve_context(state)
    assert ctx["threat_type"] == "GUNSHOT"
    assert "alert_id" in ctx

    state.update(ctx)
    corr = correlate_nearby(state)
    assert "correlated_alerts" in corr

    state.update(corr)
    draft = draft_report(state)
    assert "threat_assessment" in draft
    assert "ecological_risk_score" in draft
    assert "ranger_dispatch" in draft
    assert draft["ecological_risk_score"] > 0

    state.update(draft)
    out = output(state)
    assert "report_id" in out
    assert out["status"] == "ACTIVE_DISPATCH"


def test_langgraph_stategraph_invocation():
    state: IncidentState = {
        "threat_type": "CHAINSAW",
        "device_id": "NODE-ALPHA",
        "confidence_score": 0.92,
        "latitude": -3.4650,
        "longitude": -62.2150,
    }

    result = incident_graph.invoke(state)
    assert "report_id" in result
    assert result["threat_type"] == "CHAINSAW"
    assert result["status"] == "ACTIVE_DISPATCH"
    assert "threat_assessment" in result
    assert "ranger_dispatch" in result


def test_multi_agent_orchestrator_generate_report():
    report = MultiAgentIncidentOrchestrator.generate_report(
        threat_type="CHAINSAW",
        device_id="NODE-ALPHA",
        confidence_score=0.95,
        latitude=-3.4650,
        longitude=-62.2150,
        alert_id="ALT-TEST-123",
    )

    assert isinstance(report, IncidentReportResponse)
    assert report.alert_id == "ALT-TEST-123"
    assert report.threat_type == "CHAINSAW"
    assert report.device_id == "NODE-ALPHA"
    assert report.ecological_risk_score > 0.0
    assert isinstance(report.ranger_dispatch, AgentDispatchRecommendation)
    assert report.ranger_dispatch.ranger_unit != ""
    assert report.ranger_dispatch.estimated_arrival_minutes > 0
    assert len(report.ranger_dispatch.recommended_equipment) > 0
