import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { AlertCircle, Filter, Eye, ShieldAlert, Zap } from 'lucide-react';

export default function AlertFeed({ onInspectEmbedding }) {
  const { alerts, allAlerts, filterThreat, setFilterThreat, selectedNode, setSelectedNode } = useTelemetry();

  const threatFilters = ['ALL', 'CHAINSAW', 'GUNSHOT', 'ILLEGAL_VESSEL', 'VEHICLE_ENGINE', 'BLAST_FISHING'];

  const getConfidenceColor = (score) => {
    if (score >= 0.85) return 'var(--threat-chainsaw)';
    if (score >= 0.7) return 'var(--accent-amber)';
    return 'var(--accent-cyan)';
  };

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="panel-header">
        <div className="panel-title-wrapper">
          <ShieldAlert size={18} color="var(--threat-chainsaw)" />
          <div>
            <div className="panel-title">Live Bioacoustic Alert Feed</div>
            <div className="panel-subtitle">Real-Time Ingestion • Fast Streaming WebSocket Broadcast</div>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
          <span className="brand-badge" style={{ background: '#ffe4e6', color: 'var(--threat-chainsaw)', borderColor: 'rgba(225, 29, 72, 0.3)' }}>
            {alerts.length} ALERTS
          </span>
        </div>
      </div>

      {/* Filter Chips Bar */}
      <div style={{ padding: '0.65rem 0.85rem', borderBottom: '1px solid var(--border-subtle)', display: 'flex', gap: '0.35rem', overflowX: 'auto', background: '#f8fafc' }}>
        {threatFilters.map((type) => (
          <button
            key={type}
            onClick={() => setFilterThreat(type)}
            style={{
              padding: '0.25rem 0.55rem',
              borderRadius: '4px',
              border: filterThreat === type ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
              background: filterThreat === type ? '#e0f2fe' : '#ffffff',
              color: filterThreat === type ? 'var(--accent-cyan)' : 'var(--text-secondary)',
              fontSize: '0.68rem',
              fontWeight: 700,
              fontFamily: 'var(--font-mono)',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              transition: 'all 0.15s ease',
            }}
          >
            {type}
          </button>
        ))}
      </div>

      {/* Alert Feed Scroll */}
      <div className="feed-scroll">
        {alerts.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            <AlertCircle size={32} style={{ margin: '0 auto 0.75rem', opacity: 0.4 }} />
            <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)' }}>No acoustic alerts matching criteria</div>
            <div style={{ fontSize: '0.75rem', marginTop: '0.25rem', color: 'var(--text-muted)' }}>
              Run the C++ Edge Simulator or use "Simulate Incident" to stream alerts.
            </div>
          </div>
        ) : (
          alerts.map((alert, index) => {
            const confidencePct = Math.round((alert.confidence_score || 0) * 100);
            const timeStr = alert.timestamp ? new Date(alert.timestamp).toLocaleTimeString() : 'Just now';

            return (
              <div
                key={alert.id || `alert-${index}`}
                className={`alert-item-card ${alert.isNew ? 'is-new' : ''}`}
              >
                <div className="alert-card-top">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span className={`threat-tag ${alert.threat_type}`}>
                      {alert.threat_type}
                    </span>
                    <span className="alert-device-name">{alert.device_id}</span>
                  </div>
                  <span className="alert-timestamp">{timeStr}</span>
                </div>

                <div className="alert-card-details">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontFamily: 'var(--font-mono)' }}>
                    <span>Lat: {alert.latitude ? alert.latitude.toFixed(4) : '--'}</span>
                    <span>Lon: {alert.longitude ? alert.longitude.toFixed(4) : '--'}</span>
                  </div>

                  <div className="confidence-bar-container">
                    <span style={{ fontSize: '0.72rem', fontFamily: 'var(--font-mono)', fontWeight: 700, color: getConfidenceColor(alert.confidence_score) }}>
                      {confidencePct}% CONF
                    </span>
                    <div className="confidence-track">
                      <div
                        className="confidence-fill"
                        style={{
                          width: `${confidencePct}%`,
                          backgroundColor: getConfidenceColor(alert.confidence_score),
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Inspect Vector button */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', paddingTop: '0.35rem', borderTop: '1px solid var(--border-subtle)' }}>
                  <button
                    onClick={() => onInspectEmbedding(alert)}
                    style={{
                      background: 'none',
                      border: 'none',
                      color: 'var(--accent-cyan)',
                      fontSize: '0.72rem',
                      fontWeight: 600,
                      fontFamily: 'var(--font-mono)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      padding: '0.2rem 0.4rem',
                      borderRadius: '4px',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#e0f2fe')}
                    onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                  >
                    <Eye size={13} /> Inspect 128-D Vector
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
