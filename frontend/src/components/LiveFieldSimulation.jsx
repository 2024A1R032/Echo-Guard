import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import {
  Play,
  Square,
  TreePine,
  Crosshair,
  Ship,
  Bomb,
  Bird,
  Activity,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Volume2,
  Radio,
  Shield,
  Waves,
  Zap,
  ChevronRight,
} from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://127.0.0.1:8000';

/* ------------------------------------------------------------------ */
/*  Scenario card config (icons, colors, gradient styling)            */
/* ------------------------------------------------------------------ */
const SCENARIO_STYLE = {
  illegal_logging_dawn: {
    icon: TreePine,
    gradient: 'linear-gradient(135deg, #1a3a2a 0%, #2d5a3d 50%, #4a7a5a 100%)',
    accentColor: '#4ade80',
    borderColor: 'rgba(74, 222, 128, 0.3)',
    tagBg: 'rgba(74, 222, 128, 0.15)',
  },
  poacher_ambush: {
    icon: Crosshair,
    gradient: 'linear-gradient(135deg, #3a1a1a 0%, #5a2d2d 50%, #7a4a4a 100%)',
    accentColor: '#f87171',
    borderColor: 'rgba(248, 113, 113, 0.3)',
    tagBg: 'rgba(248, 113, 113, 0.15)',
  },
  illegal_fishing_vessel: {
    icon: Ship,
    gradient: 'linear-gradient(135deg, #1a2a3a 0%, #2d4a5a 50%, #4a6a7a 100%)',
    accentColor: '#38bdf8',
    borderColor: 'rgba(56, 189, 248, 0.3)',
    tagBg: 'rgba(56, 189, 248, 0.15)',
  },
  blast_fishing_reef: {
    icon: Bomb,
    gradient: 'linear-gradient(135deg, #2a1a3a 0%, #4a2d5a 50%, #6a4a7a 100%)',
    accentColor: '#c084fc',
    borderColor: 'rgba(192, 132, 252, 0.3)',
    tagBg: 'rgba(192, 132, 252, 0.15)',
  },
  safe_wildlife_dawn_chorus: {
    icon: Bird,
    gradient: 'linear-gradient(135deg, #1a3a2a 0%, #2a5a3a 50%, #3a7a4a 100%)',
    accentColor: '#34d399',
    borderColor: 'rgba(52, 211, 153, 0.3)',
    tagBg: 'rgba(52, 211, 153, 0.15)',
  },
};

