"""
[OPTIONAL FALLBACK / SECONDARY TESTING ONLY]
Synthetic Acoustic Training Sample Generator
=============================================
NOTE: The primary classification engine for EchoGuard is Google YAMNet from TensorFlow Hub
(see app/services/audio_classifier.py). This module is retained exclusively as an isolated
synthetic test fixture generator and secondary fallback.
"""

import os
import numpy as np
import soundfile as sf
import logging

logger = logging.getLogger(__name__)

SAMPLE_RATE = 22050  # Standard rate for librosa compatibility
DURATION = 2.0       # 2 seconds per sample
NUM_VARIANTS = 5     # Number of variants per class

# Base directory for generated training data
TRAINING_DATA_DIR = os.path.join(
    os.path.dirname(os.path.dirname(os.path.abspath(__file__))),
    "training_data"
)


def _pink_noise(n: int) -> np.ndarray:
    """Generate pink noise (1/f) using the Voss-McCartney algorithm."""
    num_rows = 16
    array = np.empty((n, num_rows))
    array.fill(np.nan)
    array[0, :] = np.random.random(num_rows)
    cols = np.random.geometric(0.5, n).clip(0, num_rows - 1)
    for i in range(1, n):
        array[i] = array[i - 1]
        array[i, cols[i]] = np.random.random()
    result = np.nansum(array, axis=1)
    result = result - np.mean(result)
    return result / (np.max(np.abs(result)) + 1e-8)


def _generate_chainsaw(variant: int = 0) -> np.ndarray:
    """
    Chainsaw: 240 Hz fundamental + 480 Hz / 720 Hz harmonics.
    Amplitude-modulated at 8-12 Hz to simulate chain tooth engagement.
    """
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)
    f0 = 240 + variant * 5  # Slight frequency variation per variant
    
    signal = (
        0.6 * np.sin(2 * np.pi * f0 * t) +              # Fundamental
        0.25 * np.sin(2 * np.pi * 2 * f0 * t) +          # 2nd harmonic
        0.15 * np.sin(2 * np.pi * 3 * f0 * t)            # 3rd harmonic
    )
    
    # Amplitude modulation (chain tooth engagement)
    am_freq = 8 + variant * 0.8
    am = 0.5 + 0.5 * np.sin(2 * np.pi * am_freq * t)
    signal *= am
    
    # Add mechanical noise
    noise = np.random.normal(0, 0.05, len(t))
    signal += noise
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


def _generate_gunshot(variant: int = 0) -> np.ndarray:
    """
    Gunshot: Broadband impulse with exponential decay.
    Very short transient (< 50ms) followed by reverb tail.
    """
    n_samples = int(SAMPLE_RATE * DURATION)
    t = np.linspace(0, DURATION, n_samples, endpoint=False)
    signal = np.zeros(n_samples)
    
    # Number of shots in the sample
    n_shots = 1 + variant % 3
    for shot in range(n_shots):
        onset = int((0.2 + shot * 0.5) * SAMPLE_RATE)
        if onset >= n_samples:
            break
        
        # Impulse: broadband white noise burst
        burst_len = int(0.005 * SAMPLE_RATE)  # 5ms burst
        decay_len = int(0.08 * SAMPLE_RATE)   # 80ms decay
        
        burst = np.random.normal(0, 1.0, burst_len)
        decay = np.exp(-np.linspace(0, 8 + variant, decay_len))
        decay_noise = np.random.normal(0, 0.3, decay_len) * decay
        
        total_event = np.concatenate([burst, decay_noise])
        end_idx = min(onset + len(total_event), n_samples)
        signal[onset:end_idx] += total_event[:end_idx - onset]
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


def _generate_vehicle_engine(variant: int = 0) -> np.ndarray:
    """
    Vehicle engine: Low idle frequency (85 Hz) with firing-order harmonics.
    Simulates diesel truck or logging vehicle.
    """
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)
    f0 = 85 + variant * 10  # RPM variation
    
    signal = (
        0.5 * np.sin(2 * np.pi * f0 * t) +
        0.3 * np.sin(2 * np.pi * 2 * f0 * t) +
        0.1 * np.sin(2 * np.pi * 4 * f0 * t) +
        0.1 * np.sin(2 * np.pi * 6 * f0 * t)
    )
    
    # Engine rumble — low-frequency modulation
    rumble = 0.7 + 0.3 * np.sin(2 * np.pi * 2.5 * t)
    signal *= rumble
    
    noise = np.random.normal(0, 0.03, len(t))
    signal += noise
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


def _generate_illegal_vessel(variant: int = 0) -> np.ndarray:
    """
    Illegal vessel: 120 Hz propeller + blade-pass frequency harmonics.
    Simulates an outboard motor or trawler.
    """
    t = np.linspace(0, DURATION, int(SAMPLE_RATE * DURATION), endpoint=False)
    f0 = 120 + variant * 8
    blade_pass = f0 * 3  # 3-blade propeller
    
    signal = (
        0.5 * np.sin(2 * np.pi * f0 * t) +
        0.3 * np.sin(2 * np.pi * blade_pass * t) +
        0.1 * np.sin(2 * np.pi * 2 * blade_pass * t) +
        0.1 * np.sin(2 * np.pi * 0.5 * f0 * t)  # Cavitation sub-harmonic
    )
    
    # Slow amplitude wobble (wave motion)
    wobble = 0.8 + 0.2 * np.sin(2 * np.pi * 0.3 * t)
    signal *= wobble
    
    noise = np.random.normal(0, 0.04, len(t))
    signal += noise
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


