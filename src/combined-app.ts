// Private Notes App with LangChain and Parakeet Integration
// Combined with Home Assistant Voice Control functionality

import { AppServer, AppSession, AudioChunk } from '@mentra/sdk';
import * as express from 'express';
import { Logger } from './logger.ts';
import OpenAI from 'openai';
import { appendFile, writeFile, unlink, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import type { Request, Response }from 'express';

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

// Speaches.ai TTS Integration
export class SpeachesTTS {
  private speachesBaseUrl = process.env.SPEACHES_BASE_URL || 'http://localhost:8000/v1';
  private model = process.env.SPEECH_MODEL_ID || 'speaches-ai/Kokoro-82M-v1.0-ONNX';
  private voice = process.env.VOICE_ID || 'af_heart';
  private openai = new OpenAI({
    apiKey: 'dummy',
    baseURL: this.speachesBaseUrl,
  });
  private audioStorageDir = process.env.AUDIO_STORAGE_DIR || './audio-storage';
  private audioBaseUrl = process.env.AUDIO_BASE_URL || `http://localhost:${process.env.PORT || '3002'}`;
  private currentResponseId: string | null = null;
  private audioUrlMap = new Map<string, string>();

  getCurrentResponseId(): string | null {
    return this.currentResponseId;
  }

  getAudioUrl(responseId: string): string | null {
    return this.audioUrlMap.get(responseId) || null;
  }

  private async ensureAudioDir(): Promise<void> {
    const { mkdir } = await import('node:fs/promises');
    const { existsSync } = await import('node:fs');
    if (!existsSync(this.audioStorageDir)) {
      await mkdir(this.audioStorageDir, { recursive: true });
      Logger.info('SpeachesTTS', `Created audio storage directory: ${this.audioStorageDir}`);
    }
  }

  async speakText(session: AppSession, text: string): Promise<string> {
    const responseId = `tts-${Date.now()}`;
    this.currentResponseId = responseId;
    
    try {
      Logger.info('SpeachesTTS', `[${responseId}] Generating speech for text: "${text.substring(0, 50)}..."`);
      
      const response = await this.openai.audio.speech.create({
        model: this.model,
        voice: this.voice,
        input: text,
        response_format: 'mp3',
      });
      
      if (!response.ok) {
        throw new Error(`Speaches API error ${response.status}`);
      }
      
      const audioBuffer = await response.arrayBuffer();
      const fileSize = audioBuffer.byteLength;
      Logger.info('SpeachesTTS', `[${responseId}] Audio generated successfully with ${fileSize} bytes`);
      
      if (fileSize > 5 * 1024 * 1024) {
        Logger.warn('SpeachesTTS', `[${responseId}] Audio file is large (${(fileSize / 1024 / 1024).toFixed(2)}MB), may timeout`);
      }
      
      await this.ensureAudioDir();
      const filePath = `${this.audioStorageDir}/${responseId}.mp3`;
      await writeFile(filePath, Buffer.from(audioBuffer));
      Logger.info('SpeachesTTS', `[${responseId}] Saved audio to ${filePath}`);
      
      const audioUrl = `${this.audioBaseUrl}/audio/${responseId}.mp3`;
      this.audioUrlMap.set(responseId, audioUrl);
      Logger.info('SpeachesTTS', `[${responseId}] Audio URL: ${audioUrl}`);
      
      if (session.audio && typeof session.audio.playAudio === 'function') {
        try {
          Logger.info('SpeachesTTS', `[${responseId}] Playing audio on glasses...`);
          const result = await session.audio.playAudio({
            audioUrl: audioUrl,
            stopOtherAudio: true
          });
          
          if (result.success) {
            Logger.info('SpeachesTTS', `[${responseId}] Audio successfully played on glasses`);
          } else {
            Logger.error('SpeachesTTS', `[${responseId}] Playback failed: ${result.error}`);
            await this.fallbackToNativeTTS(session, text);
          }
        } catch (error) {
          Logger.error('SpeachesTTS', `[${responseId}] Error playing audio:`, error);
          await this.fallbackToNativeTTS(session, text);
        }
      } else {
        Logger.warn('SpeachesTTS', `[${responseId}] No audio capabilities available in session`);
      }
      
      return responseId;
    } catch (error) {
      Logger.error('SpeachesTTS', `[${responseId}] Failed to generate speech:`, error);
      throw error;
    }
  }

  private async fallbackToNativeTTS(session: AppSession, text: string): Promise<void> {
    try {
      Logger.info('SpeachesTTS', 'Falling back to native MentraOS TTS');
      if (session.audio && typeof session.audio.speak === 'function') {
        await session.audio.speak(text);
        Logger.info('SpeachesTTS', 'Native TTS fallback successful');
      } else {
        Logger.warn('SpeachesTTS', 'Native TTS not available');
      }
    } catch (error) {
      Logger.error('SpeachesTTS', 'Native TTS fallback failed:', error);
    }
  }
}

// ── Home Assistant API Integration ────────────────────────────────────────────

interface CommandLog {
  timestamp: Date;
  command: string;
  response: string | null;
  error: string | null;
}

interface JournalLog {
  timestamp: Date;
  entry: string;
}

class HomeAssistantAPI {
  private haBaseUrl = process.env.HA_BASE_URL || 'http://localhost:8123';
  private haToken = process.env.HA_TOKEN || '';
  private log: CommandLog[] = [];

  async sendToAssist(text: string): Promise<string> {
    const res = await fetch(`${this.haBaseUrl}/api/conversation/process`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${this.haToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ text, language: 'en' }),
    });

    if (!res.ok) {
      throw new Error(`HA API error ${res.status}: ${await res.text()}`);
    }

    const data = await res.json() as {
      response?: { speech?: { plain?: { speech?: string } } };
    };
    return data.response?.speech?.plain?.speech ?? 'Done.';
  }

  getLog(): CommandLog[] {
    return this.log;
  }

  addLogEntry(entry: CommandLog): void {
    this.log.push(entry);
  }
}

