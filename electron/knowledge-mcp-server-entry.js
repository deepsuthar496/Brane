#!/usr/bin/env node
const { KNOWLEDGE_SERVER_ID, getCapabilities, callTool } = require("./knowledge-mcp-server");
const readline = require("readline");

/**
 * Entry point for the Knowledge MCP Server using STDIO transport.
 * This can be called by external agents like Claude Code or Gemini CLI.
 */

async function main() {
  const capabilities = getCapabilities();
  
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
  });

  rl.on("line", async (line) => {
    if (!line.trim()) return;

    try {
      const request = JSON.parse(line);
      
      // Basic MCP protocol implementation (initialize and call_tool)
      if (request.method === "initialize") {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {
            protocolVersion: "2024-11-05",
            capabilities: capabilities,
            serverInfo: { name: KNOWLEDGE_SERVER_ID, version: "1.0.0" }
          }
        }) + "\n");
      } 
      else if (request.method === "notifications/initialized") {
        // Just consume the notification
      }
      else if (request.method === "tools/list") {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: { tools: capabilities.tools }
        }) + "\n");
      }
      else if (request.method === "tools/call") {
        try {
          const result = await callTool(request.params.name, request.params.arguments);
          process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            result: result
          }) + "\n");
        } catch (error) {
          process.stdout.write(JSON.stringify({
            jsonrpc: "2.0",
            id: request.id,
            error: { code: -32603, message: error.message }
          }) + "\n");
        }
      }
      else if (request.method === "ping") {
        process.stdout.write(JSON.stringify({
          jsonrpc: "2.0",
          id: request.id,
          result: {}
        }) + "\n");
      }
    } catch (err) {
      process.stderr.write(`[MCP Error] ${err.message}\n`);
    }
  });

  // Handle process termination
  process.on("SIGINT", () => {
    rl.close();
    process.exit(0);
  });

  process.on("SIGTERM", () => {
    rl.close();
    process.exit(0);
  });
}

main().catch(err => {
  process.stderr.write(`[Fatal Error] ${err.message}\n`);
  process.exit(1);
});
