import { createMCPClient, type MCPClient } from '@ai-sdk/mcp';
import fs from 'fs/promises';
import path from 'path';
import type { Tool } from 'ai';

// ── Types ────────────────────────────────────────────────────────────────────

export interface MCPServerConfig {
  type: 'stdio' | 'http' | 'sse';
  /** For stdio: the command to run */
  command?: string;
  /** For stdio: command arguments */
  args?: string[];
  /** For stdio: environment variables */
  env?: Record<string, string>;
  /** For http/sse: the server URL */
  url?: string;
  /** For http/sse: request headers */
  headers?: Record<string, string>;
  /** Whether this server is enabled */
  enabled?: boolean;
}

export interface BraneMCPConfig {
  servers: Record<string, MCPServerConfig>;
}

interface ConnectedServer {
  name: string;
  client: MCPClient;
  tools: Record<string, Tool>;
}

// ── MCP Manager ──────────────────────────────────────────────────────────────

export class MCPManager {
  private workspaceRoot: string;
  private connectedServers: ConnectedServer[] = [];

  constructor(workspaceRoot: string) {
    this.workspaceRoot = workspaceRoot;
  }

  /**
   * Load MCP config from .brane/mcp.json
   */
  async loadConfig(): Promise<BraneMCPConfig | null> {
    const configPath = path.join(this.workspaceRoot, '.brane', 'mcp.json');
    try {
      const raw = await fs.readFile(configPath, 'utf-8');
      return JSON.parse(raw) as BraneMCPConfig;
    } catch {
      return null;
    }
  }

  /**
   * Connect to all enabled MCP servers and discover their tools.
   */
  async connectAll(): Promise<void> {
    const config = await this.loadConfig();
    if (!config?.servers) return;

    for (const [name, serverConfig] of Object.entries(config.servers)) {
      if (serverConfig.enabled === false) {
        console.log(`[MCP] Skipping disabled server: ${name}`);
        continue;
      }

      try {
        await this.connectServer(name, serverConfig);
      } catch (error: any) {
        console.error(`[MCP] Failed to connect to "${name}":`, error.message);
      }
    }
  }

  /**
   * Connect to a single MCP server.
   */
  private async connectServer(name: string, config: MCPServerConfig): Promise<void> {
    console.log(`[MCP] Connecting to "${name}" (${config.type})...`);

    let mcpClient: MCPClient;

    switch (config.type) {
      case 'stdio': {
        if (!config.command) throw new Error(`MCP server "${name}" missing 'command'`);
        // Use dynamic import for stdio transport (Node.js only)
        const { Experimental_StdioMCPTransport } = await import('@ai-sdk/mcp/mcp-stdio');
        mcpClient = await createMCPClient({
          transport: new Experimental_StdioMCPTransport({
            command: config.command,
            args: config.args || [],
            env: { ...process.env, ...(config.env || {}) } as Record<string, string>,
          }),
        });
        break;
      }
      case 'http': {
        if (!config.url) throw new Error(`MCP server "${name}" missing 'url'`);
        mcpClient = await createMCPClient({
          transport: {
            type: 'http',
            url: config.url,
            headers: config.headers,
          },
        });
        break;
      }
      case 'sse': {
        if (!config.url) throw new Error(`MCP server "${name}" missing 'url'`);
        mcpClient = await createMCPClient({
          transport: {
            type: 'sse',
            url: config.url,
            headers: config.headers,
          },
        });
        break;
      }
      default:
        throw new Error(`MCP server "${name}" has unsupported type: ${config.type}`);
    }

    // Discover all tools via schema discovery (auto)
    const tools = await mcpClient.tools();
    const toolNames = Object.keys(tools);
    console.log(`[MCP] Connected to "${name}" — ${toolNames.length} tools: ${toolNames.join(', ')}`);

    this.connectedServers.push({ name, client: mcpClient, tools: tools as any });  }

  /**
   * Get all tools from all connected MCP servers.
   * Tool names are prefixed with the server name to avoid collisions.
   */
  getAllTools(): Record<string, Tool> {
    const merged: Record<string, Tool> = {};
    for (const server of this.connectedServers) {
      for (const [toolName, tool] of Object.entries(server.tools)) {
        // Prefix to avoid collisions across servers
        merged[`${server.name}_${toolName}`] = tool;
      }
    }
    return merged;
  }

  /**
   * Get all connected MCP tool names (for system prompt injection).
   */
  getToolNames(): string[] {
    return Object.keys(this.getAllTools());
  }

  /**
   * Get server connection summaries (for system prompt).
   */
  getServerSummary(): string {
    if (this.connectedServers.length === 0) return '';
    return this.connectedServers
      .map(s => `- **${s.name}**: ${Object.keys(s.tools).join(', ')}`)
      .join('\n');
  }

  /**
   * Close all MCP client connections.
   */
  async closeAll(): Promise<void> {
    for (const server of this.connectedServers) {
      try {
        await server.client.close();
        console.log(`[MCP] Closed connection to "${server.name}"`);
      } catch (e: any) {
        console.error(`[MCP] Error closing "${server.name}":`, e.message);
      }
    }
    this.connectedServers = [];
  }
}
