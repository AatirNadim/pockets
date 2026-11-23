# Shared protocol package

`@pockets/shared` contains TypeScript protocol types and constants imported by the browser and signaling service. It keeps WebSocket message envelopes, participant roles, room records, and common capacity limits aligned across both sides of the connection.

Start with the [root README](../README.md) and [architecture and feature flows](../docs/README.md). For the server that validates and routes signaling messages, see [the server README](../server/README.md); for how the browser consumes the contract, see [the frontend README](../frontend/README.md).

## Exports

The package entry point re-exports `src/constants.ts` and `src/types.ts`.

- **Signaling:** join/leave, join approval, roster, participant lifecycle, audio state, SDP offer/answer, ICE candidate, errors, and room-full messages.
- **Peer data channels:** chat envelopes, file request/response envelopes, file metadata, transfer setup, and incoming transfer state shapes.
- **Shared domain types:** participant, room, role (`UserType`), attachment, chat message, and transfer status.
- **Common rule:** `MAX_USERS_PER_ROOM` is six, including the host and pending guests in admission accounting.

The server performs runtime validation for incoming signaling messages; TypeScript definitions alone do not validate network input. Chat and file data channel envelopes are exchanged peer-to-peer and are not routed by this package or the signaling server.

## Change workflow

When changing a wire message, update the shared type and its producer/consumer in both `frontend/` and `server/`. Keep the serialization shape compatible across deployed client/server versions or document the coordination requirement. For a new admission or capacity rule, update `MAX_USERS_PER_ROOM` and check the server persistence/admission paths that consume it. Update the diagrams in [architecture and feature flows](../docs/README.md) when observable behavior changes.

## Build

The root build commands build `shared` before its consumers. From the repository root:

```bash
pnpm build:shared
pnpm --filter @pockets/shared typecheck
```
