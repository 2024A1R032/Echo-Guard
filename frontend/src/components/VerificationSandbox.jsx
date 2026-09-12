import React, { useState } from 'react';
import { verifyAcousticForensics } from '../services/api';
import { useTelemetry } from '../context/TelemetryContext';
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  AlertOctagon, 
  Activity, 
  Zap, 
  Info, 
  ShieldCheck, 
  Layers,
  Volume2
} from 'lucide-react';

export const SAMPLE_AUDIO_PRESETS = [
  {
    id: 'CHAINSAW_HUSQVARNA',
    name: 'Chainsaw in Deep Canopy (Husqvarna 372XP)',
    type: 'CHAINSAW',
    category: 'THREAT',
    f0Expected: '240 Hz',
    harmonicsCount: '3 Multipliers (480Hz, 720Hz, 960Hz)',
    description: 'High-RPM 2-stroke internal combustion engine with steady mechanical blade pitch.',
    defaultConfidence: 0.96,
  },
  {
    id: 'GUNSHOT_BALLISTIC',
    name: 'Poacher High-Caliber Ballistic Impulse (.308 Win)',
    type: 'GUNSHOT',
    category: 'THREAT',
    f0Expected: '1250 Hz',
    harmonicsCount: 'Broadband Impulse',
    description: 'Sub-10ms supersonic transient shockwave with abrupt explosive rise time.',
    defaultConfidence: 0.94,
  },
  {
    id: 'VESSEL_OUTBOARD',
    name: 'Unauthorized High-Speed Outboard Intrusion Vessel',
    type: 'ILLEGAL_VESSEL',
    category: 'THREAT',
    f0Expected: '120 Hz',
    harmonicsCount: 'Blade Pass Multipliers (240Hz, 360Hz)',
    description: 'Hydroacoustic cavitation and steady propeller blade-pass tone on river boundary.',
    defaultConfidence: 0.91,
  },
  {
    id: 'WILDLIFE_MACAW',
    name: 'Harmless Scarlet Macaw Avian Vocalization (Control)',
    type: 'WILDLIFE',
    category: 'SAFE',
    f0Expected: '1800-4200 Hz (Modulated)',
    harmonicsCount: 'Biological Formants',
    description: 'Natural avian chirping with continuous non-mechanical frequency modulation.',
    defaultConfidence: 0.22,
  },
  {
    id: 'WEATHER_MONSOON',
    name: 'Ambient Amazon Monsoon Rainfall & Canopy Wind (Noise)',
    type: 'METEOROLOGICAL',
    category: 'SAFE',
    f0Expected: 'Diffuse Pink Noise',
    harmonicsCount: 'None (Random Dispersion)',
    description: 'Broadband stochastic rain noise without structured harmonic lines.',
    defaultConfidence: 0.15,
  }
];

