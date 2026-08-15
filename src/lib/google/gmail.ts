// Thin wrapper around the Gmail REST API. Read-only by design: only ever
// calls threads.list / threads.get. Never touch send/drafts/modify.

const GMAIL_API = "https://gmail.googleapis.com/gmail/v1/users/me";

export async function refreshGoogleAccessToken(
  refreshToken: string
): Promise<string> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
      client_secret: process.env.GOOGLE_OAUTH_CLIENT_SECRET!,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
  });

  if (!res.ok) {
    throw new Error(
      `Failed to refresh Google access token: ${res.status} ${await res.text()}`
    );
  }

  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

// Revokes a refresh token at Google so it can no longer be used to mint
// new access tokens, even if a copy of it somehow lingered anywhere.
// Best-effort: if Google's endpoint is unreachable or the token is
// already invalid, the caller should still delete its local copy.
export async function revokeGoogleToken(token: string): Promise<void> {
  await fetch("https://oauth2.googleapis.com/revoke", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ token }),
  }).catch((err) => {
    console.error("Google token revocation request failed:", (err as Error).message);
  });
}

type GmailHeader = { name: string; value: string };
export type GmailMessage = {
  id: string;
  internalDate: string;
  snippet?: string;
  payload?: { headers?: GmailHeader[] };
};
export type GmailThread = { id: string; messages: GmailMessage[] };

export function getHeader(message: GmailMessage, name: string): string | undefined {
  return message.payload?.headers?.find((h) => h.name === name)?.value;
}

