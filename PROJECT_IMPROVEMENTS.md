# Pockets: Project Assessment and Agent Instructions

This document is an implementation backlog for agents working on Pockets. Read the relevant code and preserve the product goal: lightweight, host-approved, peer-to-peer collaboration for small rooms. Work in small, reviewable changes, update this file when an item is completed, and do not treat an item as implemented until its acceptance criteria are met.

## 1. Project summary

Pockets is a browser-based WebRTC collaboration prototype. A user creates or joins a room, the host approves guests, and a Node WebSocket service coordinates room membership and WebRTC signaling. Audio/video, chat, and file data are intended to flow directly between browsers. The server stores room/user metadata in memory or Redis; Redis does not store media, chat history, or transferred file contents.

The repository is a pnpm monorepo with a Next.js 15 / React 19 frontend (`frontend/`), a `ws`-based TypeScript signaling service (`server/`), and a shared protocol package (`shared/`). The UI includes room creation/joining, media controls, a participant grid, chat, join approval, and pull-requested file transfers. The stated room limit is six participants. The README describes Redis as optional and documents local Caddy/HTTPS usage.

### Current product boundary

- Rooms are ephemeral collaboration sessions, not accounts or durable workspaces.
- Media and data channels are peer-to-peer when a network path can be established; the signaling server relays negotiation messages.
- The client config shown in `frontend/lib/hooks/socketHook.ts` has public STUN servers but no TURN service configuration. Some networks will therefore fail to connect.
- Current mesh topology implies each participant manages a peer connection to each other participant; this grows quadratically with room size.
- “Encrypted” should be described precisely: WebRTC connections use transport encryption, but this project does not appear to implement application-level end-to-end identity verification or durable data protection.

## 2. Assessment: highest-risk findings

These are findings from source/configuration inspection, not claims that a live deployment has been exercised.

1. **Signaling authorization is not tied to the sending socket.** `server/src/services/socket.service.ts` routes offers, answers, and ICE by client-provided `toUserId` (roughly lines 514–552); join decisions and leave operations also trust IDs in the payload. The service does not consistently verify the sender socket is the authenticated room participant or host. A client can attempt to spoof another participant or target sockets outside its room.
2. **Disconnect cleanup is missing.** `server/index.ts` only logs on WebSocket close (lines 28–30). Room cleanup is driven by an explicit `leave-room` message. A crashed tab/network loss can leave stale users, occupy room capacity, or leave a room without a working host. The README claims host disconnect cleanup, but this path is not present in the connection close handler.
3. **Production container configuration is not coherent yet.** Root `docker-compose.yml` builds `./server`, but the repository has no `server/Dockerfile`. `frontend/Dockerfile` uses the frontend directory as build context while trying `COPY ../shared`, which Docker does not permit outside the context; it also invokes `npm install` despite the pnpm workspace and runs `next dev`. The root Compose frontend URL uses `NEXT_PUBLIC_SERVER_PATH=server`; the client expects a browser-reachable host/path and prepends `ws://` or `wss://` in the socket hook. These settings need an end-to-end deployment design.
4. **Persistence and multi-instance behavior are overstated.** Redis persists room/user records, but live WebSocket objects are held in a process-local map (`UserSocketRepo`). Persisted records cannot restore live sessions after restart, and multiple server replicas cannot route messages to sockets connected to another replica. Persistence writes room JSON by read-modify-write, so concurrent admission decisions can race. Either implement a supported distributed model or document Redis strictly as metadata storage with ephemeral live sessions.
5. **No automated test suite or CI workflow is present in the tracked project files.** Root scripts provide build/typecheck commands, but no test script. The most consequential behavior—authorization, concurrent admission, disconnect cleanup, WebRTC negotiation, and chunked file transfer—needs repeatable coverage.
6. **Network reachability and hosting limits are not surfaced to users.** STUN-only ICE configuration can fail behind restrictive NAT/firewalls. There is no evident TURN configuration or connection diagnostics flow. Small-room P2P is a valid prototype choice, but deployment requirements and failure modes need explicit treatment.
7. **Runtime input and resource limits need hardening.** The server parses arbitrary JSON and casts it to `WebSocketMessage` (`server/index.ts` lines 17–22) without runtime schema checks, payload-size limits, or visible rate limits. Large signaling payloads and malformed messages can consume resources. File transfer has a client queue count but needs consistent size/aggregate limits and receiver-side validation.

## 3. How agents should work

