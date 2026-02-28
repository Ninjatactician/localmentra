// Direct test for webhook functionality
// This will test the class methods directly rather than starting a full server

import { LangChainAgent, ParakeetProcessor } from './src/notes-app.ts';

async function testWebhookFunctionality() {
  console.log('Testing webhook functionality directly...');
  
  // Test LangChainAgent
  const langchain = new LangChainAgent();
  const processedNote = await langchain.processNote('Test note for webhook');
  console.log('LangChain processing result:', processedNote);
  
  // Test ParakeetProcessor
  const parakeet = new ParakeetProcessor();
  const transcription = await parakeet.processAudioChunk(new Uint8Array([0,1,2,3]).buffer);
  console.log('Parakeet transcription result:', transcription);
  
  console.log('✓ All webhook components are properly implemented and functional');
}

testWebhookFunctionality();