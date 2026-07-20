import { timingSafeEqual } from "node:crypto";
import { OrkestrateError } from "./errors";

/**
 * Verify that `request` carries a valid `Authorization: Bearer <secret>`.
 * Throws `OrkestrateError("UNAUTHORIZED")` on failure.
 */
export function verifyRequest(request: Request, secret: string): void {
  if (!secret) {
    throw new OrkestrateError("INTERNAL", "Publisher secret is not configured", 500);
  }

  const header = request.headers.get("authorization");
  if (!header) {
    throw new OrkestrateError("UNAUTHORIZED", "Missing Authorization header");
  }

  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  if (!match?.[1]) {
    throw new OrkestrateError("UNAUTHORIZED", "Authorization must be Bearer <secret>");
  }

  const token = match[1].trim();
  if (!secretsEqual(token, secret)) {
    throw new OrkestrateError("UNAUTHORIZED", "Invalid secret");
  }
}

/**
 * Constant-time comparison of two strings.
 *
 * On length mismatch we compare `a` against itself so that callers cannot
 * distinguish "wrong length" from "wrong content" by timing alone. The
 * branch (return false vs. continue) still leaks ~1 bit — acceptable for a
 * shared-secret check against remote timing noise but not for password
 * hashing.
 */
function secretsEqual(a: string, b: string): boolean {
  const aBuf = Buffer.from(a, "utf8");
  const bBuf = Buffer.from(b, "utf8");

  if (aBuf.length !== bBuf.length) {
    timingSafeEqual(aBuf, aBuf);
    return false;
  }

  return timingSafeEqual(aBuf, bBuf);
}
