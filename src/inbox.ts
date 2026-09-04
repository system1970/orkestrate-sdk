/**
 * Client module for delivering work orders and alerts into Orkestrate Inbox.
 */

export interface InboxSendOptions {
  to: string;
  from?: string;
  issuerDomain?: string;
  issuerName?: string;
  type: "attention" | "decision" | "question" | "work_order" | "microapp" | "update";
  urgency?: "routine" | "important" | "critical";
  title?: string;
  subject?: string;
  description?: string;
  reason?: string;
  options?: Array<{ id: string; label: string; description?: string; recommended?: boolean }>;
  evidence?: Array<{ type: string; title: string; reference?: string; data?: any }>;
  callbackUrl?: string;
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
      const finalTitle = payload.title || payload.subject;
      if (!finalTitle) {
        throw new Error("Missing required field: title or subject");
      }

      const domain = payload.issuerDomain || (payload.from && payload.from.includes("@") ? payload.from.split("@")[1] : "orkestrate.space");

      const body = {
        to: payload.to,
        issuerDomain: domain,
        issuerName: payload.issuerName || domain,
        issuerEmail: payload.from,
        type: payload.type,
        urgency: payload.urgency || "routine",
        title: finalTitle,
        description: payload.description || "",
        reason: payload.reason,
        options: payload.options,
        evidence: payload.evidence,
        callbackUrl: payload.callbackUrl,
        microapp: payload.microapp
      };

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(this.secret ? { "Authorization": `Bearer ${this.secret}` } : {})
        },
        body: JSON.stringify(body)
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(`Orkestrate inbox.send failed (${res.status}): ${err.error || res.statusText}`);
      }

      return res.json();
    }
  };
}
