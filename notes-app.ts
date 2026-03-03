// Private Notes App with LangChain and Parakeet Integration
// This file demonstrates how such an app would be structured in MentraOS using the SDK

import { AppServer, AppSession, AudioChunk } from '@mentra/sdk';
import * as express from 'express';
import { Logger } from './logger.js';
import OpenAI from 'openai';
import { appendFile } from 'node:fs/promises';

// Mock LangChain integration for note processing
export class LangChainAgent {
  private llamaServerUrl = process.env.LLAMA_SERVER_URL || 'http://127.0.0.1:8080/v1';
  private model = process.env.LANGCHAIN_MODEL || 'Qwen3-Coder-30B-A3B-Instruct-1M-Q6_K.gguf';

  async processNote(noteText: string): Promise<string> {
    try {
      Logger.info('Llama.cpp', `🚀 Sending note to local server at ${this.llamaServerUrl}`);
      Logger.info('Llama.cpp', `🧠 Model: ${this.model}`);
      Logger.info('Llama.cpp', `📝 Original Note: "${noteText}"`);
      
      const startTime = Date.now();
      const response = await fetch(`${this.llamaServerUrl}/chat/completions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            { 
              role: "system", 
              content: "You are an AI assistant that enhances and formats notes. Keep the meaning intact but make it professional and clear. Do not add any conversational filler, return ONLY the enhanced note." 
            },
            { 
              role: "user", 
              content: noteText 
            }
          ],
          temperature: parseFloat(process.env.LANGCHAIN_TEMPERATURE || '0.7')
        })
      });

      if (!response.ok) {
        throw new Error(`llama-server responded with status ${response.status}`);
      }

      const data = await response.json();
      const enhancedText = data.choices[0].message.content.trim();
      const endTime = Date.now();
      
      Logger.info('Llama.cpp', `✅ Successfully received response in ${endTime - startTime}ms`);
      Logger.info('Llama.cpp', `✨ Enhanced Note: "${enhancedText}"`);
      
      return enhancedText;
    } catch (error) {
      Logger.error('Llama.cpp', "❌ Failed to connect to llama-server:", error);
      // Fallback to basic prefix if server is down
      return `AI-enhanced (fallback): ${noteText}`;
    }
  }
  
  async searchNotes(notes: any[], query: string): Promise<any[]> {
    // Basic keyword search for now
    // A full LangChain implementation would use embeddings/vector search here
    Logger.debug('LangChainAgent', `Searching notes for query: "${query}"`);
    return notes.filter(note => note.text.toLowerCase().includes(query.toLowerCase()));
  }
}

// Helper to create a valid WAV file from raw PCM data (16kHz, 16-bit, mono)
function createWavFile(pcmData: ArrayBuffer): ArrayBuffer {
  const wavHeader = new ArrayBuffer(44);
  const view = new DataView(wavHeader);
  
  const sampleRate = 16000;
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataLength = pcmData.byteLength;

  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataLength, true); // file length - 8
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666D7420, false); // "fmt "
  view.setUint32(16, 16, true); // format chunk length
  view.setUint16(20, 1, true); // sample format (PCM)
  view.setUint16(22, numChannels, true); // channel count
  view.setUint32(24, sampleRate, true); // sample rate
  view.setUint32(28, byteRate, true); // byte rate
  view.setUint16(32, blockAlign, true); // block align
  view.setUint16(34, bitsPerSample, true); // bits per sample
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataLength, true); // data chunk length

  // Combine header and PCM data
  const wavFile = new Uint8Array(44 + dataLength);
  wavFile.set(new Uint8Array(wavHeader), 0);
  wavFile.set(new Uint8Array(pcmData), 44);
  
  return wavFile.buffer;
}

// Mock Parakeet integration replaced with real Whisper.cpp local API
export class ParakeetProcessor {
  private whisperUrl = process.env.WHISPER_SERVER_URL || 'http://127.0.0.1:8080/v1';
  private model = process.env.WHISPER_MODEL || 'whisper-1';
  private openai = new OpenAI({
    apiKey: 'dummy', // Not needed for local server
    baseURL: this.whisperUrl,
  });

  async processAudioChunk(audioBuffer: ArrayBufferLike): Promise<string> {
    try {
      Logger.info('Whisper.cpp', `[Audio Pipeline] 🎤 Received ${audioBuffer.byteLength} bytes for processing`);
      Logger.info('Whisper.cpp', `[Audio Pipeline] 🧠 Model: ${this.model}`);
      const startTime = Date.now();
      
      // Send the request manually using fetch and FormData to avoid 415 errors
      // with strict multipart/form-data parsing on local whisper servers
      const formData = new FormData();
      const wavBuffer = createWavFile(audioBuffer as ArrayBuffer);
      const blob = new Blob([wavBuffer], { type: 'audio/wav' });
      formData.append('file', blob, 'audio.wav');
      formData.append('model', this.model);
      formData.append('language', 'en');

      Logger.info('Whisper.cpp', `[Audio Pipeline] 🚀 Invoking Whisper API at ${this.whisperUrl}/audio/transcriptions with ${blob.size} byte file`);
      
      const response = await fetch(`${this.whisperUrl}/audio/transcriptions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer dummy` // Dummy key for local server
        },
        body: formData
      });

      if (!response.ok) {
        throw new Error(`Whisper server responded with status ${response.status}: ${await response.text()}`);
      }

      const transcription = await response.json();

      const endTime = Date.now();
      const text = transcription.text.trim();
      
      Logger.info('Whisper.cpp', `[Audio Pipeline] ✅ Successfully transcribed in ${endTime - startTime}ms`);
      Logger.info('Whisper.cpp', `[Audio Pipeline] 📥 Raw Result: "${text}"`);
      
      return text;
    } catch (error) {
      Logger.error('Whisper.cpp', "[Audio Pipeline] ❌ Failed to connect to local whisper server:", error);
      // Fallback for testing when server is down
      return "";
    }
  }
}

// Main app implementation extending MentraOS AppServer
export class NotesApp extends AppServer {
  private langchainAgent = new LangChainAgent();
  private parakeet = new ParakeetProcessor();
  private userNotes = new Map<string, any[]>();
  
  constructor(config: { packageName: string; apiKey: string; port: number }) {
    super(config);
    this.setupEndpoints();
  }
  
  private setupEndpoints() {
    const app = this.getExpressApp();
    app.use(express.json());

    // Request logging middleware
    app.use((req, res, next) => {
      const startTime = Date.now();
      res.on('finish', () => {
        const duration = Date.now() - startTime;
        Logger.info('Express', `${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
      });
      next();
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.status(200).json({ 
        message: 'Private Notes App is running',
        endpoints: ['GET /notes', 'GET /notes/search/:query', 'POST /notes', 'DELETE /notes/:id', 'GET /webview']
      });
    });

