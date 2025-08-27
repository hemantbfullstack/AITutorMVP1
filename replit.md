# Overview

This is an AI-powered IB Mathematics tutoring platform built with React, Express, and PostgreSQL. The application provides personalized step-by-step tutoring for IB Math AA and AI (both HL and SL levels) with integrated math tools, voice output, and comprehensive chat functionality. Students can interact with an AI tutor that provides authentic IB-style teaching with proper mathematical notation, explanations, and worked examples.

# User Preferences

Preferred communication style: Simple, everyday language.

# Recent Changes

## Environment Variables Support (Latest)
- Added dotenv support for local development without creating .env files in repository
- Windows compatibility: Users need to use `cross-env NODE_ENV=development tsx server/index.ts` instead of `npm run dev`
- Fixed Windows ENOTSUP error by automatically binding to `localhost` for local development, `0.0.0.0` for Replit
- Created SETUP.md with detailed local development instructions
- Fixed Git push protection issues by removing API keys from commit history

# System Architecture

## Frontend Architecture
- **Framework**: React 18 with TypeScript and Vite for fast development and building
- **UI Components**: Shadcn/ui component library built on Radix UI primitives for accessible, customizable components
- **Styling**: Tailwind CSS with CSS variables for theming and responsive design
- **State Management**: TanStack Query (React Query) for server state management and caching
- **Routing**: Wouter for lightweight client-side routing
- **Math Rendering**: KaTeX for LaTeX mathematical notation rendering
- **Plotting**: Plotly.js for interactive graph visualization
- **Mathematical Computing**: Math.js for calculator functionality

## Backend Architecture
- **Framework**: Express.js with TypeScript for type-safe server development
- **Database ORM**: Drizzle ORM for type-safe database operations with PostgreSQL
- **Authentication**: Replit Auth integration with OpenID Connect for secure user authentication
- **Session Management**: Express sessions with PostgreSQL storage using connect-pg-simple
- **API Design**: RESTful endpoints with proper error handling and validation
- **Real-time Communication**: Server-Sent Events (SSE) for streaming AI responses

## Data Storage Solutions
- **Primary Database**: PostgreSQL with Neon serverless hosting
- **Schema Management**: Drizzle migrations for version-controlled database changes
- **Session Storage**: PostgreSQL-backed session store for scalable session management
- **Data Models**: 
  - Users table for authentication and profile data
  - Tutor sessions for conversation tracking
  - Messages table for chat history with role-based content (user/assistant/system)

## Authentication and Authorization
- **Provider**: Replit Auth using OpenID Connect protocol
- **Session Security**: HTTP-only secure cookies with proper expiration
- **Route Protection**: Authentication middleware on all protected API endpoints
- **Rate Limiting**: Express rate limiting for API protection against abuse
- **CORS**: Configured for secure cross-origin requests

## AI Integration Architecture
- **AI Provider**: OpenAI GPT models for conversational tutoring
- **Streaming**: Real-time response streaming for better user experience
- **Context Management**: Conversation memory with last 10 messages for context
- **Prompt Engineering**: Specialized system prompts for IB Mathematics teaching style
- **Response Processing**: LaTeX math notation support in AI responses

## Math Tools Integration
- **Calculator**: Server-side math.js evaluation with expression validation
- **Graphing**: Plotly.js visualization with function plotting and interactive controls
- **Wolfram Alpha**: Optional integration for advanced mathematical queries
- **Tool Security**: Input sanitization and rate limiting for all math tools

## Voice Output System
- **TTS Provider**: ElevenLabs for natural voice synthesis
- **Audio Delivery**: Binary audio streaming with proper content-type headers
- **Fallback**: Graceful degradation when TTS services are unavailable
- **User Controls**: Volume control, auto-play preferences, and voice selection

# External Dependencies

## Core Infrastructure
- **Database**: Neon PostgreSQL serverless database for scalable data storage
- **Authentication**: Replit Auth service for secure user authentication
- **Hosting**: Replit platform for development and deployment

## AI and ML Services
- **OpenAI API**: GPT models for conversational AI tutoring capabilities
- **ElevenLabs API**: Text-to-speech for natural voice output (optional)
- **Wolfram Alpha API**: Advanced mathematical computation and visualization (optional)

## Frontend Libraries
- **React Ecosystem**: React 18, React DOM, TypeScript support
- **UI Framework**: Radix UI primitives with Shadcn/ui components
- **Styling**: Tailwind CSS with PostCSS processing
- **State Management**: TanStack Query for server state
- **Mathematical Tools**: KaTeX for LaTeX rendering, Plotly.js for graphs, Math.js for calculations
- **Utilities**: Wouter for routing, date-fns for date handling, clsx for conditional styling

## Backend Libraries
- **Express Framework**: Express.js with TypeScript support
- **Database**: Drizzle ORM with PostgreSQL driver (@neondatabase/serverless)
- **Authentication**: Passport.js with OpenID Connect strategy
- **Session Management**: Express session with PostgreSQL store
- **Security**: Rate limiting, input validation with Zod schemas
- **Development**: tsx for TypeScript execution, ESBuild for production builds

## Development Tools
- **Build System**: Vite for fast development and optimized production builds
- **Code Quality**: TypeScript for type safety, ESLint configuration
- **Database Management**: Drizzle Kit for migrations and schema management
- **Environment**: Node.js with ES modules support