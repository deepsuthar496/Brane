import { Agent, MCPServer } from "@/lib/data";
import { SkillEntry, InstalledItem } from "@/lib/registry";

export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  discoverCLIs: () => Promise<Agent[]>;
  getMcpServers: () => Promise<MCPServer[]>;
  addMcpServer: (id: string, config: Partial<MCPServer>) => Promise<MCPServer>;
  removeMcpServer: (id: string) => Promise<boolean>;
  toggleMcpServer: (id: string, enabled: boolean) => Promise<boolean>;
  
  // Registry methods
  fetchRegistryData: <T>(urlPair: { cdn: string; fallback: string }) => Promise<T>;
  installSkill: (skill: SkillEntry) => Promise<{ success: boolean }>;
  uninstallSkill: (id: string) => Promise<{ success: boolean }>;
  getInstalledSkills: () => Promise<Record<string, InstalledItem>>;
  toggleSkill: (id: string, enabled: boolean) => Promise<{ success: boolean }>;
  getGithubToken: () => Promise<string | null>;
  setGithubToken: (token: string) => Promise<boolean>;
  getRegistryRepo: () => Promise<string>;
  setRegistryRepo: (repo: string) => Promise<boolean>;

  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
