// Let's temporarily disable the query instructions to see raw results
const WebSocket = require('ws');

function debugQuery(question) {
  const ws = new WebSocket('wss://chat-worker.m-6bb.workers.dev/socket/user-123-session?userId=user-123&projectId=webhook-test-1749327626988');
  
  ws.on('open', function() {
    console.log(`🔍 Debug query: "${question}"`);
    ws.send(JSON.stringify({
      type: 'user_message',
      messageId: `debug-${Date.now()}`,
      data: { content: question }
    }));
  });

  ws.on('message', function(data) {
    const msg = JSON.parse(data);
    if (msg.data?.isComplete) {
      console.log('📋 Raw response:');
      console.log(msg.data.content);
      console.log('\n🔍 Analysis:');
      
      // Analyze the response
      const content = msg.data.content;
      const ptMatches = [...new Set(content.match(/PT-\d+/g) || [])];
      const pageMatches = [...new Set(content.match(/Page \d+/g) || [])];
      
      console.log('PT items found:', ptMatches);
      console.log('Pages referenced:', pageMatches);
      console.log('Response length:', content.length);
      console.log('─'.repeat(80));
      
      ws.close();
    }
  });

  ws.on('error', (err) => console.error('❌ Error:', err));
}

// Test a comprehensive query
debugQuery("List all PT items (PT-1, PT-2, PT-3, PT-4, PT-5) and their specifications from all available pages"); 