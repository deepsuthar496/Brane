const { spawn } = require("child_process");

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

module.exports = { installCLI };
