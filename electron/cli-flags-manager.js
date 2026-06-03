const { exec } = require('child_process');
const fs = require('fs/promises');
const path = require('path');
const { app } = require('electron');
const util = require('util');
const https = require('https');

const execAsync = util.promisify(exec);

// Cache structure: { agentName: { timestamp: number, flags: [...] } }
let runtimeCache = {};
const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours

async function fetchFromUrl(url, token) {
  const options = {
    headers: {
      'User-Agent': 'Brane-Desktop-App',
      'Accept': 'application/json, text/plain, */*'
    }
  }
  
  let fetchUrl = url;

  if (token) {
    options.headers['Authorization'] = `Bearer ${token.trim()}`;
    
    // GitHub raw URLs don't support Auth headers for private repos. Must use API.
    if (url.includes('raw.githubusercontent.com')) {
      const match = url.match(/raw\.githubusercontent\.com\/([^\/]+)\/([^\/]+)\/([^\/]+)\/(.+)$/);
      if (match) {
        const [, owner, repo, branch, filePath] = match;
        fetchUrl = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${branch}`;
        options.headers['Accept'] = 'application/vnd.github.v3.raw';
      }
    }
  }

  const response = await fetch(fetchUrl, options);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${fetchUrl}`);
  }
  
  const text = await response.text();
  return text;
}

async function fetchRuntimeFlags(agentName) {
  // Normalize agent name for command execution
  let commandName = agentName;
  if (agentName === 'claude-code') commandName = 'claude';
  if (agentName === 'gemini-cli') commandName = 'gemini';

  // Check cache
  const cached = runtimeCache[agentName];
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.flags;
  }

  // Execute --help
  const command = `${commandName} --help`;
  
  try {
    const { stdout } = await execAsync(command, { timeout: 2000 });
    const flags = parseHelpOutput(stdout);
    
    runtimeCache[agentName] = {
      timestamp: Date.now(),
      flags
    };
    return flags;
  } catch (error) {
    console.error(`Failed to fetch runtime flags for ${agentName}:`, error.message);
    return cached ? cached.flags : [];
  }
}

function parseHelpOutput(output) {
  const flags = [];
  const lines = output.split('\n');
  
  // Improved regex to catch more flag formats
  // Matches: --flag, --flag <value>, --flag [value], -f, --flag  Description
  const flagRegex = /^\s*(-[a-zA-Z0-9],?\s+)?(--[a-zA-Z0-9-]+)(?:\s+[<\[][^>\]]+[>\]])?\s+(.*)$/;
  
  for (const line of lines) {
    const match = line.match(flagRegex);
    if (match) {
      flags.push({
        name: match[2],
        description: match[3].trim()
      });
    }
  }

  // Fallback for simple --flag descriptions if nothing matched
  if (flags.length === 0) {
    const simpleRegex = /^\s*(--[a-zA-Z0-9-]+)\s+(.*)$/;
    for (const line of lines) {
      const match = line.match(simpleRegex);
      if (match && !flags.find(f => f.name === match[1])) {
        flags.push({
          name: match[1],
          description: match[2].trim()
        });
      }
    }
  }

  return flags;
}

async function getRegistryFlags(agentName, configManager) {
  // Normalize for registry lookup (e.g. claude-code -> claude)
  const registryName = agentName.split('-')[0];
  // Fetch remote registry JSON from CDN or Fallback (Raw GitHub)
  const token = await configManager.getGithubToken();
  const repo = await configManager.getRegistryRepo();
  
  // URLs for remote fetch
  const cdnUrl = `https://cdn.jsdelivr.net/gh/${repo}@main/flags/${registryName}.json`;
  const fallbackUrl = `https://raw.githubusercontent.com/${repo}/main/flags/${registryName}.json`;
  
  try {
    // 1. Try local first (development)
    const localPath = path.join(app.getAppPath(), 'BraneRegistry', 'flags', `${registryName}.json`);
    try {
      const data = await fs.readFile(localPath, 'utf-8');
      return JSON.parse(data).flags || {};
    } catch (e) {
      // Local failed, continue to remote
    }

    // 2. Try CDN
    try {
      const data = await fetchFromUrl(cdnUrl);
      return JSON.parse(data).flags || {};
    } catch (e) {
      // 3. Try Fallback with token (for private repos)
      const data = await fetchFromUrl(fallbackUrl, token);
      return JSON.parse(data).flags || {};
    }
  } catch (error) {
    console.warn(`Failed to fetch registry for ${agentName}:`, error.message);
    return {};
  }
}

async function getMergedFlags(agentName, configManager) {
  const runtimeFlags = await fetchRuntimeFlags(agentName);
  const registryFlags = await getRegistryFlags(agentName, configManager);
  
  const merged = runtimeFlags.map(rf => {
    const registryData = registryFlags[rf.name] || {};
    return {
      name: rf.name,
      description: registryData.description || rf.description,
      category: registryData.category || 'Unrecognized',
      dangerLevel: registryData.dangerLevel || 'none',
      type: registryData.type || 'boolean',
      example: registryData.example,
      deprecated: registryData.deprecated || false
    };
  });
  
  return merged;
}

function setupCliFlagsManager(ipcMain, configManager) {
  ipcMain.handle('cli-flags:get-available', async (event, agentName) => {
    return await getMergedFlags(agentName, configManager);
  });
  
  ipcMain.handle('cli-flags:get-enabled', async (event, agentName) => {
    const allFlags = await configManager.get('agentFlags') || {};
    return allFlags[agentName] || {};
  });
  
  ipcMain.handle('cli-flags:set-enabled', async (event, agentName, flagName, value) => {
    const allFlags = await configManager.get('agentFlags') || {};
    if (!allFlags[agentName]) {
      allFlags[agentName] = {};
    }
    allFlags[agentName][flagName] = value;
    await configManager.set('agentFlags', allFlags);
    return allFlags[agentName];
  });
}

module.exports = { setupCliFlagsManager };
