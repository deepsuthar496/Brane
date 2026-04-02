# Brane Hub Project Progress

This document tracks the implementation status of all major features within Brane Hub. It serves as a master checklist for current status and future milestones.

## 1. Core Architecture
- [x] **Next.js + Electron Setup**
  - [x] Frameless window, titlebar, and navigation sidebar
  - [x] IPC bridge between renderer and main process
- [x] **Persistence Layer**
  - [x] Settings storage in `~/.gemini/settings.json` (for Gemini CLI)
  - [x] Credentials storage in `~/.brane/credentials.json`
  - [x] Registry-to-local synchronization (Local-to-CDN-to-Fallback)
- [x] **Registry Support**
  - [x] Skills registry support
  - [x] MCP registry support (System, Community, etc.)
  - [x] Local development fallback (Loading `registry/` folder files first)

## 2. MCP Servers
- [x] **Gemini CLI Support**
  - [x] Enable/Disable servers
  - [x] Manual MCP installation
  - [x] Registry-based MCP installation (Marketplace)
  - [x] Support for environment variables and command arguments
  - [x] Optional credential support (e.g., Supabase `PROJECT_REF`)
- [ ] **Claude Code Support**
  - [ ] Research configuration path (`claude_desktop_config.json`)
  - [ ] Implement adapter in `electron/mcp-manager.js`
- [ ] **Codex/OpenAI Support**
  - [ ] Identify configuration schemas and paths

## 3. Skills Management
- [x] **Registry Integration**
  - [x] Discovery from remote/local repository
  - [x] Skill-level installation (Downloading `SKILL.md`)
- [x] **Local Tracking**
  - [x] `skills-lock.json` for installed skills tracking
- [ ] **Advanced Skill Logic**
  - [ ] Capability-based mapping to CLI agents
  - [ ] Automatic skill enabling/disabling per CLI scope

## 4. Credentials & Security
- [x] **Management UI**
  - [x] Secure entry of API keys (GitHub, etc.)
  - [x] Status indicator for configured credentials
- [ ] **Security Hardening**
  - [ ] Bridge to OS Keychain (macOS Keychain, Windows Credential Manager)
  - [ ] Encrypted storage for non-keychain credentials

## 5. Agents & CLIs
- [x] **Discovery**
  - [x] Local CLI discovery logic (Gemini, Claude, etc.)
- [ ] **Runtime Management**
  - [ ] Start/Stop/Restart agents from UI
  - [ ] Real-time process health monitoring
  - [ ] Log streaming/Terminal panel

## 6. Logs & Activity
- [ ] **Event Timeline**
  - [ ] Track config changes, installations, and removals
- [ ] **Log Viewer**
  - [ ] Searchable, filtered logs across all managed agents

---

## Technical Notes
- **Current CLI Scope:** Currently, the system is optimized for **Gemini CLI**. Adding more CLIs requires implementing dedicated adapters in `electron/mcp-manager.js`.
- **Registry Source:** Defaults to `deepsuthar496/Brane` GitHub repository, but can be configured in settings. Local development is supported by placing files in the `registry/` directory.
