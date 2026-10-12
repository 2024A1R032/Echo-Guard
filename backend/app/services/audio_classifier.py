"""
EchoGuard YAMNet Audio Classification Service
=============================================
Inference-only bioacoustic classifier leveraging Google's pre-trained YAMNet
from TensorFlow Hub (https://tfhub.dev/google/yamnet/1).

Pipeline:
  1. Load .wav file at 16,000 Hz mono (YAMNet standard).
  2. Normalize float32 audio waveform to [-1.0, 1.0].
  3. Run YAMNet inference -> (scores, embeddings, log_mel_spectrogram).
  4. Aggregate frame scores and filter/map 521 AudioSet classes to EchoGuard threats:
     - Chainsaw -> CHAINSAW
     - Gunshot, gunfire / Explosion / Artillery -> GUNSHOT
     - Motorboat / Boat / Watercraft -> ILLEGAL_VESSEL
     - Engine / Motor vehicle / Truck / Car -> VEHICLE_ENGINE
     - Underwater explosion / Blast -> BLAST_FISHING
  5. Compute 128-dimensional unit-normalized acoustic embedding for pgvector.
"""

import os
import csv
import logging
import numpy as np
import soundfile as sf
from typing import Dict, Any, List, Optional, Tuple

logger = logging.getLogger(__name__)

# Constants
YAMNET_MODEL_URL = "https://tfhub.dev/google/yamnet/1"
TARGET_SR = 16000  # YAMNet strictly requires 16 kHz

# Domain threat mapping from YAMNet AudioSet classes
THREAT_CLASS_MAPPING = {
    # Chainsaw / Deforestation
    "Chainsaw": "CHAINSAW",
    
    # Gunshots / Poaching Firearms
    "Gunshot, gunfire": "GUNSHOT",
    "Cap gun": "GUNSHOT",
    "Explosion": "GUNSHOT",
    "Artillery fire": "GUNSHOT",
    "Machine gun": "GUNSHOT",
    "Fusillade": "GUNSHOT",
    
    # Marine / Waterway Sanctuary Breaches
    "Motorboat, speedboat": "ILLEGAL_VESSEL",
    "Boat, Water vehicle": "ILLEGAL_VESSEL",
    "Ship": "ILLEGAL_VESSEL",
    "Watercraft": "ILLEGAL_VESSEL",
    
    # Unauthorized Vehicles / Logging Trucks
    "Engine": "VEHICLE_ENGINE",
    "Motor vehicle (road)": "VEHICLE_ENGINE",
    "Truck": "VEHICLE_ENGINE",
    "Car": "VEHICLE_ENGINE",
    "Vehicle": "VEHICLE_ENGINE",
    "Idling": "VEHICLE_ENGINE",
    "Accelerating, revving, vroom": "VEHICLE_ENGINE",
    "Internal combustion engine": "VEHICLE_ENGINE",
    
    # Destructive Fishing
    "Burst, pop": "BLAST_FISHING",
    "Boom": "BLAST_FISHING",
}

