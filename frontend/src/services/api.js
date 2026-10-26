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

// Drop an audio or video clip at a point in the forest and let every sensor node listen to it.
export async function dropAudioInForest({ file, nodes, sourceLat, sourceLon, loudness = 'normal', sendAlerts = true }) {
  const body = new FormData();
  body.append('file', file);
  body.append('nodes', JSON.stringify(nodes.map(({ id, name, lat, lon }) => ({ id, name, lat, lon }))));
  body.append('source_lat', String(sourceLat));
  body.append('source_lon', String(sourceLon));
  body.append('loudness', loudness);
  body.append('send_alerts', sendAlerts ? 'true' : 'false');

  let response;
  try {
    response = await fetch(`${API_BASE_URL}/api/v1/simulate/audio-drop`, { method: 'POST', body });
  } catch {
    throw new Error('Could not reach the backend. Make sure it is running, then try again.');
  }
  if (!response.ok) {
    let detail = `The server returned an error (${response.status}).`;
    try {
      const data = await response.json();
      if (data.detail) detail = typeof data.detail === 'string' ? data.detail : JSON.stringify(data.detail);
    } catch {
      // keep the generic message
    }
    throw new Error(detail);
  }
  return await response.json();
}

// How far a sensor can pick out a sound for each loudness (simulated assumption).
export async function fetchListeningRange() {
  try {
    const response = await fetch(`${API_BASE_URL}/api/v1/simulate/coverage`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch (err) {
    console.warn('[API] Failed to fetch listening range:', err.message);
    return null;
  }
}
