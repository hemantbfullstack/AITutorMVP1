# Overview

This is an AI-powered tutoring platform specifically designed for IB Mathematics (Analysis & Approaches and Applications & Interpretation) at both Higher Level and Standard Level. The application provides interactive tutoring through voice and text, knowledge base management with document upload capabilities, and comprehensive math tools including calculators, graphing, and Wolfram Alpha integration. Students can engage with an AI tutor that understands IB curriculum requirements and provides step-by-step explanations in authentic IB style.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript using Vite for build tooling
- **UI Components**: Radix UI primitives with shadcn/ui component library and Tailwind CSS for styling
- **State Management**: TanStack React Query for server state management and caching
- **Routing**: Custom router implementation with protected routes
- **Math Rendering**: KaTeX for LaTeX mathematics display
- **Voice Capabilities**: Built-in speech recognition and synthesis using Web APIs
- **Graphing**: Plotly.js for interactive mathematical function visualization
- **Mathematical Computations**: Math.js for expression evaluation and calculations

## Backend Architecture
- **Runtime**: Node.js with Express.js framework using TypeScript
- **Database**: MongoDB with Mongoose ODM for document storage
- **Authentication**: JWT-based authentication with role-based access control (admin, teacher, student)
- **Session Management**: Custom session handling with MongoDB storage
- **Rate Limiting**: Express rate limiting for API protection
- **File Processing**: Multer for file uploads with support for PDF, TXT, and DOCX formats
- **Document Processing**: Custom utilities for extracting and chunking text content from uploaded documents

## Data Storage Solutions
- **Primary Database**: MongoDB for user data, sessions, messages, knowledge bases, and generated papers
- **Vector Database**: Pinecone for semantic search across uploaded documents using embeddings
- **File Storage**: Local filesystem storage for uploaded documents with configurable paths
- **Session Storage**: MongoDB-based session persistence

## Authentication and Authorization
- **JWT Tokens**: 7-day expiration tokens containing user metadata
- **Role-Based Access**: Three-tier system (admin, teacher, student) with appropriate middleware
- **Plan-Based Limitations**: Freemium model with usage tracking and plan enforcement
- **Rate Limiting**: API endpoint protection with configurable limits per user role

## External Service Integrations
- **OpenAI API**: 
  - GPT-4o-mini for conversational AI tutoring
  - Whisper for speech-to-text transcription
  - Text-to-speech for voice responses
  - text-embedding-3-small for document vectorization
- **Pinecone**: Vector database for semantic search across knowledge base documents
- **Wolfram Alpha**: Mathematical computation and plotting through Simple API
- **Stripe**: Payment processing for premium plan subscriptions (optional)
- **ElevenLabs**: Alternative text-to-speech service (optional)

## Key Design Patterns
- **Microservice-like Architecture**: Modular route organization with dedicated controllers
- **Repository Pattern**: Database models with controller abstraction
- **Middleware Chain**: Authentication, rate limiting, and error handling middleware
- **Event-Driven UI**: Custom event bus for inter-component communication
- **Streaming Responses**: Server-sent events for real-time AI response delivery
- **Graceful Degradation**: Fallback mechanisms when external services are unavailable

# External Dependencies

## Required Services
- **OpenAI API**: Essential for AI tutoring functionality, voice processing, and embeddings (OPENAI_API_KEY)
- **MongoDB**: Primary database storage (MONGODB_URI)

## Optional Services
- **Pinecone**: Vector search for knowledge base functionality (PINECONE_API_KEY, PINECONE_INDEX_NAME, PINECONE_HOST)
- **Wolfram Alpha**: Advanced mathematical computations and plotting (WOLFRAM_APP_ID)
- **ElevenLabs**: Premium text-to-speech service (ELEVENLABS_API_KEY, ELEVENLABS_VOICE_ID)
- **Stripe**: Payment processing for subscriptions (STRIPE_SECRET_KEY)

## Development Dependencies
- **Vite**: Frontend build tool with hot module replacement
- **TypeScript**: Type safety across frontend and backend
- **ESBuild**: Backend bundling for production builds
- **Nodemon**: Development server with auto-restart
- **CORS**: Cross-origin resource sharing configuration

## Runtime Configuration
- **Environment Variables**: Centralized configuration through .env files
- **Port Configuration**: Configurable server port (default 5000)
- **File Upload Limits**: Configurable maximum file sizes and allowed types
- **Usage Limits**: Plan-based rate limiting and feature restrictions