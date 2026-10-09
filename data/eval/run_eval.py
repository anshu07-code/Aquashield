#!/usr/bin/env python3
"""
Aquashield Vision Evaluation Runner.

Run against labelled evaluation images to measure triage accuracy.

Usage:
  MOCK_BEDROCK=1 python data/eval/run_eval.py           # Use mock Bedrock responses
  MOCK_BEDROCK=1 python data/eval/run_eval.py --live   # Test images through mock only

Requirements:
  - Images in data/eval/images/
  - Labels in data/eval/labels.json
  - Python 3.10+
  - pydantic, python-dotenv

Outputs:
  - Console: per-image results, accuracy, confusion matrix
  - data/eval/results.md: honest numbers for README

IMPORTANT: This evaluation uses real model outputs on labelled images.
Use --synthetic for testing the runner code without real images.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path
from typing import Any

# Add services/api/src/vision to path for the vision module
PROJECT_ROOT = Path(__file__).parent.parent.parent
sys.path.insert(0, str(PROJECT_ROOT / "services" / "api" / "src" / "vision"))

LABELS_FILE = PROJECT_ROOT / "data" / "eval" / "labels.json"
RESULTS_FILE = PROJECT_ROOT / "data" / "eval" / "results.md"
IMAGES_DIR = PROJECT_ROOT / "data" / "eval" / "images"


def load_labels() -> dict[str, Any]:
    """Load evaluation labels from labels.json."""
    if not LABELS_FILE.exists():
        raise FileNotFoundError(
            f"labels.json not found at {LABELS_FILE}. "
            "See labels.json.example for the format."
        )
    with open(LABELS_FILE) as f:
        return json.load(f)


def run_vision_on_image(image_path: Path) -> dict[str, Any]:
    """
    Run the vision module on a single image.
    Falls back to mock if MOCK_BEDROCK=1 or if image doesn't exist.
    """
    os.environ.setdefault("MOCK_BEDROCK", "1")

    try:
        from index import analyzeImage
    except ImportError as e:
        return {"error": f"Could not import vision module: {e}"}

    if not image_path.exists():
        return {
            "error": f"Image not found: {image_path}",
            "isRoadScene": None,
            "floodedRoad": None,
        }

    try:
        with open(image_path, "rb") as f:
            image_bytes = f.read()
    except Exception as e:
        return {"error": f"Could not read image: {e}"}

    content_type = "image/jpeg"
    if image_path.suffix.lower() in (".png",):
        content_type = "image/png"
    elif image_path.suffix.lower() in (".webp",):
        content_type = "image/webp"

    try:
        result = analyzeImage(image_bytes, content_type)
        return {
            "isRoadScene": result.get("isRoadScene"),
            "floodedRoad": result.get("floodedRoad"),
            "waterDepthTier": result.get("waterDepthTier"),
            "blockedDrain": result.get("blockedDrain"),
            "debrisOrWasteObstruction": result.get("debrisOrWasteObstruction"),
            "vehiclesStranded": result.get("vehiclesStranded"),
            "confidence": result.get("confidence"),
            "explanation": result.get("explanation"),
            "error": None,
        }
    except Exception as e:
        return {"error": str(e), "isRoadScene": None, "floodedRoad": None}


def evaluate_predictions(labels: list[dict], predictions: list[dict]) -> dict[str, Any]:
    """
    Compute accuracy and confusion matrix for floodedRoad classification.

    Confusion matrix for floodedRoad (binary):
      - TP: predicted floodedRoad=true, actual floodedRoad=true
      - TN: predicted floodedRoad=false, actual floodedRoad=false
      - FP: predicted floodedRoad=true, actual floodedRoad=false
      - FN: predicted floodedRoad=false, actual floodedRoad=true
    """
    tp = tn = fp = fn = 0

    results = []
    for label, pred in zip(labels, predictions):
        if pred.get("error"):
            results.append({"id": label.get("id"), "status": "error", "error": pred.get("error")})
            continue

        actual = label.get("floodedRoad")
        predicted = pred.get("floodedRoad")

        if predicted is None or actual is None:
            results.append({"id": label.get("id"), "status": "skipped"})
            continue

        if predicted and actual:
            tp += 1
        elif not predicted and not actual:
            tn += 1
        elif predicted and not actual:
            fp += 1
        else:
            fn += 1

        results.append({
            "id": label.get("id"),
            "status": "correct" if (predicted == actual) else "wrong",
            "actual": actual,
            "predicted": predicted,
        })

    total = tp + tn + fp + fn
    accuracy = (tp + tn) / total if total > 0 else 0.0
    precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
    recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
    f1 = 2 * precision * recall / (precision + recall) if (precision + recall) > 0 else 0.0

    return {
        "results": results,
        "confusion_matrix": {"tp": tp, "tn": tn, "fp": fp, "fn": fn},
        "metrics": {
            "accuracy": round(accuracy, 3),
            "precision": round(precision, 3),
            "recall": round(recall, 3),
            "f1": round(f1, 3),
        },
        "total": total,
        "errors": sum(1 for r in results if r.get("status") == "error"),
    }


def run_synthetic_test() -> dict[str, Any]:
    """
    Run a synthetic test to verify the evaluation runner works.
    Uses mock responses — NOT real model performance.
    """
    labels = [
        {
            "id": "synthetic_001",
            "filename": "synthetic_001.jpg",
            "floodedRoad": True,
            "waterDepthTier": "knee",
        },
        {
            "id": "synthetic_002",
            "filename": "synthetic_002.jpg",
            "floodedRoad": False,
            "waterDepthTier": "none",
        },
        {
            "id": "synthetic_003",
            "filename": "synthetic_003.jpg",
            "floodedRoad": True,
            "waterDepthTier": "waist",
        },
        {
            "id": "synthetic_004",
            "filename": "synthetic_004.jpg",
            "floodedRoad": False,
            "waterDepthTier": "none",
        },
    ]

    # Mock predictions (simulating model output)
    predictions = [
        {"isRoadScene": True, "floodedRoad": True, "error": None},
        {"isRoadScene": True, "floodedRoad": False, "error": None},
        {"isRoadScene": True, "floodedRoad": True, "error": None},
        {"isRoadScene": True, "floodedRoad": False, "error": None},
    ]

    eval_result = evaluate_predictions(labels, predictions)
    eval_result["synthetic"] = True
    return eval_result


def print_results(result: dict[str, Any], synthetic: bool = False):
    """Print evaluation results to console."""
    label = "[SYNTHETIC TEST]" if synthetic else "[EVALUATION RESULTS]"
    print(f"\n{label}")
    print("=" * 50)

    if synthetic:
        print("This is a synthetic test — NOT real model performance.")
        print("To run real evaluation, add labelled images to data/eval/images/")
        print("and update data/eval/labels.json with ground truth.\n")

    metrics = result.get("metrics", {})
    print(f"Accuracy:  {metrics.get('accuracy', 'N/A')}")
    print(f"Precision: {metrics.get('precision', 'N/A')}")
    print(f"Recall:    {metrics.get('recall', 'N/A')}")
    print(f"F1:        {metrics.get('f1', 'N/A')}")

    cm = result.get("confusion_matrix", {})
    print(f"\nConfusion Matrix (floodedRoad):")
    print(f"  TP={cm.get('tp')}  FP={cm.get('fp')}")
    print(f"  FN={cm.get('fn')}  TN={cm.get('tn')}")
    print(f"\nTotal: {result.get('total', 0)} | Errors: {result.get('errors', 0)}")

    print("\nPer-image results:")
    for r in result.get("results", []):
        status = r.get("status", "unknown")
        id_ = r.get("id", "?")
        if status == "error":
            print(f"  [{status.upper()}] {id_}: {r.get('error')}")
        elif status == "skipped":
            print(f"  [SKIPPED] {id_}")
        else:
            print(f"  [{status.upper()}] {id_}: actual={r.get('actual')}, predicted={r.get('predicted')}")


def write_results_md(result: dict[str, Any], synthetic: bool = False):
    """Write honest evaluation results to data/eval/results.md."""
    label = "## Synthetic Test Results" if synthetic else "## Evaluation Results"
    metrics = result.get("metrics", {})
    cm = result.get("confusion_matrix", {})

    content = f"""# Vision Evaluation Results

