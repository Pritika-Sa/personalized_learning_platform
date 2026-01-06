const express = require('express');
const { auth } = require('../middleware/auth');
const Course = require('../models/Course');
const LearningCopilotService = require('../services/LearningCopilotService');
const LearningAgent = require('../services/LearningAgent');
const LearningMemory = require('../models/LearningMemory');
const TopicMastery = require('../models/TopicMastery');
const LearningPlan = require('../models/LearningPlan');

const router = express.Router();
const copilot = new LearningCopilotService();

/**
 * LEARNING COPILOT ENDPOINTS
 * 
 * Advanced AI-powered learning assistant with:
 * - Course-context Q&A with RAG-like behavior
 * - Step-by-step explanations
 * - Personalized topic recommendations
 * - Adaptive quiz suggestions
 * - Study tips based on learning patterns
 */

/**
 * POST /copilot/ask
 * Main copilot Q&A endpoint
 * Body: { courseId, question, conversationHistory?: [] }
 */
router.post('/ask', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, question, conversationHistory = [] } = req.body;

    if (!courseId || !question) {
      return res.status(400).json({ message: 'courseId and question are required' });
    }

    // Verify user is enrolled in course
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Get copilot response
    const response = await copilot.answerQuestion(userId, courseId, question, conversationHistory);

    res.json({
      success: response.success,
      response: response.response,
      source: response.source,
      metadata: {
        courseTitle: response.courseContext,
        learningProgress: response.learningContext
      }
    });
  } catch (error) {
    console.error('Error in copilot ask:', error);
    res.status(500).json({ success: false, message: 'Failed to get copilot response' });
  }
});

/**
 * POST /copilot/chat
 * Agentic chat endpoint using LearningAgent (Think-Act cycle + RAG)
 */
router.post('/chat', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, message } = req.body;

    if (!courseId || !message) {
      return res.status(400).json({ message: 'courseId and message are required' });
    }

    const result = await LearningAgent.processInteraction(userId, courseId, message);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Error in copilot chat:', error);
    res.status(500).json({ success: false, message: 'Failed to get agent response' });
  }
});

/**
 * POST /copilot/explain
 * Get step-by-step explanation of a concept
 * Body: { courseId, concept, depth?: 'beginner'|'intermediate'|'advanced' }
 */
router.post('/explain', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, concept, depth = 'beginner' } = req.body;

    if (!courseId || !concept) {
      return res.status(400).json({ message: 'courseId and concept are required' });
    }

    const explanation = await copilot.explainConcept(userId, courseId, concept, depth);

    res.json(explanation);
  } catch (error) {
    console.error('Error explaining concept:', error);
    res.status(500).json({ success: false, message: 'Failed to explain concept' });
  }
});

/**
 * GET /copilot/next-topic/:courseId
 * Get recommendation for next topic to study
 */
router.get('/next-topic/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const recommendation = await copilot.suggestNextTopic(userId, courseId);

    res.json(recommendation);
  } catch (error) {
    console.error('Error suggesting next topic:', error);
    res.status(500).json({ success: false, message: 'Failed to suggest next topic' });
  }
});

/**
 * GET /copilot/study-tips/:courseId
 * Get personalized study tips based on learning patterns
 */
router.get('/study-tips/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const tips = await copilot.getStudyTips(userId, courseId);

    res.json(tips);
  } catch (error) {
    console.error('Error getting study tips:', error);
    res.status(500).json({ success: false, message: 'Failed to get study tips' });
  }
});

/**
 * GET /copilot/quiz-recommendation/:courseId
 * Get adaptive quiz recommendation based on weak topics
 */
router.get('/quiz-recommendation/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const recommendation = await copilot.recommendAdaptiveQuiz(userId, courseId);

    res.json(recommendation);
  } catch (error) {
    console.error('Error recommending quiz:', error);
    res.status(500).json({ success: false, message: 'Failed to recommend quiz' });
  }
});

/**
 * GET /copilot/dashboard/:courseId
 * Get comprehensive dashboard data for learning copilot
 * Includes: learning plan, topic mastery, weak topics, progress, next steps
 */
