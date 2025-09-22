import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Import models
import User from './models/User';
import EducationalCriteria from './models/KnowledgeBase';

// Import Pinecone
import { initializePinecone, getIndex } from './config/pinecone';


// Sample data
const sampleUsers = [
  {
    email: 'admin@aitutor.com',
    firstName: 'Admin',
    lastName: 'User',
    password: 'admin123',
    role: 'admin',
    planId: 'pro',
    usageCount: 0,
    imageUsageCount: 0,
    voiceUsageCount: 0,
    paperUsageCount: 0
  },
  {
    email: 'teacher@aitutor.com',
    firstName: 'Sarah',
    lastName: 'Johnson',
    password: 'teacher123',
    role: 'teacher',
    planId: 'pro',
    usageCount: 0,
    imageUsageCount: 0,
    voiceUsageCount: 0,
    paperUsageCount: 0
  },
  {
    email: 'student@aitutor.com',
    firstName: 'Alex',
    lastName: 'Smith',
    password: 'student123',
    role: 'student',
    planId: 'free',
    usageCount: 0,
    imageUsageCount: 0,
    voiceUsageCount: 0,
    paperUsageCount: 0
  },
  {
    email: 'demo@aitutor.com',
    firstName: 'Demo',
    lastName: 'Student',
    password: 'demo123',
    role: 'student',
    planId: 'free',
    usageCount: 0,
    imageUsageCount: 0,
    voiceUsageCount: 0,
    paperUsageCount: 0
  }
];

// Function to fetch knowledge base criteria from Pinecone
async function fetchCriteriaFromPinecone() {
  try {
    console.log('🌲 Fetching knowledge base criteria from Pinecone...');
    
    // Initialize Pinecone
    await initializePinecone();
    const index = getIndex();
    
    if (!index) {
      console.warn('⚠️ Pinecone not available, skipping criteria fetch');
      return [];
    }

    // Query all vectors from Pinecone to get unique criteria
    const queryResponse = await index.query({
      vector: new Array(1536).fill(0), // Dummy vector to get all data
      topK: 10000, // Get all vectors
      includeMetadata: true
    });

    if (!queryResponse.matches || queryResponse.matches.length === 0) {
      console.log('📭 No vectors found in Pinecone');
      return [];
    }

    console.log(`🔍 Found ${queryResponse.matches.length} vectors in Pinecone`);

    // Group vectors by criteriaId to get unique criteria
    const criteriaMap = new Map();
    
    for (const match of queryResponse.matches) {
      const metadata = match.metadata || {};
      const criteriaId = metadata.criteriaId;
      
      if (criteriaId && !criteriaMap.has(criteriaId)) {
        criteriaMap.set(criteriaId, {
          criteriaId,
          name: metadata.criteriaName || 'Unknown Criteria',
          educationalBoard: metadata.educationalBoard || 'Unknown Board',
          subject: metadata.subject || 'Unknown Subject',
          level: metadata.level || 'Unknown Level',
          totalChunks: 0,
          totalTokens: 0,
          files: []
        });
      }
      
      // Count chunks and tokens for this criteria
      if (criteriaMap.has(criteriaId)) {
        const criteria = criteriaMap.get(criteriaId);
        criteria.totalChunks += 1;
        criteria.totalTokens += metadata.tokenCount || 0;
        
        // Track unique files
        const filename = metadata.filename;
        if (filename && !criteria.files.some((f: any) => f.originalName === filename)) {
          criteria.files.push({
            originalName: filename,
            filename: filename,
            size: 0, // We don't have file size in Pinecone metadata
            uploadDate: new Date(),
            chunkCount: 0
          });
        }
      }
    }

    const criteriaList = Array.from(criteriaMap.values());
    console.log(`📚 Found ${criteriaList.length} unique knowledge base criteria`);
    
    return criteriaList;
  } catch (error) {
    console.error('❌ Error fetching criteria from Pinecone:', error);
    return [];
  }
}

async function seedDatabase() {
  try {
    console.log('🌱 Starting database seeding...');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor-mvp';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing data
    console.log('🧹 Clearing existing data...');
    await User.deleteMany({});
    await EducationalCriteria.deleteMany({});
    console.log('✅ Existing data cleared');

    // Hash passwords
    const hashedUsers = await Promise.all(
      sampleUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10)
      }))
    );

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Fetch and create knowledge base criteria from Pinecone
    console.log('📚 Fetching knowledge base criteria from Pinecone...');
    const criteriaFromPinecone = await fetchCriteriaFromPinecone();
    
    if (criteriaFromPinecone.length > 0) {
      console.log('💾 Creating knowledge base criteria in database...');
      
      // Create criteria records in database
      const createdCriteria = await EducationalCriteria.insertMany(criteriaFromPinecone);
      console.log(`✅ Created ${createdCriteria.length} knowledge base criteria`);
      
      // Log details of created criteria
      createdCriteria.forEach((criteria, index) => {
        console.log(`  ${index + 1}. ${criteria.name} (${criteria.educationalBoard} ${criteria.subject} ${criteria.level})`);
        console.log(`     - Files: ${criteria.files.length}, Chunks: ${criteria.totalChunks}, Tokens: ${criteria.totalTokens}`);
      });
    } else {
      console.log('⚠️ No knowledge base criteria found in Pinecone');
    }

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- Knowledge Base Criteria: ${criteriaFromPinecone.length}`);
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@aitutor.com / admin123');
    console.log('Teacher: teacher@aitutor.com / teacher123');
    console.log('Student: student@aitutor.com / student123');
    console.log('Demo: demo@aitutor.com / demo123');

  } catch (error) {
    console.error('❌ Error seeding database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to seed only knowledge base criteria from Pinecone
async function seedCriteriaFromPinecone() {
  try {
    console.log('🌱 Starting criteria seeding from Pinecone...');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor-mvp';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Clear existing criteria
    console.log('🧹 Clearing existing knowledge base criteria...');
    await EducationalCriteria.deleteMany({});
    console.log('✅ Existing criteria cleared');

    // Fetch and create knowledge base criteria from Pinecone
    const criteriaFromPinecone = await fetchCriteriaFromPinecone();
    
    if (criteriaFromPinecone.length > 0) {
      console.log('💾 Creating knowledge base criteria in database...');
      
      // Create criteria records in database
      const createdCriteria = await EducationalCriteria.insertMany(criteriaFromPinecone);
      console.log(`✅ Created ${createdCriteria.length} knowledge base criteria`);
      
      // Log details of created criteria
      createdCriteria.forEach((criteria, index) => {
        console.log(`  ${index + 1}. ${criteria.name} (${criteria.educationalBoard} ${criteria.subject} ${criteria.level})`);
        console.log(`     - Files: ${criteria.files.length}, Chunks: ${criteria.totalChunks}, Tokens: ${criteria.totalTokens}`);
      });
    } else {
      console.log('⚠️ No knowledge base criteria found in Pinecone');
    }

    console.log('🎉 Criteria seeding completed successfully!');

  } catch (error) {
    console.error('❌ Error seeding criteria from Pinecone:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the appropriate function based on command line arguments
const args = process.argv.slice(2);
if (args.includes('--criteria-only')) {
  seedCriteriaFromPinecone();
} else {
  seedDatabase();
}

export default seedDatabase;
export { seedCriteriaFromPinecone };
