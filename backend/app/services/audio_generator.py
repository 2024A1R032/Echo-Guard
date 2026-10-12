"""
EchoGuard Synthetic Audio Scene Generator
==========================================
Generates realistic bioacoustic WAV audio samples that blend
Amazon rainforest ambient soundscapes with layered threat signatures.

Each scenario produces a real WAV file that can be:
  1. Played back in the browser for an immersive demo
  2. Fed through the YAMNet classification pipeline for real ML analysis
  3. Used as ground-truth test vectors for the acoustic detection grid
"""

import io
import struct
import math
import random
import numpy as np
import logging
from typing import Dict, Any, List, Optional

logger = logging.getLogger(__name__)

SAMPLE_RATE = 16000   # YAMNet-compatible 16 kHz mono
DURATION_SEC = 8      # Each scenario clip length


# ---------------------------------------------------------------------------
# Low-level WAV encoder (no external deps beyond numpy)
# ---------------------------------------------------------------------------

def _encode_wav(samples: np.ndarray, sr: int = SAMPLE_RATE) -> bytes:
    """Encode float32 numpy array as 16-bit PCM WAV bytes."""
    # Clip and convert to int16
    samples = np.clip(samples, -1.0, 1.0)
    pcm = (samples * 32767).astype(np.int16)
    raw = pcm.tobytes()

    buf = io.BytesIO()
    # RIFF header
    data_size = len(raw)
    buf.write(b'RIFF')
    buf.write(struct.pack('<I', 36 + data_size))
    buf.write(b'WAVE')
    # fmt chunk
    buf.write(b'fmt ')
    buf.write(struct.pack('<I', 16))          # chunk size
    buf.write(struct.pack('<H', 1))           # PCM
    buf.write(struct.pack('<H', 1))           # mono
    buf.write(struct.pack('<I', sr))          # sample rate
    buf.write(struct.pack('<I', sr * 2))      # byte rate
    buf.write(struct.pack('<H', 2))           # block align
    buf.write(struct.pack('<H', 16))          # bits per sample
    # data chunk
    buf.write(b'data')
    buf.write(struct.pack('<I', data_size))
    buf.write(raw)
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Component sound generators
# ---------------------------------------------------------------------------

