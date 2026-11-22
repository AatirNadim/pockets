import { NextResponse } from "next/server";

type IceServerValue = {
  urls: string | string[];
  username?: string;
  credential?: string;
  credentialType?: "password" | "oauth";
};

const isIceServer = (value: unknown): value is IceServerValue => {
  if (!value || typeof value !== "object") return false;
  const item = value as Record<string, unknown>;
  const urls = typeof item.urls === "string" ? [item.urls] : item.urls;
  if (!Array.isArray(urls) || !urls.length || urls.length > 8) return false;
  if (urls.some((url) => typeof url !== "string" || url.length > 512 || !/^(stun|stuns|turn|turns):/i.test(url))) return false;
  if (item.username !== undefined && (typeof item.username !== "string" || item.username.length > 256)) return false;
  if (item.credential !== undefined && (typeof item.credential !== "string" || item.credential.length > 1024)) return false;
  return true;
};

export async function GET() {
  const endpoint = process.env.TURN_CREDENTIALS_URL;
  if (!endpoint) return NextResponse.json({ iceServers: [] }, { headers: { "Cache-Control": "no-store" } });
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4000);
  try {
    const headers: Record<string, string> = { Accept: "application/json" };
    if (process.env.TURN_CREDENTIALS_TOKEN) headers.Authorization = `Bearer ${process.env.TURN_CREDENTIALS_TOKEN}`;
    const response = await fetch(endpoint, { headers, cache: "no-store", signal: controller.signal });
    if (!response.ok) throw new Error("Credential service unavailable");
    const body: unknown = await response.json();
    const servers = (body as { iceServers?: unknown })?.iceServers;
    if (!Array.isArray(servers) || servers.length > 8 || !servers.every(isIceServer)) throw new Error("Invalid ICE server configuration");
    return NextResponse.json({ iceServers: servers }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return NextResponse.json({ error: "TURN credentials are currently unavailable." }, { status: 503, headers: { "Cache-Control": "no-store" } });
  } finally {
    clearTimeout(timeout);
  }
}
