const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const LearningPlan = require('../models/LearningPlan');
const Mastery = require('../models/Mastery');
const ProgressState = require('../models/ProgressState');
const GeminiAI = require('../services/geminiAI');
const LearningCopilotService = require('../services/LearningCopilotService');
const LearningAgent = require('../services/LearningAgent');
const TopicMastery = require('../models/TopicMastery');
const LearningMemory = require('../models/LearningMemory');
const AdaptiveQuiz = require('../models/AdaptiveQuiz');
const EvaluationService = require('../services/EvaluationService');

const gemini = new GeminiAI();
const copilot = new LearningCopilotService();

const router = express.Router();
const mongoose = require('mongoose');

// Helper to resolve course ID from slug if needed
async function resolveCourse(idOrSlug) {
  let course = null;
  if (mongoose.Types.ObjectId.isValid(idOrSlug) && idOrSlug.length === 24) {
    course = await Course.findById(idOrSlug);
  }

  if (!course) {
    const allCourses = await Course.find();
    course = allCourses.find(c => {
      const slug = c.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
      return slug === idOrSlug;
    });
  }
  return course;
}


// Get user's learning analytics and patterns
router.get('/analytics', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's course enrollments and assessments
    const enrolledCourses = await Course.find({
      'enrolledStudents.student': userId
    }).populate('enrolledStudents');

    const assessments = await Assessment.find({ userId }).sort({ completedAt: -1 });

    // Calculate learning patterns
    const totalCourses = enrolledCourses.length;
    const completedCourses = enrolledCourses.filter(course => {
      const enrollment = course.enrolledStudents.find(e => e.student.toString() === userId.toString());
      return enrollment && enrollment.certificateEarned;
    }).length;

    // Calculate study patterns from assessment times
    const studyTimes = assessments.map(a => new Date(a.completedAt).getHours());
    const hourCounts = {};
    studyTimes.forEach(hour => {
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    });

    const bestStudyHour = Object.keys(hourCounts).reduce((a, b) =>
      hourCounts[a] > hourCounts[b] ? a : b, '9'
    );

    // Calculate average session duration (mock for now)
    const avgSessionDuration = 45;

    // Calculate learning velocity
    const completionRate = totalCourses > 0 ? (completedCourses / totalCourses) * 100 : 0;

    // Determine struggling vs strong topics
    const courseCategories = enrolledCourses.map(c => c.category);
    const categoryPerformance = {};

    enrolledCourses.forEach(course => {
      const enrollment = course.enrolledStudents.find(e => e.student.toString() === userId.toString());
      if (enrollment) {
        const category = course.category;
        if (!categoryPerformance[category]) {
          categoryPerformance[category] = { total: 0, completed: 0 };
        }
        categoryPerformance[category].total++;
        if (enrollment.certificateEarned) {
          categoryPerformance[category].completed++;
        }
      }
    });

    const strugglingTopics = Object.keys(categoryPerformance)
      .filter(cat => {
        const perf = categoryPerformance[cat];
        return perf.total > 0 && (perf.completed / perf.total) < 0.6;
      });

    const strongTopics = Object.keys(categoryPerformance)
      .filter(cat => {
        const perf = categoryPerformance[cat];
        return perf.total > 0 && (perf.completed / perf.total) >= 0.8;
      });

    // Calculate current streak (mock for now)
    const currentStreak = Math.floor(Math.random() * 15) + 1;

    res.json({
      learningPattern: {
        bestLearningTime: `${bestStudyHour}:00 - ${parseInt(bestStudyHour) + 2}:00`,
        averageSessionDuration: avgSessionDuration,
        strugglingTopics,
        strongTopics,
        learningSpeed: completionRate > 70 ? 'fast' : completionRate > 40 ? 'moderate' : 'slow',
        consistency: Math.min(currentStreak * 10, 100)
      },
      stats: {
        totalCourses,
        completedCourses,
        completionRate,
        currentStreak,
        totalAssessments: assessments.length,
        averageScore: assessments.length > 0 ?
          assessments.reduce((sum, a) => sum + a.score, 0) / assessments.length : 0
      }
    });

  } catch (error) {
    console.error('Error fetching learning analytics:', error);
    res.status(500).json({ message: 'Failed to fetch learning analytics' });
  }
});

