import { Agent } from "@/lib/data";

export interface IElectronAPI {
  minimize: () => void;
  maximize: () => void;
  close: () => void;
  discoverCLIs: () => Promise<Agent[]>;
  getMcpServers: () => Promise<any[]>;
  addMcpServer: (id: string, config: any) => Promise<any>;
  removeMcpServer: (id: string) => Promise<boolean>;
  toggleMcpServer: (id: string, enabled: boolean) => Promise<boolean>;
  isElectron: boolean;
  platform: string;
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
  }
}
