import type { LanguageModel } from "ai";
import { createAnthropic } from "@ai-sdk/anthropic";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createOpenAI } from "@ai-sdk/openai";
import { OrkestrateError } from "./errors";
import type { CallerModelConfig } from "./types";

/**
 * Build a custom fetch that routes LLM API calls through the Orkestrate
 * gateway proxy. The caller's API key stays server-side — the publisher
 * never sees it.
 */
function proxyFetch(
  gatewayUrl: string,
  token: string,
): typeof fetch {
  const proxyEndpoint = `${gatewayUrl.replace(/\/+$/, "")}/api/proxy/llm`;
  return async (input, init) => {
    const request = new Request(input, init);
    const body = await request.text();

    return fetch(proxyEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": request.headers.get("content-type") || "application/json",
        "X-Orkestrate-Proxy-Token": token,
        "X-Orkestrate-Original-Url": request.url,
      },
      body: body || undefined,
      signal: init?.signal,
    });
  };
}

/**
 * Dummy API key used when proxying through the gateway.
 * The actual key is injected server-side by the gateway proxy.
 */
const PROXY_API_KEY = "proxied-via-orkestrate";

/**
 * Build an AI SDK language model from the caller's BYOM config.
 *
 * When `token` and `gatewayUrl` are set, LLM calls are proxied through the
 * gateway so the publisher never sees the caller's API key. When they are
 * absent (legacy/test mode), `apiKey` must be provided directly in the config.
 */
export function buildModel(config: CallerModelConfig): LanguageModel {
  try {
    const useProxy = !!(config.token && config.gatewayUrl);
    const fetch = useProxy ? proxyFetch(config.gatewayUrl!, config.token!) : undefined;
    const apiKey = useProxy ? PROXY_API_KEY : config.apiKey;

    if (!useProxy && !apiKey) {
      throw new OrkestrateError(
        "MODEL_ERROR",
        "Either apiKey or token+gatewayUrl must be provided",
      );
    }

    switch (config.provider) {
      case "openai": {
        const openai = createOpenAI({
          apiKey,
          fetch,
          ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
        return openai.chat(config.model);
      }
      case "anthropic": {
        const anthropic = createAnthropic({
          apiKey,
          fetch,
          ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
        return anthropic(config.model);
      }
      case "google": {
        const google = createGoogleGenerativeAI({
          apiKey,
          fetch,
          ...(config.baseURL ? { baseURL: config.baseURL } : {}),
        });
        return google(config.model);
      }
      case "custom": {
        const openai = createOpenAI({
          apiKey,
          fetch,
          baseURL: config.baseURL,
        });
        return openai.chat(config.model);
      }
      default: {
        const _exhaustive: never = config.provider;
        throw new OrkestrateError("MODEL_ERROR", `Unsupported provider: ${String(_exhaustive)}`);
      }
    }
  } catch (error) {
    if (error instanceof OrkestrateError) throw error;
    const message = error instanceof Error ? error.message : "Failed to build model";
    throw new OrkestrateError("MODEL_ERROR", message);
  }
}
