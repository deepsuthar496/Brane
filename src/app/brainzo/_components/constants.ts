import { X, Settings, Bot, Database, FileText, Search, Shield, Edit3 } from "lucide-react";

export const SLASH_COMMANDS = [
  { name: "clear", description: "Clear chat history", icon: X },
  { name: "settings", description: "Open settings", icon: Settings },
  { name: "memory", description: "Toggle persistent memory", icon: Bot },
  { name: "indexer", description: "Toggle codebase indexer", icon: Database },
  { name: "review", description: "Review current code", icon: FileText },
  { name: "explain", description: "Explain how it works", icon: Search },
  { name: "test", description: "Write tests", icon: Shield },
  { name: "fix", description: "Fix bugs", icon: Edit3 },
  { name: "refactor", description: "Refactor code", icon: Edit3 }
];

export const getProviderNameForLogo = (provider: string, id: string) => {
  const p = provider.toLowerCase();
  if (p === 'github copilot' || p === 'github-copilot' || p === 'github') {
    return 'github';
  }
  if (p === 'openai') {
    return 'openai';
  }
  if (provider === 'OpenRouter') {
    const parts = id.split('/');
    if (parts.length >= 3) {
      return parts[1].toLowerCase();
    }
    return 'openrouter';
  }
  return provider.toLowerCase();
};
