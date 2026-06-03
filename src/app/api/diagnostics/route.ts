import { NextResponse } from 'next/server';
import { getGlobalLSPManager, prettyDiagnostic, type Diagnostic, DiagnosticSeverity } from '@/lib/lsp';
import path from 'path';

// Cache to track which roots have had their files fully scanned
const scannedRoots = new Set<string>();

async function scanForSourceFiles(dir: string): Promise<string[]> {
  let results: string[] = [];
  try {
    const entries = await require('fs/promises').readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (['node_modules', '.git', '.next', 'dist', 'dist-electron', 'public'].includes(entry.name)) {
        continue;
      }
      const fullPath = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        results = results.concat(await scanForSourceFiles(fullPath));
      } else {
        const ext = path.extname(entry.name);
        if (['.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs'].includes(ext)) {
          results.push(fullPath);
        }
      }
    }
  } catch (e) {
    // ignore
  }
  return results;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const customRoot = searchParams.get('root');
  const rootDir = customRoot || process.cwd();

  const lspManager = getGlobalLSPManager(rootDir);

  try {
    // Perform a one-time full workspace scan to trigger diagnostics for all existing files
    if (!scannedRoots.has(rootDir)) {
      scannedRoots.add(rootDir);
      const allFiles = await scanForSourceFiles(rootDir);
      for (const file of allFiles) {
        try {
          await lspManager.touchFile(file, true);
        } catch {
          // Ignore files that fail to open in LSP
        }
      }
    }

    // Collect all diagnostics and format as Problem[]
    const allDiags = lspManager.getDiagnostics();
    const problems: Array<{
      id: string;
      type: 'error' | 'warning' | 'info';
      message: string;
      file: string;
      line: number;
      column: number;
      source: string;
    }> = [];

    for (const [filePath, diags] of Object.entries(allDiags)) {
      for (const diag of diags) {
        // Only include errors and warnings
        if (
          diag.severity !== DiagnosticSeverity.Error &&
          diag.severity !== DiagnosticSeverity.Warning
        ) {
          continue;
        }

        const relPath = path.relative(rootDir, filePath) || filePath;
        problems.push({
          id: Math.random().toString(36).substring(2, 9),
          type: diag.severity === DiagnosticSeverity.Error ? 'error' : 'warning',
          message: diag.message,
          file: relPath,
          line: diag.range.start.line + 1,
          column: diag.range.start.character + 1,
          source: 'lsp',
        });
      }
    }

    return NextResponse.json(problems);
  } catch (error) {
    console.error('Failed to run LSP diagnostics:', error);
    return NextResponse.json({ error: 'Failed to run diagnostics' }, { status: 500 });
  }
}
