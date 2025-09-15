# Pinecone 404 Error Troubleshooting

## Error: `PineconeNotFoundError: A call to https://controller.aped-4627-b74a.ppinecone.io/actions/whoami returned HTTP status 404`

This error indicates that Pinecone cannot find your project or the API key is invalid.

## Common Causes & Solutions

### 1. **Wrong API Key**
- **Problem**: API key is incorrect or expired
- **Solution**: 
  - Go to [Pinecone Console](https://app.pinecone.io/)
  - Navigate to API Keys section
  - Generate a new API key
  - Update your `.env` file

### 2. **Index Doesn't Exist**
- **Problem**: The index name doesn't exist in your Pinecone project
- **Solution**:
  - Go to Pinecone Console
  - Check if index `aitutor-index` exists
  - If not, create it with:
    - Name: `aitutor-index`
    - Dimensions: `1536`
    - Metric: `cosine`

### 3. **Wrong Project/Region**
- **Problem**: API key belongs to different project
- **Solution**:
  - Verify you're using the correct project
  - Check the region matches your index

### 4. **Old Pinecone API Format**
- **Problem**: Using old v0 API format
- **Solution**: Remove `PINECONE_ENVIRONMENT` from `.env` file

## Step-by-Step Fix

### Step 1: Check Your .env File
Make sure your `.env` file has:
```bash
PINECONE_API_KEY=your_actual_api_key_here
PINECONE_INDEX_NAME=aitutor-index
# Remove PINECONE_ENVIRONMENT if present
```

### Step 2: Verify in Pinecone Console
1. Go to [Pinecone Console](https://app.pinecone.io/)
2. Check your project
3. Verify index `aitutor-index` exists
4. Check index dimensions are 1536

### Step 3: Test Connection
Restart your server and check the logs for:
```
🔧 Initializing Pinecone...
📋 API Key: abc12345...
📋 Index Name: aitutor-index
🔍 Testing Pinecone connection...
📊 Index stats: {...}
✅ Pinecone initialized successfully
```

### Step 4: Create Index if Missing
If index doesn't exist:
1. Go to Pinecone Console
2. Click "Create Index"
3. Name: `aitutor-index`
4. Dimensions: `1536`
5. Metric: `cosine`
6. Click Create

## Quick Test

After fixing, upload a new file and check if:
1. Server logs show "✅ Vectors stored in Pinecone successfully"
2. Chat responses are based on uploaded content
3. No more 404 errors

## Still Having Issues?

1. **Check API Key Format**: Should be like `abc12345-6789-...`
2. **Verify Project**: Make sure you're in the right Pinecone project
3. **Check Index Status**: Index should be "Ready" not "Creating"
4. **Try New API Key**: Generate a fresh API key

## Alternative: Use Mock Mode

If you can't get Pinecone working, the system will work in mock mode:
- Files upload to MongoDB
- AI gives general responses
- No vector search (but basic functionality works)
