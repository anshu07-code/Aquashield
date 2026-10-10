#!/usr/bin/env python3
"""
Aquashield Vision Evaluation Runner.

Run against labelled evaluation images to measure triage accuracy.

Usage:
  MOCK_BEDROCK=1 python data/eval/run_eval.py           # Use mock Bedrock responses
  MOCK_BEDROCK=0 python data/eval/run_eval.py --live   # Real Bedrock inference (requires AWS creds + BEDROCK_MODEL_ID)

Requirements:
  - Images in data/eval/images/
  - Labels in data/eval/labels.json
  - Node.js + tsx installed at the repo root (npm install)
  - Python 3.10+

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
import subprocess
import sys
from pathlib import Path
from typing import Any

PROJECT_ROOT = Path(__file__).parent.parent.parent
VISION_CLI = PROJECT_ROOT / "data" / "eval" / "vision-cli.ts"

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
    with open(LABELS_FILE, encoding="utf-8") as f:
        return json.load(f)


def run_vision_on_image(image_path: Path) -> dict[str, Any]:
    """
    Run the vision module on a single image by invoking data/eval/vision-cli.ts
    (TypeScript bridge -> services/api/src/vision/index.ts) in a subprocess.
    """
    if not image_path.exists():
        return {
            "error": f"Image not found: {image_path}",
            "isRoadScene": None,
            "floodedRoad": None,
        }

    content_type = "image/jpeg"
    if image_path.suffix.lower() in (".png",):
        content_type = "image/png"
    elif image_path.suffix.lower() in (".webp",):
        content_type = "image/webp"

    env = os.environ.copy()
    # The CLI inherits MOCK_BEDROCK / BEDROCK_MODEL_ID / AWS_* from this process.

    # Windows: npx is npx.cmd — subprocess on Windows won't resolve bare "npx".
    npx = "npx.cmd" if os.name == "nt" else "npx"

    try:
        proc = subprocess.run(
            [npx, "tsx", str(VISION_CLI), str(image_path), content_type],
            capture_output=True,
            text=True,
            timeout=90,
            cwd=str(PROJECT_ROOT),
            env={**os.environ, "MOCK_BEDROCK": "0"},  # CLI runs the REAL module path
        )
    except subprocess.TimeoutExpired:
        return {"error": "vision-cli timed out", "isRoadScene": None, "floodedRoad": None}
    except FileNotFoundError as e:
        return {"error": f"Could not run vision-cli (npx/tsx not found?): {e}", "isRoadScene": None, "floodedRoad": None}

    if proc.returncode != 0:
        return {
            "error": f"vision-cli failed ({proc.returncode}): {(proc.stderr or '').strip()[:300]}",
            "isRoadScene": None,
            "floodedRoad": None,
        }

    try:
        payload = json.loads(proc.stdout.strip())
    except json.JSONDecodeError as e:
        return {"error": f"vision-cli returned non-JSON: {e} | stdout: {proc.stdout[:200]}", "isRoadScene": None, "floodedRoad": None}

    if payload.get("error"):
        return {"error": payload["error"], "isRoadScene": None, "floodedRoad": None}

    result = payload.get("vision") or {}

    # Honesty guard: the needs_review / fallback output means the model did NOT
    # actually infer. Count it as an error so it never inflates TN counts.
    if result.get("confidence") == 0 or (result.get("explanation") or "").lower().startswith("vision unavailable"):
        return {
            "error": f"fallback output (no real inference): {(result.get('explanation') or '')[:120]}",
            "isRoadScene": None,
            "floodedRoad": None,
        }

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
    """Write evaluation results to data/eval/results.md (honest: never fake numbers)."""
    try:
        import datetime
    except ImportError:  # pragma: no cover
        datetime = __import__("datetime")
    now = datetime.datetime.now().isoformat()
    total = result.get("total", 0)
    errors = result.get("errors", 0)
    attempted = total + errors  # labels evaluated (real predictions + failures)
    model = os.environ.get("BEDROCK_MODEL_ID", "not set")
    region = os.environ.get("AWS_REGION", os.environ.get("AWS_DEFAULT_REGION", "?"))

    if total == 0 and attempted > 0:
        # Every image fell back to needs_review — no real inference happened.
        # Write an honest "pending" report, NOT a zeroed metrics table.
        content = f"""# Vision Evaluation Results

## Status: Pending real Bedrock inference

**Date:** {now}
**Model:** Bedrock multimodal via `{PROJECT_ROOT}/services/api/src/vision/` (env `BEDROCK_MODEL_ID`)

- **Dataset labels ready:** {attempted} images (see `data/eval/labels.json`)
- **Real predictions completed:** 0 of {attempted}
- **Errors/fallbacks:** {errors} ({errors}/{attempted}) — the vision module fell back to `needs_review`

> No accuracy numbers are reported until at least one image produces a real inference.
> Running the eval (from the repo **root**):
> ```bash
> python data/eval/run_eval.py
> ```
> Requires valid AWS credentials and a working Bedrock model access
> (`BEDROCK_MODEL_ID`, `AWS_REGION` — see `.env.example`). Until that is available,
> the pipeline is validated but numbers are intentionally NOT reported.
"""
        with open(RESULTS_FILE, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"\nNo real inference happened — wrote a pending report to {RESULTS_FILE}")
        return

    label = "## Synthetic Test Results" if synthetic else "## Evaluation Results (real Bedrock inference)"
    metrics = result.get("metrics", {})
    cm = result.get("confusion_matrix", {})

    alt = f"""
> ⚠️ **Synthetic test flag:** This run used mock responses, not real model inference.
> These numbers are for testing the evaluation pipeline only, NOT real model performance.
""" if synthetic else f"""
- Model: `{model}` (region `{region}`), real Bedrock Converse inference
- {errors} of {attempted} images produced no valid inference (fell back to `needs_review`) and
  are excluded from the metrics below — a fallback is never counted as a correct answer.
"""

    content = f"""# Vision Evaluation Results

{label}
**Date:** {now}
**Model:** Bedrock multimodal via `{PROJECT_ROOT}/services/api/src/vision/` (`BEDROCK_MODEL_ID`)
**Dataset:** {attempted} labelled images ({total} produced real inferences)
{alt}
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

- Evaluation set: 30+ images (see data/eval/labels.json)
- This evaluation measures floodedRoad classification accuracy only
- Trust score is NOT evaluated here (it's a separate function with its own tests)
"""

    with open(RESULTS_FILE, "w", encoding="utf-8") as f:
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
    print("Real inference mode (requires AWS creds + BEDROCK_MODEL_ID); fallback outputs are reported as errors.")

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