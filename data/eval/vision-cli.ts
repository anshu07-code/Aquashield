/**
 * Vision CLI — bridges data/eval/run_eval.py to the SHIPPED TypeScript vision
 * module (services/api/src/vision/index.ts) so the evaluation measures the exact
 * same code deployed in the API.
 *
 * Usage:
 *   npx tsx data/eval/vision-cli.ts <imagePath> [contentType]
 *
 * Prints exactly ONE JSON object to stdout:
 *   success:  { "vision": { ...VisionAnalysis } }
 *   failure:  { "error": "message" }
 *
 * Env:
 *   MOCK_BEDROCK=1                          → mock inference (no AWS needed)
 *   BEDROCK_MODEL_ID + AWS_REGION + creds   → real Bedrock inference
 */
import { readFileSync } from "node:fs";
import { analyzeImage } from "../../services/api/src/vision/index.js";

function fail(message: string): never {
  console.log(JSON.stringify({ error: message }));
  process.exit(1);
}

async function main() {
  const imagePath = process.argv[2];
  if (!imagePath) fail("usage: vision-cli.ts <imagePath> [contentType]");

  const ext = imagePath.toLowerCase().split(".").pop() ?? "";
  const inferred: Record<string, string> = {
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
  };
  const contentType = process.argv[3] ?? inferred[ext] ?? "image/jpeg";

  let bytes: Buffer;
  try {
    bytes = readFileSync(imagePath);
  } catch (e) {
    fail(`cannot read image ${imagePath}: ${e instanceof Error ? e.message : String(e)}`);
  }

  try {
    const vision = await analyzeImage(bytes, contentType);
    console.log(JSON.stringify({ vision }));
  } catch (e) {
    fail(`vision module error: ${e instanceof Error ? e.message : String(e)}`);
  }
}

void main();
