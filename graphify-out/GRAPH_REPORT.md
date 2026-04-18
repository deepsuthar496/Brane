# Graph Report - .  (2026-04-18)

## Corpus Check
- Large corpus: 223 files · ~94,462 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder, or use --no-semantic to run AST-only.

## Summary
- 233 nodes · 207 edges · 74 communities detected
- Extraction: 88% EXTRACTED · 12% INFERRED · 0% AMBIGUOUS · INFERRED: 25 edges (avg confidence: 0.81)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Electron Registry Manager|Electron Registry Manager]]
- [[_COMMUNITY_Auto Injector Execution|Auto Injector Execution]]
- [[_COMMUNITY_Knowledge MCP Server|Knowledge MCP Server]]
- [[_COMMUNITY_App Planning & Rationale|App Planning & Rationale]]
- [[_COMMUNITY_UI Select Components|UI Select Components]]
- [[_COMMUNITY_Logs Management|Logs Management]]
- [[_COMMUNITY_MCP Manager|MCP Manager]]
- [[_COMMUNITY_Knowledge Dropzone|Knowledge Dropzone]]
- [[_COMMUNITY_Page Formatting & Drops|Page Formatting & Drops]]
- [[_COMMUNITY_Settings Modal Config|Settings Modal Config]]
- [[_COMMUNITY_UI Breadcrumb Components|UI Breadcrumb Components]]
- [[_COMMUNITY_UI Table Components|UI Table Components]]
- [[_COMMUNITY_Registry Fetch Skills|Registry Fetch Skills]]
- [[_COMMUNITY_CLI Discovery|CLI Discovery]]
- [[_COMMUNITY_Layout Titlebar|Layout Titlebar]]
- [[_COMMUNITY_UI Badge Components|UI Badge Components]]
- [[_COMMUNITY_UI Popover Components|UI Popover Components]]
- [[_COMMUNITY_UI Sidebar Components|UI Sidebar Components]]
- [[_COMMUNITY_Agent Detail Components|Agent Detail Components]]
- [[_COMMUNITY_Agent Provider Context|Agent Provider Context]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]

## God Nodes (most connected - your core abstractions)
1. `readLock()` - 8 edges
2. `listFiles()` - 7 edges
3. `writeLock()` - 6 edges
4. `installMcp()` - 6 edges
5. `readSettings()` - 5 edges
6. `writeSettings()` - 5 edges
7. `addMcpServer()` - 5 edges
8. `removeMcpServer()` - 5 edges
9. `installSkill()` - 5 edges
10. `uninstallMcp()` - 5 edges

## Surprising Connections (you probably didn't know these)
- `handleInstallManual()` --calls--> `addMcpServer()`  [INFERRED]
  src\app\mcps\page.tsx → electron\mcp-manager.js
- `Brane Hub (AgentHub)` --semantically_similar_to--> `Brane AI Command & Control Center`  [INFERRED] [semantically similar]
  APP_PLAN.md → powerplan.md
- `injectKnowledgeMcp()` --calls--> `listFiles()`  [INFERRED]
  electron\auto-injector.js → electron\knowledge-manager.js
- `installMcp()` --calls--> `addMcpServer()`  [INFERRED]
  electron\registry-manager.js → electron\mcp-manager.js
- `uninstallMcp()` --calls--> `removeMcpServer()`  [INFERRED]
  electron\registry-manager.js → electron\mcp-manager.js

## Hyperedges (group relationships)
- **Brane Hub Layered Architecture** — app_plan_electron_main, app_plan_react_renderer, app_plan_ipc_contract_layer [INFERRED 0.85]
- **Three-Tier Fetch Tiers** — powerplan_global_index, powerplan_category_shards, powerplan_item_metadata [EXTRACTED 1.00]

## Communities

### Community 0 - "Electron Registry Manager"
Cohesion: 0.19
Nodes (17): handleCredSubmit(), handleDelete(), handleInstallManual(), handleInstallRegistry(), handleRemove(), handleToggle(), fetchFromUrl(), fetchRegistryData() (+9 more)

