import { AppServer, AppSession } from '@mentra/sdk';
import * as express from 'express';
import { Logger } from './src/logger.js';

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
    Logger.debug('LangChainAgent', `Searching notes for query: "${query}"`);
    return notes.filter(note => note.text.toLowerCase().includes(query.toLowerCase()));
  }
}

// Main app implementation extending MentraOS AppServer
export class NotesAppMentraOnly extends AppServer {
  protected async onSession(session: AppSession, sessionId: string, userId: string): Promise<void> {
    session.logger.info('Session started', { sessionId, userId });
    //Load saved notes from storage
    const notesJson = await session.simpleStorage.get('notes');
    this.notes = notesJson ? JSON.parse(notesJson) : [];

    // Show initial note count on dashboard
    session.dashboard.content.writeToMain(`Private Notes\n${this.notes.length} saved`);
    session.layouts.showTextWall(`You have ${this.notes.length} private notes. Say "note" to dictate.`);

    // Listen for transcription events directly from MentraOS (bypassing local whisper)

    session.events.onTranscription((data) => {
      if (data.isFinal) {
        session.logger.info('User said: ' + data.text);
        Logger.info('AppSession', `[Transcription] 📝 Received MentraOS Transcription: "${data.text}"`);

        // Match if the sentence starts with "note" (case insensitive)
        const isNoteCommand = data.text.toLowerCase().startsWith('note');

        if (isNoteCommand) {
          Logger.info('AppSession', `[Transcription] ✅ Accepted note command: "${data.text}"`);

          // Strip the "note" prefix
          const noteText = data.text.replace(/^[Nn]ote[: ]*/, '').trim();

          if (!noteText) {
            session.audio.speak('Note was empty.');
            return;
          }

          // Give immediate audio feedback so the user knows it's working
          session.audio.speak('Processing note...');

          // Enhance with Llama
          const processedNote = this.langchainAgent.processNote(noteText);

          const newNote = {
            text: processedNote,
            timestamp: Date.now(),
                                   id: Date.now().toString()
          };
          this.notes.push(newNote);

          // Persist
          session.simpleStorage.set('notes', JSON.stringify(this.notes));
          Logger.info('AppSession', `New note saved via MentraOS transcription: ${newNote.id}`);

          // Update dashboard with the latest note
          session.dashboard.content.writeToMain(`Latest Note:\n${processedNote.substring(0, 20)}...`);
          session.layouts.showTextWall('Note saved successfully!');

          // Give voice confirmation using built in MentraOS speak
          Logger.info('AppSession', `[Audio Pipeline] 🔊 TTS Speaking: "Note saved successfully"`);
          session.audio.speak('Note saved successfully');

        } else {
          Logger.warn('AppSession', `[Transcription] 🛑 Dropped transcription (missing "note" prefix): "${data.text}"`);
        }
      }
    });
  }

  private langchainAgent = new LangChainAgent();
  private notes: any[] = [];
  
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
        message: 'Private Notes App (MentraOS Version) is running',
        endpoints: ['GET /notes', 'GET /notes/search/:query', 'POST /notes', 'DELETE /notes/:id', 'GET /webview']
      });
    });

    // Webview endpoint for companion app integration
    app.get('/webview', (req: any, res) => {
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
          \${req.authUserId ? \`<div class="user-info">Logged in as: \${req.authUserId}</div>\` : ''}
          <p>Total notes: \${this.notes.length}</p>
          <div id="notes">
            \${this.notes.length === 0 ? '<p class="no-notes">No notes yet. Use your smart glasses to take a note!</p>' : 
              this.notes.map(n => \`
              <div class="note">
                <div class="timestamp">\${new Date(n.timestamp).toLocaleString()}</div>
                <div>\${n.text}</div>
              </div>\`).join('')}
          </div>
        </body>
        </html>
      `;
      res.status(200).send(html);
    });

    // Return all notes
    app.get('/notes', (req, res) => {
      res.status(200).json({ notes: this.notes });
    });

    // Search for notes
    app.get('/notes/search/:query', async (req, res) => {
      const query = req.params.query;
      const results = await this.langchainAgent.searchNotes(this.notes, query);
      res.status(200).json({ notes: results, query });
    });

    // Create a new note
    app.post('/notes', async (req, res) => {
      try {
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
        
        this.notes.push(newNote);
        
        Logger.info('NotesApp', `Note created with ID: ${newNote.id} | Content Preview: ${processedNote.substring(0, 30)}...`);
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
    app.delete('/notes/:id', (req, res) => {
      const noteId = req.params.id;
      
      const initialLength = this.notes.length;
      this.notes = this.notes.filter(note => note.id !== noteId);
      
      if (this.notes.length === initialLength) {
        Logger.warn('NotesApp', `Failed to delete note. ID not found: ${noteId}`);
        return res.status(404).json({ error: 'Note not found' });
      }
      
      Logger.info('NotesApp', `Note deleted with ID: ${noteId}`);
      res.status(200).json({ 
        message: 'Note deleted successfully',
        id: noteId
      });
    });
  }
  // Override stop handler
  protected async onStop(sessionId: string, userId: string, reason: string) {
    Logger.info('AppSession', `Session stopped for user ${userId} (Session ID: ${sessionId}), reason: ${reason}`);
  }
}

// Create and start the app
if (import.meta.main) {
  const app = new NotesAppMentraOnly({
    packageName: process.env.PACKAGE_NAME || 'com.mentra.notesapp',
    apiKey: process.env.MENTRAOS_API_KEY || 'mock-api-key',
    port: parseInt(process.env.PORT || '3002', 10)
  });

  // Start the app
  app.start();

  Logger.info('System', "Private Notes App (MentraOS Version) Implementation Complete");
  Logger.info('System', "This app demonstrates:");
  Logger.info('System', "1. MentraOS built-in Speech-to-Text (Transcription)");
  Logger.info('System', "2. LangChain integration for note enhancement via Llama");
  Logger.info('System', "3. MentraOS built-in Text-to-Speech (Speak)");
  Logger.info('System', "4. Private storage using MentraOS SimpleStorage");
  Logger.info('System', "5. Dashboard UI with MentraOS LayoutManager");
  Logger.info('System', "6. MentraOS SDK integration using Express for endpoints");
}
