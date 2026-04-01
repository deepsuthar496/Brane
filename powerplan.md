# Brane — Skills Marketplace: Complete Architecture Plan

> Full plan covering codebase analysis, skill sourcing, registry design, CDN strategy, and folder structure. Compiled from design session — April 2026.

---

## Table of Contents

1. [What Brane Is Today](#1-what-brane-is-today)
2. [What "Skills" Actually Are](#2-what-skills-actually-are)
3. [The Marketplace Vision](#3-the-marketplace-vision)
4. [Where Skills Come From](#4-where-skills-come-from)
5. [Sourcing Strategy — No Server Required](#5-sourcing-strategy--no-server-required)
6. [GitHub Rate Limits — The Right Answer](#6-github-rate-limits--the-right-answer)
7. [Registry Folder Structure](#7-registry-folder-structure)
8. [The Three-File Fetch Strategy](#8-the-three-file-fetch-strategy)
9. [File Schemas](#9-file-schemas)
10. [Electron Install Engine](#10-electron-install-engine)
11. [TypeScript Types](#11-typescript-types)
12. [skills-lock.json — Extended Format](#12-skills-lockjson--extended-format)
13. [The Community Growth Flywheel](#13-the-community-growth-flywheel)
14. [When to Add Supabase](#14-when-to-add-supabase)
15. [Implementation Roadmap](#15-implementation-roadmap)

---

## 1. What Brane Is Today

Brane is a **Next.js + Electron desktop app** — a control plane for managing AI CLI agents.

**Stack:**
- Framework: Next.js App Router + React + TypeScript
- Desktop wrapper: Electron (`electron/main.js`, `electron/preload.js`)
- UI: Tailwind + shadcn-style components
- State: local `useState` only — no persistence layer yet
- Data: all mock/static in `src/lib/data.ts`

**Current screens:**
| Route | Purpose |
|---|---|
| `/` | Agent list + detail split pane |
| `/mcps` | MCP server toggles — **wired to real Electron IPC** |
| `/skills` | Skills list + toggles — **still mock data** |
| `/credentials` | Credential cards |
| `/config` | Per-agent config form |
| `/logs`, `/activity` | Not implemented yet |

**Existing Electron IPC (already real):**
- `electron/mcp-manager.js` — reads/writes `~/.gemini/settings.json` for Gemini CLI MCP configs
- `electron/cli-discovery.js` — discovers installed CLIs (`claude`, `gemini`, `codex`, `cursor`, etc.) via `which`/`where`
- `electron/preload.js` — exposes `window.electronAPI` with `getMcpServers`, `addMcpServer`, `removeMcpServer`, `toggleMcpServer`

**Key file already in the repo:**
```
skills-lock.json   ← already tracks installed skills with source + hash
```

This lock file is the seed of the entire install/update system.

---

## 2. What "Skills" Actually Are

> **Critical distinction:** Skills in Brane are NOT MCP servers.

Skills are **`SKILL.md` files** — markdown instruction files that AI agents read to gain capabilities. When an agent launches, it scans a skills directory, reads the SKILL.md files, and injects them as context.

**Example skill paths in the codebase:**
```
/mnt/skills/public/docx/SKILL.md
/mnt/skills/public/pdf/SKILL.md
/mnt/skills/user/modern-ui-design/SKILL.md
```

**A skill is just a folder with a SKILL.md:**
```
docx/
├── SKILL.md        ← instructions the agent reads
├── scripts/        ← optional helper scripts
└── references/     ← optional deep documentation
```

**The SKILL.md format (Anthropic open standard, Dec 2025):**
```markdown
---
name: docx
description: "Triggers when user wants Word documents..."
license: apache-2.0
---

# DOCX Generator

## When to use this skill
...

## Instructions
...
```

**Where agents look for skills:**
| Agent | Skills directory |
|---|---|
| Claude Code | `~/.claude/skills/` (global) or `.claude/skills/` (project) |
| Codex CLI | `~/.codex/skills/` |
| Gemini CLI | `~/.gemini/skills/` |

**Implication:** Sites like `mcpmarket.com` and `smithery.ai` are for MCP servers, not skills. Brane needs its own skill sourcing strategy.

---

## 3. The Marketplace Vision

A **Play Store-style interface** inside the Skills page with three tabs:

**Browse tab** — grid of skill cards with:
- Category filter sidebar (Documents, Development, Science, Security...)
- Search by name or tag
- Featured / New / Popular sections
- Compatibility badges (which agents support this skill)
- One-click Install button

**Installed tab** — what the current user has installed:
- Enable/disable toggle per skill (already exists in current UI)
- Update available indicator
- Uninstall option

**Manage tab** — same concept applied to MCPs and Prompts:
- MCPs browseable by category (System, Google, Community)
- Prompt templates discoverable and installable

The same marketplace pattern extends to MCPs and Prompts — not just skills. The registry and install engine handle all three types uniformly.

---

## 4. Where Skills Come From

The skill ecosystem exploded after Anthropic released the Agent Skills open standard in December 2025. Hundreds of repositories now exist.

### Primary sources

**`github.com/anthropics/skills`** — Anthropic's official repo
- docx, pdf, pptx, xlsx, canvas, algorithmic-art
- Apache 2.0 licensed
- Production skills used inside Claude.ai

**`github.com/alirezarezvani/claude-skills`** — 220+ skills
- Engineering, marketing, product, compliance, C-suite advisory
- Works with Claude Code, Codex, Gemini CLI, Cursor, and 8 more agents
- Includes 298 stdlib-only Python helper scripts

**`github.com/Orchestra-Research/AI-Research-SKILLs`** — 86 research skills
- Mechanistic interpretability, distributed training, RAG, MLOps
- Each SKILL.md: 50–150 lines + 300KB reference docs

**`github.com/K-Dense-AI/claude-scientific-skills`** — 136 scientific skills
- Cancer genomics, drug-target binding, molecular dynamics
- 78+ scientific database integrations

**`github.com/ComposioHQ/awesome-claude-skills`** — 50+ automation skills
- Webflow, Amplitude, PostHog, BambooHR, Zoom, Mixpanel
- AWS CDK, D3.js, Playwright, iOS Simulator

**`github.com/travisvn/awesome-claude-skills`** / **`github.com/BehiSecc/awesome-claude-skills`**
- Curated aggregator lists with hundreds more community skills

**`skillsmp.com`**
- Already scrapes GitHub by topic
- Filters by minimum 2 stars
- Updates automatically when repos update

### How to discover more automatically

GitHub topic searches that surface all skill repos:
```
topic:claude-skill
topic:agent-skill
topic:brane-skill        ← create this for the Brane ecosystem
filename:SKILL.md
"agent skills" in:readme
```

These can be run server-side (or in a GitHub Action) nightly to auto-discover new community skills.

---

## 5. Sourcing Strategy — No Server Required

### The answer: host skills inside the Brane repo itself

Since Brane is open source, the cleanest approach is a `registry/` folder in the repo. This is the same pattern used by:
- **shadcn/ui** — `ui.shadcn.com/r/index.json` serves component registry
- **VS Code extensions** — bootstrap via JSON manifest
- **Homebrew** — formula registry in a GitHub repo
- **crates.io** — index hosted on GitHub

```
Brane/
└── registry/
    ├── index.json          ← fetched on app launch
    ├── skills/
    │   ├── documents.json
    │   ├── development.json
    │   └── documents/
    │       └── docx/
    │           ├── meta.json
    │           └── SKILL.md
    ├── mcps/
    │   └── all.json
    └── prompts/
        └── all.json
```

### Fetching — two URL options

**Option A: `raw.githubusercontent.com`**
```
https://raw.githubusercontent.com/deepsuthar496/Brane/main/registry/index.json
```
- Served by Fastly CDN globally
- No documented rate limits for public repos
- Zero cost

**Option B: jsDelivr (recommended)**
```
https://cdn.jsdelivr.net/gh/deepsuthar496/Brane@main/registry/index.json
```
- Explicit global CDN with 99.99% uptime SLA
- 100+ edge locations worldwide
- Used by millions of packages
- Automatic cache invalidation on new commits
- Zero cost

Use jsDelivr in production. Use `raw.githubusercontent.com` as fallback.

```js
const BASE = 'https://cdn.jsdelivr.net/gh/deepsuthar496/Brane@main'
// fallback:
// const BASE = 'https://raw.githubusercontent.com/deepsuthar496/Brane/main'
```

### How community contributions work

Someone wants to add a skill → they open a PR:
1. Add `registry/skills/{category}/{id}/SKILL.md`
2. Add one entry to `registry/skills/{category}.json`
3. You review and merge → instantly live for all users

The PR review **is** the quality gate. No backend, no database admin, no deploy pipeline.

---

## 6. GitHub Rate Limits — The Right Answer

### The problem

`api.github.com` has rate limits:
- **60 requests/hour** for unauthenticated requests (per IP)
- **5,000 requests/hour** for authenticated (per token)

If each user's Electron app calls the GitHub API directly, every user consumes from the limit. With many users, apps get throttled or blocked.

### The solution: never call `api.github.com` from the app

There are two different GitHub URLs — only one has limits:

| URL | Rate limited? | Purpose |
|---|---|---|
| `api.github.com` | ✅ Yes — 60/hr unauth | Search, metadata, repo info |
| `raw.githubusercontent.com` | ❌ No | Fetching raw file content |
| `cdn.jsdelivr.net/gh/...` | ❌ No | CDN-served file content |

The app only ever fetches from `raw.githubusercontent.com` or jsDelivr — **never from the API**. This completely sidesteps rate limits.

**Fetching `registry/index.json` (the catalog):** goes to jsDelivr — no limit.
**Fetching `registry/skills/documents/docx/SKILL.md` (install):** goes to raw GitHub — no limit.

The GitHub API is only needed if you want to run nightly discovery of new community skills — that runs on a scheduled GitHub Action with an authenticated token, not in the user's app.

---

## 7. Registry Folder Structure

```
Brane/
└── registry/
    ├── index.json                        ← ~3KB, fetched on every app launch
    │
    ├── skills/
    │   ├── documents.json                ← ~12KB, lazy-loaded per category tab
    │   ├── development.json              ← ~18KB
    │   ├── science.json
    │   ├── security.json
    │   ├── productivity.json
    │   ├── data.json
    │   │
    │   ├── documents/
    │   │   ├── docx/
    │   │   │   ├── meta.json             ← fetched only when user opens detail view
    │   │   │   └── SKILL.md             ← fetched only on install
    │   │   ├── pdf/
    │   │   │   ├── meta.json
    │   │   │   └── SKILL.md
    │   │   └── pptx/
    │   │       ├── meta.json
    │   │       └── SKILL.md
    │   │
    │   ├── development/
    │   │   ├── playwright/
    │   │   │   ├── meta.json
    │   │   │   └── SKILL.md
    │   │   ├── aws/
    │   │   └── ios-simulator/
    │   │
    │   ├── science/
    │   │   ├── cancer-genomics/
    │   │   └── molecular-dynamics/
    │   │
    │   └── security/
    │       ├── owasp/
    │       └── codeql/
    │
    ├── mcps/
    │   ├── all.json                      ← all MCP configs in one file (fewer items)
    │   ├── filesystem/
    │   │   └── config.json
    │   ├── github/
    │   │   └── config.json
    │   └── postgres/
    │       └── config.json
    │
    └── prompts/
        ├── all.json
        ├── coding-agent/
        │   └── prompt.md
        └── researcher/
            └── prompt.md
```

**Why `registry/` and not `agentSkills/` or `agent-skills/`:**
- `registry/` is the established convention (npm, Homebrew, crates.io, pub.dev all use it)
- It covers all item types (skills, MCPs, prompts) without being misleading
- When a fourth type is added (themes, workflows, agents), the name still makes sense

---

## 8. The Three-File Fetch Strategy

This is how all major app stores and package registries work: tiny manifest → category list → individual detail on demand.

```
App launches
    │
    ▼
registry/index.json          ~3KB — always, on every launch
    │                         contains: category list, counts, featured IDs
    │
    ├─── user opens "Documents" tab
    │         ▼
    │    skills/documents.json    ~12KB — lazy, once per session
    │         contains: all doc skills with enough data to render cards
    │              │
    │              ├─── user clicks "DOCX Generator" card
    │              │         ▼
    │              │    skills/documents/docx/meta.json    — on demand
    │              │         contains: full detail, readme, changelog
    │              │              │
    │              │              └─── user clicks Install
    │              │                        ▼
    │              │                   skills/documents/docx/SKILL.md   — install only
    │              │
    │              └─── user clicks "PDF Toolkit" card → same pattern
    │
    └─── user opens "Development" tab → fetch skills/development.json
```

**Per-session caching in the Electron app:**
```js
const categoryCache = {}   // survives for the app session, cleared on restart
```

Category JSON files are fetched at most once per session per category tab the user visits. The index.json is fetched once on launch. Individual meta.json files are fetched only when a skill detail page opens.

---

## 9. File Schemas

### `registry/index.json` — stays tiny forever

```json
{
  "version": 2,
  "updatedAt": "2026-04-01",
  "categories": {
    "skills": [
      { "id": "documents",    "label": "Documents",    "icon": "📄", "count": 42 },
      { "id": "development",  "label": "Development",  "icon": "💻", "count": 87 },
      { "id": "science",      "label": "Science",      "icon": "🔬", "count": 136 },
      { "id": "security",     "label": "Security",     "icon": "🔒", "count": 24 },
      { "id": "productivity", "label": "Productivity", "icon": "⚡", "count": 31 }
    ],
    "mcps": [
      { "id": "system",    "label": "System",    "count": 8 },
      { "id": "google",    "label": "Google",    "count": 5 },
      { "id": "community", "label": "Community", "count": 12 }
    ],
    "prompts": [
      { "id": "development", "label": "Development", "count": 6 },
      { "id": "research",    "label": "Research",    "count": 4 }
    ]
  },
  "featured": ["docx", "playwright", "aws", "filesystem"],
  "new": ["unity-debug", "bitcoin-lightning", "csv-analyzer"],
  "collections": [
    {
      "id": "getting-started",
      "label": "Getting started",
      "skillIds": ["docx", "pdf", "filesystem", "github"]
    }
  ]
}
```

Adding a future feature (ratings, editor's picks, banners) = adding one field. No structural migration.

### `registry/skills/documents.json` — card grid data

```json
{
  "skills": [
    {
      "id": "docx",
      "name": "DOCX Generator",
      "description": "Create Word documents from AI output",
      "icon": "📄",
      "version": "1.2.0",
      "author": "anthropic",
      "license": "apache-2.0",
      "tags": ["word", "office", "files"],
      "compatibleAgents": ["claude", "gemini", "codex", "cursor"],
      "featured": true,
      "path": "registry/skills/documents/docx/SKILL.md"
    },
    {
      "id": "pdf",
      "name": "PDF Toolkit",
      "description": "Read, create, merge, and annotate PDFs",
      "icon": "📑",
      "version": "1.1.0",
      "author": "anthropic",
      "license": "apache-2.0",
      "tags": ["pdf", "documents"],
      "compatibleAgents": ["claude", "codex"],
      "featured": false,
      "path": "registry/skills/documents/pdf/SKILL.md"
    }
  ]
}
```

No SKILL.md content here — just enough to render cards and filter/search.

### `registry/skills/documents/docx/meta.json` — detail page data

```json
{
  "id": "docx",
  "name": "DOCX Generator",
  "version": "1.2.0",
  "author": "anthropic",
  "authorUrl": "https://github.com/anthropics/skills",
  "license": "apache-2.0",
  "homepage": "https://github.com/anthropics/skills/tree/main/skills/docx",
  "description": "Creates professional Word documents from AI output with full formatting support.",
  "readme": "## Overview\n\nThe DOCX skill enables Claude to create...",
  "changelog": [
    "1.2.0 — Added table-of-contents support",
    "1.1.0 — Fixed landscape orientation",
    "1.0.0 — Initial release"
  ],
  "screenshots": [],
  "size": "4KB",
  "installPath": "registry/skills/documents/docx/SKILL.md",
  "requiredCredentials": [],
  "optionalDependencies": ["pandoc", "libreoffice"]
}
```

### `registry/mcps/all.json` — MCP catalog

```json
{
  "mcps": [
    {
      "id": "filesystem",
      "name": "Filesystem",
      "icon": "📁",
      "category": "system",
      "description": "Read and write local files",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-filesystem", "~/projects"],
      "scope": "global",
      "configPath": "registry/mcps/filesystem/config.json"
    },
    {
      "id": "github",
      "name": "GitHub",
      "icon": "🐙",
      "category": "system",
      "description": "Read repos, issues, PRs",
      "command": "npx",
      "args": ["@modelcontextprotocol/server-github"],
      "requiredCredentials": ["GITHUB_TOKEN"],
      "configPath": "registry/mcps/github/config.json"
    }
  ]
}
```

---

## 10. Electron Install Engine

Create `electron/registry-manager.js` — mirrors the existing `mcp-manager.js` pattern:

```js
const fs = require('fs').promises
const path = require('path')
const os = require('os')
const https = require('https')

const BASE_URL = 'https://cdn.jsdelivr.net/gh/deepsuthar496/Brane@main'
const SKILLS_DIR = path.join(os.homedir(), 'brane', 'skills')
const LOCK_PATH = path.join(__dirname, '..', 'skills-lock.json')

async function fetchText(url) {
  return new Promise((resolve, reject) => {
    https.get(url, res => {
      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', reject)
  })
}

async function readLock() {
  try {
    return JSON.parse(await fs.readFile(LOCK_PATH, 'utf-8'))
  } catch {
    return { version: 2, installed: { skills: {}, mcps: {}, prompts: {} } }
  }
}

async function writeLock(lock) {
  await fs.writeFile(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8')
}

async function installSkill(skill) {
  // 1. Fetch the SKILL.md content
  const url = `${BASE_URL}/${skill.path}`
  const content = await fetchText(url)

  // 2. Write to local skills directory
  const dest = path.join(SKILLS_DIR, skill.id)
  await fs.mkdir(dest, { recursive: true })
  await fs.writeFile(path.join(dest, 'SKILL.md'), content, 'utf-8')

  // 3. Update skills-lock.json
  const lock = await readLock()
  lock.installed.skills[skill.id] = {
    version: skill.version,
    installedAt: new Date().toISOString(),
    path: skill.path,
    enabled: true
  }
  await writeLock(lock)

  return { success: true }
}

async function uninstallSkill(skillId) {
  const dest = path.join(SKILLS_DIR, skillId)
  await fs.rm(dest, { recursive: true, force: true })

  const lock = await readLock()
  delete lock.installed.skills[skillId]
  await writeLock(lock)

  return { success: true }
}

async function getInstalledSkills() {
  const lock = await readLock()
  return lock.installed.skills
}

async function toggleSkill(skillId, enabled) {
  const lock = await readLock()
  if (lock.installed.skills[skillId]) {
    lock.installed.skills[skillId].enabled = enabled
    await writeLock(lock)
  }
  return { success: true }
}

module.exports = {
  installSkill,
  uninstallSkill,
  getInstalledSkills,
  toggleSkill
}
```

Wire into `electron/preload.js`:
```js
contextBridge.exposeInMainWorld('electronAPI', {
  // existing MCP methods...
  getMcpServers: () => ipcRenderer.invoke('mcp:getAll'),
  addMcpServer: (id, config) => ipcRenderer.invoke('mcp:add', id, config),

  // new registry methods
  installSkill: (skill) => ipcRenderer.invoke('registry:installSkill', skill),
  uninstallSkill: (id) => ipcRenderer.invoke('registry:uninstallSkill', id),
  getInstalledSkills: () => ipcRenderer.invoke('registry:getInstalledSkills'),
  toggleSkill: (id, enabled) => ipcRenderer.invoke('registry:toggleSkill', id, enabled),
})
```

---

## 11. TypeScript Types

Create `src/lib/registry.ts` — single source of truth for all types:

```ts
export type ItemType = 'skill' | 'mcp' | 'prompt'

// index.json types
export interface CategoryMeta {
  id: string
  label: string
  icon?: string
  count: number
}

export interface Collection {
  id: string
  label: string
  skillIds: string[]
}

export interface RegistryIndex {
  version: number
  updatedAt: string
  categories: {
    skills: CategoryMeta[]
    mcps: CategoryMeta[]
    prompts: CategoryMeta[]
  }
  featured: string[]
  new: string[]
  collections?: Collection[]
}

// Category JSON types (card grid)
export interface SkillEntry {
  id: string
  name: string
  description: string
  icon: string
  version: string
  author: string
  license: string
  tags: string[]
  compatibleAgents: string[]
  featured: boolean
  path: string
}

export interface McpEntry {
  id: string
  name: string
  icon: string
  category: string
  description: string
  command?: string
  args?: string[]
  url?: string
  requiredCredentials?: string[]
  configPath: string
}

export interface PromptEntry {
  id: string
  name: string
  description: string
  category: string
  path: string
}

// meta.json type (detail page)
export interface SkillDetail extends SkillEntry {
  homepage?: string
  authorUrl?: string
  readme: string
  changelog: string[]
  screenshots: string[]
  size: string
  installPath: string
  requiredCredentials: string[]
  optionalDependencies?: string[]
}

// Lock file types
export interface InstalledItem {
  version: string
  installedAt: string
  path: string
  enabled: boolean
}

export interface SkillsLock {
  version: number
  installed: {
    skills: Record<string, InstalledItem>
    mcps: Record<string, InstalledItem>
    prompts: Record<string, InstalledItem>
  }
}

// CDN URLs
export const BASE_URL = 'https://cdn.jsdelivr.net/gh/deepsuthar496/Brane@main'
export const FALLBACK_URL = 'https://raw.githubusercontent.com/deepsuthar496/Brane/main'

export const REGISTRY_URLS = {
  index: `${BASE_URL}/registry/index.json`,
  skillCategory: (cat: string) => `${BASE_URL}/registry/skills/${cat}.json`,
  skillMeta: (cat: string, id: string) => `${BASE_URL}/registry/skills/${cat}/${id}/meta.json`,
  skillContent: (cat: string, id: string) => `${BASE_URL}/registry/skills/${cat}/${id}/SKILL.md`,
  mcps: `${BASE_URL}/registry/mcps/all.json`,
  prompts: `${BASE_URL}/registry/prompts/all.json`,
}
```

---

## 12. `skills-lock.json` — Extended Format

Extend the existing lock file to cover all installed item types:

```json
{
  "version": 2,
  "installed": {
    "skills": {
      "docx": {
        "version": "1.2.0",
        "installedAt": "2026-04-01T10:30:00Z",
        "path": "registry/skills/documents/docx/SKILL.md",
        "enabled": true
      },
      "pdf": {
        "version": "1.1.0",
        "installedAt": "2026-04-01T10:31:00Z",
        "path": "registry/skills/documents/pdf/SKILL.md",
        "enabled": true
      }
    },
    "mcps": {
      "filesystem": {
        "version": "1.0.0",
        "installedAt": "2026-04-01T10:32:00Z",
        "path": "registry/mcps/filesystem/config.json",
        "enabled": true
      }
    },
    "prompts": {}
  }
}
```

The existing `skills-lock.json` in the repo already has `source`, `sourceType`, and `computedHash` fields — those remain compatible. The `installed` wrapper is the extension.

---

## 13. The Community Growth Flywheel

### Step 1 — Seed the registry

Start by adding skills from the official Anthropic repo (Apache 2.0):
- docx, pdf, pptx, xlsx, canvas, algorithmic-art

These are already in use in Brane's mock data and familiar to users.

### Step 2 — Add community skills by PR

Add to `registry/CONTRIBUTING.md`:
```markdown
## Adding a skill

1. Fork this repo
2. Add your skill: `registry/skills/{category}/{your-skill-id}/SKILL.md`
3. Add card data to `registry/skills/{category}.json`
4. Add detail data to `registry/skills/{category}/{your-skill-id}/meta.json`
5. Open a PR — we'll review within 48 hours
```

### Step 3 — Auto-discovery via GitHub Action

Create `.github/workflows/discover-skills.yml`:
```yaml
name: Discover community skills
on:
  schedule:
    - cron: '0 2 * * *'   # nightly at 2am
  workflow_dispatch:

jobs:
  discover:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - name: Search GitHub for brane-skill repos
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: |
          gh api search/repositories \
            -f q="topic:brane-skill" \
            --jq '.items[] | {name: .full_name, stars: .stargazers_count, url: .html_url}' \
            > discovered-skills.json
      - name: Open issue with new discoveries
        run: |
          # Script to compare with existing registry and flag new ones
          node scripts/flag-new-skills.js discovered-skills.json
```

This means new community skills surface automatically without anyone manually searching.

### Step 4 — Tag your own skills

Add this to your `README.md` and CONTRIBUTING guide:
> Want your skill to appear in Brane's marketplace? Add the `brane-skill` GitHub topic to your repository.

---

## 14. When to Add Supabase

The raw GitHub approach handles everything at launch. Add Supabase **only** when you need:

| Feature | Need Supabase? |
|---|---|
| Serve skill catalog | ❌ — raw GitHub / jsDelivr |
| One-click install | ❌ — fetch SKILL.md from raw GitHub |
| Community PRs | ❌ — GitHub PR flow |
| Download/install counts | ✅ |
| Star ratings and reviews | ✅ |
| User accounts / install sync across machines | ✅ |
| Paid or premium skills tier | ✅ |
| Skill submission queue with moderation UI | ✅ |
| Full-text search inside skill content | ✅ |

The Phase 1 launch needs none of the Supabase column. Add it in Phase 2 when the community is large enough that you need analytics and social proof.

---

## 15. Implementation Roadmap

### Phase 1 — Registry foundation (no UI changes yet)

- [ ] Create `registry/` folder structure in repo
- [ ] Create `registry/index.json` with initial categories
- [ ] Add first 6 skills from `anthropics/skills` (docx, pdf, pptx, xlsx, canvas, art)
- [ ] Create `registry/skills/documents.json` with card data for each
- [ ] Create `meta.json` for each skill
- [ ] Create `registry/mcps/all.json` from existing mock MCP data
- [ ] Create `src/lib/registry.ts` with all TypeScript types
- [ ] Create `electron/registry-manager.js` with install/uninstall/toggle
- [ ] Extend `electron/preload.js` with new IPC channels
- [ ] Extend `skills-lock.json` schema to cover MCPs and prompts

**Exit criteria:** Can install a skill by calling `window.electronAPI.installSkill(skill)` from console.

### Phase 2 — Marketplace UI

- [ ] Add "Discover" tab to `src/app/skills/page.tsx`
- [ ] Build `SkillCard` component (icon, name, description, tags, Install button)
- [ ] Build category sidebar filter
- [ ] Wire to `registry/index.json` fetch on page load
- [ ] Wire category tab click to lazy-fetch `skills/{category}.json`
- [ ] Wire skill card click to fetch `meta.json` and open detail sheet
- [ ] Wire Install button to `window.electronAPI.installSkill()`
- [ ] Show install progress state (idle → installing → installed)
- [ ] Show installed badge on already-installed skills
- [ ] Implement Enable/Disable toggle against lock file

**Exit criteria:** User can browse, click, and install a skill in one click from the UI.

### Phase 3 — MCPs and Prompts in marketplace

- [ ] Add MCP browse tab to `/mcps` page with same card pattern
- [ ] Add Prompts section (new route or tab)
- [ ] Extend `registry-manager.js` for MCP install (write to `~/.gemini/settings.json`)
- [ ] Compatibility filtering — show only skills that work with installed agents

### Phase 4 — Community and discovery

- [ ] Add `registry/CONTRIBUTING.md`
- [ ] Add GitHub Action for nightly community skill discovery
- [ ] Add `brane-skill` GitHub topic to docs
- [ ] Add skill submission issue template
- [ ] Consider Supabase for install counts and ratings

---

## Summary

| Decision | Choice | Reason |
|---|---|---|
| Where to store skills | `registry/` folder in repo | Open source, PR-driven, no ops |
| How to serve to app | jsDelivr CDN (`cdn.jsdelivr.net/gh/...`) | Global CDN, no rate limits, free |
| GitHub API rate limits | Never call it from the app | Use raw file URLs only |
| Single index.json | ❌ Too large at scale | Split into index + category files + meta |
| Supabase | Not at launch | Add when ratings/counts/sync needed |
| Install tracking | Extend existing `skills-lock.json` | Already in repo, right schema |
| TypeScript types | Single `src/lib/registry.ts` | Shared across all pages and Electron |
| Community growth | GitHub topics + PR review | Same model as shadcn/ui, Homebrew |