// Test script for Private Notes App endpoints
import { NotesApp } from './src/notes-app.ts';

async function testEndpoints() {
  console.log('Testing Private Notes App endpoints...');
  
  // Start the app


  const app = new NotesApp({
    packageName: process.env.PACKAGE_NAME || 'com.mentra.notesapp',
    apiKey: process.env.MENTRAOS_API_KEY || 'mock-api-key',
    port: 3001
  });
  
  // Give it a moment to start up
  app.start();

  await new Promise(resolve => setTimeout(resolve, 500));

  // Test 1: Root endpoint
  console.log('\n1. Testing root endpoint (/):');
  try {
    // We'll test this by making a request to the server
    const response = await fetch('http://localhost:3001/');
    const data = await response.json();
    console.log('✓ Root endpoint response:', data);
  } catch (error) {
    console.log('✗ Root endpoint error:', error);
  }
  
  // Test 2: Notes endpoint (GET)
  console.log('\n2. Testing notes GET endpoint (/notes):');
  try {
    const response = await fetch('http://localhost:3001/notes');
    const data = await response.json();
    console.log('✓ Notes GET response:', data);
  } catch (error) {
    console.log('✗ Notes GET endpoint error:', error);
  }
  
  // Test 3: Create note endpoint (POST)
  console.log('\n3. Testing create note POST endpoint (/notes):');
  try {
    const response = await fetch('http://localhost:3001/notes', {
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
    const response = await fetch('http://localhost:3001/notes/search/test');
    const data = await response.json();
    console.log('✓ Search notes response:', data);
  } catch (error) {
    console.log('✗ Search notes endpoint error:', error);
  }
  
  // Test 5: Delete note endpoint (DELETE)
  console.log('\n5. Testing delete note endpoint (/notes/123456):');
  try {
    const response = await fetch('http://localhost:3001/notes/123456', {
      method: 'DELETE'
    });
    
    const data = await response.json();
    console.log('✓ Delete note response:', data);
  } catch (error) {
    console.log('✗ Delete note endpoint error:', error);
  }
  
  // Stop the server
  await app.stop();
  
  console.log('\nTesting complete!');
}

testEndpoints();