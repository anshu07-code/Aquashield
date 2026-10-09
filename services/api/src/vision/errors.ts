/**
 * Error types for the Bedrock vision client.
 * These are re-exported from services/api/src/vision/index.ts for caller use.
 */

export class BedrockTimeoutError extends Error {
  readonly code = "BEDROCK_TIMEOUT";
  constructor(message: string) {
    super(message);
    this.name = "BedrockTimeoutError";
  }
}

export class BedrockMalformedOutputError extends Error {
  readonly code = "BEDROCK_MALFORMED_OUTPUT";
  constructor(message: string) {
    super(message);
    this.name = "BedrockMalformedOutputError";
  }
}

export class BedrockModelError extends Error {
  readonly code = "BEDROCK_MODEL_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "BedrockModelError";
  }
}

export class BedrockConfigError extends Error {
  readonly code = "BEDROCK_CONFIG_ERROR";
  constructor(message: string) {
    super(message);
    this.name = "BedrockConfigError";
  }
}

export class BedrockAbortedError extends Error {
  readonly code = "BEDROCK_ABORTED";
  constructor(message: string) {
    super(message);
    this.name = "BedrockAbortedError";
  }
}