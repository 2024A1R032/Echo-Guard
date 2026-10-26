# Clip evaluation

- Model: **Google YAMNet (TensorFlow Hub)**
- Alert threshold: 0.5
- Clips scored: 29 (27 with a threat, 2 without)

- Overall accuracy: **62%**
- Threat clips that raised an alert: **89%**
- Non-threat clips that wrongly raised an alert (false alarms): **0%**

## Per class

| Clips really containing | Count | Found | Recall | Precision |
|---|---|---|---|---|
| CHAINSAW | 8 | 2 | 25% | 100% |
| GUNSHOT | 4 | 4 | 100% | 100% |
| ILLEGAL_VESSEL | 5 | 3 | 60% | 60% |
| NONE | 2 | 2 | 100% | 40% |
| VEHICLE_ENGINE | 10 | 7 | 70% | 54% |

## Confusion table (rows: what the clip really is, columns: what the system said)

| Really \ Said | CHAINSAW | GUNSHOT | ILLEGAL_VESSEL | NONE | VEHICLE_ENGINE |
|---|---|---|---|---|---|
| CHAINSAW | 2 | 0 | 1 | 0 | 5 |
| GUNSHOT | 0 | 4 | 0 | 0 | 0 |
| ILLEGAL_VESSEL | 0 | 0 | 3 | 1 | 1 |
| NONE | 0 | 0 | 0 | 2 | 0 |
| VEHICLE_ENGINE | 0 | 0 | 1 | 2 | 7 |

## Clips the system got wrong

| File | Really | Said | Confidence | At |
|---|---|---|---|---|
| chainsaw/2CoS5MrRGO4.mp3 | CHAINSAW | VEHICLE_ENGINE | 1.00 | 9.1 s |
| chainsaw/I1vD-4cGpe4.mp3 | CHAINSAW | ILLEGAL_VESSEL | 0.67 | 3.8 s |
| chainsaw/cRuNh9vzwxk.mp3 | CHAINSAW | VEHICLE_ENGINE | 1.00 | 35.0 s |
| chainsaw/dzK_N5em-5Q.mp3 | CHAINSAW | VEHICLE_ENGINE | 1.00 | 1.4 s |
| chainsaw/fCR1Ytk9dNc.mp3 | CHAINSAW | VEHICLE_ENGINE | 1.00 | 2.9 s |
| chainsaw/mVrXdcfpJpQ.mp3 | CHAINSAW | VEHICLE_ENGINE | 1.00 | 0.5 s |
| illegal_vessel/J8abx9bfB_c.mp3 | ILLEGAL_VESSEL | NONE | 0.00 | - |
| illegal_vessel/yyYHsjWOMQU.mp3 | ILLEGAL_VESSEL | VEHICLE_ENGINE | 1.00 | 6.2 s |
| vehicle/BWFZ_y4KJE0.mp3 | VEHICLE_ENGINE | NONE | 0.46 | - |
| vehicle/CxzQjtH9ncM.mp3 | VEHICLE_ENGINE | NONE | 0.24 | - |
| vehicle/FmT5WiYUWsc.mp3 | VEHICLE_ENGINE | ILLEGAL_VESSEL | 1.00 | 23.0 s |

Small test sets give rough numbers only. Report them with the number of clips used.
