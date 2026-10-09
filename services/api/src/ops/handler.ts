/**
 * POST /workorders · GET /workorders · PATCH /workorders/{id}
 * POST /alerts · POST /alerts/{id}/publish
 * All ops endpoints require the x-ops-passcode header (docs/CONTRACT.md).
 */
import { randomUUID } from "node:crypto";
import {
  WorkOrderListResponseSchema,
  WorkOrderPatchSchema,
  WorkOrderSchema,
  AlertSchema,
  CreateWorkOrderRequestSchema,
  CreateAlertRequestSchema,
} from "@aquashield/types";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  route, ok, parseBody, assertOps, notFound, validation, type ReqEvent, type Res,
} from "../shared/http.ts";
import { ddb, Tables, type WorkOrderItem } from "../shared/db.ts";

const sns = new SNSClient({});

async function listWorkOrders(): Promise<Res> {
  const res = await ddb.send(new ScanCommand({ TableName: Tables.workorders }));
  const workOrders = ((res.Items ?? []) as WorkOrderItem[])
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .map((w) => ({
      id: w.id,
      zoneId: w.zoneId,
      type: w.type,
      priority: w.priority,
      status: w.status,
      note: w.note,
      createdAt: w.createdAt,
    }));
  return ok(WorkOrderListResponseSchema, { workOrders });
}

async function patchWorkOrder(event: ReqEvent): Promise<Res> {
  const id = event.pathParameters?.id;
  if (!id) throw notFound("Work order");
  const { status } = parseBody(WorkOrderPatchSchema, event);

  const existing = await ddb.send(new GetCommand({ TableName: Tables.workorders, Key: { id } }));
  if (!existing.Item) throw notFound("Work order");

  const res = await ddb.send(
    new UpdateCommand({
      TableName: Tables.workorders,
      Key: { id },
      UpdateExpression: "SET #s = :s",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": status },
      ReturnValues: "ALL_NEW",
    }),
  );
  const w = res.Attributes as WorkOrderItem;
  return ok(WorkOrderSchema, {
    id: w.id, zoneId: w.zoneId, type: w.type, priority: w.priority,
    status: w.status, note: w.note, createdAt: w.createdAt,
  });
}

async function createWorkOrder(event: ReqEvent): Promise<Res> {
  const { zoneId, type, priority, note } = parseBody(CreateWorkOrderRequestSchema, event);
  const id = `wo_${randomUUID().slice(0, 8)}`;
  const createdAt = new Date().toISOString();
  await ddb.send(
    new PutCommand({
      TableName: Tables.workorders,
      Item: { id, zoneId, type, priority, status: "open", note, createdAt },
    }),
  );
  return ok(WorkOrderSchema, { id, zoneId, type, priority, status: "open", note, createdAt }, 201);
}

async function createDraftAlert(event: ReqEvent): Promise<Res> {
  const { zoneId, lang, text } = parseBody(CreateAlertRequestSchema, event);
  const id = `al_${randomUUID().slice(0, 8)}`;
  const alert = { id, zoneId, lang, text, status: "draft" as const, publishedAt: null };
  await ddb.send(new PutCommand({ TableName: Tables.alerts, Item: alert }));
  return ok(AlertSchema, alert, 201);
}

async function publishAlert(event: ReqEvent): Promise<Res> {
  const id = event.pathParameters?.id;
  if (!id) throw notFound("Alert");

  const existing = await ddb.send(new GetCommand({ TableName: Tables.alerts, Key: { id } }));
  const stored = existing.Item as
    | { id: string; zoneId: string; lang: "en" | "hi"; text: string; status: "draft" | "published"; publishedAt: string | null }
    | undefined;
  if (!stored) throw notFound("Alert");
  if (stored.status === "published") {
    return ok(AlertSchema, stored); // idempotent
  }

  const topicArn = process.env.ALERT_TOPIC_ARN;
  if (!topicArn) throw validation("ALERT_TOPIC_ARN not configured");
  await sns.send(new PublishCommand({
    TopicArn: topicArn,
    Subject: `Aquashield alert — ${stored.zoneId}`,
    Message: stored.text,
  }));

  const publishedAt = new Date().toISOString();
  await ddb.send(
    new UpdateCommand({
      TableName: Tables.alerts,
      Key: { id },
      UpdateExpression: "SET #s = :s, publishedAt = :p",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "published", ":p": publishedAt },
    }),
  );
  return ok(AlertSchema, { ...stored, status: "published", publishedAt });
}

export const handler = route(async (event: ReqEvent): Promise<Res> => {
  assertOps(event); // every ops endpoint is passcode protected
  if (event.routeKey === "POST /workorders") return createWorkOrder(event);
  if (event.routeKey === "POST /alerts") return createDraftAlert(event);
  const method = event.requestContext.http.method;
  if (method === "GET") return listWorkOrders();
  if (method === "PATCH") return patchWorkOrder(event);
  return publishAlert(event); // POST /alerts/{id}/publish
});
