# Vision Evaluation Results

> ⚠️ **No evaluation run yet.** Run the evaluation script to generate real numbers:
> ```
> MOCK_BEDROCK=1 python data/eval/run_eval.py
> ```
> Or with real images after adding them to `data/eval/images/` and labelling them.

## How to run real evaluation

1. Add 20-30 flood-relevant images to `data/eval/images/`
2. Label each image in `data/eval/labels.json` with ground truth
3. Add credits to `data/eval/CREDITS.md`
4. Run:
   ```bash
   MOCK_BEDROCK=0 python data/eval/run_eval.py
   ```

## What to report in README

After a real evaluation run, update this section in the README with:
- Number of images (n=__)
- Accuracy, precision, recall, F1 score
- Confusion matrix
- Honest limitations note

**Do NOT claim evaluation numbers without running the actual evaluation.**