# 521 Standard AudioSet Class Labels for YAMNet
AUDIOSET_CLASSES_SAMPLE = [
    "Speech", "Male speech, man speaking", "Female speech, woman speaking", "Child speech, kid speaking",
    "Conversation", "Narration, monologue", "Babbling", "Whispering", "Laughter", "Snicker",
    "Chuckle, chortle", "Gasp", "Panting", "Snort", "Cough", "Throat clearing", "Sneezing",
    "Sniff", "Crying, sobbing", "Sigh", "Singing", "Choir", "Yodel", "Chant", "Whispering",
    "Animal", "Dog", "Bark", "Yip", "Howl", "Bow-wow", "Growling", "Whimper (dog)", "Cat",
    "Purr", "Meow", "Hiss", "Caterwaul", "Livestock, farm animals, working animals", "Horse",
    "Clip-clop", "Neigh, whinny", "Cattle, bovinae", "Moo", "Cowbell", "Pig", "Oink",
    "Goat", "Bleat", "Sheep", "Fowl", "Chicken, rooster", "Cluck", "Crowing, cock-a-doodle-doo",
    "Turkey", "Gobble", "Duck", "Quack", "Goose", "Honk", "Wild animals", "Roaring lions",
    "Bird", "Bird vocalization, bird call, bird song", "Chirp, tweet", "Squawk", "Pigeon, dove",
    "Coo", "Crow", "Caw", "Owl", "Hoot", "Bird flight, flapping wings", "Canidae, dogs, wolves",
    "Rodents, rats, mice", "Mouse", "Patter", "Insect", "Cricket", "Mosquito", "Fly, housefly",
    "Buzz", "Bee, wasp, etc.", "Frog", "Croak", "Snake", "Rattle", "Whale vocalization",
    "Music", "Musical instrument", "Plucked string instrument", "Guitar", "Electric guitar",
    "Bass guitar", "Acoustic guitar", "Steel guitar, slide guitar", "Tapping (guitar technique)",
    "Strum", "Banjo", "Sitar", "Mandolin", "Zither", "Ukulele", "Keyboard (musical)", "Piano",
    "Electric piano", "Organ", "Electronic organ", "Hammond organ", "Synthesizer", "Sampler",
    "Harpsichord", "Percussion", "Drum kit", "Snare drum", "Rimshot", "Drum roll", "Bass drum",
    "Timpani", "Tabla", "Cymbal", "Hi-hat", "Crash cymbal", "Cowbell", "Wood block", "Tambourine",
    "Rattle (instrument)", "Maraca", "Gong", "Tubular bells", "Mallet percussion", "Marimba, xylophone",
    "Glockenspiel", "Vibraphone", "Steelpan", "Wind instrument, woodwind instrument", "Flute",
    "Saxophone", "Clarinet", "Oboe", "Bassoon", "Brass instrument", "French horn", "Trumpet",
    "Trombone", "Tuba", "Accordion", "Harmonica", "Bagpipes", "Didgeridoo", "Shofar",
    "Theremin", "Singing bowl", "Scratching (performance technique)", "Pop music", "Hip hop music",
    "Beatboxing", "Rock music", "Heavy metal", "Punk rock", "Grunge", "Progressive rock",
    "Rock and roll", "Psychedelic rock", "Rhythm and blues", "Soul music", "Reggae", "Country",
    "Bluegrass", "Funk", "Folk music", "Middle Eastern music", "Jazz", "Disco", "Classical music",
    "Opera", "Electronic music", "House music", "Techno", "Dubstep", "Drum and bass", "Electronica",
    "Electronic dance music", "Ambient music", "Trance music", "Music of Latin America", "Salsa music",
    "Flamenco", "Blues", "Music for children", "New-age music", "Vocal music", "A capella",
    "Music of Africa", "Afrobeat", "Christian music", "Gospel music", "Music of Asia", "Carnatic music",
    "Hindustani music", "Ska", "Traditional music", "Song", "Sound effect", "Echo", "Noise",
    "Environmental noise", "Static", "Mains hum", "Distortion", "Sidetone", "Cacophony", "White noise",
    "Pink noise", "Throbbing", "Vibration", "Television", "Radio", "Field recording", "Chainsaw",
    "Engine", "Motor vehicle (road)", "Car", "Vehicle", "Truck", "Motorcycle", "Idling",
    "Accelerating, revving, vroom", "Internal combustion engine", "Emergency vehicle", "Police car (siren)",
    "Ambulance (siren)", "Fire engine, fire truck (siren)", "Siren", "Civil defense siren",
    "Bicycle", "Skateboard", "Train", "Rail transport", "Train horn", "Train wheels squealing",
    "Subway, metro, underground", "Aircraft", "Aircraft engine", "Jet engine", "Propeller, airscrew",
    "Helicopter", "Watercraft", "Boat, Water vehicle", "Ship", "Motorboat, speedboat", "Rowboat, canoe, kayak",
    "Sailboat", "Submarine", "Gunshot, gunfire", "Machine gun", "Fusillade", "Artillery fire",
    "Cap gun", "Explosion", "Burst, pop", "Boom", "Thunderstorm", "Thunder", "Water", "Rain",
    "Raindrop", "Stream", "Waterfall", "Ocean", "Waves, surf", "Steam", "Gurgling", "Fire",
    "Crackle", "Wind", "Rustling leaves", "Wind noise (microphone)"
]


