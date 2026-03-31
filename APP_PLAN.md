# Brane Hub (AgentHub) — Complete Product & Architecture Plan

## 1) What this codebase is today

Brane Hub is a **Next.js + Electron desktop frontend shell** for managing AI CLI agents and their ecosystem.

- Framework: Next.js App Router + React + TypeScript
- Desktop wrapper: Electron (`electron/main.js`, `electron/preload.js`)
- UI stack: Tailwind + shadcn-style components
- Current behavior: mostly **mock/static data UI**, not yet wired to real system operations

Key source locations:

- App routes: `src/app/page.tsx`, `src/app/mcps/page.tsx`, `src/app/skills/page.tsx`, `src/app/credentials/page.tsx`, `src/app/config/page.tsx`
- Mock domain data: `src/lib/data.ts`
- Shell layout: `src/components/layout/*`
- Agent details UI: `src/components/agents/agent-detail.tsx`
- Electron window + IPC: `electron/main.js`, `electron/preload.js`

---

## 2) Functional scan (how it currently works)

### Navigation and screens

The app has a left sidebar and top titlebar, with route-level pages:

- `/` Agents view (list + detail split pane)
- `/mcps` MCP servers list with enabled toggles
- `/skills` skills list with enabled toggles
- `/credentials` credential cards and status badges
- `/config` per-agent configuration form-like UI

Referenced but not implemented routes in sidebar:

- `/logs`
- `/activity`

### Data and state flow

- Domain objects are defined in `src/lib/data.ts`:
  - `agents`, `mcpServers`, `skills`, `credentials`, `cliFlags`
- Pages keep local React state with `useState` (for tab selection and temporary toggles)
- No persistence layer is currently used
- No API calls, no backend endpoints, no DB integration

### Electron integration state

- Electron creates a frameless window and loads Next dev URL in development
- Preload exposes `window.electronAPI` with:
  - `minimize()`, `maximize()`, `close()`
  - `isElectron`, `platform`
- Current React UI does **not** call this API yet (titlebar controls are visual only)

### Security state

- Good baseline: `contextIsolation: true`, `nodeIntegration: false`
- Missing: strict typed IPC contract for all system operations

---

## 3) Product intent inferred from current UI

This app is clearly intended to be a **desktop control plane** for:

- Managing local/installed AI CLIs (Claude Code, Gemini CLI, Codex CLI, etc.)
- Configuring MCP servers (enable/disable, scope, command/URL)
- Managing reusable skills (files/capability packs)
- Managing credentials/env keys securely
- Managing per-agent/global CLI flags and runtime config
- Later: logs, activity/audit history, launch terminal actions

The UI language already reflects that goal strongly.

---

## 4) Gaps between current state and target state

Current gaps to close:

1. **No real system integration**
   - No CLI discovery
   - No process launch/stop/status checks
   - No command execution pipeline

2. **No real MCP/skills registry logic**
   - No parser for config files or MCP descriptors
   - No filesystem read/write for skill catalogs

3. **No secure credential lifecycle**
   - Credentials are static mock strings
   - No OS keychain bridge

4. **No persistence model**
   - Changes are in-memory only

5. **No logs/activity pipeline**
   - `/logs` and `/activity` not implemented

6. **No robust validation/error flow**
   - No command failure modeling
   - No schema checks for config inputs

---

## 5) Recommended architecture approach (frontend-only desktop)

Because this is “frontend-only,” the practical approach is:

- Keep **UI in Next.js renderer**
- Put all privileged operations in **Electron main process**
- Treat Electron main as local orchestration layer (not remote backend)

This gives local-system power while preserving a frontend-led product.

### 5.1 Layered module boundaries

1. **Presentation layer (React routes/components)**
   - Pure rendering + user interaction
   - No direct system calls

2. **Renderer app services**
   - Typed client APIs (e.g., `agentService`, `mcpService`)
   - Handles optimistic UI and view models

3. **IPC contract layer**
   - Strict request/response schemas per channel
   - Versioned event payloads for streaming status/log updates

4. **Electron main domain services**
   - CLI discovery service
   - Agent process manager
   - MCP config service
   - Skills catalog service
   - Credential/keychain service
   - Activity/log service

5. **System adapters**
   - `child_process` wrapper (spawn/kill/status)
   - Filesystem adapters for configs
   - OS keychain adapter (platform-specific)

### 5.2 Core domain model to adopt

