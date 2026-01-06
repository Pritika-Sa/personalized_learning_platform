const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Course = require('../models/Course');
const ChatSession = require('../models/Chat');
const { auth } = require('../middleware/auth');
const LearningCopilotService = require('../services/LearningCopilotService');

const copilot = new LearningCopilotService();

// Process chat message
router.post('/chat', auth, async (req, res) => {
  try {
    const { message, sessionId, type = 'text', courseId, copilotMode = false } = req.body;
    const userId = req.user.id;

    if (!message || !sessionId) {
      return res.status(400).json({ error: 'Message and session ID are required' });
    }

    // If copilot mode is enabled and courseId is provided, use Learning Copilot
    if (copilotMode && courseId) {
      try {
        const copilotResponse = await copilot.answerQuestion(userId, courseId, message);

        return res.json({
          success: true,
          message: {
            id: Date.now().toString(),
            text: copilotResponse.response,
            sender: 'copilot',
            timestamp: new Date(),
            type: 'copilot-response',
            data: {
              source: copilotResponse.source,
              courseContext: copilotResponse.courseContext,
              learningContext: copilotResponse.learningContext
            }
          },
          sessionId: sessionId,
          mode: 'learning-copilot'
        });
      } catch (error) {
        console.warn('Copilot error, falling back to standard chat:', error.message);
        // Fall through to standard chat if copilot fails
      }
    }

    // Standard chat flow (unchanged for backward compatibility)
    // Find or create chat session
    let chatSession = await ChatSession.findOne({ userId, sessionId, isActive: true });

    if (!chatSession) {
      chatSession = new ChatSession({
        userId,
        sessionId,
        messages: []
      });
    }

    // Add user message
    const userMessage = {
      id: Date.now().toString(),
      text: message,
      sender: 'user',
      timestamp: new Date(),
      type: 'text'
    };

    chatSession.messages.push(userMessage);

    // Process message and generate bot response
    const botResponse = await processUserMessage(message, userId, type);

    // Add bot response
    const botMessage = {
      id: (Date.now() + 1).toString(),
      text: botResponse.text,
      sender: 'bot',
      timestamp: new Date(),
      type: botResponse.type || 'text',
      data: botResponse.data || null
    };

    chatSession.messages.push(botMessage);
    chatSession.lastActivity = new Date();

    await chatSession.save();

    res.json({
      success: true,
      message: botMessage,
      sessionId: chatSession.sessionId,
      mode: 'standard-chat'
    });

  } catch (error) {
    console.error('Chat processing error:', error);
    res.status(500).json({ error: 'Failed to process chat message' });
  }
});

// Get chat history
router.get('/chat/history/:sessionId', auth, async (req, res) => {
  try {
    const { sessionId } = req.params;
    const userId = req.user.id;

    const chatSession = await ChatSession.findOne({
      userId,
      sessionId,
      isActive: true
    });

    if (!chatSession) {
      return res.json({ messages: [] });
    }

    res.json({
      success: true,
      messages: chatSession.messages,
      sessionId: chatSession.sessionId
    });

  } catch (error) {
    console.error('Chat history error:', error);
    res.status(500).json({ error: 'Failed to retrieve chat history' });
  }
});

// Get course recommendations
router.post('/chat/recommendations', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { preferences, context } = req.body;

    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get user's skills and interests
    const userSkills = user.skills || [];
    const userInterests = user.interests || [];
    const completedCourses = user.completedCourses || [];

    // Find matching courses
    const courses = await Course.find({
      isPublished: true,
      _id: { $nin: completedCourses }
    }).limit(10);

    // Score and rank courses based on user profile
    const scoredCourses = courses.map(course => {
      let score = 0;

      // Skill matching
      const courseSkills = course.tags || course.skills || [];
      const skillMatches = courseSkills.filter(skill =>
        userSkills.some(userSkill =>
          userSkill.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(userSkill.toLowerCase())
        )
      );
      score += skillMatches.length * 3;

      // Interest matching
      const interestMatches = courseSkills.filter(skill =>
        userInterests.some(interest =>
          interest.toLowerCase().includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(interest.toLowerCase())
        )
      );
      score += interestMatches.length * 2;

      // Popularity boost
      score += Math.min((course.students || 0) / 1000, 2);

      // Rating boost
      if (course.rating && course.rating.average) {
        score += (course.rating.average - 3) * 0.5;
      }

      return {
        ...course.toObject(),
        recommendationScore: score,
        matchReasons: [
          ...skillMatches.map(skill => `Matches your ${skill} skills`),
          ...interestMatches.map(interest => `Aligns with your interest in ${interest}`)
        ]
      };
    });

    // Sort by score and return top recommendations
    const recommendations = scoredCourses
      .sort((a, b) => b.recommendationScore - a.recommendationScore)
      .slice(0, 5);

    res.json({
      success: true,
      recommendations,
      userProfile: {
        skills: userSkills,
        interests: userInterests,
        completedCourses: completedCourses.length
      }
    });

  } catch (error) {
    console.error('Recommendation error:', error);
    res.status(500).json({ error: 'Failed to generate recommendations' });
  }
});

