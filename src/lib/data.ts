export type AgentStatus = "running" | "stopped" | "error";

export interface Agent {
  id: string;
  name: string;
  icon: string;
  version: string;
  provider: string;
  status: AgentStatus;
  mcps: number;
  skills: number;
  flags: number;
  tags: { label: string; type: "mcp" | "skill" | "flag" | "error" }[];
  colorClass: string;
  fullPath?: string;
  discovered?: boolean;
}

export interface MCPServer {
  id: string;
  name: string;
  icon: string;
  url?: string;
  command?: string;
  args?: string[];
  env?: Record<string, string>;
  scope: string;
  enabled: boolean;
  category: string;
  disabled?: boolean;
}

export interface Skill {
  id: string;
  name: string;
  icon: string;
  path: string;
  description: string;
  scope: string;
  enabled: boolean;
}

export interface Credential {
  id: string;
  name: string;
  icon: string;
  envVar: string;
  maskedKey: string;
  status: "valid" | "missing" | "expired";
  category: string;
}

export interface CLIFlag {
  id: string;
  name: string;
  value: string;
  scope: string;
}
