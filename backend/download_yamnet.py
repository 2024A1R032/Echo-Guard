"""
EchoGuard YAMNet Weights Verification and Downloader
===================================================
Verifies presence of Google's pre-trained YAMNet model weights and AudioSet class map.
Downloads and extracts the official TensorFlow Hub bundle if missing.

Run with:
    python download_yamnet.py
"""
import io
import os
import sys
import tarfile
import platform

YAMNET_MODEL_URL = "https://tfhub.dev/google/yamnet/1"


def download_yamnet(target_dir: str = None) -> bool:
    if target_dir is None:
        base_dir = os.path.dirname(os.path.abspath(__file__))
        target_dir = os.path.join(base_dir, "ml_models", "yamnet")

    print(f"[YAMNET SETUP] Target directory: {target_dir}")
    print(f"[YAMNET SETUP] Python environment: {sys.executable} (Python {platform.python_version()})")

    saved_model_pb = os.path.join(target_dir, "saved_model.pb")
    class_map = os.path.join(target_dir, "assets", "yamnet_class_map.csv")

    if os.path.exists(saved_model_pb) and os.path.exists(class_map):
        print(f"[YAMNET SETUP] Model weights already present:")
        print(f"  - SavedModel: {saved_model_pb} ({os.path.getsize(saved_model_pb)} bytes)")
        print(f"  - Class Map:  {class_map} ({os.path.getsize(class_map)} bytes)")
        return True

    print(f"[YAMNET SETUP] Model weights missing. Downloading from {YAMNET_MODEL_URL}...")
    try:
        import requests
    except ImportError:
        print("[YAMNET ERROR] 'requests' library required. Run: pip install requests", file=sys.stderr)
        return False

    os.makedirs(target_dir, exist_ok=True)
    download_url = f"{YAMNET_MODEL_URL}?tf-hub-format=compressed"

    try:
        resp = requests.get(download_url, headers={"User-Agent": "EchoGuard-Agent/1.0"}, timeout=60)
        if resp.status_code != 200:
            print(f"[YAMNET ERROR] Download failed with HTTP {resp.status_code}", file=sys.stderr)
            return False
        
        print("[YAMNET SETUP] Extracting tar archive...")
        tar = tarfile.open(fileobj=io.BytesIO(resp.content), mode="r:gz")
        tar.extractall(target_dir)
        tar.close()
        print(f"[YAMNET SETUP] Successfully installed YAMNet weights into: {target_dir}")
        return True
    except Exception as e:
        print(f"[YAMNET ERROR] Could not download YAMNet: {e}", file=sys.stderr)
        return False


if __name__ == "__main__":
    success = download_yamnet()
    sys.exit(0 if success else 1)
