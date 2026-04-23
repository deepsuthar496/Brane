const { z } = require('zod');
const { zodToJsonSchema } = require('zod-to-json-schema');

const schema = z.object({
  required_field: z.string(),
  pattern: z.string().optional()
});

console.log(JSON.stringify(zodToJsonSchema(schema, "mySchema"), null, 2));
