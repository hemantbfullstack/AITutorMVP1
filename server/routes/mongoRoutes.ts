import express from 'express';
import rateLimit from 'express-rate-limit';
import multer from 'multer';
import { authenticateToken } from '../middleware/auth.js';
import { requireAdmin } from '../middleware/roleAuth.js';
import { checkUsage } from '../checkUsageMiddleware.js';

// Import all controllers
import * as userController from '../controllers/userController.js';
import * as sessionController from '../controllers/sessionController.js';
import * as messageController from '../controllers/messageController.js';
import * as paperTemplateController from '../controllers/paperTemplateController.js';
import * as generatedPaperController from '../controllers/generatedPaperController.js';
import * as resourceDocController from '../controllers/resourceDocController.js';
import * as usageController from '../controllers/usageController.js';
import * as knowledgeBaseController from '../controllers/knowledgeBaseController.js';
import * as chatSessionController from '../controllers/chatSessionController.js';
import * as mathToolsController from '../controllers/mathToolsController.js';
import * as voiceController from '../controllers/voiceController.js';
import * as paperGenerationController from '../controllers/paperGenerationController.js';
import * as wolframController from '../controllers/wolframController.js';

// Import new LLM Tutor routes
import chatRoutes from './chat.js';
import voiceRoutes from './voice.js';
import knowledgeBaseRoutes from './knowledgeBase.js';
import uploadRoutes from './upload.js';
import importRoutes from './import.js';
import chatRoomRoutes from './chatRoutes.js';

const router = express.Router();

// Configure multer for image uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB limit
  },
  fileFilter: (req, file, cb: any) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

// Rate limiters
const tutorRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 20, // 20 messages per 5 minutes
  message: { error: "Too many messages. Please wait before sending more." },
  standardHeaders: true,
  legacyHeaders: false,
});

const toolsRateLimit = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 30, // 30 requests per minute
  message: { error: "Too many tool requests. Please wait." },
});

const ttsRateLimit = rateLimit({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30, // 30 TTS calls per 5 minutes
  message: { error: "Too many TTS requests. Please wait." },
});

const paperGenRateLimit = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 5, // 5 paper generations per 10 minutes
  message: { error: "Too many paper generation requests. Please wait." },
});

// ============================================================================
// AUTH ROUTES
// ============================================================================
router.post('/auth/register', userController.register);
router.post('/auth/login', userController.login);
router.put('/auth/profile', authenticateToken, userController.updateProfile);
router.post('/auth/change-password', authenticateToken, userController.changePassword);
// Note: forgotPassword and resetPassword functions need to be implemented in userController
// router.post('/auth/forgot-password', userController.forgotPassword);
// router.post('/auth/reset-password', userController.resetPassword);

// ============================================================================
// USER ROUTES
// ============================================================================
router.route('/users')
  .get(authenticateToken, userController.getAllUsers)
  .post(authenticateToken, userController.register);

router.route('/users/:id')
  .get(authenticateToken, userController.getUserById)
  .put(authenticateToken, userController.updateProfile)
  .delete(authenticateToken, userController.deleteUser);

// Note: getUserSessions and getUserUsage functions need to be implemented in userController
// router.get('/users/:id/sessions', authenticateToken, userController.getUserSessions);
// router.get('/users/:id/usage', authenticateToken, userController.getUserUsage);

// ============================================================================
// SESSION ROUTES
// ============================================================================
router.route('/sessions')
  .get(authenticateToken, sessionController.getAllSessions)
  .post(authenticateToken, sessionController.createSession);

router.route('/sessions/:id')
  .get(authenticateToken, sessionController.getSession)
  .put(authenticateToken, sessionController.updateSession)
  .delete(authenticateToken, sessionController.deleteSession);


// ============================================================================
// MESSAGE ROUTES
// ============================================================================
router.route('/messages')
  .get(authenticateToken, messageController.getLatestMessages)
  .post(authenticateToken, messageController.createMessage);

router.route('/messages/:id')
  .get(authenticateToken, messageController.getMessage)
  .put(authenticateToken, messageController.updateMessage)
  .delete(authenticateToken, messageController.deleteMessage);

