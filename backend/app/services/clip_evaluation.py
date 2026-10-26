"""
Scores the classifier on a folder of labelled clips.

Folder layout (folder name = what the clips really contain):

    clips/
      chainsaw/        *.mp3, *.wav, *.mp4 ...
      gunshot/
      vehicle/         (or vehicle_engine/)
      vessel/          (or boat/, illegal_vessel/)
      blast/           (or blast_fishing/)
      none/            sounds with NO threat: birdsong, rain, wind, frogs ... (or wildlife/, ambient/)

Each clip gets one verdict: its strongest threat window, if that window reaches the threshold.
"""
import csv
import io
import os
import numpy as np
from collections import Counter, defaultdict
from typing import Any, Dict, List, Optional, Tuple

from app.services.audio_simulation import (
    ALERT_THRESHOLD,
    SUPPORTED_EXTENSIONS,
    AudioDecodeError,
    analyze_clip,
    decode_audio,
)

NONE = "NONE"

FOLDER_LABELS = {
    "chainsaw": "CHAINSAW",
    "gunshot": "GUNSHOT", "gun": "GUNSHOT",
    "vehicle": "VEHICLE_ENGINE", "vehicle_engine": "VEHICLE_ENGINE", "engine": "VEHICLE_ENGINE",
    "vessel": "ILLEGAL_VESSEL", "boat": "ILLEGAL_VESSEL", "illegal_vessel": "ILLEGAL_VESSEL",
    "blast": "BLAST_FISHING", "blast_fishing": "BLAST_FISHING",
    "none": NONE, "no_threat": NONE, "wildlife": NONE, "ambient": NONE, "negative": NONE, "background": NONE,
}


def label_for_folder(name: str) -> Optional[str]:
    return FOLDER_LABELS.get(name.strip().lower().replace(" ", "_").replace("-", "_"))


def find_clips(root: str) -> List[Tuple[str, str]]:
    """Returns (path, expected_label) for every audio or video file in the labelled sub-folders."""
    if not os.path.isdir(root):
        raise ValueError(f"Folder not found: {root}")
    clips: List[Tuple[str, str]] = []
    for entry in sorted(os.listdir(root)):
        folder = os.path.join(root, entry)
        if not os.path.isdir(folder):
            continue
        expected = label_for_folder(entry)
        if expected is None:
            accepted = ", ".join(sorted(FOLDER_LABELS))
            raise ValueError(f"Unknown folder name '{entry}'. Use one of: {accepted}")
        for name in sorted(os.listdir(folder)):
            if name.lower().endswith(SUPPORTED_EXTENSIONS):
                clips.append((os.path.join(folder, name), expected))
    return clips


from app.services.audio_classifier import load_audio_file


def classify_clip(classifier: Any, waveform: np.ndarray, threshold: float = ALERT_THRESHOLD) -> Dict[str, Any]:
    """
    Classify a clip waveform using YAMNet inference with peak scoring across 0.96s frames.
    """
    result = classifier.predict(waveform)
    threat_type = result.get("threat_type", "UNKNOWN")
    confidence = float(result.get("confidence", 0.0))
    at_s = result.get("at_s", 0.0)
    model_name = result.get("pipeline", {}).get("model", "unknown")

    flagged = threat_type not in ("UNKNOWN", "NONE", "SILENCE", None) and confidence >= threshold
    return {
        "predicted": threat_type if flagged else NONE,
        "confidence": round(confidence, 3),
        "at_s": at_s if flagged else None,
        "model": model_name,
    }


def evaluate_folder(root: str, classifier: Any, threshold: float = ALERT_THRESHOLD) -> Dict[str, Any]:
    clips = find_clips(root)
    rows: List[Dict[str, Any]] = []
    unreadable: List[Dict[str, str]] = []
    model_name = ""
    for path, expected in clips:
        name = os.path.relpath(path, root).replace("\\", "/")
        try:
            # On-the-fly resampling strictly to 16 kHz mono float32
            waveform = load_audio_file(path, target_sr=16000)
        except Exception:
            try:
                waveform = decode_audio(path)
            except Exception as error:
                unreadable.append({"file": name, "reason": str(error)})
                continue
        verdict = classify_clip(classifier, waveform, threshold)
        model_name = model_name or verdict["model"]
        rows.append({"file": name, "expected": expected, **{k: verdict[k] for k in ("predicted", "confidence", "at_s")}})
    return {"rows": rows, "unreadable": unreadable, "model": model_name or "unknown", "threshold": threshold}