class JournalManager {
  private logs: Map<string, JournalLog[]> = new Map();
  
  addLogEntry(userId: string, entry: JournalLog): void {
    const userLogs = this.logs.get(userId) || [];
    userLogs.push(entry);
    this.logs.set(userId, userLogs);
  }
  
  getUserLogs(userId: string): JournalLog[] {
    return this.logs.get(userId) || [];
  }
  
  clearUserLogs(userId: string): void {
    this.logs.set(userId, []);
  }
}

// ── Settings Management ────────────────────────────────────────────────────────

interface Settings {
  wakeWord: string;
}

function loadSettings(): Settings {
  try {
    return { wakeWord: process.env.WAKE_WORD || 'home' };
  } catch {
    return { wakeWord: process.env.WAKE_WORD || 'home' };
  }
}

function saveSettings(s: Settings): void {
  console.log(`[Settings] Saving wake word: ${s.wakeWord}`);
}

// ── Audio File Cleanup ──────────────────────────────────────────────────────────

async function cleanupOldAudioFiles(): Promise<void> {
  const { readdir, stat, unlink } = await import('node:fs/promises');
  const { existsSync } = await import('node:fs');
  
  const audioDir = process.env.AUDIO_STORAGE_DIR || './audio-storage';
  const maxAge = parseInt(process.env.AUDIO_TTL || '300', 10) * 1000; // Default 5 minutes
  
  if (!existsSync(audioDir)) {
    return;
  }
  
  try {
    const files = await readdir(audioDir);
    const now = Date.now();
    
    for (const file of files) {
      if (file.endsWith('.mp3')) {
        const filePath = `${audioDir}/${file}`;
        const stats = await stat(filePath);
        
        if (now - stats.mtimeMs > maxAge) {
          await unlink(filePath);
          Logger.info('AudioCleanup', `Deleted old audio file: ${file}`);
        }
      }
    }
  } catch (error) {
    Logger.error('AudioCleanup', 'Error cleaning up audio files:', error);
  }
}

