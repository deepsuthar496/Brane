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
        if (entry.name.toLowerCase().includes(pattern.toLowerCase()) || relPath.toLowerCase().includes(pattern.toLowerCase())) {
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
      description: "Read a file from the workspace.",
      parameters: z.object({
        path: z.string().describe("Relative path to the file.")
      }),
      execute: async ({ path: relPath }) => {
        try {
          const abs = path.resolve(workspacePath, relPath);
          const content = await fs.readFile(abs, "utf-8");
          return { content, title: `Read ${relPath}` };
        } catch (e) { return { error: e.message }; }
      },
    }),

    write_file: tool({
      description: "Create or overwrite a file with full content.",
      parameters: z.object({
        path: z.string().describe("Relative path."),
        content: z.string().describe("Complete file content.")
      }),
      execute: async ({ path: relPath, content }) => {
        try {
          const abs = path.resolve(workspacePath, relPath);
          await fs.mkdir(path.dirname(abs), { recursive: true });
          await fs.writeFile(abs, content, "utf-8");
          return { success: true, title: `Wrote ${relPath}` };
        } catch (e) { return { error: e.message }; }
      },
    }),

    edit_file: tool({
      description: "Surgical search and replace. Use for precise code changes.",
      parameters: z.object({
        path: z.string().describe("Relative path to the file."),
        old_string: z.string().describe("Exact string to find."),
        new_string: z.string().describe("String to replace with.")
      }),
      execute: async ({ path: relPath, old_string, new_string }) => {
        try {
          const abs = path.resolve(workspacePath, relPath);
          let content = await fs.readFile(abs, "utf-8");
          if (!content.includes(old_string)) return { error: "Exact string not found." };
          content = content.replace(old_string, new_string);
          await fs.writeFile(abs, content, "utf-8");
          return { success: true, title: `Edited ${relPath}` };
        } catch (e) { return { error: e.message }; }
      },
    }),

    glob_search: tool({
      description: "Find files by name pattern. Use '.' to list all files.",
      parameters: z.object({ 
        pattern: z.string().describe("The search pattern (e.g. 'auth', 'components', or '.')")
      }),
      execute: async ({ pattern }) => {
        try {
          const files = await findFiles(workspacePath, pattern === "." ? "" : pattern);
          const rels = files.map(f => path.relative(workspacePath, f).replace(/\\/g, '/'));
          return { files: rels.slice(0, 100), title: `Found ${rels.length} files` };
        } catch (e) { return { error: e.message }; }
      },
    }),

    grep_search: tool({
      description: "Search for text inside files.",
      parameters: z.object({
        pattern: z.string().describe("The text or regex to search for.")
      }),
      execute: async ({ pattern }) => {
        try {
          const isWin = process.platform === "win32";
          const safePattern = pattern.replace(/"/g, '\\"');
          const cmd = isWin 
            ? `powershell -NoProfile -Command "Select-String -Path '*.*' -Pattern '${safePattern}' -Recurse -Exclude node_modules, .git, .next | Select-Object -First 100 | ForEach-Object { \\"$(\$_.Path):$($_.LineNumber):$(\$_.Line)\\" }"`
            : `grep -rn "${safePattern}" . --exclude-dir={node_modules,.git,.next} | head -n 100`;
          const { stdout } = await execAsync(cmd, { cwd: workspacePath });
          return { results: stdout.trim() || "No matches.", title: `Searched for '${pattern}'` };
        } catch (e) { return { results: "No matches.", title: `Searched for '${pattern}'` }; }
      },
    }),

    run_bash: tool({
      description: "Run a terminal command (npm, git, test, etc.). Non-interactive ONLY.",
      parameters: z.object({ 
        command: z.string().describe("The shell command to execute.")
      }),
      execute: async ({ command }) => {
        try {
          const { stdout, stderr } = await execAsync(command, { cwd: workspacePath, maxBuffer: 10 * 1024 * 1024 });
          return { stdout, stderr, title: `Ran: ${command.split(' ')[0]}` };
        } catch (e) { return { error: e.message, stdout: e.stdout, stderr: e.stderr, title: `Failed: ${command.split(' ')[0]}` }; }
      },
    }),

    activate_skill: tool({
      description: "Load a specialized skill's instructions.",
      parameters: z.object({ 
        name: z.string().describe("The exact name of the skill.")
      }),
      execute: async ({ name }) => {
        try {
          const appRoot = path.resolve(__dirname, "../../");
          const lock = JSON.parse(await fs.readFile(path.join(appRoot, "skills-lock.json"), "utf-8"));
          const skillPath = path.join(appRoot, lock.installed.skills[name].path);
          return { instructions: `<activated_skill name="${name}">\n${await fs.readFile(skillPath, "utf-8")}\n</activated_skill>`, title: `Activated ${name}` };
        } catch (e) { return { error: e.message }; }
      },
    }),
  };
};

module.exports = { getTools };
