# LLM Tutor Integration

This document describes the newly integrated LLM Tutor functionality that provides voice and text-based AI tutoring with knowledge base search capabilities.

## Features

### 1. Voice Input/Output
- **Speech-to-Text**: Convert voice input to text using OpenAI Whisper
- **Text-to-Speech**: Convert AI responses to speech using OpenAI TTS
- **Voice Selection**: Choose from multiple OpenAI voices (Alloy, Echo, Fable, Onyx, Nova, Shimmer)

### 2. Knowledge Base Management
- **Document Upload**: Support for PDF, TXT, and DOCX files
- **Vector Search**: Use Pinecone for semantic search across uploaded documents
- **Chunk Processing**: Automatically split documents into searchable chunks
- **Embedding Generation**: Create embeddings using OpenAI's text-embedding-3-small model

### 3. AI Chat System
- **Context-Aware Responses**: AI responses based on uploaded knowledge base content
- **Session Management**: Persistent chat sessions with message history
- **Knowledge Base Selection**: Choose which knowledge base to query
- **Strict Context Adherence**: AI only answers based on uploaded content

## File Structure

### Frontend Components
- `client/src/hooks/useVoice.tsx` - Voice input/output hook
- `client/src/pages/KnowledgeBaseManager.tsx` - Knowledge base management page
- `client/src/pages/TutorPage.tsx` - Main AI tutor interface
- `client/src/components/Sidebar.tsx` - Chat sidebar component

### Backend Routes
- `server/routes/chat.ts` - Chat session and message handling
- `server/routes/voice.ts` - Voice processing endpoints
- `server/routes/knowledgeBase.ts` - Knowledge base CRUD operations
- `server/routes/upload.ts` - File upload and processing
- `server/routes/import.ts` - Data import utilities

### Configuration
- `server/config/pinecone.ts` - Pinecone vector database setup
- `server/config/openai.ts` - OpenAI API configuration
- `server/utils/fileProcessor.ts` - Document processing utilities

## API Endpoints

### Chat Endpoints
- `POST /api/chat/session` - Create new chat session
- `POST /api/chat/message` - Send message and get AI response
- `GET /api/chat/session/:sessionId` - Get chat history
- `GET /api/chat/sessions` - List all chat sessions
- `DELETE /api/chat/session/:sessionId` - Delete chat session

### Voice Endpoints
- `POST /api/voice/stt` - Speech-to-text conversion
- `POST /api/voice/tts` - Text-to-speech conversion
- `GET /api/voice/voices` - Get available voices

### Knowledge Base Endpoints
- `GET /api/knowledge-base` - List all knowledge bases
- `POST /api/knowledge-base` - Create knowledge base
- `GET /api/knowledge-base/:id` - Get specific knowledge base
- `PUT /api/knowledge-base/:id` - Update knowledge base
- `DELETE /api/knowledge-base/:id` - Delete knowledge base

### Upload Endpoints
- `POST /api/upload` - Upload and process documents
- `GET /api/upload/status/:jobId` - Get upload status

## Environment Variables

Add these to your `.env` file:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (for knowledge base functionality)
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=aitutor-index

# Optional (for file uploads)
MAX_FILE_SIZE=10485760
UPLOAD_PATH=./uploads
```

## Usage

### 1. Access Knowledge Base Manager
Navigate to `/knowledge-base` to upload and manage documents.

### 2. Start AI Tutor Session
Navigate to `/ai-tutor` to begin a chat session with the AI tutor.

### 3. Upload Documents
- Click "Upload File" in the Knowledge Base Manager
- Select PDF, TXT, or DOCX files
- Choose to create a new knowledge base or add to existing one
- Documents are automatically processed and indexed

### 4. Chat with AI Tutor
- Select a knowledge base to query
- Type messages or use voice input
- AI will respond based on uploaded content only
- Voice responses are automatically played for voice inputs

## Technical Details

### Vector Search Process
1. User sends message
2. Generate embedding for user message using OpenAI
3. Search Pinecone for similar document chunks
4. Filter results by knowledge base and relevance score
5. Use relevant chunks as context for AI response
6. Generate response using OpenAI with strict context instructions

### Document Processing
1. Upload file to server
2. Extract text content (PDF/DOCX support coming soon)
3. Split into overlapping chunks (1000 chars with 200 char overlap)
4. Generate embeddings for each chunk
5. Store in Pinecone with metadata
6. Save document info in MongoDB

### Voice Processing
1. Record audio in browser using MediaRecorder API
2. Send audio to OpenAI Whisper for transcription
3. Process transcribed text through normal chat flow
4. Convert AI response to speech using OpenAI TTS
5. Play audio response in browser

## Dependencies Added

- `@pinecone-database/pinecone` - Vector database client
- `multer` - File upload handling
- `react-dropzone` - Drag-and-drop file upload
- `react-hot-toast` - Toast notifications
- `@types/multer` - TypeScript types for multer

## Notes

- PDF and DOCX processing currently shows placeholder messages. Install `pdf-parse` and `mammoth` packages for full support.
- Voice functionality requires HTTPS in production.
- Pinecone is optional but recommended for knowledge base functionality.
- All AI responses are strictly limited to uploaded content to prevent hallucination.