// Start cleanup timer
setInterval(cleanupOldAudioFiles, 60000); // Run every minute

// ── Wake Word Regex ────────────────────────────────────────────────────────────

function buildWakeRegex(word: string): RegExp {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`^(?:hey\\s+)?${escaped}[,.]?\\s+(.+)`, 'i');
}

// Main app implementation extending MentraOS AppServer
export class CombinedApp extends AppServer {
  private langchainAgent = new LangChainAgent();
  private parakeet = new ParakeetProcessor();
  private userNotes = new Map<string, any[]>();
  private userJournals = new Map<string, any[]>();
  private haApi = new HomeAssistantAPI();
  private journalManager = new JournalManager();
  private speachesTTS = new SpeachesTTS();
  private journalRecordingSessions = new Map<string, { isRecording: boolean; buffer: ArrayBufferLike[] }>();
  
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

    // Serve audio files
    const audioStorageDir = process.env.AUDIO_STORAGE_DIR || './audio-storage';
    app.get('/audio/:id.mp3', async (req, res) => {
      const fileId = req.params.id;
      const filePath = `${audioStorageDir}/${fileId}.mp3`;
      
      if (!existsSync(filePath)) {
        Logger.warn('AudioServer', `Audio file not found: ${filePath}`);
        return res.status(404).json({ error: 'Audio file not found' });
      }
      
      try {
        const audioData = await readFile(filePath);
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Disposition', `inline; filename="${fileId}.mp3"`);
        res.setHeader('Cache-Control', 'public, max-age=300');
        res.send(audioData);
        Logger.info('AudioServer', `Served audio file: ${fileId}`);
      } catch (error) {
        Logger.error('AudioServer', `Error serving audio file ${fileId}:`, error);
        res.status(500).json({ error: 'Error serving audio file' });
      }
    });

    // Root endpoint
    app.get('/', (req, res) => {
      res.status(200).json({ 
        message: 'MentraOS Combined Notes & Home Assistant App is running',
        endpoints: ['GET /notes', 'GET /notes/search/:query', 'POST /notes', 'DELETE /notes/:id', 'GET /webview', 'GET /webview/api/log', 'GET /webview/api/settings', 'POST /webview/api/settings']
      });
    });

