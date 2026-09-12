import React, { useState, useEffect, useRef } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Radio, Crosshair, Battery, Wifi, AlertTriangle } from 'lucide-react';

export default function TacticalRadar() {
  const { nodes, activeThreats, selectedNode, setSelectedNode } = useTelemetry();
  const [pulseThreats, setPulseThreats] = useState([]);
  const canvasRef = useRef(null);

  // Center coordinate of reserve (Amazon Basin perimeter)
  const centerLat = -3.4650;
  const centerLon = -62.2150;
  const scale = 3800; // coordinate to pixel scaling

  // Convert GPS to Radar Screen (x, y) coordinates
  const getScreenCoords = (lat, lon, width = 580, height = 460) => {
    const cx = width / 2;
    const cy = height / 2;
    const x = cx + (lon - centerLon) * scale;
    const y = cy - (lat - centerLat) * scale;
    return { x: Math.max(40, Math.min(width - 40, x)), y: Math.max(40, Math.min(height - 40, y)) };
  };

  // Trigger visual ripple on new threats
  useEffect(() => {
    if (activeThreats.length > 0) {
      const latest = activeThreats[0];
      const threatId = latest.id || `threat-${Date.now()}`;
      setPulseThreats((prev) => [latest, ...prev.slice(0, 4)]);

      const timeout = setTimeout(() => {
        setPulseThreats((prev) => prev.filter((t) => t.id !== threatId));
      }, 5000);
      return () => clearTimeout(timeout);
    }
  }, [activeThreats]);

  return (
    <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="panel-header">
        <div className="panel-title-wrapper">
          <Radio size={18} color="var(--accent-cyan)" />
          <div>
            <div className="panel-title">Tactical Bioacoustic Radar & Geospatial Grid</div>
            <div className="panel-subtitle">Amazon Conservation Sector 4B • Live Hydro/Acoustic Transducers</div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
            GRID: -3.465° N / -62.215° W
          </span>
          {selectedNode && (
            <button 
              className="btn-secondary" 
              style={{ fontSize: '0.72rem', padding: '0.25rem 0.55rem' }}
              onClick={() => setSelectedNode(null)}
            >
              Reset View
            </button>
          )}
        </div>
      </div>

      <div className="radar-container">
        {/* Animated Sweep Line */}
        <div className="radar-sweep" />

        {/* SVG Radar Grid & Sensor Nodes */}
        <svg
          viewBox="0 0 580 460"
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        >
          <defs>
            {/* Pulsing Threat Glow Animation */}
            <radialGradient id="threatGlowRed" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#e11d48" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#e11d48" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#e11d48" stopOpacity="0" />
            </radialGradient>
            <radialGradient id="threatGlowAmber" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.7" />
              <stop offset="50%" stopColor="#d97706" stopOpacity="0.3" />
              <stop offset="100%" stopColor="#d97706" stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* Concentric Radar Distance Rings */}
          <circle cx="290" cy="230" r="60" fill="none" stroke="rgba(2, 132, 199, 0.15)" strokeWidth="1" strokeDasharray="3 3" />
          <circle cx="290" cy="230" r="120" fill="none" stroke="rgba(2, 132, 199, 0.2)" strokeWidth="1" />
          <circle cx="290" cy="230" r="180" fill="none" stroke="rgba(2, 132, 199, 0.15)" strokeWidth="1" strokeDasharray="4 4" />
          <circle cx="290" cy="230" r="215" fill="none" stroke="rgba(2, 132, 199, 0.25)" strokeWidth="1.5" />

          {/* Crosshair Lines */}
          <line x1="75" y1="230" x2="505" y2="230" stroke="rgba(2, 132, 199, 0.15)" strokeWidth="1" />
          <line x1="290" y1="15" x2="290" y2="445" stroke="rgba(2, 132, 199, 0.15)" strokeWidth="1" />

          {/* Range Labels */}
          <text x="355" y="224" fill="#0284c7" fontSize="9" fontWeight="600" fontFamily="var(--font-mono)">1.0 KM</text>
          <text x="415" y="224" fill="#0284c7" fontSize="9" fontWeight="600" fontFamily="var(--font-mono)">2.0 KM</text>
          <text x="475" y="224" fill="#0284c7" fontSize="9" fontWeight="600" fontFamily="var(--font-mono)">3.0 KM</text>

          {/* Active Threat Shockwave Rings */}
          {pulseThreats.map((threat, idx) => {
            const coords = getScreenCoords(threat.latitude || centerLat, threat.longitude || centerLon);
            const isCritical = threat.threat_type === 'CHAINSAW' || threat.threat_type === 'GUNSHOT' || threat.threat_type === 'BLAST_FISHING';
            const color = isCritical ? '#e11d48' : '#0284c7';

            return (
              <g key={`pulse-${threat.id || idx}`}>
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="14"
                  fill={isCritical ? 'url(#threatGlowRed)' : 'url(#threatGlowAmber)'}
                />
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="28"
                  fill="none"
                  stroke={color}
                  strokeWidth="2"
                  opacity="0.8"
                >
                  <animate attributeName="r" from="10" to="55" dur="1.8s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.9" to="0" dur="1.8s" repeatCount="indefinite" />
                </circle>
                <circle
                  cx={coords.x}
                  cy={coords.y}
                  r="45"
                  fill="none"
                  stroke={color}
                  strokeWidth="1.2"
                  opacity="0.5"
                >
                  <animate attributeName="r" from="20" to="85" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" from="0.7" to="0" dur="1.8s" begin="0.4s" repeatCount="indefinite" />
                </circle>
              </g>
            );
          })}

          {/* Sensor Nodes */}
          {nodes.map((node) => {
            const { x, y } = getScreenCoords(node.lat, node.lon);
            const isSelected = selectedNode?.id === node.id;
            const hasRecentThreat = activeThreats.some((t) => t.device_id === node.id);

            return (
              <g
                key={node.id}
                style={{ cursor: 'pointer', transition: 'transform 0.2s' }}
                onClick={() => setSelectedNode(node)}
              >
                {/* Node outer glow */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 16 : 11}
                  fill={hasRecentThreat ? 'rgba(225, 29, 72, 0.15)' : 'rgba(2, 132, 199, 0.12)'}
                  stroke={hasRecentThreat ? '#e11d48' : '#0284c7'}
                  strokeWidth={isSelected ? 2.5 : 1.5}
                />
                {/* Node center point */}
                <circle
                  cx={x}
                  cy={y}
                  r={isSelected ? 6 : 4}
                  fill={hasRecentThreat ? '#e11d48' : '#059669'}
                />
                {/* Node Label Tag */}
                <rect
                  x={x - 38}
                  y={y + 13}
                  width="76"
                  height="18"
                  rx="4"
                  fill="#ffffff"
                  stroke={isSelected ? '#0284c7' : '#cbd5e1'}
                  strokeWidth={isSelected ? '1.5' : '1'}
                  filter="drop-shadow(0 1px 2px rgba(15, 23, 42, 0.08))"
                />
                <text
                  x={x}
                  y={y + 26}
                  textAnchor="middle"
                  fill={isSelected ? '#0284c7' : '#0f172a'}
                  fontSize="8.5"
                  fontWeight="700"
                  fontFamily="var(--font-mono)"
                >
                  {node.id}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Selected Node Floating HUD */}
        {selectedNode && (
          <div
            style={{
              position: 'absolute',
              bottom: '1rem',
              left: '1rem',
              background: 'rgba(255, 255, 255, 0.95)',
              backdropFilter: 'blur(12px)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '0.9rem 1.2rem',
              minWidth: '240px',
              boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.1)',
              zIndex: 10,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
              <span style={{ fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)', fontSize: '0.9rem' }}>
                {selectedNode.id}
              </span>
              <span className="brand-badge" style={{ fontSize: '0.65rem' }}>
                {selectedNode.status}
              </span>
            </div>
            <div style={{ fontSize: '0.76rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.35rem' }}>
              {selectedNode.name}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
              <span>Lat: {selectedNode.lat.toFixed(4)}</span>
              <span>Lon: {selectedNode.lon.toFixed(4)}</span>
            </div>
            <div style={{ display: 'flex', gap: '1.2rem', marginTop: '0.5rem', paddingTop: '0.5rem', borderTop: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: selectedNode.battery > 20 ? 'var(--accent-emerald)' : 'var(--accent-red)', fontWeight: 600 }}>
                <Battery size={14} /> {selectedNode.battery.toFixed(0)}%
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', color: 'var(--accent-blue)', fontWeight: 600 }}>
                <Wifi size={14} /> {selectedNode.signal}%
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
