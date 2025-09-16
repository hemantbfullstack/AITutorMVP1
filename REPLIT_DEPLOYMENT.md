# 🚀 Replit Deployment Guide for AI Math Tutor

## Prerequisites
- Replit account
- MongoDB Atlas account (or use Replit's database)
- OpenAI API key
- Pinecone API key (optional, for Knowledge Base features)

## Step-by-Step Deployment

### 1. **Create New Repl**
1. Go to [Replit](https://replit.com)
2. Click "Create Repl"
3. Choose "Import from GitHub" or "Blank Repl"
4. If importing from GitHub, paste your repository URL

### 2. **Set Up Environment Variables**
In Replit, go to the "Secrets" tab and add these environment variables:

```
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aitutor
OPENAI_API_KEY=your_openai_api_key_here
OPENAI_MODEL=gpt-4o-mini
JWT_SECRET=your_secure_jwt_secret_here
NODE_ENV=production
```

**Optional (for Knowledge Base features):**
```
PINECONE_API_KEY=your_pinecone_api_key_here
PINECONE_ENVIRONMENT=your_pinecone_environment_here
PINECONE_INDEX_NAME=aitutor-knowledge
```

### 3. **Install Dependencies**
Run in Replit console:
```bash
npm install
```

### 4. **Build the Application**
```bash
npm run build
```

### 5. **Start the Application**
```bash
npm start
```

### 6. **Configure Database**
- **Option A**: Use MongoDB Atlas (Recommended)
  - Create a free cluster at [MongoDB Atlas](https://cloud.mongodb.com)
  - Get connection string and add to `MONGODB_URI`
  
- **Option B**: Use Replit's Database
  - Go to Replit's Database tab
  - Create a new database
  - Use the provided connection string

### 7. **Test Your Deployment**
1. Click the "Run" button in Replit
2. Your app should be available at `https://your-repl-name.username.repl.co`
3. Test the IB Math Tutor functionality
4. Test Knowledge Base features (if configured)

## Troubleshooting

### Common Issues:

1. **CORS Errors**
   - Make sure your Replit domain is in the CORS origins
   - Check that environment variables are set correctly

2. **Database Connection Issues**
   - Verify MongoDB URI is correct
   - Check if IP whitelist includes Replit's IPs
   - For MongoDB Atlas, add `0.0.0.0/0` to IP whitelist

3. **Build Errors**
   - Make sure all dependencies are installed
   - Check TypeScript compilation errors
   - Verify file paths are correct

4. **OpenAI API Issues**
   - Verify API key is correct
   - Check API quota and billing
   - Ensure model name is valid

### Performance Optimization:

1. **Enable Replit Boost** (if available)
2. **Use Production Build**: Always use `npm run build` before `npm start`
3. **Monitor Resource Usage**: Check Replit's resource monitor
4. **Optimize Images**: Compress images in the uploads folder

## Features Available in Replit:

✅ **IB Math Tutor**: Full functionality with streaming responses
✅ **Knowledge Base**: Document upload and search (with Pinecone)
✅ **Math Tools**: Calculator, graphing, Wolfram integration
✅ **Voice Features**: Text-to-speech with OpenAI TTS
✅ **Paper Generation**: IB-style exam paper creation
✅ **User Authentication**: JWT-based auth system

## Security Notes:

- Never commit `.env` files to version control
- Use strong JWT secrets
- Regularly rotate API keys
- Monitor usage and costs
- Set up proper CORS origins

## Support:

If you encounter issues:
1. Check Replit's console logs
2. Verify all environment variables
3. Test API endpoints individually
4. Check database connectivity
5. Review the troubleshooting section above

Happy coding! 🎉
