const fs = require("fs/promises");
const path = require("path");

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea']);

async function buildFileTree(dirPath, rootPath = dirPath) {
  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    
    // Sort directories first, then files
    const sortedEntries = entries.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const children = [];
    
    for (const entry of sortedEntries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      
      const fullPath = path.join(dirPath, entry.name);
      const relativePath = path.relative(rootPath, fullPath).replace(/\\/g, '/');
      
      const node = {
        name: entry.name,
        path: relativePath,
        type: entry.isDirectory() ? "directory" : "file",
      };

      if (entry.isDirectory()) {
        node.children = await buildFileTree(fullPath, rootPath);
      } else {
        // Very basic language mapping from extension
        const ext = path.extname(entry.name).toLowerCase();
        let language = 'text';
        if (ext === '.ts' || ext === '.tsx') language = 'typescript';
        else if (ext === '.js' || ext === '.jsx') language = 'javascript';
        else if (ext === '.json') language = 'json';
        else if (ext === '.md') language = 'markdown';
        else if (ext === '.html') language = 'html';
        else if (ext === '.css') language = 'css';
        else if (ext === '.py') language = 'python';
        else if (ext === '.rs') language = 'rust';
        else if (ext === '.go') language = 'go';
        
        node.language = language;
      }
      
      children.push(node);
    }
    
    return children;
  } catch (error) {
    console.error('Error building file tree:', error);
    return [];
  }
}

async function readFileTree(workspacePath) {
  if (!workspacePath) return [];
  return await buildFileTree(workspacePath);
}

module.exports = {
  readFileTree
};