    // Webview endpoint for companion app integration
    app.get('/webview', (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const notes = this.userNotes.get(userId) || [];
      
      Logger.info('WebView', `Rendering notes for user ${userId} (${notes.length} notes)`);
      
      // Combined webview - both notes and HA control UI
      const html = `
        <!DOCTYPE html>
        <html>
        <head>
          <title>Private Notes & Home Assistant Dashboard</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; padding: 20px; max-width: 800px; margin: 0 auto; color: #333; }
            h1 { color: #000; border-bottom: 2px solid #eee; padding-bottom: 10px; }
            h2 { color: #18a0fb; margin-top: 30px; }
            .note { border: 1px solid #e0e0e0; padding: 15px; margin-bottom: 15px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.05); background: #fff; }
            .timestamp { color: #888; font-size: 0.85em; margin-bottom: 8px; }
            .no-notes { color: #666; font-style: italic; background: #f9f9f9; padding: 20px; border-radius: 8px; text-align: center; }
            .user-info { font-size: 0.9em; background: #e3f2fd; padding: 10px; border-radius: 5px; margin-bottom: 20px; color: #0d47a1; }
            .settings { background: #1a2030; border-radius: 8px; padding: 12px 14px; margin-bottom: 20px; }
            .settings label { font-size: 12px; color: #888; display: block; margin-bottom: 6px; }
            .settings-row { display: flex; gap: 8px; }
            .settings input { flex: 1; background: #0f1117; border: 1px solid #333; border-radius: 6px; padding: 8px 10px; color: #eee; font-size: 14px; }
            .settings input:focus { outline: none; border-color: #18a0fb; }
            .settings button { background: #18a0fb; border: none; border-radius: 6px; padding: 8px 16px; color: #fff; font-size: 14px; cursor: pointer; }
            .settings button:active { opacity: 0.8; }
            .saved { color: #4c4; font-size: 12px; margin-top: 6px; display: none; }
            .hint { font-size: 12px; color: #555; margin-top: 6px; }
            .entry { margin-bottom: 14px; background: #1a1a2e; border-radius: 8px; padding: 12px; border-left: 3px solid #18a0fb; }
            .entry.error { border-left-color: #f55; }
            .command { font-size: 15px; font-weight: 600; }
            .response { color: #aad4ff; font-size: 13px; margin-top: 6px; }
            .err { color: #f88; font-size: 13px; margin-top: 6px; }
            .time { color: #444; font-size: 11px; margin-top: 6px; }
            .empty { color: #444; text-align: center; padding: 40px; }
          </style>
        </head>
        <body>
          <h1>Private Notes & Home Assistant</h1>
          ${req.authUserId ? `<div class="user-info">Logged in as: ${req.authUserId}</div>` : ''}
          
          <h2>Private Notes</h2>
          <p>Total notes: ${notes.length}</p>
          <div id="notes">
            ${notes.length === 0 ? '<p class="no-notes">No notes yet. Use your smart glasses to take a note!</p>' : 
              notes.map(n => `
              <div class="note">
                <div class="timestamp">${new Date(n.timestamp).toLocaleString()}</div>
                <div>${n.text}</div>
              </div>`).join('')}
          </div>
          
          <h2>Home Assistant Control</h2>
          <div class="settings">
            <label>WAKE WORD</label>
            <div class="settings-row">
              <input id="wakeInput" type="text" placeholder="home" />
              <button onclick="saveWakeWord()">Save</button>
            </div>
            <div class="saved" id="saved">Saved!</div>
            <div class="hint" id="hint"></div>
          </div>

          <div id="ha-log"><p class="empty">Waiting for HA commands...</p></div>
          
          <h2>Journal Entries</h2>
          <div id="journal-log"><p class="empty">No journal entries yet...</p></div>

          <script>
            async function loadSettings() {
              const s = await fetch('/webview/api/settings').then(r => r.json());
              document.getElementById('wakeInput').value = s.wakeWord;
              document.getElementById('hint').textContent = 'Say "' + s.wakeWord + ' turn on the lights"';
              refreshHA();
            }

            async function saveWakeWord() {
              const word = document.getElementById('wakeInput').value.trim();
              if (!word) return;
              await fetch('/webview/api/settings', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ wakeWord: word }),
              });
              document.getElementById('hint').textContent = 'Say "' + word + ' turn on the lights"';
              const saved = document.getElementById('saved');
              saved.style.display = 'block';
              setTimeout(() => saved.style.display = 'none', 2000);
            }

            async function refreshHA() {
              try {
                const entries = await fetch('/webview/api/log').then(r => r.json());
                const el = document.getElementById('ha-log');
                if (!entries.length) { el.innerHTML = '<p class="empty">Waiting for HA commands...</p>'; return; }
                el.innerHTML = [...entries].reverse().map(e => \`
                  <div class="entry \${e.error ? 'error' : ''}">
                    <div class="command">\${e.command}</div>
                    \${e.response ? \`<div class="response">\${e.response}</div>\` : ''}
                    \${e.error ? \`<div class="err">Error: \${e.error}</div>\` : ''}
                    <div class="time">\${new Date(e.timestamp).toLocaleTimeString()}</div>
                  </div>
                \`).join('');
              } catch(e) {}
            }

            async function refreshJournal() {
              try {
                const entries = await fetch('/webview/api/journal-log').then(r => r.json());
                const el = document.getElementById('journal-log');
                if (!entries.length) { el.innerHTML = '<p class="empty">No journal entries yet...</p>'; return; }
                el.innerHTML = [...entries].reverse().map(e => \`
                  <div class="entry">
                    <div class="command">\${e.entry}</div>
                    <div class="time">\${new Date(e.timestamp).toLocaleTimeString()}</div>
                  </div>
                \`).join('');
              } catch(e) {}
            }

            loadSettings();
            setInterval(refreshHA, 2000);
            setInterval(refreshJournal, 2000);
          </script>
        </body>
        </html>
      `;
      res.status(200).send(html);
    });