//router.get('/messages/session/:sessionId', authenticateToken, messageController.getMessagesBySession);

// ============================================================================
// CHAT SESSION ROUTES
// ============================================================================
router.route('/chat/sessions')
  .get(authenticateToken, chatSessionController.getChatSessions)
  .post(authenticateToken, chatSessionController.createChatSession);

router.route('/chat/sessions/:id')
  .get(authenticateToken, chatSessionController.getChatSession)
  .put(authenticateToken, chatSessionController.updateChatSession)
  .delete(authenticateToken, chatSessionController.deleteChatSession);

router.get('/chat/sessions/user/:userId', authenticateToken, chatSessionController.getChatSessions);


// ============================================================================
// MATH TOOLS ROUTES
// ============================================================================
router.post('/tools/calc', authenticateToken, toolsRateLimit, mathToolsController.calculate);
router.post('/tools/graph', authenticateToken, toolsRateLimit, mathToolsController.graph);
router.post('/tools/wolfram', authenticateToken, toolsRateLimit, mathToolsController.wolframQuery);

// ============================================================================
// VOICE ROUTES
// ============================================================================
router.post('/voice/tts', authenticateToken, ttsRateLimit, voiceController.textToSpeech);

// ============================================================================
// WOLFRAM ROUTES
// ============================================================================
router.get('/wolfram/selftest', wolframController.wolframSelfTest);
router.post('/wolfram/simple', wolframController.wolframSimple);
router.post('/wolfram/full', wolframController.wolframFull);
router.post('/wolfram/image', upload.single('image'), wolframController.wolframImage);
router.post('/wolfram/cloud-image', upload.single('image'), wolframController.wolframCloudImage);

// ============================================================================
// PAPER TEMPLATE ROUTES
// ============================================================================
router.route('/papers/templates')
  .get(authenticateToken, paperTemplateController.getPaperTemplates)
  .post(authenticateToken, paperTemplateController.createPaperTemplate);

router.route('/papers/templates/:id')
  .get(authenticateToken, paperTemplateController.getPaperTemplate)
  .put(authenticateToken, paperTemplateController.updatePaperTemplate)
  .delete(authenticateToken, paperTemplateController.deletePaperTemplate);

// ============================================================================
// GENERATED PAPER ROUTES
// ============================================================================
router.route('/papers/generated')
  .get(authenticateToken, generatedPaperController.getUserGeneratedPapers)
  .post(authenticateToken, generatedPaperController.createGeneratedPaper);

router.route('/papers/generated/:id')
  .get(authenticateToken, generatedPaperController.getGeneratedPaper)
  .put(authenticateToken, generatedPaperController.updateGeneratedPaper)
  .delete(authenticateToken, generatedPaperController.deleteGeneratedPaper);

router.get('/papers/generated/user/:userId', authenticateToken, generatedPaperController.getUserGeneratedPapers);

// ============================================================================
// PAPER GENERATION ROUTES
// ============================================================================
router.post('/papers/generate', authenticateToken, paperGenRateLimit, paperGenerationController.generatePaper);
router.post('/papers/:paperId/pdf', authenticateToken, paperGenerationController.generatePaperPDF);

// ============================================================================
// RESOURCE DOCUMENT ROUTES
// ============================================================================
router.route('/resources')
  .get(authenticateToken, resourceDocController.getResourceDocs)
  .post(authenticateToken, resourceDocController.createResourceDoc);

router.route('/resources/:id')
  .get(authenticateToken, resourceDocController.getResourceDoc)
  .put(authenticateToken, resourceDocController.updateResourceDoc)
  .delete(authenticateToken, resourceDocController.deleteResourceDoc);

// ============================================================================
// USAGE ROUTES
// ============================================================================
router.route('/usage')
  .get(authenticateToken, usageController.getUsageRecords)
  .post(authenticateToken, usageController.createUsage);

router.route('/usage/:id')
  .get(authenticateToken, usageController.getUsageRecord)
  .put(authenticateToken, usageController.updateUsageRecord)
  .delete(authenticateToken, usageController.deleteUsageRecord);

