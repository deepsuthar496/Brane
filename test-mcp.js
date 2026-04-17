const { spawn } = require('child_process');
const path = require('path');

const serverPath = path.join(__dirname, 'electron', 'knowledge-mcp-server-entry.js');
console.log(`Testing MCP Server at: ${serverPath}\n`);

const child = spawn('node', [serverPath]);

let step = 0;
const requests = [
  // 1. Initialize
  JSON.stringify({
    jsonrpc: "2.0",
    id: 1,
    method: "initialize",
    params: {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "test-client", version: "1.0.0" }
    }
  }),
  // 2. Initialized Notification
  JSON.stringify({
    jsonrpc: "2.0",
    method: "notifications/initialized"
  }),
  // 3. List Tools
  JSON.stringify({
    jsonrpc: "2.0",
    id: 2,
    method: "tools/list",
    params: {}
  })
];

child.stdout.on('data', (data) => {
  console.log(`[SERVER RESPONSE]: ${data.toString().trim()}`);
  
  if (step < requests.length) {
    sendNext();
  } else {
    console.log("\nTest completed successfully. Killing server...");
    child.kill();
    process.exit(0);
  }
});

child.stderr.on('data', (data) => {
  console.error(`[SERVER ERROR]: ${data.toString()}`);
});

child.on('close', (code) => {
  if (code !== 0 && code !== null) {
    console.log(`Server exited with code ${code}`);
  }
});

function sendNext() {
  const req = requests[step++];
  if (req) {
    console.log(`[CLIENT REQUEST]: ${req}`);
    child.stdin.write(req + '\n');
    
    // Notifications don't get responses, so advance immediately
    const parsed = JSON.parse(req);
    if (!parsed.id) {
       console.log("[TEST LOG]: Notification sent, advancing to next step...");
       setTimeout(sendNext, 500);
    }
  }
}

// Start the sequence
sendNext();

// Timeout safety
setTimeout(() => {
  console.log("\nTest timed out after 5s.");
  child.kill();
  process.exit(1);
}, 5000);
