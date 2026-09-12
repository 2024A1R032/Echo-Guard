import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Shield, Radio, Volume2, VolumeX, Activity, Cpu, Bell } from 'lucide-react';

export default function Header({ activeTab, setActiveTab, onOpenDispatch }) {
  const { wsConnected, backendOnline, allAlerts, audioEnabled, setAudioEnabled, nodes, testAlarmSound, triggerSimulationAlert } = useTelemetry();
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString().slice(17, 25));
  const [alarmBeeping, setAlarmBeeping] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleQuickFakeAlarm = () => {
    setAlarmBeeping(true);
    testAlarmSound();
    triggerSimulationAlert('CHAINSAW', 'NODE-ALPHA', 0.98);
    setTimeout(() => setAlarmBeeping(false), 1500);
  };

  const totalThreats = allAlerts.length;
  const activeNodesCount = nodes.filter((n) => n.battery > 10).length;

  return (
    <header className="app-header">
      <div className="brand-section">
        <div className="brand-icon-wrapper">
          <Shield size={22} />
        </div>
        <div>
          <div className="brand-title">
            <span>ECHOGUARD</span>
            <span className="brand-badge">DEFENSE GRID v1.0</span>
          </div>
        </div>
      </div>

      <div className="nav-tabs">
        <button
          className={`nav-tab-btn ${activeTab === 'radar' ? 'active' : ''}`}
          onClick={() => setActiveTab('radar')}
        >
          <Radio size={16} />
          <span>Tactical Radar</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'vector-search' ? 'active' : ''}`}
          onClick={() => setActiveTab('vector-search')}
        >
          <Cpu size={16} />
          <span>Acoustic Vector Search</span>
        </button>
        <button
          className={`nav-tab-btn ${activeTab === 'swarm' ? 'active' : ''}`}
          onClick={() => setActiveTab('swarm')}
        >
          <Activity size={16} />
          <span>Sensor Swarm ({activeNodesCount})</span>
        </button>
      </div>

      <div className="header-status-group">
        <button
          className="btn-primary"
          onClick={handleQuickFakeAlarm}
          style={{
            padding: '0.4rem 0.85rem',
            fontSize: '0.78rem',
            background: alarmBeeping ? 'linear-gradient(135deg, #e11d48, #be123c)' : undefined,
            boxShadow: alarmBeeping ? '0 0 15px rgba(225, 29, 72, 0.6)' : undefined,
            transition: 'all 0.2s ease',
          }}
          title="Emit a simulated alarm beep & inject threat onto radar grid"
        >
          <Bell size={14} className={alarmBeeping ? 'animate-bounce' : ''} />
          <span>{alarmBeeping ? '🚨 BEEPING...' : '⚡ Fake Alarm (Beep)'}</span>
        </button>

        <button
          className="btn-secondary"
          onClick={onOpenDispatch}
          style={{ padding: '0.4rem 0.75rem', fontSize: '0.78rem' }}
        >
          <span>Configure Incident</span>
        </button>

        <button
          className="btn-secondary"
          onClick={() => setAudioEnabled(!audioEnabled)}
          title={audioEnabled ? 'Mute Alert Audio' : 'Unmute Alert Audio'}
          style={{ padding: '0.4rem 0.6rem' }}
        >
          {audioEnabled ? <Volume2 size={16} color="var(--accent-cyan)" /> : <VolumeX size={16} color="var(--text-muted)" />}
        </button>

        <div className="status-pill">
          <div className={`status-indicator ${wsConnected ? 'online' : 'offline'}`} />
          <span>{wsConnected ? 'WS LIVE' : 'WS RECONNECTING'}</span>
        </div>

        <div className="status-pill" style={{ color: 'var(--accent-cyan)' }}>
          <span>{currentTime} UTC</span>
        </div>
      </div>
    </header>
  );
}