def _generate_blast_fishing(variant: int = 0) -> np.ndarray:
    """
    Blast fishing: Underwater shockwave pulse + bubble oscillation.
    Sharp onset, rapid pressure wave, then decaying bubble pulsation.
    """
    n_samples = int(SAMPLE_RATE * DURATION)
    t = np.linspace(0, DURATION, n_samples, endpoint=False)
    signal = np.zeros(n_samples)
    
    onset = int(0.3 * SAMPLE_RATE)
    
    # Shockwave: very short broadband pulse (2ms)
    shock_len = int(0.002 * SAMPLE_RATE)
    shock = np.random.normal(0, 1.0, shock_len) * np.hanning(shock_len)
    
    # Bubble oscillation: decaying sinusoid at 200-400 Hz
    bubble_freq = 250 + variant * 30
    bubble_len = int(0.5 * SAMPLE_RATE)
    t_bubble = np.linspace(0, 0.5, bubble_len, endpoint=False)
    bubble = np.sin(2 * np.pi * bubble_freq * t_bubble) * np.exp(-6 * t_bubble)
    
    # Combine shockwave + bubble
    event = np.concatenate([shock, bubble])
    end_idx = min(onset + len(event), n_samples)
    signal[onset:end_idx] = event[:end_idx - onset]
    
    # Low-frequency rumble aftermath
    aftermath_start = onset + len(event)
    if aftermath_start < n_samples:
        remaining = n_samples - aftermath_start
        aftermath = _pink_noise(remaining) * 0.1 * np.exp(-np.linspace(0, 4, remaining))
        signal[aftermath_start:] += aftermath
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


def _generate_wildlife_ambient(variant: int = 0) -> np.ndarray:
    """
    Wildlife ambient: Frequency-modulated avian chirps (1800–4200 Hz).
    Multiple overlapping bird call chirps.
    """
    n_samples = int(SAMPLE_RATE * DURATION)
    t = np.linspace(0, DURATION, n_samples, endpoint=False)
    signal = np.zeros(n_samples)
    
    n_chirps = 4 + variant
    for chirp_idx in range(n_chirps):
        chirp_start = np.random.uniform(0, DURATION - 0.3)
        chirp_dur = np.random.uniform(0.08, 0.25)
        start_freq = np.random.uniform(1800, 3000)
        end_freq = np.random.uniform(3200, 4200)
        
        start_sample = int(chirp_start * SAMPLE_RATE)
        chirp_samples = int(chirp_dur * SAMPLE_RATE)
        t_chirp = np.linspace(0, chirp_dur, chirp_samples, endpoint=False)
        
        # Linear frequency sweep
        freq = np.linspace(start_freq, end_freq, chirp_samples)
        phase = 2 * np.pi * np.cumsum(freq) / SAMPLE_RATE
        chirp = np.sin(phase) * np.hanning(chirp_samples)
        
        end_sample = min(start_sample + chirp_samples, n_samples)
        actual_len = end_sample - start_sample
        signal[start_sample:end_sample] += chirp[:actual_len] * 0.4
    
    # Background forest ambience (very faint pink noise)
    signal += _pink_noise(n_samples) * 0.05
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


def _generate_rain(variant: int = 0) -> np.ndarray:
    """
    Rain: Pink noise with stochastic amplitude envelope.
    Safe/ambient class — not a threat.
    """
    n_samples = int(SAMPLE_RATE * DURATION)
    signal = _pink_noise(n_samples)
    
    # Stochastic amplitude envelope (simulates rain intensity variation)
    envelope_len = 20 + variant * 5
    envelope = np.random.uniform(0.3, 1.0, envelope_len)
    envelope = np.interp(
        np.linspace(0, 1, n_samples),
        np.linspace(0, 1, envelope_len),
        envelope
    )
    signal *= envelope
    
    return signal / (np.max(np.abs(signal)) + 1e-8)


# Registry of generators
THREAT_GENERATORS = {
    "CHAINSAW": _generate_chainsaw,
    "GUNSHOT": _generate_gunshot,
    "VEHICLE_ENGINE": _generate_vehicle_engine,
    "ILLEGAL_VESSEL": _generate_illegal_vessel,
    "BLAST_FISHING": _generate_blast_fishing,
    "WILDLIFE_AMBIENT": _generate_wildlife_ambient,
    "RAIN": _generate_rain,
}


def generate_all_training_samples(output_dir: str = None, num_variants: int = NUM_VARIANTS) -> str:
    """
    Generate synthetic .wav training samples for all threat classes.
    
    Returns the output directory path.
    """
    if output_dir is None:
        output_dir = TRAINING_DATA_DIR
    
    os.makedirs(output_dir, exist_ok=True)
    total_files = 0
    
    for threat_class, generator_fn in THREAT_GENERATORS.items():
        class_dir = os.path.join(output_dir, threat_class)
        os.makedirs(class_dir, exist_ok=True)
        
        for variant_idx in range(num_variants):
            waveform = generator_fn(variant=variant_idx)
            filename = f"{threat_class.lower()}_v{variant_idx}.wav"
            filepath = os.path.join(class_dir, filename)
            
            sf.write(filepath, waveform, SAMPLE_RATE)
            total_files += 1
    
    logger.info(f"Generated {total_files} training samples in {output_dir}")
    return output_dir


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    output = generate_all_training_samples()
    print(f"Training data generated at: {output}")
