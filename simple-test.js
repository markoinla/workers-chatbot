const WebSocket = require('ws');
const ws = new WebSocket('wss://chat-worker.m-6bb.workers.dev/socket/user-123-session?userId=user-123&projectId=webhook-test-1749327626988');

ws.on('open', function() {
  console.log('Connected');
  ws.send(JSON.stringify({
    type: 'user_message',
    messageId: 'test-123',
    data: { content: 'What PT-1 information is available?' }
  }));
});

ws.on('message', function(data) {
  const msg = JSON.parse(data);
  if (msg.data?.isComplete) {
    console.log('Response:', msg.data.content);
    ws.close();
  }
});

ws.on('error', (err) => console.error('Error:', err));
ws.on('close', () => console.log('Closed')); 