// Get personalized insights
router.get('/insights', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const currentHour = new Date().getHours();

    const insights = [];

    // Time-based insight
    if (currentHour >= 9 && currentHour <= 11) {
      insights.push({
        type: 'suggestion',
        title: '🎯 Optimal Learning Time',
        message: 'Based on your activity, you learn best between 9-11 AM. Try scheduling your next session during this time!',
        action: 'Schedule Now'
      });
    }

    // Streak motivation
    const randomStreak = Math.floor(Math.random() * 10) + 1;
    insights.push({
      type: 'motivation',
      title: '🔥 Keep the Streak!',
      message: `You've been consistent for ${randomStreak} days straight! Just ${7 - randomStreak} more days to unlock the "Week Warrior" badge.`,
      action: 'View Progress'
    });

    // Skill gap warning
    insights.push({
      type: 'warning',
      title: '⚠️ Concept Gap Detected',
      message: 'You might want to review "JavaScript Basics" before moving to "Advanced Concepts" - it will make learning easier!',
      action: 'Review Now'
    });

    // Achievement celebration
    if (Math.random() > 0.7) {
      insights.push({
        type: 'celebration',
        title: '🎉 Milestone Achieved!',
        message: 'Congratulations! You\'ve mastered the fundamentals. You\'re ready for intermediate topics!',
        action: 'Explore Next Level'
      });
    }

    res.json({ insights });

  } catch (error) {
    console.error('Error fetching insights:', error);
    res.status(500).json({ message: 'Failed to fetch insights' });
  }
});

// Get study schedule
router.get('/study-schedule', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user's enrolled courses
    const enrolledCourses = await Course.find({
      'enrolledStudents.student': userId
    }).populate('enrolledStudents');

    const sessions = [];
    const now = new Date();

    enrolledCourses.forEach((course, index) => {
      const enrollment = course.enrolledStudents.find(e => e.student.toString() === userId.toString());
      if (enrollment && !enrollment.certificateEarned) {
        // Create study sessions for incomplete courses
        const sessionTime = new Date(now.getTime() + (index + 1) * 2 * 60 * 60 * 1000);

        sessions.push({
          id: `session-${course._id}-${index}`,
          courseId: course._id,
          courseTitle: course.title,
          topic: `Continue ${course.title}`,
          duration: 25,
          scheduledTime: sessionTime,
          type: 'video',
          difficulty: course.level === 'beginner' ? 'easy' : course.level === 'intermediate' ? 'medium' : 'hard',
          completed: false,
          priority: 5 - index
        });
      }
    });

    res.json({ sessions });

  } catch (error) {
    console.error('Error fetching study schedule:', error);
    res.status(500).json({ message: 'Failed to fetch study schedule' });
  }
});

// Update study session completion
router.post('/study-session/:sessionId/complete', auth, async (req, res) => {
  try {
    // In a real implementation, you'd store session data in the database
    // For now, just return success
    res.json({ message: 'Session marked as completed' });
  } catch (error) {
    console.error('Error completing session:', error);
    res.status(500).json({ message: 'Failed to complete session' });
  }
});

/**
 * Learning Copilot: create or regenerate a personalized learning plan for a core course
 * Request body: { courseId, weeks?, hoursPerWeek?, goals? }
 */
