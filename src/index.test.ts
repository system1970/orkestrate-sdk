import { describe, it, expect } from "vitest";
import { encodeModelConfig, respond, OrkestrateError } from "./index";
import type { CallerModelConfig } from "./types";

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
