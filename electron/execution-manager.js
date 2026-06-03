/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");
const pty = require("node-pty");
const { injectKnowledgeMcp } = require("./auto-injector");

const runningAgents = new Map();
const activeInstallations = new Map();

async function installCLI(event, { command, id }) {
  const webContents = event.sender;
  const configManager = require("./config-manager");
  
  return new Promise(async (resolve) => {
    const token = await configManager.getGithubToken();
    const childEnv = { ...process.env };
    if (token) {
      childEnv.GH_TOKEN = token;
      childEnv.GITHUB_TOKEN = token;
    }

    // Determine shell based on platform
    const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
    const shellArgs = process.platform === "win32" ? ["-NoProfile", "-Command", command] : ["-c", command];

    const child = spawn(shell, shellArgs, { env: childEnv });
    activeInstallations.set(id, child);

    child.stdout.on("data", (data) => {
      webContents.send(`install-progress:${id}`, { type: "stdout", data: data.toString() });
    });

    child.stderr.on("data", (data) => {
      webContents.send(`install-progress:${id}`, { type: "stderr", data: data.toString() });
    });

    child.on("close", (code) => {
      activeInstallations.delete(id);
      resolve({ success: code === 0, code });
    });

    child.on("error", (err) => {
      activeInstallations.delete(id);
      webContents.send(`install-progress:${id}`, { type: "error", data: err.message });
      resolve({ success: false, error: err.message });
    });
  });
}

async function abortInstall(event, id) {
  const child = activeInstallations.get(id);
  if (child) {
    try {
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", child.pid, "/f", "/t"]);
      } else {
        child.kill("SIGTERM");
      }
      activeInstallations.delete(id);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: "No active installation found" };
}

async function startAgent(event, { id, command, cwd, cols = 100, rows = 30 }) {
  if (runningAgents.has(id)) {
    return { success: false, error: "Agent is already running" };
  }

  // Auto-inject knowledge context if files exist
  try {
    await injectKnowledgeMcp();
  } catch (err) {
    console.error("Execution: Knowledge injection failed", err.message);
  }

  const webContents = event.sender;
  const workspaceRoot = cwd || process.cwd();
  
  console.log(`[Execution] Spawning agent ${id} with PTY (${cols}x${rows}) in ${workspaceRoot}`);

  try {
    // Use node-pty for a real interactive terminal session
    const shell = process.platform === 'win32' ? 'powershell.exe' : 'sh';
    const args = process.platform === 'win32' 
      ? ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', `& ${command}`]
      : ['-c', command];

    const configManager = require("./config-manager");
    const token = await configManager.getGithubToken();
    const ptyEnv = {
      ...process.env,
      TERM: "xterm-256color",
      COLORTERM: "truecolor",
      FORCE_COLOR: "1",
      CLAUDE_CODE_INTERACTIVE: "true",
    };
    if (token) {
      ptyEnv.GH_TOKEN = token;
      ptyEnv.GITHUB_TOKEN = token;
    }

    const ptyProcess = pty.spawn(shell, args, {
      name: 'xterm-256color',
      cols: cols,
      rows: rows,
      cwd: workspaceRoot,
      env: ptyEnv,
    });

    runningAgents.set(id, {
      process: ptyProcess,
      startTime: Date.now(),
      status: "running",
    });

    // Notify startup success immediately
    webContents.send(`agent-status:${id}`, { status: "running" });

    // In node-pty, both stdout and stderr come through the 'data' event
    ptyProcess.onData((data) => {
      webContents.send(`agent-log:${id}`, { type: "stdout", data: data });
    });

    ptyProcess.onExit(({ exitCode, signal }) => {
      console.log(`[Execution] Agent ${id} PTY exited with code ${exitCode}`);
      runningAgents.delete(id);
      webContents.send(`agent-status:${id}`, { status: "stopped", code: exitCode });
      
      if (exitCode !== 0 && exitCode !== null) {
        webContents.send(`agent-log:${id}`, { 
          type: "error", 
          data: `\r\n\x1b[1;31m[System] Agent exited with code ${exitCode}. Check if the command is valid.\x1b[0m\r\n` 
        });
      }
    });

    return { success: true };
  } catch (error) {
    console.error(`[Execution] PTY Spawn error for agent ${id}:`, error.message);
    return { success: false, error: error.message };
  }
}

async function stopAgent(event, id) {
  const agent = runningAgents.get(id);
  if (!agent) {
    return { success: false, error: "Agent is not running" };
  }

  try {
    agent.process.kill(); // PTY kill is cleaner
    runningAgents.delete(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function sendAgentInput(event, { id, data }) {
  const agent = runningAgents.get(id);
  if (agent && agent.process) {
    // Send data directly to the PTY
    agent.process.write(data);
    return { success: true };
  }
  return { success: false, error: "Agent not running or PTY not available" };
}

async function resizeAgent(event, { id, cols, rows }) {
  const agent = runningAgents.get(id);
  if (agent && agent.process) {
    try {
      agent.process.resize(cols, rows);
      return { success: true };
    } catch (e) {
      return { success: false, error: e.message };
    }
  }
  return { success: false, error: "Agent not running" };
}

async function getAgentStatus(id) {
  const agent = runningAgents.get(id);
  if (agent) {
    return { status: "running", startTime: agent.startTime };
  }
  return { status: "stopped" };
}

module.exports = {
  installCLI,
  abortInstall,
  startAgent,
  stopAgent,
  sendAgentInput,
  resizeAgent,
  getAgentStatus,
};
