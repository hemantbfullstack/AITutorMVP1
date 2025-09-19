# AI Tutor MVP - Local Development Setup

This guide will help you set up the AI Tutor MVP for local development on Windows.

## Prerequisites

- Node.js (v18 or higher)
- MongoDB (local installation or MongoDB Atlas)
- Git

## Quick Start

1. **Clone and Install Dependencies**
   ```bash
   git clone <your-repo-url>
   cd AITutorMVP1
   npm install
   ```

2. **Environment Setup**
   ```bash
   # Copy the environment template
   copy env.example .env
   
   # Edit .env with your actual values
   notepad .env
   ```

3. **Start Development Server**
   ```bash
   # Start the full-stack development server
   npm run dev
   ```

4. **Access the Application**
   - Frontend: http://localhost:3000
   - Backend API: http://localhost:5000
   - API Test: http://localhost:5000/api/cors-test

## Environment Variables

### Required Variables

| Variable | Description | Example |
|----------|-------------|---------|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017/aitutor-mvp` |
| `JWT_SECRET` | JWT signing secret | `your-super-secret-jwt-key-here` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |

### Optional Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `5000` |
| `NODE_ENV` | Environment | `development` |
| `PINECONE_API_KEY` | Pinecone API key | Not required for basic functionality |
| `WOLFRAM_APP_ID` | Wolfram Alpha API key | Not required for basic functionality |

## Database Setup

### Option 1: Local MongoDB
1. Install MongoDB locally
2. Start MongoDB service
3. Set `MONGODB_URI=mongodb://localhost:27017/aitutor-mvp`

### Option 2: MongoDB Atlas
1. Create a free MongoDB Atlas account
2. Create a cluster
3. Get connection string
4. Set `MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/aitutor-mvp`

## Available Scripts

- `npm run dev` - Start development server (frontend + backend)
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run seed` - Seed database with sample data
- `npm run check` - TypeScript type checking

## Project Structure

```
AITutorMVP1/
├── client/                 # React frontend
│   ├── src/
│   │   ├── components/     # React components
│   │   ├── pages/         # Page components
│   │   ├── services/      # API services
│   │   └── utils/         # Utility functions
│   └── index.html
├── server/                 # Express backend
│   ├── controllers/       # Route controllers
│   ├── models/           # Database models
│   ├── routes/           # API routes
│   └── index.ts          # Server entry point
├── shared/               # Shared constants
└── uploads/              # File uploads directory
```

## CORS Configuration

The application is configured for local development with the following allowed origins:
- `http://localhost:3000` (React dev server)
- `http://localhost:5173` (Vite dev server)
- `http://localhost:5000` (Express server)

For production deployment, update the CORS configuration in `server/index.ts` with your domain.

## Troubleshooting

### Common Issues

1. **Port Already in Use**
   ```bash
   # Kill process using port 5000
   netstat -ano | findstr :5000
   taskkill /PID <PID> /F
   ```

2. **MongoDB Connection Failed**
   - Check if MongoDB is running
   - Verify connection string in `.env`
   - Check firewall settings

3. **CORS Errors**
   - Ensure frontend is running on allowed origin
   - Check CORS configuration in `server/index.ts`

4. **Build Errors**
   ```bash
   # Clear node_modules and reinstall
   rmdir /s node_modules
   del package-lock.json
   npm install
   ```

## Production Deployment

When ready to deploy to your custom domain:

1. Update CORS origins in `server/index.ts`
2. Set `NODE_ENV=production`
3. Configure your domain in environment variables
4. Build the application: `npm run build`
5. Deploy the `dist/` folder to your hosting provider

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review the environment variables configuration
3. Ensure all required services are running