{label}
**Date:** {__import__('datetime').datetime.now().isoformat()}
**Model:** Bedrock multimodal (via {PROJECT_ROOT}/services/api/src/vision/)
**Dataset:** {result.get('total', 0)} images

> ⚠️ **Synthetic test flag:** This run used mock responses, not real model inference.
> These numbers are for testing the evaluation pipeline only, NOT real model performance.

### Metrics (floodedRoad binary classification)

| Metric    | Value  |
|-----------|--------|
| Accuracy  | {metrics.get('accuracy', 'N/A')} |
| Precision | {metrics.get('precision', 'N/A')} |
| Recall    | {metrics.get('recall', 'N/A')} |
| F1        | {metrics.get('f1', 'N/A')} |

### Confusion Matrix

|            | Predicted Positive | Predicted Negative |
|------------|-------------------|-------------------|
| Actual Positive | TP: {cm.get('tp', 0)} | FN: {cm.get('fn', 0)} |
| Actual Negative | FP: {cm.get('fp', 0)} | TN: {cm.get('tn', 0)} |

### Notes

- Evaluation set: 20-30 images (see data/eval/labels.json)
- Images must be properly licensed with credits in data/eval/CREDITS.md
- This evaluation measures floodedRoad classification accuracy only
- Trust score is NOT evaluated here (it's a separate function with its own tests)
"""

    with open(RESULTS_FILE, "w") as f:
        f.write(content)

    print(f"\nResults written to {RESULTS_FILE}")


def main():
    parser = argparse.ArgumentParser(description="Run Aquashield vision evaluation")
    parser.add_argument("--synthetic", action="store_true", help="Run synthetic test (no real images)")
    parser.add_argument("--live", action="store_true", help="Use real Bedrock (requires AWS credentials)")
    args = parser.parse_args()

    print("=" * 60)
    print("Aquashield Vision Evaluation Runner")
    print("=" * 60)

    if args.synthetic:
        print("\nRunning synthetic test (mock responses, no real images)...")
        result = run_synthetic_test()
        print_results(result, synthetic=True)
        write_results_md(result, synthetic=True)
        return

    # Try real evaluation
    try:
        labels_data = load_labels()
    except FileNotFoundError as e:
        print(f"\nERROR: {e}")
        print("\nTo run real evaluation:")
        print("  1. Add images to data/eval/images/")
        print("  2. Label them in data/eval/labels.json")
        print("  3. Run: python data/eval/run_eval.py")
        print("\nTo test the runner without images:")
        print("  python data/eval/run_eval.py --synthetic")
        sys.exit(1)

    labels_list = labels_data.get("labels", [])
    if not labels_list:
        print("No labels found in labels.json. Add labelled images first.")
        sys.exit(1)

    print(f"\nEvaluating {len(labels_list)} images...")

    # Set mock mode
    if not args.live:
        os.environ["MOCK_BEDROCK"] = "1"
        print("(Using MOCK_BEDROCK=1 — set MOCK_BEDROCK=0 for real inference)")

    predictions = []
    for label in labels_list:
        image_path = IMAGES_DIR / label.get("filename", label.get("id") + ".jpg")
        pred = run_vision_on_image(image_path)
        print(f"  {label.get('id')}: {'OK' if not pred.get('error') else 'ERROR: ' + pred.get('error', '')}")
        predictions.append(pred)

    result = evaluate_predictions(labels_list, predictions)
    print_results(result, synthetic=False)
    write_results_md(result, synthetic=False)


if __name__ == "__main__":
    main()