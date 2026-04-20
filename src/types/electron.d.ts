import { Agent, MCPServer } from "@/lib/data";

export interface LogEntry {
  id: string;
  timestamp: number;
  level: string;
  source: string;
  message: string;
  details?: unknown;
}

export interface ElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  browseFiles: (options?: any) => Promise<{ canceled: boolean; filePaths: string[] }>;
  openExternal: (url: string) => Promise<void>;

  // Logs
  getLogs: () => Promise<LogEntry[]>;
  clearLogs: () => Promise<void>;
  addLog: (level: string, source: string, message: string, details?: unknown) => Promise<void>;

  discoverCLIs: () => Promise<Agent[]>;
  getMcpServers: () => Promise<MCPServer[]>;
  addMcpServer: (id: string, config: unknown) => Promise<boolean>;
  removeMcpServer: (id: string) => Promise<boolean>;
  toggleMcpServer: (id: string, enabled: boolean) => Promise<boolean>;
  fetchRegistryData: <T = unknown>(url: any) => Promise<T>;
  installSkill: (skill: unknown) => Promise<boolean>;
  uninstallSkill: (id: string) => Promise<boolean>;
  installMcp: (mcp: unknown) => Promise<boolean>;
  uninstallMcp: (id: string) => Promise<boolean>;
  getInstalledSkills: () => Promise<Record<string, any>>;
  getInstalledMcps: () => Promise<Record<string, any>>;
  toggleSkill: (id: string, enabled: boolean) => Promise<boolean>;
  getAllCredentials: () => Promise<any[]>;
  saveCredential: (key: string, value: string) => Promise<boolean>;
  deleteCredential: (key: string) => Promise<boolean>;
  getModelsRegistry: () => Promise<any>;
  getGithubToken: () => Promise<string | null>;
  setGithubToken: (token: string) => Promise<boolean>;
  getRegistryRepo: () => Promise<string>;
  setRegistryRepo: (repo: string) => Promise<boolean>;
  installCLI: (payload: { command: string; id: string }) => Promise<{ success: boolean; code?: number; error?: string }>;
  checkCLIInstalled: (command: string) => Promise<boolean>;
  startAgent: (payload: { id: string; command: string }) => Promise<{ success: boolean; error?: string }>;
  stopAgent: (id: string) => Promise<{ success: boolean; error?: string }>;
  getAgentStatus: (id: string) => Promise<{ status: "running" | "stopped" | "error"; startTime?: number }>;
  
  // Auto-update
  checkForUpdates: () => Promise<any>;
  restartAndInstall: () => void;
  onUpdateAvailable: (callback: (info: any) => void) => () => void;
  onUpdateNotAvailable: (callback: () => void) => () => void;
  onUpdateDownloadProgress: (callback: (percent: number) => void) => () => void;
  onUpdateDownloaded: (callback: (info: any) => void) => () => void;
  onUpdateError: (callback: (message: string) => void) => () => void;

  // BraneZO Agent
  readFileTree: (workspacePath: string) => Promise<any[]>;
  startOAuth: () => Promise<{ url: string; state: string; pkce: any }>;
  waitForOAuth: (payload: { state: string; pkce: any }) => Promise<{ code: string; accessToken: string; accountId?: string }>;
  stopOAuth: () => Promise<void>;
  startBraneZOChat: (payload: {
    id: string;
    messages: { role: string; content: string }[];
    workspacePath: string;
    providerId: string;
    modelId: string;
    apiKey: string;
    systemPrompt?: string;
  }) => void;
  abortBraneZOChat: (id: string) => void;
  onBraneZOChunk: (id: string, callback: (text: string) => void) => () => void;
  onBraneZOToolCall: (id: string, callback: (call: any) => void) => () => void;
  onBraneZOToolResult: (id: string, callback: (res: any) => void) => () => void;
  onBraneZOFinish: (id: string, callback: (messages: any[]) => void) => () => void;
  onBraneZOError: (id: string, callback: (err: string) => void) => () => void;
  onBraneZOError: (id: string, callback: (error: string) => void) => () => void;

  // Knowledge Base
  listKnowledgeFiles: () => Promise<any[]>;
  addKnowledgeFile: (name: string, content: string) => Promise<any[]>;
  addKnowledgeFileFromPath: (path: string) => Promise<any[]>;
  removeKnowledgeFile: (name: string) => Promise<any[]>;
  getKnowledgePath: () => Promise<string>;

  onInstallProgress: (id: string, callback: (data: { type: string; data: string }) => void) => () => void;
  onAgentLog: (id: string, callback: (data: { type: string; data: string }) => void) => () => void;
  onAgentStatus: (id: string, callback: (data: { status: string; error?: string; code?: number }) => void) => () => void;
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: ElectronAPI;
  }
}