### Community 1 - "Auto Injector Execution"
Cohesion: 0.14
Nodes (9): injectKnowledgeMcp(), updateConfig(), installCLI(), startAgent(), stopAgent(), handleInstall(), handleRestartAgent(), handleStartAgent() (+1 more)

### Community 2 - "Knowledge MCP Server"
Cohesion: 0.27
Nodes (9): addFile(), addFileFromPath(), ensureDir(), getFileContent(), listFiles(), removeFile(), callTool(), main() (+1 more)

### Community 3 - "App Planning & Rationale"
Cohesion: 0.17
Nodes (12): Brane Hub (AgentHub), Electron main domain services, Rationale for Electron main orchestrator, SkillDefinition, Brane AI Command & Control Center, Tier 2: Category Shards, Tier 1: Global Index, Tier 3: Item Metadata (+4 more)

### Community 4 - "UI Select Components"
Cohesion: 0.2
Nodes (0): 

### Community 5 - "Logs Management"
Cohesion: 0.29
Nodes (3): addLog(), getLogs(), fetchLogs()

### Community 6 - "MCP Manager"
Cohesion: 0.67
Nodes (6): addMcpServer(), getMcpServers(), readSettings(), removeMcpServer(), toggleMcpServer(), writeSettings()

### Community 7 - "Knowledge Dropzone"
Cohesion: 0.29
Nodes (0): 

### Community 8 - "Page Formatting & Drops"
Cohesion: 0.33
Nodes (0): 

### Community 9 - "Settings Modal Config"
Cohesion: 0.33
Nodes (0): 

### Community 10 - "UI Breadcrumb Components"
Cohesion: 0.5
Nodes (2): BreadcrumbLink(), cn()

### Community 11 - "UI Table Components"
Cohesion: 0.4
Nodes (0): 

### Community 12 - "Registry Fetch Skills"
Cohesion: 0.4
Nodes (2): getRegistryUrls(), SkillDetail()

### Community 13 - "CLI Discovery"
Cohesion: 0.83
Nodes (3): discoverCLIs(), findCommandPath(), getCommandVersion()

### Community 14 - "Layout Titlebar"
Cohesion: 0.5
Nodes (0): 

### Community 15 - "UI Badge Components"
Cohesion: 0.5
Nodes (2): Badge(), cn()

### Community 16 - "UI Popover Components"
Cohesion: 0.5
Nodes (0): 

### Community 17 - "UI Sidebar Components"
Cohesion: 0.5
Nodes (0): 

### Community 18 - "Agent Detail Components"
Cohesion: 0.67
Nodes (0): 

### Community 19 - "Agent Provider Context"
Cohesion: 0.67
Nodes (0): 

### Community 20 - "Community 20"
Cohesion: 0.67
Nodes (0): 

### Community 21 - "Community 21"
Cohesion: 0.67
Nodes (0): 

### Community 22 - "Community 22"
Cohesion: 0.67
Nodes (0): 

### Community 23 - "Community 23"
Cohesion: 0.67
Nodes (0): 

### Community 24 - "Community 24"
Cohesion: 1.0
Nodes (0): 

### Community 25 - "Community 25"
Cohesion: 1.0
Nodes (0): 

### Community 26 - "Community 26"
Cohesion: 1.0
Nodes (0): 

### Community 27 - "Community 27"
Cohesion: 1.0
Nodes (0): 

### Community 28 - "Community 28"
Cohesion: 1.0
Nodes (0): 

### Community 29 - "Community 29"
Cohesion: 1.0
Nodes (0): 

### Community 30 - "Community 30"
Cohesion: 1.0
Nodes (0): 

### Community 31 - "Community 31"
Cohesion: 1.0
Nodes (0): 

### Community 32 - "Community 32"
Cohesion: 1.0
Nodes (0): 

### Community 33 - "Community 33"
Cohesion: 1.0
Nodes (0): 

