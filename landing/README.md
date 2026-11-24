# Pockets Landing Page

A dedicated, high-craft product landing page and marketing surface for **Pockets**, built according to the **Pocket Studio + Drop Circle** visual design system.

---

## Overview

The landing page is an independent Next.js application that lives in the `/landing` directory, completely separate from the core collaboration client (`/frontend`) and signaling backend (`/server`).

### Key Highlights
- **Architecture:** Next.js 15, React 19, Tailwind CSS v4, Framer Motion, Lucide icons, Sonner toasts.
- **Design Archetype:** Modern Warm Studio + Drop Circle.
- **60-30-10 Palette:** Warm Stone `#FFF8EC` canvas, Deep Navy `#001F52` structure, Berry Magenta `#A10054` primary CTA, and Warm Sunset Coral `#FF8D68` accents.
- **Interactive Pocket Studio Simulation:** Live interactive workspace preview featuring toggleable camera/mic states, real-time audio wave indicators, copyable room invite with toast confirmations, and a simulated 30 KiB chunk WebRTC file download with live byte progress telemetry.
- **Asymmetric Feature Bento:** Four pillars detailing zero accounts, host doorbell admission, chunked peer-to-peer file transfers, and 6-peer mesh topology.
- **Technical FAQ:** Plain-language explanations of WebRTC transport encryption (DTLS/SRTP), mesh scalability, RAM-to-RAM transfers, and STUN/TURN fallback.

---

## Getting Started

### Local Development

From the repository root:

```bash
pnpm dev:landing
```

Or from within the `landing/` directory:

```bash
cd landing
pnpm dev
```

The landing page runs on `http://localhost:3001` by default (allowing the collaboration frontend to run simultaneously on `http://localhost:3000`).

---

## Environment Variables

Configure via `landing/.env.local` or environment settings:

| Variable | Default | Purpose |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | The origin of the Pockets collaboration web app where users are directed when creating or joining a room. |
| `NEXT_PUBLIC_SITE_URL` | `http://localhost:3001` | Canonical public URL for OpenGraph metadata and search engine indexing. |

---

## Room Launch Integration

When a user triggers room creation or requests to join on the landing page:
1. **Create Room:** Generates a secure UUIDv4 and redirects the user to `${NEXT_PUBLIC_APP_URL}/room/${id}?host=true&name=${name}`.
2. **Join Room:** Validates the UUID format and redirects the user to `${NEXT_PUBLIC_APP_URL}/room/${id}?name=${name}`.

The frontend room client automatically checks for these URL parameters upon entry and initializes the user session without requiring an extra lobby step.

---

## Build & Quality Checks

Run from `landing/` or workspace root:

```bash
# Typecheck
pnpm --filter pockets-landing typecheck

# Lint
pnpm --filter pockets-landing lint

# Production build
pnpm --filter pockets-landing build
```
