# 🌲 Google YAMNet FSC22 Benchmark Evaluation Results

* **Benchmark Dataset**: [FSC22 (Forest Sound Classification Dataset)](https://www.kaggle.com/datasets/irmiot22/fsc22-dataset)
* **Model**: Google YAMNet (TensorFlow Hub SavedModel, 521 AudioSet Classes)
* **Input Audio**: 16 kHz Mono Float32
* **Total Evaluated Samples**: 100
* **Overall Accuracy**: **71.00%**
* **Inference Latency**: **76.8 ms / sample**

---

## 📊 Per-Class Accuracy Breakdown

| Threat Category | Correct | Total Samples | Accuracy |
| :--- | :---: | :---: | :---: |
| **CHAINSAW** | 13 | 25 | **52.00%** |
| **GUNSHOT** | 23 | 25 | **92.00%** |
| **VEHICLE_ENGINE** | 23 | 25 | **92.00%** |
| **UNKNOWN** | 12 | 25 | **48.00%** |

---

## 🔬 Benchmark Methodology
1. Tested against the 27 physical sound classes in the official FSC22 corpus.
2. Evaluated zero-shot classification using pre-trained Google YAMNet weights mapped to EchoGuard domain categories.
3. Evaluated on CPU with native 16kHz resampled mono audio.