    // API endpoints for Home Assistant logs
    app.get('/webview/api/log', (_req: Request, res: Response) => {
      res.json(this.haApi.getLog() ?? []);
    });

    // API endpoints for Journal logs
    app.get('/webview/api/journal-log', (_req: Request, res: Response) => {
      res.json(Array.from(this.journalManager.getUserLogs('guest') || []));
    });

    // API endpoints for Home Assistant settings
    app.get('/webview/api/settings', (_req: Request, res: Response) => {
      const settings = loadSettings();
      res.json(settings);
    });

    app.post('/webview/api/settings', (req: Request, res: Response) => {
      const { wakeWord } = req.body as { wakeWord?: string };
      if (!wakeWord || typeof wakeWord !== 'string' || !wakeWord.trim()) {
        res.status(400).json({ error: 'wakeWord is required' });
        return;
      }
      const settings = { wakeWord: wakeWord.trim().toLowerCase() };
      saveSettings(settings);
      console.log(`[HA] Wake word changed to "${settings.wakeWord}"`);
      res.json({ wakeWord: settings.wakeWord });
    });

    // Return all notes for the authenticated user
    app.get('/notes', (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const notes = this.userNotes.get(userId) || [];
      res.status(200).json({ notes });
    });

    // Return all journals for the authenticated user
    app.get('/journals', (req: any, res) => {
      const userId = req.authUserId || 'guest';
      const journals = this.userJournals.get(userId) || [];
      res.status(200).json({ journals });
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

    // Create a new journal entry
    app.post('/journals', async (req: any, res) => {
      try {
        const userId = req.authUserId || 'guest';
        const journalText = req.body.text || '';
        if (!journalText) {
          Logger.warn('JournalsApp', 'Journal entry creation failed: Journal text is required');
          return res.status(400).json({ error: 'Journal entry text is required' });
        }
        
        // Process through LangChain for journal enhancement
        const processedJournal = await this.langchainAgent.processNote(journalText);
        
        // Add journal entry to storage
        const newJournal = {
          text: processedJournal,
          timestamp: Date.now(),
          id: Date.now().toString()
        };
        
        const journals = this.userJournals.get(userId) || [];
        journals.push(newJournal);
        this.userJournals.set(userId, journals);
        
        // Save to Markdown file
        await this.saveJournalToFile(userId, processedJournal);

        // If there's an active session, persist to cloud storage
        if (req.appSession) {
          await req.appSession.simpleStorage.set('journals', JSON.stringify(journals));
        }
        
        // Add to journal log
        this.journalManager.addLogEntry(userId, {
          timestamp: new Date(),
          entry: processedJournal
        });
        
        Logger.info('JournalsApp', `Journal entry created for ${userId} with ID: ${newJournal.id}`);
        res.status(201).json({ 
          message: 'Journal entry created successfully',
          journal: newJournal
        });
      } catch (error) {
        Logger.error('JournalsApp', 'Journal entry creation error:', error);
        res.status(400).json({ 
          error: 'Invalid journal entry data',
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
  
  // Override session start method for combined functionality
  protected async onSession(session: AppSession, sessionId: string, userId: string) {
    Logger.info('AppSession', `Session started for user: ${userId} (Session ID: ${sessionId})`);
    
    // Load saved notes from storage
    const notesJson = await session.simpleStorage.get('notes');
    const notes = notesJson ? JSON.parse(notesJson) : [];
    this.userNotes.set(userId, notes);
    
    // Load saved journals from storage
    const journalsJson = await session.simpleStorage.get('journals');
    const journals = journalsJson ? JSON.parse(journalsJson) : [];
    this.userJournals.set(userId, journals);
    
    // Show initial note count on dashboard
    session.dashboard.content.writeToMain(`Private Notes\n${notes.length} saved`);
    session.layouts.showTextWall(`You have ${notes.length} private notes`);
    
    let isSpeaking = false;
    let audioBufferQueue: ArrayBufferLike[] = [];

    // Process journal recording - transcribe via whisper.cpp, enhance via llama-cpp
    const processJournalRecording = async (sessionId: string, session: AppSession) => {
      const journalState = this.journalRecordingSessions.get(sessionId);
      
      if (!journalState || journalState.buffer.length === 0) {
        Logger.warn('AppSession', '[Journal Recording] ⚠️ No audio data to process');
        session.layouts.showTextWall('No audio recorded');
        return;
      }
      
      // Concatenate all chunks
      const totalLength = journalState.buffer.reduce((acc, curr) => acc + curr.byteLength, 0);
      const combinedBuffer = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of journalState.buffer) {
        combinedBuffer.set(new Uint8Array(chunk), offset);
        offset += chunk.byteLength;
      }
      
      try {
        Logger.info('AppSession', '[Journal Recording] 🔊 Sending to whisper.cpp for transcription...');
        const transcription = await this.parakeet.processAudioChunk(combinedBuffer.buffer);
        
        if (!transcription || transcription.trim().length === 0) {
          Logger.warn('AppSession', '[Journal Recording] ⚠️ Empty transcription');
          session.layouts.showTextWall('No speech detected');
          this.journalRecordingSessions.delete(sessionId);
          return;
        }
        
        Logger.info('AppSession', `[Journal Recording] ✅ Transcription: "${transcription}"`);
        
        // Process through llama-cpp for enhancement
        const enhancedJournal = await this.langchainAgent.processNote(transcription);
        
        // Save journal entry
        const userId = session.userId;
        const newJournal = {
          text: enhancedJournal,
          timestamp: Date.now(),
          id: Date.now().toString()
        };
        
        const journals = this.userJournals.get(userId) || [];
        journals.push(newJournal);
        this.userJournals.set(userId, journals);
        
        await session.simpleStorage.set('journals', JSON.stringify(journals));
        await this.saveJournalToFile(userId, enhancedJournal);
        
        // Add to journal log
        this.journalManager.addLogEntry(userId, {
          timestamp: new Date(),
          entry: enhancedJournal
        });
        
        Logger.info('AppSession', `[Journal Recording] 💾 Journal saved: ${newJournal.id}`);
        
        // Update UI
        session.layouts.showTextWall('Journal entry saved successfully!');
        const responseId = await this.speachesTTS.speakText(session, 'Journal entry saved successfully');
        Logger.info('AppSession', `[Response ID] ${responseId} - Journal saved`);
        
      } catch (error) {
        Logger.error('AppSession', '[Journal Recording] ❌ Error processing audio', error);
        session.layouts.showTextWall('Error saving journal');
        const responseId = await this.speachesTTS.speakText(session, 'Error saving journal');
      }
      
      // Reset journal recording state
      this.journalRecordingSessions.delete(sessionId);
    };

    // Track Voice Activity Detection (VAD) from MentraOS
    session.events.onVoiceActivity(async (vad) => {
      const speaking = vad.status === true || vad.status === 'true';
      
      // Handle journal recording mode
      const journalState = this.journalRecordingSessions.get(sessionId);
      if (journalState && journalState.isRecording) {
        // Keep accumulating audio while in journal mode
        return;
      }
      
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
            await this.handleTranscription(session, transcription, sessionId);
          } catch (error) {
            Logger.error('AppSession', '[Audio Pipeline] ❌ Error processing combined audio', error);
          }
          
          audioBufferQueue = []; // Reset after processing
        }
      }
    });

    // Subscribe to audio chunks for local Parakeet processing (mocked)
    session.events.onAudioChunk(async (audioChunk: AudioChunk) => {
      // Accumulate chunks during journal recording mode
      const journalState = this.journalRecordingSessions.get(sessionId);
      if (journalState && journalState.isRecording) {
        journalState.buffer.push(audioChunk.arrayBuffer);
        return;
      }
      
      // Normal recording mode
      if (isSpeaking) {
        audioBufferQueue.push(audioChunk.arrayBuffer);
      }
    });
    
    // Listen for transcription events as fallback (mocked)
    session.events.onTranscription(async (data: any) => {
      Logger.info('AppSession', `[Audio Pipeline] 📝 Received Fallback Transcription (isFinal: ${data.isFinal}): "${data.text}"`);
      if (data.isFinal) {
        await this.handleTranscription(session, data.text, sessionId);
      }
    });
  }

  // Override stop handler
  protected async onStop(sessionId: string, userId: string, reason: string) {
    Logger.info('AppSession', `Session stopped for user ${userId} (Session ID: ${sessionId}), reason: ${reason}`);
  }
  
  // Save note to a markdown file
  private async saveNoteToFile(userId: string, noteText: string): Promise<void> {
    const fileName = `notes-${userId}.md`;
    await appendFile(fileName, `# Note - ${new Date().toISOString()}\n\n${noteText}\n\n---\n\n`);
  }

  // Save journal to a markdown file
  private async saveJournalToFile(userId: string, journalText: string): Promise<void> {
    const fileName = `journal-${userId}.md`;
    await appendFile(fileName, `# Journal Entry - ${new Date().toISOString()}\n\n${journalText}\n\n---\n\n`);
  }

  private async processJournalRecording(sessionId: string, session: AppSession): Promise<void> {
    const journalState = this.journalRecordingSessions.get(sessionId);
    
    if (!journalState || journalState.buffer.length === 0) {
      Logger.warn('AppSession', '[Journal Recording] ⚠️ No audio data to process');
      session.layouts.showTextWall('No audio recorded');
      this.journalRecordingSessions.delete(sessionId);
      return;
    }
    
    // Concatenate all chunks
    const totalLength = journalState.buffer.reduce((acc, curr) => acc + curr.byteLength, 0);
    const combinedBuffer = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of journalState.buffer) {
      combinedBuffer.set(new Uint8Array(chunk), offset);
      offset += chunk.byteLength;
    }
    
    try {
      Logger.info('AppSession', '[Journal Recording] 🔊 Sending to whisper.cpp for transcription...');
      const transcription = await this.parakeet.processAudioChunk(combinedBuffer.buffer);
      
      if (!transcription || transcription.trim().length === 0) {
        Logger.warn('AppSession', '[Journal Recording] ⚠️ Empty transcription');
        session.layouts.showTextWall('No speech detected');
        this.journalRecordingSessions.delete(sessionId);
        return;
      }
      
      Logger.info('AppSession', `[Journal Recording] ✅ Transcription: "${transcription}"`);
      
      // Process through llama-cpp for enhancement
      const enhancedJournal = await this.langchainAgent.processNote(transcription);
      
      // Save journal entry
      const userId = session.userId;
      const newJournal = {
        text: enhancedJournal,
        timestamp: Date.now(),
        id: Date.now().toString()
      };
      
      const journals = this.userJournals.get(userId) || [];
      journals.push(newJournal);
      this.userJournals.set(userId, journals);
      
      await session.simpleStorage.set('journals', JSON.stringify(journals));
      await this.saveJournalToFile(userId, enhancedJournal);
      
      // Add to journal log
      this.journalManager.addLogEntry(userId, {
        timestamp: new Date(),
        entry: enhancedJournal
      });
      
      Logger.info('AppSession', `[Journal Recording] 💾 Journal saved: ${newJournal.id}`);
      
      // Update UI
      session.layouts.showTextWall('Journal entry saved successfully!');
      const responseId = await this.speachesTTS.speakText(session, 'Journal entry saved successfully');
      Logger.info('AppSession', `[Response ID] ${responseId} - Journal saved`);
      
    } catch (error) {
      Logger.error('AppSession', '[Journal Recording] ❌ Error processing audio', error);
      session.layouts.showTextWall('Error saving journal');
      await this.speachesTTS.speakText(session, 'Error saving journal');
    }
    
    // Reset journal recording state
    this.journalRecordingSessions.delete(sessionId);
  }

  private async handleTranscription(session: AppSession, text: string, sessionId: string) {
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
      const responseId = await this.speachesTTS.speakText(session, 'Notes cleared from cloud');
      Logger.info('AppSession', `[Response ID] ${responseId} - Notes cleared`);
      return;
    }

    // Handle "clear journals" command
    if (lowerText.startsWith('clear journals')) {
      Logger.info('AppSession', `[Audio Pipeline] 🧹 Clearing journals for ${userId}`);
      this.userJournals.set(userId, []);
      await session.simpleStorage.set('journals', '[]');
      
      // Update UI
      session.layouts.showTextWall('All cloud journals have been cleared!');
      const responseId = await this.speachesTTS.speakText(session, 'Journals cleared from cloud');
      Logger.info('AppSession', `[Response ID] ${responseId} - Journals cleared`);
      return;
    }

    // Handle "note:" command for notes
    if (lowerText.startsWith('note:') || lowerText.startsWith('note ')) {
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
      const responseId = await this.speachesTTS.speakText(session, 'Note saved successfully');
      Logger.info('AppSession', `[Response ID] ${responseId} - Note saved: ${newNote.id}`);
      return;
    }

    // Handle "journal start" command - begin recording mode
    if (lowerText === 'journal start') {
      Logger.info('AppSession', `[Audio Pipeline] 🎙️ Journal recording started - say your journal entry, then say "journal end"`);
      this.journalRecordingSessions.set(sessionId, { isRecording: true, buffer: [] });
      session.layouts.showTextWall('Recording journal... say "journal end" when done');
      const responseId = await this.speachesTTS.speakText(session, 'Journal recording started. Speak now, say journal end when done.');
      Logger.info('AppSession', `[Response ID] ${responseId} - Journal recording started`);
      return;
    }

    // Handle "journal end" command - stop recording and process
    if (lowerText === 'journal end') {
      const journalState = this.journalRecordingSessions.get(sessionId);
      if (!journalState || !journalState.isRecording) {
        Logger.warn('AppSession', `[Audio Pipeline] ⚠️ Journal end called but not in recording mode`);
        session.layouts.showTextWall('Not currently recording a journal');
        const responseId = await this.speachesTTS.speakText(session, 'Not currently recording a journal');
        return;
      }
      
      Logger.info('AppSession', `[Audio Pipeline] 🛑 Journal recording ended, processing ${journalState.buffer.length} chunks...`);
      session.layouts.showTextWall('Processing journal entry...');
      
      // Process the journal recording
      await this.processJournalRecording(sessionId, session);
      return;
    }

    // Handle Home Assistant commands
    if (lowerText.startsWith('home') || lowerText.startsWith('hey home')) {
      Logger.info('AppSession', `[HA] Processing voice command: "${text}"`);
      const command = text.replace(/^[Hh]ome[,. ]*/i, '').trim();
      try {
        const response = await this.haApi.sendToAssist(command);
        Logger.info('AppSession', `[HA] Response: "${response}"`);
        this.haApi.addLogEntry({
          timestamp: new Date(),
          command,
          response,
          error: null
        });
        session.layouts.showTextWall(`HA: ${response}`);
        const responseId = await this.speachesTTS.speakText(session, response);
        Logger.info('AppSession', `[Response ID] ${responseId} - HA command: ${command}`);
      } catch (error) {
        Logger.error('AppSession', `[HA] Command error:`, error);
        this.haApi.addLogEntry({
          timestamp: new Date(),
          command,
          response: null,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
        session.layouts.showTextWall(`HA: Error processing command`);
        const responseId = await this.speachesTTS.speakText(session, 'Error processing command');
        Logger.info('AppSession', `[Response ID] ${responseId} - HA error: ${command}`);
      }
      return;
    }

    if (text) {
      Logger.warn('AppSession', `[Audio Pipeline] 🛑 Dropped transcription (no valid prefix): "${text}"`);
    }
  }
}