async function gmailFetch(path: string, accessToken: string) {
  const res = await fetch(`${GMAIL_API}${path}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`Gmail API ${path} failed: ${res.status} ${await res.text()}`);
  }
  return res.json();
}

// Caps how many threads a single sync will pull, so one mailbox can't hang
// a serverless request indefinitely. Revisit once syncing moves to a
// background job.
const MAX_THREADS_PER_SYNC = 300;

export async function listRecentThreadIds(
  accessToken: string,
  days = 90
): Promise<string[]> {
  const ids: string[] = [];
  let pageToken: string | undefined;
  const q = encodeURIComponent(`newer_than:${days}d -in:spam -in:trash`);

  do {
    const path = `/threads?q=${q}&maxResults=100${
      pageToken ? `&pageToken=${pageToken}` : ""
    }`;
    const data = await gmailFetch(path, accessToken);
    for (const t of data.threads ?? []) ids.push(t.id);
    pageToken = data.nextPageToken;
  } while (pageToken && ids.length < MAX_THREADS_PER_SYNC);

  return ids.slice(0, MAX_THREADS_PER_SYNC);
}

export async function getThread(
  accessToken: string,
  threadId: string
): Promise<GmailThread> {
  const path =
    `/threads/${threadId}?format=metadata` +
    `&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date&metadataHeaders=Subject` +
    `&metadataHeaders=List-Unsubscribe&metadataHeaders=Precedence`;
  return gmailFetch(path, accessToken);
}

type GmailPart = {
  mimeType?: string;
  body?: { data?: string };
  parts?: GmailPart[];
};
export type GmailFullMessage = GmailMessage & {
  payload?: GmailMessage["payload"] & { mimeType?: string; body?: { data?: string }; parts?: GmailPart[] };
};
export type GmailFullThread = { id: string; messages: GmailFullMessage[] };

// Full message bodies, fetched only at AI-analysis time for a small number
// of threads — never stored. Sync stays on format=metadata; this is a
// separate, deliberately narrower call so routine syncing doesn't pull
// full email content it doesn't need.
export async function getThreadFull(
  accessToken: string,
  threadId: string
): Promise<GmailFullThread> {
  const path = `/threads/${threadId}?format=full`;
  return gmailFetch(path, accessToken);
}

function base64UrlDecode(data: string): string {
  const normalized = data.replace(/-/g, "+").replace(/_/g, "/");
  return Buffer.from(normalized, "base64").toString("utf-8");
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, "")
    .replace(/<script[\s\S]*?<\/script>/gi, "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// Prefers text/plain; falls back to a naive HTML-to-text strip. Good enough
// for feeding an LLM prompt, not a general-purpose email renderer.
export function extractPlainText(message: GmailFullMessage): string {
  let plain: string | null = null;
  let html: string | null = null;

  function walk(part?: GmailPart) {
    if (!part) return;
    if (part.mimeType === "text/plain" && part.body?.data && !plain) {
      plain = base64UrlDecode(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data && !html) {
      html = base64UrlDecode(part.body.data);
    }
    for (const child of part.parts ?? []) walk(child);
  }

  walk(message.payload);

  if (plain) return (plain as string).trim();
  if (html) return stripHtml(html as string);
  return message.snippet ?? "";
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T) => Promise<R>
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let index = 0;

  async function worker() {
    while (index < items.length) {
      const current = index++;
      results[current] = await fn(items[current]);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, worker)
  );
  return results;
}

export type ParsedAddress = { name: string; email: string; domain: string };

export function parseAddress(headerValue: string): ParsedAddress | null {
  const match = headerValue.match(/<([^>]+)>/);
  const email = (match ? match[1] : headerValue).trim().toLowerCase();
  const emailMatch = email.match(/^[^\s@]+@([^\s@]+)$/);
  if (!emailMatch) return null;

  const domain = emailMatch[1];
  const name = match
    ? headerValue.slice(0, match.index).replace(/"/g, "").trim()
    : "";
  return { name, email, domain };
}

// Good enough for the common case (display names without embedded commas).
export function parseAddressList(headerValue: string): ParsedAddress[] {
  return headerValue
    .split(",")
    .map((part) => parseAddress(part.trim()))
    .filter((a): a is ParsedAddress => a !== null);
}

// Backstop heuristic for obvious automated/bulk sender addresses.
const NOISE_LOCAL_PART = /^(no-?reply|do-?not-?reply|notifications?|newsletters?|mailer-?daemon|automated|updates?|digest|bounce)s?(\+.*)?$/i;

export function isNoiseAddress(email: string): boolean {
  const localPart = email.split("@")[0] ?? "";
  return NOISE_LOCAL_PART.test(localPart);
}

// The real signal for "this is bulk mail, not a person": senders that
// blast newsletters, receipts, shipping updates, admissions announcements,
// etc. are required (CAN-SPAM / mailbox provider rules) to carry a
// List-Unsubscribe header, and bulk-sending infrastructure commonly sets
// Precedence: bulk/list. An actual human emailing 1:1 essentially never
// has either. This catches senders no local-part regex or domain
// blocklist would (airlines, colleges, streaming services, etc.) without
// having to maintain a list of company domains.
export function isBulkMessage(message: GmailMessage): boolean {
  if (getHeader(message, "List-Unsubscribe")) return true;
  const precedence = getHeader(message, "Precedence")?.toLowerCase();
  return precedence === "bulk" || precedence === "list" || precedence === "junk";
}

// Shared webmail domains can't be used to tell people apart — two
// unrelated clients might both happen to email from @gmail.com. Domain
// grouping only makes sense for company domains.
const CONSUMER_EMAIL_DOMAINS = new Set([
  "gmail.com",
  "googlemail.com",
  "yahoo.com",
  "ymail.com",
  "outlook.com",
  "hotmail.com",
  "live.com",
  "msn.com",
  "icloud.com",
  "me.com",
  "mac.com",
  "aol.com",
  "protonmail.com",
  "proton.me",
  "gmx.com",
  "zoho.com",
]);

export function isConsumerEmailDomain(domain: string): boolean {
  return CONSUMER_EMAIL_DOMAINS.has(domain.toLowerCase());
}

// What clients get grouped by: a company domain buckets everyone at that
// company into one client, but a shared consumer webmail domain can't
// distinguish unrelated people, so those fall back to the exact address.
export function groupingKeyFor(address: ParsedAddress): string {
  return isConsumerEmailDomain(address.domain) ? address.email : address.domain;
}
