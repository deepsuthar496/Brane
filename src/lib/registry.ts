export type ItemType = 'skill' | 'mcp' | 'prompt'

// index.json types
export interface CategoryMeta {
  id: string
  label: string
  icon?: string
  count: number
}

export interface Collection {
  id: string
  label: string
  skillIds: string[]
}

export interface RegistryIndex {
  version: number
  updatedAt: string
  categories: {
    skills: CategoryMeta[]
    mcps: CategoryMeta[]
    prompts: CategoryMeta[]
  }
  featured: string[]
  new: string[]
  collections?: Collection[]
}

// Category JSON types (card grid)
export interface SkillEntry {
  id: string
  name: string
  description: string
  icon: string
  version: string
  author: string
  license: string
  tags: string[]
  compatibleAgents: string[]
  featured: boolean
  path: string
}

export interface McpEntry {
  id: string
  name: string
  icon: string
  category: string
  description: string
  command?: string
  args?: string[]
  url?: string
  requiredCredentials?: string[]
  configPath: string
}

export interface PromptEntry {
  id: string
  name: string
  description: string
  category: string
  path: string
}

// meta.json type (detail page)
export interface SkillDetail extends SkillEntry {
  homepage?: string
  authorUrl?: string
  readme: string
  changelog: string[]
  screenshots: string[]
  size: string
  installPath: string
  requiredCredentials: string[]
  optionalDependencies?: string[]
}

// Lock file types
export interface InstalledItem {
  version: string
  installedAt: string
  path: string
  enabled: boolean
}

export interface SkillsLock {
  version: number
  installed: {
    skills: Record<string, InstalledItem>
    mcps: Record<string, InstalledItem>
    prompts: Record<string, InstalledItem>
  }
}

export function getRegistryUrls(repo: string) {
  const baseUrl = `https://cdn.jsdelivr.net/gh/${repo}`;
  const fallbackUrl = `https://raw.githubusercontent.com/${repo}/main`;

  return {
    index: { cdn: `${baseUrl}/registry/index.json`, fallback: `${fallbackUrl}/registry/index.json` },
    skillCategory: (cat: string) => ({ 
      cdn: `${baseUrl}/registry/skills/${cat}.json`, 
      fallback: `${fallbackUrl}/registry/skills/${cat}.json` 
    }),
    skillMeta: (cat: string, id: string) => ({ 
      cdn: `${baseUrl}/registry/skills/${cat}/${id}/meta.json`, 
      fallback: `${fallbackUrl}/registry/skills/${cat}/${id}/meta.json` 
    }),
    skillContent: (cat: string, id: string) => ({ 
      cdn: `${baseUrl}/registry/skills/${cat}/${id}/SKILL.md`, 
      fallback: `${fallbackUrl}/registry/skills/${cat}/${id}/SKILL.md` 
    }),
    mcps: { cdn: `${baseUrl}/registry/mcps/all.json`, fallback: `${fallbackUrl}/registry/mcps/all.json` },
    mcpCategory: (cat: string) => ({ 
      cdn: `${baseUrl}/registry/mcps/${cat}.json`, 
      fallback: `${fallbackUrl}/registry/mcps/${cat}.json` 
    }),
    prompts: { cdn: `${baseUrl}/registry/prompts/all.json`, fallback: `${fallbackUrl}/registry/prompts/all.json` },
  };
}

export async function fetchWithFallback<T>(
  urlPair: { cdn: string, fallback: string },
  token?: string | null
): Promise<T> {
  // 1. Try CDN first (no token needed, fastest)
  try {
    const response = await fetch(urlPair.cdn);
    if (response.ok) {
      return await response.json();
    }
  } catch (e) {
    console.warn("CDN fetch failed, trying fallback...", e);
  }

  // 2. Try Fallback (GitHub Raw) - with token if provided
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `token ${token}`;
  }

  try {
    const response = await fetch(urlPair.fallback, { headers });
    if (!response.ok) {
      throw new Error(`Failed to fetch from Fallback. Status: ${response.status}`);
    }
    return await response.json();
  } catch (e) {
    throw new Error(`Failed to fetch from both CDN and Fallback: ${e instanceof Error ? e.message : String(e)}`);
  }
}
