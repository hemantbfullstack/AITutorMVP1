// import mongoose from 'mongoose';
// import dotenv from 'dotenv';
// import bcrypt from 'bcryptjs';

// // Load environment variables
// dotenv.config();

// // Import models
// import User from './models/User';
// import TutorSession from './models/TutorSession';
// import Message from './models/Message';
// import KnowledgeBase from './models/KnowledgeBase';
// import ResourceDoc from './models/ResourceDoc';
// import PaperTemplate from './models/PaperTemplate';
// import GeneratedPaper from './models/GeneratedPaper';
// import Usage from './models/Usage';

// // Sample data
// const sampleUsers = [
//   {
//     email: 'admin@aitutor.com',
//     firstName: 'Admin',
//     lastName: 'User',
//     password: 'admin123',
//     role: 'admin',
//     planId: 'premium',
//     usageCount: 0,
//     imageUsageCount: 0,
//     voiceUsageCount: 0,
//     paperUsageCount: 0
//   },
//   {
//     email: 'teacher@aitutor.com',
//     firstName: 'Sarah',
//     lastName: 'Johnson',
//     password: 'teacher123',
//     role: 'teacher',
//     planId: 'premium',
//     usageCount: 0,
//     imageUsageCount: 0,
//     voiceUsageCount: 0,
//     paperUsageCount: 0
//   },
//   {
//     email: 'student@aitutor.com',
//     firstName: 'Alex',
//     lastName: 'Smith',
//     password: 'student123',
//     role: 'student',
//     planId: 'free',
//     usageCount: 0,
//     imageUsageCount: 0,
//     voiceUsageCount: 0,
//     paperUsageCount: 0
//   },
//   {
//     email: 'demo@aitutor.com',
//     firstName: 'Demo',
//     lastName: 'Student',
//     password: 'demo123',
//     role: 'student',
//     planId: 'free',
//     usageCount: 0,
//     imageUsageCount: 0,
//     voiceUsageCount: 0,
//     paperUsageCount: 0
//   }
// ];

// const sampleKnowledgeBases = [
//   {
//     name: 'IB Mathematics AA HL',
//     description: 'Comprehensive knowledge base for IB Mathematics Analysis and Approaches Higher Level',
//     files: [
//       {
//         filename: 'ib_math_aa_hl_syllabus.pdf',
//         originalName: 'IB Math AA HL Syllabus.pdf',
//         size: 2048576,
//         uploadDate: new Date(),
//         chunkCount: 45
//       },
//       {
//         filename: 'ib_math_aa_hl_past_papers.pdf',
//         originalName: 'IB Math AA HL Past Papers.pdf',
//         size: 5120000,
//         uploadDate: new Date(),
//         chunkCount: 120
//       }
//     ],
//     totalChunks: 165,
//     totalTokens: 125000
//   },
//   {
//     name: 'IB Mathematics AI SL',
//     description: 'Knowledge base for IB Mathematics Applications and Interpretation Standard Level',
//     files: [
//       {
//         filename: 'ib_math_ai_sl_guide.pdf',
//         originalName: 'IB Math AI SL Study Guide.pdf',
//         size: 1536000,
//         uploadDate: new Date(),
//         chunkCount: 35
//       }
//     ],
//     totalChunks: 35,
//     totalTokens: 28000
//   },
//   {
//     name: 'Calculus Fundamentals',
//     description: 'Basic calculus concepts and examples',
//     files: [
//       {
//         filename: 'calculus_basics.pdf',
//         originalName: 'Calculus Basics.pdf',
//         size: 1024000,
//         uploadDate: new Date(),
//         chunkCount: 25
//       }
//     ],
//     totalChunks: 25,
//     totalTokens: 20000
//   }
// ];

// const sampleResourceDocs = [
//   {
//     name: 'IB Mathematics Guide',
//     url: 'https://www.ibo.org/programmes/diploma-programme/curriculum/mathematics/'
//   },
//   {
//     name: 'Wolfram MathWorld',
//     url: 'https://mathworld.wolfram.com/'
//   },
//   {
//     name: 'Khan Academy Mathematics',
//     url: 'https://www.khanacademy.org/math'
//   },
//   {
//     name: 'Desmos Graphing Calculator',
//     url: 'https://www.desmos.com/calculator'
//   }
// ];

