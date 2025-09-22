# Database Seeding Guide

This guide explains how to seed your database with data from Pinecone and sample users.

## Overview

The seeding system can:
- Create sample users for testing
- Fetch knowledge base criteria from Pinecone and populate the local database
- Restore your knowledge base when the local database is deleted

## Available Commands

### 1. Full Database Seeding
```bash
npm run seed
```
This will:
- Clear all existing data (users and knowledge base criteria)
- Create sample users (admin, teacher, student, demo)
- Fetch all knowledge base criteria from Pinecone
- Populate the database with the criteria

### 2. Criteria-Only Seeding
```bash
npm run seed:criteria
```
This will:
- Clear only existing knowledge base criteria
- Fetch all knowledge base criteria from Pinecone
- Populate the database with the criteria
- **Preserve existing users**

## When to Use Each Command

### Use `npm run seed` when:
- Setting up a fresh database
- You want to reset everything
- You're testing the application from scratch

### Use `npm run seed:criteria` when:
- You deleted your local database but want to restore knowledge base
- You want to refresh knowledge base data from Pinecone
- You want to keep existing users but restore criteria

## Prerequisites

Make sure you have the following environment variables set:
```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=your_index_name
PINECONE_HOST=your_pinecone_host
MONGODB_URI=your_mongodb_connection_string
```

## How It Works

### Pinecone Integration
The seeding process:
1. Connects to your Pinecone index
2. Queries all vectors to find unique knowledge base criteria
3. Groups vectors by `criteriaId` to avoid duplicates
4. Extracts metadata (name, educational board, subject, level)
5. Counts total chunks and tokens for each criteria
6. Creates corresponding records in MongoDB

### Sample Users Created
- **Admin**: admin@aitutor.com / admin123
- **Teacher**: teacher@aitutor.com / teacher123  
- **Student**: student@aitutor.com / student123
- **Demo**: demo@aitutor.com / demo123

## Troubleshooting

### No criteria found in Pinecone
- Check your Pinecone API credentials
- Verify the index name and host
- Ensure you have uploaded documents to Pinecone

### Connection errors
- Verify MongoDB connection string
- Check if MongoDB is running
- Ensure network connectivity

### Duplicate criteria
The system automatically deduplicates based on `criteriaId` from Pinecone metadata.

## Example Output

```
🌱 Starting criteria seeding from Pinecone...
✅ Connected to MongoDB
🧹 Clearing existing knowledge base criteria...
✅ Existing criteria cleared
🌲 Fetching knowledge base criteria from Pinecone...
🔍 Found 1250 vectors in Pinecone
📚 Found 3 unique knowledge base criteria
💾 Creating knowledge base criteria in database...
✅ Created 3 knowledge base criteria
  1. Maths- AA SL and HL (IB Mathematics Analysis and Approaches)
     - Files: 2, Chunks: 450, Tokens: 125000
  2. Physics HL (IB Physics Higher Level)
     - Files: 1, Chunks: 200, Tokens: 50000
  3. Chemistry SL (IB Chemistry Standard Level)
     - Files: 1, Chunks: 150, Tokens: 35000
🎉 Criteria seeding completed successfully!
```