/* ------------------------------------------------------------------ */
/*  Mini waveform canvas                                              */
/* ------------------------------------------------------------------ */
function WaveformCanvas({ waveformData, progress, accentColor, isPlaying, height = 80 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const draw = () => {
      const w = rect.width;
      const h = rect.height;
      ctx.clearRect(0, 0, w, h);

      if (!waveformData || waveformData.length === 0) {
        // Idle state — draw flat line with subtle pulse
        ctx.strokeStyle = 'rgba(102, 117, 107, 0.2)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(0, h / 2);
        ctx.lineTo(w, h / 2);
        ctx.stroke();
        ctx.setLineDash([]);
        return;
      }

      const centerY = h / 2;
      const barWidth = w / waveformData.length;
      const progressX = progress * w;

      // Draw waveform bars
      for (let i = 0; i < waveformData.length; i++) {
        const x = i * barWidth;
        const amp = Math.abs(waveformData[i]) * centerY * 0.9;
        const isPast = x < progressX;

        if (isPast) {
          ctx.fillStyle = accentColor || '#4ade80';
          ctx.globalAlpha = 0.85;
        } else {
          ctx.fillStyle = '#66756b';
          ctx.globalAlpha = 0.25;
        }

        const bw = Math.max(1.5, barWidth - 1);
        ctx.fillRect(x, centerY - amp, bw, amp * 2 || 1);
      }
      ctx.globalAlpha = 1.0;

      // Playhead line
      if (isPlaying && progress > 0) {
        ctx.strokeStyle = accentColor || '#4ade80';
        ctx.lineWidth = 2;
        ctx.shadowColor = accentColor || '#4ade80';
        ctx.shadowBlur = 8;
        ctx.beginPath();
        ctx.moveTo(progressX, 0);
        ctx.lineTo(progressX, h);
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      if (isPlaying) {
        animRef.current = requestAnimationFrame(draw);
      }
    };

    draw();
    if (isPlaying) {
      animRef.current = requestAnimationFrame(draw);
    }

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [waveformData, progress, accentColor, isPlaying, height]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: '100%', height: `${height}px`, display: 'block', borderRadius: 'var(--radius-sm)' }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Real-time spectrogram canvas                                      */
/* ------------------------------------------------------------------ */
function LiveSpectrogram({ analyserNode, isPlaying, accentColor, height = 64 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const historyRef = useRef([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !analyserNode || !isPlaying) return;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const bufLen = analyserNode.frequencyBinCount;
    const dataArray = new Uint8Array(bufLen);
    const maxCols = Math.floor(rect.width);

    const draw = () => {
      analyserNode.getByteFrequencyData(dataArray);

      // Take a vertical slice of frequency data
      const slice = [];
      const binsToShow = Math.min(bufLen, 80);
      for (let i = 0; i < binsToShow; i++) {
        slice.push(dataArray[i]);
      }
      historyRef.current.push(slice);
      if (historyRef.current.length > maxCols) {
        historyRef.current.shift();
      }

      const w = rect.width;
      const h = rect.height;
      ctx.fillStyle = '#0d1a12';
      ctx.fillRect(0, 0, w, h);

      const colW = Math.max(1, w / maxCols);
      const rowH = h / binsToShow;

      for (let x = 0; x < historyRef.current.length; x++) {
        const col = historyRef.current[x];
        for (let y = 0; y < col.length; y++) {
          const val = col[y] / 255;
          if (val < 0.05) continue;
          const r = Math.floor(val * 80 + (1 - val) * 13);
          const g = Math.floor(val * 255 * 0.7 + (1 - val) * 26);
          const b = Math.floor(val * 100 + (1 - val) * 18);
          ctx.fillStyle = `rgb(${r},${g},${b})`;
          ctx.globalAlpha = Math.min(1, val * 1.5);
          ctx.fillRect(x * colW, h - (y + 1) * rowH, colW + 0.5, rowH + 0.5);
        }
      }
      ctx.globalAlpha = 1;

      animRef.current = requestAnimationFrame(draw);
    };

    animRef.current = requestAnimationFrame(draw);
    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
    };
  }, [analyserNode, isPlaying, accentColor, height]);

  // Clear history when not playing
  useEffect(() => {
    if (!isPlaying) historyRef.current = [];
  }, [isPlaying]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: '100%',
        height: `${height}px`,
        display: 'block',
        borderRadius: 'var(--radius-sm)',
        background: '#0d1a12',
      }}
    />
  );
}


/* ------------------------------------------------------------------ */
/*  Detection timeline — shows sensor detection events during playback*/
/* ------------------------------------------------------------------ */
function DetectionTimeline({ events, accentColor }) {
  if (!events || events.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      {events.map((evt, i) => (
        <div
          key={i}
          className="sim-detection-event"
          style={{
            animation: `slideInLeft 0.4s ease ${i * 0.15}s both`,
            borderLeft: `3px solid ${accentColor}`,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{
              width: 8, height: 8, borderRadius: '50%',
              background: accentColor,
              boxShadow: `0 0 8px ${accentColor}`,
              animation: 'pulse 1.5s ease infinite',
            }} />
            <span style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-primary)' }}>
              {evt.title}
            </span>
            <span style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginLeft: 'auto' }}>
              {evt.time}
            </span>
          </div>
          <p style={{ fontSize: '0.72rem', color: 'var(--text-secondary)', margin: '0.2rem 0 0 1.1rem' }}>
            {evt.detail}
          </p>
        </div>
      ))}
    </div>
  );
}


