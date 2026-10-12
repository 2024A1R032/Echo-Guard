import os
import sys

# Add backend directory to sys.path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app.services.audio_classifier import get_yamnet_classifier

def main():
    classifier = get_yamnet_classifier()
    classifier._load_model()
    print(f"_is_loaded: {classifier._is_loaded}")
    print(f"Loaded classes count: {len(classifier._class_names)} classes")
    
    if classifier._is_loaded and len(classifier._class_names) == 521:
        print("[SUCCESS] Real YAMNet model is loaded and ready for 521-class inference.")
    else:
        print("[WARNING] YAMNet model did not load 521 classes.")

if __name__ == "__main__":
    main()
