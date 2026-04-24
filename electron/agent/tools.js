const { tool } = require("ai");
const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea', 'out']);

async function findFiles(dir, pattern, root = dir) {
  const results = [];
  try {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_DIRS.has(entry.name)) continue;
      const fullPath = path.join(dir, entry.name);
      const relPath = path.relative(root, fullPath).replace(/\\/g, '/');
      if (entry.isDirectory()) {
        results.push(...(await findFiles(fullPath, pattern, root)));
      } else {
        if (!pattern || entry.name.toLowerCase().includes(pattern.toLowerCase()) || relPath.toLowerCase().includes(pattern.toLowerCase())) {
          results.push(fullPath);
        }
      }
      if (results.length > 500) break;
    }
  } catch {}
  return results;
}

const getTools = (workspacePath) => {
  return {
    read_file: tool({
      description: "Read the full content of a file from the workspace. Use this to examine code or configuration.",
      parameters: z.object({
        path: z.string().describe("Relative path to the file from the workspace root.")
      }).strict(),
      execute: async ({ path: relPath }) => {
        try {
          const abs = path.resolve(workspacePath, relPath);
          const content = await fs.readFile(abs, "utf-8");
          return { content, path: relPath };
        } catch (e) {
          return { error: `Failed to read file: ${e.message}` };
        }
      },
    }),

    write_file: tool({
      description: "Create a new file or overwrite an existing one with the provided content.",
      parameters: z.object({
        path: z.string().describe("Relative path to the file."),
        content: z.string().describe("Full content to write to the file.")
      }).strict(),
      execute: async ({ path: relPath, content }) => {
        try {
          const abs = path.resolve(workspacePath, relPath);
          await fs.mkdir(path.dirname(abs), { recursive: true });
          await fs.writeFile(abs, content, "utf-8");
          return { success: true, path: relPath };
        } catch (e) {
          return { error: `Failed to write file: ${e.message}` };
        }
      },
    }),

    edit_file: tool({
      description: "Apply a search-and-replace edit to a file. Provide the exact string to find and the replacement string. This is safer than write_file for large files.",
      parameters: z.object({
        path: z.string().describe("Relative path to the file."),
        old_string: z.string().describe("The exact text block to search for."),
        new_string: z.string().describe("The text block to replace it with.")
      }).strict(),
      execute: async ({ path: relPath, old_string, new_string }) => {
        try {
          const abs = path.resolve(workspacePath, relPath);
          let content = await fs.readFile(abs, "utf-8");
          if (!content.includes(old_string)) {
             return { error: "Could not find the exact string to replace. Ensure the 'old_string' matches exactly, including indentation and whitespace." };
          }
          content = content.replace(old_string, new_string);
          await fs.writeFile(abs, content, "utf-8");
          return { success: true, path: relPath };
        } catch (e) {
          return { error: `Failed to edit file: ${e.message}` };
        }
      },
    }),

    glob_search: tool({
      description: "Search for files by name or pattern. Useful for finding files when you don't know the exact path.",
      parameters: z.object({ 
        pattern: z.string().describe("A keyword or pattern to match against filenames (e.g., 'auth', 'Button', '.tsx'). Use '.' to list all files.")
      }).strict(),
      execute: async ({ pattern }) => {
        try {
          const files = await findFiles(workspacePath, pattern === "." ? "" : pattern);
          const rels = files.map(f => path.relative(workspacePath, f).replace(/\\/g, '/'));
          return {
            files: rels.slice(0, 100),
            total_found: rels.length,
            message: rels.length > 100 ? "Showing first 100 results." : undefined
          };
        } catch (e) {
          return { error: `Search failed: ${e.message}` };
        }
      },
    }),

    grep_search: tool({
      description: "Search for specific text content across all files in the workspace (excluding ignored directories like node_modules).",
      parameters: z.object({
        pattern: z.string().describe("The text or regex to search for.")
      }).strict(),
      execute: async ({ pattern }) => {
        try {
          const isWin = process.platform === "win32";
          const safePattern = pattern.replace(/"/g, '\\"');
          // Simplified command to avoid escaping issues
          const cmd = isWin 
            ? `powershell -NoProfile -Command "Select-String -Path '*.*' -Pattern '${safePattern}' -Recurse -Exclude node_modules, .git, .next | Select-Object -First 100 | ForEach-Object { \\"$(\$_.Path):$($_.LineNumber):$(\$_.Line)\\" }"`
            : `grep -rn "${safePattern}" . --exclude-dir={node_modules,.git,.next,.vscode,.idea,dist,build,out} | head -n 100`;

          const { stdout } = await execAsync(cmd, { cwd: workspacePath });
          const results = stdout.trim();
          return {
            results: results || "No matches found.",
            pattern: pattern
          };
        } catch (e) {
          return { results: "No matches found or search failed.", error: e.message };
        }
      },
    }),

    run_bash: tool({
      description: "Execute a shell command in the workspace. Use this for running tests, installing dependencies (if necessary), or other CLI tasks. Non-interactive commands only.",
      parameters: z.object({ 
        command: z.string().describe("The command to run.")
      }).strict(),
      execute: async ({ command }) => {
        try {
          const { stdout, stderr } = await execAsync(command, {
            cwd: workspacePath,
            maxBuffer: 10 * 1024 * 1024 // 10MB buffer
          });
          return {
            stdout: stdout.trim(),
            stderr: stderr.trim(),
            exit_code: 0
          };
        } catch (e) {
          return {
            error: e.message,
            stdout: e.stdout?.trim(),
            stderr: e.stderr?.trim(),
            exit_code: e.code
          };
        }
      },
    }),

    activate_skill: tool({
      description: "Activate a specialized skill by loading its specific instructions into context. Use this when the user asks for a task that matches an available skill.",
      parameters: z.object({ 
        name: z.string().describe("The exact name of the skill to activate.")
      }).strict(),
      execute: async ({ name }) => {
        try {
          const appRoot = path.resolve(__dirname, "../../");
          const lock = JSON.parse(await fs.readFile(path.join(appRoot, "skills-lock.json"), "utf-8"));
          if (!lock.installed?.skills?.[name]) {
            return { error: `Skill '${name}' is not installed.` };
          }
          const skillPath = path.join(appRoot, lock.installed.skills[name].path);
          const instructions = await fs.readFile(skillPath, "utf-8");
          return {
            instructions: `<activated_skill name="${name}">\n${instructions}\n</activated_skill>`,
            message: `Skill '${name}' activated successfully.`
          };
        } catch (e) {
          return { error: `Failed to activate skill: ${e.message}` };
        }
      },
    }),
  };
};

module.exports = { getTools };