    // Webview endpoint for companion app integration
    app.get('/webview', (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const notes = this.userNotes.get(userId) || [];
      
      Logger.info('WebView', `Rendering notes for user ${userId} (${notes.length} notes)`);

      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Private Notes Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
            h1 { color: #000; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            .note { border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); background: #fff; }
            .timestamp { color: #888; font-size: 0.85em; margin-bottom: 8px; }
            .no-notes { color: #666; font-style: italic; background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; }
            .user-info { font-size: 0.9em; background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 20px; color: #0d47a1; }
          </style>
        </head>
        <body>
          <h1>Private Notes</h1>
          ${req.authUserId ? `<div class="user-info">Logged in as: ${req.authUserId}</div>` : ''}
          <p>Total notes: ${notes.length}</p>
          <div id="notes">
            ${notes.length === 0 ? '<p class="no-notes">No notes yet. Use your smart glasses to take a note!</p>' : 
              notes.map(n => `
              <div class="note">
                <div class="timestamp">${new Date(n.timestamp).toLocaleString()}</div>
                <div>${n.text}</div>
              </div>`).join('')}
          </div>
        </body>
        </html>
      `;
      res.status(200).send(html);
    });

    // Return all notes for the authenticated user
    app.get('/notes', (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const notes = this.userNotes.get(userId) || [];
      res.status(200).json({ notes });
    });

    // Search for notes
    app.get('/notes/search/:query', async (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const notes = this.userNotes.get(userId) || [];
      const query = req.params.query;
      const results = await this.langchainAgent.searchNotes(notes, query);
      res.status(200).json({ notes: results, query });
    });

    // Create a new note manually
    app.post('/notes', async (req: any, res) => {
      try {
        const userId = req.authUserId || 'guest';
        const noteText = req.body.text || '';
        if (!noteText) {
          Logger.warn('NotesApp', 'Note creation failed: Note text is required');
          return res.status(400).json({ error: 'Note text is required' });
        }
        
        // Process through LangChain for note enhancement
        const processedNote = await this.langchainAgent.processNote(noteText);
        
        // Add note to storage
        const newNote = {
          text: processedNote,
          timestamp: Date.now(),
          id: Date.now().toString()
        };
        
        const notes = this.userNotes.get(userId) || [];
        notes.push(newNote);
        this.userNotes.set(userId, notes);
        
        // Save to Markdown file
        await this.saveNoteToFile(userId, processedNote);

        // If there's an active session, persist to cloud storage
        if (req.appSession) {
          await req.appSession.simpleStorage.set('notes', JSON.stringify(notes));
        }
        
        Logger.info('NotesApp', `Note created for ${userId} with ID: ${newNote.id}`);
        res.status(201).json({ 
          message: 'Note created successfully',
          note: newNote
        });
      } catch (error) {
        Logger.error('NotesApp', 'Note creation error:', error);
        res.status(400).json({ 
          error: 'Invalid note data',
          message: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    });

    // Delete a note
    app.delete('/notes/:id', async (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const noteId = req.params.id;
      
      let notes = this.userNotes.get(userId) || [];
      const initialLength = notes.length;
      notes = notes.filter(note => note.id !== noteId);
      
      if (notes.length === initialLength) {
        Logger.warn('NotesApp', `Failed to delete note. ID not found: ${noteId}`);
        return res.status(404).json({ error: 'Note not found' });
      }
      
      this.userNotes.set(userId, notes);
      
      // If there's an active session, persist to cloud storage
      if (req.appSession) {
        await req.appSession.simpleStorage.set('notes', JSON.stringify(notes));
      }
      
      Logger.info('NotesApp', `Note deleted for ${userId} with ID: ${noteId}`);
      res.status(200).json({ 
        message: 'Note deleted successfully',
        id: noteId
      });
    });
  }
  
  // Override session start method for custom functionality
  protected async onSession(session: AppSession, sessionId: string, userId: string) {
    Logger.info('AppSession', `Session started for user: ${userId} (Session ID: ${sessionId})`);
    
    // Load saved notes from storage
    const notesJson = await session.simpleStorage.get('notes');
    const notes = notesJson ? JSON.parse(notesJson) : [];
    this.userNotes.set(userId, notes);
    
    // Show initial note count on dashboard
    session.dashboard.content.writeToMain(`Private Notes\n${notes.length} saved`);
    session.layouts.showTextWall(`You have ${notes.length} private notes`);
    
    let isSpeaking = false;
    let audioBufferQueue: ArrayBufferLike[] = [];

    // Track Voice Activity Detection (VAD) from MentraOS
    session.events.onVoiceActivity(async (vad) => {
      const speaking = vad.status === true || vad.status === 'true';
      
      if (speaking && !isSpeaking) {
        Logger.info('AppSession', '[VAD] 🎤 Voice detected, starting buffer...');
        isSpeaking = true;
        audioBufferQueue = []; // Clear previous buffer
      } else if (!speaking && isSpeaking) {
        Logger.info('AppSession', `[VAD] 🔇 Silence detected, processing ${audioBufferQueue.length} chunks...`);
        isSpeaking = false;
        
        if (audioBufferQueue.length > 0) {
          // Concatenate all chunks into one large buffer
          const totalLength = audioBufferQueue.reduce((acc, curr) => acc + curr.byteLength, 0);
          const combinedBuffer = new Uint8Array(totalLength);
          let offset = 0;
          for (const chunk of audioBufferQueue) {
            combinedBuffer.set(new Uint8Array(chunk), offset);
            offset += chunk.byteLength;
          }
          
          try {
            const transcription = await this.parakeet.processAudioChunk(combinedBuffer.buffer);
            await this.handleTranscription(session, transcription);
          } catch (error) {
            Logger.error('AppSession', '[Audio Pipeline] ❌ Error processing combined audio', error);
          }
          
          audioBufferQueue = []; // Reset after processing
        }
      }
    });

    // Subscribe to audio chunks for local Parakeet processing (mocked)
    session.events.onAudioChunk(async (audioChunk: AudioChunk) => {
      if (isSpeaking) {
        audioBufferQueue.push(audioChunk.arrayBuffer);
      }
    });
    
    // Listen for transcription events as fallback (mocked)
    session.events.onTranscription(async (data: any) => {
      Logger.info('AppSession', `[Audio Pipeline] 📝 Received Fallback Transcription (isFinal: ${data.isFinal}): "${data.text}"`);
      if (data.isFinal) {
        await this.handleTranscription(session, data.text);
      }
    });
  }

  private async saveNoteToFile(userId: string, noteText: string) {
    const fileName = `notes_${userId}.md`;
    const timestamp = new Date().toLocaleString();
    const content = `## 📝 Note - [${timestamp}]\n${noteText}\n\n---\n\n`;
    try {
      await appendFile(fileName, content);
      Logger.info('FileSystem', `Note appended to ${fileName}`);
    } catch (error) {
      Logger.error('FileSystem', `Failed to append note to ${fileName}`, error);
    }
  }

  private async handleTranscription(session: AppSession, text: string) {
    const lowerText = text.toLowerCase();
    const userId = session.userId;

    // Handle "clear notes" command
    if (lowerText.startsWith('clear notes')) {
      Logger.info('AppSession', `[Audio Pipeline] 🧹 Clearing notes for ${userId}`);
      this.userNotes.set(userId, []);
      await session.simpleStorage.set('notes', '[]');
      
      // Update UI
      session.dashboard.content.writeToMain(`Private Notes\n0 saved`);
      session.layouts.showTextWall('All cloud notes have been cleared!');
      await session.audio.speak('Notes cleared from cloud');
      return;
    }

    if (!text || (!lowerText.startsWith('note:') && !lowerText.startsWith('note '))) {
      if (text) Logger.warn('AppSession', `[Audio Pipeline] 🛑 Dropped transcription (missing "note" prefix): "${text}"`);
      return;
    }

    Logger.info('AppSession', `[Audio Pipeline] ✅ Accepted transcription (has "note" prefix): "${text}"`);
    const noteText = text.replace(/^[Nn]ote[: ]*/, '').trim();
    const processedNote = await this.langchainAgent.processNote(noteText);
    
    const newNote = {
      text: processedNote,
      timestamp: Date.now(),
      id: Date.now().toString()
    };
    
    const notes = this.userNotes.get(userId) || [];
    notes.push(newNote);
    this.userNotes.set(userId, notes);
    
    await session.simpleStorage.set('notes', JSON.stringify(notes));
    
    // Save to Markdown file
    await this.saveNoteToFile(userId, processedNote);
    
    Logger.info('AppSession', `New note saved for ${userId}: ${newNote.id}`);
    
    // Update dashboard with the latest note
    session.dashboard.content.writeToMain(`Latest Note:\n${processedNote.substring(0, 20)}...`);
    session.layouts.showTextWall('Note saved successfully!');
    await session.audio.speak('Note saved successfully');
  }

  // Override stop handler
  protected async onStop(sessionId: string, userId: string, reason: string) {
    Logger.info('AppSession', `Session stopped for user ${userId} (Session ID: ${sessionId}), reason: ${reason}`);
  }
}

// Create and start the app
if (import.meta.main) {
  const app = new NotesApp({
    packageName: process.env.PACKAGE_NAME || 'com.mentra.notesapp',
    apiKey: process.env.MENTRAOS_API_KEY || 'mock-api-key',
    port: parseInt(process.env.PORT || '3002', 10)
  });

  // Start the app
  app.start();

  Logger.info('System', "Private Notes App Implementation Complete");
  Logger.info('System', "This app demonstrates:");
  Logger.info('System', "1. Local audio processing using Parakeet");
  Logger.info('System', "2. LangChain integration for note enhancement");
  Logger.info('System', "3. Private storage using MentraOS SimpleStorage");
  Logger.info('System', "4. Dashboard UI with MentraOS LayoutManager");
  Logger.info('System', "5. Voice feedback using MentraOS AudioManager");
  Logger.info('System', "6. MentraOS SDK integration using Express for endpoints");
}

export const PrivateNotesApp = NotesApp;
