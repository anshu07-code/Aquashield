# Vision Evaluation Results

## Evaluation Results (real Bedrock inference)
**Date:** 2026-10-10T23:20:51.937022
**Model:** Bedrock multimodal via `C:\Users\BIT\Downloads\jalrakshak/services/api/src/vision/` (`BEDROCK_MODEL_ID`)
**Dataset:** 32 labelled images (29 produced real inferences)

- Model: `amazon.nova-lite-v1:0` (region `ap-southeast-2`), real Bedrock Converse inference
- 3 of 32 images produced no valid inference (fell back to `needs_review`) and
  are excluded from the metrics below — a fallback is never counted as a correct answer.

### Metrics (floodedRoad binary classification)

| Metric    | Value  |
|-----------|--------|
| Accuracy  | 0.793 |
| Precision | 0.812 |
| Recall    | 0.812 |
| F1        | 0.812 |

### Confusion Matrix

|            | Predicted Positive | Predicted Negative |
|------------|-------------------|-------------------|
| Actual Positive | TP: 13 | FN: 3 |
| Actual Negative | FP: 3 | TN: 10 |

### Notes

- Evaluation set: 30+ images (see data/eval/labels.json)
- This evaluation measures floodedRoad classification accuracy only
- Trust score is NOT evaluated here (it's a separate function with its own tests)
