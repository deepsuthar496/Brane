/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const { safeStorage } = require("electron");

const CREDENTIALS_PATH = path.join(os.homedir(), ".brane", "credentials.json");

async function readCredentialsFile() {
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

async function writeCredentialsFile(credentials) {
  const dir = path.dirname(CREDENTIALS_PATH);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(CREDENTIALS_PATH, JSON.stringify(credentials, null, 2), "utf-8");
}

async function getAllCredentials() {
  const fileData = await readCredentialsFile();
  const credentials = [];

  for (const [key, value] of Object.entries(fileData)) {
    if (key === "REGISTRY_REPO") continue; // Skip configuration settings

    let decryptedValue = null;
    if (value && typeof value === "object" && value.encrypted) {
      if (safeStorage.isEncryptionAvailable()) {
        try {
          const buffer = Buffer.from(value.data, "hex");
          decryptedValue = safeStorage.decryptString(buffer);
        } catch (e) {
          console.error(`Failed to decrypt credential ${key}:`, e);
        }
      }
    } else {
      decryptedValue = value;
    }

    if (decryptedValue) {
      credentials.push({
        id: key.toLowerCase(),
        name: key.replace(/_/g, " "),
        envVar: key,
        value: decryptedValue,
        // We'll construct the full object in the frontend or here
      });
    }
  }

  return credentials;
}

async function saveCredential(key, value) {
  const credentials = await readCredentialsFile();
  
  if (value && safeStorage.isEncryptionAvailable()) {
    const encrypted = safeStorage.encryptString(value);
    credentials[key] = {
      encrypted: true,
      data: encrypted.toString("hex")
    };
  } else {
    credentials[key] = value;
  }

  await writeCredentialsFile(credentials);
  return true;
}

async function deleteCredential(key) {
  const credentials = await readCredentialsFile();
  delete credentials[key];
  await writeCredentialsFile(credentials);
  return true;
}

async function getGithubToken() {
  if (process.env.GITHUB_TOKEN) {
    return process.env.GITHUB_TOKEN;
  }
  const credentials = await readCredentialsFile();
  const token = credentials.GITHUB_TOKEN || null;

  if (token && typeof token === "object" && token.encrypted) {
    if (safeStorage.isEncryptionAvailable()) {
      try {
        const buffer = Buffer.from(token.data, "hex");
        return safeStorage.decryptString(buffer);
      } catch (e) {
        console.error("Failed to decrypt GitHub token:", e);
        return null;
      }
    } else {
      console.warn("Encryption not available, cannot decrypt GitHub token");
      return null;
    }
  }

  return token;
}

async function setGithubToken(token) {
  return await saveCredential("GITHUB_TOKEN", token);
}

async function getRegistryRepo() {
  const credentials = await readCredentialsFile();
  return credentials.REGISTRY_REPO || "deepsuthar496/Brane";
}

async function setRegistryRepo(repo) {
  const credentials = await readCredentialsFile();
  credentials.REGISTRY_REPO = repo;
  await writeCredentialsFile(credentials);
  return true;
}

module.exports = {
  getAllCredentials,
  saveCredential,
  deleteCredential,
  getGithubToken,
  setGithubToken,
  getRegistryRepo,
  setRegistryRepo
};
