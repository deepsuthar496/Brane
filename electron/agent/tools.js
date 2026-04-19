const { tool } = require("ai");
const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const glob = require("glob"); // We will use node's native logic or a package. If not installed, we can mock it with fs.readdir
const execAsync = util.promisify(exec);

// Helper for basic globbing
async function findFiles(dir, pattern) {
  const results = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.name === "node_modules" || entry.name === ".git") continue;
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...(await findFiles(fullPath, pattern)));
    } else {
      if (entry.name.includes(pattern) || fullPath.includes(pattern)) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const getTools = (workspacePath) => {
  return {
    read_file: tool({
      description: "Read the contents of a file in the workspace.",
      parameters: z.object({
        path: z.string().describe("Path to the file relative to the workspace root."),
      }),
      execute: async ({ path: relativePath }) => {
        try {
          const absPath = path.resolve(workspacePath, relativePath);
          if (!absPath.startsWith(path.resolve(workspacePath))) {
            return { error: "Access denied. Path is outside the workspace." };
          }
          const content = await fs.readFile(absPath, "utf-8");
          return { content, title: `Read ${relativePath}` };
        } catch (error) {
          return { error: error.message };
        }
      },
    }),

    write_file: tool({
      description: "Write content to a file in the workspace. Replaces the file exactly. Use edit_file for targeted edits.",
      parameters: z.object({
        path: z.string().describe("Path to the file relative to the workspace root."),
        content: z.string().describe("The entire new content of the file."),
      }),
      execute: async ({ path: relativePath, content }) => {
        try {
          const absPath = path.resolve(workspacePath, relativePath);
          if (!absPath.startsWith(path.resolve(workspacePath))) {
            return { error: "Access denied. Path is outside the workspace." };
          }
          await fs.mkdir(path.dirname(absPath), { recursive: true });
          await fs.writeFile(absPath, content, "utf-8");
          return { success: true, title: `Wrote ${relativePath}` };
        } catch (error) {
          return { error: error.message };
        }
      },
    }),

    edit_file: tool({
      description: "Targeted edit: replace a specific string with another in a file. Very precise and safer than overwriting.",
      parameters: z.object({
        path: z.string().describe("Path to the file relative to the workspace root."),
        old_string: z.string().describe("The EXACT old string to replace. Must match perfectly, including whitespace and indentation."),
        new_string: z.string().describe("The new string to insert in place of old_string."),
      }),
      execute: async ({ path: relativePath, old_string, new_string }) => {
        try {
          const absPath = path.resolve(workspacePath, relativePath);
          if (!absPath.startsWith(path.resolve(workspacePath))) {
            return { error: "Access denied. Path is outside the workspace." };
          }
          let content = await fs.readFile(absPath, "utf-8");
          if (!content.includes(old_string)) {
            return { error: "old_string not found in file. Please ensure exact match including whitespace/indentation." };
          }
          const occurences = content.split(old_string).length - 1;
          if (occurences > 1) {
            return { error: "old_string matches multiple times in the file. Please provide more context in old_string to make it unique." };
          }
          content = content.replace(old_string, new_string);
          await fs.writeFile(absPath, content, "utf-8");
          return { success: true, title: `Edited ${relativePath}` };
        } catch (error) {
          return { error: error.message };
        }
      },
    }),

    glob_search: tool({
      description: "Fast file name search using a simple pattern match (e.g., 'auth', 'components'). Use this to find where files are located.",
      parameters: z.object({
        pattern: z.string().describe("The text or pattern to match against file paths."),
      }),
      execute: async ({ pattern }) => {
        try {
          const files = await findFiles(workspacePath, pattern);
          const relativeFiles = files.map(f => path.relative(workspacePath, f).replace(/\\/g, '/'));
          return { files: relativeFiles.slice(0, 100), title: `Found ${relativeFiles.length} files matching '${pattern}'` };
        } catch (error) {
          return { error: error.message };
        }
      },
    }),

    grep_search: tool({
      description: "Search for text patterns inside files across the workspace.",
      parameters: z.object({
        pattern: z.string().describe("The text string or regex to search for in file contents."),
        path: z.string().optional().describe("Optional relative path to restrict the search (e.g., 'src/components')."),
      }),
      execute: async ({ pattern, path: searchPath = "." }) => {
        try {
          // A robust cross-platform grep fallback.
          // In real production we'd use ripgrep, but we fallback to git grep or simple find.
          // using powershell Select-String on Windows, grep on linux.
          const isWin = process.platform === "win32";
          let cmd = '';
          const safePattern = pattern.replace(/"/g, '\\"');
          
          if (isWin) {
            cmd = \`powershell -NoProfile -Command "Select-String -Path '\${searchPath}\\*' -Pattern '\${safePattern}' -Recurse -Exclude node_modules, .git | Select-Object -First 100 | Format-Table -Property Path, LineNumber, Line"\`;
          } else {
            cmd = \`grep -rn "\${safePattern}" \${searchPath} --exclude-dir=node_modules --exclude-dir=.git | head -n 100\`;
          }
          
          const { stdout, stderr } = await execAsync(cmd, { cwd: workspacePath });
          return { 
            results: stdout.toString().trim() || "No matches found.", 
            title: \`Searched for '\${pattern}'\` 
          };
        } catch (error) {
          if (error.code === 1 || error.stdout) {
             // grep returns exit code 1 if no lines match
             return { results: "No matches found.", title: \`Searched for '\${pattern}'\` };
          }
          return { error: error.message };
        }
      },
    }),

    run_bash: tool({
      description: "Run a shell/terminal command in the workspace directory. Use this to run tests, git commands, npm installs, builds, etc.",
      parameters: z.object({
        command: z.string().describe("The command line to run."),
      }),
      execute: async ({ command }) => {
        try {
          const { stdout, stderr } = await execAsync(command, { 
            cwd: workspacePath,
            maxBuffer: 1024 * 1024 * 10 // 10MB
          });
          return { 
            stdout: stdout.toString().slice(0, 10000), 
            stderr: stderr.toString().slice(0, 10000),
            title: \`Run \${command.split(' ')[0]}\`
          };
        } catch (error) {
           return { 
            error: error.message, 
            stdout: error.stdout?.toString().slice(0, 10000),
            stderr: error.stderr?.toString().slice(0, 10000),
            title: \`Failed \${command.split(' ')[0]}\`
          };
        }
      },
    }),
  };
};

module.exports = { getTools };
