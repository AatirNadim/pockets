# Local Development and Peer Testing

Pockets has a Next.js frontend and a Node WebSocket signaling service. For a local peer session, one computer runs both services and other devices open the frontend and signaling address on that computer. After signaling negotiates the session, browsers try to carry audio, video, chat, and files directly over WebRTC; the signaling server does not relay those bytes.

This guide covers three ways to let another device reach a development instance:

1. Use the host computer's LAN IP address.
2. Give that LAN address a `.local` mDNS name, optionally putting Caddy in front for HTTPS.
3. Use a development tunnel when devices cannot reach one another over the LAN.

## Requirements

- Node.js 20 or later
- Corepack and pnpm 9.15.0 (`corepack enable pnpm`)
- Docker Compose only for the optional Redis or production-like Compose paths
- HTTPS for camera and microphone access from another device

## Start the development services

From the repository root, install dependencies and create local environment files:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
cp server/.env.example server/.env.local
cp frontend/.env.example frontend/.env.local
```

Leave `REDIS_URL` unset for the default in-memory room metadata. Start the services in separate terminals:

```bash
pnpm dev:server
pnpm dev:frontend
```

By default, the frontend listens on port `3000` and signaling listens on port `8080`. The frontend's `NEXT_PUBLIC_SERVER_PATH` setting is the browser-reachable signaling `host:port` (no `ws://` or `wss://` prefix). The browser chooses `ws://` on HTTP pages and `wss://` on HTTPS pages. This value is compiled into the frontend, so restart the dev frontend after changing it.

## Method 1: Connect over the LAN using the host IP

Use this when both devices are on the same reachable Wi-Fi or wired network and you only need to test room joining, chat, or other features that do not require camera/microphone access.

1. Find the development computer's LAN IPv4 address (for example, `192.168.1.25`). Use the address for the network both devices share; VPNs and guest Wi-Fi may use a different or isolated network.
2. In `frontend/.env.local`, set:

   ```env
   NEXT_PUBLIC_SERVER_PATH=192.168.1.25:8080
   ```

3. Restart `pnpm dev:frontend` so Next.js picks up the setting.
4. On the other device, open `http://192.168.1.25:3000` and create/join a room as usual.
5. Allow inbound connections to ports `3000` and `8080` in the host firewall if prompted. Both devices must be allowed to communicate directly on the LAN; client isolation on guest networks commonly blocks this.

The Next.js development script already binds to `0.0.0.0`; the signaling server also listens on the host's network interfaces. `localhost` or `127.0.0.1` on the other device would point back to that device, so use the development computer's address for both the page and signaling setting.

**Camera and microphone:** browsers require a secure context for camera/microphone access. `http://localhost` is treated specially as secure on the same device, but a LAN IP served over plain HTTP is not. Use Method 2 for media-device testing.

## Method 2: Use an mDNS name, optionally with a Caddy HTTPS proxy

mDNS (often called Bonjour or Zeroconf) lets devices on a local network resolve a hostname such as `pockets-host.local` to the host's current LAN IP. It is name resolution, not a proxy: it does not forward ports, add HTTPS, or bypass Wi-Fi isolation/firewall rules. The network and client operating system must support mDNS, and multicast discovery may be blocked on guest, enterprise, or segmented Wi-Fi.

### Name resolution only

If you have already configured the development computer's hostname as `pockets-host.local` and confirmed other devices resolve it, you can use the hostname in place of its IP:

```env
NEXT_PUBLIC_SERVER_PATH=pockets-host.local:8080
```

Restart the frontend, then open `http://pockets-host.local:3000`. This has the same HTTP secure-context limitation as using the IP address. A `.local` name alone does not provide HTTPS.

### mDNS plus Caddy reverse proxy and local HTTPS

For camera/microphone testing, a reverse proxy can provide one browser-facing HTTPS hostname and route requests to the two development services. Install Caddy on the development computer and configure a hostname that resolves to it on every peer device. For example, if mDNS resolves `pockets-host.local`:

```caddyfile
pockets-host.local {
  reverse_proxy localhost:3000
}

pockets-host.local:8443 {
  reverse_proxy localhost:8080
}
```

Run Caddy with this configuration. Then set in `frontend/.env.local`:

```env
NEXT_PUBLIC_SERVER_PATH=pockets-host.local:8443
```

Restart the frontend and visit `https://pockets-host.local`. The WebSocket connection will use `wss://pockets-host.local:8443` and be proxied to port `8080`. Permit inbound ports `443` and `8443` through the host firewall. If you choose different proxy ports, use those consistently in the Caddyfile and `NEXT_PUBLIC_SERVER_PATH`.

Caddy's local HTTPS certificates are issued by its local certificate authority. Trust that CA on each peer device/browser using Caddy's certificate installation procedure; until trusted, browsers will show a certificate warning, and secure browser features may not work reliably. Use only devices you control for local certificate trust. An alternative is a publicly trusted HTTPS tunnel (Method 3), which avoids installing a local CA.

