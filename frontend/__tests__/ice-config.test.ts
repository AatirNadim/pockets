import crypto from "node:crypto";
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isIceServer, resolveIceServers } from "../lib/ice";

describe("TURN / ICE server configuration", () => {
  it("returns an empty list when no TURN variables are configured", async () => {
    const servers = await resolveIceServers({});
    assert.deepStrictEqual(servers, []);
  });

  it("builds static TURN configuration from TURN_URLS, TURN_USERNAME, and TURN_CREDENTIAL", async () => {
    const servers = await resolveIceServers({
      TURN_URLS: "turn:turn.example.com:3478, turns:turn.example.com:5349?transport=tcp",
      TURN_USERNAME: "pockets-user",
      TURN_CREDENTIAL: "pockets-secret",
    });

    assert.deepStrictEqual(servers, [
      {
        urls: [
          "turn:turn.example.com:3478",
          "turns:turn.example.com:5349?transport=tcp",
        ],
        username: "pockets-user",
        credential: "pockets-secret",
      },
    ]);
  });

  it("mints coturn HMAC-SHA1 ephemeral credentials when TURN_SHARED_SECRET is set", async () => {
    const fixedNowMs = 1_700_000_000_000;
    const servers = await resolveIceServers(
      {
        TURN_URLS: "turns:turn.example.com:5349?transport=tcp",
        TURN_SHARED_SECRET: "super-secret-key",
        TURN_CREDENTIAL_TTL_SECONDS: "1800",
      },
      { nowMs: fixedNowMs }
    );

    assert.strictEqual(servers.length, 1);
    const [entry] = servers;
    assert.strictEqual(entry.urls, "turns:turn.example.com:5349?transport=tcp");
    assert.ok(entry.username);
    assert.ok(entry.credential);

    const [expiryPart] = entry.username.split(":");
    assert.strictEqual(Number(expiryPart), Math.floor(fixedNowMs / 1000) + 1800);

    const expectedCredential = crypto
      .createHmac("sha1", "super-secret-key")
      .update(entry.username)
      .digest("base64");
    assert.strictEqual(entry.credential, expectedCredential);
  });

  it("rejects mismatched static TURN_USERNAME / TURN_CREDENTIAL", async () => {
    await assert.rejects(
      () =>
        resolveIceServers({
          TURN_URLS: "turn:turn.example.com:3478",
          TURN_USERNAME: "only-user",
        }),
      /TURN_USERNAME and TURN_CREDENTIAL/
    );
  });

  it("parses TURN_ICE_SERVERS from either a JSON array or an { iceServers } object", async () => {
    const fromArray = await resolveIceServers({
      TURN_ICE_SERVERS: JSON.stringify([
        {
          urls: "turns:relay.example.com:5349",
          username: "u1",
          credential: "c1",
        },
      ]),
    });
    assert.strictEqual(fromArray.length, 1);
    assert.strictEqual(fromArray[0].urls, "turns:relay.example.com:5349");

    const fromObject = await resolveIceServers({
      TURN_ICE_SERVERS: JSON.stringify({
        iceServers: [
          {
            urls: ["turn:relay.example.com:3478", "turns:relay.example.com:5349"],
            username: "u2",
            credential: "c2",
          },
        ],
      }),
    });
    assert.strictEqual(fromObject.length, 1);
    assert.deepStrictEqual(fromObject[0].urls, [
      "turn:relay.example.com:3478",
      "turns:relay.example.com:5349",
    ]);
  });

  it("rejects invalid TURN_ICE_SERVERS payloads and non-ICE schemes", async () => {
    assert.strictEqual(isIceServer({ urls: "https://example.com" }), false);
    assert.strictEqual(isIceServer({ urls: "turns:relay.example.com:5349" }), true);

    await assert.rejects(
      () =>
        resolveIceServers({
          TURN_ICE_SERVERS: "{bad-json",
        }),
      /Invalid TURN_ICE_SERVERS JSON/
    );

    await assert.rejects(
      () =>
        resolveIceServers({
          TURN_ICE_SERVERS: JSON.stringify([{ urls: "https://not-ice.example.com" }]),
        }),
      /Invalid ICE server configuration/
    );
  });

  it("fetches external TURN credentials via GET or POST and accepts array or object payloads", async () => {
    let capturedUrl = "";
    let capturedInit: RequestInit | undefined;

    const mockFetch: typeof fetch = async (input, init) => {
      capturedUrl = String(input);
      capturedInit = init;
      return new Response(
        JSON.stringify([
          {
            urls: "turn:global.relay.example:3478",
            username: "dyn-user",
            credential: "dyn-cred",
          },
        ]),
        { status: 200, headers: { "Content-Type": "application/json" } }
      );
    };

    const servers = await resolveIceServers(
      {
        TURN_CREDENTIALS_URL: "https://turn.provider.example/credentials",
        TURN_CREDENTIALS_TOKEN: "secret-api-token",
        TURN_CREDENTIALS_METHOD: "POST",
        TURN_CREDENTIALS_TTL_SECONDS: "7200",
      },
      { fetchImpl: mockFetch }
    );

    assert.strictEqual(capturedUrl, "https://turn.provider.example/credentials");
    assert.strictEqual(capturedInit?.method, "POST");
    assert.deepStrictEqual(capturedInit?.headers, {
      Accept: "application/json",
      Authorization: "Bearer secret-api-token",
      "Content-Type": "application/json",
    });
    assert.strictEqual(capturedInit?.body, JSON.stringify({ ttl: 7200 }));
    assert.deepStrictEqual(servers, [
      {
        urls: "turn:global.relay.example:3478",
        username: "dyn-user",
        credential: "dyn-cred",
      },
    ]);
  });
});