// const samplePaperTemplates = [
//   {
//     name: 'IB Math AA HL Paper 1 Template',
//     metaJson: {
//       subject: 'AA',
//       level: 'HL',
//       paperType: 'P1',
//       duration: 120,
//       totalMarks: 110,
//       sections: [
//         {
//           name: 'Section A',
//           questions: 8,
//           marks: 80
//         },
//         {
//           name: 'Section B',
//           questions: 3,
//           marks: 30
//         }
//       ]
//     }
//   },
//   {
//     name: 'IB Math AI SL Paper 2 Template',
//     metaJson: {
//       subject: 'AI',
//       level: 'SL',
//       paperType: 'P2',
//       duration: 90,
//       totalMarks: 110,
//       sections: [
//         {
//           name: 'Section A',
//           questions: 6,
//           marks: 60
//         },
//         {
//           name: 'Section B',
//           questions: 2,
//           marks: 50
//         }
//       ]
//     }
//   }
// ];

// const sampleUsage = [
//   {
//     date: new Date(),
//     tokensUsed: 15000,
//     ttsMinutes: 2.5,
//     sttRequests: 8,
//     wolframRequests: 12,
//     embeddingRequests: 25,
//     totalCost: 0.45
//   },
//   {
//     date: new Date(Date.now() - 86400000), // Yesterday
//     tokensUsed: 8500,
//     ttsMinutes: 1.2,
//     sttRequests: 5,
//     wolframRequests: 7,
//     embeddingRequests: 15,
//     totalCost: 0.28
//   }
// ];

// async function seedDatabase() {
//   try {
//     console.log('🌱 Starting database seeding...');

//     // Connect to MongoDB
//     const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/ai-tutor-mvp';
//     await mongoose.connect(mongoURI);
//     console.log('✅ Connected to MongoDB');

//     // Clear existing data
//     console.log('🧹 Clearing existing data...');
//     await User.deleteMany({});
//     await TutorSession.deleteMany({});
//     await Message.deleteMany({});
//     await KnowledgeBase.deleteMany({});
//     await ResourceDoc.deleteMany({});
//     await PaperTemplate.deleteMany({});
//     await GeneratedPaper.deleteMany({});
//     await Usage.deleteMany({});
//     console.log('✅ Existing data cleared');

//     // Hash passwords
//     const hashedUsers = await Promise.all(
//       sampleUsers.map(async (user) => ({
//         ...user,
//         password: await bcrypt.hash(user.password, 10)
//       }))
//     );

//     // Create users
//     console.log('👥 Creating users...');
//     const createdUsers = await User.insertMany(hashedUsers);
//     console.log(`✅ Created ${createdUsers.length} users`);

//     // Create knowledge bases
//     console.log('📚 Creating knowledge bases...');
//     const createdKnowledgeBases = await KnowledgeBase.insertMany(sampleKnowledgeBases);
//     console.log(`✅ Created ${createdKnowledgeBases.length} knowledge bases`);

//     // Create resource docs
//     console.log('📖 Creating resource documents...');
//     const createdResourceDocs = await ResourceDoc.insertMany(sampleResourceDocs);
//     console.log(`✅ Created ${createdResourceDocs.length} resource documents`);

//     // Create paper templates
//     console.log('📄 Creating paper templates...');
//     const createdPaperTemplates = await PaperTemplate.insertMany(samplePaperTemplates);
//     console.log(`✅ Created ${createdPaperTemplates.length} paper templates`);

//     // Create usage records
//     console.log('📊 Creating usage records...');
//     const createdUsage = await Usage.insertMany(sampleUsage);
//     console.log(`✅ Created ${createdUsage.length} usage records`);

//     // Create sample tutor sessions and messages
//     console.log('💬 Creating sample tutor sessions and messages...');
//     const studentUser = createdUsers.find(user => user.email === 'student@aitutor.com');
//     const teacherUser = createdUsers.find(user => user.email === 'teacher@aitutor.com');

//     if (studentUser) {
//       // Create tutor session for student
//       const tutorSession = new TutorSession({
//         userId: studentUser._id.toString(),
//         title: 'Quadratic Functions Help',
//         ibSubject: 'AA',
//         ibLevel: 'HL',
//         startedAt: new Date(),
//         endedAt: new Date(Date.now() + 3600000) // 1 hour later
//       });
//       await tutorSession.save();

