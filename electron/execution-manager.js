/* eslint-disable @typescript-eslint/no-require-imports */
const { spawn } = require("child_process");

const runningAgents = new Map();

async function installCLI(event, { command, id }) {
  const webContents = event.sender;
  
  return new Promise((resolve) => {
    // Determine shell based on platform
    const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
    const shellArgs = process.platform === "win32" ? ["-NoProfile", "-Command", command] : ["-c", command];

    const child = spawn(shell, shellArgs);

    child.stdout.on("data", (data) => {
      webContents.send(`install-progress:${id}`, { type: "stdout", data: data.toString() });
    });

    child.stderr.on("data", (data) => {
      webContents.send(`install-progress:${id}`, { type: "stderr", data: data.toString() });
    });

    child.on("close", (code) => {
      resolve({ success: code === 0, code });
    });

    child.on("error", (err) => {
      webContents.send(`install-progress:${id}`, { type: "error", data: err.message });
      resolve({ success: false, error: err.message });
    });
  });
}

async function startAgent(event, { id, command }) {
  if (runningAgents.has(id)) {
    return { success: false, error: "Agent is already running" };
  }

  const webContents = event.sender;
  const shell = process.platform === "win32" ? "powershell.exe" : "/bin/sh";
  const shellArgs = process.platform === "win32" ? ["-NoProfile", "-Command", command] : ["-c", command];

  try {
    const child = spawn(shell, shellArgs, {
      detached: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    runningAgents.set(id, {
      process: child,
      startTime: Date.now(),
      status: "running",
    });

    child.stdout.on("data", (data) => {
      webContents.send(`agent-log:${id}`, { type: "stdout", data: data.toString() });
    });

    child.stderr.on("data", (data) => {
      webContents.send(`agent-log:${id}`, { type: "stderr", data: data.toString() });
    });

    child.on("close", (code) => {
      runningAgents.delete(id);
      webContents.send(`agent-status:${id}`, { status: "stopped", code });
    });

    child.on("error", (err) => {
      runningAgents.delete(id);
      webContents.send(`agent-status:${id}`, { status: "error", error: err.message });
    });

    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function stopAgent(event, id) {
  const agent = runningAgents.get(id);
  if (!agent) {
    return { success: false, error: "Agent is not running" };
  }

  try {
    if (process.platform === "win32") {
      spawn("taskkill", ["/pid", agent.process.pid, "/f", "/t"]);
    } else {
      agent.process.kill("SIGTERM");
    }
    runningAgents.delete(id);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
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
  startAgent,
  stopAgent,
  getAgentStatus,
};