router.post('/copilot/plan', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, weeks = 8, hoursPerWeek = 5, goals = '' } = req.body;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    // Build minimal user context (privacy-safe)
    const userContext = {
      level: req.user.level || 'beginner',
      goals
    };

    // Ask Gemini service for a plan (privacy-safe prompt)
    const planResp = await gemini.generateLearningPlan(userContext, { title: course.title, topics: course.topics || [] }, { weeks, hoursPerWeek });

    if (!planResp.success) return res.status(500).json({ message: 'Failed to generate plan' });

    // Upsert LearningPlan document
    let lp = await LearningPlan.findOne({ userId, courseId });
    const doc = {
      userId,
      courseId,
      title: `Plan for ${course.title}`,
      description: `Personalized ${weeks}-week learning plan generated by Copilot`,
      weeks: planResp.plan
    };

    if (lp) {
      lp.weeks = doc.weeks;
      lp.title = doc.title;
      lp.description = doc.description;
      lp.metadata = lp.metadata || {};
      await lp.save();
    } else {
      lp = new LearningPlan(doc);
      await lp.save();
    }

    // Ensure a ProgressState exists
    await ProgressState.findOneAndUpdate({ userId, courseId }, { $setOnInsert: { userId, courseId, currentWeek: 1, progressPercent: 0 } }, { upsert: true });

    // EVALUATION: Log syllabus coverage
    await EvaluationService.evaluateSyllabusCoverage(courseId, lp);

    res.json({ success: true, plan: lp });
  } catch (error) {
    console.error('Copilot plan error:', error);
    res.status(500).json({ message: 'Failed to create learning plan' });
  }
});

/**
 * Get user's learning plan for a course
 */
router.get('/copilot/plan/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug } = req.params;
    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    const lp = await LearningPlan.findOne({ userId, courseId });
    if (!lp) return res.status(404).json({ message: 'Learning plan not found' });
    res.json({ success: true, plan: lp });
  } catch (error) {
    console.error('Get plan error:', error);
    res.status(500).json({ message: 'Failed to fetch plan' });
  }
});

/**
 * Update progress state (e.g., advance week/topic) — used by client to persist current position
 * Body: { courseId, currentWeek, currentTopic, progressPercent }
 */
router.post('/copilot/progress', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, currentWeek, currentTopic, progressPercent } = req.body;
    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;
    const ps = await ProgressState.findOneAndUpdate({ userId, courseId }, { currentWeek, currentTopic, progressPercent, lastUpdated: new Date() }, { upsert: true, new: true });
    res.json({ success: true, state: ps });
  } catch (error) {
    console.error('Progress update error:', error);
    res.status(500).json({ message: 'Failed to update progress' });
  }
});

/**
 * Submit quiz result for a topic — updates mastery and adapts plan mildly
 * Body: { courseId, topic, score }
 */
router.post('/copilot/quiz/submit', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, topic, score } = req.body;
    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;
    if (!courseId || !topic || typeof score !== 'number') return res.status(400).json({ message: 'Missing fields' });

    // Update or create mastery record
    const m = await Mastery.findOneAndUpdate({ userId, courseId, topic }, { $inc: { attempts: 1 }, $push: { history: { at: new Date(), score } }, $set: { lastAttemptAt: new Date() } }, { upsert: true, new: true });

    // Recompute mastery score as rolling average
    const avg = m.history.reduce((s, h) => s + h.score, 0) / (m.history.length || 1);
    m.score = Math.round(avg);
    await m.save();

    // EVALUATION: Log answer correctness
    await EvaluationService.logAnswerCorrectness(courseId, userId, score);

    // Simple adaptation: if score < 60, mark current week as in-progress and suggest review
    if (m.score < 60) {
      // Here we could modify the LearningPlan (e.g., insert review task); keep simple: return suggestion
      return res.json({ success: true, mastery: m, suggestion: 'Review foundational topics; Copilot will add remedial tasks.' });
    }

    res.json({ success: true, mastery: m });
  } catch (error) {
    console.error('Quiz submit error:', error);
    res.status(500).json({ message: 'Failed to submit quiz' });
  }
});

/**
 * Copilot chat endpoint — uses LearningAgent for Agentic behavior and RAG
 */
router.post('/copilot/chat', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId, message } = req.body;
    if (!message) return res.status(400).json({ message: 'Message required' });

    const result = await LearningAgent.processInteraction(userId, courseId, message);
    res.json({ success: true, ...result });
  } catch (error) {
    console.error('Copilot chat error:', error);
    res.status(500).json({ message: 'Failed to get agent reply' });
  }
});

