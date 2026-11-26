import crypto from "node:crypto";

export type IceServerValue = {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: "password" | "oauth";
};

const MAX_ICE_SERVERS = 8;
const MAX_URLS_PER_SERVER = 8;
const DEFAULT_TURN_TTL_SECONDS = 3600;
const MIN_TURN_TTL_SECONDS = 60;
const MAX_TURN_TTL_SECONDS = 86400;
const FETCH_TIMEOUT_MS = 4000;

export const isIceServer = (value: unknown): value is IceServerValue => {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const item = value as Record<string, unknown>;
  const urls = typeof item.urls === "string" ? [item.urls] : item.urls;
  if (!Array.isArray(urls) || !urls.length || urls.length > MAX_URLS_PER_SERVER) return false;
  if (
    urls.some(
      (url) =>
        typeof url !== "string" ||
        url.length > 512 ||
        !/^(stun|stuns|turn|turns):/i.test(url.trim())
    )
  ) {
    return false;
  }
  if (item.username !== undefined && (typeof item.username !== "string" || item.username.length > 256)) {
    return false;
  }
  if (item.credential !== undefined && (typeof item.credential !== "string" || item.credential.length > 1024)) {
    return false;
  }
  if (
    item.credentialType !== undefined &&
    item.credentialType !== "password" &&
    item.credentialType !== "oauth"
  ) {
    return false;
  }
  return true;
};

const normalizeIceServers = (raw: unknown): IceServerValue[] => {
  const candidates = Array.isArray(raw)
    ? raw
    : raw && typeof raw === "object" && Array.isArray((raw as { iceServers?: unknown }).iceServers)
      ? (raw as { iceServers: unknown[] }).iceServers
      : null;

  if (!candidates || candidates.length > MAX_ICE_SERVERS || !candidates.every(isIceServer)) {
    throw new Error("Invalid ICE server configuration");
  }

  return candidates.map((server) => ({
    urls: typeof server.urls === "string" ? server.urls.trim() : server.urls.map((url) => url.trim()),
    ...(server.username !== undefined ? { username: server.username } : {}),
    ...(server.credential !== undefined ? { credential: server.credential } : {}),
    ...(server.credentialType !== undefined ? { credentialType: server.credentialType } : {}),
  }));
};

const parseTurnTtl = (rawTtl: string | undefined): number => {
  if (!rawTtl?.trim()) return DEFAULT_TURN_TTL_SECONDS;
  const parsed = Number(rawTtl.trim());
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed)) {
    throw new Error("Invalid TURN TTL configuration");
  }
  return Math.min(MAX_TURN_TTL_SECONDS, Math.max(MIN_TURN_TTL_SECONDS, parsed));
};

const parseTurnUrls = (rawUrls: string): string[] => {
  const urls = rawUrls
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

  if (!urls.length || urls.length > MAX_URLS_PER_SERVER) {
    throw new Error("Invalid TURN_URLS configuration");
  }

  return urls;
};

const buildDirectTurnServer = (
  env: Record<string, string | undefined>,
  nowMs: number
): IceServerValue | null => {
  const rawUrls = env.TURN_URLS?.trim();
  if (!rawUrls) return null;

  const urls = parseTurnUrls(rawUrls);
  const sharedSecret = env.TURN_SHARED_SECRET?.trim();
  const username = env.TURN_USERNAME?.trim();
  const credential = env.TURN_CREDENTIAL?.trim();

  let entry: IceServerValue;

  if (sharedSecret) {
    const ttlSeconds = parseTurnTtl(env.TURN_CREDENTIAL_TTL_SECONDS);
    const expiresAt = Math.floor(nowMs / 1000) + ttlSeconds;
    const ephemeralUsername = `${expiresAt}:${crypto.randomUUID()}`;
    const ephemeralCredential = crypto
      .createHmac("sha1", sharedSecret)
      .update(ephemeralUsername)
      .digest("base64");

    entry = {
      urls: urls.length === 1 ? urls[0] : urls,
      username: ephemeralUsername,
      credential: ephemeralCredential,
    };
  } else {
    if ((username && !credential) || (!username && credential)) {
      throw new Error("Both TURN_USERNAME and TURN_CREDENTIAL must be set together");
    }
    entry = {
      urls: urls.length === 1 ? urls[0] : urls,
      ...(username && credential ? { username, credential } : {}),
    };
  }

  if (!isIceServer(entry)) {
    throw new Error("Invalid TURN_URLS configuration");
  }

  return entry;
};

const parseJsonIceServers = (rawJson: string | undefined): IceServerValue[] => {
  const trimmed = rawJson?.trim();
  if (!trimmed) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(trimmed);
  } catch {
    throw new Error("Invalid TURN_ICE_SERVERS JSON");
  }
  return normalizeIceServers(parsed);
};

const fetchExternalIceServers = async (
  env: Record<string, string | undefined>,
  fetchImpl: typeof fetch
): Promise<IceServerValue[]> => {
  const endpoint = env.TURN_CREDENTIALS_URL?.trim();
  if (!endpoint) return [];

  const method = env.TURN_CREDENTIALS_METHOD?.trim().toUpperCase() || "GET";
  if (method !== "GET" && method !== "POST") {
    throw new Error("Unsupported TURN_CREDENTIALS_METHOD");
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    const token = env.TURN_CREDENTIALS_TOKEN?.trim();
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }

    let body: string | undefined;
    if (method === "POST") {
      headers["Content-Type"] = "application/json";
      if (env.TURN_CREDENTIALS_TTL_SECONDS?.trim()) {
        body = JSON.stringify({ ttl: parseTurnTtl(env.TURN_CREDENTIALS_TTL_SECONDS) });
      }
    }

    const response = await fetchImpl(endpoint, {
      method,
      headers,
      body,
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error("Credential service unavailable");
    }

    const payload: unknown = await response.json();
    return normalizeIceServers(payload);
  } finally {
    clearTimeout(timeout);
  }
};

export async function resolveIceServers(
  env: Record<string, string | undefined> = process.env,
  options: { fetchImpl?: typeof fetch; nowMs?: number } = {}
): Promise<IceServerValue[]> {
  const fetchImpl = options.fetchImpl ?? fetch;
  const nowMs = options.nowMs ?? Date.now();

  const configuredServers: IceServerValue[] = [
    ...parseJsonIceServers(env.TURN_ICE_SERVERS),
  ];

  const directServer = buildDirectTurnServer(env, nowMs);
  if (directServer) {
    configuredServers.push(directServer);
  }

  if (configuredServers.length > MAX_ICE_SERVERS) {
    throw new Error("Invalid ICE server configuration");
  }

  const fetchedServers = await fetchExternalIceServers(env, fetchImpl);
  return [...configuredServers, ...fetchedServers].slice(0, MAX_ICE_SERVERS);
}
