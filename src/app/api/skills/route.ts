import { NextResponse } from 'next/server';
import { SkillManager } from '@/lib/skills';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const rootDir = searchParams.get('root') || process.cwd();

  try {
    const skillManager = new SkillManager(rootDir);
    await skillManager.discover();
    
    return NextResponse.json(skillManager.all());
  } catch (error) {
    console.error('Failed to fetch skills:', error);
    return NextResponse.json({ error: 'Failed to fetch skills' }, { status: 500 });
  }
}