//       // Create sample messages
//       const sampleMessages = [
//         {
//           sessionId: tutorSession._id,
//           userId: studentUser._id.toString(),
//           role: 'user',
//           content: 'Hi! I need help with quadratic functions. Can you explain how to find the vertex of a parabola?'
//         },
//         {
//           sessionId: tutorSession._id,
//           userId: studentUser._id.toString(),
//           role: 'assistant',
//           content: 'Hello! I\'d be happy to help you with quadratic functions. To find the vertex of a parabola, you can use the vertex formula. For a quadratic function in the form f(x) = ax² + bx + c, the vertex is located at the point (h, k) where h = -b/(2a) and k = f(h). Would you like me to work through a specific example with you?'
//         },
//         {
//           sessionId: tutorSession._id,
//           userId: studentUser._id.toString(),
//           role: 'user',
//           content: 'Yes, please! Let\'s work through f(x) = 2x² - 8x + 5'
//         },
//         {
//           sessionId: tutorSession._id,
//           userId: studentUser._id.toString(),
//           role: 'assistant',
//           content: 'Perfect! Let\'s find the vertex of f(x) = 2x² - 8x + 5.\n\nStep 1: Identify a, b, and c\n- a = 2\n- b = -8\n- c = 5\n\nStep 2: Find h using h = -b/(2a)\nh = -(-8)/(2×2) = 8/4 = 2\n\nStep 3: Find k by substituting h into the function\nk = f(2) = 2(2)² - 8(2) + 5 = 2(4) - 16 + 5 = 8 - 16 + 5 = -3\n\nSo the vertex is at (2, -3). This means the parabola opens upward (since a > 0) and has its minimum point at (2, -3).'
//         }
//       ];

//       await Message.insertMany(sampleMessages);
//       console.log(`✅ Created ${sampleMessages.length} sample messages`);
//     }

//     // Create sample generated paper
//     if (teacherUser) {
//       const sampleGeneratedPaper = new GeneratedPaper({
//         userId: teacherUser._id.toString(),
//         subject: 'AA',
//         level: 'HL',
//         paperType: 'P1',
//         topics: ['Quadratic Functions', 'Polynomials', 'Trigonometry'],
//         questionsJson: {
//           questions: [
//             {
//               number: 1,
//               marks: 8,
//               content: 'Find the vertex of the parabola y = 3x² - 12x + 7',
//               parts: ['a', 'b']
//             },
//             {
//               number: 2,
//               marks: 12,
//               content: 'Solve the equation 2x² - 5x + 3 = 0',
//               parts: ['a', 'b', 'c']
//             }
//           ]
//         },
//         markschemeJson: {
//           solutions: [
//             {
//               number: 1,
//               marks: 8,
//               solution: 'Vertex at (2, -5)',
//               marking: 'Method: 4 marks, Answer: 4 marks'
//             },
//             {
//               number: 2,
//               marks: 12,
//               solution: 'x = 1 or x = 1.5',
//               marking: 'Method: 8 marks, Answer: 4 marks'
//             }
//           ]
//         },
//         totalMarks: 20
//       });

//       await sampleGeneratedPaper.save();
//       console.log('✅ Created sample generated paper');
//     }

//     console.log('🎉 Database seeding completed successfully!');
//     console.log('\n📋 Summary:');
//     console.log(`- Users: ${createdUsers.length}`);
//     console.log(`- Knowledge Bases: ${createdKnowledgeBases.length}`);
//     console.log(`- Resource Documents: ${createdResourceDocs.length}`);
//     console.log(`- Paper Templates: ${createdPaperTemplates.length}`);
//     console.log(`- Usage Records: ${createdUsage.length}`);
//     console.log('\n🔑 Test Credentials:');
//     console.log('Admin: admin@aitutor.com / admin123');
//     console.log('Teacher: teacher@aitutor.com / teacher123');
//     console.log('Student: student@aitutor.com / student123');
//     console.log('Demo: demo@aitutor.com / demo123');

//   } catch (error) {
//     console.error('❌ Error seeding database:', error);
//     throw error;
//   } finally {
//     await mongoose.disconnect();
//     console.log('🔌 Disconnected from MongoDB');
//   }
// }

// // Run the seed function
// if (require.main === module) {
//   seedDatabase()
//     .then(() => {
//       console.log('✅ Seeding completed');
//       process.exit(0);
//     })
//     .catch((error) => {
//       console.error('❌ Seeding failed:', error);
//       process.exit(1);
//     });
// }

// export default seedDatabase;
