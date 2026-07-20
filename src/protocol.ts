import { OrkestrateError } from "./errors";
import type { CallerModelConfig, OrkestrateAction, ParsedRequest, SessionMessage } from "./types";

export const HEADER_SESSION_ID = "x-orkestrate-session-id";
export const HEADER_ACTION = "x-orkestrate-action";
export const HEADER_CALLER_ID = "x-orkestrate-caller-id";
export const HEADER_MODEL = "x-orkestrate-model";

const ACTIONS = new Set<OrkestrateAction>([
  "start_session",
  "send_message",
  "end_session",
  "ping",
]);

/**
 * Parse the gateway's HTTP request into typed fields.
 * Throws `OrkestrateError("BAD_REQUEST")` on invalid input.
 */
export async function parseRequest(request: Request): Promise<ParsedRequest> {
  const actionRaw = request.headers.get(HEADER_ACTION)?.trim();
  if (!actionRaw || !ACTIONS.has(actionRaw as OrkestrateAction)) {
    throw new OrkestrateError(
      "BAD_REQUEST",
      `Missing or invalid ${HEADER_ACTION}. Expected start_session | send_message | end_session | ping`,
    );
  }
  const action = actionRaw as OrkestrateAction;

  const sessionId = request.headers.get(HEADER_SESSION_ID)?.trim() || undefined;
  const callerId = request.headers.get(HEADER_CALLER_ID)?.trim() || undefined;

  let body: Record<string, unknown> = {};
  const text = await request.text();
  if (text.trim()) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new OrkestrateError("BAD_REQUEST", "Body must be JSON");
    }
  }

  if (body !== null && typeof body !== "object") {
    throw new OrkestrateError("BAD_REQUEST", "Body must be a JSON object");
  }

  const record = (body ?? {}) as Record<string, unknown>;
  const message = typeof record.message === "string" ? record.message : undefined;

  let modelConfig: CallerModelConfig | undefined;
  const modelHeader = request.headers.get(HEADER_MODEL)?.trim();
  if (modelHeader) {
    modelConfig = decodeModelConfig(modelHeader);
  }

  let messages: SessionMessage[] | undefined;
  if (action === "start_session" || action === "send_message") {
    messages = parseMessages(record.messages, message);
  }

  return { action, sessionId, callerId, message, modelConfig, messages };
}

function decodeModelConfig(header: string): CallerModelConfig {
  let json: string;
  try {
    json = Buffer.from(header, "base64url").toString("utf8");
  } catch {
    throw new OrkestrateError("BAD_REQUEST", `${HEADER_MODEL} must be base64url-encoded JSON`);
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(json);
  } catch {
    throw new OrkestrateError("BAD_REQUEST", `${HEADER_MODEL} must be base64url-encoded JSON`);
  }

  if (!parsed || typeof parsed !== "object") {
    throw new OrkestrateError("BAD_REQUEST", "Invalid model config");
  }

  const o = parsed as Record<string, unknown>;
  const provider = o.provider as string;
  const model = o.model as string;
  const apiKey = o.apiKey as string;
  const baseURL = o.baseURL as string | undefined;

  if (
    provider !== "openai" &&
    provider !== "anthropic" &&
    provider !== "google" &&
    provider !== "custom"
  ) {
    throw new OrkestrateError(
      "BAD_REQUEST",
      'model.provider must be "openai" | "anthropic" | "google" | "custom"',
    );
  }

  if (typeof model !== "string" || !model) {
    throw new OrkestrateError("BAD_REQUEST", "model.model must be a non-empty string");
  }

  if (typeof apiKey !== "string" || !apiKey) {
    throw new OrkestrateError("BAD_REQUEST", "model.apiKey must be a non-empty string");
  }

  if (baseURL !== undefined && typeof baseURL !== "string") {
    throw new OrkestrateError("BAD_REQUEST", "model.baseURL must be a string when set");
  }

  if (provider === "custom" && !baseURL) {
    throw new OrkestrateError("BAD_REQUEST", 'model.baseURL is required when provider is "custom"');
  }

  return {
    provider,
    model,
    apiKey,
    ...(typeof baseURL === "string" ? { baseURL } : {}),
  } as CallerModelConfig;
}

/** Validate and parse messages from the body. */
export function parseMessages(raw: unknown, message?: string): SessionMessage[] {
  if (!Array.isArray(raw)) {
    throw new OrkestrateError(
      "BAD_REQUEST",
      "Body.messages must be a non-empty array of { role, content }",
    );
  }

  if (raw.length === 0) {
    throw new OrkestrateError(
      "BAD_REQUEST",
      "Body.messages must be a non-empty array of { role, content }",
    );
  }

  for (const m of raw) {
    if (!m || typeof m !== "object") {
      throw new OrkestrateError(
        "BAD_REQUEST",
        "Each messages entry must be { role: 'user' | 'assistant', content: string }",
      );
    }
    const o = m as Record<string, unknown>;
    if (o.role !== "user" && o.role !== "assistant") {
      throw new OrkestrateError(
        "BAD_REQUEST",
        "Each messages entry must have role 'user' or 'assistant'",
      );
    }
    if (typeof o.content !== "string" || !o.content) {
      throw new OrkestrateError(
        "BAD_REQUEST",
        "Each messages entry must have non-empty content string",
      );
    }
  }

  const msgs = raw as SessionMessage[];

  // Consistency: last message must match the `message` field
  const last = msgs[msgs.length - 1]!;
  if (last.role !== "user") {
    throw new OrkestrateError("BAD_REQUEST", "Last message in messages must be from user");
  }

  if (message !== undefined && last.content !== message) {
    throw new OrkestrateError("BAD_REQUEST", "Body.message must match the last user message in messages");
  }

  return msgs;
}

/** Encode model config for tests / gateway. Never log the result. */
export function encodeModelConfig(config: CallerModelConfig): string {
  return Buffer.from(JSON.stringify(config), "utf8").toString("base64url");
}
