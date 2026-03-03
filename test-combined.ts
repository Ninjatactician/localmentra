// Test script for Combined Notes & Home Assistant App endpoints
import { CombinedApp } from './src/combined-app.ts';

async function testEndpoints() {
  console.log('Testing Combined Notes & Home Assistant App endpoints...');
  
  // Start the app
  const app = new CombinedApp({
    packageName: process.env.PACKAGE_NAME || 'com.mentra.combinedapp',
    apiKey: process.env.MENTRAOS_API_KEY || 'mock-api-key',
    port: 3002
  });
  
  // Give it a moment to start up
  app.start();

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 1: Root endpoint
  console.log('\n1. Testing root endpoint (/):');
  try {
    // We'll test this by making a request to the server
    const response = await fetch('http://localhost:3002/');
    const data = await response.json();
    console.log('✓ Root endpoint response:', data);
  } catch (error) {
    console.log('✗ Root endpoint error:', error);
  }
  
  // Test 2: Notes endpoint (GET)
  console.log('\n2. Testing notes GET endpoint (/notes):');
  try {
    const response = await fetch('http://localhost:3002/notes');
    const data = await response.json();
    console.log('✓ Notes GET response:', data);
  } catch (error) {
    console.log('✗ Notes GET endpoint error:', error);
  }
  
  // Test 3: Create note endpoint (POST)
  console.log('\n3. Testing create note POST endpoint (/notes):');
  try {
    const response = await fetch('http://localhost:3002/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        text: 'Test note for endpoint testing'
      })
    });
    
    const data = await response.json();
    console.log('✓ Create note response:', data);
  } catch (error) {
    console.log('✗ Create note endpoint error:', error);
  }
  
  // Test 4: Search notes endpoint (GET)
  console.log('\n4. Testing search notes endpoint (/notes/search/test):');
  try {
    const response = await fetch('http://localhost:3002/notes/search/test');
    const data = await response.json();
    console.log('✓ Search notes response:', data);
  } catch (error) {
    console.log('✗ Search notes endpoint error:', error);
  }
  
  // Test 5: Delete note endpoint (DELETE)
  console.log('\n5. Testing delete note endpoint (/notes/123456):');
  try {
    const response = await fetch('http://localhost:3002/notes/123456', {
      method: 'DELETE'
    });
    
    const data = await response.json();
    console.log('✓ Delete note response:', data);
  } catch (error) {
    console.log('✗ Delete note endpoint error:', error);
  }
  
  // Test HA endpoints
  console.log('\n6. Testing Home Assistant endpoints:');
  
  try {
    // Test HA settings endpoint
    const settingsResponse = await fetch('http://localhost:3002/webview/api/settings');
    const settingsData = await settingsResponse.json();
    console.log('✓ HA Settings response:', settingsData);
    
    // Test HA log endpoint
    const logResponse = await fetch('http://localhost:3002/webview/api/log');
    const logData = await logResponse.json();
    console.log('✓ HA Log response:', logData);
    
  } catch (error) {
    console.log('✗ HA endpoints error:', error);
  }
  
  // Stop the server
  await app.stop();
  
  console.log('\nTesting complete!');
}

testEndpoints();