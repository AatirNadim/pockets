# Pockets UI Revamp — Agent Instructions

## Mission

Revamp Pockets’ web interface around one clear product idea: **a small, temporary collaboration room that feels like a pocket-sized studio**. People can start or join a room with only a display name, talk face to face, and exchange files with people in the room. The interface should make those three facts obvious: it is easy to enter, people are the focus, and shared files belong to this room.

Use the recommended direction: **Pocket Studio + Drop Circle**. Build a calm video-call workspace with a strong video stage, a compact people/room header, and an integrated chat/files panel. Make file exchange feel direct and intentional: clearly show who shared an item, who can receive it, whether it is available, and its transfer progress.

This is a frontend design and implementation brief. Keep the existing signaling, WebRTC, chat, join-approval, file-transfer, and Zustand behavior intact unless a small interface adaptation requires a prop or presentation-state change. Do not turn this UI task into a backend or product-scope rewrite.

## Product context

- Pockets is a Next.js 15 / React 19 client in a pnpm monorepo. Styling uses Tailwind CSS v4; UI primitives are in `frontend/components/ui/`; icons use `lucide-react`; motion uses Framer Motion; client state uses Zustand.
- A user creates a room or joins with a room ID. Guests wait for host approval. A room supports up to six people.
- The room offers camera/microphone controls, remote video, a local preview, chat, and pull-based file downloads. File transfers use WebRTC data channels.
- No account is required. The current entry flow asks for an optional display name and directs the user to create or join a room.
- Current major UI entry points: `frontend/app/home.tsx` (landing/create/join), `frontend/app/room/[room]/page.tsx` (room composition), `frontend/app/room/[room]/header.tsx`, `frontend/app/room/[room]/remoteVideoGrid.tsx`, `frontend/components/custom/mediaControl.tsx`, `frontend/components/custom/localVideoTile.tsx`, `frontend/components/custom/chat/chatSidebar.tsx`, chat components under `frontend/components/custom/chat/`, and `frontend/components/custom/joinRequestList.tsx`.
- Current shared styling is in `frontend/app/globals.css`, with warm stone/amber values and existing light/dark themes. Reuse and refine those foundations rather than layering a second unrelated design system over them.

## Design references and interpretation

Use these products as interaction references, not as templates to copy:

- [Whereby Meetings](https://whereby.com/information/meetings): browser-first calls and guest access without requiring guests to log in. Apply the low-friction entry principle to Pockets’ create/join flow and pre-join states.
- [Jitsi Meet](https://jitsi.org/jitsi-meet/): quick room creation without an account. Apply the direct room-entry concept while retaining Pockets’ host approval and room identity.
- [Snapdrop](https://snapdrop.net/): peer-to-peer device/file exchange with direct recipient intent. Apply the explicit “who is this for?” and visible transfer-state principles to shared files.

Do not claim Pockets is identical to these products or borrow their logos, copy, or distinctive visual assets. Pockets’ own name and temporary-room model should drive the visual language.

## Visual direction

### Mood

Warm, quiet, human, and focused. A temporary studio or shared table is a better metaphor than a generic enterprise meeting dashboard. Use pocket-like containment through panels, trays, and compact cards—not literal pocket illustrations, skeuomorphic leather, or excessive gradients.

### Visual hierarchy

1. **The people and conversation** are the visual center of the room.
2. **Room status and invitation** are immediately findable but do not compete with video.
3. **Media controls** are consistently visible and easy to operate.
4. **Chat and files** live together in an accessible side surface on desktop and an intentional drawer/sheet on mobile.
5. Join requests, connection problems, and transfer progress appear as clear, actionable states.

### Palette and surfaces

- Retain warm stone/cream surfaces, charcoal text, and amber/orange as the main brand accent.
- Reserve rose/red for destructive actions, errors, and disabled media states. Use green/teal sparingly for connected/completed states.
- Reduce simultaneous use of blur, glow, gradients, shadows, and translucent glass. Use mostly solid, legible surfaces; apply translucency only where it meaningfully separates overlays from video.
- Ensure light and dark modes are both deliberate, readable, and consistent with existing theme support.

### Type, spacing, and shape

- Use a clear type scale: compact labels, readable control text, and one decisive page/room heading. Avoid making every label uppercase or tiny.
- Prefer consistent spacing increments and restrained corner radii. Give video and file content enough room; do not make every region a nested rounded card.
- Keep controls and interactive targets comfortable on touch screens (aim for at least 44 × 44 CSS pixels for primary touch actions).

### Motion

- Keep motion short and functional: drawer transitions, subtle state changes, and lightweight entry feedback.
- Respect `prefers-reduced-motion`; decorative animation must not be required to understand room or transfer status.
- Avoid parallax, magnetic controls, or continuous background motion inside the call workspace.

## Screen and interaction requirements

### 1. Landing: create or join without an account

Retain a concise no-account entry path. Make the primary choices unmistakable:

- **Create a room** — primary action.
- **Join a room** — invite ID input and join action.
- Optional display name, with a clear explanation that it is what other participants see.
- Brief supporting copy describing video, host approval, and direct file sharing without overstating security or implying an account is needed.
- Provide visible validation and progress states. Do not navigate as if room creation/joining succeeded when the current status is still pending; use existing connection state where available and avoid inventing server guarantees.
- Keyboard users must be able to switch create/join choices and submit the form. Inputs require programmatic labels, visible focus, and helpful error text.
- Keep the page responsive, fast, and calm. On small screens, use the static background or a reduced-motion equivalent; avoid decorative effects that harm form readability.

### 2. Room shell: Pocket Studio

Create a consistent room frame with:

- **Room header:** Pockets mark/name, human-readable connection status, participant count, and a clear invite/copy action. Do not expose a long raw room ID as the dominant persistent element; allow copying it or the invite link and give a visible copied confirmation.
- **Video stage:** responsive participant tiles with names and relevant microphone/camera state. Give a single remote speaker or the active room a strong focal area while keeping other participants visible. Preserve local preview as a movable or docked self-view only if existing behavior supports it.
- **Media dock:** microphone, camera, device selectors, speaker, chat/files toggle, and leave. Visually separate destructive leave from routine controls and confirm only when appropriate. Keep controls stable between states and label icon-only buttons for assistive technology.
- **Room side panel:** a unified surface with clear `Chat` and `Files` navigation, or a carefully integrated chat stream with a dedicated files section. Choose the simplest structure that works with existing chat/file components; do not duplicate chat/file state.
- **Host requests:** render pending guest requests as an in-room, dismissible but discoverable panel or focused dialog. Show the guest’s name and clear `Admit` / `Decline` actions. Keep it out of the video controls’ hit area.
- **Empty/waiting state:** explain whether the guest is waiting for host admission or the host is waiting for participants. Include the invitation action in the host state.

### 3. Files: Drop Circle behavior

Make existing chat attachments and transfer actions legible as a cohesive feature:

- Each file row/card shows filename, readable size, sender, and a clear action: `Request`, `Download`, `Open`, or an existing equivalent based on current received/local status.
- Show distinct pending, requested, in-progress, complete, unavailable, and failed states when the existing state model supports them. Do not fabricate success states or silently change the underlying protocol.
- Show transfer progress with text or a progress indicator plus a useful accessible name/value. Keep progress available if the chat panel is closed where current upload/download UI already supports it.
- Make file selection, queued files, remove-from-queue, and send actions understandable. Respect existing queue/size rules and keep empty and over-limit feedback clear.
- Preserve explicit pull-based behavior: a file should not look as if it has been automatically shared or downloaded when the recipient must request it.
- On mobile, present the files surface as a sheet/drawer that does not obscure the active call controls or trap the user in an unclosable overlay.

### 4. Responsive behavior

- **Wide desktop:** video stage plus a stable side panel; media controls anchored in a predictable position; header remains compact.
- **Tablet/narrow laptop:** prioritize video width; allow the side panel to collapse and reopen without losing scroll or draft state.
- **Mobile portrait:** use a stacked stage and compact participant strip/grid; controls remain reachable above safe-area insets; chat/files open as a sheet with an obvious close/back action. Avoid horizontal page overflow.
- **Mobile landscape:** preserve a usable video stage and controls; avoid fixed-height assumptions that hide content beneath browser chrome.
- Test at approximately 360 px, 768 px, 1024 px, and 1440 px viewport widths, plus both portrait and landscape on a phone-sized viewport.

## Accessibility and content requirements

- Meet WCAG AA contrast for normal text and essential controls in both themes.
- Use semantic landmarks and heading order; all controls work by keyboard and have visible focus.
- Add accessible names to icon-only controls. Use `aria-pressed` for toggles where appropriate.
- Announce important status transitions (connected, waiting for approval, request received, transfer complete/error) through an appropriate live region without announcing every progress tick.
- Dialogs/sheets need focus management, Escape/close behavior, and return focus to the invoking control.
- Do not encode mute/video/connection state by color alone; pair color with icon, label, or text.
- Use plain, honest copy. Avoid unsupported claims such as “fully secure,” “encrypted end-to-end,” or “instant” for network-dependent behavior.

## Implementation plan for agents

Work in the sequence below. An agent may own one phase at a time; coordinate shared components before changing them in parallel.

### Phase A — Inspect and agree on the component map

1. Read the files listed in Product context plus `frontend/components/custom/chat/chatComponent.tsx`, `messagesContainer.tsx`, `attachmentsToSend.tsx`, `frontend/lib/stores/chatStore.ts`, `fileStore.ts`, and `mediaStore.ts`.
2. Record which component owns each interaction and which Zustand state already represents it. Identify redundant UI state before adding any new state.
3. Sketch the target desktop/mobile hierarchy in a short implementation note or PR description. Do not add a separate design artifact unless it helps implementation.
4. Preserve stable behavioral props and callbacks from `useSocket`; presentation components should not become responsible for WebRTC lifecycle.

### Phase B — Establish consistent tokens and primitives

1. Refine existing CSS variables in `frontend/app/globals.css` only where needed for the agreed visual system: surfaces, text, borders, accent, focus, status, and radius.
2. Define a restrained spacing/type/surface pattern and apply it consistently to room header, stage, panel, and dock.
3. Improve/reuse existing Button, Input, and Radix dropdown primitives rather than creating parallel variants for each screen.
4. Validate light/dark contrast and reduced-motion behavior before moving to detailed screen work.

### Phase C — Revamp landing and room shell

1. Refine `frontend/app/home.tsx` into the concise no-account create/join flow. Preserve validation and store actions, but improve labeling, hierarchy, responsive layout, and pending/error feedback.
2. Refactor `frontend/app/room/[room]/page.tsx` layout into header, stage, side panel, media dock, and request surface with explicit responsive behavior.
3. Update `header.tsx`, `remoteVideoGrid.tsx`, `localVideoTile.tsx`, and `mediaControl.tsx` to match the target hierarchy. Do not remove device selection or remote/local status.
4. Replace blocking `alert`/`confirm` UI in the room flow with accessible in-app feedback/dialog patterns where feasible without changing room lifecycle semantics.
5. Keep theme support, share/copy behavior, chat toggle, and leave action available.

### Phase D — Integrate Chat + Files as one room surface

1. Refine `chatSidebar.tsx` and the chat components to present Chat and Files clearly without duplicating their data or event handling.
2. Improve attachment rows, outgoing queue controls, request/download actions, and transfer status using the existing stores and callbacks.
3. Ensure that opening/closing or switching the panel does not reset message draft, scroll position, or transfer state unless current behavior explicitly does so.
4. Ensure join requests and transfer indicators do not cover one another or obscure call controls on small viewports.

### Phase E — Responsive and accessibility review

1. Inspect desktop, tablet, and mobile widths listed above; fix overflow, clipped actions, awkward tile sizing, and touch target issues.
2. Test keyboard navigation, focus visibility, screen-reader labels, live status announcements, dialog/sheet focus, and light/dark modes.
3. Verify reduced-motion mode and ensure controls/status remain understandable with animation disabled.
4. Review empty, waiting, connecting, connected, rejected/full/error, no-device, panel-open, queued-file, and transfer-progress states.

### Phase F — Diff review and handoff

1. Review the complete diff for accidental backend/protocol changes, duplicated state, unused styles, and unrelated refactors.
2. Run relevant project checks that are available (typecheck, lint, and production frontend build); report any existing or new failures clearly.
3. If a browser preview is available, visually inspect the landing page and room at desktop and mobile sizes and fix concrete problems found.
4. In the agent handoff, list changed files, key interaction/design decisions, checks performed, and remaining limitations. Do not claim visual review unless it was actually performed.

## Component ownership boundaries for parallel agents

If the work is split across agents, assign non-overlapping ownership and have one integrator own the room shell:

- **Room shell agent:** `frontend/app/room/[room]/page.tsx`, `header.tsx`, `remoteVideoGrid.tsx`, `localVideoTile.tsx`; owns overall layout and breakpoints.
- **Landing agent:** `frontend/app/home.tsx` plus any narrowly scoped landing-only components; owns create/join visual flow, preserving store/API calls.
- **Chat/files agent:** `frontend/components/custom/chat/**` and transfer presentation only; owns chat/files surface and attachment status display, preserving current transfer callbacks.
- **Design systems/integrator:** `frontend/app/globals.css`, shared UI primitives, conflict resolution, final accessibility/responsive pass. Do not have multiple agents edit shared tokens or room page simultaneously.

When only one agent is assigned, complete phases sequentially and review after each phase.

## Acceptance checklist

- [ ] First-time visitor understands that no account is needed and can create or join a room without guessing.
- [ ] Guest sees a clear host-approval waiting state; host can find and act on requests without covering essential controls.
- [ ] Room presents video as the main surface, with participant identity/status and a predictable media dock.
- [ ] Chat and files are easy to discover; files clearly communicate sender, availability, request/download action, and transfer state.
- [ ] UI preserves existing store/socket behavior and does not imply data or transfer states that the engine has not confirmed.
- [ ] Desktop, tablet, mobile portrait, and mobile landscape layouts are usable without page-level horizontal overflow.
- [ ] Keyboard-only operation, visible focus, accessible control names, screen-reader status changes, and reduced-motion mode are supported.
- [ ] Light and dark themes remain legible and visually intentional.
- [ ] Relevant typecheck/lint/build checks and any visual inspection are reported honestly.

## Explicit non-goals

- Do not change WebRTC mesh topology, signaling authorization, room admission rules, persistence, TURN infrastructure, or file-transfer protocol as part of the visual revamp.
- Do not add accounts, profiles, room history, cloud file storage, recording, or collaboration tools absent from the current product.
- Do not remove host approval or convert pull-based downloads into automatic uploads.
- Do not replace the product with a generic enterprise meeting dashboard or reproduce a reference product’s branding.
- Do not add decorative motion or effects that compete with faces, controls, or transfer status.