### Community 34 - "Community 34"
Cohesion: 1.0
Nodes (0): 

### Community 35 - "Community 35"
Cohesion: 1.0
Nodes (0): 

### Community 36 - "Community 36"
Cohesion: 1.0
Nodes (0): 

### Community 37 - "Community 37"
Cohesion: 1.0
Nodes (0): 

### Community 38 - "Community 38"
Cohesion: 1.0
Nodes (0): 

### Community 39 - "Community 39"
Cohesion: 1.0
Nodes (0): 

### Community 40 - "Community 40"
Cohesion: 1.0
Nodes (0): 

### Community 41 - "Community 41"
Cohesion: 1.0
Nodes (0): 

### Community 42 - "Community 42"
Cohesion: 1.0
Nodes (0): 

### Community 43 - "Community 43"
Cohesion: 1.0
Nodes (0): 

### Community 44 - "Community 44"
Cohesion: 1.0
Nodes (0): 

### Community 45 - "Community 45"
Cohesion: 1.0
Nodes (0): 

### Community 46 - "Community 46"
Cohesion: 1.0
Nodes (0): 

### Community 47 - "Community 47"
Cohesion: 1.0
Nodes (0): 

### Community 48 - "Community 48"
Cohesion: 1.0
Nodes (2): CDN-First Distribution Strategy, Rationale for CDN-First Strategy

### Community 49 - "Community 49"
Cohesion: 1.0
Nodes (0): 

### Community 50 - "Community 50"
Cohesion: 1.0
Nodes (0): 

### Community 51 - "Community 51"
Cohesion: 1.0
Nodes (0): 

### Community 52 - "Community 52"
Cohesion: 1.0
Nodes (0): 

### Community 53 - "Community 53"
Cohesion: 1.0
Nodes (0): 

### Community 54 - "Community 54"
Cohesion: 1.0
Nodes (0): 

### Community 55 - "Community 55"
Cohesion: 1.0
Nodes (0): 

### Community 56 - "Community 56"
Cohesion: 1.0
Nodes (0): 

### Community 57 - "Community 57"
Cohesion: 1.0
Nodes (0): 

### Community 58 - "Community 58"
Cohesion: 1.0
Nodes (0): 

### Community 59 - "Community 59"
Cohesion: 1.0
Nodes (0): 

### Community 60 - "Community 60"
Cohesion: 1.0
Nodes (0): 

### Community 61 - "Community 61"
Cohesion: 1.0
Nodes (0): 

### Community 62 - "Community 62"
Cohesion: 1.0
Nodes (1): Presentation layer (React routes/components)

### Community 63 - "Community 63"
Cohesion: 1.0
Nodes (1): IPC contract layer

### Community 64 - "Community 64"
Cohesion: 1.0
Nodes (1): AgentDefinition

### Community 65 - "Community 65"
Cohesion: 1.0
Nodes (1): McpServerDefinition

### Community 66 - "Community 66"
Cohesion: 1.0
Nodes (1): Brane Hub Design System

### Community 67 - "Community 67"
Cohesion: 1.0
Nodes (1): Model Context Protocol (MCP) v1.0

### Community 68 - "Community 68"
Cohesion: 1.0
Nodes (1): Anthropic SKILL.md Open Standard

### Community 69 - "Community 69"
Cohesion: 1.0
Nodes (1): File Icon

### Community 70 - "Community 70"
Cohesion: 1.0
Nodes (1): Globe Icon

### Community 71 - "Community 71"
Cohesion: 1.0
Nodes (1): Next.js Logo SVG

### Community 72 - "Community 72"
Cohesion: 1.0
Nodes (1): Vercel Logo

### Community 73 - "Community 73"
Cohesion: 1.0
Nodes (1): Window Icon

