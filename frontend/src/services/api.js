const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';
const WS_BASE_URL = import.meta.env.VITE_WS_URL || 'ws://127.0.0.1:8000';

export async function fetchRecentAlerts(limit = 50) {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/telemetry/?limit=${limit}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn('[API] Failed to fetch alerts:', err.message);
    return [];
  }
}

export async function postTelemetryAlert(alertData) {
  const response = await fetch(`${API_BASE_URL}/api/v1/telemetry/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(alertData),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

export async function searchAcousticThreats(queryEmbedding, limit = 5) {
  const response = await fetch(`${API_BASE_URL}/api/v1/telemetry/search`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query_embedding: queryEmbedding, limit }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

export async function checkBackendHealth() {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, { signal: AbortSignal.timeout(2000) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function fetchActiveIncidentClusters() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/incidents/`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn('[API] Failed to fetch incident clusters:', err.message);
    return { metrics: { total_raw_alerts: 0, consolidated_incident_clusters: 0, redundancy_elimination_rate_percent: 0 }, clusters: [] };
  }
}

export async function verifyAcousticForensics(threatType, confidenceScore = 0.95) {
  const response = await fetch(`${API_BASE_URL}/api/v1/incidents/verify-forensics`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ threat_type: threatType, confidence_score: confidenceScore }),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return await response.json();
}

export function getWebSocketEndpoint() {
  return `${WS_BASE_URL}/api/v1/telemetry/ws`;
}