- Before editing, inspect the relevant implementation and confirm the finding still applies. This assessment may become stale as work lands.
- Make one focused change per task or pull request. Avoid broad rewrites of WebRTC, state management, or deployment in one change.
- Preserve protocol compatibility deliberately. If `shared/src/types.ts` changes, update both client and server and document any migration/version behavior.
- Add or update automated tests for behavior changes. Do not claim a security fix based only on UI restrictions; enforce authorization on the server.
- For UI work, include loading, empty, error, permission-denied, disconnected, and narrow-screen states where applicable. Keep controls keyboard accessible and respect reduced-motion preferences.
- For performance work, capture a baseline and compare the same scenario after the change. Avoid optimization without an observed bottleneck.
- Do not commit secrets, credentials, real room/user data, or generated build output. Keep `.env*` files out of version control; use `.env.example` with safe placeholders.
- Update README and `LOCAL_DEVELOPMENT.md` when commands, environment variables, hosting, or supported behavior changes.

## 4. Prioritized improvement backlog

### P0 — Make room signaling safe and lifecycle-correct

**A. Bind identity and membership to each WebSocket session**

- On successful join, bind the socket to a server-owned session record containing user ID, room ID, role, and connection generation. Reject duplicate/invalid joins and prevent one socket from claiming multiple identities.
- Validate every incoming message at runtime (recommended: a schema library or explicit validators) and derive the sender identity from the bound session instead of trusting `userId` / `fromUserId` fields.
- For every message, verify room membership and target membership. Only the current room host may accept/reject pending guests; only the pending guest in that room may receive a decision. Prevent signaling across rooms.
- Verify the socket instance matches the registered session before mutating state. Close or reject malformed, oversized, unknown, and unauthorized messages with bounded error behavior.
- Acceptance: tests prove a guest cannot impersonate the host, remove another user, accept/reject a request, forge another sender, or signal a user outside the room. Valid host/guest flows continue to work.

**B. Centralize disconnect, leave, and room teardown**

- Make explicit leave, socket close/error, host shutdown, pending guest cancellation, and server shutdown use one idempotent lifecycle path.
- Remove stale socket mappings, active membership, pending membership, and user records; broadcast the appropriate `user-left` or `host-closed-room` event; delete empty rooms.
- Add heartbeat/ping-pong detection and a bounded timeout for dead connections. Ensure stale connections cannot clear a newer reconnecting session (use a connection generation or socket equality check).
- Define what happens to pending requests on host reconnect and how long abandoned rooms live.
- Acceptance: automated tests cover abrupt guest disconnect, abrupt host disconnect, repeated leave, pending guest disconnect, reconnect, and capacity becoming available again.

**C. Make room admission atomic**

- Enforce user + pending-request limits in one atomic operation. Avoid separate read/count/write sequences that allow concurrent requests to exceed `MAX_USERS_PER_ROOM`.
- Ensure approval is idempotent and can only transition an existing pending guest exactly once.
- Implement equivalent guarantees for in-memory and Redis adapters; for Redis use a transaction/Lua script or another atomic primitive.
- Acceptance: concurrent request/approval tests never exceed capacity or create duplicate membership.

### P1 — Make installation and deployment reproducible

**D. Replace the current container setup with a working production path**

- Choose and document one supported deployment shape: workspace-root Docker build contexts with pnpm, or separately packaged frontend/server images with shared artifacts handled explicitly.
- Build optimized production artifacts; run Next with `next start` or standalone output, and run the compiled server bundle. Do not use the development server in production images.
- Add the missing server Dockerfile, use lockfile-frozen installs, use multi-stage builds, run as a non-root user, and keep final images minimal.
- Correct Compose environment variables and networking. Browser clients must receive a public WebSocket origin (`wss://...` in HTTPS deployments); an internal Compose service hostname is not browser reachable. Add health checks and readiness-aware dependencies. Decide whether Redis is included and clearly configure persistence.
- Validate the complete path with a clean Compose build and a real browser joining a room through the configured reverse proxy.
- Acceptance: documented commands build/start the stack from a clean checkout, health checks pass, and a host plus guest can connect through the documented URL.

**E. Clarify persistence and scale model**

- Treat room membership as ephemeral unless resumable sessions are deliberately designed. Redis room records must not imply active socket recovery.
- For a single-instance deployment, add stale-room TTL/cleanup and ensure TTL index entries are also removed. For multiple replicas, add shared signaling routing (for example Redis Pub/Sub) plus atomic state coordination, or explicitly pin the service to one instance and document that limit.
- Implement Redis reconnect/error policy and a deliberate startup failure/fallback mode. Do not silently downgrade production to in-memory if Redis is required.
- Acceptance: restart behavior, replica support, and data durability are documented and exercised against the chosen support level.

