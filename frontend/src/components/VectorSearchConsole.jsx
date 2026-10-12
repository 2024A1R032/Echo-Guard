import React, { useState } from 'react';
import { searchAcousticThreats } from '../services/api';
import { Cpu, Search, Sparkles, Database, ArrowRight, CheckCircle2 } from 'lucide-react';
import { threatLabel } from '../utils/threat';

const PRESET_SIGNATURES = [
  {
    name: 'Chainsaw Two-Stroke Resonance (450Hz)',
    type: 'CHAINSAW',
    description: 'High-frequency harmonic buzz characteristic of illegal timber logging equipment.',
    seedFactor: 1.0,
  },
  {
    name: 'High-Caliber Rifle Transient (Gunshot)',
    type: 'GUNSHOT',
    description: 'Sharp acoustic shockwave impulse from anti-poaching perimeter intrusion.',
    seedFactor: 1.15,
  },
  {
    name: 'Blast Fishing Underwater Reverberation',
    type: 'BLAST_FISHING',
    description: 'Low-frequency hydroacoustic shockwave propagating through marine reefs.',
    seedFactor: 0.9,
  },
  {
    name: 'Illegal Outboard Vessel Cavitation',
    type: 'ILLEGAL_VESSEL',
    description: 'Continuous dual-propeller acoustic cavitation in marine sanctuary zone.',
    seedFactor: 1.05,
  },
];

// Helper to generate a 128-D synthetic unit vector client-side matching backend
function generateClientVector(threatType, seedFactor = 1.0) {
  let baseHash = 0;
  for (let i = 0; i < threatType.length; i++) {
    baseHash = (baseHash * 31 + threatType.charCodeAt(i)) % 1000000007;
  }
  const vector = [];
  let sumSq = 0;
  for (let i = 0; i < 128; i++) {
    const val = Math.sin(baseHash + i * seedFactor) * Math.cos(i * 0.1);
    vector.push(val);
    sumSq += val * val;
  }
  const norm = Math.sqrt(sumSq) || 1.0;
  return vector.map((v) => Number((v / norm).toFixed(6)));
}

export default function VectorSearchConsole() {
  const [selectedPreset, setSelectedPreset] = useState(PRESET_SIGNATURES[0]);
  const [topK, setTopK] = useState(5);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);
    try {
      const queryVec = generateClientVector(selectedPreset.type, selectedPreset.seedFactor);
      const matches = await searchAcousticThreats(queryVec, topK);
      setResults(matches);
    } catch (err) {
      console.error('[Vector Search Error]:', err);
      setError('Unable to perform vector search. Ensure the FastAPI backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: '1.5rem' }}>
      {/* Left Search Configuration Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div className="panel-title-wrapper">
          <Cpu size={20} color="var(--accent-cyan)" />
          <div>
            <div className="panel-title">Similar sound search</div>
            <div className="panel-subtitle">Compares each sound’s 128-value fingerprint</div>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'block', marginBottom: '0.5rem' }}>
            Choose a sound to search for
          </label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {PRESET_SIGNATURES.map((preset) => {
              const isSelected = selectedPreset.name === preset.name;
              return (
                <div
                  key={preset.name}
                  onClick={() => setSelectedPreset(preset)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-md)',
                    border: isSelected ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--accent-cyan-light)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    boxShadow: isSelected ? '0 2px 8px rgba(31, 90, 58, 0.12)' : '0 1px 2px rgba(22, 36, 27, 0.03)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {preset.name}
                    </span>
                    <span className={`threat-tag ${preset.type}`} style={{ fontSize: '0.75rem' }}>
                      {threatLabel(preset.type)}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                    {preset.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
              Number of matches
            </label>
            <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.35rem' }}>
              {[3, 5, 10, 20].map((k) => (
                <button
                  key={k}
                  onClick={() => setTopK(k)}
                  style={{
                    padding: '0.3rem 0.75rem',
                    borderRadius: '4px',
                    border: topK === k ? '1px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: topK === k ? '#e4efe8' : '#ffffff',
                    color: topK === k ? 'var(--accent-cyan)' : 'var(--text-secondary)',
                    fontFamily: 'var(--font-mono)',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                    cursor: 'pointer',
                  }}
                >
                  {k}
                </button>
              ))}
            </div>
          </div>

          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={loading}
            style={{ padding: '0.65rem 1.35rem' }}
          >
            <Search size={16} />
            <span>{loading ? 'Searching...' : 'Find similar sounds'}</span>
          </button>
        </div>
      </div>

      {/* Right Results Panel */}
      <div className="glass-panel" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column' }}>
        <div className="panel-title-wrapper" style={{ marginBottom: '1rem' }}>
          <Database size={18} color="var(--accent-cyan)" />
          <div>
            <div className="panel-title">Closest matches</div>
            <div className="panel-subtitle">Lower distance means a closer match (0 is identical)</div>
          </div>
        </div>

        {error && (
          <div style={{ padding: '1rem', background: '#f8dedb', border: '1px solid rgba(220, 38, 38, 0.3)', borderRadius: 'var(--radius-md)', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600 }}>
            {error}
          </div>
        )}

        {!results && !error && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '3rem 1rem' }}>
            <Sparkles size={36} style={{ margin: '0 auto 0.75rem', opacity: 0.6, color: 'var(--accent-cyan)' }} />
            <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>No search yet</div>
            <div style={{ fontSize: '0.78rem', marginTop: '0.35rem' }}>
              Choose a sound on the left, then select “Find similar sounds”.
            </div>
          </div>
        )}

        {results && results.length === 0 && (
          <div style={{ margin: 'auto', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem 1rem' }}>
            No recorded vector embeddings in database yet. Ingest alerts first using the simulator.
          </div>
        )}

        {results && results.length > 0 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', overflowY: 'auto', maxHeight: '520px' }}>
            {results.map((match, idx) => {
              const distance = match.distance !== undefined ? match.distance : 0.05;
              const similarityScore = Math.max(0, Math.min(100, Math.round((1 - distance) * 100)));

              return (
                <div
                  key={match.id || idx}
                  style={{
                    background: '#ffffff',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                    padding: '0.85rem 1.15rem',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '0.5rem',
                    boxShadow: '0 1px 3px rgba(22, 36, 27, 0.04)',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ fontSize: '0.75rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--text-muted)' }}>
                        #{idx + 1}
                      </span>
                      <span className={`threat-tag ${match.threat_type}`}>{threatLabel(match.threat_type)}</span>
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                        {match.device_id}
                      </span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'var(--font-mono)', fontWeight: 600, color: 'var(--accent-cyan)' }}>
                        Dist: {distance.toFixed(4)}
                      </span>
                      <span className="brand-badge" style={{ background: 'var(--accent-cyan-light)', color: 'var(--accent-cyan)', borderColor: 'rgba(91, 106, 154, 0.3)' }}>
                        {similarityScore}% MATCH
                      </span>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.74rem', color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                    <span>Lat: {match.latitude?.toFixed(4)} Lon: {match.longitude?.toFixed(4)}</span>
                    <span>{match.timestamp ? new Date(match.timestamp).toLocaleString() : ''}</span>
                  </div>

                  {/* Similarity Bar */}
                  <div style={{ height: '5px', background: '#dce2db', borderRadius: '3px', overflow: 'hidden' }}>
                    <div
                      style={{
                        height: '100%',
                        width: `${similarityScore}%`,
                        background: 'var(--accent-cyan)',
                        borderRadius: '3px',
                      }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
