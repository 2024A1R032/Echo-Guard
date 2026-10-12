import React from 'react';
import { Shield } from 'lucide-react';
import { useTelemetry } from '../context/TelemetryContext';
import { VIEWS } from '../views';

export default function SideNav({ activeTab, setActiveTab }) {
  const { nodes, wsConnected } = useTelemetry();
  const onlineNodes = nodes.filter((n) => n.battery > 10).length;

  return (
    <aside className="side-nav">
      <div className="brand-section">
        <div className="brand-icon-wrapper" aria-hidden="true">
          <Shield size={18} />
        </div>
        <div>
          <span className="brand-title">EchoGuard</span>
          <span className="brand-tagline">Wildlife acoustic monitoring</span>
        </div>
      </div>

      <nav aria-label="Main">
        <ul className="nav-list">
          {VIEWS.map(({ id, label, icon: Icon }) => (
            <li key={id}>
              <button
                type="button"
                className="nav-item"
                aria-current={activeTab === id ? 'page' : undefined}
                aria-label={label}
                title={label}
                onClick={() => setActiveTab(id)}
              >
                <Icon size={18} aria-hidden="true" />
                <span className="nav-label">{label}</span>
                {id === 'swarm' && <span className="nav-count">{onlineNodes}</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="nav-footer">
        <strong>{onlineNodes} of {nodes.length} sensors online</strong>
        {wsConnected ? 'Receiving live detections' : 'Reconnecting to the live feed'}
      </div>
    </aside>
  );
}
