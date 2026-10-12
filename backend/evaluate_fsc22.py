"""
EchoGuard: FSC22 Bioacoustic Dataset Evaluation Benchmark
=========================================================
Runs the YAMNet classification pipeline against the FSC22 (Forest Sound Classification)
benchmark dataset from Kaggle: `irmiot22/fsc22-dataset`.

Usage:
  1. Download FSC22 dataset from Kaggle:
     kaggle datasets download -d irmiot22/fsc22-dataset
     unzip fsc22-dataset.zip -d ./data/fsc22
  2. Run evaluation:
     python evaluate_fsc22.py --dataset_dir ./data/fsc22
"""

import os
import sys
import argparse
import asyncio
import time
from typing import Dict, List, Any
import numpy as np

# Ensure backend root in path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from app.services.audio_classifier import classify_audio_file, TARGET_SR

# Target domain threat classes
ECHO_CLASSES = ["CHAINSAW", "GUNSHOT", "ILLEGAL_VESSEL", "VEHICLE_ENGINE", "UNKNOWN"]

# Dataset class name to EchoGuard category mapping
FSC22_LABEL_MAPPING = {
    "chainsaw": "CHAINSAW",
    "gunshot": "GUNSHOT",
    "firearms": "GUNSHOT",
    "rifle": "GUNSHOT",
    "engine": "VEHICLE_ENGINE",
    "truck": "VEHICLE_ENGINE",
    "car": "VEHICLE_ENGINE",
    "tractor": "VEHICLE_ENGINE",
    "boat": "ILLEGAL_VESSEL",
    "motorboat": "ILLEGAL_VESSEL",
    "rain": "UNKNOWN",
    "wind": "UNKNOWN",
    "birds": "UNKNOWN",
    "insects": "UNKNOWN",
    "ambient": "UNKNOWN",
}


async def evaluate_fsc22_dataset(dataset_dir: str, limit_per_class: int = 20) -> Dict[str, Any]:
    print("=" * 70)
    print("[ECHO GUARD] YAMNet FSC22 Dataset Evaluation Benchmark")
    print(f"Dataset Directory: {dataset_dir}")
    print(f"Target Sample Rate: {TARGET_SR} Hz (Mono)")
    print("=" * 70)

    if not os.path.exists(dataset_dir):
        print(f"\n[INFO] Dataset directory '{dataset_dir}' not found.")
        print("To download the real benchmark dataset from Kaggle, run:")
        print("   kaggle datasets download -d irmiot22/fsc22-dataset")
        print("   unzip fsc22-dataset.zip -d ./data/fsc22\n")
        print("Running synthetic benchmark validation mode instead...\n")
        return await run_synthetic_benchmark()

    results_by_class: Dict[str, Dict[str, int]] = {cls: {"correct": 0, "total": 0} for cls in ECHO_CLASSES}
    total_samples = 0
    correct_samples = 0
    start_time = time.time()

    # Traverse audio files in class folders or flat CSV
    for root, dirs, files in os.walk(dataset_dir):
        wav_files = [f for f in files if f.lower().endswith((".wav", ".flac", ".ogg"))]
        if not wav_files:
            continue

        folder_name = os.path.basename(root).lower()
        mapped_ground_truth = "UNKNOWN"
        for key, val in FSC22_LABEL_MAPPING.items():
            if key in folder_name:
                mapped_ground_truth = val
                break

        count = 0
        for wav_file in wav_files:
            if count >= limit_per_class:
                break

            wav_path = os.path.join(root, wav_file)
            try:
                pred = await classify_audio_file(wav_path)
                predicted_class = pred["threat_type"]
                confidence = pred["confidence"]

                is_correct = (predicted_class == mapped_ground_truth)
                if is_correct:
                    results_by_class[mapped_ground_truth]["correct"] += 1
                    correct_samples += 1

                results_by_class[mapped_ground_truth]["total"] += 1
                total_samples += 1
                count += 1
            except Exception as e:
                print(f"Error processing {wav_file}: {e}")

    elapsed = time.time() - start_time
    overall_acc = (correct_samples / total_samples * 100.0) if total_samples > 0 else 0.0

    print("\n[RESULTS] FSC22 YAMNet Evaluation Results:")
    print("-" * 60)
    print(f"{'Class Name':<20} | {'Correct':<10} | {'Total':<10} | {'Accuracy':<10}")
    print("-" * 60)
    for cls, stats in results_by_class.items():
        if stats["total"] > 0:
            acc = (stats["correct"] / stats["total"]) * 100.0
            print(f"{cls:<20} | {stats['correct']:<10} | {stats['total']:<10} | {acc:>8.2f}%")
    print("-" * 60)
    print(f"Overall Accuracy: {overall_acc:.2f}% ({correct_samples}/{total_samples} samples)")
    print(f"Inference Latency: {elapsed / max(1, total_samples) * 1000:.1f} ms / sample")
    print("=" * 60)

    return {
        "overall_accuracy": overall_acc,
        "total_samples": total_samples,
        "results_by_class": results_by_class,
        "benchmark_source": "irmiot22/fsc22-dataset (Kaggle)"
    }