// Generate study schedule
router.post('/chat/study-schedule', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { courseIds, availableHours, preferences } = req.body;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get enrolled courses
    const enrolledCourses = await Course.find({
      _id: { $in: user.enrolledCourses || [] }
    });

    // Generate personalized schedule
    const schedule = generateStudySchedule({
      courses: enrolledCourses,
      availableHours: availableHours || 10,
      userPreferences: preferences || {},
      userLevel: user.level || 'beginner'
    });

    res.json({
      success: true,
      schedule,
      totalHours: schedule.reduce((sum, day) => sum + (day.totalHours || 0), 0),
      coursesIncluded: enrolledCourses.length
    });

  } catch (error) {
    console.error('Schedule generation error:', error);
    res.status(500).json({ error: 'Failed to generate study schedule' });
  }
});

// Get user progress
router.get('/chat/progress', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).populate('enrolledCourses completedCourses');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Calculate progress statistics
    const enrolledCount = user.enrolledCourses?.length || 0;
    const completedCount = user.completedCourses?.length || 0;
    const totalStudyTime = user.totalStudyTime || 0;
    const certificatesEarned = user.certificates?.length || 0;

    // Get recent activity (placeholder - implement based on your activity tracking)
    const recentActivity = {
      weeklyHours: Math.floor(totalStudyTime * 0.2), // Rough estimate
      sessionsThisWeek: Math.floor(Math.random() * 10) + 1,
      lessonsCompleted: Math.floor(Math.random() * 20) + 5
    };

    const progress = {
      overview: {
        enrolledCourses: enrolledCount,
        completedCourses: completedCount,
        totalStudyTime: totalStudyTime,
        certificatesEarned
      },
      thisWeek: recentActivity,
      achievements: user.achievements || [],
      nextGoals: generateNextGoals(user),
      completionRate: enrolledCount > 0 ? Math.round((completedCount / enrolledCount) * 100) : 0
    };

    res.json({
      success: true,
      progress,
      user: {
        name: user.firstName || user.username,
        level: user.level || 'beginner',
        joinDate: user.createdAt
      }
    });

  } catch (error) {
    console.error('Progress retrieval error:', error);
    res.status(500).json({ error: 'Failed to retrieve progress' });
  }
});

// Helper function to process user messages using Gemini AI
async function processUserMessage(message, userId, type) {
  const lowerMessage = message.toLowerCase();

  try {
    // Initialize Gemini AI service
    let geminiService;
    try {
      const GeminiAIService = require('../services/geminiAI');
      geminiService = new GeminiAIService();
    } catch (error) {
      console.warn('⚠️  Gemini AI not available, using fallback responses:', error.message);
      return getFallbackResponse(message, userId);
    }

    // Get user context for personalized responses
    const user = await User.findById(userId);
    const userContext = user ? {
      name: user.firstName || user.username,
      skills: user.skills || [],
      interests: user.interests || [],
      completedCourses: user.completedCourses || [],
      enrolledCourses: user.enrolledCourses || [],
      level: user.level || 'beginner'
    } : null;

    // Course recommendation requests
    if (lowerMessage.includes('recommend') || lowerMessage.includes('suggest') || lowerMessage.includes('course')) {
      if (!user) {
        return { text: "Please sign in to get personalized recommendations!" };
      }

      const courses = await Course.find({ isPublished: true }).limit(10);

      if (courses.length === 0) {
        return { text: "I'd love to recommend courses, but none are available right now. Please check back later!" };
      }

      // Use Gemini AI for intelligent course recommendations
      const geminiResponse = await geminiService.getCourseRecommendations(userContext, courses, message);

      if (geminiResponse.success) {
        return {
          text: geminiResponse.recommendations,
          type: 'course-recommendation',
          data: { courses: courses.slice(0, 5).map(c => c.toObject()) }
        };
      } else {
        // Fallback to basic recommendations
        return getFallbackCourseRecommendations(courses, userContext);
      }
    }

    // For general chat messages, use Gemini AI for intelligent responses
    const geminiResponse = await geminiService.generateChatResponse(message, userContext);

    if (geminiResponse.success) {
      return {
        text: geminiResponse.response,
        type: 'ai-chat'
      };
    } else {
      // Fallback to rule-based responses
      return getFallbackResponse(message, userId);
    }

  } catch (error) {
    console.error('Message processing error:', error);
    return getFallbackResponse(message, userId);
  }
}