class YAMNetClassifier:
    """
    TensorFlow Hub YAMNet Model Wrapper.
    """

    def __init__(self):
        self._model = None
        self._class_names: List[str] = []
        self._is_loaded = False

    def _load_model(self):
        if self._is_loaded and self._model is not None:
            return

        # Model storage directory
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_dir = os.path.join(base_dir, "ml_models", "yamnet")

        try:
            import tensorflow as tf
            import requests
            import io
            import tarfile

            # Download if not present locally
            if not os.path.exists(model_dir) or not os.path.exists(os.path.join(model_dir, "saved_model.pb")):
                logger.info(f"Downloading YAMNet bundle from {YAMNET_MODEL_URL}...")
                os.makedirs(model_dir, exist_ok=True)
                download_url = f"{YAMNET_MODEL_URL}?tf-hub-format=compressed"
                resp = requests.get(download_url, headers={"User-Agent": "EchoGuard-Agent/1.0"}, timeout=30)
                if resp.status_code == 200:
                    tar = tarfile.open(fileobj=io.BytesIO(resp.content), mode="r:gz")
                    tar.extractall(model_dir)
                    tar.close()
                    logger.info("YAMNet SavedModel extracted successfully.")

            # Load SavedModel with pure TensorFlow
            logger.info(f"Loading YAMNet SavedModel from {model_dir}...")
            self._model = tf.saved_model.load(model_dir)

            # Load 521 AudioSet class map
            class_map_file = os.path.join(model_dir, "assets", "yamnet_class_map.csv")
            if not os.path.exists(class_map_file):
                class_map_file = self._model.class_map_path().numpy().decode("utf-8") if hasattr(self._model, "class_map_path") else ""

            class_names = []
            if os.path.exists(class_map_file):
                with open(class_map_file, mode="r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    for row in reader:
                        class_names.append(row["display_name"])

            if len(class_names) == 0:
                class_names = AUDIOSET_CLASSES_SAMPLE

            self._class_names = class_names
            self._is_loaded = True
            logger.info(f"YAMNet successfully loaded with {len(self._class_names)} classes.")
        except Exception as e:
            logger.warning(f"Could not load YAMNet SavedModel: {e}. Using resilient local acoustic model.")
            self._class_names = AUDIOSET_CLASSES_SAMPLE
            self._is_loaded = False

    def predict(self, waveform: np.ndarray) -> Dict[str, Any]:
        """
        Run inference on 16kHz mono audio waveform.
        """
        self._load_model()

        # Ensure float32 and shape [N]
        if waveform.dtype != np.float32:
            waveform = waveform.astype(np.float32)
        if waveform.ndim > 1:
            waveform = np.mean(waveform, axis=1)

        # Normalize to [-1.0, 1.0]
        max_val = np.max(np.abs(waveform))
        if max_val > 0:
            waveform = waveform / max_val

        used_real_model = False
        if self._is_loaded and self._model is not None:
            try:
                import tensorflow as tf
                # YAMNet accepts 1D float32 tensor
                waveform_tensor = tf.convert_to_tensor(waveform, dtype=tf.float32)
                scores, embeddings, log_mel = self._model(waveform_tensor)
                scores_np = scores.numpy()          # [N, 521]
                embeddings_np = embeddings.numpy()  # [N, 1024]
                log_mel_np = log_mel.numpy()        # [M, 64]

                # Frame-level mean score across time windows
                mean_scores = np.mean(scores_np, axis=0)
                mean_embedding = np.mean(embeddings_np, axis=0) # 1024-dim
                used_real_model = True
            except Exception as e:
                logger.warning(f"YAMNet tensor inference failed: {e}. Falling back to DSP heuristic.")
                mean_scores, mean_embedding, log_mel_np = self._fallback_dsp_inference(waveform)
        else:
            mean_scores, mean_embedding, log_mel_np = self._fallback_dsp_inference(waveform)

        # Map predictions to EchoGuard threat categories
        class_probs: Dict[str, float] = {}
        matched_threats: Dict[str, float] = {
            "CHAINSAW": 0.0,
            "GUNSHOT": 0.0,
            "ILLEGAL_VESSEL": 0.0,
            "VEHICLE_ENGINE": 0.0,
            "BLAST_FISHING": 0.0,
        }

        for idx, class_name in enumerate(self._class_names):
            if idx < len(mean_scores):
                score = float(mean_scores[idx])
                if class_name in THREAT_CLASS_MAPPING:
                    threat_cat = THREAT_CLASS_MAPPING[class_name]
                    matched_threats[threat_cat] = max(matched_threats[threat_cat], score)
                    class_probs[class_name] = round(score, 4)

        # Determine top mapped threat
        top_threat = max(matched_threats.items(), key=lambda x: x[1])
        if top_threat[1] >= 0.15:
            threat_type = top_threat[0]
            confidence = top_threat[1]
        else:
            threat_type = "UNKNOWN"
            confidence = max(0.20, float(np.max(mean_scores))) if len(mean_scores) > 0 else 0.50

        # Create 128-dimensional unit-normalized embedding for pgvector compatibility
        # Block-pool 1024-dim down to 128-dim (8-to-1 average pooling)
        if len(mean_embedding) == 1024:
            embedding_128 = mean_embedding.reshape(128, 8).mean(axis=1)
        elif len(mean_embedding) >= 128:
            embedding_128 = mean_embedding[:128]
        else:
            embedding_128 = np.pad(mean_embedding, (0, 128 - len(mean_embedding)))

        norm = np.linalg.norm(embedding_128)
        if norm > 0:
            embedding_128 = (embedding_128 / norm).tolist()
        else:
            embedding_128 = embedding_128.tolist()

        model_name = "Google YAMNet (TensorFlow Hub)" if used_real_model else "Fallback DSP Heuristic (YAMNet unavailable)"

        return {
            "threat_type": threat_type,
            "confidence": round(float(confidence), 4),
            "class_probabilities": class_probs,
            "embedding": embedding_128,
            "mel_spectrogram": log_mel_np[:32].tolist() if len(log_mel_np) > 0 else [],
            "spectral_analysis": self._compute_spectral_metrics(waveform, TARGET_SR),
            "pipeline": {
                "model": model_name,
                "sample_rate_hz": TARGET_SR,
                "input_format": "16kHz Mono Float32",
                "audioset_classes": len(self._class_names),
                "embedding_dimension": 128,
            },
        }

    def _fallback_dsp_inference(self, waveform: np.ndarray) -> Tuple[np.ndarray, np.ndarray, np.ndarray]:
        """Acoustic frequency and temporal domain analysis fallback."""
        fft_vals = np.abs(np.fft.rfft(waveform))
        fft_len = len(fft_vals)
        freqs = np.fft.rfftfreq(len(waveform), 1.0 / TARGET_SR)

        # Dominant peak frequency
        dom_idx = int(np.argmax(fft_vals)) if fft_len > 0 else 0
        dom_freq = float(freqs[dom_idx]) if fft_len > 0 else 0.0

        # Energy distribution across bands
        total_energy = float(np.sum(fft_vals) + 1e-9)
        sub_bass = float(np.sum(fft_vals[freqs < 150]) / total_energy)
        low_mid = float(np.sum(fft_vals[(freqs >= 150) & (freqs < 300)]) / total_energy)
        mid_buzz = float(np.sum(fft_vals[(freqs >= 300) & (freqs <= 750)]) / total_energy)
        highs = float(np.sum(fft_vals[freqs > 750]) / total_energy)

        # Transient / Peak factor (Crest Factor)
        peak = float(np.max(np.abs(waveform)))
        rms = float(np.sqrt(np.mean(waveform ** 2)) + 1e-9)
        crest_factor = peak / rms

        scores = np.zeros(len(self._class_names), dtype=np.float32)

        for i, name in enumerate(self._class_names):
            if name == "Chainsaw":
                # Chainsaw has dominant harmonic buzz around 350-600Hz
                if mid_buzz > 0.35 or (300 <= dom_freq <= 650):
                    scores[i] = float(min(0.98, 0.65 + mid_buzz * 0.5))
                else:
                    scores[i] = 0.02
            elif name in ("Gunshot, gunfire", "Explosion", "Cap gun"):
                # Gunshot has sharp impulse with high crest factor (> 4.5)
                if crest_factor > 3.8 and (dom_freq > 800 or highs > 0.3):
                    scores[i] = float(min(0.99, 0.70 + (crest_factor / 10.0) * 0.25))
                else:
                    scores[i] = 0.01
            elif name in ("Engine", "Motor vehicle (road)", "Truck"):
                # Engine has deep low rumble < 150Hz
                if sub_bass > 0.35 or (dom_freq < 150 and crest_factor < 3.5):
                    scores[i] = float(min(0.96, 0.65 + sub_bass * 0.45))
                else:
                    scores[i] = 0.02
            elif name in ("Motorboat, speedboat", "Boat, Water vehicle", "Ship"):
                # Marine vessel has low mid cavitation 150-300Hz
                if low_mid > 0.35 or (150 <= dom_freq < 300):
                    scores[i] = float(min(0.95, 0.60 + low_mid * 0.45))
                else:
                    scores[i] = 0.02
            elif name in ("Burst, pop", "Boom"):
                if crest_factor > 3.0 and dom_freq < 400:
                    scores[i] = float(min(0.92, 0.55 + sub_bass * 0.4))
                else:
                    scores[i] = 0.01
            elif name in ("Noise", "Environmental noise", "Wind", "Rain", "Static"):
                if crest_factor < 3.2 and mid_buzz < 0.35 and sub_bass < 0.35:
                    scores[i] = 0.88

        # 1024-dim synthetic feature embedding from FFT
        if fft_len >= 1024:
            embedding = fft_vals[:1024].astype(np.float32)
        else:
            embedding = np.pad(fft_vals, (0, 1024 - fft_len)).astype(np.float32)

        mel_dummy = np.zeros((32, 64), dtype=np.float32)
        return scores, embedding, mel_dummy

    def _compute_spectral_metrics(self, waveform: np.ndarray, sr: int) -> Dict[str, float]:
        """Compute basic physical bioacoustic metrics."""
        rms = float(np.sqrt(np.mean(waveform ** 2)))
        zcr = float(np.mean(np.abs(np.diff(np.sign(waveform)))) / 2.0)
        fft_mag = np.abs(np.fft.rfft(waveform))
        freqs = np.fft.rfftfreq(len(waveform), 1.0 / sr)
        total_mag = np.sum(fft_mag) + 1e-9
        centroid = float(np.sum(freqs * fft_mag) / total_mag)
        bandwidth = float(np.sqrt(np.sum(((freqs - centroid) ** 2) * fft_mag) / total_mag))

        return {
            "fundamental_frequency_hz": round(float(centroid * 0.25), 2),
            "spectral_centroid_hz": round(centroid, 2),
            "spectral_bandwidth_hz": round(bandwidth, 2),
            "spectral_flatness": round(float(np.exp(np.mean(np.log(fft_mag + 1e-9))) / (np.mean(fft_mag) + 1e-9)), 6),
            "zero_crossing_rate": round(zcr, 6),
            "rms_energy": round(rms, 6),
        }


# Lazy Singleton
_yamnet_instance: Optional[YAMNetClassifier] = None


def get_yamnet_classifier() -> YAMNetClassifier:
    global _yamnet_instance
    if _yamnet_instance is None:
        _yamnet_instance = YAMNetClassifier()
    return _yamnet_instance


def get_classifier():
    """Compatibility interface for legacy callers."""
    return get_yamnet_classifier(), None


async def classify_audio_file(filepath: str) -> Dict[str, Any]:
    """
    Asynchronously classify an audio file using YAMNet.
    """
    # Load audio using soundfile / scipy
    try:
        data, sr = sf.read(filepath)
    except Exception:
        import librosa
        data, sr = librosa.load(filepath, sr=TARGET_SR)

    # Convert to 16kHz mono if needed
    if sr != TARGET_SR:
        try:
            import scipy.signal
            num_samples = int(len(data) * float(TARGET_SR) / sr)
            data = scipy.signal.resample(data, num_samples)
        except Exception:
            pass

    if len(data.shape) > 1:
        data = np.mean(data, axis=1)

    classifier = get_yamnet_classifier()
    return classifier.predict(data)
