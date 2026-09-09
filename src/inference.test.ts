/**
 * Bounded-inference SDK tests. No network: fetchImpl is always mocked.
 * DPoP proofs are real ES256 JWTs verified structurally (never sent).
 */
import { describe, it, expect } from "vitest";
import { generateKeyPair, exportJWK, decodeProtectedHeader } from "jose";
import {
  BoundedExecutor,
  createOperationId,
  requestIdForOperation,
  signDpopProof,
} from "./inference.js";

describe("bounded inference SDK", () => {
  it("stable request ids per operation; fresh ids per operation", () => {
    const op = createOperationId();
    expect(requestIdForOperation(op, "abc")).toBe(requestIdForOperation(op, "abc"));
    expect(requestIdForOperation(op, "abc")).not.toBe(requestIdForOperation(op, "def"));
    expect(requestIdForOperation(createOperationId(), "abc")).not.toBe(
      requestIdForOperation(createOperationId(), "abc"),
    );
  });

  it("proofs are DPoP-shaped with fresh jti per attempt", async () => {
    const { publicKey, privateKey } = await generateKeyPair("ES256");
    const pub = await exportJWK(publicKey);
    const priv = await exportJWK(privateKey);
    const a = await signDpopProof({ privateJwk: priv, htm: "POST", htu: "https://gw.test/exec" });
    const b = await signDpopProof({ privateJwk: priv, htm: "POST", htu: "https://gw.test/exec" });
    expect(decodeProtectedHeader(a)).toMatchObject({ typ: "dpop+jwt", alg: "ES256" });
    expect(a).not.toBe(b);
    void pub;
  });

  it("retries reuse the request id with a fresh proof each attempt", async () => {
    const { privateKey } = await generateKeyPair("ES256");
    const priv = await exportJWK(privateKey);
    const bodies: Array<Record<string, unknown>> = [];
    const proofs = new Set<string>();
    const fetchImpl = (async (_url: string, init: { headers: Record<string, string>; body: string }) => {
      bodies.push(JSON.parse(init.body) as Record<string, unknown>);
      proofs.add(init.headers.DPoP);
      return new Response(JSON.stringify({ receipt: "r1" }), { status: 200 });
    }) as unknown as typeof fetch;
    const ex = new BoundedExecutor({
      executorUrl: "https://gw.test/exec",
      credential: "cred-1",
      fetchImpl,
    });
    const body = { requestId: "ireq_stable", canonicalHash: "h", payload: { m: 1 } };
    await ex.execute({ privateJwk: priv, body });
    await ex.execute({ privateJwk: priv, body });
    expect(bodies.map((b) => b.requestId)).toEqual(["ireq_stable", "ireq_stable"]);
    expect(proofs.size).toBe(2);
  });

  it("maps executor failures to explicit codes", async () => {
    const { privateKey } = await generateKeyPair("ES256");
    const priv = await exportJWK(privateKey);
    const at = (status: number, text: string) =>
      ({
        executorUrl: "https://gw.test/exec",
        credential: "c",
        fetchImpl: (async () => new Response(text, { status })) as unknown as typeof fetch,
      }) as ConstructorParameters<typeof BoundedExecutor>[0];
    const body = { requestId: "r", canonicalHash: "h", payload: {} };
    const run = (status: number, text: string) =>
      new BoundedExecutor(at(status, text)).execute({ privateJwk: priv, body });
    expect((await run(429, "grant_insufficient_funds")).code).toBe("BUDGET_EXHAUSTED");
    expect((await run(401, "nope")).code).toBe("UNAUTHORIZED");
    expect((await run(409, "canonical_mismatch")).code).toBe("CONFLICT");
    expect((await run(504, "upstream timeout")).code).toBe("UPSTREAM_UNCERTAIN");
    expect((await run(410, "grant_revoked")).code).toBe("GRANT_NOT_ACTIVE");
  });
});