// Note: getUsageByUser function needs to be implemented in usageController
// router.get('/usage/user/:userId', authenticateToken, usageController.getUsageByUser);

// ============================================================================
// KNOWLEDGE BASE ROUTES
// ============================================================================
router.route('/knowledge')
  .get(authenticateToken, knowledgeBaseController.getEducationalCriterias)
  .post(authenticateToken, knowledgeBaseController.createEducationalCriteria);

router.route('/knowledge/:id')
  .get(authenticateToken, knowledgeBaseController.getEducationalCriteria)
  .put(authenticateToken, knowledgeBaseController.updateEducationalCriteria)
  .delete(authenticateToken, knowledgeBaseController.deleteEducationalCriteria);

// Note: searchKnowledgeBase function needs to be implemented in knowledgeBaseController
// router.get('/knowledge/search', authenticateToken, knowledgeBaseController.searchKnowledgeBase);

// ============================================================================
// ADMIN ROUTES
// ============================================================================
router.get('/admin/users', authenticateToken, requireAdmin, userController.getAllUsers);
router.get('/admin/users/stats', authenticateToken, requireAdmin, userController.getUserStats);
router.patch('/admin/users/:id/role', authenticateToken, requireAdmin, userController.updateUserRole);
router.patch('/admin/users/:id/plan', authenticateToken, requireAdmin, userController.updateUserPlan);
router.patch('/admin/users/:id/reset-usage', authenticateToken, requireAdmin, userController.resetUserUsage);
router.delete('/admin/users/:id', authenticateToken, requireAdmin, userController.deleteUser);

// Note: getSystemStats function needs to be implemented in usageController
// router.get('/admin/stats', authenticateToken, requireAdmin, usageController.getSystemStats);

// ============================================================================
// USER PROFILE ROUTES (Client expects /api/user/profile)
// ============================================================================
router.get('/user/profile', authenticateToken, userController.getProfile);
router.put('/user/profile', authenticateToken, userController.updateProfile);

// ============================================================================
// CHAT SERVICE ROUTES (Client expects specific chat endpoints)
// ============================================================================
router.post('/chat/:sessionId/messages', authenticateToken, messageController.createMessage);
router.get('/chat/sessions', authenticateToken, chatSessionController.getChatSessions);
router.post('/chat/sessions', authenticateToken, chatSessionController.createChatSession);
router.delete('/chat/sessions/:sessionId', authenticateToken, chatSessionController.deleteChatSession);

// ============================================================================
// STRIPE ROUTES (Client expects Stripe endpoints)
// ============================================================================
// Note: These would need to be implemented in stripeController
// router.get('/stripe/plans', authenticateToken, stripeController.getPlans);
// router.post('/stripe/create-checkout-session', authenticateToken, stripeController.createCheckoutSession);
// router.post('/stripe/sync-plans', authenticateToken, stripeController.syncPlans);
// router.post('/stripe/webhook', stripeController.handleWebhook);

// ============================================================================
// ADDITIONAL ADMIN ROUTES (Client expects these admin endpoints)
// ============================================================================
router.get('/admin/stats', authenticateToken, requireAdmin, userController.getUserStats);

// ============================================================================
// LLM TUTOR ROUTES (New AI Tutor functionality)
// ============================================================================
router.use('/chat', chatRoutes);
router.use('/voice', voiceRoutes);
router.use('/knowledge-base', knowledgeBaseRoutes);
router.use('/upload', uploadRoutes);
router.use('/import', importRoutes);
router.use('/chat-rooms', chatRoomRoutes);

// ============================================================================
// DEVELOPMENT SEEDING ROUTE (Development only)
// ============================================================================
if (process.env.NODE_ENV === 'development') {
  router.post('/dev/seed', async (req, res) => {
    try {
      // Import seedDatabase function
      const seedDatabase = await import('../seed.js');
      await seedDatabase.default();
      
      res.json({ 
        success: true, 
        message: '🎉 Database seeding completed successfully!',
        details: 'Check server logs for details and test credentials.'
      });
    } catch (error) {
      console.error('❌ Seeding failed:', error);
      res.status(500).json({ 
        success: false, 
        message: 'Database seeding failed',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
}

export default router;
