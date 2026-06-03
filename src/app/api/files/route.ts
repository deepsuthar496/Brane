import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const customRoot = searchParams.get('root');
  const rootDir = customRoot || process.cwd();

  async function scanDirectory(dir: string, currentPath: string = ''): Promise<any[]> {
    const entries = await fs.readdir(dir, { withFileTypes: true });

    const items = await Promise.all(
      entries.map(async (entry) => {
        if (['node_modules', '.git', '.next', 'dist', 'dist-electron', 'public'].includes(entry.name)) {
          return null;
        }

        const relativePath = path.join(currentPath, entry.name);
        const fullPath = path.join(dir, entry.name);

        if (entry.isDirectory()) {
          return {
            id: relativePath,
            name: entry.name,
            type: 'directory',
            children: await scanDirectory(fullPath, relativePath),
          };
        }

        return {
          id: relativePath,
          name: entry.name,
          type: 'file',
        };
      })
    );

    return (items.filter(Boolean) as any[]).sort((a, b) => {
      if (a.type === b.type) return a.name.localeCompare(b.name);
      return a.type === 'directory' ? -1 : 1;
    });
  }

  try {
    const tree = await scanDirectory(rootDir);
    return NextResponse.json(tree);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read directory' }, { status: 500 });
  }
}
