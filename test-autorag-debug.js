// Test script to debug AutoRAG namespace and see all available documents
const ws = new WebSocket('wss://chat-worker.m-6bb.workers.dev/socket/user-123-session?userId=user-123&projectId=webhook-test-1749327626988');

// Test connection
ws.addEventListener('open', function open() {
  console.log('🔗 Connected to production WebSocket');
  
  // Send a test query to see what documents are available
  const testMessage = {
    type: 'user_message',
    messageId: `msg_${Date.now()}`,
    data: {
      content: 'List all available documents and pages'
    }
  };
  
  console.log('📤 Sending test query:', testMessage.data.content);
  ws.send(JSON.stringify(testMessage));
});

ws.addEventListener('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Received:', parsed.type);
    
    if (parsed.type === 'assistant_message') {
      console.log('💬 Content:', parsed.data?.content);
      
      if (parsed.data?.isComplete) {
        console.log('✅ Complete response received!');
        
        // Now test with a specific query to see page coverage
        setTimeout(() => {
          const specificQuery = {
            type: 'user_message',
            messageId: `msg_${Date.now()}`,
            data: {
              content: 'What information is available about PT-1, PT-2, PT-3, PT-4, and PT-5?'
            }
          };
          
          console.log('\n📤 Sending specific query:', specificQuery.data.content);
          ws.send(JSON.stringify(specificQuery));
        }, 1000);
      }
    }
  } catch (error) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.addEventListener('error', function error(err) {
  console.error('❌ WebSocket error:', err);
});

ws.addEventListener('close', function close(event) {
  console.log('🔌 WebSocket closed:', event.code, event.reason);
}); 