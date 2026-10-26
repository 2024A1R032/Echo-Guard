import os
import numpy as np
import pytest
import soundfile as sf

from app.services import clip_evaluation as ev
from app.services.audio_classifier import AUDIOSET_CLASSES_SAMPLE, YAMNetClassifier
from tests.services.test_audio_simulation import chainsaw_like

SR = 16000


@pytest.fixture
def fallback_classifier(monkeypatch):
    classifier = YAMNetClassifier()
    monkeypatch.setattr(classifier, "_load_model", lambda: None)
    classifier._class_names = AUDIOSET_CLASSES_SAMPLE
    classifier._is_loaded = False
    return classifier


def row(expected, predicted, confidence=0.9):
    return {"file": f"{expected}.wav", "expected": expected, "predicted": predicted, "confidence": confidence, "at_s": 1.0}


def test_folder_names_map_to_labels():
    assert ev.label_for_folder("Chainsaw") == "CHAINSAW"
    assert ev.label_for_folder("illegal vessel") == "ILLEGAL_VESSEL"
    assert ev.label_for_folder("wildlife") == ev.NONE
    assert ev.label_for_folder("birds") is None


def test_find_clips_reads_labelled_subfolders(tmp_path):
    (tmp_path / "chainsaw").mkdir()
    (tmp_path / "none").mkdir()
    (tmp_path / "chainsaw" / "a.mp3").write_bytes(b"x")
    (tmp_path / "chainsaw" / "notes.txt").write_bytes(b"x")
    (tmp_path / "none" / "b.wav").write_bytes(b"x")
    found = ev.find_clips(str(tmp_path))
    assert [(os.path.basename(p), label) for p, label in found] == [("a.mp3", "CHAINSAW"), ("b.wav", ev.NONE)]


def test_unknown_folder_name_is_rejected(tmp_path):
    (tmp_path / "birds").mkdir()
    with pytest.raises(ValueError, match="Unknown folder name"):
        ev.find_clips(str(tmp_path))


def test_metrics_are_computed_correctly():
    rows = (
        [row("CHAINSAW", "CHAINSAW")] * 2 + [row("CHAINSAW", ev.NONE)]
        + [row("GUNSHOT", "GUNSHOT"), row("GUNSHOT", "CHAINSAW")]
        + [row(ev.NONE, ev.NONE)] * 3 + [row(ev.NONE, "GUNSHOT")]
    )
    m = ev.compute_metrics(rows)
    assert m["total"] == 9
    assert m["accuracy"] == pytest.approx(6 / 9)
    assert m["threat_clips"] == 5 and m["no_threat_clips"] == 4
    assert m["threat_detection_rate"] == pytest.approx(4 / 5)
    assert m["false_alarm_rate"] == pytest.approx(1 / 4)
    assert m["per_class"]["CHAINSAW"]["recall"] == pytest.approx(2 / 3)
    assert m["per_class"]["CHAINSAW"]["precision"] == pytest.approx(2 / 3)
    assert m["confusion"]["GUNSHOT"]["CHAINSAW"] == 1


def test_folder_evaluation_end_to_end(tmp_path, fallback_classifier):
    (tmp_path / "chainsaw").mkdir()
    (tmp_path / "none").mkdir()
    sf.write(str(tmp_path / "chainsaw" / "saw.wav"), chainsaw_like(6.0), SR)
    sf.write(str(tmp_path / "none" / "quiet.wav"), np.zeros(SR * 4, dtype=np.float32), SR)
    (tmp_path / "none" / "broken.mp3").write_bytes(b"not audio")

    result = ev.evaluate_folder(str(tmp_path), fallback_classifier)
    by_file = {r["file"]: r for r in result["rows"]}
    assert by_file["chainsaw/saw.wav"]["predicted"] == "CHAINSAW"
    assert by_file["none/quiet.wav"]["predicted"] == ev.NONE
    assert [u["file"] for u in result["unreadable"]] == ["none/broken.mp3"]
    assert "Fallback" in result["model"]


def test_report_warns_when_model_is_not_real():
    rows = [row("CHAINSAW", "CHAINSAW"), row(ev.NONE, ev.NONE)]
    result = {"rows": rows, "unreadable": [], "model": "Fallback DSP Heuristic", "threshold": 0.5}
    report = ev.render_markdown(result, ev.compute_metrics(rows), real_model=False)
    assert "real YAMNet was not loaded" in report
    assert "Overall accuracy: **100%**" in report
