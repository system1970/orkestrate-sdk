import { describe, it, expect } from "vitest";
import { encodeModelConfig, respond, OrkestrateError, parseRequest, parseMessages } from "./index.js";
import {
  encodeBoundedEnvelope,
  decodeBoundedEnvelope,
  createOrkestrateHandler,
} from "./index.js";
import { MAX_BODY_BYTES, MAX_MESSAGES } from "./protocol.js";
import type { CallerModelConfig } from "./types.js";

describe("encodeModelConfig", () => {
  it("encodes a valid config to base64url", () => {
    const config: CallerModelConfig = {
      provider: "openai",
      model: "gpt-4o",
      apiKey: "sk-test",
    };
    const encoded = encodeModelConfig(config);
    expect(typeof encoded).toBe("string");
    const decoded = JSON.parse(Buffer.from(encoded, "base64url").toString());
    expect(decoded.provider).toBe("openai");
    expect(decoded.model).toBe("gpt-4o");
  });
});

describe("respond", () => {
  it("respond.ok returns 200 with ok: true", async () => {
    const res = respond.ok();
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ ok: true });
  });

  it("respond.reply returns reply text", async () => {
    const res = respond.reply("Hello");
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body).toEqual({ reply: "Hello" });
  });

  it("respond.error returns error object with correct status", async () => {
    const res = respond.error("UNAUTHORIZED", "Bad secret");
    expect(res.status).toBe(401);
    const body = await res.json();
    expect(body).toEqual({ error: { code: "UNAUTHORIZED", message: "Bad secret" } });
  });
});

describe("OrkestrateError", () => {
  it("has code and status", () => {
    const err = new OrkestrateError("BAD_REQUEST", "Invalid");
    expect(err.code).toBe("BAD_REQUEST");
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid");
  });
});

describe("parseMessages", () => {
  it("rejects a messages array larger than MAX_MESSAGES", () => {
    const big = Array.from({ length: MAX_MESSAGES + 1 }, (_, i) => ({
      role: "user" as const,
      content: `m${i}`,
    }));
    expect(() => parseMessages(big, big[big.length - 1].content)).toThrowError(
      /exceeds/,
    );
  });

  it("accepts messages up to MAX_MESSAGES", () => {
    const msgs = Array.from({ length: MAX_MESSAGES }, (_, i) => ({
      role: "user" as const,
      content: `m${i}`,
    }));
    expect(parseMessages(msgs, msgs[msgs.length - 1].content).length).toBe(MAX_MESSAGES);
  });
});

describe("parseRequest", () => {
  it("rejects an oversized content-length header", async () => {
    const req = new Request("http://localhost/api/orkestrate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-orkestrate-action": "ping",
        "content-length": String(MAX_BODY_BYTES + 1),
      },
      body: "{}",
    });
    await expect(parseRequest(req)).rejects.toThrow(OrkestrateError);
  });
});

describe("bounded envelope wire", () => {
  const envelope = {
    executorUrl: "https://gw.test/inference/execute",
    credential: "cred-1",
    model: "test-model",
    grantId: "grant-1",
  };

  it("round-trips through encode/decode and rejects malformed input", () => {
    expect(decodeBoundedEnvelope(encodeBoundedEnvelope(envelope))).toEqual(envelope);
    expect(() => decodeBoundedEnvelope("!!!")).toThrow(OrkestrateError);
    expect(() =>
      decodeBoundedEnvelope(
        Buffer.from(JSON.stringify({ ...envelope, model: 42 }), "utf8").toString("base64url"),
      ),
    ).toThrow(OrkestrateError);
  });

  it("parses the bounded header and reaches onTurn without a model config", async () => {
    const seen: Array<Record<string, unknown>> = [];
    const handler = createOrkestrateHandler({
      secret: "s3cret",
      onTurn: async (ctx) => {
        seen.push({ bounded: ctx.bounded, hasModel: ctx.model !== undefined });
        return { reply: "bounded-ok" };
      },
    });
    const req = new Request("http://localhost/api/orkestrate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer s3cret",
        "x-orkestrate-action": "start_session",
        "x-orkestrate-session-id": "ses_1",
        "x-orkestrate-bounded": encodeBoundedEnvelope(envelope),
      },
      body: JSON.stringify({ message: "hi", messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await handler.POST(req);
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ reply: "bounded-ok" });
    expect(seen).toEqual([{ bounded: envelope, hasModel: false }]);
  });

  it("still rejects turns with neither model config nor bounded envelope", async () => {
    const handler = createOrkestrateHandler({
      secret: "s3cret",
      onTurn: async () => ({ reply: "unreachable" }),
    });
    const req = new Request("http://localhost/api/orkestrate", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: "Bearer s3cret",
        "x-orkestrate-action": "start_session",
        "x-orkestrate-session-id": "ses_1",
      },
      body: JSON.stringify({ message: "hi", messages: [{ role: "user", content: "hi" }] }),
    });
    const res = await handler.POST(req);
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({
      error: { code: "BAD_REQUEST", message: "Missing caller model config" },
    });
  });
});
