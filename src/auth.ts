import { OrkestrateError } from "./errors";
import { utf8Bytes } from "./encoding";

/**
 * Verify that `request` carries a valid `Authorization: Bearer <secret>`.
 * Throws `OrkestrateError("UNAUTHORIZED")` on failure.
 *
 * Uses Web Crypto (SHA-256 hash-then-compare) so it runs on Node.js, the
 * Next.js Edge Runtime, and Cloudflare Workers.
 */
export async function verifyRequest(
  request: Request,
  secret: string,
): Promise<void> {
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
  if (!(await secretsEqual(token, secret))) {
    throw new OrkestrateError("UNAUTHORIZED", "Invalid secret");
  }
}

/**
 * Constant-time comparison via SHA-256 digest compare.
 *
 * Both inputs hash to 32 bytes, so the comparison loop always runs the same
 * number of iterations regardless of input length or content. The digest
 * approach also avoids leaking length information through early exit.
 */
async function secretsEqual(a: string, b: string): Promise<boolean> {
  const [aDigest, bDigest] = await Promise.all([
    crypto.subtle.digest("SHA-256", utf8Bytes(a)),
    crypto.subtle.digest("SHA-256", utf8Bytes(b)),
  ]);
  const aa = new Uint8Array(aDigest);
  const bb = new Uint8Array(bDigest);
  let diff = 0;
  for (let i = 0; i < aa.length; i++) {
    diff |= aa[i]! ^ bb[i]!;
  }
  return diff === 0;
}
