# Pinecone Setup Guide

## Why Pinecone is Needed

The LLM Tutor uses Pinecone for vector search to find relevant information from your uploaded documents. Without Pinecone, the AI can only provide general responses and cannot search through your knowledge base.

## Current Status

❌ **Pinecone is not configured** - This is why you're getting "Sorry, I don't have this information..." responses.

## Quick Setup

### Step 1: Get Pinecone API Key

1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Sign up for a free account
3. Create a new project
4. Go to API Keys section
5. Copy your API key

### Step 2: Create .env File

Create a `.env` file in your project root with:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Required for knowledge base search
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_INDEX_NAME=aitutor-index

# Optional
PORT=5000
```

### Step 3: Create Pinecone Index

1. In Pinecone Console, create a new index
2. Name: `aitutor-index`
3. Dimensions: `1536` (for OpenAI embeddings)
4. Metric: `cosine`

### Step 4: Restart Server

```bash
npm run dev:mongodb
```

## What Will Work After Setup

✅ **Vector Search**: AI will search through your uploaded documents
✅ **Context-Aware Responses**: AI responses based on your knowledge base
✅ **Semantic Search**: Find relevant information even with different wording
✅ **Knowledge Base Queries**: Ask questions about your uploaded content

## Current Workaround

Without Pinecone, the system still works but with limitations:
- Documents are saved to MongoDB
- AI provides general responses only
- No semantic search through uploaded content

## Troubleshooting

If you still get "Sorry, I don't have this information..." after setup:

1. Check server logs for Pinecone initialization messages
2. Verify API key is correct
3. Ensure index name matches exactly
4. Check if index has the right dimensions (1536)

## Free Tier Limits

Pinecone free tier includes:
- 1 project
- 1 index
- 100,000 vectors
- 1,000 queries per day

This should be sufficient for testing and small-scale usage.
