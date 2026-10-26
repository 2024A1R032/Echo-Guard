import React, { useState, useEffect } from 'react';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import Header from './components/Header';
import SideNav from './components/SideNav';
import TacticalRadar from './components/TacticalRadar';
import TacticalMap from './components/TacticalMap';
import AlertFeed from './components/AlertFeed';
import VectorSearchConsole from './components/VectorSearchConsole';
import SwarmMetrics from './components/SwarmMetrics';
import AudioSpectrogram from './components/AudioSpectrogram';
import QuickDispatchModal from './components/QuickDispatchModal';
import InspectEmbeddingModal from './components/InspectEmbeddingModal';
import VerificationSandbox from './components/VerificationSandbox';
import IncidentClustersView from './components/IncidentClustersView';
import ForestDrop from './components/ForestDrop';
import AnimatedNumber from './components/AnimatedNumber';
import { VIEWS } from './views';
import { threatLabel, alertTime, timeAgo, ACTIVE_WINDOW_MINUTES } from './utils/threat';

function StatusBanner({ allAlerts, nodes, activeNodes }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30000);
    return () => clearInterval(timer);
  }, []);

  const windowMs = ACTIVE_WINDOW_MINUTES * 60 * 1000;
  const recent = allAlerts
    .map((a) => ({ alert: a, time: alertTime(a) }))
    .filter((r) => r.time != null && now - r.time <= windowMs)
    .sort((a, b) => b.time - a.time);

  if (recent.length === 0) {
    return (
      <section className="status-banner" data-level="quiet" aria-live="polite">
        <span className="status-mark" aria-hidden="true" />
        <div>
          <h1>All sensors quiet</h1>
          <p>
            No threats detected in the last {ACTIVE_WINDOW_MINUTES} minutes. {activeNodes} of {nodes.length} sensors online.
          </p>
        </div>
      </section>
    );
  }

  const latest = recent[0];
  const node = nodes.find((n) => n.id === latest.alert.device_id);
  const place = node ? node.name : latest.alert.device_id;
  const confidence = Math.round((latest.alert.confidence_score || 0) * 100);

  return (
    <section className="status-banner" data-level="alert" aria-live="polite">
      <span className="status-mark" aria-hidden="true" />
      <div>
        <h1>
          {recent.length} {recent.length === 1 ? 'detection' : 'detections'} in the last {ACTIVE_WINDOW_MINUTES} minutes
        </h1>
        <p>
          Latest: {threatLabel(latest.alert.threat_type).toLowerCase()} near {place}, {timeAgo(latest.time, now)}, {confidence}% confidence
        </p>
      </div>
    </section>
  );
}

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('radar');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [inspectAlert, setInspectAlert] = useState(null);

  const { allAlerts, nodes } = useTelemetry();

  const chainsawCount = allAlerts.filter((a) => a.threat_type === 'CHAINSAW').length;
  const gunshotCount = allAlerts.filter((a) => a.threat_type === 'GUNSHOT').length;
  const vesselCount = allAlerts.filter((a) => a.threat_type === 'ILLEGAL_VESSEL').length;
  const activeNodes = nodes.filter((n) => n.battery > 10).length;

  const view = VIEWS.find((v) => v.id === activeTab) || VIEWS[0];

  return (
    <div className="app-container">
      <SideNav activeTab={activeTab} setActiveTab={setActiveTab} />

      <Header
        title={view.label}
        description={view.description}
        onOpenDispatch={() => setDispatchModalOpen(true)}
      />

      <main className="main-content">
        <StatusBanner allAlerts={allAlerts} nodes={nodes} activeNodes={activeNodes} />

        <ForestDrop active={activeTab === 'forest'} />

        <div key={activeTab} className="view-enter">
          {activeTab === 'radar' && (
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-label">Total detections</span>
                  <span className="stat-value"><AnimatedNumber value={allAlerts.length} /></span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-label">Chainsaws</span>
                  <span className="stat-value"><AnimatedNumber value={chainsawCount} /></span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-label">Gunshots and vessels</span>
                  <span className="stat-value"><AnimatedNumber value={gunshotCount + vesselCount} /></span>
                </div>
              </div>

              <div className="stat-card">
                <div className="stat-info">
                  <span className="stat-label">Sensors online</span>
                  <span className="stat-value"><AnimatedNumber value={activeNodes} /> / {nodes.length}</span>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'radar' && (
            <div className="dashboard-grid">
              <div className="radar-section">
                <TacticalRadar />
                <AudioSpectrogram />
              </div>
              <div className="feed-section">
                <AlertFeed onInspectEmbedding={(alert) => setInspectAlert(alert)} />
              </div>
            </div>
          )}

          {activeTab === 'map' && (
            <TacticalMap onOpenDispatch={() => setDispatchModalOpen(true)} />
          )}

          {activeTab === 'sandbox' && <VerificationSandbox />}

          {activeTab === 'clusters' && <IncidentClustersView />}

          {activeTab === 'vector-search' && <VectorSearchConsole />}

          {activeTab === 'swarm' && <SwarmMetrics />}
        </div>
      </main>

      <QuickDispatchModal
        isOpen={dispatchModalOpen}
        onClose={() => setDispatchModalOpen(false)}
      />

      <InspectEmbeddingModal
        alert={inspectAlert}
        onClose={() => setInspectAlert(null)}
      />
    </div>
  );
}

export default function App() {
  return (
    <TelemetryProvider>
      <DashboardContent />
    </TelemetryProvider>
  );
}
