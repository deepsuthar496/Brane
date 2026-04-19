const { tool } = require("ai");
const { z } = require("zod");
const fs = require("fs/promises");
const path = require("path");
const { exec } = require("child_process");
const util = require("util");
const execAsync = util.promisify(exec);

// Minimal implementations of core tools porting from opencode-dev logic

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
      description: "Write content to a file in the workspace. Replaces the file exactly.",
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

    run_bash: tool({
      description: "Run a bash/powershell command in the workspace directory. Use this to run tests, git commands, npm installs, etc.",
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
            stderr: error.stderr?.toString().slice(0, 10000)
          };
        }
      },
    }),
  };
};

module.exports = { getTools };
