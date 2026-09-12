import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Activity, Battery, Wifi, MapPin, AlertTriangle, ShieldCheck, Zap } from 'lucide-react';

export default function SwarmMetrics() {
  const { nodes, allAlerts, setSelectedNode } = useTelemetry();

  // Threat type aggregation
  const threatCounts = allAlerts.reduce((acc, alert) => {
    acc[alert.threat_type] = (acc[alert.threat_type] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {/* Node Grid Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1.25rem' }}>
        {nodes.map((node) => {
          const isLowBattery = node.battery < 20;
          const batteryColor = isLowBattery ? 'var(--accent-red)' : node.battery < 50 ? 'var(--accent-amber)' : 'var(--accent-emerald)';

          return (
            <div
              key={node.id}
              className="glass-panel"
              style={{ padding: '1.25rem', cursor: 'pointer', transition: 'all 0.2s', background: '#ffffff' }}
              onClick={() => setSelectedNode(node)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.65rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem' }}>
                  <div className={`status-indicator ${node.battery > 10 ? 'online' : 'offline'}`} />
                  <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    {node.id}
                  </span>
                </div>
                <span className="brand-badge" style={{ fontSize: '0.65rem' }}>
                  {node.status}
                </span>
              </div>

              <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>
                {node.name}
              </div>

              {/* Coordinates */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', marginBottom: '0.85rem' }}>
                <MapPin size={13} color="var(--accent-cyan)" />
                <span>{node.lat.toFixed(4)}° N, {node.lon.toFixed(4)}° W</span>
              </div>

              {/* Battery & Signal */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.45rem', paddingTop: '0.75rem', borderTop: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem' }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                    <Battery size={14} color={batteryColor} /> Battery
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, color: batteryColor }}>
                    {node.battery.toFixed(0)}%
                  </span>
                </div>
                <div style={{ height: '6px', background: '#e2e8f0', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ height: '100%', width: `${node.battery}%`, background: batteryColor, borderRadius: '3px' }} />
                </div>
              </div>

              {node.lastDetection && (
                <div style={{ marginTop: '0.75rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem' }}>
                  <span style={{ color: 'var(--text-muted)' }}>Last Acoustic Hit:</span>
                  <span className={`threat-tag ${node.lastDetection}`} style={{ fontSize: '0.62rem', padding: '0.1rem 0.35rem' }}>
                    {node.lastDetection}
                  </span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Threat Distribution Summary */}
      <div className="glass-panel" style={{ padding: '1.5rem', background: '#ffffff' }}>
        <div className="panel-title-wrapper" style={{ marginBottom: '1.25rem' }}>
          <Activity size={18} color="var(--accent-cyan)" />
          <div>
            <div className="panel-title">Acoustic Threat Category Breakdown</div>
            <div className="panel-subtitle">Total Ingested Telemetry Incidents Across All Active Swarm Nodes</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '1rem' }}>
          {['CHAINSAW', 'GUNSHOT', 'ILLEGAL_VESSEL', 'VEHICLE_ENGINE', 'BLAST_FISHING'].map((type) => {
            const count = threatCounts[type] || 0;
            return (
              <div
                key={type}
                style={{
                  background: 'var(--bg-primary)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                  padding: '1.1rem',
                  textAlign: 'center',
                }}
              >
                <span className={`threat-tag ${type}`} style={{ fontSize: '0.68rem', marginBottom: '0.5rem' }}>
                  {type}
                </span>
                <div style={{ fontSize: '1.85rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-primary)', marginTop: '0.4rem' }}>
                  {count}
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, marginTop: '0.2rem' }}>
                  Detections
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
