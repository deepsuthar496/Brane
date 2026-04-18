const fs = require('fs');
const path = require('path');
const os = require('os');

const SETTINGS_PATH = path.join(os.homedir(), '.gemini', 'settings.json');

function fixConfig() {
  console.log(`Checking ${SETTINGS_PATH}...`);
  
  if (!fs.existsSync(SETTINGS_PATH)) {
    console.log('Settings file not found. Nothing to fix.');
    return;
  }

  try {
    const data = fs.readFileSync(SETTINGS_PATH, 'utf-8');
    const settings = JSON.parse(data);
    let changed = false;

    if (settings.mcpServers) {
      if (!settings.brane_disabled_mcp_servers) {
        settings.brane_disabled_mcp_servers = {};
      }

      for (const id in settings.mcpServers) {
        const config = settings.mcpServers[id];
        if (config && typeof config === 'object') {
          if ('disabled' in config) {
            console.log(`Fixing ${id}...`);
            const isDisabled = config.disabled === true;
            delete config.disabled;
            
            if (isDisabled) {
              console.log(`Moving ${id} to disabled servers list.`);
              settings.brane_disabled_mcp_servers[id] = config;
              delete settings.mcpServers[id];
            }
            changed = true;
          }
        }
      }
    }

    if (changed) {
      fs.writeFileSync(SETTINGS_PATH, JSON.stringify(settings, null, 2), 'utf-8');
      console.log('Configuration fixed successfully!');
    } else {
      console.log('No invalid configuration found.');
    }
  } catch (err) {
    console.error('Error fixing configuration:', err.message);
  }
}

fixConfig();
