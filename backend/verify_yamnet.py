"""
Checks whether the real YAMNet model can be used on this machine, and explains why not if it can't.

Run from the backend/ folder with the venv active:
    python verify_yamnet.py
"""
import platform
import sys

import numpy as np

from app.services.audio_classifier import get_yamnet_classifier


def main():
    print(f"Python {platform.python_version()}  ({sys.executable})")
    try:
        import tensorflow as tf
        print(f"TensorFlow {tf.__version__}: installed")
    except Exception as error:  # noqa: BLE001
        print(f"TensorFlow: not usable here ({type(error).__name__}: {error})")

    print("Loading YAMNet. The first run downloads about 15 MB, so it needs internet...")
    classifier = get_yamnet_classifier()
    classifier._load_model()

    if classifier._is_loaded:
        noise = np.random.default_rng(0).normal(0, 0.05, 32000).astype(np.float32)
        result = classifier.predict(noise)
        print()
        print(f"RESULT: real YAMNet is loaded ({len(classifier._class_names)} classes).")
        print(f"Model name the app reports: {result['pipeline']['model']}")
        top = ", ".join(f"{c['name']} {c['score']:.2f}" for c in result["top_classes"][:3])
        print(f"Smoke test on 2 seconds of noise, top labels: {top}")
        return 0

    error = classifier.load_error or "unknown"
    print()
    print("RESULT: real YAMNet is NOT loaded. The app is using the simple fallback heuristic.")
    print(f"Reason: {error}")
    print()
    if "No module named" in error or "ModuleNotFoundError" in error:
        print("Fix: install TensorFlow in THIS environment:  pip install tensorflow")
        print("     TensorFlow does not always support the newest Python versions. Python 3.11 is the safe")
        print("     choice, and it is the version AGENTS.md pins. Create the venv with 3.11 if needed.")
    elif any(word in error for word in ("HTTP", "Connection", "Max retries", "timed out", "Timeout", "resolve")):
        print("Fix: the model could not be downloaded. Check your internet connection, proxy or firewall.")
        print("     The download goes to https://tfhub.dev/google/yamnet/1 and ends up on kaggle.com.")
        print("     If you downloaded the model by hand, it must be unpacked into backend/ml_models/yamnet/")
        print("     so that saved_model.pb sits directly in that folder.")
    else:
        print("Fix: send the Reason line above together with the last lines of the backend log.")
    return 1


if __name__ == "__main__":
    raise SystemExit(main())
