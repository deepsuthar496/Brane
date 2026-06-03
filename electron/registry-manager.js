const fs = require('fs').promises
const path = require('path')
const os = require('os')
const mcpManager = require('./mcp-manager')
const claudeManager = require('./claude-manager')
const configManager = require('./config-manager')


const SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills')
const LOCK_PATH = path.join(__dirname, '..', 'skills-lock.json')

/**
 * Modern helper to fetch data using built-in Node fetch
 */
async function fetchFromUrl(url, token) {
  const options = {
    headers: {
      'User-Agent': 'Brane-Desktop-App',
      'Accept': 'application/json, text/plain, */*'
    }
  }
  
  let fetchUrl = url;

  if (token) {
    options.headers['Authorization'] = `Bearer ${token.trim()}`;
    
    // GitHub raw URLs don't support Auth headers for private repos. Must use API.
    if (url.includes('raw.githubusercontent.com')) {
      // Convert https://raw.githubusercontent.com/user/repo/main/path/to/file
      // to https://api.github.com/repos/user/repo/contents/path/to/file?ref=main
      const match = url.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
      if (match) {
        const [, owner, repo, branch, filePath] = match;
        fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
        options.headers['Accept'] = 'application/vnd.github.v3.raw';
      }
    }
  }

  const response = await fetch(fetchUrl, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${fetchUrl}`);
  }
  
  const text = await response.text();
  return text;
}

/**
 * Public IPC: Fetches registry data with Local-to-CDN-to-Fallback logic
 */
async function fetchRegistryData(urlPair) {
  const token = await configManager.getGithubToken()
  
  // 1. Try CDN first
  try {
    const data = await fetchFromUrl(urlPair.cdn)
    return JSON.parse(data)
  } catch (e) {
    console.warn(`Registry CDN fetch failed (${urlPair.cdn}): ${e.message}`)
    
    // 2. Try Fallback (GitHub Raw) with token
    try {
      console.log(`[Registry] Trying fallback with token for: ${urlPair.fallback}`)
      const data = await fetchFromUrl(urlPair.fallback, token)
      return JSON.parse(data)
    } catch (e2) {
      console.error(`Registry fallback fetch failed: ${urlPair.fallback}`, e2.message)
      throw new Error(`Failed to fetch registry data. CDN error: ${e.message}. Fallback error: ${e2.message}`)
    }
  }
}

async function readLock() {
  try {
    const data = await fs.readFile(LOCK_PATH, 'utf-8')
    const lock = JSON.parse(data)
    if (!lock.installed) {
        lock.installed = { skills: {}, mcps: {}, prompts: {} }
    }
    return lock
  } catch {
    return { version: 2, installed: { skills: {}, mcps: {}, prompts: {} } }
  }
}

async function writeLock(lock) {
  await fs.writeFile(LOCK_PATH, JSON.stringify(lock, null, 2), 'utf-8')
}

async function installSkill(skill) {
  const token = await configManager.getGithubToken();
  const repo = await configManager.getRegistryRepo();
  
  const baseUrl = `https://cdn.jsdelivr.net/gh/${repo}`
  const fallbackUrl = `https://raw.githubusercontent.com/${repo}/main`
  
  let content

  // Try remote
  try {
    const url = `${baseUrl}/registry/${skill.path}/SKILL.md`
    content = await fetchFromUrl(url)
  } catch (e) {
    console.warn(`[Registry] CDN fetch failed (${skill.path}), trying fallback...`, e.message)
    const url = `${fallbackUrl}/registry/${skill.path}/SKILL.md`
    content = await fetchFromUrl(url, token)
  }

  // 2. Write to local skills directory
  const dest = path.join(SKILLS_DIR, skill.id)
  await fs.mkdir(dest, { recursive: true })
  await fs.writeFile(path.join(dest, 'SKILL.md'), content, 'utf-8')

  // Also write to Codex skills directory for codex agent compatibility
  const codexDir = path.join(os.homedir(), '.codex', 'skills', skill.id)
  await fs.mkdir(codexDir, { recursive: true })
  await fs.writeFile(path.join(codexDir, 'SKILL.md'), content, 'utf-8')

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
  await fs.rm(dest, { recursive: true, force: true }).catch(() => {})

  const codexDir = path.join(os.homedir(), '.codex', 'skills', skillId)
  await fs.rm(codexDir, { recursive: true, force: true }).catch(() => {})

  const lock = await readLock()
  delete lock.installed.skills[skillId]
  await writeLock(lock)

  return { success: true }
}

async function installMcp(mcp, targets = ['gemini', 'claude']) {
  const config = {
    command: mcp.command,
    args: mcp.args,
    env: mcp.env || {}
  }
  
  if (mcp.url) {
    config.url = mcp.url
  }

  if (targets.includes('gemini')) {
    await mcpManager.addMcpServer(mcp.id, config)
  }

  if (targets.includes('claude')) {
    try {
      await claudeManager.addMcpServer(mcp.id, config)
    } catch (err) {
      console.error(`Registry: Failed to sync MCP to Claude: ${err.message}`)
    }
  }

  const lock = await readLock()
  lock.installed.mcps[mcp.id] = {
    version: mcp.version || '1.0.0',
    installedAt: new Date().toISOString(),
    sourceCategory: mcp.category,
    enabled: true,
    targets: targets
  }
  await writeLock(lock)

  return { success: true }
}

async function uninstallMcp(mcpId) {
  await mcpManager.removeMcpServer(mcpId)

  try {
    await claudeManager.removeMcpServer(mcpId)
  } catch (err) {
    console.warn(`Registry: Failed to remove MCP from Claude: ${err.message}`)
  }

  const lock = await readLock()
  delete lock.installed.mcps[mcpId]
  await writeLock(lock)

  return { success: true }
}

async function getInstalledSkills() {
  const lock = await readLock()
  return lock.installed.skills || {}
}

async function getInstalledMcps() {
  const lock = await readLock()
  return lock.installed.mcps || {}
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
  fetchRegistryData,
  installSkill,
  uninstallSkill,
  installMcp,
  uninstallMcp,
  getInstalledSkills,
  getInstalledMcps,
  toggleSkill
}
