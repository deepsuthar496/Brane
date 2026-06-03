const fs = require('fs').promises;
const path = require('path');
const os = require('os');

const CONFIG_DIR = path.join(os.homedir(), '.brane');
const CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');

async function readConfig() {
  try {
    await fs.mkdir(CONFIG_DIR, { recursive: true });
    const data = await fs.readFile(CONFIG_PATH, 'utf-8');
    return JSON.parse(data);
  } catch {
    return {};
  }
}

async function writeConfig(config) {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

async function getGithubToken() {
  const config = await readConfig();
  return config.githubToken || null;
}

async function setGithubToken(token) {
  const config = await readConfig();
  config.githubToken = token;
  await writeConfig(config);
  return true;
}

async function get(key) {
  const config = await readConfig();
  return config[key];
}

async function set(key, value) {
  const config = await readConfig();
  config[key] = value;
  await writeConfig(config);
  return true;
}

async function getRegistryRepo() {
  const config = await readConfig();
  return config.registryRepo || 'deepsuthar496/BraneRegistry';
}

module.exports = {
  getGithubToken,
  setGithubToken,
  getRegistryRepo,
  get,
  set
};
