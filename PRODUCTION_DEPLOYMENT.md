# 🚀 AI Tutor MVP - Production Deployment Guide

## 📊 Database Tables Overview

### **Core Tables (Required)**
| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `users` | User authentication & profiles | None |
| `chatrooms` | Chat room management | users |
| `chatsessions` | Chat session management | users, chatrooms |
| `messages` | Individual chat messages | users, chatrooms |
| `sessions` | Express session storage | users |
| `usages` | Usage tracking & billing | users |

### **Feature Tables (Optional)**
| Table | Purpose | Dependencies |
|-------|---------|--------------|
| `educationalcriteria` | Knowledge base criteria | None |
| `generatedpapers` | Generated exam papers | users |
| `papertemplates` | Paper generation templates | None |
| `resourcedocs` | Resource documents | None |

## 🌱 Database Seeding

### **Quick Start (Minimal)**
```bash
# Create admin user only
npm run seed:admin

# Add hardcoded criteria to database
npm run seed:criteria

# Full production seed
npm run seed:production
```

### **Seed Commands**
```bash
# Production seed (all data)
node server/seed-production.js

# Admin user only
node server/seed-production.js --admin-only

# Hardcoded criteria only
node server/seed-production.js --criteria-only
```

## 🔧 Environment Variables Required

### **Database**
```env
MONGODB_URI=mongodb://localhost:27017/ai-tutor-mvp
```

### **OpenAI**
```env
OPENAI_API_KEY=your_openai_api_key
```

### **Pinecone (Optional)**
```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_index_name
```

### **Stripe (Optional)**
```env
STRIPE_SECRET_KEY=your_stripe_secret_key
STRIPE_PUBLISHABLE_KEY=your_stripe_publishable_key
STRIPE_WEBHOOK_SECRET=your_stripe_webhook_secret
```

## 🚀 Production Deployment Steps

### **1. Database Setup**
```bash
# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your production values

# Run production seed
npm run seed:production
```

### **2. Build Application**
```bash
# Build client and server
npm run build

# Start production server
npm start
```

### **3. Verify Deployment**
- ✅ Admin user created: `admin@aitutor.com / admin123`
- ✅ Hardcoded criteria available in database
- ✅ Chat functionality working
- ✅ Criteria selection working
- ✅ AI responses working

## 📋 Production Checklist

### **Database**
- [ ] MongoDB connection configured
- [ ] Admin user created
- [ ] Hardcoded criteria seeded
- [ ] Usage tracking initialized

### **Application**
- [ ] Environment variables set
- [ ] OpenAI API key configured
- [ ] Application builds successfully
- [ ] Server starts without errors

### **Features**
- [ ] User authentication working
- [ ] Chat room creation working
- [ ] Criteria selection working
- [ ] AI responses working
- [ ] Message persistence working

## 🔍 Troubleshooting

### **Common Issues**

1. **"Educational criteria not found" error**
   - Run: `npm run seed:criteria`
   - This adds hardcoded criteria to database

2. **Authentication issues**
   - Run: `npm run seed:admin`
   - Creates admin user for testing

3. **Chat not working**
   - Check OpenAI API key
   - Verify database connection
   - Check server logs for errors

### **Logs to Check**
```bash
# Server logs
npm run dev  # Development
npm start    # Production

# Database logs
# Check MongoDB logs for connection issues
```

## 📊 Monitoring

### **Key Metrics to Monitor**
- User registration/login success rate
- Chat message processing time
- AI response generation time
- Database connection health
- Memory usage
- Error rates

### **Health Check Endpoints**
- `GET /api/health` - Basic health check
- `GET /api/users/me` - Authentication check
- `GET /api/chat-rooms` - Database connectivity check

## 🔒 Security Considerations

### **Production Security**
- [ ] Change default admin password
- [ ] Use strong MongoDB credentials
- [ ] Enable HTTPS
- [ ] Set up proper CORS
- [ ] Implement rate limiting
- [ ] Regular security updates

### **Data Protection**
- [ ] Encrypt sensitive data
- [ ] Regular database backups
- [ ] Secure API endpoints
- [ ] Input validation
- [ ] SQL injection prevention

## 📈 Scaling Considerations

### **Database Optimization**
- Add proper indexes
- Monitor query performance
- Consider read replicas
- Implement connection pooling

### **Application Scaling**
- Use PM2 for process management
- Implement load balancing
- Add caching layer
- Monitor resource usage

## 🆘 Support

### **Emergency Contacts**
- Database issues: Check MongoDB logs
- API issues: Check server logs
- Authentication issues: Verify user table
- Chat issues: Check OpenAI API status

### **Useful Commands**
```bash
# Check database connection
node -e "require('./server/config/mongoDb').connect()"

# Reset database (DANGER - removes all data)
npm run seed:production

# Check application health
curl http://localhost:5000/api/health
```
