/**
 * Bedrock vision triage — OWNED BY P3 (AI lead).
 *
 * Current version: real Bedrock multimodal call (Claude) when BEDROCK_MODEL_ID is set,
 * safe fallback when it is not (report becomes needs_review, never fabricated findings).
 *
 * P3: refine the prompt, add the evaluation set (data/eval/), keep this signature:
 *   analyzeImage(bytes, contentType) -> VisionAnalysis   (validated against VisionAnalysisSchema)
 */
import { BedrockRuntimeClient, ConverseCommand } from "@aws-sdk/client-bedrock-runtime";
import { VisionAnalysisSchema, type VisionAnalysis } from "@aquashield/types";

const client = new BedrockRuntimeClient({}); // region from AWS_REGION

const SYSTEM_PROMPT = `You are a flood-photo triage model for Aquashield, a Delhi urban-flood early-warning system.
Analyze the image and respond with ONLY a JSON object, no markdown, no prose, matching exactly:
{
  "isRoadScene": boolean,            // true only if this is a street/road/underpass scene
  "floodedRoad": boolean,            // true if there is standing water on the road
  "waterDepthTier": "none" | "ankle" | "knee" | "waist" | "vehicle_submerged",
  "blockedDrain": boolean,           // visible drain/grate blocked by debris
  "debrisOrWasteObstruction": boolean,
  "vehiclesStranded": boolean,
  "confidence": number,              // 0..1 your confidence in this analysis
  "rejectReason": string | null,     // if isRoadScene is false, say why; else null
  "explanation": "one short sentence"
}
Rules: never guess. If the image is not a road/street scene (selfie, animal, indoor, irrelevant), set isRoadScene=false. Judge water depth from visible reference points (tyres, kerbs, people).`;

function fallbackVision(reason: string): VisionAnalysis {
  // All-negative, zero-confidence: we do NOT invent findings when vision is unavailable.
  return {
    isRoadScene: true,
    floodedRoad: false,
    waterDepthTier: "none",
    blockedDrain: false,
    debrisOrWasteObstruction: false,
    vehiclesStranded: false,
    confidence: 0,
    rejectReason: null,
    explanation: `Vision unavailable (${reason}) — queued for manual review`,
  };
}

async function callBedrock(bytes: Uint8Array, contentType: string): Promise<unknown> {
  const modelId = process.env.BEDROCK_MODEL_ID;
  if (!modelId) throw new Error("BEDROCK_MODEL_ID not set");
  const command = new ConverseCommand({
    modelId,
    system: [{ text: SYSTEM_PROMPT }],
    messages: [
      {
        role: "user",
        content: [
          { image: { format: contentType.includes("png") ? "png" : contentType.includes("webp") ? "webp" : "jpeg", source: { bytes } } },
          { text: "Analyze this image. Respond with only the JSON object." },
        ],
      },
    ],
    inferenceConfig: { maxTokens: 512, temperature: 0 },
  });
  const res = await client.send(command);
  const text = res.output?.message?.content?.map((c) => c.text ?? "").join("") ?? "";
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start < 0 || end < 0) throw new Error("No JSON in model output");
  return JSON.parse(text.slice(start, end + 1));
}

/**
 * Analyze an uploaded photo. Returns validated VisionAnalysis.
 * Retries once on malformed output; falls back to needs-review-safe output on failure.
 */
export async function analyzeImage(bytes: Uint8Array, contentType: string): Promise<VisionAnalysis> {
  if (!process.env.BEDROCK_MODEL_ID) return fallbackVision("model not configured");
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const raw = await callBedrock(bytes, contentType);
      const parsed = VisionAnalysisSchema.safeParse(raw);
      if (parsed.success) return parsed.data;
      console.warn(JSON.stringify({ level: "VISION_SCHEMA_FAIL", attempt, issues: parsed.error.issues }));
    } catch (e) {
      console.warn(JSON.stringify({ level: "VISION_CALL_FAIL", attempt, err: e instanceof Error ? e.message : String(e) }));
    }
  }
  return fallbackVision("model output invalid after retry");
}
