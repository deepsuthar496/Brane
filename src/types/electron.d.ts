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
  installMcp: (mcp: unknown, targets: string[]) => Promise<boolean>;
  uninstallMcp: (id: string) => Promise<boolean>;
  getInstalledSkills: () => Promise<Record<string, any>>;
  getInstalledMcps: () => Promise<Record<string, any>>;
  toggleSkill: (id: string, enabled: boolean) => Promise<boolean>;
  getGithubToken: () => Promise<string | null>;
  setGithubToken: (token: string | null) => Promise<boolean>;
  setCrashReportsEnabled: (enabled: boolean) => Promise<boolean>;
  testSentryMainError: () => Promise<boolean>;
  getModelsRegistry: () => Promise<any>;
  installCLI: (payload: { command: string; id: string }) => Promise<{ success: boolean; code?: number; error?: string }>;
  abortInstall: (id: string) => Promise<{ success: boolean; error?: string }>;
  checkCLIInstalled: (command: string) => Promise<boolean>;
  startAgent: (payload: { id: string; command: string; cwd?: string; cols?: number; rows?: number }) => Promise<{ success: boolean; error?: string }>;
  sendAgentInput: (payload: { id: string; data: string }) => Promise<{ success: boolean; error?: string }>;
  resizeAgent: (payload: { id: string; cols: number; rows: number }) => Promise<{ success: boolean; error?: string }>;
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
  onUpdateWarning: (callback: (message: string) => void) => () => void;

  // CLI Flags
  getCliFlags: (agentName: string) => Promise<any[]>;
  getEnabledCliFlags: (agentName: string) => Promise<Record<string, boolean>>;
  setEnabledCliFlag: (agentName, flagName, value) => Promise<Record<string, boolean>>;
  fetchUrl: (url: string) => Promise<string>;

  // Knowledge Base
  listKnowledgeFiles: () => Promise<any[]>;
  addKnowledgeFile: (name: string, content: string, collection?: string) => Promise<any[]>;
  addKnowledgeFileFromPath: (path: string, collection?: string) => Promise<any[]>;
  removeKnowledgeFile: (name: string, collection?: string) => Promise<any[]>;
  updateKnowledgeDescription: (id: string, description: string) => Promise<any[]>;
  moveKnowledgeFileToCollection: (payload: { fileName: string; currentCollection: string; targetCollection: string }) => Promise<any[]>;
  revealKnowledgeInExplorer: (name?: string, collection?: string) => Promise<void>;
  getKnowledgePath: (name?: string) => Promise<string>;

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
