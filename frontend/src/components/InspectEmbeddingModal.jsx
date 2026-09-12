import React from 'react';
import { X, Cpu, Copy, Check } from 'lucide-react';

export default function InspectEmbeddingModal({ alert, onClose }) {
  const [copied, setCopied] = React.useState(false);

  if (!alert) return null;

  const embedding = alert.embedding || [];

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(embedding, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '640px' }} onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="panel-title-wrapper">
            <Cpu size={18} color="var(--accent-purple)" />
            <div>
              <div className="panel-title">128-D Acoustic Vector Embedding</div>
              <div className="panel-subtitle">{alert.threat_type} • {alert.device_id}</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
              Unit-normalized L2 feature vector (pgvector compatible)
            </span>
            <button
              className="btn-secondary"
              onClick={handleCopy}
              style={{ fontSize: '0.72rem', padding: '0.3rem 0.65rem' }}
            >
              {copied ? <Check size={13} color="var(--accent-emerald)" /> : <Copy size={13} />}
              <span>{copied ? 'Copied' : 'Copy JSON'}</span>
            </button>
          </div>

          {/* Visual Embedding Heatmap Bar */}
          <div style={{ display: 'flex', gap: '2px', height: '28px', background: '#f1f5f9', padding: '4px', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', overflowX: 'auto' }}>
            {embedding.slice(0, 128).map((val, idx) => {
              // Map -1..1 to intensity
              const intensity = Math.min(1, Math.max(0, (val + 1) / 2));
              const r = Math.round(124 + (1 - intensity) * 80);
              const g = Math.round(58 + (1 - intensity) * 140);
              const b = Math.round(237);
              return (
                <div
                  key={idx}
                  title={`Dim ${idx}: ${val.toFixed(4)}`}
                  style={{
                    flex: '1 0 3px',
                    height: '100%',
                    backgroundColor: `rgba(124, 58, 237, ${Math.max(0.15, intensity)})`,
                    borderRadius: '1px',
                  }}
                />
              );
            })}
          </div>

          {/* Code View */}
          <div
            style={{
              maxHeight: '220px',
              overflowY: 'auto',
              background: '#0f172a',
              padding: '0.85rem',
              borderRadius: 'var(--radius-sm)',
              fontFamily: 'var(--font-mono)',
              fontSize: '0.72rem',
              color: '#38bdf8',
              border: '1px solid var(--border-subtle)',
              lineHeight: 1.5,
            }}
          >
            <pre style={{ margin: 0 }}>
              {embedding.length > 0
                ? JSON.stringify(embedding, null, 2)
                : '/* No raw embedding payload attached to alert */'}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
}