// Fallback function for when Gemini AI is not available
async function getFallbackResponse(message, userId) {
  const lowerMessage = message.toLowerCase();

  try {
    // Study schedule requests
    if (lowerMessage.includes('schedule') || lowerMessage.includes('plan') || lowerMessage.includes('time')) {
      return {
        text: `Here's a personalized study plan:\n\n📅 **Weekly Study Schedule:**\n\n**Monday-Wednesday-Friday:**\n• 1 hour of video content\n• 30 minutes of practice\n\n**Tuesday-Thursday:**\n• 45 minutes of review\n• 15 minutes of assessment\n\n**Weekend:**\n• 2 hours of project work\n• Community discussion\n\n💡 **Tips:**\n• Study consistently at the same time\n• Take breaks every 45 minutes\n• Review previous lessons weekly`,
        type: 'study-plan'
      };
    }

    // Progress requests
    if (lowerMessage.includes('progress') || lowerMessage.includes('status') || lowerMessage.includes('achievement')) {
      const user = await User.findById(userId);
      if (!user) {
        return { text: "Please sign in to view your progress!" };
      }

      return {
        text: `📊 **Your Learning Progress:**\n\n🎯 **Current Status:**\n• Courses enrolled: ${user.enrolledCourses?.length || 0}\n• Courses completed: ${user.completedCourses?.length || 0}\n• Total study time: ${user.totalStudyTime || 0} hours\n• Certificates earned: ${user.certificates?.length || 0}\n\n🏆 **Recent Achievements:**\n• Active Learner Badge\n• First Course Enrollment\n\n🎯 **Next Goals:**\n• Complete your current course\n• Earn your first certificate\n• Reach 10 hours of study time`,
        type: 'progress-report'
      };
    }

    // Greeting responses
    if (lowerMessage.includes('hello') || lowerMessage.includes('hi') || lowerMessage.includes('hey')) {
      const user = await User.findById(userId);
      const userName = user ? (user.firstName || user.username) : 'there';

      return {
        text: `Hello ${userName}! 👋 I'm your AI learning assistant. I can help you discover courses, create study plans, and track your progress. What would you like to explore today?`
      };
    }

    // Help requests
    if (lowerMessage.includes('help') || lowerMessage.includes('what can you do')) {
      return {
        text: `I'm here to make your learning journey smoother! Here's what I can help with:\n\n📚 **Course Discovery** - Find perfect courses based on your interests\n⏰ **Study Planning** - Create personalized study schedules\n📈 **Progress Tracking** - Monitor your learning achievements\n🎯 **Learning Guidance** - Answer questions about courses\n💡 **Study Tips** - Provide learning strategies\n\nJust ask me anything or use the quick action buttons!`
      };
    }

    // Default response with helpful suggestions
    return {
      text: `I understand you're asking about "${message}". I'm your AI learning assistant and I can help with:\n\n• **Course recommendations** - Just say "recommend courses"\n• **Study planning** - Ask for a "study schedule"\n• **Progress tracking** - Say "show my progress"\n• **Learning guidance** - Ask any learning-related questions\n\nWhat would you like to explore? 🚀`
    };

  } catch (error) {
    console.error('Fallback response error:', error);
    return {
      text: "I'm here to help with your learning journey! Try asking about courses, study plans, or your progress."
    };
  }
}

// Fallback course recommendations
function getFallbackCourseRecommendations(courses, userContext) {
  const recommendationText = `Based on your profile, here are my top recommendations:\n\n${courses.slice(0, 3).map((course, index) =>
    `${index + 1}. **${course.title}**\n   • Level: ${course.level}\n   • Duration: ${course.duration || 'N/A'}\n   • Price: ${course.price === 0 ? 'Free' : `₹${course.price}`}\n   • Students: ${course.students || 0}\n`
  ).join('\n')}`;

  return {
    text: recommendationText,
    type: 'course-recommendation',
    data: { courses: courses.slice(0, 3).map(c => c.toObject()) }
  };
}

// Helper function to generate study schedule
function generateStudySchedule({ courses, availableHours, userPreferences, userLevel }) {
  const dailyHours = availableHours / 7;
  const schedule = [];

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  days.forEach((day, index) => {
    const isWeekend = index >= 5;
    const dayHours = isWeekend ? dailyHours * 1.5 : dailyHours * 0.8;

    schedule.push({
      day,
      totalHours: Math.round(dayHours * 10) / 10,
      activities: [
        {
          time: isWeekend ? '10:00 AM' : '7:00 PM',
          activity: 'Video Content',
          duration: Math.round(dayHours * 0.6 * 10) / 10,
          type: 'learning'
        },
        {
          time: isWeekend ? '11:30 AM' : '8:00 PM',
          activity: 'Practice & Exercises',
          duration: Math.round(dayHours * 0.4 * 10) / 10,
          type: 'practice'
        }
      ]
    });
  });

  return schedule;
}

// Helper function to generate next goals
function generateNextGoals(user) {
  const goals = [];

  if (!user.completedCourses || user.completedCourses.length === 0) {
    goals.push("Complete your first course");
  }

  if (!user.certificates || user.certificates.length === 0) {
    goals.push("Earn your first certificate");
  }

  if (!user.totalStudyTime || user.totalStudyTime < 10) {
    goals.push("Reach 10 hours of total study time");
  }

  if (goals.length === 0) {
    goals.push("Enroll in a new advanced course", "Join a peer learning session", "Complete a project-based assessment");
  }

  return goals.slice(0, 3);
}

module.exports = router;