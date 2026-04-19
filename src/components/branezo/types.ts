// ── BraneZO Types ─────────────────────────────────────

export type MessageRole = "user" | "assistant" | "system";

export interface ToolUseBlock {
  id: string;
  toolName: string;
  input: string;
  output?: string;
  status: "running" | "success" | "error";
  duration?: string;
}

export interface ChatMessage {
  id: string;
  role: MessageRole;
  content: string;
  timestamp: Date;
  toolUse?: ToolUseBlock[];
  filesChanged?: string[];
  isThinking?: boolean;
}

export type FileChangeStatus = "added" | "modified" | "deleted";

export interface DiffLine {
  type: "add" | "remove" | "context";
  lineNumber: number;
  content: string;
}

export interface FileChange {
  path: string;
  status: FileChangeStatus;
  language: string;
  diff: DiffLine[];
  fullContent?: string;
}

export interface FileTreeNode {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: FileTreeNode[];
  status?: FileChangeStatus;
  language?: string;
}

export interface BraneZOSession {
  id: string;
  title: string;
  model: string;
  messages: ChatMessage[];
  files: FileChange[];
  fileTree: FileTreeNode[];
  tokensUsed: number;
  cost: number;
  createdAt: Date;
}
