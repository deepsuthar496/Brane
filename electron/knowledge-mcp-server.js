const { listFiles, getFileContent } = require("./knowledge-manager");

/**
 * A lightweight internal MCP server for knowledge retrieval.
 * This runs within the main process or can be spawned as a child.
 * For simplicity and "standard" integration, we'll expose its capabilities
 * as an MCP-compliant JSON-RPC interface if needed, but primarily 
 * it's used by the Brane Hub agent system.
 */

const KNOWLEDGE_SERVER_ID = "brane-knowledge";

const getCapabilities = () => ({
  tools: [
    {
      name: "list_knowledge_files",
      description: "Lists all files in the global knowledge base accessible to agents.",
      inputSchema: { type: "object", properties: {} }
    },
    {
      name: "read_knowledge_file",
      description: "Reads the content of a specific file from the global knowledge base.",
      inputSchema: {
        type: "object",
        properties: {
          name: { type: "string", description: "The name of the file to read" }
        },
        required: ["name"]
      }
    },
    {
      name: "search_knowledge",
      description: "Searches for a keyword or pattern within the global knowledge base files.",
      inputSchema: {
        type: "object",
        properties: {
          query: { type: "string", description: "The search query or keyword" }
        },
        required: ["query"]
      }
    }
  ]
});

async function callTool(name, args) {
  switch (name) {
    case "list_knowledge_files": {
      const files = await listFiles();
      return {
        content: [{ type: "text", text: JSON.stringify(files, null, 2) }]
      };
    }
    case "read_knowledge_file": {
      const content = await getFileContent(args.name);
      return {
        content: [{ type: "text", text: content }]
      };
    }
    case "search_knowledge": {
      const files = await listFiles();
      const results = [];
      const query = args.query.toLowerCase();
      
      for (const file of files) {
        try {
          const content = await getFileContent(file.name);
          if (content.toLowerCase().includes(query)) {
            results.push({ name: file.name, size: file.size, lastModified: file.updatedAt });
          }
        } catch (e) {
          // Skip files that can't be read (e.g. binary)
          process.stderr.write(`[Search Error] Could not read ${file.name}: ${e.message}\n`);
        }
      }
      
      if (results.length === 0) {
        return {
          content: [{ type: "text", text: `No matches found for "${args.query}".` }]
        };
      }

      return {
        content: [{ type: "text", text: `Found ${results.length} matches for "${args.query}":\n${JSON.stringify(results, null, 2)}` }]
      };
    }
    default:
      throw new Error(`Tool not found: ${name}`);
  }
}

module.exports = {
  KNOWLEDGE_SERVER_ID,
  getCapabilities,
  callTool
};
