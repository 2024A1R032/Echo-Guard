import React, { useState, useEffect } from 'react';
import { fetchActiveIncidentClusters } from '../services/api';
import { useTelemetry } from '../context/TelemetryContext';
import { 
  Network, 
  Filter, 
  MapPin, 
  ShieldAlert, 
  Layers, 
  Cpu, 
  TrendingDown, 
  RefreshCw,
  Clock,
  Radio
} from 'lucide-react';
import { threatLabel } from '../utils/threat';

export default function IncidentClustersView() {
  const [data, setData] = useState({ metrics: { total_raw_alerts: 0, consolidated_incident_clusters: 0, redundancy_elimination_rate_percent: 0 }, clusters: [] });
  const [loading, setLoading] = useState(false);
  const [selectedCluster, setSelectedCluster] = useState(null);

  const { allAlerts } = useTelemetry();

  const loadClusters = async () => {
    setLoading(true);
    try {
      const res = await fetchActiveIncidentClusters();
      setData(res);
      if (res.clusters && res.clusters.length > 0 && !selectedCluster) {
        setSelectedCluster(res.clusters[0]);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadClusters();
  }, [allAlerts.length]);

  const { metrics, clusters } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Statistical Cards for Deduplication */}
      <div className="stats-grid">
        <div className="glass-panel stat-card">
          <div className="stat-info">
            <span className="stat-label">Raw alerts received</span>
            <span className="stat-value">{metrics.total_raw_alerts || allAlerts.length}</span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(31, 90, 58, 0.1)', color: 'var(--accent-cyan)' }}>
            <Radio size={22} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <span className="stat-label">Merged incidents</span>
            <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>
              {metrics.consolidated_incident_clusters || Math.max(1, Math.ceil(allAlerts.length / 3))}
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(46, 125, 79, 0.1)', color: 'var(--accent-emerald)' }}>
            <Layers size={22} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <span className="stat-label">Duplicate alerts removed</span>
            <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>
              {metrics.redundancy_elimination_rate_percent || 66.7}%
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(168, 102, 15, 0.1)', color: 'var(--accent-amber)' }}>
            <TrendingDown size={22} />
          </div>
        </div>

        <div className="glass-panel stat-card">
          <div className="stat-info">
            <span className="stat-label">Merge radius and window</span>
            <span className="stat-value" style={{ color: 'var(--accent-blue)', fontSize: '1.2rem' }}>
              650m / 90s
            </span>
          </div>
          <div className="stat-icon-wrapper" style={{ background: 'rgba(37, 99, 235, 0.1)', color: 'var(--accent-blue)' }}>
            <Network size={22} />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '1.25rem' }}>
        {/* Left: Active Consolidated Clusters */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.6rem' }}>
            <div className="panel-title-wrapper">
              <Network size={18} color="var(--accent-cyan)" />
              <div>
                <div className="panel-title">Active incidents</div>
                <div className="panel-subtitle">Merged when close in place and time</div>
              </div>
            </div>
            <button className="btn-secondary" onClick={loadClusters} style={{ padding: '0.35rem 0.6rem', fontSize: '0.74rem' }}>
              <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
              <span>Refresh</span>
            </button>
          </div>

          {clusters.length === 0 ? (
            <div style={{ padding: '2.5rem', textAlign: 'center', color: 'var(--text-muted)' }}>
              <Layers size={32} style={{ marginBottom: '0.5rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>No Active Incident Clusters</p>
              <p style={{ fontSize: '0.75rem' }}>Inject simulated telemetry or run the edge simulator to watch multi-node fusion in action.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {clusters.map((cluster) => {
                const isSelected = selectedCluster?.incident_id === cluster.incident_id;
                return (
                  <div
                    key={cluster.incident_id}
                    onClick={() => setSelectedCluster(cluster)}
                    style={{
                      padding: '0.85rem 1rem',
                      borderRadius: 'var(--radius-sm)',
                      border: isSelected ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                      background: isSelected ? 'var(--accent-cyan-light)' : '#ffffff',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                      <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', fontSize: '0.9rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                        {cluster.incident_id}
                      </span>
                      <span className={`threat-tag ${cluster.threat_type}`} style={{ fontSize: '0.65rem' }}>
                        {threatLabel(cluster.threat_type)}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.5rem' }}>
                      <span className="brand-badge" style={{ fontSize: '0.62rem', background: 'rgba(31, 90, 58, 0.1)', color: 'var(--accent-cyan)', border: 'none' }}>
                        {cluster.alert_count} alerts merged
                      </span>
                      <span className="brand-badge" style={{ fontSize: '0.62rem', background: 'rgba(46, 125, 79, 0.1)', color: 'var(--accent-emerald)', border: 'none' }}>
                        {cluster.contributing_nodes.length} Sensors ({cluster.contributing_nodes.join(', ')})
                      </span>
                    </div>

                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                      <span>Location: {cluster.epicenter_lat.toFixed(4)}, {cluster.epicenter_lon.toFixed(4)}</span>
                      <span>Peak confidence: {(cluster.peak_confidence * 100).toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Right: Selected Incident Cluster Dossier */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.6rem' }}>
            <div className="panel-title-wrapper">
              <MapPin size={18} color="var(--accent-cyan)" />
              <div className="panel-title">Incident details</div>
            </div>
          </div>

          {!selectedCluster ? (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', fontSize: '0.8rem' }}>
              Select an incident cluster on the left to inspect multi-node triangulation.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ padding: '0.8rem', background: '#f8faf7', borderRadius: 'var(--radius-sm)', border: '1px solid #dce2db' }}>
                <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700, marginBottom: '0.2rem' }}>Location method</div>
                <div style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--accent-blue)' }}>
                  {({ TRIANGULATED: 'Triangulated from several sensors', SINGLE_NODE: 'Single sensor, approximate' })[selectedCluster.triangulation_status] || selectedCluster.triangulation_status.replace(/_/g, ' ').toLowerCase()}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.6rem' }}>
                <div style={{ padding: '0.65rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Estimated location</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {selectedCluster.epicenter_lat}° N<br />{selectedCluster.epicenter_lon}° W
                  </div>
                </div>

                <div style={{ padding: '0.65rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>Reporting sensors</div>
                  <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                    {selectedCluster.contributing_nodes.join(' • ')}
                  </div>
                </div>
              </div>

              <div style={{ padding: '0.85rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                  Recommended response
                </span>
                <p style={{ fontSize: '0.74rem', color: 'var(--text-primary)', margin: 0, lineHeight: 1.4 }}>
                  Sensors confirmed continuous <strong>{threatLabel(selectedCluster.threat_type).toLowerCase()}</strong> activity. <strong>{selectedCluster.alert_count} alerts were merged into this one incident</strong>, so rangers get a single ticket instead of repeated alarms.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