def _gen_jungle_ambience(n: int) -> np.ndarray:
    """Dense Amazon rainforest ambient bed: insect chorus, distant birds, rain."""
    t = np.linspace(0, n / SAMPLE_RATE, n, dtype=np.float32)
    audio = np.zeros(n, dtype=np.float32)

    # Insect chorus — layered high-freq sine bursts with AM
    for freq in [3800, 4200, 4600, 5100, 5800]:
        mod = 0.5 + 0.5 * np.sin(2 * np.pi * random.uniform(0.8, 2.5) * t + random.uniform(0, 6.28))
        audio += 0.012 * mod * np.sin(2 * np.pi * freq * t + random.uniform(0, 6.28))

    # Distant bird calls — FM chirps
    for _ in range(6):
        start = random.randint(0, max(0, n - SAMPLE_RATE))
        length = random.randint(SAMPLE_RATE // 8, SAMPLE_RATE // 3)
        end = min(start + length, n)
        seg_t = np.linspace(0, length / SAMPLE_RATE, end - start, dtype=np.float32)
        base_f = random.uniform(1800, 4200)
        sweep = base_f + random.uniform(-600, 600) * np.sin(2 * np.pi * random.uniform(4, 12) * seg_t)
        phase = 2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE
        env = np.sin(np.pi * seg_t / (seg_t[-1] + 1e-9)) ** 2
        audio[start:end] += 0.03 * env * np.sin(phase)

    # Light rain / rustle — filtered noise
    noise = np.random.randn(n).astype(np.float32)
    # Simple low-pass by averaging
    kernel = np.ones(16, dtype=np.float32) / 16
    rain = np.convolve(noise, kernel, mode='same')
    audio += 0.018 * rain

    # Distant stream / water trickle
    water_mod = 0.5 + 0.5 * np.sin(2 * np.pi * 0.3 * t)
    audio += 0.008 * water_mod * np.random.randn(n).astype(np.float32)

    return audio


def _gen_chainsaw(n: int, onset_frac: float = 0.25) -> np.ndarray:
    """2-stroke chainsaw: fundamental ~240 Hz with rich harmonics and mechanical buzz."""
    t = np.linspace(0, n / SAMPLE_RATE, n, dtype=np.float32)
    audio = np.zeros(n, dtype=np.float32)
    onset = int(n * onset_frac)

    # Fade-in envelope
    env = np.zeros(n, dtype=np.float32)
    ramp_len = min(SAMPLE_RATE, n - onset)
    env[onset:onset + ramp_len] = np.linspace(0, 1, ramp_len)
    env[onset + ramp_len:] = 1.0
    # Slight RPM variation
    rpm_mod = 1.0 + 0.03 * np.sin(2 * np.pi * 0.6 * t)

    base_freq = 240.0
    # Fundamental + harmonics
    for h, amp in [(1, 0.25), (2, 0.20), (3, 0.15), (4, 0.10), (5, 0.06), (6, 0.04)]:
        freq = base_freq * h * rpm_mod
        phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
        audio += amp * env * np.sin(phase)

    # Mechanical buzz (sawtooth approximation)
    buzz_freq = 480 * rpm_mod
    buzz_phase = 2 * np.pi * np.cumsum(buzz_freq) / SAMPLE_RATE
    sawtooth = 2.0 * (buzz_phase / (2 * np.pi) - np.floor(buzz_phase / (2 * np.pi))) - 1.0
    audio += 0.06 * env * sawtooth

    return audio


def _gen_gunshot(n: int, shot_times: Optional[List[float]] = None) -> np.ndarray:
    """Impulsive ballistic transients with exponential decay and echo."""
    audio = np.zeros(n, dtype=np.float32)
    if shot_times is None:
        shot_times = [0.3, 0.5, 0.72]

    for t_sec in shot_times:
        idx = int(t_sec * SAMPLE_RATE)
        if idx >= n:
            continue
        # Sharp impulse
        impulse_len = int(0.008 * SAMPLE_RATE)  # ~8ms
        end = min(idx + impulse_len, n)
        seg = np.arange(end - idx, dtype=np.float32)
        impulse = 0.9 * np.exp(-seg / (impulse_len * 0.15)) * np.sin(2 * np.pi * 1250 * seg / SAMPLE_RATE)
        audio[idx:end] += impulse

        # Broadband crack
        crack_len = int(0.05 * SAMPLE_RATE)
        crack_end = min(idx + crack_len, n)
        crack_seg = np.arange(crack_end - idx, dtype=np.float32)
        crack = 0.5 * np.exp(-crack_seg / (crack_len * 0.25)) * np.random.randn(crack_end - idx).astype(np.float32)
        audio[idx:crack_end] += crack

        # Echo (delayed, quieter copy)
        echo_delay = int(0.18 * SAMPLE_RATE)
        echo_start = idx + echo_delay
        echo_end = min(echo_start + crack_len, n)
        if echo_start < n:
            echo_seg_len = echo_end - echo_start
            if echo_seg_len > 0:
                echo_seg = np.arange(echo_seg_len, dtype=np.float32)
                echo = 0.15 * np.exp(-echo_seg / (crack_len * 0.3)) * np.random.randn(echo_seg_len).astype(np.float32)
                audio[echo_start:echo_end] += echo

    return audio


def _gen_vessel_engine(n: int, onset_frac: float = 0.2) -> np.ndarray:
    """Outboard motor: low-frequency rumble with propeller blade-pass tones."""
    t = np.linspace(0, n / SAMPLE_RATE, n, dtype=np.float32)
    audio = np.zeros(n, dtype=np.float32)
    onset = int(n * onset_frac)

    env = np.zeros(n, dtype=np.float32)
    ramp = min(SAMPLE_RATE * 2, n - onset)
    env[onset:onset + ramp] = np.linspace(0, 1, ramp)
    env[onset + ramp:] = 1.0

    # Engine fundamental ~120 Hz
    base = 120.0
    speed_mod = 1.0 + 0.05 * np.sin(2 * np.pi * 0.2 * t)
    for h, amp in [(1, 0.20), (2, 0.18), (3, 0.12), (4, 0.07)]:
        freq = base * h * speed_mod
        phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
        audio += amp * env * np.sin(phase)

    # Cavitation noise — filtered broadband
    cavitation = np.random.randn(n).astype(np.float32) * 0.04 * env
    kernel = np.ones(32, dtype=np.float32) / 32
    audio += np.convolve(cavitation, kernel, mode='same')

    # Water splash splatter
    for _ in range(4):
        sp_start = random.randint(onset, max(onset + 1, n - SAMPLE_RATE // 4))
        sp_len = random.randint(SAMPLE_RATE // 10, SAMPLE_RATE // 4)
        sp_end = min(sp_start + sp_len, n)
        seg = np.arange(sp_end - sp_start, dtype=np.float32)
        splash = 0.05 * np.exp(-seg / (sp_len * 0.3)) * np.random.randn(sp_end - sp_start).astype(np.float32)
        audio[sp_start:sp_end] += splash

    return audio


def _gen_blast(n: int) -> np.ndarray:
    """Underwater blast / dynamite fishing explosion."""
    audio = np.zeros(n, dtype=np.float32)
    blast_time = 0.35
    idx = int(blast_time * SAMPLE_RATE)

    # Deep boom
    boom_len = int(0.3 * SAMPLE_RATE)
    end = min(idx + boom_len, n)
    seg = np.arange(end - idx, dtype=np.float32)
    boom = 0.85 * np.exp(-seg / (boom_len * 0.2)) * np.sin(2 * np.pi * 65 * seg / SAMPLE_RATE)
    audio[idx:end] += boom

    # Broadband shockwave
    shock_len = int(0.08 * SAMPLE_RATE)
    shock_end = min(idx + shock_len, n)
    shock_seg = np.arange(shock_end - idx, dtype=np.float32)
    shock = 0.7 * np.exp(-shock_seg / (shock_len * 0.12)) * np.random.randn(shock_end - idx).astype(np.float32)
    audio[idx:shock_end] += shock

    # Underwater reverb tail
    reverb_start = idx + int(0.15 * SAMPLE_RATE)
    reverb_len = int(1.5 * SAMPLE_RATE)
    reverb_end = min(reverb_start + reverb_len, n)
    if reverb_start < n:
        seg_len = reverb_end - reverb_start
        if seg_len > 0:
            seg = np.arange(seg_len, dtype=np.float32)
            reverb = 0.12 * np.exp(-seg / (reverb_len * 0.4)) * np.random.randn(seg_len).astype(np.float32)
            kernel = np.ones(64, dtype=np.float32) / 64
            reverb = np.convolve(reverb, kernel, mode='same')
            audio[reverb_start:reverb_end] += reverb

    return audio


# ---------------------------------------------------------------------------
# Scenario definitions
# ---------------------------------------------------------------------------

SCENARIOS: Dict[str, Dict[str, Any]] = {
    "illegal_logging_dawn": {
        "title": "🪓 Illegal Logging at Dawn",
        "description": "Dense jungle ambience with insects and birds. At 2 seconds a chainsaw starts up in the distance, growing louder as the logger advances into the protected zone.",
        "threat_type": "CHAINSAW",
        "duration_sec": 8,
        "node_id": "NODE-ALPHA",
        "severity": "HIGH",
        "location": {"lat": -3.4653, "lon": -62.2159, "name": "Alpha Reserve North"},
    },
    "poacher_ambush": {
        "title": "🔫 Poacher Ambush — Rifle Shots",
        "description": "Calm nighttime rainforest with frog choruses and distant stream. Three high-caliber rifle shots ring out in quick succession, echoing off the canopy.",
        "threat_type": "GUNSHOT",
        "duration_sec": 8,
        "node_id": "NODE-CHARLIE",
        "severity": "CRITICAL",
        "location": {"lat": -3.4501, "lon": -62.2341, "name": "Charlie Canopy Perimeter"},
    },
    "illegal_fishing_vessel": {
        "title": "🚤 Unauthorized Speedboat Incursion",
        "description": "River boundary sounds with water flow and bird calls. An unauthorized outboard motor is detected approaching the marine sanctuary at high speed.",
        "threat_type": "ILLEGAL_VESSEL",
        "duration_sec": 8,
        "node_id": "NODE-DELTA",
        "severity": "HIGH",
        "location": {"lat": -3.4735, "lon": -62.2510, "name": "Delta Marine Sanctuary"},
    },
    "blast_fishing_reef": {
        "title": "💥 Blast Fishing — Underwater Detonation",
        "description": "Quiet underwater hydrophone recording. A sudden explosive detonation is detected, consistent with destructive dynamite fishing near the coral reef.",
        "threat_type": "BLAST_FISHING",
        "duration_sec": 8,
        "node_id": "NODE-ECHO",
        "severity": "CRITICAL",
        "location": {"lat": -3.4920, "lon": -62.2215, "name": "Echo Deep Rainforest"},
    },
    "safe_wildlife_dawn_chorus": {
        "title": "🦜 Safe — Dawn Wildlife Chorus",
        "description": "A beautiful dawn chorus of macaws, toucans, howler monkeys, and insects. No threat detected. This is the acoustic baseline of a healthy ecosystem.",
        "threat_type": "WILDLIFE",
        "duration_sec": 8,
        "node_id": "NODE-BRAVO",
        "severity": "NONE",
        "location": {"lat": -3.4812, "lon": -62.1984, "name": "Bravo River Outpost"},
    },
}


def generate_scenario_audio(scenario_id: str) -> Dict[str, Any]:
    """
    Generate a full WAV audio clip for a given scenario.
    Returns dict with wav_bytes, metadata, and scenario info.
    """
    if scenario_id not in SCENARIOS:
        raise ValueError(f"Unknown scenario: {scenario_id}")

    scenario = SCENARIOS[scenario_id]
    n = scenario["duration_sec"] * SAMPLE_RATE

    # Always start with jungle ambience base layer
    audio = _gen_jungle_ambience(n)

    # Mix in threat-specific sound
    threat = scenario["threat_type"]
    if threat == "CHAINSAW":
        audio += _gen_chainsaw(n, onset_frac=0.25)
    elif threat == "GUNSHOT":
        audio += _gen_gunshot(n, shot_times=[0.3, 0.52, 0.74])
    elif threat == "ILLEGAL_VESSEL":
        audio += _gen_vessel_engine(n, onset_frac=0.2)
    elif threat == "BLAST_FISHING":
        audio += _gen_blast(n)
    elif threat == "WILDLIFE":
        # Extra bird calls for the safe scenario
        for _ in range(10):
            start = random.randint(0, max(0, n - SAMPLE_RATE))
            length = random.randint(SAMPLE_RATE // 6, SAMPLE_RATE // 2)
            end_idx = min(start + length, n)
            seg_t = np.linspace(0, length / SAMPLE_RATE, end_idx - start, dtype=np.float32)
            base_f = random.uniform(2000, 5000)
            sweep = base_f + random.uniform(-800, 800) * np.sin(2 * np.pi * random.uniform(5, 15) * seg_t)
            phase = 2 * np.pi * np.cumsum(sweep) / SAMPLE_RATE
            env = np.sin(np.pi * seg_t / (seg_t[-1] + 1e-9)) ** 2
            audio[start:end_idx] += 0.05 * env * np.sin(phase)

    # Normalize final mix
    peak = np.max(np.abs(audio))
    if peak > 0:
        audio = audio / peak * 0.85

    wav_bytes = _encode_wav(audio, SAMPLE_RATE)

    return {
        "scenario": scenario,
        "scenario_id": scenario_id,
        "wav_bytes": wav_bytes,
        "sample_rate": SAMPLE_RATE,
        "duration_sec": scenario["duration_sec"],
        "num_samples": n,
        "waveform_preview": audio[::max(1, n // 200)].tolist(),  # 200-point waveform for UI
    }


def list_scenarios() -> List[Dict[str, Any]]:
    """Return metadata for all available scenarios (no audio data)."""
    result = []
    for sid, s in SCENARIOS.items():
        result.append({
            "id": sid,
            "title": s["title"],
            "description": s["description"],
            "threat_type": s["threat_type"],
            "duration_sec": s["duration_sec"],
            "severity": s["severity"],
            "node_id": s["node_id"],
            "location": s["location"],
        })
    return result
