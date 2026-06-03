import { exec } from 'child_process';
import util from 'util';
import path from 'path';

const execAsync = util.promisify(exec);

export interface Problem {
  id: string;
  type: "error" | "warning" | "info";
  message: string;
  file: string;
  line: number;
  column: number;
  source: string;
}

export async function runWorkspaceDiagnostics(rootDir: string): Promise<Problem[]> {
  const problems: Problem[] = [];

  // Run TypeScript compiler
  try {
    await execAsync('npx tsc --noEmit', { cwd: rootDir });
  } catch (e: any) {
    const output = e.stdout || '';
    const lines = output.split('\n');
    
    let currentFile = '';
    for (const line of lines) {
      // Matches both standard format: "file.ts(line,col): error TS1234: message"
      // and pretty format: "file.ts:line:col - error TS1234: message"
      const match = line.match(/^(.+?)(?:\((\d+),(\d+)\)|:(\d+):(\d+))(?:\s+-\s+|\s*:\s*)(error|warning)\s+(TS\d+):\s+(.+)$/);
      
      if (match) {
        currentFile = match[1];
        if (!currentFile.includes('node_modules')) {
          problems.push({
            id: Math.random().toString(36).substring(2, 9),
            type: match[6] === 'error' ? 'error' : 'warning',
            message: `${match[7]}: ${match[8]}`,
            file: path.relative(rootDir, currentFile) || currentFile,
            line: parseInt(match[2] || match[4], 10),
            column: parseInt(match[3] || match[5], 10),
            source: 'tsc'
          });
        }
      }
    }
  }
  
  // Run ESLint
  try {
    // -f json outputs the results as a JSON array
    const { stdout } = await execAsync('npx eslint . -f json', { cwd: rootDir });
    parseEslintOutput(stdout, problems, rootDir);
  } catch (e: any) {
    // ESLint exits with code 1 if there are errors, which throws an exception here
    const stdout = e.stdout || '';
    if (stdout.startsWith('[')) {
      parseEslintOutput(stdout, problems, rootDir);
    }
  }

  return problems;
}

function parseEslintOutput(stdout: string, problems: Problem[], rootDir: string) {
  try {
    const results = JSON.parse(stdout);
    for (const result of results) {
      const file = result.filePath;
      // Skip node_modules just in case
      if (file.includes('node_modules')) continue;
      
      const relativeFile = path.relative(rootDir, file) || file;

      for (const msg of result.messages) {
        problems.push({
          id: Math.random().toString(36).substring(2, 9),
          type: msg.severity === 2 ? 'error' : 'warning',
          message: `${msg.ruleId ? `[${msg.ruleId}] ` : ''}${msg.message}`,
          file: relativeFile,
          line: msg.line || 1,
          column: msg.column || 1,
          source: 'eslint'
        });
      }
    }
  } catch (err) {
    console.error('Failed to parse ESLint output', err);
  }
}