**F. Add continuous integration and quality gates**

- Add CI for frozen dependency install, shared/server/frontend type checks, lint, build, and unit/integration tests.
- Add root scripts that consistently expose checks for each workspace. Ensure the configured lint command is supported by the installed Next/ESLint versions.
- Add dependency/security update automation and a secret scan suitable for this repository.
- Acceptance: CI runs on pull requests and fails on type, lint, test, or build regressions.

### P1 — Improve connection reliability and user-visible states

**G. Add configurable TURN and connection diagnostics**

- Make ICE server configuration environment-driven and support authenticated TURN credentials without embedding secrets in source. Prefer short-lived credentials from a trusted service for public hosting.
- Track signaling, ICE, and peer connection state per participant; add timeout/retry behavior, ICE restart, reconnect handling, and actionable error messages.
- Distinguish “waiting for approval,” “approved/connecting,” “connected,” and “connection failed” in the room UI. Provide a simple diagnostic/help path that does not expose sensitive SDP or credentials.
- Acceptance: validate direct and relayed connectivity on representative restrictive networks and document TURN cost/configuration.

**H. Make media lifecycle robust**

- Handle permission denial, missing devices, device removal, autoplay restrictions, and track `ended` state with clear UI feedback.
- Audit effect dependencies and cleanup in `socketHook`, `mediaHook`, and room page. Ensure reconnects do not duplicate peer connections/listeners and React Strict Mode can be enabled safely.
- Add accessible device selectors and explicit camera/microphone permission state. Respect browser-level mute and distinguish local device state from outbound track state.
- Acceptance: manual/browser coverage on desktop and mobile validates grant/deny, unplug/replug, switching devices, reload/leave, and remote participant departure.

### P1 — Make file transfer safe, resumable, and understandable

**I. Harden the data-channel protocol**

- Validate each JSON envelope and binary chunk; bind transfer metadata to the remote peer and active session. Reject unknown file IDs, inconsistent lengths, impossible counts, oversized metadata, and unexpected chunks.
- Enforce single-file and aggregate transfer limits consistently in UI and transfer layer. The constants in `frontend/lib/constants.ts` should be connected to actual selection and send validation or removed if obsolete.
- Add transfer cancellation, timeout handling, retry/re-request behavior, receiver acknowledgements, and explicit completion/integrity checks (for example expected byte count plus digest).
- Review backpressure handling for browser buffer variability, and cap simultaneous channels/transfers based on measured device/network performance.
- Release object URLs and in-memory file catalog entries on removal, room teardown, and completion according to a documented retention rule.
- Acceptance: tests cover empty/large files, interrupted channels, cancellation, duplicate/malformed chunks, file ID mismatch, retries, and cleanup.

**J. Improve chat and participant state semantics**

- Document that chat, room membership, and file catalogs are local/session-only. If persistence is desired, design it as an explicit product feature with consent and retention rules.
- Validate and cap message lengths and attachment counts; handle duplicate and out-of-order messages; provide delivery state and clear reconnect behavior.
- Keep participant status (joined, reconnecting, disconnected) consistent with server events and remove stale Zustand state when leaving.
- Acceptance: a reload or abrupt connection loss leaves no misleading “connected” participant or unusable download entry.

### P2 — Improve the interface and accessibility

**K. Refine landing and room flows**

- Explain what Pockets does in concrete terms (small live rooms, host approval, peer-to-peer media/files) and avoid broad claims such as “secure” or “encrypted” without specific scope.
- Make room creation/joining status reflect actual server progress; current landing flow navigates after local identity initialization, before room creation is confirmed. Provide retry and recoverable errors.
- Replace blocking `alert` / `confirm` room navigation flows with accessible in-app dialogs and notices. Ensure invalid room IDs and missing session state are handled before initiating socket/media work.
- Improve room toolbar discoverability, participant identity/status, waiting/empty states, and mobile layout for chat and join approval.
- Acceptance: keyboard-only and screen-reader checks cover room creation, joining, approval, media controls, chat, and leaving; narrow viewports have no clipped controls.

**L. Establish design and accessibility foundations**

- Audit semantic headings/labels, focus order, focus visibility, contrast, ARIA naming, icon-only buttons, dialog focus trapping, and live announcements for connection/request status.
- Honor `prefers-reduced-motion`; reduce or disable decorative background/interaction animation for reduced-motion users and low-power/mobile settings.
- Set explicit touch target sizes and test responsive breakpoints, orientation changes, and browser zoom.
- Add reusable UI primitives and tokens only where they reduce duplication and improve consistency; do not redesign the entire app without a user-tested reason.
- Acceptance: automated accessibility scan has no serious/critical findings on core flows, supplemented by manual keyboard checks.

