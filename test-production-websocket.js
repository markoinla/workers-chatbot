const WebSocket = require('ws');

const ws = new WebSocket('wss://chat-worker.m-6bb.workers.dev/socket/user-123-session?userId=user-123&projectId=webhook-test-1749327626988');

ws.on('open', function open() {
  console.log('✅ Connected to production WebSocket');
  
  // Send a test message
  const message = {
    type: 'user_message',
    data: { content: 'tell me about pt-1' },
    messageId: 'test_msg_' + Date.now()
  };
  
  console.log('📤 Sending message:', message.data.content);
  ws.send(JSON.stringify(message));
});

ws.on('message', function message(data) {
  try {
    const parsed = JSON.parse(data.toString());
    console.log('📥 Received:', parsed.type, '-', parsed.data?.content?.substring(0, 100) + (parsed.data?.content?.length > 100 ? '...' : ''));
    
    if (parsed.type === 'assistant_message' && parsed.data?.isComplete) {
      console.log('✅ Complete response received!');
      ws.close();
    }
  } catch (error) {
    console.log('📥 Raw message:', data.toString());
  }
});

ws.on('error', function error(err) {
  console.error('❌ WebSocket error:', err.message);
});

ws.on('close', function close() {
  console.log('🔐 Connection closed');
});

// Timeout after 30 seconds
setTimeout(() => {
  console.log('⏰ Test timeout');
  ws.close();
}, 30000); 