const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const KNOWLEDGE_DIR = path.join(os.homedir(), ".brane", "knowledge");

async function ensureDir() {
  try {
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function listFiles() {
  await ensureDir();
  const files = await fs.readdir(KNOWLEDGE_DIR);
  const details = await Promise.all(
    files.map(async (file) => {
      const stats = await fs.stat(path.join(KNOWLEDGE_DIR, file));
      return {
        id: crypto.createHash("md5").update(file).digest("hex"),
        name: file,
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
        extension: path.extname(file).toLowerCase().replace(".", "")
      };
    })
  );
  return details;
}

async function addFile(name, content) {
  await ensureDir();
  const filePath = path.join(KNOWLEDGE_DIR, name);
  await fs.writeFile(filePath, content);
  return await listFiles();
}

async function addFileFromPath(sourcePath) {
  await ensureDir();
  const name = path.basename(sourcePath);
  const targetPath = path.join(KNOWLEDGE_DIR, name);
  await fs.copyFile(sourcePath, targetPath);
  return await listFiles();
}

async function removeFile(name) {
  const filePath = path.join(KNOWLEDGE_DIR, name);
  try {
    await fs.unlink(filePath);
  } catch (err) {
    // Ignore if already deleted
  }
  return await listFiles();
}

async function getFileContent(name) {
  const filePath = path.join(KNOWLEDGE_DIR, name);
  return await fs.readFile(filePath, "utf-8");
}

module.exports = {
  listFiles,
  addFile,
  addFileFromPath,
  removeFile,
  getFileContent,
  KNOWLEDGE_DIR
};
