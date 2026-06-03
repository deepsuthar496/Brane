const fs = require('fs');
const path = require('path');
const { app } = require('electron');

const LOGS_FILE = path.join(app.getPath('userData'), 'logs.json');

/**
 * Log levels: 'info' | 'warn' | 'error' | 'debug'
 * Log entry: { id, timestamp, level, source, message, details }
 */

const getLogs = async () => {
  try {
    if (!fs.existsSync(LOGS_FILE)) {
      // Return some initial mock logs if the file doesn't exist
      const mockLogs = [
        {
          id: '1',
          timestamp: new Date(Date.now() - 1000 * 60 * 5).toISOString(),
          level: 'info',
          source: 'System',
          message: 'Brane Hub started successfully.',
        },
        {
          id: '2',
          timestamp: new Date(Date.now() - 1000 * 60 * 4).toISOString(),
          level: 'info',
          source: 'CLI Discovery',
          message: 'Discovered Gemini CLI at C:\\Users\\Admin\\AppData\\Roaming\\npm\\gemini.cmd',
        },
        {
          id: '3',
          timestamp: new Date(Date.now() - 1000 * 60 * 3).toISOString(),
          level: 'warn',
          source: 'MCP Manager',
          message: 'MCP Server "github" is disabled. Skipping initialization.',
        },
        {
          id: '4',
          timestamp: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
          level: 'error',
          source: 'Registry',
          message: 'Failed to fetch registry data from CDN. Falling back to GitHub raw.',
          details: 'Error: 404 Not Found'
        },
        {
          id: '5',
          timestamp: new Date(Date.now() - 1000 * 60 * 1).toISOString(),
          level: 'info',
          source: 'Skills',
          message: 'Loaded 12 skills from local registry.',
        }
      ];
      return mockLogs;
    }
    const data = fs.readFileSync(LOGS_FILE, 'utf8');
    return JSON.parse(data);
  } catch (error) {
    console.error('Error reading logs:', error);
    return [];
  }
};

const addLog = async (level, source, message, details = null) => {
  try {
    const logs = await getLogs();
    const newLog = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      level,
      source,
      message,
      details
    };
    logs.push(newLog);
    
    // Keep only last 1000 logs
    const trimmedLogs = logs.slice(-1000);
    
    fs.writeFileSync(LOGS_FILE, JSON.stringify(trimmedLogs, null, 2));
    return newLog;
  } catch (error) {
    console.error('Error adding log:', error);
  }
};

const clearLogs = async () => {
  try {
    fs.writeFileSync(LOGS_FILE, JSON.stringify([], null, 2));
    return true;
  } catch (error) {
    console.error('Error clearing logs:', error);
    return false;
  }
};

module.exports = {
  getLogs,
  addLog,
  clearLogs
};
