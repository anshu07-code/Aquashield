/**
 * AWS DEMO CLIP CAPTURE — prints ready-to-follow commands + live data for the
 * demo video's "AWS proof montage" (0:40–3:00 in docs/DEMO.md).
 * P2-owned. Run against the deployed account so the video shows REAL AWS console data.
 *
 * Usage:
 *   npx tsx scripts/aws-demo-clips.ts
 * Calls read-only AWS APIs and prints:
 *   1) Lambda functions with their last-modified times (LIVE serverless runtime)
 *   2) DynamoDB table + a couple of real items (zones)
 *   3) S3 media bucket contents (citizen photos/vision payloads)
 *   4) EventBridge 15-min scheduling rule (ingest)
 *   5) SNS alert topic + any published messages
 *   6) CloudWatch: recent Lambda invocations/errors
 *   7) Bedrock model IDs configured on the reports+agent lambdas
 */
import { execSync } from "node:child_process";

const REGION = "ap-southeast-2";
const sh = (cmd: string): string => {
  try {
    return execSync(cmd, { encoding: "utf8", timeout: 30_000, stdio: ["ignore", "pipe", "pipe"] }).trim();
  } catch (e) {
    return String((e as { stderr?: { toString(): string } })?.stderr?.toString?.() ?? e);
  }
};

console.log("\n=== AQUASHIELD AWS DEMO CLIPS ===\n");

console.log("── 1. Lambda functions (serverless runtime) ────────────────");
console.log(sh(`aws lambda list-functions --region ${REGION} --query "Functions[].{fn:FunctionName,rt:Runtime,updated:LastModified}" --output table`));

console.log("\n── 2. DynamoDB tables + zone sample ─────────────────────────");
console.log(sh(`aws dynamodb list-tables --region ${REGION} --query "TableNames" --output json`));
console.log("\nSample zones item:");
console.log(sh(`aws dynamodb scan --table-name Aquashield-Zones --region ${REGION} --limit 2 --query "Items" --output json`));

console.log("\n── 3. S3 media bucket (citizen photos) ─────────────────────");
console.log(sh(`aws s3 ls s3://aquashield-media-978656809588 --recursive --human-readable`));

console.log("\n── 4. EventBridge 15-minute ingest rule ────────────────────");
console.log(sh(`aws events list-rules --region ${REGION} --query "Rules[?Name!='default'].{name:Name,schedule:ScheduleExpression,state:State}" --output table`));

console.log("\n── 5. SNS alerts topic ─────────────────────────────────────");
console.log(sh(`aws sns list-topics --region ${REGION} --query "Topics[].TopicArn" --output text`));

console.log("\n── 6. CloudWatch — Lambda invocations (last 5 min) ─────────");
console.log(sh(`aws cloudwatch get-metric-statistics --namespace AWS/Lambda --metric-name Invocations --dimensions Name=FunctionName,Value=aquashield-zones --start-time "$(Get-Date).AddMinutes(-5).ToString('yyyy-MM-ddTHH:mm:ssZ')" --end-time "$(Get-Date).ToString('yyyy-MM-ddTHH:mm:ssZ')" --period 300 --statistics Sum --region ${REGION} --query "Datapoints" --output json`));

console.log("\n── 7. Bedrock model IDs on reports + agent ─────────────────");
console.log(sh(`aws lambda get-function-configuration --function-name aquashield-reports --region ${REGION} --query "Environment.Variables.BEDROCK_MODEL_ID" --output text`));
console.log(sh(`aws lambda get-function-configuration --function-name aquashield-agent --region ${REGION} --query "Environment.Variables.BEDROCK_MODEL_ID" --output text`));

console.log("\n=== Copy these outputs into a doc; they are REAL, non-simulated. ===");
