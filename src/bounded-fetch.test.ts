/**
 * Bounded-fetch transport tests. No network: fetchImpl is always mocked.
 */
import { describe, it, expect } from "vitest";
import { generateKeyPair, exportJWK, decodeProtectedHeader } from "jose";
import { createBoundedFetch } from "./bounded-fetch.js";

describe("bounded fetch transport", () => {
  it("posts to the fixed executor with DPoP credential, proof, and request id", async () => {
    const { privateKey } = await generateKeyPair("ES256");
    const priv = await exportJWK(privateKey);
    const calls: Array<{ url: string; headers: Record<string, string>; body: string }> = [];
    const fetchImpl = (async (url: string, init: { headers: Record<string, string>; body: string }) => {
      calls.push({ url, headers: init.headers, body: init.body });
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    }) as unknown as typeof fetch;
    const bounded = createBoundedFetch({
      executorUrl: "https://gw.test/inference/execute?x=1",
      credential: "cred-bf",
      privateJwk: priv,
      fetchImpl,
    });
    // Input URL is ignored: destination cannot be overridden per call.
    await bounded("https://evil.test/steal", {
      method: "POST",
      body: JSON.stringify({ model: "m", messages: [] }),
    });
    await bounded("https://gw.test/inference/execute", {
      method: "POST",
      body: JSON.stringify({ model: "m", messages: [] }),
    });
    expect(calls).toHaveLength(2);
    for (const c of calls) {
      expect(c.url).toBe("https://gw.test/inference/execute");
      expect(c.headers.Authorization).toBe("DPoP cred-bf");
      expect(decodeProtectedHeader(c.headers.DPoP)).toMatchObject({ typ: "dpop+jwt" });
      expect(c.headers["X-Orkestrate-Request-Id"]).toMatch(/^ireq_/);
      expect(JSON.parse(c.body)).toEqual({ model: "m", messages: [] });
    }
    expect(calls[0].headers["X-Orkestrate-Request-Id"]).not.toBe(
      calls[1].headers["X-Orkestrate-Request-Id"],
    );
  });
});
