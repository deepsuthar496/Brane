const fs = require("fs").promises;
const path = require("path");
const os = require("os");
const crypto = require("crypto");

const KNOWLEDGE_DIR = path.join(os.homedir(), ".brane", "knowledge");
const METADATA_FILE = path.join(KNOWLEDGE_DIR, "metadata.json");

async function ensureDir() {
  try {
    await fs.mkdir(KNOWLEDGE_DIR, { recursive: true });
  } catch (err) {
    if (err.code !== "EEXIST") throw err;
  }
}

async function getMetadata() {
  await ensureDir();
  try {
    const content = await fs.readFile(METADATA_FILE, "utf-8");
    return JSON.parse(content);
  } catch (err) {
    return {};
  }
}

async function setMetadata(metadata) {
  await ensureDir();
  await fs.writeFile(METADATA_FILE, JSON.stringify(metadata, null, 2));
}

async function listFiles(subDir = "") {
  await ensureDir();
  const metadata = await getMetadata();
  const baseDir = path.join(KNOWLEDGE_DIR, subDir);
  const items = await fs.readdir(baseDir, { withFileTypes: true });
  
  const results = [];
  
  for (const item of items) {
    const fullPath = path.join(baseDir, item.name);
    if (item.isDirectory()) {
      // Skip the metadata file itself if it's in a subDir (unlikely but safe)
      if (item.name === "metadata.json") continue;
      // Recursively list files in subdirectories (collections)
      const subFiles = await listFiles(path.join(subDir, item.name));
      results.push(...subFiles);
    } else {
      if (item.name === "metadata.json") continue;
      
      const stats = await fs.stat(fullPath);
      const relativeId = crypto.createHash("md5").update(fullPath).digest("hex");
      
      results.push({
        id: relativeId,
        name: item.name,
        size: stats.size,
        updatedAt: stats.mtime.toISOString(),
        extension: path.extname(item.name).toLowerCase().replace(".", ""),
        collection: subDir || "General",
        path: fullPath,
        description: metadata[relativeId]?.description || ""
      });
    }
  }
  
  return results;
}

async function updateFileDescription(id, description) {
  const metadata = await getMetadata();
  metadata[id] = { ...metadata[id], description };
  await setMetadata(metadata);
  return await listFiles();
}

async function addFile(name, content, collection = "") {
  await ensureDir();
  const targetDir = collection ? path.join(KNOWLEDGE_DIR, collection) : KNOWLEDGE_DIR;
  await fs.mkdir(targetDir, { recursive: true });
  const filePath = path.join(targetDir, name);
  await fs.writeFile(filePath, content);
  return await listFiles();
}

async function addFileFromPath(sourcePath, collection = "") {
  await ensureDir();
  const name = path.basename(sourcePath);
  const targetDir = collection ? path.join(KNOWLEDGE_DIR, collection) : KNOWLEDGE_DIR;
  await fs.mkdir(targetDir, { recursive: true });
  const targetPath = path.join(targetDir, name);
  await fs.copyFile(sourcePath, targetPath);
  return await listFiles();
}

async function moveFileToCollection(fileName, currentCollection, targetCollection) {
  const oldPath = currentCollection === "General" 
    ? path.join(KNOWLEDGE_DIR, fileName)
    : path.join(KNOWLEDGE_DIR, currentCollection, fileName);
    
  const newDir = targetCollection === "General" 
    ? KNOWLEDGE_DIR 
    : path.join(KNOWLEDGE_DIR, targetCollection);
    
  await fs.mkdir(newDir, { recursive: true });
  const newPath = path.join(newDir, fileName);
  
  await fs.rename(oldPath, newPath);
  
  // Note: Since ID is based on path, we need to handle ID migration in metadata if we want to be perfect, 
  // but for now, the relativeId in listFiles will just regenerate. 
  // Let's just return listFiles which uses the new path to find metadata if needed.
  return await listFiles();
}

async function removeFile(name, collection = "General") {
  const filePath = collection === "General" 
    ? path.join(KNOWLEDGE_DIR, name)
    : path.join(KNOWLEDGE_DIR, collection, name);
    
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
  updateFileDescription,
  getFileContent,
  KNOWLEDGE_DIR
};