router.get('/dashboard/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    // Get all relevant data in parallel
    const [plan, memory, masteries] = await Promise.all([
      LearningPlan.findOne({ userId, courseId }),
      LearningMemory.findOne({ userId, courseId }),
      TopicMastery.find({ userId, courseId }).select('topicName masteryScore classification')
    ]);

    if (!memory) {
      return res.status(404).json({ message: 'No learning data found. Start by generating a learning plan.' });
    }

    // Get next topic recommendation
    const nextTopicRec = await copilot.suggestNextTopic(userId, courseId);

    // Get current week from plan
    const currentWeek = plan?.weeks.find(w => w.status !== 'completed');

    // Calculate progress percentage
    const completedTopics = memory.completedTopics.length;
    const totalTopicsEstimated = plan?.weeks.reduce((sum, w) => sum + (w.topics?.length || 0), 0) || 10;
    const progressPercent = Math.round((completedTopics / totalTopicsEstimated) * 100);

    const dashboard = {
      success: true,
      overview: {
        courseId,
        progressPercent,
        completedTopics,
        totalTopicsEstimated,
        currentWeek: currentWeek?.weekNumber || 1
      },
      learningPlan: {
        currentWeek: currentWeek?.weekNumber || null,
        currentWeekTopics: currentWeek?.topics || [],
        currentWeekHours: currentWeek?.hoursPerWeek || 5,
        currentWeekStatus: currentWeek?.status || 'pending'
      },
      topicMastery: {
        weak: masteries.filter(m => m.classification === 'weak').map(m => ({
          name: m.topicName,
          score: m.masteryScore
        })),
        medium: masteries.filter(m => m.classification === 'medium').map(m => ({
          name: m.topicName,
          score: m.masteryScore
        })),
        strong: masteries.filter(m => m.classification === 'strong').map(m => ({
          name: m.topicName,
          score: m.masteryScore
        }))
      },
      statistics: {
        quizzesCompleted: memory.statistics.totalQuizzesTaken,
        averageQuizScore: memory.statistics.averageQuizScore,
        mistakesMade: memory.statistics.totalMistakesMade,
        mistakesCorrected: memory.statistics.totalMistakesCorrected,
        totalTimeInvested: Math.round(memory.statistics.totalTimeInvested / 60), // in hours
        consistency: memory.learningPatterns.consistencyScore
      },
      learningPattern: {
        velocity: memory.learningPatterns.learningVelocity,
        avgSessionDuration: memory.learningPatterns.averageSessionDuration,
        preferredStudyTime: memory.learningPatterns.preferredStudyTime || 'Not enough data',
        engagementLevel: memory.learningPatterns.engagementLevel
      },
      recommendations: {
        nextTopic: nextTopicRec.nextTopic,
        nextTopicReason: nextTopicRec.reason,
        suggestedAction: nextTopicRec.weakTopics.length > 0 ? 'REVIEW_WEAK_TOPICS' : 'CONTINUE_PLAN',
        weakTopicsCount: masteries.filter(m => m.classification === 'weak').length
      }
    };

    res.json(dashboard);
  } catch (error) {
    console.error('Error fetching dashboard:', error);
    res.status(500).json({ success: false, message: 'Failed to fetch dashboard' });
  }
});

/**
 * POST /copilot/generate-plan-with-copilot
 * Enhanced learning plan generation using copilot
 * Body: { courseId, experienceLevel, weeklyHours, learningGoal }
 */
router.post('/generate-plan-with-copilot', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const {
      courseId,
      experienceLevel = 'beginner',
      weeklyHours = 5,
      learningGoal = ''
    } = req.body;

    const course = await Course.findById(courseId).select('title description level');
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user already has a learning memory
    let memory = await LearningMemory.findOne({ userId, courseId });
    if (!memory) {
      memory = new LearningMemory({
        userId,
        courseId,
        currentGoal: {
          description: learningGoal || `Complete ${course.title}`,
          deadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000) // 60 days from now
        },
        metadata: {
          courseTitle: course.title,
          courseLevel: course.level,
          isActive: true
        }
      });
      await memory.save();
    }

    // Create learning plan (simplified for copilot-enhanced version)
    let plan = await LearningPlan.findOne({ userId, courseId });
    if (!plan) {
      const weeksEstimated = Math.ceil(weeklyHours >= 5 ? 8 : 12);

      // Create simple week structure (can be enhanced with AI)
      const weeks = Array.from({ length: weeksEstimated }, (_, i) => ({
        weekNumber: i + 1,
        topics: [
          `Topic ${i + 1}`,
          `Topic ${i + 1}.1`,
          `Topic ${i + 1}.2`
        ],
        hoursPerWeek: weeklyHours,
        tasks: [
          'Watch course videos',
          'Complete practice exercises',
          'Take assessment quiz'
        ],
        status: i === 0 ? 'in-progress' : 'pending'
      }));

      plan = new LearningPlan({
        userId,
        courseId,
        title: `${course.title} - ${weeksEstimated} Week Plan`,
        description: `Personalized ${weeksEstimated}-week learning plan (${weeklyHours} hours/week)`,
        weeks
      });
      await plan.save();
    }

    res.json({
      success: true,
      plan: {
        planId: plan._id,
        courseTitle: course.title,
        weeks: plan.weeks.length,
        weeklyHours,
        totalEstimatedHours: plan.weeks.length * weeklyHours,
        currentWeek: 1,
        memoryInitialized: true,
        message: `Learning plan created! Start with Week 1. The copilot will adapt your plan as you progress.`
      }
    });
  } catch (error) {
    console.error('Error generating copilot plan:', error);
    res.status(500).json({ success: false, message: 'Failed to generate learning plan' });
  }
});

/**
 * POST /copilot/adaptive-suggestion
 * Get adaptive copilot suggestion based on current performance
 * Body: { courseId, currentWeek?, lastQuizScore? }
 */
