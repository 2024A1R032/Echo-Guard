import React, { useState, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Volume2, VolumeX } from 'lucide-react';
import DemoMenu from './DemoMenu';

export default function Header({ title, description, onOpenDispatch }) {
  const { wsConnected, audioEnabled, setAudioEnabled } = useTelemetry();
  const [currentTime, setCurrentTime] = useState(new Date().toUTCString().slice(17, 25));

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date().toUTCString().slice(17, 25));
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <header className="app-header">
      <div className="topbar-title">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>

      <div className="header-status-group">
        <div className="status-pill" role="status">
          <span className={`status-indicator ${wsConnected ? 'online' : 'offline'}`} aria-hidden="true" />
          <span>{wsConnected ? 'Live' : 'Reconnecting'}</span>
        </div>

        <div className="status-pill is-clock">{currentTime} UTC</div>

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

        <DemoMenu onOpenDispatch={onOpenDispatch} />
      </div>
    </header>
  );
}
