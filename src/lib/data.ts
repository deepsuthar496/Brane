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

export const agents: Agent[] = [
  {
    id: "claude",
    name: "Claude Code",
    icon: "material-icon-theme:claude",
    version: "v1.0.33",
    provider: "@anthropic",
    status: "running",
    mcps: 8,
    skills: 12,
    flags: 5,
    tags: [
      { label: "filesystem", type: "mcp" },
      { label: "github", type: "mcp" },
      { label: "docx", type: "skill" },
      { label: "pdf", type: "skill" },
      { label: "--dangerously-skip-permissions", type: "flag" },
    ],
    colorClass: "claude",
  },
  {
    id: "gemini",
    name: "Gemini CLI",
    icon: "vscode-icons:file-type-gemini",
    version: "v0.4.1",
    provider: "@google",
    status: "running",
    mcps: 4,
    skills: 3,
    flags: 3,
    tags: [
      { label: "gdrive", type: "mcp" },
      { label: "gmail", type: "mcp" },
      { label: "--model gemini-2.5-pro", type: "flag" },
    ],
    colorClass: "gemini",
  },
  {
    id: "cursor",
    name: "Cursor",
    icon: "lucide:mouse-pointer-2",
    version: "v0.50.2",
    provider: "@cursor",
    status: "stopped",
    mcps: 2,
    skills: 0,
    flags: 1,
    tags: [
      { label: "postgres", type: "mcp" },
      { label: "--rules-file", type: "flag" },
    ],
    colorClass: "cursor",
  },
  {
    id: "codex",
    name: "Codex CLI",
    icon: "proicons:openai",
    version: "v0.2.0",
    provider: "@openai",
    status: "stopped",
    mcps: 3,
    skills: 2,
    flags: 4,
    tags: [
      { label: "--approval-mode full-auto", type: "flag" },
      { label: "shell", type: "mcp" },
    ],
    colorClass: "codex",
  },
  {
    id: "openclaw",
    name: "OpenClaw",
    icon: "lucide:terminal",
    version: "v0.1.8",
    provider: "community",
    status: "error",
    mcps: 1,
    skills: 1,
    flags: 2,
    tags: [{ label: "Missing API key", type: "error" }],
    colorClass: "openclaw",
  },
];

export const mcpServers: MCPServer[] = [
  { id: "fs", name: "Filesystem", icon: "Folder", url: "npx @modelcontextprotocol/server-filesystem ~/projects", scope: "global", enabled: true, category: "System" },
  { id: "github", name: "GitHub", icon: "Github", url: "npx @modelcontextprotocol/server-github", scope: "claude · codex", enabled: true, category: "System" },
  { id: "postgres", name: "PostgreSQL", icon: "Database", url: "npx @modelcontextprotocol/server-postgres postgresql://localhost/dev", scope: "cursor · claude", enabled: true, category: "System" },
  { id: "gmail", name: "Gmail", icon: "Mail", url: "https://gmail.mcp.claude.com/mcp", scope: "gemini · claude", enabled: true, category: "Google" },
  { id: "gcal", name: "Google Calendar", icon: "Calendar", url: "https://gcal.mcp.claude.com/mcp", scope: "gemini", enabled: false, category: "Google" },
  { id: "gdrive", name: "Google Drive", icon: "HardDrive", url: "https://gdrive.mcp.google.com/mcp", scope: "gemini", enabled: true, category: "Google" },
  { id: "brave", name: "Brave Search", icon: "Search", url: "npx @modelcontextprotocol/server-brave-search", scope: "global", enabled: false, category: "Community" },
  { id: "memory", name: "Memory", icon: "Brain", url: "npx @modelcontextprotocol/server-memory", scope: "claude", enabled: true, category: "Community" },
];

export const skills: Skill[] = [
  { id: "docx", name: "DOCX Generator", icon: "FileText", path: "~/.agents/skills/docx/SKILL.md", description: "Word document creation", scope: "claude · gemini", enabled: true },
  { id: "xlsx", name: "XLSX Builder", icon: "Table", path: "~/.agents/skills/xlsx/SKILL.md", description: "Spreadsheet generation", scope: "claude", enabled: true },
  { id: "pdf", name: "PDF Toolkit", icon: "FileCode", path: "~/.agents/skills/pdf/SKILL.md", description: "PDF read & create", scope: "claude · codex", enabled: true },
  { id: "ui-design", name: "Modern UI Design", icon: "Palette", path: "~/.agents/skills/modern-ui-design/SKILL.md", description: "Frontend excellence", scope: "claude", enabled: true },
  { id: "file-reading", name: "File Reading", icon: "BookOpen", path: "~/.agents/skills/file-reading/SKILL.md", description: "Smart file ingestion", scope: "claude · gemini", enabled: false },
  { id: "product-knowledge", name: "Product Self-Knowledge", icon: "Zap", path: "~/.agents/skills/product-self-knowledge/SKILL.md", description: "API & product facts", scope: "claude", enabled: true },
];

export const credentials: Credential[] = [
  { id: "anthropic", name: "Anthropic", icon: "Cpu", envVar: "ANTHROPIC_API_KEY", maskedKey: "sk-ant-api03-••••••••••••••••••••••XA", status: "valid", category: "Anthropic" },
  { id: "gemini", name: "Google Gemini", icon: "Sparkles", envVar: "GEMINI_API_KEY", maskedKey: "AIzaSy••••••••••••••••••••••••••••pQ", status: "valid", category: "Google" },
  { id: "openai", name: "OpenAI", icon: "Bot", envVar: "OPENAI_API_KEY", maskedKey: "Not configured — required by Codex CLI & OpenClaw", status: "missing", category: "OpenAI" },
  { id: "github", name: "GitHub", icon: "Key", envVar: "GITHUB_TOKEN", maskedKey: "ghp_••••••••••••••••••••••••••••••Kz", status: "valid", category: "Version Control" },
];

export const cliFlags: CLIFlag[] = [
  { id: "1", name: "--dangerously-skip-permissions", value: "true", scope: "always" },
  { id: "2", name: "--output-format", value: "stream-json", scope: "always" },
  { id: "3", name: "--max-turns", value: "50", scope: "always" },
];
