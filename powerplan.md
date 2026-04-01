# Brane — AI Command & Control Center: Architecture Blueprint

> **Status:** Phase 2 Implementation  
> **Target Release:** Q2 2026  
> **Core Objective:** Establish a unified, high-performance marketplace for AI Skills, MCP Servers, and Prompt Templates with zero-infrastructure overhead.

---

## 1. Executive Summary

Brane is a Next.js + Electron control plane designed to orchestrate heterogeneous AI agents (Claude Code, Gemini CLI, Codex, etc.). This document outlines the transition from a static tool to a dynamic, marketplace-driven ecosystem. By leveraging the **Registry Sharding Pattern**, Brane provides a "Play Store" experience for agent capabilities while maintaining a serverless, PR-driven contribution model.

---

## 2. Technical Stack & Governance

### Framework & Runtime
- **Frontend:** Next.js 15 (App Router), React 19, TypeScript 5.x.
- **Desktop Engine:** Electron 32 (Context Isolated, IPC-driven).
- **Styling:** Vanilla CSS + Tailwind CSS (Hybrid), Radix UI Primitives.
- **State Management:** React Context + Electron-backed persistence.

### Standards Compliance
- **Skill Format:** Anthropic `SKILL.md` Open Standard (Dec 2025).
- **MCP Protocol:** Model Context Protocol (MCP) v1.0.
- **Licensing:** All registry items must be OSI-compliant (MIT, Apache 2.0, BSD).

---

## 3. The Marketplace Architecture

The marketplace is built on a **Three-Tier Fetch Architecture** to ensure sub-100ms UI responsiveness and infinite scalability.

### Tier 1: Global Index (`registry/index.json`)
- **Payload:** ~5KB.
- **Role:** Bootstraps the UI. Contains category definitions, featured items, and total counts.
- **Fetch Frequency:** Once per application launch.

### Tier 2: Category Shards (`registry/skills/{cat}.json`)
- **Payload:** ~20-50KB.
- **Role:** Populates the card grid. Contains search metadata, versioning, and summary descriptions.
- **Fetch Frequency:** Lazy-loaded when a user enters a specific category tab.

### Tier 3: Item Metadata (`registry/skills/{cat}/{id}/meta.json`)
- **Payload:** ~2KB.
- **Role:** Populates the detail view. Contains CHANGELOG, screenshots, and extended documentation.
- **Fetch Frequency:** On-demand when a user clicks a card.

---

## 4. Registry Distribution Strategy

To bypass GitHub API rate limits (60/hr) and ensure global availability, Brane utilizes a CDN-First strategy.

| Channel | URL Pattern | Role | Rate Limit |
|---|---|---|---|
| **Primary (CDN)** | `cdn.jsdelivr.net/gh/user/repo@main` | Production traffic | Unlimited |
| **Fallback (Raw)** | `raw.githubusercontent.com/user/repo/main` | Recovery / Dev | Unlimited |
| **Discovery (API)** | `api.github.com/repos/...` | Nightly sync scripts only | 5,000/hr (Auth) |

### Synchronization Workflow
1. **App Launch:** Fetch `index.json` from jsDelivr.
2. **Tab Navigation:** Fetch Category Shard from jsDelivr.
3. **Detail View:** Fetch `meta.json` from jsDelivr.
4. **Installation:** Download raw content (SKILL.md or MCP Config) directly into local storage.

---

## 5. Local Persistence & Governance

### `skills-lock.json`
The source of truth for the local environment. It tracks the state of every installed capability.

```json
{
  "version": 2,
  "installed": {
    "skills": {
      "docx-gen": { "version": "1.2.0", "enabled": true, "path": "registry/..." }
    },
    "mcps": {
      "github-server": { "version": "1.0.0", "enabled": true, "config": { ... } }
    }
  }
}
```

### Filesystem Layout
- **Skills:** `~/.agents/skills/{id}/SKILL.md`
- **MCP Configs:** Synchronized with `~/.gemini/settings.json` (Gemini) and `~/.claude/claude_desktop_config.json` (Claude).

---

## 6. Implementation Roadmap

### Phase 1: Registry Foundation (COMPLETED)
- [x] Defined sharded JSON schema.
- [x] Implemented CDN-First fetch engine in Electron.
- [x] Established `skills-lock.json` governance.

### Phase 2: Marketplace UI & Skills (IN PROGRESS)
- [x] "Discover" tab implementation for Skills.
- [x] SkillCard and Category Sidebar.
- [ ] Detail view with Markdown rendering for READMEs.

### Phase 3: MCP Marketplace (UPCOMING)
- [ ] **Real MCP Installation:** Implement logic to write MCP configurations from the registry directly into agent settings files.
- [ ] "Discover" tab for MCP Servers.
- [ ] Automated discovery of local executable paths for MCP commands.

### Phase 4: Community & Ecosystem
- [ ] PR-driven contribution guide (`CONTRIBUTING.md`).
- [ ] GitHub Action for nightly "Awesome" list scraping.
- [ ] Skill/MCP submission CLI for developers.

---

## 7. Scaling Considerations

Brane is designed to scale to **10,000+ items** without requiring a database.
1. **GitHub Repository as DB:** PRs serve as the quality gate.
2. **Sharding:** No single JSON file exceeds 1MB.
3. **Supabase Integration:** (Future) Add only for social features (likes, download counts, user reviews).

---
*Created by Brane Core Team — April 2026*