## Knowledge Gaps
- **20 isolated node(s):** `Presentation layer (React routes/components)`, `IPC contract layer`, `AgentDefinition`, `McpServerDefinition`, `SkillDefinition` (+15 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **Thin community `Community 24`** (2 nodes): `test-mcp.js`, `sendNext()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 25`** (2 nodes): `main.js`, `createWindow()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 26`** (2 nodes): `preload.js`, `listener()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 27`** (2 nodes): `RootLayout()`, `layout.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 28`** (2 nodes): `AgentIcon()`, `agent-icon.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 29`** (2 nodes): `KnowledgeCard()`, `knowledge-card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 30`** (2 nodes): `handleOpenSettings()`, `app-sidebar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 31`** (2 nodes): `down()`, `global-command.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 32`** (2 nodes): `handleInstall()`, `mcp-card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 33`** (2 nodes): `SkillCard()`, `skill-card.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 34`** (2 nodes): `cn()`, `avatar.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 35`** (2 nodes): `cn()`, `button.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 36`** (2 nodes): `cn()`, `command.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 37`** (2 nodes): `cn()`, `dropdown-menu.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 38`** (2 nodes): `cn()`, `input-group.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 39`** (2 nodes): `cn()`, `label.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 40`** (2 nodes): `SectionDivider()`, `section-divider.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 41`** (2 nodes): `cn()`, `separator.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 42`** (2 nodes): `Skeleton()`, `skeleton.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 43`** (2 nodes): `status-badge.tsx`, `StatusBadge()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 44`** (2 nodes): `switch.tsx`, `Switch()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 45`** (2 nodes): `tabs.tsx`, `Tabs()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 46`** (2 nodes): `textarea.tsx`, `cn()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 47`** (2 nodes): `use-mobile.ts`, `useIsMobile()`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 48`** (2 nodes): `CDN-First Distribution Strategy`, `Rationale for CDN-First Strategy`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 49`** (1 nodes): `eslint.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 50`** (1 nodes): `next-env.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 51`** (1 nodes): `next.config.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 52`** (1 nodes): `postcss.config.mjs`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 53`** (1 nodes): `page.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 54`** (1 nodes): `agent-list-item.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 55`** (1 nodes): `page-header.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 56`** (1 nodes): `input.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 57`** (1 nodes): `sheet.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 58`** (1 nodes): `sonner.tsx`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 59`** (1 nodes): `navigation.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 60`** (1 nodes): `data.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 61`** (1 nodes): `electron.d.ts`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 62`** (1 nodes): `Presentation layer (React routes/components)`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 63`** (1 nodes): `IPC contract layer`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 64`** (1 nodes): `AgentDefinition`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 65`** (1 nodes): `McpServerDefinition`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 66`** (1 nodes): `Brane Hub Design System`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 67`** (1 nodes): `Model Context Protocol (MCP) v1.0`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 68`** (1 nodes): `Anthropic SKILL.md Open Standard`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 69`** (1 nodes): `File Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 70`** (1 nodes): `Globe Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 71`** (1 nodes): `Next.js Logo SVG`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 72`** (1 nodes): `Vercel Logo`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.
- **Thin community `Community 73`** (1 nodes): `Window Icon`
  Too small to be a meaningful cluster - may be noise or needs more connections extracted.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `handleInstall()` connect `Auto Injector Execution` to `Electron Registry Manager`?**
  _High betweenness centrality (0.030) - this node is a cross-community bridge._
- **Are the 2 inferred relationships involving `listFiles()` (e.g. with `injectKnowledgeMcp()` and `callTool()`) actually correct?**
  _`listFiles()` has 2 INFERRED edges - model-reasoned connections that need verification._
- **Are the 3 inferred relationships involving `installMcp()` (e.g. with `addMcpServer()` and `handleInstallRegistry()`) actually correct?**
  _`installMcp()` has 3 INFERRED edges - model-reasoned connections that need verification._
- **What connects `Presentation layer (React routes/components)`, `IPC contract layer`, `AgentDefinition` to the rest of the system?**
  _20 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Auto Injector Execution` be split into smaller, more focused modules?**
  _Cohesion score 0.14 - nodes in this community are weakly interconnected._