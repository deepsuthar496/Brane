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

// CDN URLs
export const BASE_URL = 'https://cdn.jsdelivr.net/gh/deepsuthar496/Brane@main'
export const FALLBACK_URL = 'https://raw.githubusercontent.com/deepsuthar496/Brane/main'

export const REGISTRY_URLS = {
  index: `${BASE_URL}/registry/index.json`,
  skillCategory: (cat: string) => `${BASE_URL}/registry/skills/${cat}.json`,
  skillMeta: (cat: string, id: string) => `${BASE_URL}/registry/skills/${cat}/${id}/meta.json`,
  skillContent: (cat: string, id: string) => `${BASE_URL}/registry/skills/${cat}/${id}/SKILL.md`,
  mcps: `${BASE_URL}/registry/mcps/all.json`,
  prompts: `${BASE_URL}/registry/prompts/all.json`,
}
