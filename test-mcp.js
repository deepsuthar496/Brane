const { streamText, tool } = require('ai');
const { createOpenAICompatible } = require('@ai-sdk/openai-compatible');

async function test() {
  const model = createOpenAICompatible({
    name: 'test',
    baseURL: 'http://localhost:11434/v1', // Dummy
    apiKey: 'local',
  }).languageModel('test');

  const result = streamText({
    model,
    messages: [{ role: 'user', content: 'test' }],
    tools: {
      myTool: tool({
        description: 'test',
        parameters: { type: 'object', properties: {} },
        execute: async () => 'hello world'
      })
    }
  });

  // We won't actually run it because it needs a real model, 
  // but we can check the types if we had TS.
  // Instead, let's just inspect the code again very carefully.
}

console.log("Checking for 'result' vs 'output' in ai package...");
const fs = require('fs');
const content = fs.readFileSync('node_modules/ai/dist/index.js', 'utf8');
const index = content.indexOf('case "tool-result":');
if (index !== -1) {
  console.log("Found tool-result case. Context:");
  console.log(content.substring(index, index + 500));
}
