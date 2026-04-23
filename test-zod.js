const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

const globSearchSchema = z.object({ 
  pattern: z.string().describe("The search pattern. REQUIRED."),
  query: z.string().optional(),
  path: z.string().optional(),
  dir_path: z.string().optional(),
  max_results: z.number().optional(),
  limit: z.number().optional()
});

const grepSearchSchema = z.object({
  pattern: z.string().describe("The text or regex to search for. REQUIRED."),
  query: z.string().optional(),
  path: z.string().optional(),
  dir_path: z.string().optional(),
  max_results: z.number().optional(),
  limit: z.number().optional(),
  include_pattern: z.string().optional(),
  exclude_pattern: z.string().optional()
});

console.log("=== GLOB SEARCH SCHEMA ===");
console.log(JSON.stringify(zodToJsonSchema(globSearchSchema, "globSearch"), null, 2));

console.log("\n=== GREP SEARCH SCHEMA ===");
console.log(JSON.stringify(zodToJsonSchema(grepSearchSchema, "grepSearch"), null, 2));
