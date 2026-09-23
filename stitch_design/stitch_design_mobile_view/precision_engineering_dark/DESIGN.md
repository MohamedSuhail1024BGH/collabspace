---
name: Precision Engineering Dark
colors:
  surface: '#111319'
  surface-dim: '#111319'
  surface-bright: '#373940'
  surface-container-lowest: '#0c0e14'
  surface-container-low: '#191b22'
  surface-container: '#1e1f26'
  surface-container-high: '#282a30'
  surface-container-highest: '#33343b'
  on-surface: '#e2e2eb'
  on-surface-variant: '#c7c4d7'
  inverse-surface: '#e2e2eb'
  inverse-on-surface: '#2e3037'
  outline: '#908fa0'
  outline-variant: '#464554'
  surface-tint: '#c0c1ff'
  primary: '#c0c1ff'
  on-primary: '#1000a9'
  primary-container: '#8083ff'
  on-primary-container: '#0d0096'
  inverse-primary: '#494bd6'
  secondary: '#4edea3'
  on-secondary: '#003824'
  secondary-container: '#00a572'
  on-secondary-container: '#00311f'
  tertiary: '#ffb95f'
  on-tertiary: '#472a00'
  tertiary-container: '#ca8100'
  on-tertiary-container: '#3e2400'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#e1e0ff'
  primary-fixed-dim: '#c0c1ff'
  on-primary-fixed: '#07006c'
  on-primary-fixed-variant: '#2f2ebe'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#111319'
  on-background: '#e2e2eb'
  surface-variant: '#33343b'
typography:
  headline-xl:
    fontFamily: Geist
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 38px
    letterSpacing: -0.03em
  headline-xl-mobile:
    fontFamily: Geist
    fontSize: 26px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.025em
  headline-lg:
    fontFamily: Geist
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Geist
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.015em
  headline-sm:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: '500'
    lineHeight: 20px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
    letterSpacing: -0.005em
  body-md:
    fontFamily: Geist
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
    letterSpacing: 0em
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: '500'
    lineHeight: 14px
    letterSpacing: 0.04em
  code-inline:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 0.75rem
  gutter-sm: 0.5rem
  gutter-lg: 1rem
  margin: 1rem
  margin-sm: 0.75rem
  margin-lg: 1.5rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1rem
  space-xl: 1.5rem
---

## Brand & Style

This design system delivers a high-density, keyboard-first, professional workspace aesthetic inspired by developer workflows and high-speed productivity software. The target audience comprises software engineers, technical product managers, and systems operators who value speed, spatial efficiency, and visual clarity over decorative ornamentation.

The core visual language relies on **Technical Minimalism**:
- **High Information Density:** Compact line heights, minimal inner padding, and razor-sharp structural alignments allow large volumes of work context to remain legible without excessive scrolling.
- **Zero Heavy Shadows:** Depth is produced through tonal containment and crisp 1px borders rather than blurred drop shadows.
- **Instrument-Grade Restraint:** The UI operates as a passive, dark canvas where structural frames recede, ensuring that real-time status indicators, badges, and user-generated data command visual priority.

## Colors

The palette is engineered natively for OLED and high-resolution displays in low-light environments, maximizing optical ergonomics over prolonged working sessions.

### Foundations & Surfaces
- **Canvas Base (`neutral_color_hex`):** `#0F1117` — deep slate foundation layer for top-level window framing.
- **Surface Elevation 1:** `#161922` — primary canvas for sidebars, utility rails, and table cells.
- **Surface Elevation 2:** `#1C212D` — interactive hovering states, dropdown menus, and popovers.
- **Surface Elevation 3:** `#242A38` — active tab states, modal panels, and transient command palettes.
- **Subtle Borders:** `#1E2230` — crisp, non-distracting 1px delineation between panes, cards, and columns.
- **Active / Focused Borders:** `#31374A` — elevated contrast for focused rows or container boundaries.

### Accents & Semantics
- **Electric Accent (`primary_color_hex`):** `#6366F1` — electric indigo reserved strictly for primary actions, current selection indicators, and active workflow triggers.
- **Success / Completed (`secondary_color_hex`):** `#10B981` (Emerald) — terminal tasks, healthy pipelines, and positive diffs.
- **In-Progress / Attention (`tertiary_color_hex`):** `#F59E0B` (Amber) — queued processes, active sprints, and warnings.
- **Critical / Overdue:** `#F43F5E` (Rose) — blocking issues, failing builds, and urgent priorities.
- **Informational / Context:** `#0EA5E9` (Sky) — references, pull-request links, and neutral state pings.

### Text & Contrast Hierarchy
- **Text High-Contrast:** `#F8FAFC` — titles, headers, and prominent cell values.
- **Text Muted:** `#94A3B8` — metadata, secondary descriptors, and table headers.
- **Text Dimmed:** `#64748B` — timestamps, inactive shortcuts, and structural icons.

## Typography

The typography strategy leverages `Geist` for its neutral, highly engineered proportions and crisp geometry at small body sizes, paired with `JetBrains Mono` for metadata, tags, counters, and hotkey shortcuts.

- **Tabular Numerals (`tnum`):** All numerical tables, counters, percentages, and timestamps must render with font feature settings set to `tnum` and `zero` enabled, guaranteeing vertical baseline alignment in dense data matrices.
- **Optical Kerning:** Tracking tightens slightly as size increases to maintain structural cohesion in short headers.
- **Hierarchy Boundaries:** Large headers are intentionally limited to preserve horizontal and vertical real estate. Context is communicated via breadcrumb lines, monospace identifier codes (e.g., `COL-4829`), and compact metadata tags.

