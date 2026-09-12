import React, { useState } from 'react';
import { TelemetryProvider, useTelemetry } from './context/TelemetryContext';
import Header from './components/Header';
import TacticalRadar from './components/TacticalRadar';
import AlertFeed from './components/AlertFeed';
import VectorSearchConsole from './components/VectorSearchConsole';
import SwarmMetrics from './components/SwarmMetrics';
import AudioSpectrogram from './components/AudioSpectrogram';
import QuickDispatchModal from './components/QuickDispatchModal';
import InspectEmbeddingModal from './components/InspectEmbeddingModal';
import VerificationSandbox from './components/VerificationSandbox';
import IncidentClustersView from './components/IncidentClustersView';
import { ShieldAlert, Activity, Radio, Cpu } from 'lucide-react';

function DashboardContent() {
  const [activeTab, setActiveTab] = useState('radar');
  const [dispatchModalOpen, setDispatchModalOpen] = useState(false);
  const [inspectAlert, setInspectAlert] = useState(null);

  const { allAlerts, nodes, wsConnected } = useTelemetry();

  const chainsawCount = allAlerts.filter((a) => a.threat_type === 'CHAINSAW').length;
  const gunshotCount = allAlerts.filter((a) => a.threat_type === 'GUNSHOT').length;
  const vesselCount = allAlerts.filter((a) => a.threat_type === 'ILLEGAL_VESSEL').length;
  const activeNodes = nodes.filter((n) => n.battery > 10).length;

  return (
    <div className="app-container">
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onOpenDispatch={() => setDispatchModalOpen(true)}
      />

      <main className="main-content">
        {/* Top Statistical KPI Cards */}
        <div className="stats-grid">
          <div className="glass-panel stat-card">
            <div className="stat-info">
              <span className="stat-label">Total Bioacoustic Hits</span>
              <span className="stat-value">{allAlerts.length}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(0, 242, 254, 0.1)', color: 'var(--accent-cyan)' }}>
              <Activity size={22} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-info">
              <span className="stat-label">Chainsaw Deforestation</span>
              <span className="stat-value" style={{ color: 'var(--threat-chainsaw)' }}>{chainsawCount}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(255, 42, 95, 0.1)', color: 'var(--threat-chainsaw)' }}>
              <ShieldAlert size={22} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-info">
              <span className="stat-label">Gunshot & Vessel Alerts</span>
              <span className="stat-value" style={{ color: 'var(--accent-amber)' }}>{gunshotCount + vesselCount}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--accent-amber)' }}>
              <Radio size={22} />
            </div>
          </div>

          <div className="glass-panel stat-card">
            <div className="stat-info">
              <span className="stat-label">Active Transducer Nodes</span>
              <span className="stat-value" style={{ color: 'var(--accent-emerald)' }}>{activeNodes} / {nodes.length}</span>
            </div>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--accent-emerald)' }}>
              <Cpu size={22} />
            </div>
          </div>
        </div>

        {/* Tab View Switcher */}
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

        {activeTab === 'sandbox' && (
          <VerificationSandbox />
        )}

        {activeTab === 'clusters' && (
          <IncidentClustersView />
        )}

        {activeTab === 'vector-search' && (
          <VectorSearchConsole />
        )}

        {activeTab === 'swarm' && (
          <SwarmMetrics />
        )}
      </main>

      {/* Modals */}
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
