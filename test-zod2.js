const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

const globSearchSchema = z.object({ 
  pattern: z.string(),
  query: z.string().optional()
});

console.log(JSON.stringify(zodToJsonSchema(globSearchSchema), null, 2));
