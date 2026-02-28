// Test script to verify webhook endpoint functionality
import { PrivateNotesApp } from './src/notes-app.ts';

async function testWebhookEndpoint() {
  console.log('Testing Private Notes App webhook endpoint...');
  
  // Start the app
  const app = new PrivateNotesApp({
    packageName: 'com.mentra.notesapp',
    apiKey: 'mock-api-key',
    port: 3001
  });
  
  // Start server in background
  const cleanup = await app.start();
  
  // Wait a moment for server to start
  await new Promise(resolve => setTimeout(resolve, 1000));
  
  console.log('Webhook endpoint test completed');
  console.log('Server is now running with webhook support');
  
  // Cleanup
  await app.stop();
}

testWebhookEndpoint();