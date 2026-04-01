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
  await fs.rm(dest, { recursive: true, force: true }).catch(() => {})

  const lock = await readLock()
  delete lock.installed.skills[skillId]
  await writeLock(lock)

  return { success: true }
}

async function getInstalledSkills() {
  const lock = await readLock()
  return lock.installed.skills || {}
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
