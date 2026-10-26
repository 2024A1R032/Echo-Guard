import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Eye, ChevronDown } from 'lucide-react';
import { threatLabel, alertTime, timeAgo } from '../utils/threat';

const THREAT_FILTERS = ['ALL', 'CHAINSAW', 'GUNSHOT', 'ILLEGAL_VESSEL', 'VEHICLE_ENGINE', 'BLAST_FISHING'];
const VISIBLE_ROWS = 8;

function confidenceColor(score) {
  if (score >= 0.85) return 'var(--threat-chainsaw)';
  if (score >= 0.7) return 'var(--accent-amber)';
  return 'var(--text-muted)';
}

function rowKey(alert, index) {
  return alert.id || `${alert.device_id}-${alert.timestamp || alert.receivedAt || index}`;
}

function EmptyState({ backendOnline, filtered }) {
  if (!backendOnline) {
    return (
      <div className="empty-state">
        <strong>Can’t reach the backend</strong>
        Start it and detections will appear here as sensors report them.
      </div>
    );
  }
  return (
    <div className="empty-state">
      <strong>{filtered ? 'No detections of this type' : 'No detections yet'}</strong>
      {filtered
        ? 'Choose “All” to see everything.'
        : 'They will appear here as soon as a sensor reports one.'}
    </div>
  );
}

export default function AlertFeed({ onInspectEmbedding }) {
  const { alerts, nodes, filterThreat, setFilterThreat, alertsLoaded, backendOnline } = useTelemetry();
  const [showAll, setShowAll] = useState(false);
  const [openKeys, setOpenKeys] = useState(() => new Set());

  const nameFor = (deviceId) => {
    const node = nodes.find((n) => n.id === deviceId);
    return node && node.name ? node.name : deviceId;
  };

  const toggle = (key) =>
    setOpenKeys((previous) => {
      const next = new Set(previous);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const rows = showAll ? alerts : alerts.slice(0, VISIBLE_ROWS);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div>
          <div className="panel-title">Live alert feed</div>
          <div className="panel-subtitle">Newest first. Select an alert for details.</div>
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

      {!alertsLoaded ? (
        <div className="feed-skeleton" aria-hidden="true">
          {[0, 1, 2, 3, 4].map((i) => (
            <div className="skeleton-row" key={i}>
              <span className="skeleton" style={{ width: '5.5rem', height: '1.3rem' }} />
              <span className="skeleton" style={{ flex: 1, height: '0.9rem' }} />
              <span className="skeleton" style={{ width: '2.6rem', height: '0.9rem' }} />
            </div>
          ))}
        </div>
      ) : alerts.length === 0 ? (
        <EmptyState backendOnline={backendOnline} filtered={filterThreat !== 'ALL'} />
      ) : (
        <>
          <ul className="alert-list feed-scroll">
            {rows.map((alert, index) => {
              const key = rowKey(alert, index);
              const isOpen = openKeys.has(key);
              const confidencePct = Math.round((alert.confidence_score || 0) * 100);
              const time = alertTime(alert);
              const fullTime = time != null ? new Date(time).toLocaleString() : undefined;
              const color = confidenceColor(alert.confidence_score);

              return (
                <li key={key} className={`alert-row ${alert.isNew ? 'is-new' : ''}`}>
                  <button
                    type="button"
                    className="alert-row-main"
                    aria-expanded={isOpen}
                    onClick={() => toggle(key)}
                  >
                    <span className={`threat-tag ${alert.threat_type}`}>{threatLabel(alert.threat_type)}</span>
                    <span className="alert-row-node">{nameFor(alert.device_id)}</span>
                    <span className="alert-row-time" title={fullTime}>{timeAgo(time)}</span>
                    <span className="alert-row-conf" style={{ color }}>{confidencePct}%</span>
                    <ChevronDown size={15} className="alert-row-chevron" aria-hidden="true" />
                  </button>

                  {isOpen && (
                    <div className="alert-row-detail">
                      <div className="alert-detail-line">
                        <span className="alert-device-name">{alert.device_id}</span>
                        <span className="alert-coords">
                          {alert.latitude != null ? alert.latitude.toFixed(4) : '--'}, {alert.longitude != null ? alert.longitude.toFixed(4) : '--'}
                        </span>
                      </div>
                      <div className="confidence-bar-container">
                        <div className="confidence-track" style={{ width: '100%' }} aria-hidden="true">
                          <div className="confidence-fill" style={{ width: `${confidencePct}%`, backgroundColor: color }} />
                        </div>
                        <span className="confidence-label" style={{ color, minWidth: '6.5rem' }}>{confidencePct}% confident</span>
                      </div>
                      <button type="button" className="link-btn" onClick={() => onInspectEmbedding(alert)}>
                        <Eye size={14} aria-hidden="true" /> View sound fingerprint
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>

          {alerts.length > VISIBLE_ROWS && (
            <div className="feed-more">
              <button type="button" className="link-btn" style={{ alignSelf: 'center' }} onClick={() => setShowAll((value) => !value)}>
                {showAll ? 'Show fewer' : `Show all ${alerts.length}`}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
