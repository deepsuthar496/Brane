const { exec } = require("child_process");
const { promisify } = require("util");
const path = require("path");
const execAsync = promisify(exec);

async function findCommandPath(command) {
  const checkCmd = process.platform === "win32" ? `where ${command}` : `which ${command}`;
  console.log(`Running: ${checkCmd}`);
  try {
    const { stdout } = await execAsync(checkCmd);
    console.log(`stdout: ${stdout}`);
    const lines = stdout.trim().split(/\r?\n/);
    if (lines.length > 0 && lines[0]) {
      return lines[0].trim();
    }
  } catch (err) {
    console.log(`where failed: ${err.message}`);
    if (process.platform === "win32") {
        const npmPath = path.join(process.env.APPDATA || "", "npm", `${command}.cmd`);
        console.log(`Trying fallback: ${npmPath}`);
        try {
            await execAsync(`"${npmPath}" --version`);
            return npmPath;
        } catch (err2) {
            console.log(`fallback failed: ${err2.message}`);
        }
    }
  }
  return null;
}

findCommandPath("gemini").then(path => {
    console.log(`Result: ${path}`);
});
