import type {
  ChatMessage,
  FileChange,
  FileTreeNode,
  BraneZOSession,
} from "./types";

// ── Mock Messages ─────────────────────────────────────

export const MOCK_MESSAGES: ChatMessage[] = [
  {
    id: "msg-1",
    role: "user",
    content: "Add a dark mode toggle to the settings page. It should persist the preference in localStorage.",
    timestamp: new Date("2026-04-19T10:00:00"),
  },
  {
    id: "msg-2",
    role: "assistant",
    content:
      "I'll implement a dark mode toggle for the settings page. Let me start by examining the current settings structure and then create the toggle component.\n\nHere's my plan:\n1. Create a `ThemeToggle` component with smooth transition\n2. Add localStorage persistence via a custom hook\n3. Wire it into the settings page",
    timestamp: new Date("2026-04-19T10:00:05"),
    toolUse: [
      {
        id: "tool-1",
        toolName: "FileRead",
        input: "src/components/settings/settings-modal.tsx",
        output: "// Settings modal content (432 lines)...",
        status: "success",
        duration: "0.3s",
      },
      {
        id: "tool-2",
        toolName: "FileWrite",
        input: "src/hooks/use-theme.ts",
        output: "Created new file with 45 lines",
        status: "success",
        duration: "0.8s",
      },
      {
        id: "tool-3",
        toolName: "FileEdit",
        input: "src/components/settings/settings-modal.tsx",
        output: "Applied 3 edits across 2 sections",
        status: "success",
        duration: "1.2s",
      },
    ],
    filesChanged: [
      "src/hooks/use-theme.ts",
      "src/components/settings/settings-modal.tsx",
    ],
  },
  {
    id: "msg-3",
    role: "user",
    content: "Can you also add a system preference detection? So it defaults to the OS theme if no localStorage value is set.",
    timestamp: new Date("2026-04-19T10:02:00"),
  },
  {
    id: "msg-4",
    role: "assistant",
    content:
      "Great idea! I'll update the `useTheme` hook to detect the OS color scheme preference using `matchMedia` and fall back to it when no localStorage value exists.\n\nThe hook now follows this priority:\n1. **localStorage** value (user's explicit choice)\n2. **OS preference** via `prefers-color-scheme` media query\n3. **Default** to dark mode",
    timestamp: new Date("2026-04-19T10:02:08"),
    toolUse: [
      {
        id: "tool-4",
        toolName: "FileEdit",
        input: "src/hooks/use-theme.ts",
        output: "Modified: added matchMedia listener, updated initialization logic",
        status: "success",
        duration: "0.9s",
      },
    ],
    filesChanged: ["src/hooks/use-theme.ts"],
  },
  {
    id: "msg-5",
    role: "user",
    content: "Perfect. Now add a toast notification when the theme changes.",
    timestamp: new Date("2026-04-19T10:04:00"),
  },
  {
    id: "msg-6",
    role: "assistant",
    content:
      "Done! I've added a `sonner` toast notification that fires whenever the theme is toggled. It shows a subtle confirmation like \"Switched to dark mode\" with the appropriate icon.\n\nThree changes applied:\n- **`use-theme.ts`** — added toast import and trigger on theme change\n- **`settings-modal.tsx`** — toggle now shows current state label\n- **`globals.css`** — added smooth transition on `color-scheme` change",
    timestamp: new Date("2026-04-19T10:04:12"),
    toolUse: [
      {
        id: "tool-5",
        toolName: "FileEdit",
        input: "src/hooks/use-theme.ts",
        output: "Added toast notification on theme toggle",
        status: "success",
        duration: "0.6s",
      },
      {
        id: "tool-6",
        toolName: "FileEdit",
        input: "src/components/settings/settings-modal.tsx",
        output: "Updated toggle label to show current theme name",
        status: "success",
        duration: "0.5s",
      },
      {
        id: "tool-7",
        toolName: "Bash",
        input: "npm run build",
        output: "✓ Compiled successfully in 4.2s",
        status: "success",
        duration: "4.2s",
      },
    ],
    filesChanged: [
      "src/hooks/use-theme.ts",
      "src/components/settings/settings-modal.tsx",
      "src/app/globals.css",
    ],
  },
];

// ── Mock File Changes ─────────────────────────────────

