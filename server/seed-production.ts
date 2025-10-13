import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';

// Load environment variables
dotenv.config();

// Import models
import User from './models/User';
import EducationalCriteria from './models/KnowledgeBase';
import Usage from './models/Usage';
import { HARDCODED_CRITERIA } from './utils/hardcodedCriteria';

// Sample users for production
const productionUsers = [
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

// Convert hardcoded criteria to database format
const criteriaForDatabase = HARDCODED_CRITERIA.map(criteria => ({
  name: criteria.name,
  description: criteria.description,
  educationalBoard: criteria.educationalBoard,
  subject: criteria.subject,
  level: criteria.level,
  totalChunks: criteria.totalChunks,
  totalTokens: criteria.totalTokens,
  files: [] // No files for hardcoded criteria
}));

// Sample usage data for tracking
const sampleUsageData = [
  {
    date: new Date(),
    tokensUsed: 0,
    ttsMinutes: 0,
    sttRequests: 0,
    wolframRequests: 0,
    embeddingRequests: 0,
    totalCost: 0
  }
];

async function seedProductionDatabase() {
  try {

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor-mvp';
    await mongoose.connect(mongoURI);
    await User.deleteMany({});
    await EducationalCriteria.deleteMany({});
    await Usage.deleteMany({});
    console.log('✅ Existing data cleared');

    // Hash passwords
    console.log('🔐 Hashing passwords...');
    const hashedUsers = await Promise.all(
      productionUsers.map(async (user) => ({
        ...user,
        password: await bcrypt.hash(user.password, 10)
      }))
    );

    // Create users
    console.log('👥 Creating users...');
    const createdUsers = await User.insertMany(hashedUsers);
    console.log(`✅ Created ${createdUsers.length} users`);

    // Create hardcoded criteria in database
    console.log('📚 Creating hardcoded criteria in database...');
    const createdCriteria = await EducationalCriteria.insertMany(criteriaForDatabase);
    console.log(`✅ Created ${createdCriteria.length} criteria`);

    // Log created criteria
    createdCriteria.forEach((criteria, index) => {
      console.log(`  ${index + 1}. ${criteria.name} (${criteria.educationalBoard} ${criteria.subject} ${criteria.level})`);
    });

    // Create usage tracking data
    console.log('📊 Creating usage tracking data...');
    await Usage.insertMany(sampleUsageData);
    console.log('✅ Created usage tracking data');

    console.log('\n🎉 Production database seeding completed successfully!');
    console.log('\n📋 Summary:');
    console.log(`- Users: ${createdUsers.length}`);
    console.log(`- Educational Criteria: ${createdCriteria.length}`);
    console.log(`- Usage Records: ${sampleUsageData.length}`);
    
    console.log('\n🔑 Test Credentials:');
    console.log('Admin: admin@aitutor.com / admin123');
    console.log('Teacher: teacher@aitutor.com / teacher123');
    console.log('Student: student@aitutor.com / student123');
    console.log('Demo: demo@aitutor.com / demo123');
    
    console.log('\n📚 Available Criteria:');
    createdCriteria.forEach((criteria, index) => {
      console.log(`  ${index + 1}. ${criteria.name} - ${criteria.level}`);
    });

    console.log('\n⚠️  Important Notes:');
    console.log('- The app uses hardcoded criteria for chat functionality');
    console.log('- Database criteria are for reference and future features');
    console.log('- All users start with 0 usage counts');
    console.log('- Admin users have "pro" plan, students have "free" plan');

  } catch (error) {
    console.error('❌ Error seeding production database:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to add only hardcoded criteria to database
async function seedHardcodedCriteria() {
  try {
    console.log('🌱 Adding hardcoded criteria to database...');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor-mvp';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if criteria already exist
    const existingCriteria = await EducationalCriteria.find({});
    if (existingCriteria.length > 0) {
      console.log(`⚠️ Found ${existingCriteria.length} existing criteria. Skipping...`);
      return;
    }

    // Create hardcoded criteria in database
    console.log('📚 Creating hardcoded criteria in database...');
    const createdCriteria = await EducationalCriteria.insertMany(criteriaForDatabase);
    console.log(`✅ Created ${createdCriteria.length} criteria`);

    // Log created criteria
    createdCriteria.forEach((criteria, index) => {
      console.log(`  ${index + 1}. ${criteria.name} (${criteria.educationalBoard} ${criteria.subject} ${criteria.level})`);
    });

    console.log('🎉 Hardcoded criteria seeding completed!');

  } catch (error) {
    console.error('❌ Error seeding hardcoded criteria:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Function to create a single admin user
async function createAdminUser() {
  try {
    console.log('👤 Creating admin user...');

    // Connect to MongoDB
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor-mvp';
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB');

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: 'admin@aitutor.com' });
    if (existingAdmin) {
      console.log('⚠️ Admin user already exists. Skipping...');
      return;
    }

    // Create admin user
    const adminUser = {
      email: 'admin@aitutor.com',
      firstName: 'Admin',
      lastName: 'User',
      password: await bcrypt.hash('admin123', 10),
      role: 'admin',
      planId: 'pro',
      usageCount: 0,
      imageUsageCount: 0,
      voiceUsageCount: 0,
      paperUsageCount: 0
    };

    const createdAdmin = await User.create(adminUser);
    console.log('✅ Admin user created successfully');
    console.log('🔑 Admin Credentials: admin@aitutor.com / admin123');

  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the appropriate function based on command line arguments
const args = process.argv.slice(2);
if (args.includes('--criteria-only')) {
  seedHardcodedCriteria();
} else if (args.includes('--admin-only')) {
  createAdminUser();
} else {
  seedProductionDatabase();
}

export default seedProductionDatabase;
export { seedHardcodedCriteria, createAdminUser };
