const fs = require("fs").promises;
const path = require("path");
const os = require("os");

const CREDENTIALS_PATH = path.join(os.homedir(), ".brane", "credentials.json");

async function readCredentials() {
  try {
    const data = await fs.readFile(CREDENTIALS_PATH, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    if (error.code === "ENOENT") {
      return {};
    }
    throw error;
  }
}

async function writeCredentials(credentials) {
  const dir = path.dirname(CREDENTIALS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), "utf-8");
}

async function getGithubToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  const credentials = await readCredentials();
  return credentials.GITHUB_TOKEN || null;
}

async function setGithubToken(token) {
  const credentials = await readCredentials();
  credentials.GITHUB_TOKEN = token;
  await writeCredentials(credentials);
  return true;
}

async function getRegistryRepo() {
  const credentials = await readCredentials();
  return credentials.REGISTRY_REPO || "deepsuthar496/Brane";
}

async function setRegistryRepo(repo) {
  const credentials = await readCredentials();
  credentials.REGISTRY_REPO = repo;
  await writeCredentials(credentials);
  return true;
}

module.exports = {
  getGithubToken,
  setGithubToken,
  getRegistryRepo,
  setRegistryRepo
};
