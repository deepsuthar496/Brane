import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface FileTreeState {
  fileTree: any[];
  setFileTree: (tree: any[]) => void;
  expandedFolders: Record<string, boolean>;
  toggleFolder: (id: string, isOpen?: boolean) => void;
}

export const useFileTreeStore = create<FileTreeState>()(
  persist(
    (set) => ({
      fileTree: [],
      setFileTree: (tree) => set({ fileTree: tree }),
      expandedFolders: {},
      toggleFolder: (id, isOpen) => set((state) => {
        const nextState = isOpen !== undefined ? isOpen : !state.expandedFolders[id];
        const newExpanded = { ...state.expandedFolders };
        if (nextState) {
          newExpanded[id] = true;
        } else {
          delete newExpanded[id];
        }
        return { expandedFolders: newExpanded };
      }),
    }),
    {
      name: 'brane-file-tree-storage',
    }
  )
);
