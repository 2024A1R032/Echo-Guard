import React from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { threatLabel, alertTime, timeAgo } from '../utils/threat';

const THREAT_ORDER = ['CHAINSAW', 'GUNSHOT', 'ILLEGAL_VESSEL', 'VEHICLE_ENGINE', 'BLAST_FISHING'];

function batteryColor(level) {
  if (level < 20) return 'var(--accent-red)';
  if (level < 50) return 'var(--accent-amber)';
  return 'var(--accent-emerald)';
}

export default function SwarmMetrics() {
  const { nodes, allAlerts } = useTelemetry();

  const counts = allAlerts.reduce((acc, alert) => {
    acc[alert.threat_type] = (acc[alert.threat_type] || 0) + 1;
    return acc;
  }, {});
  const latestByNode = {};
  allAlerts.forEach((alert) => {
    if (!latestByNode[alert.device_id]) latestByNode[alert.device_id] = alert;
  });
  const maxCount = Math.max(1, ...THREAT_ORDER.map((type) => counts[type] || 0));

  return (
    <div className="view-stack">
      <section className="glass-panel" aria-label="Sensors">
        <div className="panel-header">
          <div>
            <div className="panel-title">Sensors</div>
            <div className="panel-subtitle">Position, battery and latest detection for each sensor</div>
          </div>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Status</th>
                <th>Position</th>
                <th>Battery</th>
                <th>Latest detection</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map((node) => {
                const online = node.battery > 10;
                return (
                  <tr key={node.id}>
                    <td>
                      <strong>{node.name || node.id}</strong>
                      <div className="mono-note">{node.id}</div>
                    </td>
                    <td>
                      <span className="status-inline">
                        <span className={`status-indicator ${online ? 'online' : 'offline'}`} aria-hidden="true" />
                        {online ? 'Online' : 'Low power'}
                      </span>
                    </td>
                    <td className="mono-note">{node.lat.toFixed(4)}°, {node.lon.toFixed(4)}°</td>
                    <td>
                      <div className="confidence-bar-container">
                        <div className="confidence-track" style={{ width: '72px' }} aria-hidden="true">
                          <div className="confidence-fill" style={{ width: `${node.battery}%`, backgroundColor: batteryColor(node.battery) }} />
                        </div>
                        <span style={{ fontWeight: 600, color: batteryColor(node.battery) }}>{node.battery.toFixed(0)}%</span>
                      </div>
                    </td>
                    <td>
                      {latestByNode[node.id] ? (
                        <span className="status-inline">
                          <span className={`threat-tag ${latestByNode[node.id].threat_type}`}>{threatLabel(latestByNode[node.id].threat_type)}</span>
                          <span className="mono-note">{timeAgo(alertTime(latestByNode[node.id]))}</span>
                        </span>
                      ) : (
                        <span className="mono-note">None yet</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="glass-panel" aria-label="Alerts by threat type">
        <div className="panel-header">
          <div>
            <div className="panel-title">Alerts by threat type</div>
            <div className="panel-subtitle">All detections reported by sensors so far</div>
          </div>
        </div>
        <ul className="bar-list">
          {THREAT_ORDER.map((type) => {
            const count = counts[type] || 0;
            return (
              <li key={type}>
                <span className={`threat-tag ${type}`}>{threatLabel(type)}</span>
                <div className="bar-track" aria-hidden="true">
                  <div className="bar-fill" style={{ width: `${(count / maxCount) * 100}%`, background: `var(--threat-${type === 'ILLEGAL_VESSEL' ? 'vessel' : type === 'VEHICLE_ENGINE' ? 'vehicle' : type === 'BLAST_FISHING' ? 'blast' : type.toLowerCase()})` }} />
                </div>
                <span className="bar-count">{count}</span>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}
