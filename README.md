# Private Notes App with LangChain and Parakeet Integration

This project demonstrates a private notes application for MentraOS that leverages both LangChain for intelligent note processing and Parakeet for local audio processing.

## Features

- Local audio processing using Parakeet
- LangChain integration for note enhancement and organization
- Private note storage using MentraOS SimpleStorage
- Dashboard UI with MentraOS LayoutManager
- Voice feedback using MentraOS AudioManager
- User-specific note isolation

## Implementation Overview

The app implements:
1. `PrivateNotesApp` class extending MentraOS AppServer pattern
2. `ParakeetProcessor` for local audio chunk processing
3. `LangChainAgent` for note enhancement and search capabilities
4. Session management with user isolation
5. Voice command processing for note creation

## How to Run

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the app:
   ```bash
   npm start
   ```

## Key Components

- Audio processing with Parakeet using `onAudioChunk` events
- Note storage with `simpleStorage` per user session
- Dashboard display via `layouts.showTextWall()`
- Voice feedback with `audio.speak()`

This demonstrates how to create a secure, private notes application that processes audio locally while enhancing note content with AI capabilities through LangChain.