import time

from app.services.audio_classifier import YAMNetClassifier


def make_failing_classifier():
    classifier = YAMNetClassifier()
    calls = []

    def fake_load():
        calls.append(1)
        classifier.load_error = "ConnectionError: no network"
        classifier._last_failure = time.monotonic()

    classifier._load_model_locked = fake_load
    return classifier, calls


def test_failed_load_is_not_retried_straight_away():
    classifier, calls = make_failing_classifier()
    classifier._load_model()
    classifier._load_model()
    classifier._load_model()
    assert len(calls) == 1
    assert classifier.load_error == "ConnectionError: no network"


def test_load_is_retried_after_the_cooldown():
    classifier, calls = make_failing_classifier()
    classifier._load_model()
    classifier._last_failure = time.monotonic() - (YAMNetClassifier.RETRY_AFTER_SECONDS + 5)
    classifier._load_model()
    assert len(calls) == 2