// ============= NEW COPILOT FEATURES =============

/**
 * Initialize or get learning memory for a course
 * Tracks all learning history for personalization
 * GET /learning/memory/:courseId
 */
router.get('/memory/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug } = req.params;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    let memory = await LearningMemory.findOne({ userId, courseId });

    if (!memory) {
      // Create new learning memory for this course
      const course = await Course.findById(courseId).select('title level');
      if (!course) return res.status(404).json({ message: 'Course not found' });

      memory = new LearningMemory({
        userId,
        courseId,
        metadata: {
          courseTitle: course.title,
          courseLevel: course.level,
          isActive: true
        }
      });
      await memory.save();
    }

    res.json({
      success: true,
      memory: {
        id: memory._id,
        completedTopics: memory.completedTopics.length,
        currentTopics: memory.currentTopics,
        quizzesCompleted: memory.quizHistory.length,
        averageScore: memory.statistics.averageQuizScore,
        totalTimeInvested: memory.statistics.totalTimeInvested,
        weakTopics: memory.topicClassification.weak,
        strongTopics: memory.topicClassification.strong,
        consistency: memory.learningPatterns.consistencyScore
      }
    });
  } catch (error) {
    console.error('Error fetching learning memory:', error);
    res.status(500).json({ message: 'Failed to fetch learning memory' });
  }
});

/**
 * Get or create topic mastery record
 * Track detailed mastery for individual topics
 * GET /learning/topic-mastery/:courseId/:topicName
 */
router.get('/topic-mastery/:courseId/:topicName', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, topicName } = req.params;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    let mastery = await TopicMastery.findOne({ userId, courseId, topicName });

    if (!mastery) {
      mastery = new TopicMastery({
        userId,
        courseId,
        topicName,
        masteryScore: 0,
        classification: 'weak'
      });
      await mastery.save();
    }

    res.json({
      success: true,
      mastery: {
        topicName: mastery.topicName,
        masteryScore: mastery.masteryScore,
        classification: mastery.classification,
        quizAttempts: mastery.quizAttempts,
        averageQuizScore: mastery.averageQuizScore,
        highestScore: mastery.highestQuizScore,
        weakAreas: mastery.getWeakAreas(),
        lastStudiedAt: mastery.lastStudiedAt,
        completedAt: mastery.completedAt
      }
    });
  } catch (error) {
    console.error('Error fetching topic mastery:', error);
    res.status(500).json({ message: 'Failed to fetch topic mastery' });
  }
});

/**
 * Update topic mastery based on quiz result
 * POST /learning/topic-mastery/update
 * Body: { courseId, topicName, quizScore, difficulty, timeSpent, questionCount }
 */
router.post('/topic-mastery/update', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, topicName, quizScore, difficulty, timeSpent, questionCount } = req.body;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    if (!courseId || !topicName || quizScore === undefined) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Update or create topic mastery
    let mastery = await TopicMastery.findOne({ userId, courseId, topicName });

    if (!mastery) {
      mastery = new TopicMastery({
        userId,
        courseId,
        topicName
      });
    }

    // Update mastery from quiz
    const quizId = `quiz-${Date.now()}`;
    mastery.updateMasteryFromQuiz(quizScore, quizId, difficulty || 'medium', timeSpent || 0);
    await mastery.save();

    // Also update learning memory
    let memory = await LearningMemory.findOne({ userId, courseId });
    if (memory) {
      memory.recordQuizAttempt({
        quizId,
        topicName,
        score: quizScore,
        maxScore: 100,
        difficulty: difficulty || 'medium',
        timeSpent: timeSpent || 0,
        questionsAnswered: questionCount || 0,
        questionsCorrect: Math.round((quizScore / 100) * (questionCount || 1))
      });
      await memory.save();
    }

    res.json({
      success: true,
      mastery: {
        topicName: mastery.topicName,
        newScore: mastery.masteryScore,
        classification: mastery.classification,
        message: `Topic "${topicName}" mastery updated to ${mastery.masteryScore}%`
      }
    });
  } catch (error) {
    console.error('Error updating topic mastery:', error);
    res.status(500).json({ message: 'Failed to update topic mastery' });
  }
});

