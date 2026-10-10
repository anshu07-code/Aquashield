/**
 * POST /workorders · GET /workorders · PATCH /workorders/{id}
 * POST /alerts · GET /alerts · GET /alerts/{id} · PATCH /alerts/{id}
 * POST /alerts/{id}/publish
 * All ops endpoints require the x-ops-passcode header (docs/CONTRACT.md).
 */
import { randomUUID } from "node:crypto";
import {
  WorkOrderListResponseSchema,
  WorkOrderPatchSchema,
  WorkOrderSchema,
  AlertSchema,
  AlertListResponseSchema,
  AlertPatchSchema,
  CreateWorkOrderRequestSchema,
  CreateAlertRequestSchema,
} from "@aquashield/types";
import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";
import { GetCommand, PutCommand, ScanCommand, UpdateCommand } from "@aws-sdk/lib-dynamodb";
import {
  route, ok, parseBody, assertOps, notFound, validation, type ReqEvent, type Res,
} from "../shared/http.ts";
import { ddb, Tables, type WorkOrderItem, type AlertItem, putAlert, getAlert, scanAlerts } from "../shared/db.ts";

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
  const createdAt = new Date().toISOString();
  const alert: AlertItem = { id, zoneId, lang: lang ?? "en", text, status: "draft", publishedAt: null, createdAt };
  await putAlert(alert);
  return ok(AlertSchema, alert, 201);
}

async function listAlerts(event: ReqEvent): Promise<Res> {
  const zoneId = event.queryStringParameters?.zoneId;
  const status = event.queryStringParameters?.status;
  const alerts = await scanAlerts({ zoneId, status });
  return ok(AlertListResponseSchema, { alerts });
}

async function getAlertHandler(event: ReqEvent): Promise<Res> {
  const id = event.pathParameters?.id;
  if (!id) throw notFound("Alert");
  const alert = await getAlert(id);
  if (!alert) throw notFound("Alert");
  return ok(AlertSchema, alert);
}

async function patchAlert(event: ReqEvent): Promise<Res> {
  const id = event.pathParameters?.id;
  if (!id) throw notFound("Alert");
  const { status } = parseBody(AlertPatchSchema, event);
  const existing = await getAlert(id);
  if (!existing) throw notFound("Alert");

  const updates: Record<string, string> = {};
  if (status) updates["#s"] = status;
  const resolvedAt = status === "resolved" ? new Date().toISOString() : undefined;

  if (Object.keys(updates).length === 0) {
    return ok(AlertSchema, existing);
  }

  const updateParts: string[] = [];
  const exprNames: Record<string, string> = { "#s": "status" };
  const exprValues: Record<string, string> = {};
  if (status) { updateParts.push("#s = :s"); exprValues[":s"] = status; }
  if (resolvedAt) { updateParts.push("resolvedAt = :rt"); exprValues[":rt"] = resolvedAt; }

  const res = await ddb.send(
    new UpdateCommand({
      TableName: Tables.alerts,
      Key: { id },
      UpdateExpression: `SET ${updateParts.join(", ")}`,
      ExpressionAttributeNames: exprNames,
      ExpressionAttributeValues: exprValues,
      ReturnValues: "ALL_NEW",
    }),
  );
  return ok(AlertSchema, res.Attributes as AlertItem);
}

async function publishAlert(event: ReqEvent): Promise<Res> {
  const id = event.pathParameters?.id;
  if (!id) throw notFound("Alert");

  const existing = await ddb.send(new GetCommand({ TableName: Tables.alerts, Key: { id } }));
  const stored = existing.Item as AlertItem | undefined;
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
  const res = await ddb.send(
    new UpdateCommand({
      TableName: Tables.alerts,
      Key: { id },
      UpdateExpression: "SET #s = :s, publishedAt = :p",
      ExpressionAttributeNames: { "#s": "status" },
      ExpressionAttributeValues: { ":s": "published", ":p": publishedAt },
      ReturnValues: "ALL_NEW",
    }),
  );
  return ok(AlertSchema, res.Attributes as AlertItem);
}

export const handler = route(async (event: ReqEvent): Promise<Res> => {
  assertOps(event); // every ops endpoint is passcode protected
  const method = event.requestContext.http.method;

  // Specific routeKey checks (must come before generic method fallbacks)
  if (event.routeKey === "POST /workorders") return createWorkOrder(event);
  if (event.routeKey === "GET /workorders") return listWorkOrders();
  if (event.routeKey === "GET /alerts") return listAlerts(event);
  if (event.routeKey === "GET /alerts/{id}") return getAlertHandler(event);
  if (event.routeKey === "POST /alerts") return createDraftAlert(event);
  if (event.routeKey === "POST /alerts/{id}/publish") return publishAlert(event);
  if (event.routeKey === "PATCH /workorders/{id}") return patchWorkOrder(event);
  if (event.routeKey === "PATCH /alerts/{id}") return patchAlert(event);

  throw notFound("Route");
});
