/**
 * SuiteTalk REST client for NetSuite (the "standard API").
 *
 * Auth: Token-Based Authentication (TBA) — OAuth 1.0a with HMAC-SHA256.
 * This is self-contained (no cert upload, no external OAuth library): you sign
 * each request with 4 secrets from NetSuite. See NETSUITE_INTEGRATION.md for how
 * to obtain them and for the OAuth 2.0 M2M alternative.
 *
 * The client is INERT unless all NETSUITE_* env vars are present — the app runs
 * fine without NetSuite configured; endpoints return 503 "not configured".
 */
import crypto from "crypto";

export interface NetSuiteConfig {
  accountId: string;      // e.g. "1234567" or "1234567_SB1" (sandbox). Realm = uppercased.
  consumerKey: string;
  consumerSecret: string;
  tokenId: string;
  tokenSecret: string;
}

export function readConfig(): NetSuiteConfig | null {
  const {
    NETSUITE_ACCOUNT_ID, NETSUITE_CONSUMER_KEY, NETSUITE_CONSUMER_SECRET,
    NETSUITE_TOKEN_ID, NETSUITE_TOKEN_SECRET,
  } = process.env;
  if (!NETSUITE_ACCOUNT_ID || !NETSUITE_CONSUMER_KEY || !NETSUITE_CONSUMER_SECRET || !NETSUITE_TOKEN_ID || !NETSUITE_TOKEN_SECRET) {
    return null;
  }
  return {
    accountId: NETSUITE_ACCOUNT_ID,
    consumerKey: NETSUITE_CONSUMER_KEY,
    consumerSecret: NETSUITE_CONSUMER_SECRET,
    tokenId: NETSUITE_TOKEN_ID,
    tokenSecret: NETSUITE_TOKEN_SECRET,
  };
}

/** REST base. Account id with "_" becomes "-" in the host; realm is uppercased. */
function restBase(accountId: string): string {
  const host = accountId.toLowerCase().replace(/_/g, "-");
  return `https://${host}.suitetalk.api.netsuite.com/services/rest`;
}

function pctEncode(v: string): string {
  return encodeURIComponent(v).replace(/[!*'()]/g, (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase());
}

function nonce(): string {
  return crypto.randomBytes(16).toString("hex");
}

/**
 * Build the OAuth 1.0a Authorization header for one request.
 * `timestamp` is injected (not read from a clock inside a pure fn) so callers control it.
 */
function authHeader(
  cfg: NetSuiteConfig,
  method: string,
  url: string,
  timestamp: string,
  nonceStr: string,
): string {
  const u = new URL(url);
  const baseUrl = `${u.protocol}//${u.host}${u.pathname}`;

  const oauthParams: Record<string, string> = {
    oauth_consumer_key: cfg.consumerKey,
    oauth_token: cfg.tokenId,
    oauth_signature_method: "HMAC-SHA256",
    oauth_timestamp: timestamp,
    oauth_nonce: nonceStr,
    oauth_version: "1.0",
  };

  // Signature base string includes query params + oauth params, sorted.
  const allParams: Record<string, string> = { ...oauthParams };
  u.searchParams.forEach((val, key) => { allParams[key] = val; });
  const paramString = Object.keys(allParams)
    .sort()
    .map((k) => `${pctEncode(k)}=${pctEncode(allParams[k])}`)
    .join("&");

  const baseString = [method.toUpperCase(), pctEncode(baseUrl), pctEncode(paramString)].join("&");
  const signingKey = `${pctEncode(cfg.consumerSecret)}&${pctEncode(cfg.tokenSecret)}`;
  const signature = crypto.createHmac("sha256", signingKey).update(baseString).digest("base64");

  const realm = cfg.accountId.toUpperCase();
  const headerParams: Record<string, string> = {
    ...oauthParams,
    oauth_signature: signature,
  };
  const header =
    `OAuth realm="${realm}", ` +
    Object.keys(headerParams)
      .map((k) => `${pctEncode(k)}="${pctEncode(headerParams[k])}"`)
      .join(", ");
  return header;
}

export interface RequestOpts {
  method?: string;
  path: string;               // e.g. "/record/v1/customer/123" or "/query/v1/suiteql"
  query?: Record<string, string>;
  body?: unknown;
  timestamp: string;          // unix seconds as string — injected by caller
}

/** Low-level signed fetch against SuiteTalk REST. Throws on non-2xx with the NS error body. */
export async function suiteTalk<T = unknown>(cfg: NetSuiteConfig, opts: RequestOpts): Promise<T> {
  const method = opts.method ?? "GET";
  const url = new URL(restBase(cfg.accountId) + opts.path);
  if (opts.query) for (const [k, v] of Object.entries(opts.query)) url.searchParams.set(k, v);

  const header = authHeader(cfg, method, url.toString(), opts.timestamp, nonce());
  const headers: Record<string, string> = {
    Authorization: header,
    "Content-Type": "application/json",
    Accept: "application/json",
    // SuiteQL requires this header:
    ...(opts.path.includes("/query/v1/suiteql") ? { Prefer: "transient" } : {}),
  };

  const resp = await fetch(url.toString(), {
    method,
    headers,
    body: opts.body != null ? JSON.stringify(opts.body) : undefined,
  });

  const text = await resp.text();
  if (!resp.ok) {
    throw new Error(`NetSuite ${resp.status}: ${text.slice(0, 500)}`);
  }
  return (text ? JSON.parse(text) : {}) as T;
}

/** Run a SuiteQL query (read model — the fastest way to pull lists). */
export async function suiteQL<T = unknown>(
  cfg: NetSuiteConfig,
  sql: string,
  timestamp: string,
  limit = 100,
  offset = 0,
): Promise<{ items: T[]; hasMore: boolean; totalResults: number }> {
  return suiteTalk(cfg, {
    method: "POST",
    path: "/query/v1/suiteql",
    query: { limit: String(limit), offset: String(offset) },
    body: { q: sql },
    timestamp,
  });
}