## Layout & Spacing

The layout model is built on a 4px baseline sub-grid supporting an ultra-compact fluid workbench architecture.

- **Layout Structure:** Workspaces utilize multi-pane fluid viewports rather than centered page documents. Layouts are divided into three collapsible sections: utility rail (64px fixed), navigational tree/list view (240px–320px adjustable), and fluid main workspace.
- **Table and Board Spacing:** Row paddings default to `space-sm` (8px) vertically, ensuring minimum cursor latency and maximum vertical row scan density.
- **Breakpoints:**
  - `Desktop (>= 1280px)`: Full multi-column view; sidebar and detail inspector open side-by-side.
  - `Tablet (768px – 1279px)`: Contextual drawer for detail view; sidebar collapses to icon-only utility strip.
  - `Mobile (< 768px)`: Single-column stack with bottom tab bar; dense tables convert into fluid stacked list items with persistent status pills.

## Elevation & Depth

This design system rejects diffuse shadows, ambient blurs, and skeuomorphic gradients in favor of **Tonal Layering & Structural Lineation**.

- **Surface Tiers:**
  - `Level 0 (App Shell)`: `#0F1117`
  - `Level 1 (Panels & Table Surfaces)`: `#161922`
  - `Level 2 (Active Rows & Cards)`: `#1C212D`
  - `Level 3 (Overlays & Command K Dialogs)`: `#242A38`
- **1px Crisp Dividers:** All structural boundaries use a 1px solid border in `#1E2230`. Layer distinction must never depend on blur; the hard boundary of adjacent tones combined with the 1px grid line forms the visual partition.
- **Command Palette & Dropdown Elevation:** Modals and flyout palettes use a solid `#161922` body, framed with a 1px `#31374A` boundary and a sharp, tightly focused drop edge (`0 4px 16px rgba(0, 0, 0, 0.4)`), avoiding broad ambient light spreads.

## Shapes

The design system standardizes on an understated **Soft (`1`)** shape scale (0.25rem / 4px base radius) to reflect a technical, tool-like precision.

- **Base Controls & Inputs:** 4px border radius.
- **Containers, Cards, & Windows:** 6px to 8px (`rounded-lg`) corner radii to bound larger groupings without feeling bulbous or toy-like.
- **Badge Pills:** Full circular pill radius (`9999px`) applied strictly to micro status badges and counter tags to distinctively separate data points from square layout bounds.
- **Inner-to-Outer Radius Proportionality:** When an element sits inside a container with padding, the child corner radius must match the parent's radius minus the padding gap, preventing visual corner tension.

## Components

### Buttons & Interactive Controls
- **Primary:** Background `#6366F1`, text `#FFFFFF`, 0 1px 2px rgba(0,0,0,0.3) inset. Hover state: `#4F46E5`. Compact 32px height for standard buttons, 28px height for table-action buttons.
- **Secondary / Ghost:** Background transparent, text `#94A3B8`, border 1px solid `#1E2230`. Hover state: background `#1C212D`, text `#F8FAFC`, border `#31374A`.
- **Keyboard Accelerators:** Right-aligned alongside button text using `JetBrains Mono` at `label-sm` with a background of `#0F1117`, border `#1E2230`, and text `#64748B`.

### Badges & Status Chips
- **Semantic Pills:** Height 20px, horizontal padding 8px, font `JetBrains Mono` (`label-sm`).
  - *Completed:* Background `rgba(16, 185, 129, 0.12)`, border `rgba(16, 185, 129, 0.25)`, text `#34D399`.
  - *In-Progress:* Background `rgba(245, 158, 11, 0.12)`, border `rgba(245, 158, 11, 0.25)`, text `#FBBF24`.
  - *Overdue / Urgent:* Background `rgba(244, 63, 94, 0.12)`, border `rgba(244, 63, 94, 0.25)`, text `#FB7185`.
  - *Info / Reference:* Background `rgba(14, 165, 233, 0.12)`, border `rgba(14, 165, 233, 0.25)`, text `#38BDF8`.

### Tables & Data Grids
- **Header Row:** 32px height, uppercase `label-sm` font, text `#64748B`, background `#0F1117`, border-bottom 1px solid `#1E2230`.
- **Data Rows:** 36px height, background `#161922`, border-bottom 1px solid `#1E2230`. Hover state triggers immediate background shift to `#1C212D`.
- **Selection State:** Row background `#1E2230` with a 2px vertical highlight bar on the left edge in `#6366F1`.

### Form Inputs & Search Fields
- **Input Elements:** Height 32px, background `#0F1117`, border 1px solid `#1E2230`, text `#F8FAFC`, placeholder `#64748B`, typography `body-md`. Focus state uses border `#6366F1` with an outer ring of `0 0 0 1px #6366F1`.
- **Checkboxes:** 14px × 14px, 3px border radius. Unchecked: border 1px solid `#31374A`, background transparent. Checked: background `#6366F1`, border `#6366F1`, white geometric checkmark.

### Cards & Group Panels
- **Structure:** Background `#161922`, border 1px solid `#1E2230`, border-radius 6px. Internal padding set to `space-md` (12px) to maximize internal printable space. Header separated with a 1px solid horizontal line.

### Command Palette (Quick Access)
- Centered modal dialog, max width 640px. Background `#161922`, border 1px solid `#31374A`. Features an integrated search input, direct categorization headers, and key navigation highlights in `#1C212D` with active indicator `#6366F1`.