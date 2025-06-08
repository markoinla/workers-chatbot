const WebSocket = require('ws');

function testQuery(question, callback) {
  const ws = new WebSocket('wss://chat-worker.m-6bb.workers.dev/socket/user-123-session?userId=user-123&projectId=webhook-test-1749327626988');
  
  ws.on('open', function() {
    console.log(`\n🔍 Testing: "${question}"`);
    ws.send(JSON.stringify({
      type: 'user_message',
      messageId: `test-${Date.now()}`,
      data: { content: question }
    }));
  });

  ws.on('message', function(data) {
    const msg = JSON.parse(data);
    if (msg.data?.isComplete) {
      console.log('✅ Response:');
      console.log(msg.data.content);
      console.log('─'.repeat(80));
      ws.close();
      if (callback) callback();
    }
  });

  ws.on('error', (err) => {
    console.error('❌ Error:', err);
    if (callback) callback();
  });

  ws.on('close', () => {
    if (callback) callback();
  });
}

// Test multiple PT queries
const questions = [
  "What is PT-1?",
  "Tell me about PT-2, PT-3, PT-4, and PT-5",
  "What are all the post-tensioned specifications available?"
];

let currentIndex = 0;

function runNextTest() {
  if (currentIndex < questions.length) {
    testQuery(questions[currentIndex], () => {
      currentIndex++;
      setTimeout(runNextTest, 2000); // Wait 2 seconds between tests
    });
  } else {
    console.log('\n✅ All tests completed!');
  }
}

runNextTest(); 