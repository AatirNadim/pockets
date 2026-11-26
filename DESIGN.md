# Pockets Design System & Visual Contract

## 1. Design Archetype
**Warm Tactile Studio + Drop Circle**
A synthesis of Linear-grade geometric precision and warm editorial tactile craft. Designed for intimate, ephemeral real-time collaboration (up to 6 people) without corporate sterility or generic AI clichés.

---

## 2. 60-30-10 Color System

### 60% Dominant Canvas (Atmosphere & Surfaces)
- **Light Mode**:
  - Background Canvas: Warm Cream Stone (`#FFF8EC`)
  - Elevated Cards / Surfaces: Pure Warm White (`#FFFCF6`)
- **Dark Mode**:
  - Background Canvas: Deep Obsidian Navy (`#001735`)
  - Elevated Cards / Surfaces: Midnight Navy (`#001F52`)

### 30% Structural Hierarchy (Typography & Hairline Borders)
- **Light Mode**:
  - Primary Structural Text: Deep Navy Ink (`#001F52` / `stone-900`)
  - Secondary Editorial Text: Slate Ink (`#555D6C` / `stone-600`)
  - Hairline Borders: Muted Sandstone (`#E1D3BD` / `stone-300`, `#F2E8D8` / `stone-200`)
- **Dark Mode**:
  - Primary Structural Text: Warm Cream (`#FFF8EC` / `stone-100`)
  - Secondary Editorial Text: Muted Sandstone (`#E1D3BD` / `stone-400`)
  - Hairline Borders: Deep Slate (`#30445D` / `stone-700`, `#163254` / `stone-800`)

### 10% Intentional Accents (Actions & Real-Time Indicators)
- **Primary Interactive Accent**:
  - Light Mode: Rich Berry / Deep Magenta (`#A10054` / `amber-700` in theme mapping)
  - Dark Mode: Warm Sunset Coral (`#FF8D68` / `amber-400` in theme mapping) with Dark Navy text
- **State & Signal Colors**:
  - Connected / Live Active: Emerald (`#10B981` / `emerald-500`)
  - Pending / Knocking / Connecting: Amber (`#D97706` / `amber-600`)
  - Full / Danger / Disconnect: Deep Rose (`#A10054` / `rose-600`)

---

## 3. Typography & Spacing Scale

### Font Family
- **Söhne** (`var(--font-sohne)`, system-ui fallback):
  - Weights: Regular (400), Medium (500), Semibold (600), Bold (700).
  - Headings: Tight geometric tracking (`tracking-tight`, `tracking-tighter`), `text-wrap: pretty`.
  - Monospace Data / UUIDs / Hotkeys: Tabular figures (`font-mono`, `tabular-nums`).

### Radius & Elevation
- Base radius: `0.75rem` (`12px`)
- Standard interactive elements: `rounded-xl` (`12px`)
- Master console & feature bento cards: `rounded-2xl` / `rounded-3xl` (`16px` - `24px`)
- Elevation: Subtle, ambient drop shadows (`shadow-xs`, `shadow-xl shadow-stone-900/5`), no heavy black shadows.

---

## 4. Anti-Slop Negative Constraints
1. **NO Generic AI Gradients**: Never use arbitrary purple-to-blue (`#6366f1` -> `#a855f7`) mesh gradients.
2. **NO Floating Glow Orbs**: Avoid random large blurred circular divs (`blur-3xl bg-purple-500/20`) floating in the background.
3. **NO Un-tracked Typography**: Headlines must always have deliberate negative tracking (`tracking-tight` or `tracking-tighter`).
4. **NO Sterile Enterprise Dumps**: Avoid equal-width, undifferentiated 3-card grids without visual rhythm, bento asymmetry, or tactile micro-interactions.
5. **NO Unresponsive Touch Targets**: All interactive buttons, inputs, and tabs must maintain minimum `min-h-11` (`44px`) touch targets.