/* ------------------------------------------------------------------ */
/*  Main component                                                    */
/* ------------------------------------------------------------------ */
export default function LiveFieldSimulation() {
  const [scenarios, setScenarios] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [phase, setPhase] = useState('idle'); // idle | loading | playing | analyzing | results
  const [audioProgress, setAudioProgress] = useState(0);
  const [waveformData, setWaveformData] = useState(null);
  const [classification, setClassification] = useState(null);
  const [forensics, setForensics] = useState(null);
  const [detectionEvents, setDetectionEvents] = useState([]);
  const [analyserNode, setAnalyserNode] = useState(null);
  const [scenarioMeta, setScenarioMeta] = useState(null);

  const audioCtxRef = useRef(null);
  const sourceRef = useRef(null);
  const progressTimerRef = useRef(null);

  const { triggerSimulationAlert, playAlertSound } = useTelemetry();

  // Fetch scenario list on mount
  useEffect(() => {
    fetch(`${API_BASE}/api/v1/simulation/scenarios`)
      .then((r) => r.json())
      .then((data) => {
        setScenarios(data.scenarios || []);
        if (data.scenarios && data.scenarios.length > 0) {
          setSelectedId(data.scenarios[0].id);
        }
      })
      .catch(() => {
        // Fallback: hardcoded scenario list
        const fallback = [
          { id: 'illegal_logging_dawn', title: '🪓 Illegal Logging at Dawn', description: 'Chainsaw in protected zone', threat_type: 'CHAINSAW', severity: 'HIGH', duration_sec: 8, node_id: 'NODE-ALPHA', location: { lat: -3.4653, lon: -62.2159, name: 'Alpha Reserve North' } },
          { id: 'poacher_ambush', title: '🔫 Poacher Ambush — Rifle Shots', description: 'High-caliber rifle shots in canopy', threat_type: 'GUNSHOT', severity: 'CRITICAL', duration_sec: 8, node_id: 'NODE-CHARLIE', location: { lat: -3.4501, lon: -62.2341, name: 'Charlie Canopy Perimeter' } },
          { id: 'illegal_fishing_vessel', title: '🚤 Unauthorized Speedboat', description: 'Outboard motor in marine sanctuary', threat_type: 'ILLEGAL_VESSEL', severity: 'HIGH', duration_sec: 8, node_id: 'NODE-DELTA', location: { lat: -3.4735, lon: -62.2510, name: 'Delta Marine Sanctuary' } },
          { id: 'blast_fishing_reef', title: '💥 Blast Fishing — Detonation', description: 'Underwater explosive detected', threat_type: 'BLAST_FISHING', severity: 'CRITICAL', duration_sec: 8, node_id: 'NODE-ECHO', location: { lat: -3.4920, lon: -62.2215, name: 'Echo Deep Rainforest' } },
          { id: 'safe_wildlife_dawn_chorus', title: '🦜 Safe — Dawn Wildlife Chorus', description: 'Healthy ecosystem baseline', threat_type: 'WILDLIFE', severity: 'NONE', duration_sec: 8, node_id: 'NODE-BRAVO', location: { lat: -3.4812, lon: -62.1984, name: 'Bravo River Outpost' } },
        ];
        setScenarios(fallback);
        setSelectedId(fallback[0].id);
      });
  }, []);

  const selectedScenario = scenarios.find((s) => s.id === selectedId);
  const style = selectedId ? SCENARIO_STYLE[selectedId] || SCENARIO_STYLE.illegal_logging_dawn : SCENARIO_STYLE.illegal_logging_dawn;
  const Icon = style.icon;

  const stopPlayback = useCallback(() => {
    if (sourceRef.current) {
      try { sourceRef.current.stop(); } catch {}
      sourceRef.current = null;
    }
    if (progressTimerRef.current) {
      clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }
    setAnalyserNode(null);
  }, []);

  const startSimulation = useCallback(async () => {
    if (!selectedId || !selectedScenario) return;

    stopPlayback();
    setPhase('loading');
    setClassification(null);
    setForensics(null);
    setDetectionEvents([]);
    setAudioProgress(0);
    setWaveformData(null);

    try {
      // Step 1: Fetch audio preview (includes base64 WAV + waveform)
      const previewRes = await fetch(`${API_BASE}/api/v1/simulation/scenarios/${selectedId}/preview`);
      if (!previewRes.ok) throw new Error('Failed to load audio');
      const previewData = await previewRes.json();

      setWaveformData(previewData.waveform_preview);
      setScenarioMeta(previewData.scenario);

      // Step 2: Decode and play audio
      const wavBytes = Uint8Array.from(atob(previewData.wav_base64), (c) => c.charCodeAt(0));
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!audioCtxRef.current) {
        audioCtxRef.current = new AudioCtx();
      }
      const ctx = audioCtxRef.current;
      if (ctx.state === 'suspended') await ctx.resume();

      const audioBuffer = await ctx.decodeAudioData(wavBytes.buffer);
      const source = ctx.createBufferSource();
      source.buffer = audioBuffer;

      // Create analyser for live spectrogram
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.75;
      source.connect(analyser);
      analyser.connect(ctx.destination);

      sourceRef.current = source;
      setAnalyserNode(analyser);
      setPhase('playing');

      const duration = audioBuffer.duration;
      const startTime = ctx.currentTime;
      source.start(0);

      // Progress tracking
      progressTimerRef.current = setInterval(() => {
        const elapsed = ctx.currentTime - startTime;
        const prog = Math.min(1, elapsed / duration);
        setAudioProgress(prog);

        // Simulate detection events at key points
        if (selectedScenario.threat_type !== 'WILDLIFE') {
          if (elapsed > duration * 0.3 && elapsed < duration * 0.35) {
            setDetectionEvents((prev) => {
              if (prev.length === 0) {
                return [{
                  title: `Sensor ${selectedScenario.node_id} — anomaly detected`,
                  detail: `Acoustic pattern deviation exceeds baseline threshold at ${selectedScenario.location.name}`,
                  time: `+${Math.floor(elapsed)}s`,
                }];
              }
              return prev;
            });
          }
          if (elapsed > duration * 0.5 && elapsed < duration * 0.55) {
            setDetectionEvents((prev) => {
              if (prev.length === 1) {
                return [...prev, {
                  title: `Threat classified: ${selectedScenario.threat_type}`,
                  detail: `YAMNet confidence above dispatch threshold. Triangulating with adjacent sensors.`,
                  time: `+${Math.floor(elapsed)}s`,
                }];
              }
              return prev;
            });
          }
          if (elapsed > duration * 0.7 && elapsed < duration * 0.75) {
            setDetectionEvents((prev) => {
              if (prev.length === 2) {
                playAlertSound(selectedScenario.threat_type);
                triggerSimulationAlert(
                  selectedScenario.threat_type,
                  selectedScenario.node_id,
                  0.94
                );
                return [...prev, {
                  title: '🚨 Alert dispatched to ranger units',
                  detail: `Live alert broadcast to dashboard. Incident logged and embedding stored.`,
                  time: `+${Math.floor(elapsed)}s`,
                }];
              }
              return prev;
            });
          }
        } else {
          // Safe scenario
          if (elapsed > duration * 0.5 && elapsed < duration * 0.55) {
            setDetectionEvents((prev) => {
              if (prev.length === 0) {
                return [{
                  title: 'All sensors report normal conditions',
                  detail: 'Acoustic signature matches known wildlife baseline. No threat detected.',
                  time: `+${Math.floor(elapsed)}s`,
                }];
              }
              return prev;
            });
          }
        }
      }, 100);

      source.onended = () => {
        clearInterval(progressTimerRef.current);
        setAudioProgress(1);
        setPhase('analyzing');

        // Step 3: Run ML classification
        fetch(`${API_BASE}/api/v1/simulation/scenarios/${selectedId}/classify`, { method: 'POST' })
          .then((r) => r.json())
          .then((data) => {
            setClassification(data.classification);
            setForensics(data.forensics);
            setPhase('results');
          })
          .catch(() => {
            // Fallback mock results
            setClassification({
              threat_type: selectedScenario.threat_type,
              confidence: selectedScenario.threat_type === 'WILDLIFE' ? 0.12 : 0.93,
              pipeline: { model: 'Fallback DSP Heuristic', sample_rate_hz: 16000 },
            });
            setPhase('results');
          });
      };
    } catch (err) {
      console.error('Simulation error:', err);
      setPhase('idle');
    }
  }, [selectedId, selectedScenario, stopPlayback, playAlertSound, triggerSimulationAlert]);

  const handleStop = () => {
    stopPlayback();
    setPhase('idle');
    setAudioProgress(0);
    setDetectionEvents([]);
  };

  const isActive = phase !== 'idle';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header banner */}
      <div className="glass-panel" style={{ padding: '1.25rem 1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.8rem' }}>
            <div className="stat-icon-wrapper" style={{ background: 'rgba(31, 90, 58, 0.1)', color: 'var(--accent-cyan)' }}>
              <Radio size={24} />
            </div>
            <div>
              <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Live field simulation
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', margin: '0.2rem 0 0 0' }}>
                Play realistic rainforest audio scenarios and watch the sensor grid detect threats in real time.
              </p>
            </div>
          </div>
          <div className="status-pill" style={{ color: isActive ? style.accentColor : 'var(--accent-emerald)', borderColor: isActive ? style.borderColor : 'rgba(46, 125, 79, 0.3)' }}>
            {phase === 'playing' && <><Volume2 size={14} /> <span>Playing audio</span></>}
            {phase === 'analyzing' && <><Loader2 size={14} className="spin-icon" /> <span>Classifying</span></>}
            {phase === 'results' && <><CheckCircle2 size={14} /> <span>Analysis complete</span></>}
            {phase === 'loading' && <><Loader2 size={14} className="spin-icon" /> <span>Loading</span></>}
            {phase === 'idle' && <><Shield size={14} /> <span>Ready</span></>}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '1.25rem' }}>
        {/* Left: Scenario picker */}
        <div className="glass-panel" style={{ padding: '1.25rem' }}>
          <div className="panel-header" style={{ marginBottom: '1rem', paddingBottom: '0.6rem' }}>
            <div className="panel-title-wrapper">
              <Activity size={18} color="var(--accent-cyan)" />
              <div className="panel-title">Choose a scenario</div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {scenarios.map((sc) => {
              const sty = SCENARIO_STYLE[sc.id] || SCENARIO_STYLE.illegal_logging_dawn;
              const ScIcon = sty.icon;
              const isSelected = selectedId === sc.id;
              const isThreat = sc.threat_type !== 'WILDLIFE';

              return (
                <button
                  key={sc.id}
                  type="button"
                  onClick={() => { if (!isActive) setSelectedId(sc.id); }}
                  disabled={isActive}
                  style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '0.75rem',
                    padding: '0.85rem 1rem',
                    borderRadius: 'var(--radius-sm)',
                    border: isSelected ? `1.5px solid ${sty.accentColor}` : '1px solid var(--border-subtle)',
                    background: isSelected ? sty.tagBg : '#ffffff',
                    cursor: isActive ? 'not-allowed' : 'pointer',
                    opacity: isActive && !isSelected ? 0.5 : 1,
                    transition: 'all 0.15s ease',
                    textAlign: 'left',
                    width: '100%',
                    fontFamily: 'inherit',
                    fontSize: 'inherit',
                  }}
                >
                  <div style={{
                    width: 36, height: 36, borderRadius: 'var(--radius-sm)',
                    background: isSelected ? sty.gradient : 'var(--bg-subtle)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexShrink: 0,
                  }}>
                    <ScIcon size={18} color={isSelected ? '#fff' : 'var(--text-muted)'} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.2rem' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.82rem', color: isSelected ? sty.accentColor : 'var(--text-primary)' }}>
                        {sc.title}
                      </span>
                    </div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', margin: 0, lineHeight: 1.35 }}>
                      {sc.description}
                    </p>
                    <div style={{ display: 'flex', gap: '0.6rem', marginTop: '0.4rem', fontSize: '0.68rem' }}>
                      <span style={{
                        padding: '0.15rem 0.45rem', borderRadius: 3,
                        background: isThreat ? 'rgba(204, 58, 33, 0.1)' : 'rgba(46, 125, 79, 0.1)',
                        color: isThreat ? 'var(--threat-chainsaw)' : 'var(--accent-emerald)',
                        fontWeight: 700,
                      }}>
                        {isThreat ? sc.threat_type : 'SAFE'}
                      </span>
                      <span style={{ color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>
                        {sc.duration_sec}s · {sc.node_id}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Play / Stop controls */}
          <div style={{ marginTop: '1.2rem', display: 'flex', gap: '0.75rem' }}>
            <button
              className="btn-primary"
              onClick={startSimulation}
              disabled={phase !== 'idle' && phase !== 'results'}
              style={{ flex: 1, padding: '0.65rem', fontSize: '0.85rem' }}
            >
              <Play size={18} />
              <span>{phase === 'results' ? 'Run again' : 'Start simulation'}</span>
            </button>
            {isActive && phase !== 'results' && (
              <button
                className="btn-secondary"
                onClick={handleStop}
                style={{ padding: '0.65rem 1rem' }}
              >
                <Square size={16} />
                <span>Stop</span>
              </button>
            )}
          </div>
        </div>

        {/* Right: Live playback + results area */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          {/* Audio waveform + spectrogram */}
          <div className="glass-panel" style={{ padding: '1.25rem' }}>
            <div className="panel-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
              <div className="panel-title-wrapper">
                <Waves size={18} color={isActive ? style.accentColor : 'var(--accent-cyan)'} />
                <div className="panel-title">
                  {phase === 'playing' ? 'Live audio stream' : phase === 'analyzing' ? 'Classifying audio...' : phase === 'results' ? 'Audio analysis complete' : 'Audio waveform'}
                </div>
              </div>
              {selectedScenario && (
                <span style={{
                  fontSize: '0.68rem', fontFamily: 'var(--font-mono)',
                  color: 'var(--text-muted)',
                }}>
                  16kHz · mono · {selectedScenario.duration_sec}s
                </span>
              )}
            </div>

            {/* Waveform */}
            <div style={{
              background: 'var(--bg-subtle)', borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)', padding: '0.5rem',
              marginBottom: '0.75rem',
            }}>
              <WaveformCanvas
                waveformData={waveformData}
                progress={audioProgress}
                accentColor={style.accentColor}
                isPlaying={phase === 'playing'}
                height={70}
              />
            </div>

            {/* Live spectrogram */}
            <div style={{
              borderRadius: 'var(--radius-sm)',
              border: '1px solid var(--border-subtle)',
              overflow: 'hidden',
            }}>
              <LiveSpectrogram
                analyserNode={analyserNode}
                isPlaying={phase === 'playing'}
                accentColor={style.accentColor}
                height={56}
              />
            </div>

            {/* Progress bar */}
            {isActive && (
              <div style={{ marginTop: '0.75rem' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem' }}>
                  <span>{phase === 'analyzing' ? 'Running YAMNet classification...' : `${Math.round(audioProgress * 100)}% played`}</span>
                  <span>{selectedScenario ? `${Math.round(audioProgress * selectedScenario.duration_sec)}s / ${selectedScenario.duration_sec}s` : ''}</span>
                </div>
                <div style={{ height: 4, background: 'var(--bg-tertiary)', borderRadius: 2, overflow: 'hidden' }}>
                  <div style={{
                    height: '100%', borderRadius: 2,
                    width: phase === 'analyzing' ? '100%' : `${audioProgress * 100}%`,
                    background: phase === 'analyzing' ? `repeating-linear-gradient(90deg, ${style.accentColor}, ${style.accentColor} 10px, transparent 10px, transparent 20px)` : style.accentColor,
                    backgroundSize: phase === 'analyzing' ? '40px 100%' : undefined,
                    animation: phase === 'analyzing' ? 'shimmer 1s linear infinite' : undefined,
                    transition: phase === 'playing' ? 'width 0.15s linear' : 'none',
                  }} />
                </div>
              </div>
            )}
          </div>

          {/* Detection events timeline */}
          {detectionEvents.length > 0 && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
                <div className="panel-title-wrapper">
                  <AlertTriangle size={18} color={style.accentColor} />
                  <div className="panel-title">Sensor detection timeline</div>
                </div>
              </div>
              <DetectionTimeline events={detectionEvents} accentColor={style.accentColor} />
            </div>
          )}

          {/* Classification results */}
          {phase === 'results' && classification && (
            <div className="glass-panel" style={{ padding: '1.25rem' }}>
              <div className="panel-header" style={{ marginBottom: '0.75rem', paddingBottom: '0.5rem' }}>
                <div className="panel-title-wrapper">
                  <Zap size={18} color={style.accentColor} />
                  <div className="panel-title">ML classification result</div>
                </div>
              </div>

              {/* Verdict */}
              <div style={{
                padding: '0.85rem 1rem', borderRadius: 'var(--radius-sm)',
                background: classification.threat_type !== 'UNKNOWN' && classification.threat_type !== 'WILDLIFE' ? '#f8dedb' : '#d1fae5',
                border: `1px solid ${classification.threat_type !== 'UNKNOWN' && classification.threat_type !== 'WILDLIFE' ? 'rgba(204,58,33,0.3)' : 'rgba(46,125,79,0.3)'}`,
                display: 'flex', alignItems: 'center', gap: '0.75rem',
                marginBottom: '1rem',
              }}>
                {classification.threat_type !== 'UNKNOWN' && classification.threat_type !== 'WILDLIFE'
                  ? <AlertTriangle size={22} color="#cc3a21" />
                  : <CheckCircle2 size={22} color="#2e7d4f" />
                }
                <div>
                  <div style={{
                    fontSize: '0.88rem', fontWeight: 800,
                    color: classification.threat_type !== 'UNKNOWN' && classification.threat_type !== 'WILDLIFE' ? '#be123c' : '#047857',
                  }}>
                    {classification.threat_type !== 'UNKNOWN' && classification.threat_type !== 'WILDLIFE'
                      ? `THREAT CONFIRMED: ${classification.threat_type}`
                      : 'NO THREAT DETECTED — SAFE'
                    }
                  </div>
                  <div style={{
                    fontSize: '0.74rem',
                    color: classification.threat_type !== 'UNKNOWN' && classification.threat_type !== 'WILDLIFE' ? '#9f1239' : '#065f46',
                  }}>
                    Confidence: {(classification.confidence * 100).toFixed(1)}% · Pipeline: {classification.pipeline?.model || 'YAMNet'}
                  </div>
                </div>
              </div>

              {/* Spectral metrics */}
              {classification.spectral_analysis && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.65rem' }}>
                  {[
                    { label: 'Spectral centroid', value: `${classification.spectral_analysis.spectral_centroid_hz?.toFixed(0)} Hz`, color: 'var(--accent-cyan)' },
                    { label: 'Zero crossing rate', value: classification.spectral_analysis.zero_crossing_rate?.toFixed(4), color: 'var(--accent-blue)' },
                    { label: 'RMS energy', value: classification.spectral_analysis.rms_energy?.toFixed(4), color: 'var(--accent-emerald)' },
                  ].map((m) => (
                    <div key={m.label} style={{
                      padding: '0.65rem', background: 'var(--bg-subtle)',
                      borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)',
                    }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', fontWeight: 700 }}>{m.label}</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: 800, fontFamily: 'var(--font-mono)', color: m.color }}>
                        {m.value || '—'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Forensics */}
              {forensics && (
                <div style={{ marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                  {forensics.physical_source_mechanism && (
                    <div style={{ padding: '0.65rem', background: '#fff', borderRadius: 'var(--radius-sm)', border: '1px solid var(--border-subtle)', fontSize: '0.75rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '0.2rem' }}>
                        🔬 Physical Source Mechanism:
                      </span>
                      <span style={{ color: 'var(--text-secondary)' }}>{forensics.physical_source_mechanism}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