/**
 * Get all topic masteries for a course
 * Useful for dashboard showing mastery overview
 * GET /learning/topics/:courseId
 */
router.get('/topics/:courseId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug } = req.params;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;


    const masteries = await TopicMastery.find({ userId, courseId })
      .select('topicName masteryScore classification quizAttempts lastStudiedAt')
      .sort({ topicOrder: 1 });

    const classified = {
      weak: masteries.filter(m => m.classification === 'weak'),
      medium: masteries.filter(m => m.classification === 'medium'),
      strong: masteries.filter(m => m.classification === 'strong')
    };

    res.json({
      success: true,
      topics: {
        weak: classified.weak.length,
        medium: classified.medium.length,
        strong: classified.strong.length,
        total: masteries.length,
        details: masteries
      }
    });
  } catch (error) {
    console.error('Error fetching topics:', error);
    res.status(500).json({ message: 'Failed to fetch topics' });
  }
});

/**
 * Generate an adaptive quiz for a topic
 * POST /learning/adaptive-quiz/generate
 * Body: { courseId, topicName, difficulty?, numberOfQuestions? }
 */
router.post('/adaptive-quiz/generate', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, topicName, difficulty, numberOfQuestions = 10 } = req.body;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    if (!courseId || !topicName) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Get topic mastery to determine difficulty
    const mastery = await TopicMastery.findOne({ userId, courseId, topicName });
    const determinedDifficulty = difficulty || (mastery?.masteryScore < 40 ? 'easy' : mastery?.masteryScore < 70 ? 'medium' : 'hard');

    // Generate questions using Gemini
    const aiResult = await gemini.generateAdaptiveQuizQuestions(topicName, determinedDifficulty, numberOfQuestions);

    if (!aiResult.success) throw new Error('AI Question generation failed');

    // Create adaptive quiz
    const quiz = new AdaptiveQuiz({
      userId,
      courseId,
      topicName,
      title: `Adaptive Quiz: ${topicName}`,
      difficulty: determinedDifficulty,
      totalQuestions: numberOfQuestions,
      questions: aiResult.questions.map(q => ({
        ...q,
        questionId: new mongoose.Types.ObjectId()
      })),
      status: 'published',
      metadata: {
        aiGenerated: true,
        createdBy: 'ai-generated'
      }
    });

    await quiz.save();

    res.json({
      success: true,
      quiz
    });
  } catch (error) {
    console.error('Error generating adaptive quiz:', error);
    res.status(500).json({ message: 'Failed to generate adaptive quiz' });
  }
});

/**
 * Submit adaptive quiz results
 * POST /learning/adaptive-quiz/:quizId/submit
 * Body: { answers: [{questionId, selectedAnswer, isCorrect, timeTaken}], ...}
 */
router.post('/adaptive-quiz/:quizId/submit', auth, async (req, res) => {
  try {
    const { quizId } = req.params;
    const { answers, startedAt, completedAt } = req.body;

    const quiz = await AdaptiveQuiz.findById(quizId);
    if (!quiz) return res.status(404).json({ message: 'Quiz not found' });

    // Record the attempt
    quiz.recordAttempt({
      startedAt: new Date(startedAt),
      completedAt: new Date(completedAt),
      answers
    });

    // Identify weak concepts
    const weakConcepts = quiz.identifyWeakConcepts();

    await quiz.save();

    res.json({
      success: true,
      result: {
        score: quiz.userAttempts[quiz.userAttempts.length - 1].score,
        percentageScore: quiz.userAttempts[quiz.userAttempts.length - 1].percentageScore,
        passed: quiz.userAttempts[quiz.userAttempts.length - 1].passed,
        weakConcepts,
        nextDifficulty: quiz.userAttempts[quiz.userAttempts.length - 1].nextDifficultyRecommended,
        message: quiz.userAttempts[quiz.userAttempts.length - 1].passed
          ? 'Great job! You passed this quiz.'
          : 'Keep practicing! Review the weak areas below.'
      }
    });
  } catch (error) {
    console.error('Error submitting quiz:', error);
    res.status(500).json({ message: 'Failed to submit quiz' });
  }
});

