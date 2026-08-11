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

type GmailHeader = { name: string; value: string };
type GmailMessage = {
  id: string;
  internalDate: string;
  payload?: { headers?: GmailHeader[] };
};
export type GmailThread = { id: string; messages: GmailMessage[] };

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
  const path = `/threads/${threadId}?format=metadata&metadataHeaders=From&metadataHeaders=To&metadataHeaders=Date`;
  return gmailFetch(path, accessToken);
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
