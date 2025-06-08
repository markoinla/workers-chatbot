// Test script to check document coverage
import WebSocket from 'ws';

const ws = new WebSocket('wss://chat-worker.m-6bb.workers.dev/socket/user-123-session?userId=user-123&projectId=webhook-test-1749327626988');

ws.on('open', function open() {
  console.log('🔗 Connected to production WebSocket');
  
  // Test query to check PT-1 through PT-5 coverage
  const testMessage = {
    type: 'user_message',
    messageId: `msg_${Date.now()}`,
    data: {
      content: 'What are the specifications for PT-1, PT-2, PT-3, PT-4, and PT-5? List all the different Post-Tensioned details available.'
    }
  };
  
  console.log('📤 Sending comprehensive PT query...');
  ws.send(JSON.stringify(testMessage));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Received:', parsed.type);
    
    if (parsed.type === 'assistant_message') {
      if (parsed.data?.isComplete) {
        console.log('✅ Complete response:');
        console.log('----------------------------------------');
        console.log(parsed.data.content);
        console.log('----------------------------------------');
        
        // Check for mentions of different pages/documents
        const content = parsed.data.content;
        const pageMatches = content.match(/Page \d+/g) || [];
        const ptMatches = content.match(/PT-\d+/g) || [];
        
        console.log('\n📊 Analysis:');
        console.log('Pages mentioned:', [...new Set(pageMatches)]);
        console.log('PT items found:', [...new Set(ptMatches)]);
        
        ws.close();
      } else {
        // Show streaming content
        process.stdout.write('.');
      }
    }
  } catch (error) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.on('close', function close(event) {
  console.log('\n🔌 WebSocket closed:', event.code, event.reason);
}); 