const fs = require('fs').promises
const path = require('path')
const os = require('os')
const https = require('https')
const credentialsManager = require('./credentials-manager')
const mcpManager = require('./mcp-manager')

const SKILLS_DIR = path.join(os.homedir(), '.agents', 'skills')
const LOCK_PATH = path.join(__dirname, '..', 'skills-lock.json')

/**
 * Helper to fetch text or JSON from a URL with optional token
 */
async function fetchFromUrl(url, token) {
  const options = {
    headers: {
      'User-Agent': 'Brane-Desktop-App'
    }
  }
  
  if (token) {
    options.headers['Authorization'] = `token ${token}`
  }

  return new Promise((resolve, reject) => {
    https.get(url, options, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirects (common for GitHub/jsDelivr)
        return fetchFromUrl(res.headers.location, token).then(resolve).catch(reject)
      }

      if (res.statusCode >= 400) {
        return reject(new Error(`HTTP ${res.statusCode}: ${url}`))
      }

      let data = ''
      res.on('data', chunk => data += chunk)
      res.on('end', () => resolve(data))
    }).on('error', (err) => {
      reject(err)
    })
  })
}

/**
 * Public IPC: Fetches registry data with Local-to-CDN-to-Fallback logic
 */
async function fetchRegistryData(urlPair) {
  const token = await credentialsManager.getGithubToken()
  
  // 0. Try local first (useful for development)
  try {
    const registryMatch = urlPair.cdn.match(/\/registry\/(.+)$/)
    if (registryMatch) {
      const relativePath = registryMatch[1]
      const localPath = path.join(__dirname, '..', 'registry', relativePath)
      const data = await fs.readFile(localPath, 'utf-8')
      console.log(`[Registry] Loading local file: ${localPath}`)
      return JSON.parse(data)
    }
  } catch (e) {
    // Local file not found or error, continue to remote
  }

  // 1. Try CDN first
  try {
    const data = await fetchFromUrl(urlPair.cdn)
    return JSON.parse(data)
  } catch (e) {
    console.warn(`Registry CDN fetch failed, trying fallback: ${urlPair.fallback}`, e.message)
    
    // 2. Try Fallback (GitHub Raw) with token
    try {
      const data = await fetchFromUrl(urlPair.fallback, token)
      return JSON.parse(data)
    } catch (e2) {
      console.error(`Registry fallback fetch failed: ${urlPair.fallback}`, e2.message)
      throw new Error(`Failed to fetch registry data from both CDN and Fallback.`)
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
  const token = await credentialsManager.getGithubToken()
  const repo = await credentialsManager.getRegistryRepo()
  
  const baseUrl = `https://cdn.jsdelivr.net/gh/${repo}`
  const fallbackUrl = `https://raw.githubusercontent.com/${repo}/main`
  
  // 1. Fetch the SKILL.md content
  let content

  // Try local first
  try {
    const localPath = path.join(__dirname, '..', skill.path)
    content = await fs.readFile(localPath, 'utf-8')
    console.log(`[Registry] Installing skill from local: ${localPath}`)
  } catch (e) {
    // Local file not found, try remote
    try {
      const url = `${baseUrl}/${skill.path}`
      content = await fetchFromUrl(url)
    } catch (e) {
      console.warn("CDN fetch failed during install, trying fallback...", e.message)
      const url = `${fallbackUrl}/${skill.path}`
      content = await fetchFromUrl(url, token)
    }
  }

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
  await fs.rm(dest, { recursive: true, force: true }).catch(() => {})

  const lock = await readLock()
  delete lock.installed.skills[skillId]
  await writeLock(lock)

  return { success: true }
}

async function installMcp(mcp) {
  // 1. Prepare configuration for mcp-manager
  const config = {
    command: mcp.command,
    args: mcp.args,
    env: mcp.env || {}
  }
  
  if (mcp.url) {
    config.url = mcp.url
  }

  // 2. Add to Gemini CLI settings via mcp-manager
  await mcpManager.addMcpServer(mcp.id, config)

  // 3. Update skills-lock.json to track it came from registry
  const lock = await readLock()
  lock.installed.mcps[mcp.id] = {
    version: mcp.version || '1.0.0',
    installedAt: new Date().toISOString(),
    sourceCategory: mcp.category,
    enabled: true
  }
  await writeLock(lock)

  return { success: true }
}

async function uninstallMcp(mcpId) {
  // 1. Remove from Gemini CLI settings
  await mcpManager.removeMcpServer(mcpId)

  // 2. Update skills-lock.json
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