export const MOCK_FILE_CHANGES: FileChange[] = [
  {
    path: "src/hooks/use-theme.ts",
    status: "added",
    language: "typescript",
    diff: [
      { type: "add", lineNumber: 1, content: 'import { useState, useEffect } from "react";' },
      { type: "add", lineNumber: 2, content: 'import { toast } from "sonner";' },
      { type: "add", lineNumber: 3, content: "" },
      { type: "add", lineNumber: 4, content: 'type Theme = "light" | "dark" | "system";' },
      { type: "add", lineNumber: 5, content: "" },
      { type: "add", lineNumber: 6, content: "export function useTheme() {" },
      { type: "add", lineNumber: 7, content: '  const [theme, setTheme] = useState<Theme>(() => {' },
      { type: "add", lineNumber: 8, content: "    if (typeof window === 'undefined') return 'dark';" },
      { type: "add", lineNumber: 9, content: "    const stored = localStorage.getItem('theme');" },
      { type: "add", lineNumber: 10, content: "    if (stored) return stored as Theme;" },
      { type: "add", lineNumber: 11, content: "    return window.matchMedia('(prefers-color-scheme: dark)').matches" },
      { type: "add", lineNumber: 12, content: "      ? 'dark' : 'light';" },
      { type: "add", lineNumber: 13, content: "  });" },
      { type: "add", lineNumber: 14, content: "" },
      { type: "add", lineNumber: 15, content: "  useEffect(() => {" },
      { type: "add", lineNumber: 16, content: "    document.documentElement.classList.toggle('dark', theme === 'dark');" },
      { type: "add", lineNumber: 17, content: "    localStorage.setItem('theme', theme);" },
      { type: "add", lineNumber: 18, content: "    toast(`Switched to ${theme} mode`);" },
      { type: "add", lineNumber: 19, content: "  }, [theme]);" },
      { type: "add", lineNumber: 20, content: "" },
      { type: "add", lineNumber: 21, content: "  return { theme, setTheme, toggle: () =>" },
      { type: "add", lineNumber: 22, content: "    setTheme(t => t === 'dark' ? 'light' : 'dark')" },
      { type: "add", lineNumber: 23, content: "  };" },
      { type: "add", lineNumber: 24, content: "}" },
    ],
  },
  {
    path: "src/components/settings/settings-modal.tsx",
    status: "modified",
    language: "tsx",
    diff: [
      { type: "context", lineNumber: 1, content: '"use client";' },
      { type: "context", lineNumber: 2, content: "" },
      { type: "remove", lineNumber: 3, content: 'import { useState } from "react";' },
      { type: "add", lineNumber: 3, content: 'import { useState, useCallback } from "react";' },
      { type: "add", lineNumber: 4, content: 'import { useTheme } from "@/hooks/use-theme";' },
      { type: "context", lineNumber: 5, content: 'import { cn } from "@/lib/utils";' },
      { type: "context", lineNumber: 6, content: "" },
      { type: "context", lineNumber: 42, content: "  // Appearance section" },
      { type: "add", lineNumber: 43, content: "  const { theme, toggle } = useTheme();" },
      { type: "add", lineNumber: 44, content: "" },
      { type: "add", lineNumber: 45, content: "  return (" },
      { type: "add", lineNumber: 46, content: '    <div className="flex items-center justify-between">' },
      { type: "add", lineNumber: 47, content: '      <span>Dark Mode</span>' },
      { type: "add", lineNumber: 48, content: "      <Switch checked={theme === 'dark'} onCheckedChange={toggle} />" },
      { type: "add", lineNumber: 49, content: "    </div>" },
      { type: "add", lineNumber: 50, content: "  );" },
    ],
  },
  {
    path: "src/app/globals.css",
    status: "modified",
    language: "css",
    diff: [
      { type: "context", lineNumber: 122, content: "  color-scheme: dark;" },
      { type: "context", lineNumber: 123, content: "}" },
      { type: "context", lineNumber: 124, content: "" },
      { type: "add", lineNumber: 125, content: "/* Theme transition */" },
      { type: "add", lineNumber: 126, content: "html {" },
      { type: "add", lineNumber: 127, content: "  transition: color-scheme 0.3s ease;" },
      { type: "add", lineNumber: 128, content: "}" },
    ],
  },
];

// ── Mock File Tree ────────────────────────────────────

export const MOCK_FILE_TREE: FileTreeNode[] = [
  {
    name: "src",
    path: "src",
    type: "directory",
    children: [
      {
        name: "app",
        path: "src/app",
        type: "directory",
        children: [
          {
            name: "globals.css",
            path: "src/app/globals.css",
            type: "file",
            status: "modified",
            language: "css",
          },
        ],
      },
      {
        name: "components",
        path: "src/components",
        type: "directory",
        children: [
          {
            name: "settings",
            path: "src/components/settings",
            type: "directory",
            children: [
              {
                name: "settings-modal.tsx",
                path: "src/components/settings/settings-modal.tsx",
                type: "file",
                status: "modified",
                language: "tsx",
              },
            ],
          },
        ],
      },
      {
        name: "hooks",
        path: "src/hooks",
        type: "directory",
        children: [
          {
            name: "use-theme.ts",
            path: "src/hooks/use-theme.ts",
            type: "file",
            status: "added",
            language: "typescript",
          },
        ],
      },
    ],
  },
];

// ── Mock Session ──────────────────────────────────────

export const MOCK_SESSION: BraneZOSession = {
  id: "session-001",
  title: "Dark mode toggle implementation",
  model: "GPT-5.3-Codex",
  messages: MOCK_MESSAGES,
  files: MOCK_FILE_CHANGES,
  fileTree: MOCK_FILE_TREE,
  tokensUsed: 24830,
  cost: 0.12,
  createdAt: new Date("2026-04-19T10:00:00"),
};

// ── Suggested Prompts ─────────────────────────────────

export const SUGGESTED_PROMPTS = [
  "Verify everything works",
  "Add delete agent functionality",
  "Wire up remaining routes",
  "Add unit tests for hooks",
];
