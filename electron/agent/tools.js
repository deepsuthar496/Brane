const { tool } = require("ai");
const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

const IGNORED_DIRS = new Set(['node_modules', '.git', '.next', 'dist', 'build', '.vscode', '.idea', 'out']);

// Improved helper for basic globbing with better exclusion
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
      
      // Limit to prevent massive results slowing down the agent
      if (results.length > 500) break;
    }
  } catch (e) {
    // Ignore read errors for specific files
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
          const isWin = process.platform === "win32";
          let cmd = '';
          const safePattern = pattern.replace(/"/g, '\\"');
          
          if (isWin) {
            cmd = `powershell -NoProfile -Command "Select-String -Path '${searchPath}\\*' -Pattern '${safePattern}' -Recurse -Exclude node_modules, .git, .next, dist, build | Select-Object -First 100 | Format-Table -Property Path, LineNumber, Line"`;
          } else {
            cmd = `grep -rn "${safePattern}" ${searchPath} --exclude-dir={node_modules,.git,.next,dist,build} | head -n 100`;
          }
          
          const { stdout, stderr } = await execAsync(cmd, { cwd: workspacePath });
          return { 
            results: stdout.toString().trim() || "No matches found.", 
            title: `Searched for '${pattern}'` 
          };
        } catch (error) {
          if (error.code === 1 || error.stdout) {
             return { results: "No matches found.", title: `Searched for '${pattern}'` };
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
            title: `Run ${command.split(' ')[0]}`
          };
        } catch (error) {
           return { 
            error: error.message, 
            stdout: error.stdout?.toString().slice(0, 10000),
            stderr: error.stderr?.toString().slice(0, 10000),
            title: `Failed ${command.split(' ')[0]}`
          };
        }
      },
    }),

    activate_skill: tool({
      description: "Activates a specialized agent skill by name. Returns the skill's instructions wrapped in <activated_skill> tags. Use this when you identify a task that matches a skill's description in the <available_skills> block.",
      parameters: z.object({
        name: z.string().describe("The name of the skill to activate (e.g. 'deploy-to-vercel')."),
      }),
      execute: async ({ name }) => {
        try {
          // Skills are defined in Brane's central skills lockfile or directory
          // Read from registry/skills/ to find the SKILL.md
          // In a real app we'd parse the lockfile to get the exact path, but we can also just search for it or construct the path.
          
          const appRoot = path.resolve(__dirname, "../../"); 
          const skillsLockPath = path.join(appRoot, "skills-lock.json");
          let skillPath = null;
          
          try {
             const lockData = await fs.readFile(skillsLockPath, "utf-8");
             const lockJson = JSON.parse(lockData);
             if (lockJson.installed && lockJson.installed.skills && lockJson.installed.skills[name]) {
                skillPath = path.join(appRoot, lockJson.installed.skills[name].path);
             }
          } catch (e) {
             console.error("Could not read skills-lock.json", e);
          }
          
          // Fallback simple search if lockfile lookup fails
          if (!skillPath) {
             const fallbackPaths = await findFiles(path.join(appRoot, "registry", "skills"), "SKILL.md");
             skillPath = fallbackPaths.find(p => p.includes(`/${name}/`) || p.includes(`\\${name}\\`));
          }

          if (!skillPath) {
             return { error: `Skill '${name}' not found.` };
          }
          
          const content = await fs.readFile(skillPath, "utf-8");
          return { 
            instructions: `<activated_skill name="${name}">\n  <instructions>\n${content}\n  </instructions>\n</activated_skill>`,
            title: `Activated Skill: ${name}`
          };
        } catch (error) {
           return { error: error.message };
        }
      },
    }),

    list_mcp_servers: tool({
      description: "Lists all Model Context Protocol (MCP) servers currently enabled in the Brane Hub system.",
      parameters: z.object({}),
      execute: async () => {
        try {
          const mcpManager = require("../mcp-manager");
          const servers = await mcpManager.getMcpServers();
          const enabled = servers.filter(s => s.enabled);
          return {
            servers: enabled.map(s => ({
              id: s.id,
              name: s.name,
              description: s.description,
              isBuiltIn: s.isBuiltIn
            })),
            title: `Listed ${enabled.length} enabled MCP servers`
          };
        } catch (e) {
          return { error: e.message };
        }
      },
    }),

    call_mcp_tool: tool({
      description: "Invokes a specific tool on a configured MCP server. Note: Since this is a direct stdio call, it may take a few seconds to initialize.",
      parameters: z.object({
        serverId: z.string().describe("The ID of the MCP server to call (e.g. 'brane-knowledge')."),
        toolName: z.string().describe("The name of the tool to execute."),
        arguments: z.any().describe("The arguments to pass to the tool (JSON object)."),
      }),
      execute: async ({ serverId, toolName, arguments: args }) => {
        try {
          const mcpManager = require("../mcp-manager");
          const servers = await mcpManager.getMcpServers();
          const config = servers.find(s => s.id === serverId);
          
          if (!config) return { error: `MCP server '${serverId}' not found.` };
          if (!config.enabled) return { error: `MCP server '${serverId}' is disabled.` };

          // Simplified one-shot MCP stdio call for the prototype
          // In a real implementation we'd maintain persistent client connections
          // We wrap the stdio command into a JSON-RPC request
          const jsonRpc = {
            jsonrpc: "2.0",
            id: 1,
            method: "tools/call",
            params: {
              name: toolName,
              arguments: args
            }
          };

          const fullCommand = `${config.command} ${config.args.join(' ')}`;
          const input = JSON.stringify(jsonRpc);
          
          // Use bash to pipe the input to the server command
          // Note: This is an oversimplification; real MCP servers expect a handshake first.
          // However, for Brane's built-in servers, we can bypass the handshake if they are designed to handle it.
          const { stdout, stderr } = await execAsync(`echo '${input.replace(/'/g, "'\\''")}' | ${fullCommand}`, {
             maxBuffer: 1024 * 1024 * 5
          });

          return {
            result: stdout.toString().trim(),
            stderr: stderr.toString().trim(),
            title: `Called MCP Tool: ${serverId}:${toolName}`
          };
        } catch (e) {
          return { error: e.message };
        }
      },
    }),
  };
};

module.exports = { getTools };
