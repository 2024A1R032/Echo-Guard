"""
Scores the classifier on your own labelled clips and writes evaluation_results.md.

Put clips in sub-folders named after what they contain, for example:
    clips/chainsaw/saw1.mp3
    clips/gunshot/shot1.wav
    clips/vehicle/truck.mp4
    clips/none/birdsong.mp3        <- sounds with NO threat: birdsong, rain, wind, frogs ...

Run from the backend/ folder with the venv active:
    python evaluate_clips.py clips
    python evaluate_clips.py clips --threshold 0.6
"""
import argparse
import os

from app.services.audio_classifier import get_yamnet_classifier, load_audio_file
from app.services.audio_simulation import ALERT_THRESHOLD
from app.services.clip_evaluation import (
    compute_metrics,
    evaluate_folder,
    render_markdown,
    write_csv,
    classify_clip,
    label_for_folder,
    NONE,
)


def main():
    parser = argparse.ArgumentParser(description="Score the classifier on labelled clips or a single audio file.")
    parser.add_argument("folder", help="folder with one sub-folder per label, or path to a single audio file")
    parser.add_argument("--threshold", type=float, default=ALERT_THRESHOLD, help="confidence needed to raise an alert")
    parser.add_argument("--out", default="evaluation_results.md", help="where to write the report")
    args = parser.parse_args()

    classifier = get_yamnet_classifier()
    print("Loading the classifier...")
    classifier._load_model()
    real_model = bool(classifier._is_loaded)
    if not real_model:
        print("WARNING: real YAMNet is not loaded. Run  python verify_yamnet.py  to see why.")
        print("         Results below describe the fallback heuristic, not the neural network.\n")

    # If single audio file provided
    if os.path.isfile(args.folder):
        waveform = load_audio_file(args.folder, target_sr=16000)
        verdict = classify_clip(classifier, waveform, args.threshold)
        print(f"\n--- Single Clip Evaluation: {args.folder} ---")
        print(f"Model: {verdict['model']}")
        print(f"Predicted Threat: {verdict['predicted']}")
        print(f"Peak Confidence:  {verdict['confidence']}")
        print(f"Peak Timestamp:   {verdict['at_s']}s")
        return

    try:
        result = evaluate_folder(args.folder, classifier, args.threshold)
    except ValueError as error:
        raise SystemExit(f"Problem with the clips folder: {error}")
    if not result["rows"]:
        raise SystemExit("No readable clips found. Put audio or video files inside sub-folders such as chainsaw/ or none/.")

    metrics = compute_metrics(result["rows"])
    report = render_markdown(result, metrics, real_model)
    with open(args.out, "w", encoding="utf-8") as handle:
        handle.write(report)
    write_csv(os.path.splitext(args.out)[0] + ".csv", result["rows"])

    print(report)
    print(f"Saved {args.out} and {os.path.splitext(args.out)[0]}.csv")


if __name__ == "__main__":
    main()