export default function VerificationSandbox() {
  const [selectedSample, setSelectedSample] = useState(SAMPLE_AUDIO_PRESETS[0]);
  const [confidence, setConfidence] = useState(selectedSample.defaultConfidence);
  const [analyzing, setAnalyzing] = useState(false);
  const [forensicResult, setForensicResult] = useState(null);
  const [isPlayingSound, setIsPlayingSound] = useState(false);

  const { playAlertSound, triggerSimulationAlert } = useTelemetry();

  const handleSelectSample = (sample) => {
    setSelectedSample(sample);
    setConfidence(sample.defaultConfidence);
    setForensicResult(null);
  };

  const runDiagnosticProof = async () => {
    setAnalyzing(true);
    try {
      const data = await verifyAcousticForensics(selectedSample.type, confidence);
      setForensicResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setAnalyzing(false);
    }
  };

  const handlePlayAndInject = () => {
    setIsPlayingSound(true);
    playAlertSound(selectedSample.type);
    if (selectedSample.category === 'THREAT') {
      triggerSimulationAlert(selectedSample.type, 'NODE-ALPHA', confidence);
    }
    setTimeout(() => setIsPlayingSound(false), 800);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Top Banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--accent-cyan)' }}>
              <FlaskConical size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Instructor Acoustic Forensics & Verification Sandbox
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Scientifically test, inspect, and verify the physical bioacoustic engine and explainable AI (XAI) reason chain.
              </p>
            </div>
          </div>
          <div className="status-pill" style={{ color: 'var(--accent-emerald)', borderColor: 'rgba(5, 150, 105, 0.3)' }}>
            <ShieldCheck size={14} />
            <span>SCIENTIFIC VERIFICATION MODE</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 1fr', gap: '1.25rem' }}>
        {/* Left: Sample Sound Selectors */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.6rem' }}>
            <div className="panel-title-wrapper">
              <Activity size={18} color="var(--accent-cyan)" />
              <div className="panel-title">Select Test Bioacoustic Sound Profile</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
            {SAMPLE_AUDIO_PRESETS.map((sample) => {
              const isSelected = selectedSample.id === sample.id;
              const isThreat = sample.category === 'THREAT';

              return (
                <div
                  key={sample.id}
                  onClick={() => handleSelectSample(sample)}
                  style={{
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? '1.5px solid var(--accent-cyan)' : '1px solid var(--border-subtle)',
                    background: isSelected ? 'var(--accent-cyan-light)' : '#ffffff',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.3rem' }}>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', color: isSelected ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      {sample.name}
                    </span>
                    <span className={`threat-tag ${isThreat ? 'CHAINSAW' : 'WILDLIFE'}`} style={{ fontSize: '0.62rem' }}>
                      {sample.category}
                    </span>
                  </div>
                  <p style={{ fontSize: '0.74rem', color: 'var(--text-muted)', margin: '0 0 0.4rem 0' }}>
                    {sample.description}
                  </p>
                  <div style={{ display: 'flex', gap: '1.2rem', fontSize: '0.72rem', fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                    <span>Target $f_0$: {sample.f0Expected}</span>
                    <span>Harmonics: {sample.harmonicsCount}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Confidence Slider & Action Controls */}
          <div style={{ marginTop: '1.2rem', padding: '1rem', background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)' }}>
                Signal-to-Noise Inference Confidence: {(confidence * 100).toFixed(0)}%
              </span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.01"
              value={confidence}
              onChange={(e) => setConfidence(parseFloat(e.target.value))}
              style={{ width: '100%', accentColor: 'var(--accent-cyan)', marginBottom: '0.9rem' }}
            />

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button
                className="btn-primary"
                onClick={runDiagnosticProof}
                disabled={analyzing}
                style={{ flex: 1, padding: '0.55rem' }}
              >
                <Zap size={16} />
                <span>{analyzing ? 'Computing Physics Breakdown...' : 'Run Forensic Proof'}</span>
              </button>

              <button
                className="btn-secondary"
                onClick={handlePlayAndInject}
                style={{
                  padding: '0.55rem 0.9rem',
                  background: isPlayingSound ? 'rgba(2, 132, 199, 0.15)' : undefined,
                  borderColor: isPlayingSound ? 'var(--accent-cyan)' : undefined,
                }}
                title="Synthesize audio frequency and inject live onto radar grid"
              >
                <Volume2 size={16} />
                <span>Emit Sound</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: Forensic Explainability Proof Card */}
        <div className="glass-panel" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column' }}>
          <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.6rem' }}>
            <div className="panel-title-wrapper">
              <Info size={18} color="var(--accent-cyan)" />
              <div className="panel-title">Acoustic Physics & Verification Evidence</div>
            </div>
          </div>

          {!forensicResult ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', color: 'var(--text-muted)', padding: '2rem' }}>
              <FlaskConical size={36} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
              <p style={{ fontWeight: 600, fontSize: '0.85rem' }}>No Diagnostic Run Yet</p>
              <p style={{ fontSize: '0.75rem', maxWidth: '320px' }}>
                Select a test profile on the left and click <strong>"Run Forensic Proof"</strong> to generate the scientific physics verification breakdown.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {/* Verdict Header */}
              <div
                style={{
                  padding: '0.85rem 1rem',
                  borderRadius: 'var(--radius-sm)',
                  background: selectedSample.category === 'THREAT' ? '#fee2e2' : '#d1fae5',
                  border: `1px solid ${selectedSample.category === 'THREAT' ? 'rgba(225, 29, 72, 0.3)' : 'rgba(5, 150, 105, 0.3)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.75rem',
                }}
              >
                {selectedSample.category === 'THREAT' ? (
                  <AlertOctagon size={22} color="#e11d48" />
                ) : (
                  <CheckCircle2 size={22} color="#059669" />
                )}
                <div>
                  <div style={{ fontSize: '0.85rem', fontWeight: 800, color: selectedSample.category === 'THREAT' ? '#be123c' : '#047857' }}>
                    {selectedSample.category === 'THREAT' ? 'VERIFIED ANOMALOUS THREAT' : 'SAFE / HARMLESS AMBIENT SOUND'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: selectedSample.category === 'THREAT' ? '#9f1239' : '#065f46' }}>
                    {forensicResult.explainable_reasons.why_classified}
                  </div>
                </div>
              </div>

              {/* Physical Parameters Grid */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.65rem' }}>
                <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>FUNDAMENTAL FREQUENCY ($f_0$)</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>
                    {forensicResult.fundamental_frequency_hz} Hz
                  </div>
                </div>

                <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>TRANSIENT RISE TIME</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-blue)' }}>
                    {forensicResult.rise_time_ms} ms
                  </div>
                </div>

                <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>SPECTRAL FLATNESS</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-emerald)' }}>
                    {forensicResult.spectral_flatness}
                  </div>
                </div>

                <div style={{ padding: '0.65rem', background: '#f8fafc', borderRadius: 'var(--radius-sm)', border: '1px solid #e2e8f0' }}>
                  <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>HARMONIC-TO-NOISE RATIO</div>
                  <div style={{ fontSize: '1rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: 'var(--accent-amber)' }}>
                    {forensicResult.harmonic_to_noise_ratio_db} dB
                  </div>
                </div>
              </div>

              {/* Forensic Scientific Explainability Breakdown */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', fontSize: '0.75rem' }}>
                <div style={{ padding: '0.65rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                    🔬 Physical Source Mechanism:
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{forensicResult.physical_source_mechanism}</span>
                </div>

                <div style={{ padding: '0.65rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                    🌿 Why Not Wildlife?
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{forensicResult.explainable_reasons.why_not_wildlife}</span>
                </div>

                <div style={{ padding: '0.65rem', background: '#ffffff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)' }}>
                  <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                    🌧️ Why Not Thunder / Rain Noise?
                  </span>
                  <span style={{ color: 'var(--text-secondary)' }}>{forensicResult.explainable_reasons.why_not_weather}</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
