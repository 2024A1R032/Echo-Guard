import React, { useRef, useEffect } from 'react';
import { useTelemetry } from '../context/TelemetryContext';
import { Activity, Waves } from 'lucide-react';
import { threatLabel } from '../utils/threat';

export default function AudioSpectrogram() {
  const { activeThreats } = useTelemetry();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    let animationId;
    let phase = 0;

    const render = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      // Clean Light Background Grid Lines
      ctx.strokeStyle = '#dce2db';
      ctx.lineWidth = 1;
      for (let x = 0; x < width; x += 25) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += 20) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Check if there is an active threat to increase waveform agitation
      const hasRecentThreat = activeThreats.length > 0;
      const latestType = hasRecentThreat ? activeThreats[0].threat_type : 'AMBIENT';

      let baseAmplitude = hasRecentThreat ? 28 : 8;
      let waveColor = '#1f5a3a';
      if (latestType === 'CHAINSAW' || latestType === 'GUNSHOT') waveColor = '#cc3a21';
      if (latestType === 'BLAST_FISHING') waveColor = '#8a3a5c';
      if (latestType === 'ILLEGAL_VESSEL') waveColor = '#1f5a3a';

      // Draw Multi-Layer Bioacoustic Harmonic Waveforms
      [
        { freq: 0.02, amp: baseAmplitude, color: waveColor, alpha: 0.9, width: 2.2 },
        { freq: 0.04, amp: baseAmplitude * 0.6, color: waveColor, alpha: 0.45, width: 1.5 },
        { freq: 0.015, amp: baseAmplitude * 1.2, color: '#1d6a8c', alpha: 0.35, width: 1.2 },
      ].forEach((wave) => {
        ctx.beginPath();
        ctx.strokeStyle = wave.color;
        ctx.globalAlpha = wave.alpha;
        ctx.lineWidth = wave.width;

        for (let x = 0; x < width; x++) {
          const y = centerY + Math.sin(x * wave.freq + phase) * wave.amp * Math.cos(x * 0.005);
          if (x === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.stroke();
      });

      ctx.globalAlpha = 1.0;
      phase += hasRecentThreat ? 0.08 : 0.03;
      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [activeThreats]);

  const latestThreat = activeThreats[0];

  return (
    <div className="open-section">
      <div className="section-head">
        <div>
          <div className="panel-title">Signal pattern</div>
          <div className="panel-subtitle">An illustration of the latest threat’s sound, not a live recording</div>
        </div>
        <span className={`threat-tag ${latestThreat ? latestThreat.threat_type : 'UNKNOWN'}`}>
          {latestThreat ? threatLabel(latestThreat.threat_type) : 'Ambient forest noise'}
        </span>
      </div>

      <div style={{ background: '#ffffff', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', overflow: 'hidden' }}>
        <canvas
          ref={canvasRef}
          width={600}
          height={90}
          style={{ width: '100%', height: '90px', display: 'block' }}
        />
      </div>
    </div>
  );
}