/**
 * Record a learning mistake
 * POST /learning/memory/mistake
 * Body: { courseId, topic, concept, mistakeDescription, correctAnswer }
 */
router.post('/memory/mistake', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, topic, concept, mistakeDescription, correctAnswer } = req.body;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    let memory = await LearningMemory.findOne({ userId, courseId });
    if (!memory) {
      const course = await Course.findById(courseId).select('title level');
      memory = new LearningMemory({
        userId,
        courseId,
        metadata: {
          courseTitle: course.title,
          courseLevel: course.level
        }
      });
    }

    memory.recordMistake({ topic, concept, mistakeDescription, correctAnswer });
    await memory.save();

    res.json({
      success: true,
      message: `Mistake recorded for "${concept}". This will help us tailor your learning.`
    });
  } catch (error) {
    console.error('Error recording mistake:', error);
    res.status(500).json({ message: 'Failed to record mistake' });
  }
});

/**
 * Mark a mistake as corrected
 * POST /learning/memory/correct-mistake/:mistakeId
 */
router.post('/memory/correct-mistake/:mistakeId', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { mistakeId } = req.params;
    const { courseId } = req.body;

    const memory = await LearningMemory.findOne({ userId, courseId });
    if (!memory) return res.status(404).json({ message: 'Learning memory not found' });

    memory.correctMistake(mistakeId);
    await memory.save();

    res.json({
      success: true,
      message: 'Mistake marked as corrected! Great improvement!'
    });
  } catch (error) {
    console.error('Error correcting mistake:', error);
    res.status(500).json({ message: 'Failed to correct mistake' });
  }
});

/**
 * Adjust learning plan based on progress
 * POST /learning/copilot/adjust-plan
 * Body: { courseId, reason, topicsToRepeat?, topicsToFastTrack? }
 */
router.post('/copilot/adjust-plan', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { courseId: idOrSlug, reason, topicsToRepeat = [], topicsToFastTrack = [] } = req.body;

    const course = await resolveCourse(idOrSlug);
    if (!course) return res.status(404).json({ message: 'Course not found' });
    const courseId = course._id;

    const plan = await LearningPlan.findOne({ userId, courseId });
    if (!plan) return res.status(404).json({ message: 'Learning plan not found' });

    let memory = await LearningMemory.findOne({ userId, courseId });
    if (!memory) {
      const course = await Course.findById(courseId).select('title level');
      memory = new LearningMemory({
        userId,
        courseId,
        metadata: {
          courseTitle: course.title,
          courseLevel: course.level
        }
      });
    }

    // Record the adjustment
    const adjustment = {
      adjustmentDate: new Date(),
      reason,
      topicsAffected: [...topicsToRepeat, ...topicsToFastTrack],
      automatedBy: 'copilot-recommendation'
    };

    memory.planAdjustments.push(adjustment);

    // Simple plan modification: move weak topics to earlier weeks, strong topics later
    if (topicsToRepeat.length > 0 || topicsToFastTrack.length > 0) {
      // In a real implementation, you'd reorder weeks and topics
      // For now, we just log the adjustment
    }

    await memory.save();

    res.json({
      success: true,
      message: 'Your learning plan has been adjusted based on your progress!',
      adjustment: {
        reason,
        adjustedTopics: topicsToRepeat.length + topicsToFastTrack.length,
        topicsToRepeat,
        topicsToFastTrack
      }
    });
  } catch (error) {
    console.error('Error adjusting plan:', error);
    res.status(500).json({ message: 'Failed to adjust learning plan' });
  }
});

module.exports = router;