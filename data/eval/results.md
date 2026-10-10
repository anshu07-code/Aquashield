# Vision Evaluation Results

## Status: Pending real Bedrock inference

**Date:** 2026-10-10T12:54:01.209157
**Model:** Bedrock multimodal via `C:\Users\BIT\Desktop\Aquashield/services/api/src/vision/` (env `BEDROCK_MODEL_ID`)

- **Dataset labels ready:** 32 images (see `data/eval/labels.json`)
- **Real predictions completed:** 0 of 32
- **Errors/fallbacks:** 32 (32/32) — the vision module fell back to `needs_review`

> No accuracy numbers are reported until at least one image produces a real inference.
> Running the eval (from the repo **root**):
> ```bash
> python data/eval/run_eval.py
> ```
> Requires valid AWS credentials and a working Bedrock model access
> (`BEDROCK_MODEL_ID`, `AWS_REGION` — see `.env.example`). Until that is available,
> the pipeline is validated but numbers are intentionally NOT reported.