async def run_synthetic_benchmark() -> Dict[str, Any]:
    """Fallback self-contained benchmark verifying YAMNet pipeline."""
    import tempfile
    import soundfile as sf

    print("Generating simulated bioacoustic waveforms for 5 threat classes...")
    test_specs = [
        ("CHAINSAW", 450.0, 1.5),
        ("GUNSHOT", 1200.0, 0.2),
        ("ILLEGAL_VESSEL", 180.0, 2.0),
        ("VEHICLE_ENGINE", 120.0, 2.0),
        ("UNKNOWN", 800.0, 1.0),
    ]

    correct = 0
    total = 0
    class_results = {cls: {"correct": 0, "total": 0} for cls in ECHO_CLASSES}

    with tempfile.TemporaryDirectory() as tmpdir:
        for threat, freq, duration in test_specs:
            t = np.linspace(0, duration, int(TARGET_SR * duration), endpoint=False)
            if threat == "CHAINSAW":
                waveform = 0.5 * np.sin(2 * np.pi * freq * t) + 0.3 * np.sin(2 * np.pi * freq * 2 * t)
            elif threat == "GUNSHOT":
                decay = np.exp(-30 * t)
                waveform = decay * np.sin(2 * np.pi * freq * t)
            elif threat == "ILLEGAL_VESSEL":
                waveform = 0.6 * np.sin(2 * np.pi * freq * t) + 0.1 * np.random.normal(0, 0.1, len(t))
            elif threat == "VEHICLE_ENGINE":
                waveform = 0.5 * np.sin(2 * np.pi * freq * t) + 0.2 * np.sin(2 * np.pi * (freq / 2) * t)
            else:
                waveform = 0.15 * np.random.uniform(-1.0, 1.0, len(t))

            wav_path = os.path.join(tmpdir, f"test_{threat}.wav")
            sf.write(wav_path, waveform.astype(np.float32), TARGET_SR)

            res = await classify_audio_file(wav_path)
            total += 1
            class_results[threat]["total"] += 1
            if res["threat_type"] == threat or (threat == "UNKNOWN" and res["threat_type"] == "UNKNOWN"):
                correct += 1
                class_results[threat]["correct"] += 1

            print(f"  * Ground Truth: {threat:<15} -> Predicted: {res['threat_type']:<15} (Conf: {res['confidence']:.2f})")

    accuracy = (correct / total) * 100.0
    print("\n[SUCCESS] Simulated YAMNet Pipeline Validation Complete.")
    print(f"Overall Match Rate: {accuracy:.1f}%\n")
    return {"overall_accuracy": accuracy, "total_samples": total, "results_by_class": class_results}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Evaluate YAMNet on FSC22 dataset")
    parser.add_argument("--dataset_dir", default="./data/fsc22", help="Path to FSC22 dataset")
    parser.add_argument("--limit", type=int, default=20, help="Max samples per class to test")
    args = parser.parse_args()

    asyncio.run(evaluate_fsc22_dataset(args.dataset_dir, args.limit))
