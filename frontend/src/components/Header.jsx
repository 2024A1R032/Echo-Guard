import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Volume2, VolumeX, Bell, FlaskConical } from 'lucide-react';

export default function Header({ title, description, onOpenDispatch }) {
  const { wsConnected, audioEnabled, setAudioEnabled, testAlarmSound, triggerSimulationAlert } = useTelemetry();
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString().slice(17, 25));
  const [testSent, setTestSent] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleTestAlert = () => {
    setTestSent(true);
    testAlarmSound();
    triggerSimulationAlert('CHAINSAW', 'NODE-ALPHA', 0.98);
    setTimeout(() => setTestSent(false), 1500);
  };

  return (
    <header className="app-header">
      <div className="topbar-title">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="header-status-group">
        <button
          type="button"
          className="btn-secondary"
          onClick={handleTestAlert}
          aria-label="Send test alert"
          title="Play the alert sound and add a test chainsaw detection"
        >
          <Bell size={15} aria-hidden="true" />
          <span>{testSent ? 'Test alert sent' : 'Send test alert'}</span>
        </button>

        <button
          type="button"
          className="btn-secondary"
          onClick={onOpenDispatch}
          aria-label="Simulate incident"
        >
          <FlaskConical size={15} aria-hidden="true" />
          <span>Simulate incident</span>
        </button>

        <button
          type="button"
          className="icon-btn"
          onClick={() => setAudioEnabled(!audioEnabled)}
          aria-label={audioEnabled ? 'Mute alert sound' : 'Unmute alert sound'}
          aria-pressed={!audioEnabled}
          title={audioEnabled ? 'Mute alert sound' : 'Unmute alert sound'}
        >
          {audioEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
        </button>

        <div className="status-pill" role="status">
          <span className={`status-indicator ${wsConnected ? 'online' : 'offline'}`} aria-hidden="true" />
          <span>{wsConnected ? 'Live' : 'Reconnecting'}</span>
        </div>

        <div className="status-pill is-clock">{currentTime} UTC</div>
      </div>
    </header>
  );
}
