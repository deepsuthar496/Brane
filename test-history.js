const { agentSession } = require('./electron/agent/session.js');
const { toolModelMessageSchema } = require('ai');

async function test() {
  // Simulate a UI-style message history after a tool call completed
  const uiHistory = [
    { role: 'user', content: 'Read package.json' },
    { 
      role: 'assistant', 
      content: 'Let me read it.',
      toolUse: [
        { id: 'call-1', toolName: 'read_file', input: { path: 'package.json' }, status: 'success', output: 'Contents of package.json' }
      ]
    }
  ];

  try {
    const processed = await agentSession.processMentions(uiHistory, process.cwd());
    console.log('processMentions OK. History size:', processed.length);
    
    // Validate each message against the SDK schema
    for (let i = 0; i < processed.length; i++) {
      const msg = processed[i];
      if (msg.role === 'tool') {
        try {
          toolModelMessageSchema.parse(msg);
          console.log(`  [${i}] role=tool -> SCHEMA VALID`);
        } catch (e) {
          console.error(`  [${i}] role=tool -> SCHEMA INVALID:`, JSON.stringify(e.issues, null, 2));
        }
      } else {
        console.log(`  [${i}] role=${msg.role} -> OK`);
      }
    }
    
    console.log('\nFull processed history:');
    console.log(JSON.stringify(processed, null, 2));
  } catch (e) {
    console.error('FAILED:', e.message);
  }
}

test();
