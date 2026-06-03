import { NextResponse } from 'next/server';
import fs from 'fs/promises';
import path from 'path';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filePath = searchParams.get('path');
  
  if (!filePath) {
    return NextResponse.json({ error: 'Path is required' }, { status: 400 });
  }

  const customRoot = searchParams.get('root');
  const rootDir = customRoot || process.cwd();
  const fullPath = path.resolve(rootDir, filePath);
  
  if (!fullPath.startsWith(rootDir)) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 });
  }

  try {
    const content = await fs.readFile(fullPath, 'utf-8');
    return new NextResponse(content, {
      headers: {
        'Content-Type': 'text/plain',
      },
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to read file' }, { status: 500 });
  }
}