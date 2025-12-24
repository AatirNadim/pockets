# Local Development Guide

This guide covers setting up and running the Pockets application locally.

## Project Structure

This is a **pnpm monorepo** with three packages:

```
pockets/
├── frontend/          # Next.js 15 web application
├── server/            # WebSocket signaling server
├── shared/            # Shared types and constants
├── Caddyfile          # Local HTTPS reverse proxy config
├── pnpm-workspace.yaml
└── package.json       # Root workspace scripts
```

## Prerequisites

- **Node.js** v20+
- **pnpm** (install via `corepack enable pnpm`)
- **Docker** (for Redis persistence)
- **Caddy** (optional, for HTTPS with mDNS hostname)

## Quick Start

### 1. Install Dependencies

From the project root:

```bash
pnpm install
```

This installs dependencies for all packages (frontend, server, shared).

### 2. Set Up Environment Files

#### Server (`server/.env.local`)

```bash
SERVER_PORT=8080
REDIS_URL=redis://localhost:6379
ROOM_TTL_SECONDS=3600
```

#### Frontend (`frontend/.env.local`)

```bash
NEXT_PUBLIC_SERVER_PATH=localhost:8080
```

> **Note:** If using Caddy with mDNS (see below), update this to your mDNS hostname.

### 3. Start Redis (Optional)

The server supports Redis for room persistence across restarts. Without Redis, it falls back to in-memory storage.

```bash
cd server
docker compose up -d
```

This starts Redis on port 6379 with data persistence via a Docker volume.

### 4. Start Development Servers

From the project root, run both frontend and server:

```bash
# Terminal 1 - Start the server (with hot reload)
pnpm dev:server

# Terminal 2 - Start the frontend
pnpm dev:frontend
```

Or run them individually:

```bash
# Server only
cd server && pnpm dev

# Frontend only
cd frontend && pnpm dev
```

The frontend runs on `http://localhost:3000` and the server on `http://localhost:8080`.

---

## Caddy Reverse Proxy (Optional)

For HTTPS access and testing with mDNS hostnames (useful for WebRTC and mobile testing on the same network):

### Caddyfile Configuration

The included `Caddyfile` is configured for an mDNS hostname. You'll need to update it for your machine:

```caddyfile
{
    auto_https disable_redirects
}

# Replace 'yourhostname.local' with your machine's mDNS name
yourhostname.local {
    reverse_proxy localhost:3000
}

yourhostname.local:8443 {
    reverse_proxy localhost:8080
}
```

> **Finding your mDNS hostname:** On macOS/Linux, run `hostname` or check System Preferences. It's typically `yourmachinename.local`.

### Running Caddy

```bash
caddy run --config Caddyfile
```

Then update `frontend/.env.local`:

```bash
NEXT_PUBLIC_SERVER_PATH=yourhostname.local:8443
```

---

## Build Commands

### Development

```bash
pnpm dev:frontend    # Start Next.js dev server with Turbopack
pnpm dev:server      # Start server with tsx watch (hot reload)
```

### Production Build

The server and shared packages use **esbuild** for production builds:

```bash
# Build all packages
pnpm build

# Or build individually
cd shared && pnpm build    # Builds to shared/dist/
cd server && pnpm build    # Builds to server/dist/
cd frontend && pnpm build  # Next.js production build
```

### Running Production Server

```bash
cd server
node dist/index.js
```

> **Note:** In production, environment variables should be set directly (not via .env.local files).

---

## Environment Variables Reference

### Server

| Variable | Description | Default |
|----------|-------------|---------|
| `SERVER_PORT` | Port for the WebSocket server | `8080` |
| `REDIS_URL` | Redis connection URL for persistence | (optional, falls back to in-memory) |
| `ROOM_TTL_SECONDS` | Time-to-live for rooms in seconds | `3600` |
| `NODE_ENV` | Environment mode | `development` |

### Frontend

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXT_PUBLIC_SERVER_PATH` | Server hostname:port for WebSocket connection | `localhost:8080` |

---

## Docker Services

### Redis (`server/docker-compose.yml`)

```yaml
services:
  redis:
    image: redis:8.4.0-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
```

**Commands:**

```bash
cd server
docker compose up -d      # Start Redis in background
docker compose down       # Stop Redis
docker compose logs -f    # View Redis logs
```

---

## Troubleshooting

### "Cannot find module" errors in server build

The server uses esbuild to bundle all imports. If you see module resolution errors:

1. Ensure you've built the shared package first: `cd shared && pnpm build`
2. Rebuild the server: `cd server && pnpm build`

### WebSocket connection fails

1. Verify the server is running on the expected port
2. Check `NEXT_PUBLIC_SERVER_PATH` matches your server address
3. If using Caddy, ensure it's running and the hostname resolves

### Redis connection errors

The server gracefully falls back to in-memory storage if Redis is unavailable. To use Redis:

1. Start Redis: `cd server && docker compose up -d`
2. Verify it's running: `docker ps`
3. Check the `REDIS_URL` in your `.env.local`

---

## Architecture Notes

- **Signaling Server:** The server handles WebRTC signaling via WebSocket connections. It doesn't process media—peers connect directly for video/audio.
- **Persistence:** Room state can be persisted to Redis, allowing rooms to survive server restarts. Without Redis, rooms are stored in memory.
- **Shared Package:** Contains TypeScript types and constants shared between frontend and server.
