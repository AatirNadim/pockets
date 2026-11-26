# Pockets Landing Page — Master Architectural & Design Instructions

> **Audience**: AI Agents, Frontend Engineers, and Design Reviewers  
> **Project**: Pockets (`frontend/app/home.tsx` & associated landing components)  
> **Status**: Authoritative Reference Specification  

---

## 1. Executive Summary & Product Vision

Pockets is a lightweight, browser-based WebRTC collaboration studio designed for small, ephemeral sessions (up to 6 people). It enables face-to-face video/audio meetings, real-time chat, and direct peer-to-peer file sharing without user accounts or persistent server storage.

The landing page is the user's first touchpoint with this philosophy. It must establish:
1. **Immediate utility**: A user can create a room or paste an invite ID in under 5 seconds.
2. **Calm tactile atmosphere**: The page feels like entering an intimate physical studio, not a sterile enterprise dashboard.
3. **Honest technical reality**: Clear, grounded explanations of how host approval and peer-to-peer WebRTC file transfers work.

---

## 2. Design Foundations & Aesthetics

### 2.1 Theme & Archetype
- **Archetype**: Warm Tactile Studio + Drop Circle (Linear-grade precision meets warm editorial craft).
- **Light Mode Palette**:
  - Background Canvas: Warm Cream Stone (`#FFF8EC`)
  - Elevated Cards / Surfaces: Pure Warm White (`#FFFCF6`)
  - Primary Structural Text: Deep Navy Ink (`#001F52`)
  - Secondary Editorial Text: Slate Ink (`#555D6C`)
  - Hairline Borders: Muted Sandstone (`#E1D3BD`)
  - Primary Action Accent: Deep Berry / Rich Magenta (`#A10054`)
  - Secondary Accent / Badges: Warm Sunset Coral (`#FF8D68`)
- **Dark Mode Palette**:
  - Background Canvas: Deep Obsidian Navy (`#001735`)
  - Elevated Cards / Surfaces: Midnight Navy (`#001F52`)
  - Primary Structural Text: Warm Cream (`#FFF8EC`)
  - Secondary Editorial Text: Muted Sandstone (`#E1D3BD`)
  - Hairline Borders: Deep Slate (`#30445D`)
  - Primary Action Accent: Warm Sunset Coral (`#FF8D68`) with Navy Text (`#001735`)
  - Secondary Accent: Muted Wine (`#44002A`) and Coral Ring (`#FF8D68`)

### 2.2 Typography (Söhne Font Family)
- Local font files in `frontend/public/fonts/` loaded via `next/font/local` as `--font-sohne`:
  - Headings: Tight geometric tracking (`tracking-tight` or `tracking-tighter`), balanced word wrap (`text-wrap: pretty`).
  - Monospace Data: Tabular figures for UUIDs, byte progress counters, and keyboard badges.

---

## 3. Page Structure & Component Architecture

The landing page (`frontend/app/home.tsx`) is structured into four distinct, cohesive sections:

```
┌────────────────────────────────────────────────────────────────────────┐
│ 1. Header (Navbar)                                                     │
│    - Brand mark & typography ("Pockets")                               │
│    - Ephemeral status pill ("No accounts • Host approved")            │
│    - Keyboard shortcuts helper dialog trigger ([?])                   │
│    - Theme toggle (Light / Dark)                                      │
├────────────────────────────────────────────────────────────────────────┤
│ 2. Hero Stage (Split Layout)                                           │
│    Left: Value Proposition & Social Proof                              │
│          - Micro-badge: "A small room for your people"                 │
│          - Editorial Headline: "Meet, talk, and share in a pocket"     │
│          - Descriptive copy & 3 clear value pillars                   │
│          - Quick keyboard hotkey hints ([N] New, [J] Join)            │
│    Right: Tactile Room Entry Console (Card)                            │
│          - Segmented Tab Switcher ("Create a room" / "Join a room")    │
│          - Display Name Input (with random alias refresh button)       │
│          - Room Invite ID Input (when Join tab is active)              │
│          - Primary Action Button (Create Room / Request to Join)       │
│          - Trust & network availability microcopy                      │
├────────────────────────────────────────────────────────────────────────┤
│ 3. Interactive Studio Experience (Showcase Deck)                       │
│    - Live Simulated Studio Preview:                                    │
│      • Header bar with copyable mock room invite                       │
│      • Active participant video/avatar tiles with audio ripples        │
│      • Drop Circle File Tray showing peer-to-peer transfer progress     │
│      • Tactile media dock (mic, camera, settings, leave)               │
│    - Feature Bento Highlights (Asymmetric Grid):                      │
│      • 01: Instant Ephemeral Rooms (No signup, zero footprints)        │
│      • 02: Doorbell Admission (Host keeps the key, approves knocks)    │
│      • 03: Drop Circle File Exchange (Direct WebRTC chunked bytes)     │
│      • 04: Mesh Architecture & Limits (Max 6 peers, pure P2P)          │
├────────────────────────────────────────────────────────────────────────┤
│ 4. Technical Specs & FAQ Accordion                                     │
│    - Plain-language answers to: limits, TURN relay, privacy & storage  │
├────────────────────────────────────────────────────────────────────────┤
│ 5. Footer                                                              │
│    - Brand seal, version tag, GitHub repository link, status indicator │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 4. Detailed Component Behaviors & Edge Cases

### 4.1 Room Entry Console
1. **Create Room Flow**:
   - Sanitizes `displayName.trim()`. If empty, Zustand store automatically assigns a friendly anonymous alias (e.g., `SwiftFox429`).
   - Generates a cryptographically secure UUIDv4 room ID.
   - Invokes `initializeUserAsHost(displayName.trim())`.
   - Sets state in `useUserStore`.
   - Transitions button to busy state (`Opening room…`) and navigates to `/room/[id]`.
2. **Join Room Flow**:
   - Trims and validates the entered Room ID using `isValidUUID(id)`.
   - If empty or malformed: displays immediate inline error feedback and toast notification (`Enter a valid room invite ID`).
   - Invokes `initializeUserAsGuest(displayName.trim())`.
   - Navigates to `/room/[id]`.
3. **Keyboard Shortcuts**:
   - `[N]`: Instantly triggers Create Room.
   - `[J]`: Switches tab to "Join a room" and shifts focus to the Room ID input.
   - `[Enter]`: Submits the active tab's primary action.
   - `[?]` or `[/]`: Opens the Keyboard Shortcuts helper modal.
   - Shortcuts are disabled when the user is typing inside text input elements.

### 4.2 Interactive Studio Showcase
- The visual showcase must be **functional and interactive** (not a static image):
  - Allows the user to toggle mock mic/camera state.
  - Allows testing the "Copy Invite Link" feedback animation.
  - Demonstrates a realistic Drop Circle file card with a live byte progress bar.

---

## 5. Accessibility (WCAG 2.1 AA) & Anti-Slop Checklist

Before approving any landing page implementation, verify every item:
- [x] **Headings Hierarchy**: Exactly one `<h1>` per page with intentional tracking (`tracking-tight` or `tracking-tighter`). No skipped heading levels (`<h2>` follows `<h1>`).
- [x] **Color Contrast**: All normal text maintains at least 4.5:1 contrast against its background in both light and dark themes. Large text (>24px) maintains at least 3.0:1.
- [x] **Focus Indicators**: Every interactive control has a visible `focus-visible:ring-2 focus-visible:ring-amber-600 focus-visible:ring-offset-2`.
- [x] **Touch Target Sizes**: All buttons, tabs, and interactive targets meet or exceed 44 × 44 CSS pixels.
- [x] **Form Labels**: Every input has an explicitly linked `<label htmlFor="...">` and supporting help text with `aria-describedby`.
- [x] **Motion Preferences**: Wrapped in `prefers-reduced-motion` conditionals. When reduced motion is requested, background animations and parallax stop.
- [x] **No Generic AI Slop**: No floating blur orbs, no purple/indigo SaaS gradients, no stock 3D emojis, no empty marketing jargon.
