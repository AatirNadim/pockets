# Pockets — Design System & Visual Contract

> **Visual Direction: Modern Warm Studio + Tactile Precision**  
> Metaphor: *"Pocket Studio + Drop Circle"* — an intimate, calm, and tactile creative workshop for up to 6 collaborators.

---

## 1. Design Archetype & Atmosphere

Pockets rejects sterile enterprise conferencing dashboards, generic purple AI gradient blobs, and ungrounded SaaS clichés. The visual language evokes an architect's desk or an artist's pocket studio: warm paper, rich ink, precise tactile controls, and quiet confidence.

### Core Metaphors
1. **Pocket Studio**: A contained, temporary room where people meet face-to-face. Panels feel like physical trays, cards have crisp edges with subtle hairline borders, and controls sit in predictable docks.
2. **Drop Circle**: Peer-to-peer file transfer is treated like passing a physical document across a table. Transfers are explicit, pull-based, and visibly tracked by chunked progress.

---

## 2. Color Palette (60-30-10 Rule)

### 60% Dominant Canvas & Surfaces
- **Light Mode**:
  - Base Canvas: Warm Cream Stone `#FFF8EC` (`bg-stone-50`)
  - Elevated Cards & Trays: Warm White `#FFFCF6` (`bg-stone-100` / white)
  - Subtle Muted Surfaces: Soft Sand `#F2E8D8` (`bg-stone-200`)
- **Dark Mode**:
  - Base Canvas: Deep Obsidian Navy `#001735` (`bg-stone-950`)
  - Elevated Cards & Trays: Midnight Navy `#001F52` (`bg-stone-900`)
  - Subtle Muted Surfaces: Deep Slate `#163254` (`bg-stone-800`)

### 30% Structural Hierarchy, Borders & Typography
- **Light Mode**:
  - Primary Text & Structural Ink: Deep Navy `#001F52` (`text-stone-900`)
  - Secondary / Supporting Text: Slate Ink `#555D6C` (`text-stone-600`)
  - Subtle / Disabled Text: Muted Bronze `#7E7B72` (`text-stone-500`)
  - Hairline Precision Borders: Sandstone Border `#E1D3BD` (`border-stone-300`)
- **Dark Mode**:
  - Primary Text: Warm Cream `#FFF8EC` (`text-stone-100`)
  - Secondary Text: Warm Sand `#E1D3BD` (`text-stone-300`)
  - Subtle / Disabled Text: Muted Stone `#555D6C` (`text-stone-500`)
  - Hairline Precision Borders: Deep Slate Border `#30445D` (`border-stone-700`)

### 10% Intentional Accents & Feedback States
- **Primary Action (Brand Signature)**:
  - Light Mode: Deep Berry / Rich Magenta `#A10054` (`bg-amber-600` / `bg-primary`)
  - Dark Mode: Warm Sunset Coral `#FF8D68` (`text-stone-950` button or coral accent)
- **Secondary Accent**:
  - Warm Sunset Coral `#FF8D68` / `#F97858` for badges, focus rings, and active state indicators
- **Semantic States**:
  - Success / Live / Connected: Calm Emerald `#10B981` / `#059669`
  - Warning / Pending Approval: Warm Amber `#D97706` / `#F59E0B`
  - Destructive / Error / Disconnect: Rose Crimson `#E11D48` / `#D13778`

---

## 3. Typography System

- **Typeface**: **Söhne** (`var(--font-sohne)`, loaded via local font files: Regular 400, Medium 500, Semibold 600, Bold 700). Fallback: `system-ui, -apple-system, sans-serif`.
- **Numbers & Technical Data**: Tabular figures (`font-mono tracking-tight`) for room IDs, file byte sizes, and keyboard shortcuts.

### Scale & Tracking Hierarchy
| Role | Desktop Size | Mobile Size | Weight | Tracking | Line Height |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero Display** | 56px–64px (`text-5xl sm:text-6xl`) | 36px–40px (`text-4xl`) | Semibold (600) | `tracking-tight` (-0.035em) | 1.08 |
| **Section Title** | 30px–36px (`text-3xl`) | 24px (`text-2xl`) | Semibold (600) | `tracking-tight` (-0.025em) | 1.15 |
| **Card / Tray Header** | 18px–20px (`text-lg sm:text-xl`) | 18px | Semibold (600) | `tracking-tight` (-0.015em) | 1.25 |
| **Body (Editorial)** | 16px–18px (`text-base sm:text-lg`)| 15px–16px | Regular (400) | Normal | 1.65 |
| **Interface Label** | 13px–14px (`text-sm`) | 13px–14px | Medium (500) | Normal | 1.4 |
| **Microcopy & Badges** | 11px–12px (`text-xs`) | 11px–12px | Medium (500) | `tracking-wider uppercase` | 1.3 |

---

## 4. Anti-Slop Directives (Strict Negative Constraints)

1. **NO Generic AI Gradients**: Absolutely zero purple-to-indigo or neon-cyan mesh gradients. Gradients, when used, must be warm paper washes (`from-amber-100/60 via-orange-100/40 to-rose-100/50`).
2. **NO Floating Glow Orbs**: No blurred floating decorative circles behind text that harm readability and contrast.
3. **NO Repetitive 3-Column Card Dumps**: Avoid boring, identical 3-card rows with stock icons. Use asymmetric bento layouts, interactive live previews, or dense data trays.
4. **NO Vague Tech Buzzwords**: Speak plainly and honestly. No "seamless AI-powered collaboration" or false claims like "military-grade end-to-end encryption." Pockets is an honest browser-first WebRTC room for up to 6 people with host approval and direct file exchange.
5. **Hairline Precision Borders**: All surface dividers and card edges must be crisp 1px borders (`border-stone-200 dark:border-stone-800`), never bulky cartoon borders.
6. **Tactile Interactive States**: Every interactive element must feature a noticeable `:hover` transition, an unmistakable `:focus-visible` ring (`ring-2 ring-amber-600 ring-offset-2`), and an active press depth (`active:scale-[0.98]`).

---

## 5. Spacing, Shapes & Motion

- **Spacing Scale**: Multiples of 4px / 8px (4, 8, 12, 16, 20, 24, 32, 48, 64, 80px).
- **Corner Radii**:
  - Container / Room frame / Hero card: `rounded-2xl` (16px) or `rounded-3xl` (24px).
  - Buttons, Inputs, Tabs: `rounded-xl` (12px).
  - Badges, Avatars, Pills: `rounded-full` or `rounded-lg` (8px).
- **Motion Principles**:
  - Subdued, purposeful, and snappy (150ms to 250ms with `cubic-bezier(0.16, 1, 0.3, 1)` ease-out).
  - Respect `prefers-reduced-motion` at all times: animations must gracefully fallback to instant state transitions.
