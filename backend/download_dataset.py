# download_dataset.py
# Script for downloading audio datasets used by EchoGuard
import os
import subprocess
import sys
import imageio_ffmpeg

def download_sounds():
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    sounds = {
        "chainsaw": "ytsearch5:chainsaw sound effect short",
        "gunshot": "ytsearch5:gunshot sound effect short",
        "vehicle": "ytsearch5:truck engine sound effect short",
        "illegal_vessel": "ytsearch5:motorboat river engine sound effect short",
        "none": "ytsearch5:forest ambient birdsong rain short"
    }
    
    for category, query in sounds.items():
        os.makedirs(f"clips/{category}", exist_ok=True)
        print(f"\n--- Downloading 5 audio clips for: {category} ---")
        cmd = [
            sys.executable, "-m", "yt_dlp",
            "--ffmpeg-location", ffmpeg_exe,
            "-x", "--audio-format", "mp3",
            "--match-filter", "duration < 120",
            "-o", f"clips/{category}/%(id)s.%(ext)s",
            query
        ]
        subprocess.run(cmd)
        
    print("\nDone! All clips downloaded.")

if __name__ == "__main__":
    download_sounds()