The `.local` name and Caddy solve separate problems: mDNS maps a name to the development computer; Caddy terminates HTTPS and forwards web and WebSocket requests to the local services.

## Method 3: Use a development tunnel

When the peer is not on the same LAN, or LAN routing/mDNS is blocked, use a tunnel product that exposes both the frontend and signaling service over browser-reachable HTTPS/WSS URLs. This requires internet access and a tunnel provider; it is no longer purely LAN-local. Do not expose the development server to untrusted users.

Use either a single hostname with separate frontend and WebSocket routes, or two public tunnel hostnames. Configure the frontend tunnel to forward to local port `3000` and the signaling WebSocket tunnel to port `8080`. Set `NEXT_PUBLIC_SERVER_PATH` to the browser-facing signaling hostname and port (or hostname only if the tunnel uses standard HTTPS/WSS port `443`), then restart the frontend. Open the tunnel's HTTPS frontend URL on the peer device.

Check the tunnel provider's instructions for WebSocket support and hostname/port behavior. The page must be HTTPS and signaling must be reachable over WSS; a tunnel that forwards HTTP only will not support the signaling connection. Treat the public tunnel URL as accessible to anyone who obtains it, unless the provider offers access controls.

## Troubleshooting

- **Page loads but cannot join a room:** verify `NEXT_PUBLIC_SERVER_PATH` uses an address the peer can reach, points to the signaling proxy/port, and that the frontend was restarted after editing it.
- **Connection refused or times out:** check that both services are running, ports/host firewall rules are correct, and Wi-Fi client isolation or a VPN is not blocking peer-to-host traffic.
- **`.local` does not resolve:** confirm the host advertises that name, both devices are on the same multicast-enabled LAN, and try the LAN IP to isolate an mDNS issue.
- **Camera/microphone unavailable:** use HTTPS on remote devices and trust the local Caddy CA, or use an HTTPS tunnel. The browser still requires the user to grant device permission.
- **Peers join but media does not connect:** WebRTC tries direct network paths and uses the configured public STUN servers by default. Some NAT/firewall combinations require TURN; this project does not provide a TURN service. See operating limits below.

## Optional Redis

For Redis-backed room metadata during development, start `server/docker-compose.yml` and set `REDIS_URL=redis://localhost:6379` in `server/.env.local`. Redis stores room metadata only. Live WebSocket sessions cannot resume after a signaling server restart; old room/user metadata is cleared at startup. If `REDIS_URL` is configured, Redis must be reachable or the server stops at startup.

## Production-like Compose stack

From the repository root:

```bash
docker compose build
docker compose up -d
```

Open `http://localhost:3000` on the development computer. The stack starts Redis, one signaling server, and one production Next.js server. For access from another device, set a browser-reachable `NEXT_PUBLIC_SERVER_PATH` at build time, and provide HTTPS plus a WebSocket-capable reverse proxy. Never use the internal Compose hostname `server` as the browser-facing address. Do not scale the signaling service: live sockets are held by one process and are not routed between replicas.

## Checks and builds

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build:server
pnpm build:frontend
```

`pnpm test` covers signaling authorization, admission capacity, and disconnect cleanup. Browser testing is still needed for camera/microphone permissions, mobile layout, peer-to-peer connectivity, and file-transfer interruption/retry cases.

## Environment variables

| Variable | Used by | Meaning |
| --- | --- | --- |
| `PORT` | Server | HTTP and WebSocket listen port; defaults to `8080`. |
| `REDIS_URL` | Server | Optional Redis URL for room metadata; connection failure stops startup. Unset uses in-memory metadata. |
| `ROOM_TTL_SECONDS` | Server | Redis room metadata expiry; defaults to one hour and is refreshed while a room has live sessions. |
| `NEXT_PUBLIC_SERVER_PATH` | Frontend | Browser-visible signaling host and port, without `ws://` or `wss://`; compiled into the frontend. |
| `TURN_CREDENTIALS_URL` | Frontend server | Optional private credential endpoint returning `{ "iceServers": [...] }` with short-lived TURN credentials. |
| `TURN_CREDENTIALS_TOKEN` | Frontend server | Optional bearer token sent only from the Next.js server to the credential endpoint; never use a `NEXT_PUBLIC_` name. |

## Operating limits

- Rooms allow at most six active plus pending participants, including the host.
- Media uses a full mesh of peer connections. Per-participant connection count grows with room size, so the limit should not be increased without measurement.
- ICE configuration defaults to public STUN servers. Some NATs/firewalls require TURN; configure the server-only credential endpoint with short-lived TURN credentials for those networks. The app exposes no provider or TURN service of its own.
- Room membership, chat messages, and file catalogs are temporary client/server memory. Redis does not retain them across signaling server restarts.
- WebRTC encrypts transport between peers, but the app does not authenticate participant identity or add a separate application end-to-end identity/security layer.
- The signaling service is designed for one instance. Redis does not provide shared socket routing or multi-instance coordination.
- Use HTTPS in deployed environments and configure a browser-reachable `wss://` signaling endpoint.
