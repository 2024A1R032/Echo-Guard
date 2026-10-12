import React, { useState } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { X, Bell, Zap, ShieldAlert } from 'lucide-react';
import { threatLabel } from '../utils/threat';

export default function QuickDispatchModal({ isOpen, onClose }) {
  const { nodes, triggerSimulationAlert } = useTelemetry();
  const [selectedThreat, setSelectedThreat] = useState('CHAINSAW');
  const [selectedNodeId, setSelectedNodeId] = useState('NODE-ALPHA');
  const [confidence, setConfidence] = useState(0.96);
  const [sending, setSending] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const threats = [
    { type: 'CHAINSAW', name: 'Illegal Chainsaw Logging', desc: 'Deforestation activity in protected canopy.' },
    { type: 'GUNSHOT', name: 'Poacher Gunshot Impulse', desc: 'Ballistic acoustic transient detected.' },
    { type: 'ILLEGAL_VESSEL', name: 'Unauthorized Maritime Vessel', desc: 'Restricted waterway boat engine.' },
    { type: 'BLAST_FISHING', name: 'Dynamite Blast Fishing', desc: 'Reef shockwave blast acoustic signature.' },
    { type: 'VEHICLE_ENGINE', name: 'Off-Road Intrusion Vehicle', desc: 'Heavy diesel transport on perimeter road.' },
  ];

  const handleDispatch = async () => {
    setSending(true);
    setSuccessMsg('');
    try {
      await triggerSimulationAlert(selectedThreat, selectedNodeId, confidence);
      setSuccessMsg(`Alert sent. It now appears in the live feed.`);
      setTimeout(() => {
        onClose();
      }, 1200);
    } catch (err) {
      console.error(err);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-title-wrapper">
            <Bell size={18} color="var(--accent-cyan)" />
            <div className="panel-title">Simulate an incident</div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Threat Selection */}
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
              Threat type
            </label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0.5rem' }}>
              {threats.map((t) => (
                <div
                  key={t.type}
                  onClick={() => setSelectedThreat(t.type)}
                  style={{
                    padding: '0.65rem 0.85rem',
                    borderRadius: 'var(--radius-sm)',
                    border: selectedThreat === t.type ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: selectedThreat === t.type ? 'var(--accent-cyan-light)' : '#ffffff',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: 700, color: selectedThreat === t.type ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {t.name}
                    </div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>{t.desc}</div>
                  </div>
                  <span className={`threat-tag ${t.type}`} style={{ fontSize: '0.75rem' }}>
                    {threatLabel(t.type)}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Node selection & confidence slider */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Sensor
              </label>
              <select
                value={selectedNodeId}
                onChange={(e) => setSelectedNodeId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.55rem',
                  background: '#ffffff',
                  border: '1px solid var(--border-medium)',
                  borderRadius: 'var(--radius-sm)',
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-mono)',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                }}
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.id}>
                    {n.id} ({n.name})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.4rem' }}>
                Confidence: {(confidence * 100).toFixed(0)}%
              </label>
              <input
                type="range"
                min="0.5"
                max="1.0"
                step="0.01"
                value={confidence}
                onChange={(e) => setConfidence(parseFloat(e.target.value))}
                style={{ width: '100%', marginTop: '0.4rem', accentColor: 'var(--accent-cyan)' }}
              />
            </div>
          </div>

          {successMsg && (
            <div style={{ padding: '0.75rem', background: '#d1fae5', border: '1px solid rgba(46, 125, 79, 0.3)', borderRadius: 'var(--radius-sm)', color: 'var(--accent-emerald)', fontSize: '0.8rem', fontWeight: 700, textAlign: 'center' }}>
              {successMsg}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn-secondary" onClick={onClose} disabled={sending}>
              Cancel
            </button>
            <button className="btn-primary" onClick={handleDispatch} disabled={sending}>
              <Zap size={15} />
              <span>{sending ? 'Sending alert…' : 'Send alert'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
