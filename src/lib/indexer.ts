import fs from 'fs/promises';
import path from 'path';

export interface CodeNode {
  id: string;
  name: string;
  kind: 'function' | 'class' | 'interface' | 'type' | 'variable';
  filePath: string;
  line: number;
}

export interface CodebaseIndex {
  nodes: CodeNode[];
  fileStructure: Record<string, string[]>; // directory path -> file names
  lastUpdated: number;
}

const IGNORE_DIRS = ['node_modules', '.git', '.next', 'dist', 'build', '.brane', 'public'];
const SUPPORTED_EXTS = ['.ts', '.tsx', '.js', '.jsx'];

export class BraneIndexer {
  private workspaceRoot: string;
  private indexPath: string;
  private cache: CodebaseIndex | null = null;

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
    this.indexPath = path.join(workspaceRoot, '.brane', 'codebase.index.json');
  }

  private async ensureDir() {
    const dir = path.dirname(this.indexPath);
    try {
      await fs.access(dir);
    } catch {
      await fs.mkdir(dir, { recursive: true });
    }
  }

  public async loadIndex(): Promise<CodebaseIndex | null> {
    if (this.cache) return this.cache;
    try {
      const data = await fs.readFile(this.indexPath, 'utf-8');
      this.cache = JSON.parse(data);
      return this.cache;
    } catch {
      return null;
    }
  }

  public async saveIndex(index: CodebaseIndex) {
    this.cache = index;
    await this.ensureDir();
    await fs.writeFile(this.indexPath, JSON.stringify(index, null, 2), 'utf-8');
  }

  private extractSymbols(content: string, filePath: string): CodeNode[] {
    const nodes: CodeNode[] = [];
    const lines = content.split('\n');
    const relativePath = path.relative(this.workspaceRoot, filePath).replace(/\\/g, '/');

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      // Match: (export)? function foo
      const fnMatch = line.match(/(?:export\s+)?(?:async\s+)?function\s+([a-zA-Z0-9_]+)/);
      if (fnMatch) {
        nodes.push({ id: `${relativePath}#${fnMatch[1]}`, name: fnMatch[1], kind: 'function', filePath: relativePath, line: i + 1 });
        continue;
      }

      // Match: (export)? class Foo
      const classMatch = line.match(/(?:export\s+)?class\s+([a-zA-Z0-9_]+)/);
      if (classMatch) {
        nodes.push({ id: `${relativePath}#${classMatch[1]}`, name: classMatch[1], kind: 'class', filePath: relativePath, line: i + 1 });
        continue;
      }

      // Match: (export)? interface/type Foo
      const typeMatch = line.match(/(?:export\s+)?(?:interface|type)\s+([a-zA-Z0-9_]+)/);
      if (typeMatch) {
        nodes.push({ id: `${relativePath}#${typeMatch[1]}`, name: typeMatch[1], kind: typeMatch[1].startsWith('i') && typeMatch[0].includes('interface') ? 'interface' : 'type', filePath: relativePath, line: i + 1 });
        continue;
      }

      // Match: (export)? const foo = (args) => {
      const arrowMatch = line.match(/(?:export\s+)?const\s+([a-zA-Z0-9_]+)\s*=\s*(?:async\s+)?(?:\([^)]*\)|[a-zA-Z0-9_]+)\s*=>/);
      if (arrowMatch) {
        nodes.push({ id: `${relativePath}#${arrowMatch[1]}`, name: arrowMatch[1], kind: 'function', filePath: relativePath, line: i + 1 });
        continue;
      }

      // Match: export const foo =
      const varMatch = line.match(/export\s+(?:const|let|var)\s+([a-zA-Z0-9_]+)\s*(?:=|:)/);
      if (varMatch) {
        nodes.push({ id: `${relativePath}#${varMatch[1]}`, name: varMatch[1], kind: 'variable', filePath: relativePath, line: i + 1 });
      }
    }

    return nodes;
  }

  public async buildIndex(): Promise<CodebaseIndex> {
    const nodes: CodeNode[] = [];
    const fileStructure: Record<string, string[]> = {};

    const walk = async (dir: string) => {
      let entries;
      try {
        entries = await fs.readdir(dir, { withFileTypes: true });
      } catch {
        return;
      }

      const relativeDir = path.relative(this.workspaceRoot, dir).replace(/\\/g, '/') || '.';
      fileStructure[relativeDir] = [];

      for (const entry of entries) {
        if (IGNORE_DIRS.includes(entry.name)) continue;

        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          fileStructure[relativeDir].push(`[DIR] ${entry.name}`);
          await walk(fullPath);
        } else {
          fileStructure[relativeDir].push(`[FILE] ${entry.name}`);
          const ext = path.extname(entry.name);
          if (SUPPORTED_EXTS.includes(ext)) {
            try {
              const content = await fs.readFile(fullPath, 'utf-8');
              const fileNodes = this.extractSymbols(content, fullPath);
              nodes.push(...fileNodes);
            } catch {
              // ignore read errors
            }
          }
        }
      }
    };

    await walk(this.workspaceRoot);

    const index: CodebaseIndex = {
      nodes,
      fileStructure,
      lastUpdated: Date.now()
    };

    await this.saveIndex(index);
    return index;
  }

  public async search(query: string): Promise<CodeNode[]> {
    const index = await this.loadIndex() || await this.buildIndex();
    const q = query.toLowerCase();
    
    // exact match priority
    const exactMatches = index.nodes.filter(n => n.name.toLowerCase() === q);
    if (exactMatches.length > 0) return exactMatches;

    // partial matches
    return index.nodes.filter(n => n.name.toLowerCase().includes(q)).slice(0, 10);
  }

  public async getStructure(targetPath: string = '.'): Promise<string> {
    const index = await this.loadIndex() || await this.buildIndex();
    // Clean path formatting to match the structure keys
    let cleanPath = targetPath.replace(/\\/g, '/');
    if (cleanPath.startsWith('./')) cleanPath = cleanPath.slice(2);
    if (cleanPath === '') cleanPath = '.';

    const entries = index.fileStructure[cleanPath];
    if (!entries) return `Directory not found in index or empty: ${cleanPath}`;
    
    let result = entries;
    if (result.length > 150) {
      result = result.slice(0, 150);
      result.push('... (truncated: too many files)');
    }
    return result.length > 0 ? result.join('\n') : '(empty directory)';
  }
}
