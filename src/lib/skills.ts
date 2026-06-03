import fs from 'fs/promises';
import path from 'path';

// ── Types ────────────────────────────────────────────────────────────────────

export interface SkillInfo {
  name: string;
  description: string;
  location: string;
  content: string;
}

// ── YAML Frontmatter Parser (zero-dependency) ───────────────────────────────

function parseFrontmatter(raw: string): { data: Record<string, string>; content: string } {
  const trimmed = raw.trim();
  const match = trimmed.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
  if (!match) return { data: {}, content: trimmed };

  const data: Record<string, string> = {};
  for (const line of match[1].split('\n')) {
    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;
    const key = line.slice(0, colonIndex).trim();
    const value = line.slice(colonIndex + 1).trim().replace(/^["']|["']$/g, '');
    if (key && value) data[key] = value;
  }

  return { data, content: match[2].trim() };
}

// ── Skill Manager ────────────────────────────────────────────────────────────

export class SkillManager {
  private workspaceRoot: string;
  private skills: Map<string, SkillInfo> = new Map();

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Scan for skills in multiple directories:
   * 1. .agents/ in the workspace (like Gemini CLI)
   * 2. .agents/ in the user's home directory (global skills)
   */
  async discover(): Promise<void> {
    this.skills.clear();

    const homeDir = process.env.USERPROFILE || process.env.HOME || '';
    const scanDirs = [
      // Project-local skills
      path.join(this.workspaceRoot, '.agents'),
      // Global skills (user home)
      path.join(homeDir, '.agents'),
    ];

    console.log(`[Skills] Starting discovery in: ${scanDirs.join(', ')}`);

    for (const dir of scanDirs) {
      try {
        const stats = await fs.stat(dir);
        if (stats.isDirectory()) {
          await this.scanDirectory(dir);
        }
      } catch {
        // Directory doesn't exist, skip silently
      }
    }

    console.log(`[Skills] Discovery finished. Total skills: ${this.skills.size}`);
  }

  /**
   * Recursively scan a directory for SKILL.md files.
   */
  private async scanDirectory(dir: string): Promise<void> {
    let entries;
    try {
      entries = await fs.readdir(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      if (entry.isDirectory()) {
        // Check if this directory contains a SKILL.md
        const skillPath = path.join(fullPath, 'SKILL.md');
        try {
          const raw = await fs.readFile(skillPath, 'utf-8');
          const { data, content } = parseFrontmatter(raw);

          const name = data.name || entry.name;
          const description = data.description || '';

          if (!this.skills.has(name)) {
            console.log(`[Skills] Found skill: ${name} at ${skillPath}`);
            this.skills.set(name, {
              name,
              description,
              location: skillPath,
              content,
            });
          }
        } catch {
          // No SKILL.md in this dir, recurse deeper
          await this.scanDirectory(fullPath);
        }
      }
    }
  }

  /**
   * Get a skill by name.
   */
  get(name: string): SkillInfo | undefined {
    return this.skills.get(name);
  }

  /**
   * Get all discovered skills.
   */
  all(): SkillInfo[] {
    return [...this.skills.values()];
  }

  /**
   * Format skill list for system prompt injection.
   */
  formatForPrompt(): string {
    const list = this.all();
    if (list.length === 0) return '';

    return [
      '## Available Skills',
      'Call the `useSkill` tool with the skill name to load its full instructions.',
      ...list.map(s => `- **${s.name}**: ${s.description}`),
    ].join('\n');
  }
}