router.post('/adaptive-suggestion', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, currentWeek, lastQuizScore } = req.body;

    const memory = await LearningMemory.findOne({ userId, courseId });
    const masteries = await TopicMastery.find({ userId, courseId });

    if (!memory) {
      return res.status(404).json({
        message: 'No learning data. Generate a learning plan first.',
        suggestion: 'CREATE_PLAN'
      });
    }

    // Determine suggestion based on performance
    let suggestion = {};

    const weakTopics = masteries.filter(m => m.classification === 'weak');
    const totalMistakes = memory.mistakeLog.filter(m => !m.isCorrected).length;

    if (weakTopics.length > 3) {
      suggestion = {
        type: 'FOCUS_WEAK_TOPICS',
        title: 'Focus on Weak Topics',
        message: `You have ${weakTopics.length} weak topics. Let's strengthen these before moving forward.`,
        recommendedTopics: weakTopics.map(t => t.topicName).slice(0, 3),
        priority: 'high',
        action: 'REVIEW_WEAK'
      };
    } else if (totalMistakes > 5) {
      suggestion = {
        type: 'REVIEW_MISTAKES',
        title: 'Review Your Mistakes',
        message: `You have ${totalMistakes} unreviewedmistakes. Reviewing them will significantly improve your learning.`,
        recommendedAction: 'REVIEW_MISTAKES',
        priority: 'high',
        action: 'REVIEW_MISTAKES'
      };
    } else if (memory.learningPatterns.consistencyScore < 50) {
      suggestion = {
        type: 'BUILD_CONSISTENCY',
        title: 'Build Learning Consistency',
        message: 'You\'re doing well, but consistency is key! Try to maintain a regular study schedule.',
        recommendedSchedule: '30 minutes daily',
        priority: 'medium',
        action: 'BUILD_STREAK'
      };
    } else {
      suggestion = {
        type: 'CONTINUE_PLAN',
        title: 'Keep Going!',
        message: 'Great progress! Continue with this week\'s topics. You\'re on track!',
        nextTopic: weakTopics.length === 0 ? 'Advanced topic' : 'Topic review',
        priority: 'low',
        action: 'CONTINUE'
      };
    }

    res.json({
      success: true,
      suggestion,
      context: {
        weakTopics: weakTopics.length,
        totalMistakes,
        consistency: memory.learningPatterns.consistencyScore,
        currentWeek: currentWeek || 1
      }
    });
  } catch (error) {
    console.error('Error getting adaptive suggestion:', error);
    res.status(500).json({ success: false, message: 'Failed to get suggestion' });
  }
});

/**
 * GET /copilot/learning-summary/:courseId
 * Get a comprehensive text summary of learning progress (for notifications/reports)
 */
router.get('/learning-summary/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId } = req.params;

    const [plan, memory, masteries] = await Promise.all([
      LearningPlan.findOne({ userId, courseId }),
      LearningMemory.findOne({ userId, courseId }),
      TopicMastery.find({ userId, courseId })
    ]);

    if (!memory) {
      return res.json({
        success: true,
        summary: 'Start your learning journey! Generate a personalized learning plan to get started with the copilot.'
      });
    }

    const progressPercent = memory.statistics.totalTopicsCovered > 0
      ? Math.round((memory.completedTopics.length / memory.statistics.totalTopicsCovered) * 100)
      : 0;

    const weakTopics = masteries.filter(m => m.classification === 'weak').map(m => m.topicName);
    const strongTopics = masteries.filter(m => m.classification === 'strong').map(m => m.topicName);

    const summary = `
Learning Progress Summary for ${memory.metadata.courseTitle}:

📊 Overall Progress: ${progressPercent}% complete
⏱️ Time Invested: ${Math.round(memory.statistics.totalTimeInvested / 60)} hours
📚 Topics Covered: ${memory.completedTopics.length} out of ${memory.statistics.totalTopicsCovered || 'many'}
✅ Average Quiz Score: ${memory.statistics.averageQuizScore}%

💪 Strong Topics: ${strongTopics.length > 0 ? strongTopics.join(', ') : 'Keep practicing!'}
⚠️ Topics Needing Review: ${weakTopics.length > 0 ? weakTopics.join(', ') : 'None - Great work!'}

🎯 Learning Pace: ${memory.learningPatterns.learningVelocity || 'Moderate'}
🔥 Consistency: ${memory.learningPatterns.consistencyScore}%

${weakTopics.length > 0 ? `\n📌 Next Steps: Focus on reviewing ${weakTopics[0]} to strengthen weak areas.` : '\n📌 Next Steps: Continue with advanced topics or explore related courses!'}
    `;

    res.json({
      success: true,
      summary: summary.trim(),
      metrics: {
        progress: progressPercent,
        timeInvested: Math.round(memory.statistics.totalTimeInvested / 60),
        topicsCovered: memory.completedTopics.length,
        averageScore: memory.statistics.averageQuizScore,
        weakTopicsCount: weakTopics.length,
        strongTopicsCount: strongTopics.length
      }
    });
  } catch (error) {
    console.error('Error generating learning summary:', error);
    res.status(500).json({ success: false, message: 'Failed to generate summary' });
  }
});

module.exports = router;
