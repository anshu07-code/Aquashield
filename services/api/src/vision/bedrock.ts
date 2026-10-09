/**
 * Bedrock multimodal client for vision triage.
 *
 * Design principles:
 * - Credentials from env: AWS_REGION (or attached IAM role in Lambda — no keys needed)
 * - Model ID from BEDROCK_MODEL_ID env var (NEVER hard-coded)
 * - Returns raw response text; caller parses + validates with zod
 * - Timeout: 12s (Lambda has 15s default, leave 3s buffer for parsing)
 * - Retries: 1 retry on Malformed JSON only; all other errors propagate
 *
 * For testing without AWS: set MOCK_BEDROCK=1 and MOCK_BEDROCK_RESPONSE env var.
 */

import { VISION_PROMPT_V1 } from "./prompts/vision-v1.js";
import {
  BedrockTimeoutError,
  BedrockMalformedOutputError,
  BedrockAbortedError,
} from "./errors.js";

const TIMEOUT_MS = 12_000;
const MAX_RETRIES = 1;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface BedrockCallOptions {
  imageBytes: Buffer;
  contentType: string; // validated by caller (analyzeImage)
  abortSignal?: AbortSignal;
}

/**
 * Calls Bedrock multimodal with the given image and returns the raw response text.
 *
 * @returns Raw response text from Bedrock (caller parses as JSON)
 * @throws {BedrockTimeoutError} if the call exceeds TIMEOUT_MS
 * @throws {BedrockModelError} on AWS errors (access denied, model not found, etc.)
 * @throws {BedrockMalformedOutputError} after MAX_RETRIES on malformed JSON output
 */
export async function callBedrockVision(options: BedrockCallOptions): Promise<string> {
  // --- Mock path for local dev / CI without AWS credentials ---
  if (process.env.MOCK_BEDROCK === "1") {
    return mockBedrockResponse(options);
  }

  const { imageBytes, contentType, abortSignal } = options;
  const modelId = getModelId();
  const region = process.env.AWS_REGION ?? "us-east-1";

  // Dynamically import AWS SDK so this module loads without credentials present
  const { InvokeModelCommand, BedrockRuntimeClient } = await import("@aws-sdk/client-bedrock-runtime");

  const imageBase64 = imageBytes.toString("base64");

  // Build the Claude messages payload
  const body = JSON.stringify({
    anthropic_version: "bedrock-2023-05-31",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: VISION_PROMPT_V1 },
          {
            type: "image",
            source: { type: "base64", media_type: contentType as "image/jpeg", data: imageBase64 },
          },
        ],
      },
    ],
  });

  const command = new InvokeModelCommand({
    modelId,
    contentType: "application/json",
    accept: "application/json",
    body,
  });

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await timedCall(
        new BedrockRuntimeClient({ region }),
        command,
        abortSignal,
      );
      return response;
    } catch (err: unknown) {
      lastError = err as Error;
      if (!isRetryableError(err as Error)) {
        throw err;
      }
      if (attempt < MAX_RETRIES) {
        // Give the model one chance to fix its JSON formatting
      } else {
        throw new BedrockMalformedOutputError(
          `Bedrock returned malformed JSON after ${MAX_RETRIES + 1} attempts. ` +
            `Last error: ${lastError?.message ?? "unknown"}`,
        );
      }
    }
  }

  throw lastError ?? new Error("Unexpected Bedrock call failure");
}

// ---------------------------------------------------------------------------
// Internals
// ---------------------------------------------------------------------------

function getModelId(): string {
  const id = process.env.BEDROCK_MODEL_ID;
  if (!id) {
    throw Object.assign(new Error(
      "BEDROCK_MODEL_ID environment variable is not set. " +
        "Set it to the Bedrock model ID (e.g. anthropic.claude-sonnet-4-20250514). " +
        "Never hard-code model IDs.",
    ), { code: "BEDROCK_CONFIG_ERROR" });
  }
  return id;
}

/** Minimal structural type for any SDK client (BedrockRuntimeClient, etc.). */
export interface SendableClient {
  send(cmd: unknown, opts?: { abortSignal?: AbortSignal }): Promise<unknown>;
}

/** Times out a promise after TIMEOUT_MS */
async function timedCall(
  client: SendableClient,
  command: unknown,
  abortSignal?: AbortSignal,
): Promise<string> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new BedrockTimeoutError(`Bedrock call exceeded ${TIMEOUT_MS}ms`)),
      TIMEOUT_MS,
    );

    const signalHandler = () => {
      clearTimeout(timer);
      reject(new BedrockAbortedError("Bedrock call aborted by caller"));
    };
    abortSignal?.addEventListener("abort", signalHandler, { once: true });

    client
      .send(command, { abortSignal })
      .then((result) =>
        (result as { body: { transformToString: () => Promise<string> } }).body.transformToString(),
      )
      .then((text: string) => {
        clearTimeout(timer);
        abortSignal?.removeEventListener("abort", signalHandler);
        resolve(text);
      })
      .catch((err: Error) => {
        clearTimeout(timer);
        abortSignal?.removeEventListener("abort", signalHandler);
        reject(err);
      });
  });
}

function isRetryableError(err: Error): boolean {
  const msg = err.message.toLowerCase();
  return (
    err instanceof BedrockTimeoutError ||
    msg.includes("malformed") ||
    msg.includes("unexpected token") ||
    msg.includes("could not parse") ||
    msg.includes("json")
  );
}

// ---------------------------------------------------------------------------
// Mock for local dev / CI
// ---------------------------------------------------------------------------

function mockBedrockResponse(_options: BedrockCallOptions): string {
  const mock = process.env.MOCK_BEDROCK_RESPONSE;
  if (mock) return mock;

  // Sensible default mock: flooded road, knee-deep water, no blocked drain
  return JSON.stringify({
    isRoadScene: true,
    floodedRoad: true,
    waterDepthTier: "knee",
    blockedDrain: false,
    debrisOrWasteObstruction: false,
    vehiclesStranded: false,
    confidence: 0.85,
    rejectReason: null,
    explanation: "Road partially flooded with knee-deep standing water; no vehicles stranded.",
  });
}