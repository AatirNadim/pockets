# Local Development and Deployment

Pockets is a pnpm workspace with a Next.js frontend, a Node WebSocket signaling service, and a shared protocol package. The server relays signaling; audio, video, chat, and file bytes travel over peer connections when the network permits. This is a small-room, single signaling-server prototype.

## Requirements

- Node.js 20 or later
- Corepack and pnpm 9.15.0 (`corepack enable pnpm`)
- Docker Compose for the container path or optional Redis
- HTTPS for camera and microphone access outside localhost

## Run locally

From the repository root:

```bash
corepack enable pnpm
pnpm install --frozen-lockfile
cp server/.env.example server/.env.local
cp frontend/.env.example frontend/.env.local
```

The default development setup uses in-memory room metadata. Leave `REDIS_URL` unset in `server/.env.local` unless you have started Redis. Start the server and frontend in separate terminals:

```bash
pnpm dev:server
pnpm dev:frontend
```

The frontend is at `http://localhost:3000`; signaling is at `ws://localhost:8080`. `NEXT_PUBLIC_SERVER_PATH` is the browser-reachable hostname and port, with no protocol prefix. HTTPS pages automatically use `wss://`.

To run Redis locally, start `server/docker-compose.yml`, then set `REDIS_URL=redis://localhost:6379` in `server/.env.local`. Redis stores room metadata only. Live WebSocket sessions cannot resume after a server restart; the server clears old room/user metadata at startup. Redis availability is required when `REDIS_URL` is configured; the server does not silently fall back to memory.

## Production-like Compose stack

The supported container build uses the repository root as the build context so pnpm can install `shared` and each app. From the root:

```bash
docker compose build
docker compose up -d
```

Open `http://localhost:3000`. The Compose stack starts Redis, one signaling server, and one production Next.js server. Redis uses a named volume for its own data, but Pockets clears ephemeral room membership whenever the signaling process starts. Do not scale the signaling service: live sockets are held by one process and are not routed between replicas.

If the frontend is served through HTTPS or from another device, set the browser-visible WebSocket address before building:

```bash
NEXT_PUBLIC_SERVER_PATH=your-host.example:8443 docker compose build frontend
docker compose up -d
```

Route HTTPS traffic to the frontend and provide a WebSocket reverse proxy to the signaling service. For HTTPS, the frontend uses `wss://your-host.example:8443`. Never set the browser address to the internal Compose hostname `server`.

The root `.dockerignore` excludes local dependency directories, build output, Git metadata, and environment files. Images build with Node 20, pnpm 9.15.0, frozen lockfile installs, and production start commands.

## Local HTTPS with Caddy

Media devices require HTTPS on other devices. Configure the hostname in `Caddyfile` and point the frontend to Caddy's WebSocket listener. Example:

```caddyfile
your-host.local {
  reverse_proxy localhost:3000
}

your-host.local:8443 {
  reverse_proxy localhost:8080
}
```

Run Caddy with that file and set `NEXT_PUBLIC_SERVER_PATH=your-host.local:8443` in `frontend/.env.local` before `pnpm dev:frontend`. Confirm the hostname resolves on each device and that the firewall allows the selected ports.

## Checks and builds

```bash
pnpm typecheck
pnpm lint
pnpm test
pnpm build:server
pnpm build:frontend
```

`pnpm test` currently covers signaling authorization, admission capacity, and disconnect cleanup. Browser testing is still needed for camera/microphone permissions, mobile layout, peer-to-peer connectivity, and file-transfer interruption/retry cases.

## Environment variables

| Variable | Used by | Meaning |
| --- | --- | --- |
| `PORT` | Server | HTTP and WebSocket listen port; defaults to `8080`. |
| `REDIS_URL` | Server | Optional Redis URL for room metadata; connection failure stops startup. Unset uses in-memory metadata. |
| `ROOM_TTL_SECONDS` | Server | Redis room metadata expiry; defaults to one hour and is refreshed while a room has live sessions. |
| `NEXT_PUBLIC_SERVER_PATH` | Frontend | Browser-visible signaling hostname and port, without `ws://` or `wss://`; compiled into the frontend at build time. |
| `TURN_CREDENTIALS_URL` | Frontend server | Optional private credential endpoint returning `{ "iceServers": [...] }` with short-lived TURN credentials. |
| `TURN_CREDENTIALS_TOKEN` | Frontend server | Optional bearer token sent only from the Next.js server to the credential endpoint; do not use a `NEXT_PUBLIC_` name. |

## Operating limits

- Rooms allow at most six active plus pending participants, including the host.
- Media uses a full mesh of peer connections. Per-participant connection count grows with room size, so the limit should not be increased without measurement.
- ICE configuration defaults to public STUN servers. Some NATs/firewalls require TURN; configure the server-only credential endpoint with short-lived credentials for those networks. The app exposes no provider or TURN service of its own.
- Room membership, chat messages, and file catalogs are temporary client/server memory. Redis does not retain them across server restarts.
- WebRTC encrypts transport between peers, but the app does not provide identity verification or a separate end-to-end security layer.
- The signaling service is designed for one instance. Redis does not provide shared socket routing or multi-instance coordination.
- Use HTTPS in deployed environments and configure a browser-reachable `wss://` signaling endpoint.
