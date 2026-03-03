# MentraOS Combined Notes & Home Assistant App

This is a private notes application for MentraOS that demonstrates integration with LangChain and Parakeet for local audio processing and AI note enhancement, plus Home Assistant voice control functionality and Speaches AI TTS with Kokoro JS.

## Features

1. **Private Notes Management**
   - Voice note taking through MentraOS smart glasses
   - AI-enhanced note processing with LangChain
   - Local audio transcription with Parakeet/Whisper
   - Cloud storage persistence via MentraOS SimpleStorage
   - Markdown file export for notes

2. **Home Assistant Voice Control**
   - Voice commands to control Home Assistant devices
   - Wake word detection (default: "home")
   - Conversation API integration with Home Assistant
   - Web UI for changing wake word settings
   - Command logging for Home Assistant interactions

3. **Text-to-Speech with Speaches AI and Kokoro JS**
   - OpenAI-compatible TTS API integration with Kokoro JS model
   - Speech generation using Speaches AI service
   - Fallback to system TTS if Speaches AI is unavailable

## Setup

### Prerequisites
- [Bun](https://bun.sh)
- A MentraOS developer account at [console.mentra.glass](https://console.mentra.glass)
- A Home Assistant instance with a Long-Lived Access Token (for HA control)
- Local LLM servers (llama.cpp and whisper.cpp) for AI processing
- Speaches AI TTS server running (optional, for full functionality)

### Environment Configuration

Create a `.env` file in the project root:

```env
PORT=3002
PACKAGE_NAME=com.mentra.combinedapp
MENTRAOS_API_KEY=your_mentraos_api_key
HA_BASE_URL=https://your-home-assistant-instance.example.com  # or http://homeassistant.local:8123
HA_TOKEN=your_long_lived_access_token
WAKE_WORD=home  # optional, default is "home"
LLAMA_SERVER_URL=http://127.0.0.1:8080/v1
LANGCHAIN_MODEL=Qwen3-Coder-30B-A3B-Instruct-1M-Q6_K.gguf
LANGCHAIN_TEMPERATURE=0.7
WHISPER_SERVER_URL=http://127.0.0.1:8080/v1
WHISPER_MODEL=whisper-1
SPEACHES_BASE_URL=http://localhost:8000/v1
SPEECH_MODEL_ID=speaches-ai/Kokoro-82M-v1.0-ONNX
VOICE_ID=af_heart
```

To get a Home Assistant long-lived token: **Settings → Profile → Security → Long-Lived Access Tokens**.

### Running

```bash
bun install
bun run src/combined-app.ts
```

Register the app at [console.mentra.glass](https://console.mentra.glass) with:
- **Package name:** matching `PACKAGE_NAME` in your `.env`
- **Webhook URL:** your publicly accessible server (e.g. `wss://yourapp.yourdomain.com`)

## Usage

### For Notes Functionality:
- Say "note: [your note content]" to create a new note
- Say "clear notes" to remove all cloud notes

### For Home Assistant Functionality:
- Say your wake word (default: "home") followed by any Home Assistant command:
  - "Home, turn on the kitchen lights"
  - "Home set the thermostat to 70"
  - "Home, lock the front door"

### For TTS Functionality:
- The app uses Speaches AI with Kokoro JS for text-to-speech conversion
- If Speaches AI is not available, it falls back to system TTS

## Ports

| Port | Purpose |
|------|---------|
| 3002 | MentraOS WebSocket (app server) |
| 3001 | Express web UI / phone webview (for HA settings) |

## Stack

- [MentraOS SDK](https://docs.mentraglass.com/)
- [LangChain](https://www.langchain.com/)
- [Parakeet](https://github.com/parakeet-ai/parakeet)
- [Speaches AI](https://speaches.ai)
- [Kokoro JS](https://huggingface.co/hexgrad/Kokoro-82M)
- [Bun](https://bun.sh)
- Express