def compute_metrics(rows: List[Dict[str, Any]]) -> Dict[str, Any]:
    total = len(rows)
    confusion: Dict[str, Counter] = defaultdict(Counter)
    for row in rows:
        confusion[row["expected"]][row["predicted"]] += 1

    predicted_totals = Counter(row["predicted"] for row in rows)
    classes = sorted({row["expected"] for row in rows} | {row["predicted"] for row in rows})

    per_class = {}
    for label in sorted({row["expected"] for row in rows}):
        support = sum(confusion[label].values())
        correct = confusion[label][label]
        predicted_count = predicted_totals[label]
        per_class[label] = {
            "clips": support,
            "correct": correct,
            "recall": correct / support if support else None,
            "precision": correct / predicted_count if predicted_count else None,
        }

    threat_rows = [r for r in rows if r["expected"] != NONE]
    quiet_rows = [r for r in rows if r["expected"] == NONE]
    return {
        "total": total,
        "accuracy": sum(1 for r in rows if r["expected"] == r["predicted"]) / total if total else None,
        "classes": classes,
        "confusion": {k: dict(v) for k, v in confusion.items()},
        "per_class": per_class,
        # Of the clips that really contain a threat, how many raised any alert at all?
        "threat_detection_rate": (sum(1 for r in threat_rows if r["predicted"] != NONE) / len(threat_rows)) if threat_rows else None,
        # Of the clips with no threat, how many wrongly raised an alert?
        "false_alarm_rate": (sum(1 for r in quiet_rows if r["predicted"] != NONE) / len(quiet_rows)) if quiet_rows else None,
        "threat_clips": len(threat_rows),
        "no_threat_clips": len(quiet_rows),
    }


def _pct(value: Optional[float]) -> str:
    return "n/a" if value is None else f"{value * 100:.0f}%"


def render_markdown(result: Dict[str, Any], metrics: Dict[str, Any], real_model: bool) -> str:
    out = io.StringIO()
    out.write("# Clip evaluation\n\n")
    out.write(f"- Model: **{result['model']}**\n")
    out.write(f"- Alert threshold: {result['threshold']}\n")
    out.write(f"- Clips scored: {metrics['total']} ({metrics['threat_clips']} with a threat, {metrics['no_threat_clips']} without)\n\n")
    if not real_model:
        out.write("> **Warning:** real YAMNet was not loaded, so these numbers describe the simple fallback heuristic, not the neural network. Do not quote them as the model's accuracy.\n\n")
    out.write(f"- Overall accuracy: **{_pct(metrics['accuracy'])}**\n")
    out.write(f"- Threat clips that raised an alert: **{_pct(metrics['threat_detection_rate'])}**\n")
    out.write(f"- Non-threat clips that wrongly raised an alert (false alarms): **{_pct(metrics['false_alarm_rate'])}**\n\n")

    out.write("## Per class\n\n| Clips really containing | Count | Found | Recall | Precision |\n|---|---|---|---|---|\n")
    for label, stats in metrics["per_class"].items():
        out.write(f"| {label} | {stats['clips']} | {stats['correct']} | {_pct(stats['recall'])} | {_pct(stats['precision'])} |\n")

    out.write("\n## Confusion table (rows: what the clip really is, columns: what the system said)\n\n")
    out.write("| Really \\ Said | " + " | ".join(metrics["classes"]) + " |\n")
    out.write("|---|" + "---|" * len(metrics["classes"]) + "\n")
    for label in sorted(metrics["confusion"]):
        cells = [str(metrics["confusion"][label].get(c, 0)) for c in metrics["classes"]]
        out.write(f"| {label} | " + " | ".join(cells) + " |\n")

    wrong = [r for r in result["rows"] if r["expected"] != r["predicted"]]
    if wrong:
        out.write("\n## Clips the system got wrong\n\n| File | Really | Said | Confidence | At |\n|---|---|---|---|---|\n")
        for r in wrong:
            at = "-" if r["at_s"] is None else f"{r['at_s']:.1f} s"
            out.write(f"| {r['file']} | {r['expected']} | {r['predicted']} | {r['confidence']:.2f} | {at} |\n")
    if result["unreadable"]:
        out.write("\n## Files that could not be read\n\n")
        for item in result["unreadable"]:
            out.write(f"- {item['file']}: {item['reason']}\n")
    out.write("\nSmall test sets give rough numbers only. Report them with the number of clips used.\n")
    return out.getvalue()


def write_csv(path: str, rows: List[Dict[str, Any]]) -> None:
    with open(path, "w", newline="", encoding="utf-8") as handle:
        writer = csv.DictWriter(handle, fieldnames=["file", "expected", "predicted", "confidence", "at_s"])
        writer.writeheader()
        writer.writerows(rows)
