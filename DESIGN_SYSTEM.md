# Brane Hub Design System

This document outlines the design language, tokens, and component patterns used in Brane Hub.

## 1. Core Principles
- **Dark-First:** The interface is designed exclusively for dark mode, utilizing a deep grayscale palette with vibrant accent colors.
- **Agent-Centric:** Visual hierarchy prioritizes agent status and activity, using specific color-coded indicators.
- **Three-Agent Focus:** Explicitly built and optimized to connect with the top three AI CLI agents: Gemini, Claude Code, and Codex.
- **Codex-Compatible Skills:** Programmatically mirrors skill management directly into the standard Codex directory (`~/.codex/skills`) for total seamless interoperability.
- **Clean Registry Integration:** Safely leverages jsDelivr CDN and the secure Bearer-authenticated fallback GitHub contents API, enabling private and public skill fetching with absolute reliability.
- **Modern & Precise:** Uses tight spacing, small font sizes, and subtle borders to create a professional, "tool-like" feel.
- **Platform Native:** Built as an Electron app, it respects desktop conventions like titlebar dragging and custom window controls.

---

## 2. Design Tokens

### 2.1 Colors (Base)
The palette is centered around `#111110` (Background) and `#4ade80` (Primary Green).

| Token | Value | Usage |
| :--- | :--- | :--- |
| `background` | `#111110` | Main application background |
| `foreground` | `#e4e4e7` | Primary text color |
| `card` | `#151514` | Card and sidebar background |
| `popover` | `#1c1b1a` | Modals and dropdowns |
| `primary` | `#4ade80` | Accent color, call-to-action |
| `secondary` | `#27272a` | Secondary buttons and elements |
| `muted` | `#1c1b1a` | De-emphasized backgrounds |
| `muted-foreground` | `#a1a1aa` | De-emphasized text |
| `border` | `rgba(255,255,255,0.06)` | Subtle dividers and outlines |

### 2.2 Agent Status Colors
Custom tokens used for agent states and categorization.

| Category | Solid Color | Dimmed (15% opacity) |
| :--- | :--- | :--- |
| **Green** | `#4ade80` | `rgba(74, 222, 128, 0.15)` |
| **Amber** | `#f59e0b` | `rgba(245, 158, 11, 0.15)` |
| **Red** | `#ef4444` | `rgba(239, 68, 68, 0.15)` |
| **Blue** | `#3b82f6` | `rgba(59, 130, 246, 0.15)` |
| **Purple** | `#a855f7` | `rgba(168, 85, 247, 0.15)` |

### 2.3 Typography
- **Primary Font:** Sans-serif (System default, likely Inter).
- **Secondary Font:** Monospace (For logs and credentials).
- **Nav Items:** `13px`, weight `450`.
- **Section Headers:** `10.5px`, `semibold`, uppercase with wide tracking.
- **Small Text:** `12px` or `10px` for badges.

---

## 3. Layout & Structure

### 3.1 Sidebar (`AppSidebar`)
- **Width:** `228px`
- **Background:** `var(--card)` (`#151514`)
- **Border:** `1px solid var(--border)` on the right.
- **Structure:**
    - **Main Nav:** Top-level application sections.
    - **Quick Access:** Circular agent icons with status glow.
    - **Workspace:** Secondary utilities (Logs, Activity).
    - **Footer:** Settings and profile access.

### 3.2 Titlebar (`Titlebar`)
- **Height:** `40px` (`h-10`)
- **Background:** `var(--card)`
- **Features:** 
    - Left-aligned logo and app name.
    - Center-aligned `GlobalCommand` (search bar).
    - Right-aligned window controls (Minimize, Maximize, Close).
    - Draggable area for Electron window management.

---

## 4. Components

### 4.1 Buttons
- **Default Radius:** `8px` (`rounded-lg`).
- **Variants:**
    - `default`: Primary green background.
    - `outline`: Bordered, transparent background.
    - `ghost`: No background/border until hover.
    - `destructive`: Subtle red background with red text.
- **Sizes:** `xs` (24px), `sm` (28px), `default` (32px), `lg` (36px).

### 4.2 Cards
- **Radius:** `12px` (`rounded-xl`).
- **Border:** Subtle `ring-1 ring-foreground/10`.
- **Padding:** `16px` (`py-4`, `px-4`).
- **Header/Footer:** Distinct sections with optional separators.

### 4.3 Interactive Elements
- **Scrollbars:** Custom 4px width, transparent track, subtle gray thumb (`rgba(255,255,255,0.11)`).
- **Inputs:** `rgba(255,255,255,0.06)` background, changes to `border-ring` on focus.
- **Badges:** Small, rounded-full, used for counts and status.

---

## 5. Icons
- **Primary Set:** [Lucide React](https://lucide.dev/) (sized `15px` for nav, `14px` for small actions).
- **Secondary Set:** Iconify (used for diverse agent icons).

---

## 6. Implementation Notes
- **Styling:** Tailwind CSS v4 using the new `@theme` configuration.
- **Components:** Built on top of `@base-ui/react` primitives.
- **Animations:** Uses `tw-animate-css` for subtle transitions and status pulses.
- **Auto-Updater:** Built-in secure, transparent background updating with an informative toast system, supporting public GitHub Releases seamlessly without requiring client credentials.
- **Diagnostics Self-Correction Loop:** Uses a real-time Language Server Protocol (LSP) manager over JSON-RPC to capture compilation errors instantly after tool edits, enhancing agent repair loops.
