/**
 * Client module for delivering work orders and alerts into Orkestrate Inbox.
 * Sender identity and verified domain are derived automatically on the server
 * from the authenticated ORKESTRATE_SECRET or Delivery Grant.
 */

export interface InboxSendOptions {
  /** Recipient inbox address, e.g. "user@orkestrate.space" */
  to: string;
  /** Work order type */
  type: "attention" | "decision" | "question" | "work_order" | "microapp" | "update";
  /** Subject line or title */
  title: string;
  /** Plain text or markdown description */
  description?: string;
  /** Priority level */
  urgency?: "routine" | "important" | "critical";
  /** Why this item was triggered */
  reason?: string;
  /** Structured choices for "decision" items */
  options?: Array<{ id: string; label: string; description?: string; recommended?: boolean }>;
  /** Diagnostic logs or diffs for "attention" items */
  evidence?: Array<{ type: string; title: string; reference?: string; data?: any }>;
  /** Webhook URL where Orkestrate posts the signed resolution receipt */
  callbackUrl?: string;
  /** Embedded microapp configuration */
  microapp?: { appId: string; url?: string; suggestedAction?: string };
}

export interface OrkestrateClientOptions {
  secret?: string;
  baseUrl?: string;
}

export class Orkestrate {
  readonly secret: string;
  readonly baseUrl: string;

  constructor(options?: OrkestrateClientOptions) {
    this.secret = options?.secret || (typeof process !== "undefined" ? process.env?.ORKESTRATE_SECRET : "") || "";
    this.baseUrl = (options?.baseUrl || "https://orkestrate.space").replace(/\/+$/, "");
  }

  readonly inbox = {
    send: async (payload: InboxSendOptions) => {
      const url = `${this.baseUrl}/api/inbox/send`;

      if (!payload.title || !payload.type || !payload.to) {
        throw new Error("Missing required fields: to, type, title");
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.secret ? { "Authorization": `Bearer ${this.secret}` } : {})
        },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Orkestrate inbox.send failed (${res.status}): ${err.error || res.statusText}`);
      }

      return res.json();
    }
  };
}