### P2 — Reduce resource use and improve observability

**M. Measure and optimize frontend runtime**

- Profile production bundle size, route hydration, room rendering, animation cost, and memory during a multi-peer session. The landing page has Framer Motion background/interaction effects; compare mobile and reduced-motion performance before changing them.
- Use selectors/memoization only where profiling shows unnecessary Zustand-driven renders. Avoid putting full media/file objects into broad subscriptions.
- Check cleanup of Web Audio nodes, event listeners, timers, peer connections, data channels, and object URLs across repeated room entry/exit.
- Acceptance: record before/after bundle and representative room CPU/memory results; no regressions in the core flow.

**N. Add structured operational telemetry**

- Replace noisy payload logging with structured, leveled logs and correlation IDs. Never log full SDP, ICE candidates, file contents, credentials, or unnecessary personal data.
- Add health and readiness endpoints, WebSocket connection counts, room counts, message/error rates, Redis status, and graceful shutdown metrics.
- Define retention and privacy rules before adding analytics. Prefer opt-in/aggregated metrics for user-facing product telemetry.
- Acceptance: operators can diagnose startup, Redis, WebSocket, and room lifecycle failures without sensitive payload logging.

**O. Document support and operating limits**

- Document supported browsers, HTTPS requirement for media APIs, TURN requirement/optional mode, room limit rationale, file size limits, topology limits, persistence semantics, and known mobile constraints.
- Correct environment variable names and examples across README, local guide, Docker, and `.env.example`; eliminate contradictory `SERVER_PORT`/`PORT` and WebSocket URL examples.
- Add a deployment checklist covering TLS, reverse proxy WebSocket upgrade, origins, secrets, Redis, backups if applicable, monitoring, and rollback.
- Acceptance: a new contributor can follow one current setup path and an operator can deploy from the guide without guessing variable semantics.

## 5. Suggested execution order

1. P0.A server-side identity, authorization, runtime validation, and message limits.
2. P0.B disconnect/leave cleanup and P0.C atomic room capacity.
3. P1.D clean production Docker/Compose path and P1.E explicit persistence/replica contract.
4. P1.F CI plus core server/protocol tests, then file transfer and lifecycle test coverage.
5. P1.G TURN/reconnection experience and P1.H media lifecycle.
6. P1.I transfer protocol hardening and P1.J chat/participant semantics.
7. P2.K/L interface, accessibility, and reduced motion.
8. P2.M/N performance measurement and observability, then P2.O docs/support limits.

Security and lifecycle work should precede public deployment. Do not increase room size before addressing mesh cost and measuring browser/network behavior.

## 6. Definition of done for agent tasks

- The task scope and impacted packages are named before implementation.
- The change includes regression coverage for changed behavior, or documents why a manual verification is the only feasible option.
- Type checks, lint, focused tests, and relevant production build pass; report commands and results. Do not suppress failures by weakening checks.
- User-visible behavior has accessible loading, success, failure, and recovery states where applicable.
- Protocol, configuration, and docs stay aligned across frontend/server/shared/deployment files.
- The final report includes changed files, risks or unresolved questions, and concise verification evidence.

## 7. Source map for follow-up agents

- Product overview and intended behavior: `README.md`
- Local and reverse-proxy setup: `LOCAL_DEVELOPMENT.md`, `Caddyfile`
- Room and signaling bootstrap: `server/index.ts`, `server/src/services/socket.service.ts`
- Room rules and persistence: `server/src/services/room.service.ts`, `server/src/repo/persistence/`
- Socket-to-user routing: `server/src/repo/user-socket.repo.ts`
- Shared wire protocol: `shared/src/types.ts`, `shared/src/constants.ts`
- WebRTC and socket lifecycle: `frontend/lib/hooks/socketHook.ts`, `frontend/lib/hooks/mediaHook.ts`
- File data channels: `frontend/lib/hooks/fileHook.ts`, `frontend/lib/utils/fileManagement/fileTransferSession.ts`, `frontend/lib/stores/fileStore.ts`
- Landing and room UI: `frontend/app/home.tsx`, `frontend/app/room/[room]/page.tsx`, `frontend/components/custom/`
- Current deployment configuration: `docker-compose.yml`, `frontend/Dockerfile`, `server/docker-compose.yml`, `vercel.json`

