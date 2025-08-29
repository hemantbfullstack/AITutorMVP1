# Local Development Setup

## Environment Variables

For local development, you can either:

### Option 1: Create a .env file (recommended)
Create a `.env` file in the root directory with:

```bash
# OpenAI API Key for AI tutoring functionality (REQUIRED)
OPENAI_API_KEY=your_openai_api_key_here

# Port configuration
PORT=5000

# Optional: ElevenLabs API Key for text-to-speech
ELEVENLABS_API_KEY=your_elevenlabs_api_key_here
ELEVENLABS_VOICE_ID=21m00Tcm4TlvDq8ikWAM
ELEVENLABS_MODEL=eleven_multilingual_v2

# Optional: Database URL for local PostgreSQL database
# DATABASE_URL=postgresql://username:password@localhost:5432/database_name

# Optional: Wolfram Alpha API Key for advanced math queries  
# WOLFRAM_APP_ID=your_wolfram_app_id_here

# DO NOT ADD THESE FOR LOCAL DEVELOPMENT:
# REPLIT_DOMAINS (only for Replit environment)
# REPL_ID (only for Replit environment)
```

### Option 2: Set system environment variables
```bash
export OPENAI_API_KEY=your_openai_api_key_here
export PORT=5000
```

## Getting API Keys

1. **OpenAI API Key**: Visit [OpenAI Platform](https://platform.openai.com/api-keys) to generate your API key
2. **ElevenLabs API Key** (optional): Visit [ElevenLabs](https://elevenlabs.io) for text-to-speech
3. **Wolfram Alpha API** (optional): Visit [Wolfram Alpha API](https://developer.wolframalpha.com/) for advanced math

## Running Locally

1. Install dependencies: `npm install`
2. Set up environment variables (see above)
3. Start the development server:
   - **Windows**: `cross-env NODE_ENV=development tsx server/index.ts`
   - **Mac/Linux**: `npm run dev`
4. Open your browser to `http://localhost:5000`

### Windows Users
If you get the error `'NODE_ENV' is not recognized as an internal or external command`, use the cross-env command above or run:
```bash
npm install -g cross-env
cross-env NODE_ENV=development tsx server/index.ts
```

**Common Windows Issues Fixed:**
- ✅ `ENOTSUP: operation not supported on socket 0.0.0.0:5000` - Server now automatically uses `localhost` for local development
- ✅ `NODE_ENV not recognized` - Use `cross-env` command as shown above
- ✅ **Login issues** - Don't add `REPLIT_DOMAINS` to your .env file. The app automatically creates a local dev user for you.

## Notes

- In Replit environment, environment variables are automatically provided
- The `.env` file is excluded from Git to prevent accidental exposure of secrets
- The application will fall back to system environment variables if dotenv is not available