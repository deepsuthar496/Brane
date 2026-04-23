const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

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

const schema = zodToJsonSchema(grepSearchSchema, { target: "openApi3" });
console.log(JSON.stringify(schema, null, 2));
