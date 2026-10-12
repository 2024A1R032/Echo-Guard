import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Eye } from 'lucide-react';
import { threatLabel, alertTime, timeAgo } from '../utils/threat';

const THREAT_FILTERS = ['ALL', 'CHAINSAW', 'GUNSHOT', 'ILLEGAL_VESSEL', 'VEHICLE_ENGINE', 'BLAST_FISHING'];

function confidenceColor(score) {
  if (score >= 0.85) return 'var(--threat-chainsaw)';
  if (score >= 0.7) return 'var(--accent-amber)';
  return 'var(--text-muted)';
}

export default function AlertFeed({ onInspectEmbedding }) {
  const { alerts, filterThreat, setFilterThreat } = useTelemetry();

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title">Live alert feed</div>
          <div className="panel-subtitle">New detections appear here as sensors report them</div>
        </div>
        <span className="brand-badge">{alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'}</span>
      </div>

      <div className="feed-filters" role="group" aria-label="Filter by threat type">
        {THREAT_FILTERS.map((type) => (
          <button
            key={type}
            type="button"
            className="filter-chip"
            aria-pressed={filterThreat === type}
            onClick={() => setFilterThreat(type)}
          >
            {type === 'ALL' ? 'All' : threatLabel(type)}
          </button>
        ))}
      </div>

      <div className="feed-scroll">
        {alerts.length === 0 ? (
          <div className="empty-state">
            <strong>No detections match this filter</strong>
            Start the edge simulator, or use “Simulate incident” in the top bar to send an alert.
          </div>
        ) : (
          alerts.map((alert, index) => {
            const confidencePct = Math.round((alert.confidence_score || 0) * 100);
            const time = alertTime(alert);
            const fullTime = time != null ? new Date(time).toLocaleString() : undefined;

            return (
              <div
                key={alert.id || `alert-${index}`}
                className={`alert-item-card ${alert.isNew ? 'is-new' : ''}`}
              >
                <div className="alert-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', minWidth: 0 }}>
                    <span className={`threat-tag ${alert.threat_type}`}>{threatLabel(alert.threat_type)}</span>
                    <span className="alert-device-name">{alert.device_id}</span>
                  </div>
                  <span className="alert-timestamp" title={fullTime}>{timeAgo(time)}</span>
                </div>

                <div className="alert-card-details">
                  <span className="alert-coords">
                    {alert.latitude != null ? alert.latitude.toFixed(4) : '--'}, {alert.longitude != null ? alert.longitude.toFixed(4) : '--'}
                  </span>

                  <div className="confidence-bar-container">
                    <span className="confidence-label" style={{ color: confidenceColor(alert.confidence_score) }}>
                      {confidencePct}% confident
                    </span>
                    <div className="confidence-track" aria-hidden="true">
                      <div
                        className="confidence-fill"
                        style={{ width: `${confidencePct}%`, backgroundColor: confidenceColor(alert.confidence_score) }}
                      />
                    </div>
                  </div>
                </div>

                <button type="button" className="link-btn" onClick={() => onInspectEmbedding(alert)}>
                  <Eye size={14} aria-hidden="true" /> View sound fingerprint
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