- `AgentDefinition`: metadata, install path, provider, supported capabilities
- `AgentRuntime`: running state, pid, start time, health, last error
- `McpServerDefinition`: command/url, args/env, category, scope, enabled
- `SkillDefinition`: id, source path, capabilities, compatibility, enabled
- `CredentialRef`: key id, provider, validation status, last checked timestamp
- `CliFlagSet`: global + per-agent flags with precedence resolution
- `ActivityEvent`: action, actor(source), target, result, timestamp

### 5.3 UX flow (target)

1. App boot
   - Load persisted configuration
   - Discover installed CLIs
   - Validate credentials
   - Probe running processes

2. Agents page
   - Show runtime status + health
   - Launch/stop/restart agents
   - Open live logs/terminal session panel

3. MCP page
   - Toggle enable state
   - Validate command/URL and compatibility
   - Apply globally or scoped to selected agents

4. Skills page
   - Discover skills from configured directories
   - Validate `SKILL.md` metadata
   - Enable/disable by agent scope

5. Credentials page
   - Add/update/remove in OS keychain
   - Validate against provider requirements
   - Never expose full secrets in renderer

6. Config page
   - Edit model/flags/env/prompt overrides
   - Diff preview + save/rollback
   - Export/import profiles

7. Logs/Activity pages
   - Event timeline + per-agent logs
   - Filters, severity, source, timestamp

---

## 6) Implementation approach options

### Option A (Recommended): Electron-main orchestrator + typed IPC

Pros:

- Best security boundary
- Clean separation of concerns
- Scales for real process management

Cons:

- More upfront structure and contracts

### Option B: Renderer-heavy with broad bridge methods

Pros:

- Faster initial shipping

Cons:

- Weak boundaries
- Security and maintainability risk

### Option C: Add local backend daemon (separate process)

Pros:

- Strong long-term extensibility for heavy workloads

Cons:

- Operational complexity
- Overkill at current stage

**Recommendation:** Option A now, with possibility to evolve toward C later if needed.

---

## 7) Proposed phased roadmap

## Phase 1 — Foundation and contracts

- Define domain schemas and IPC contracts
- Build renderer service layer and typed API wrappers
- Wire titlebar controls to `electronAPI`
- Add centralized error/status model

Exit criteria:

- All current pages read/write through typed service calls
- No direct mock arrays consumed by pages

## Phase 2 — Agent runtime management

- Implement CLI discovery + install path validation
- Add process manager (start/stop/restart/status)
- Surface runtime status in Agents page
- Add initial logs stream panel

Exit criteria:

- At least one supported CLI can be launched/stopped from UI

## Phase 3 — MCP and skills system

- Add MCP definitions persistence and scope resolution
- Add skill directory scanning + metadata validation
- Add compatibility matrix (agent x MCP/skill)

Exit criteria:

- Enabling/disabling MCP/skills persists and affects agent launch config

## Phase 4 — Credentials and config governance

- Integrate secure keychain storage (write/read/delete)
- Add credential validation checks and health indicators
- Implement config diff + save + rollback

Exit criteria:

- Credentials are never stored in plain app state/files
- Config changes are reversible

## Phase 5 — Observability and polish

- Implement `/logs` and `/activity`
- Add audit trail for all configuration mutations
- Add import/export workspace profiles
- Hardening pass (error UX, accessibility, performance)

Exit criteria:

- Full operational visibility and reliable management loop

---

## 8) Validation checklist (must-pass)

- Security:
  - Renderer has no unrestricted system access
  - IPC channels are allowlisted and schema-validated
  - Secrets never leaked to UI logs

- Reliability:
  - Process start/stop paths deterministic
  - Crash/restart states accurately reflected
  - Config save operations transactional

- Product correctness:
  - Agent status, MCP state, skill state, and credentials remain consistent after restart
  - Scope resolution (global vs per-agent) behaves predictably

- UX:
  - User can complete full lifecycle: discover → configure → launch → observe → troubleshoot

---

## 9) Immediate next best moves (no code yet, planning-level)

1. Freeze a **canonical domain schema** for Agent/MCP/Skill/Credential/Flags.
2. Define full **IPC contract map** (channels + payloads + errors).
3. Create a **state ownership map** for each route (what comes from where).
4. Prioritize first runnable vertical slice:
   - “Configure one agent + launch + see live status + stop.”

This gives the fastest path from current mock UI to a real system manager.

