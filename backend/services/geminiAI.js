const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

class GeminiAIService {
  constructor() {
    this.isGeminiAvailable = false;

    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not found in environment variables. Using fallback responses.');
      return;
    }

    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      // Use the correct model name for the latest API
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Gemini AI service initialized (will test on first use)');
    } catch (error) {
      console.warn('⚠️  Gemini AI initialization failed:', error.message);
      console.log('📝 Using intelligent fallback responses instead');
    }
  }

  /**
   * Test if Gemini AI is available and working
   */
  async testGeminiAvailability() {
    if (!this.model) {
      return false;
    }

    try {
      const result = await this.model.generateContent("Test");
      await result.response;
      this.isGeminiAvailable = true;
      return true;
    } catch (error) {
      console.warn('⚠️  Gemini AI not available:', error.message);
      this.isGeminiAvailable = false;
      return false;
    }
  }

  /**
   * Get course recommendations from Gemini AI based on user profile and available courses
   * @param {Object} userProfile - User's profile data including skills, interests, completed courses
   * @param {Array} availableCourses - All available courses in the system
   * @param {string} userQuery - User's specific request or query
   * @returns {Object} Gemini AI response with course recommendations
   */
  async getCourseRecommendations(userProfile, availableCourses, userQuery = '') {
    try {
      console.log('🤖 Processing course recommendation request...');

      // Test Gemini availability if not already tested
      if (!this.isGeminiAvailable && this.model) {
        console.log('🔍 Testing Gemini AI availability...');
        await this.testGeminiAvailability();
      }

      // If Gemini is available, use it
      if (this.isGeminiAvailable && this.model) {
        console.log('🤖 Using Gemini AI for recommendations...');

        // Prepare user context
        const userContext = this.formatUserContext(userProfile);

        // Prepare course data
        const courseData = this.formatCourseData(availableCourses);

        // Create comprehensive prompt
        const prompt = this.buildRecommendationPrompt(userContext, courseData, userQuery);

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Gemini AI responded successfully');

        return {
          success: true,
          recommendations: text,
          timestamp: new Date().toISOString(),
          source: 'gemini-ai'
        };
      } else {
        console.log('💡 Using intelligent fallback recommendations...');
        return {
          success: true,
          recommendations: this.getIntelligentRecommendations(userProfile, availableCourses, userQuery),
          timestamp: new Date().toISOString(),
          source: 'intelligent-fallback'
        };
      }
    } catch (error) {
      console.error('❌ Recommendation Error:', error.message);

      return {
        success: true,
        recommendations: this.getIntelligentRecommendations(userProfile, availableCourses, userQuery),
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: 'Using intelligent fallback due to API issues'
      };
    }
  }

  /**
   * Format user profile data for Gemini AI
   */
  formatUserContext(userProfile) {
    return {
      name: `${userProfile.firstName} ${userProfile.lastName}`,
      skills: userProfile.skills || [],
      interests: userProfile.interests || '',
      careerObjective: userProfile.careerObjective || '',
      completedCourses: userProfile.completedCourses || [],
      currentLevel: userProfile.level || 1,
      xp: userProfile.xp || 0,
      role: userProfile.role || 'student',
      location: userProfile.location || '',
      bio: userProfile.bio || ''
    };
  }

  /**
   * Format course data for Gemini AI
   */
  formatCourseData(courses) {
    return courses.map(course => ({
      id: course._id,
      title: course.title,
      description: course.description,
      category: course.category,
      level: course.level,
      duration: course.duration,
      price: course.price,
      tags: course.tags || [],
      skills: course.skills || [],
      prerequisites: course.prerequisites || [],
      learningOutcomes: course.learningOutcomes || [],
      rating: course.rating || 0,
      enrolledCount: course.enrolledStudents?.length || 0,
      videos: course.videos?.length || 0
    }));
  }

  /**
   * Build comprehensive prompt for Gemini AI
   */
  buildRecommendationPrompt(userContext, courseData, userQuery) {
    return `
You are an intelligent AI course recommendation assistant for a learning platform. Your role is to provide personalized course recommendations based on user profiles, learning goals, and available courses.

## USER PROFILE:
- Name: ${userContext.name}
- Current Skills: ${userContext.skills.join(', ') || 'None specified'}
- Interests: ${userContext.interests || 'Not specified'}
- Career Objective: ${userContext.careerObjective || 'Not specified'}
- Completed Courses: ${userContext.completedCourses.join(', ') || 'None'}
- Current Level: ${userContext.currentLevel}
- Experience Points: ${userContext.xp}
- Location: ${userContext.location || 'Not specified'}
- Bio: ${userContext.bio || 'Not specified'}

## AVAILABLE COURSES:
${JSON.stringify(courseData, null, 2)}

## USER QUERY:
"${userQuery || 'Please recommend courses for me based on my profile'}"

## INSTRUCTIONS:
1. Analyze the user's profile, skills, interests, and career objectives
2. Consider their completed courses to avoid redundancy and suggest progressive learning paths
3. Match courses based on:
   - User's current skill level and experience
   - Career objectives and interests
   - Learning progression (beginner → intermediate → advanced)
   - Skill gaps that need to be filled
   - Industry trends and demands

4. Provide recommendations in this format:
   - **Top 3-5 Recommended Courses** with clear reasoning
   - **Learning Path Suggestion** (sequence of courses)
   - **Skill Development Plan** based on their goals
   - **Personalized Tips** for their learning journey

5. For each recommended course, include:
   - Course title and brief description
   - Why it's perfect for this user
   - How it aligns with their goals
   - Prerequisites (if any)
   - Expected learning outcomes
   - Estimated time commitment

6. Be conversational, encouraging, and personalized
7. Consider the user's specific query context
8. If the user has no skills or completed courses, recommend beginner-friendly courses
9. If they're advanced, suggest specialized or cutting-edge topics
10. Always provide actionable next steps

Remember: You're a learning mentor, not just a course catalog. Provide guidance, motivation, and clear learning paths!
`;
  }

  /**
   * Generate general chatbot response using Gemini AI
   */
  async generateChatResponse(userMessage, userContext = null, conversationHistory = []) {
    try {
      console.log('🤖 Generating chat response...');

      // Test Gemini availability if not already tested
      if (!this.isGeminiAvailable && this.model) {
        await this.testGeminiAvailability();
      }

      // If Gemini is available, use it
      if (this.isGeminiAvailable && this.model) {
        console.log('🤖 Using Gemini AI for chat response...');

        const prompt = this.buildChatPrompt(userMessage, userContext, conversationHistory);

        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        console.log('✅ Gemini chat response generated successfully');

        return {
          success: true,
          response: text,
          timestamp: new Date().toISOString(),
          source: 'gemini-ai'
        };
      } else {
        console.log('💡 Using intelligent fallback chat response...');
        return {
          success: true,
          response: this.getIntelligentChatResponse(userMessage, userContext),
          timestamp: new Date().toISOString(),
          source: 'intelligent-fallback'
        };
      }
    } catch (error) {
      console.error('❌ Chat Response Error:', error.message);

      return {
        success: true,
        response: this.getIntelligentChatResponse(userMessage, userContext),
        timestamp: new Date().toISOString(),
        source: 'fallback',
        note: 'Using intelligent fallback due to API issues'
      };
    }
  }

  /**
   * Build chat prompt for general conversations
   */
  buildChatPrompt(userMessage, userContext, conversationHistory) {
    const contextInfo = userContext ? `
USER CONTEXT:
- Name: ${userContext.firstName} ${userContext.lastName}
- Skills: ${userContext.skills?.join(', ') || 'None'}
- Interests: ${userContext.interests || 'Not specified'}
- Career Goal: ${userContext.careerObjective || 'Not specified'}
- Level: ${userContext.level || 1} (XP: ${userContext.xp || 0})
` : '';

    const historyInfo = conversationHistory.length > 0 ? `
CONVERSATION HISTORY:
${conversationHistory.slice(-5).map(msg => `${msg.role}: ${msg.content}`).join('\n')}
` : '';

    return `
You are an intelligent AI learning assistant for an online course platform. You help users with course recommendations, learning guidance, study tips, and general educational support.

${contextInfo}

${historyInfo}

USER MESSAGE: "${userMessage}"

INSTRUCTIONS:
1. Be helpful, friendly, and encouraging
2. Provide personalized responses based on the user's context
3. If asked about courses, provide specific recommendations
4. If asked about learning tips, give practical advice
5. If asked about career guidance, align with their objectives
6. Use emojis and formatting to make responses engaging
7. Be conversational but professional
8. Always try to guide users toward their learning goals
9. If you don't have specific information, be honest but helpful
10. Encourage continuous learning and skill development

Respond naturally and helpfully to the user's message!
`;
  }

  /**
   * Analyze user learning progress and provide insights
   */
  async analyzeUserProgress(userProfile, completedCourses, currentCourses) {
    try {
      const prompt = `
Analyze this user's learning progress and provide insights:

USER PROFILE:
- Name: ${userProfile.firstName} ${userProfile.lastName}
- Skills: ${userProfile.skills?.join(', ') || 'None'}
- Interests: ${userProfile.interests || 'Not specified'}
- Career Goal: ${userProfile.careerObjective || 'Not specified'}
- Current Level: ${userProfile.level || 1}
- Experience Points: ${userProfile.xp || 0}

COMPLETED COURSES: ${completedCourses.length > 0 ? completedCourses.map(c => c.title).join(', ') : 'None'}
CURRENT COURSES: ${currentCourses.length > 0 ? currentCourses.map(c => c.title).join(', ') : 'None'}

Provide a comprehensive learning progress analysis including:
1. **Learning Journey Summary** - what they've accomplished
2. **Skill Development Progress** - how their skills are growing
3. **Strengths and Areas for Improvement**
4. **Next Learning Steps** - specific recommendations
5. **Career Alignment** - how their learning aligns with goals
6. **Motivation and Encouragement** - celebrating their progress

Be encouraging, specific, and actionable!
`;

      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text();

      return {
        success: true,
        analysis: text,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Progress Analysis Error:', error);
      return {
        success: false,
        error: 'Failed to analyze progress',
        message: error.message,
        analysis: this.getFallbackProgressAnalysis(userProfile, completedCourses, currentCourses)
      };
    }
  }

  /**
   * Generate a week-by-week personalized learning plan for a selected core course.
   * This method keeps prompts concise and privacy-safe (no raw PII is sent).
   * @param {Object} userContext - minimal user context (level, time availability, goals)
   * @param {Object} course - course document or summary
   * @param {Object} options - { weeks, hoursPerWeek }
   */
  async generateLearningPlan(userContext, course, options = {}) {
    try {
      const weeks = options.weeks || 8;
      const hoursPerWeek = options.hoursPerWeek || 5;

      // Build a task-focused, privacy-safe prompt
      const prompt = `Create a ${weeks}-week structured learning plan for the course titled "${course.title}".\n` +
        `User level: ${userContext.level || 'beginner'}. Weekly time: ${hoursPerWeek} hours. Learning goals: ${userContext.goals || 'general understanding'}.\n` +
        `Return a JSON array of weeks where each week contains: weekNumber, topics (array), hoursPerWeek, tasks (short list). Keep responses short and actionable.`;

      if (this.isGeminiAvailable && this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Expecting JSON-like output; attempt parse, fallback to simple heuristics
        try {
          const parsed = JSON.parse(text);
          return { success: true, plan: parsed, source: 'gemini-ai' };
        } catch (err) {
          // Fallback: split text heuristically into weeks
          const lines = text.split('\n').slice(0, weeks * 5);
          const plan = [];
          for (let i = 1; i <= weeks; i++) plan.push({ weekNumber: i, topics: [`Week ${i} overview`], hoursPerWeek, tasks: ['Study videos', 'Complete exercises'] });
          return { success: true, plan, source: 'gemini-ai-text-fallback' };
        }
      }

      // Local fallback plan generator (deterministic)
      const plan = [];
      for (let i = 1; i <= weeks; i++) {
        plan.push({
          weekNumber: i,
          topics: [`Core concept ${i}`, ...(course.topics ? [course.topics[i - 1] || `Topic ${i}`] : [])],
          hoursPerWeek,
          tasks: ['Watch core videos', 'Read notes', 'Do practice problems']
        });
      }

      return { success: true, plan, source: 'fallback' };
    } catch (error) {
      console.error('Error generating learning plan:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate an adaptive quiz for a specific topic and difficulty
   * @param {string} topicName 
   * @param {string} difficulty - easy, medium, hard
   * @param {number} count - number of questions
   * @returns {Promise<Object>}
   */
  async generateAdaptiveQuizQuestions(topicName, difficulty = 'medium', count = 10) {
    try {
      const prompt = `Generate a JSON array of ${count} ${difficulty}-level multiple-choice questions for the topic "${topicName}".
Each question should have:
- questionText
- options (array of 4 strings)
- correctAnswerIndex (0-3)
- explanation
- difficulty (must be "${difficulty}")
- concepts (array of related concepts tested)

Return ONLY the JSON array.`;

      if (this.isGeminiAvailable && this.model) {
        const result = await this.model.generateContent(prompt);
        const text = result.response.text();

        // Clean the response from markdown if needed
        const cleanJson = text.replace(/```json\n?|\n?```/g, '').trim();
        const questions = JSON.parse(cleanJson);

        return { success: true, questions };
      }

      // Fallback questions
      return {
        success: true,
        questions: Array.from({ length: count }).map((_, i) => ({
          questionText: `Sample ${difficulty} question about ${topicName} #${i + 1}`,
          options: ["Option A", "Option B", "Option C", "Option D"],
          correctAnswerIndex: 0,
          explanation: "This is a fallback question.",
          difficulty,
          concepts: [topicName]
        }))
      };
    } catch (error) {
      console.error('Error generating quiz questions:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Generate a copilot-style chat reply aware of course context and user progress.
   * The method avoids sending PII or raw course content; instead it sends short contextual cues.
   */
  async generateCopilotReply(userMessage, userContext = {}, courseContext = {}, options = {}) {
    try {
      let prompt = "";
      if (options.systemPrompt) {
        prompt = `${options.systemPrompt}\n\nUser Question: ${userMessage}`;
      } else {
        const contextSnippet = `Course: ${courseContext.title || 'unknown'}; Current week: ${options.currentWeek || 1}; Current topic: ${options.currentTopic || 'N/A'}.`;
        prompt = `You are a Learning Copilot. Use the following concise context (NO raw PII, NO large content dumps): ${contextSnippet}\nUser level: ${userContext.level || 'unknown'}; Goals: ${userContext.goals || 'N/A'}.\nUser question: ${userMessage}\nRespond step-by-step, provide next-study actions, and if relevant, propose a short quiz item. Keep the response focused on pedagogy and actionable guidance.`;
      }

      if (this.isGeminiAvailable && this.model) {
        const result = await this.model.generateContent(prompt);
        const response = await result.response;
        return { success: true, response: response.text(), source: 'gemini-ai' };
      }

      // Fallback reply
      return { success: true, response: `I recommend you review the key concept for ${courseContext.title || 'this course'}. Try: 1) Rewatch the short lecture on ${progressState.currentTopic || 'the current topic'}. 2) Attempt a practice problem. Ask me for a quiz when ready.`, source: 'fallback' };
    } catch (error) {
      console.error('Copilot reply error:', error);
      return { success: false, error: error.message };
    }
  }

  /**
   * Intelligent course recommendations using rule-based logic
   */
  getIntelligentRecommendations(userProfile, availableCourses, userQuery) {
    const skills = userProfile.skills || [];
    const interests = userProfile.interests || '';
    const completedCourses = userProfile.completedCourses || [];
    const userLevel = userProfile.level || 'beginner';

    // Score courses based on user profile
    const scoredCourses = availableCourses.map(course => {
      let score = 0;
      let reasons = [];

      // Skill matching
      if (course.skills) {
        const skillMatches = course.skills.filter(skill =>
          skills.some(userSkill => userSkill.toLowerCase().includes(skill.toLowerCase()))
        );
        score += skillMatches.length * 3;
        if (skillMatches.length > 0) {
          reasons.push(`Matches your ${skillMatches.join(', ')} skills`);
        }
      }

      // Level appropriateness
      if (course.level === userLevel) {
        score += 2;
        reasons.push(`Perfect for your ${userLevel} level`);
      }

      // Interest matching
      if (interests && course.description) {
        const interestKeywords = interests.toLowerCase().split(/[,\s]+/);
        const descMatches = interestKeywords.filter(keyword =>
          course.description.toLowerCase().includes(keyword)
        );
        score += descMatches.length;
        if (descMatches.length > 0) {
          reasons.push(`Aligns with your interests`);
        }
      }

      // Avoid completed courses
      if (completedCourses.includes(course._id.toString())) {
        score -= 10;
      }

      // Popularity boost
      score += Math.min((course.students || 0) / 100, 1);

      return { ...course, score, reasons };
    });

    // Sort by score and get top recommendations
    const topCourses = scoredCourses
      .filter(course => course.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5);

    // Generate intelligent response
    let response = `# 🎯 Personalized Course Recommendations\n\n`;
    response += `Hello ${userProfile.name || 'there'}! Based on your profile and interests, here are my top recommendations:\n\n`;

    if (topCourses.length === 0) {
      response += "I'd love to help you find the perfect courses! Since you're just getting started, here are some excellent beginner-friendly options:\n\n";
      const beginnerCourses = availableCourses.filter(c => c.level === 'beginner').slice(0, 3);
      beginnerCourses.forEach((course, index) => {
        response += `**${index + 1}. ${course.title}**\n`;
        response += `   • Perfect for beginners\n`;
        response += `   • Duration: ${course.duration || 'Self-paced'}\n`;
        response += `   • ${course.price === 0 ? 'Free!' : `₹${course.price}`}\n\n`;
      });
    } else {
      topCourses.forEach((course, index) => {
        response += `**${index + 1}. ${course.title}**\n`;
        response += `   • ${course.reasons.join(' • ')}\n`;
        response += `   • Level: ${course.level}\n`;
        response += `   • Duration: ${course.duration || 'Self-paced'}\n`;
        response += `   • ${course.price === 0 ? 'Free!' : `₹${course.price}`}\n`;
        response += `   • ${course.students || 0} students enrolled\n\n`;
      });
    }

    // Add personalized learning tips
    response += `## 💡 Personalized Learning Tips:\n\n`;
    if (userLevel === 'beginner') {
      response += `• Start with fundamentals and practice regularly\n`;
      response += `• Set aside 30-60 minutes daily for consistent learning\n`;
      response += `• Don't rush - understanding concepts is more important than speed\n`;
    } else if (userLevel === 'intermediate') {
      response += `• Focus on building real projects to apply your skills\n`;
      response += `• Challenge yourself with more complex problems\n`;
      response += `• Consider specializing in areas that interest you most\n`;
    } else {
      response += `• Share your knowledge by teaching or mentoring others\n`;
      response += `• Stay updated with the latest industry trends\n`;
      response += `• Consider contributing to open-source projects\n`;
    }

    response += `\n🚀 Ready to start your learning journey? Choose a course that excites you most!`;

    return response;
  }

  /**
   * Intelligent chat response using rule-based logic
   */
  getIntelligentChatResponse(userMessage, userContext) {
    const lowerMessage = userMessage.toLowerCase();
    const userName = userContext?.name || 'there';

    // Greeting responses
    if (lowerMessage.match(/\b(hello|hi|hey|greetings)\b/)) {
      const greetings = [
        `Hello ${userName}! 👋 I'm your AI learning assistant. I'm here to help you discover amazing courses and create personalized learning paths.`,
        `Hi ${userName}! 🌟 Ready to explore new skills today? I can recommend courses, create study plans, and track your progress.`,
        `Hey ${userName}! 🚀 What would you like to learn today? I'm here to guide your learning journey!`
      ];
      return greetings[Math.floor(Math.random() * greetings.length)] +
        `\n\n💡 Try asking me:\n• "Recommend programming courses"\n• "Create a study plan"\n• "Show my progress"`;
    }

    // Learning guidance
    if (lowerMessage.match(/\b(learn|study|how to)\b/)) {
      return `🎯 Great question! Learning is a journey, and I'm here to guide you.\n\n` +
        `**Here's how I can help:**\n` +
        `📚 **Course Discovery** - Find courses matching your interests\n` +
        `⏰ **Study Planning** - Create personalized schedules\n` +
        `📈 **Progress Tracking** - Monitor your achievements\n` +
        `💡 **Learning Tips** - Get strategies for effective learning\n\n` +
        `What specific area would you like to explore? Just tell me your interests!`;
    }

    // Motivation and encouragement
    if (lowerMessage.match(/\b(difficult|hard|stuck|frustrated|give up)\b/)) {
      const motivationalResponses = [
        `I understand learning can be challenging sometimes. Remember, every expert was once a beginner! 💪`,
        `Don't give up! Difficulties are just opportunities to grow stronger. You've got this! 🌟`,
        `It's normal to feel stuck sometimes. Take a break, then come back with fresh eyes. Progress takes time! 🚀`
      ];
      return motivationalResponses[Math.floor(Math.random() * motivationalResponses.length)] +
        `\n\n**Here's what you can do:**\n` +
        `• Break down complex topics into smaller chunks\n` +
        `• Practice regularly, even if just for 15 minutes\n` +
        `• Don't hesitate to ask questions or seek help\n` +
        `• Remember why you started this learning journey\n\n` +
        `Would you like me to suggest some beginner-friendly courses or study techniques?`;
    }

    // Career guidance
    if (lowerMessage.match(/\b(career|job|work|professional)\b/)) {
      return `🎯 Thinking about your career? That's smart planning!\n\n` +
        `**I can help you:**\n` +
        `🔄 **Skill Gap Analysis** - Identify what skills you need\n` +
        `🎯 **Career Path Planning** - Map out your learning journey\n` +
        `📈 **Industry Trends** - Learn about in-demand skills\n` +
        `💼 **Practical Projects** - Build a portfolio that stands out\n\n` +
        `What field or role are you interested in? I can recommend specific courses to get you there!`;
    }

    // Default intelligent response
    return `Thanks for your message! I'm your AI learning assistant, and I'm here to help you grow your skills.\n\n` +
      `🤔 **I noticed you asked about:** "${userMessage}"\n\n` +
      `While I'm continuously learning to understand all questions, I'm especially good at:\n` +
      `📚 **Course Recommendations** - "Show me programming courses"\n` +
      `⏰ **Study Planning** - "Create a study schedule"\n` +
      `📊 **Progress Tracking** - "How am I doing?"\n` +
      `💡 **Learning Guidance** - Ask me anything about learning!\n\n` +
      `What would you like to explore today? 🚀`;
  }

  /**
   * Fallback course recommendations when Gemini API fails
   */
  getFallbackRecommendations(userProfile, availableCourses, userQuery) {
    const skills = userProfile.skills || [];
    const interests = userProfile.interests || '';
    const completedCourses = userProfile.completedCourses || [];

    // Basic recommendation logic
    let recommendations = `# 🎯 Course Recommendations for ${userProfile.firstName}\n\n`;

    // Filter and sort available courses
    let recommendedCourses = [];

    if (skills.length === 0) {
      // For beginners, recommend beginner-level courses
      recommendedCourses = availableCourses.filter(course =>
        course.level === 'Beginner' ||
        course.title.toLowerCase().includes('basic') ||
        course.title.toLowerCase().includes('introduction') ||
        course.title.toLowerCase().includes('fundamentals')
      ).slice(0, 4);

      recommendations += `## 🚀 Getting Started Recommendations\n\n`;
      recommendations += `Since you're just starting out, here are some foundational courses I recommend:\n\n`;

    } else {
      // For users with skills, recommend based on their skills and interests
      recommendedCourses = availableCourses.filter(course => {
        const courseText = `${course.title} ${course.description || ''} ${course.category || ''}`.toLowerCase();

        // Match based on user skills
        const skillMatch = skills.some(skill =>
          courseText.includes(skill.toLowerCase()) ||
          skill.toLowerCase().includes(courseText.split(' ')[0])
        );

        // Match based on interests
        const interestMatch = interests && courseText.includes(interests.toLowerCase());

        return skillMatch || interestMatch;
      }).slice(0, 4);

      // If no matches based on skills/interests, get some popular courses
      if (recommendedCourses.length === 0) {
        recommendedCourses = availableCourses.slice(0, 4);
      }

      recommendations += `## 📈 Next Level Recommendations\n\n`;
      recommendations += `Based on your current skills (${skills.join(', ')}), here's what I suggest:\n\n`;
    }

    // Add actual course recommendations
    if (recommendedCourses.length > 0) {
      recommendedCourses.forEach((course, index) => {
        const icons = ['🎯', '🚀', '💡', '⭐', '🔥', '💪'];
        const icon = icons[index] || '📚';
        const level = course.level || 'All Levels';
        const duration = course.duration || 'Self-paced';
        const price = course.price === 0 ? '🆓 Free' : `💰 ₹${course.price}`;
        const rating = course.rating ? `⭐ ${course.rating}/5` : '⭐ New';
        const enrolled = course.enrolledStudents?.length || 0;

        recommendations += `### ${icon} **${course.title}**\n`;
        recommendations += `📋 ${course.description || 'Comprehensive course to boost your skills'}\n`;
        recommendations += `🎚️ **Level**: ${level} | ⏱️ **Duration**: ${duration} | ${price}\n`;
        recommendations += `� **${enrolled}+ students enrolled** | ${rating}\n`;
        recommendations += `🏷️ **Category**: ${course.category || 'Programming'}\n\n`;
      });
    } else {
      // Fallback if no courses found
      recommendations += `**🐍 Python Programming** - Perfect for beginners, versatile and in high demand\n`;
      recommendations += `**🌐 Web Development Basics** - HTML, CSS, and JavaScript fundamentals\n`;
      recommendations += `**� Introduction to Databases** - Essential for any tech career\n\n`;
    }

    // Add learning paths based on interests
    if (interests.toLowerCase().includes('data')) {
      const dataCourses = availableCourses.filter(course =>
        course.title.toLowerCase().includes('data') ||
        course.title.toLowerCase().includes('sql') ||
        course.title.toLowerCase().includes('python')
      ).slice(0, 2);

      if (dataCourses.length > 0) {
        recommendations += `\n## 📊 Data Science Path\n\n`;
        dataCourses.forEach(course => {
          recommendations += `**${course.title}** - ${course.description || 'Build your data skills'}\n`;
        });
        recommendations += `\n`;
      }
    }

    if (interests.toLowerCase().includes('web')) {
      const webCourses = availableCourses.filter(course =>
        course.title.toLowerCase().includes('web') ||
        course.title.toLowerCase().includes('html') ||
        course.title.toLowerCase().includes('javascript') ||
        course.title.toLowerCase().includes('react')
      ).slice(0, 2);

      if (webCourses.length > 0) {
        recommendations += `\n## 🌐 Web Development Path\n\n`;
        webCourses.forEach(course => {
          recommendations += `**${course.title}** - ${course.description || 'Master web development'}\n`;
        });
        recommendations += `\n`;
      }
    }

    recommendations += `## 💡 Why These Recommendations?\n\n`;
    recommendations += `1. **Skill Progression** - Building on what you already know\n`;
    recommendations += `2. **Market Demand** - These skills are highly sought after\n`;
    recommendations += `3. **Career Growth** - Aligned with your interests and goals\n\n`;
    recommendations += `📚 **Total Available Courses**: ${availableCourses.length}\n`;
    recommendations += `🎯 **Completed Courses**: ${completedCourses.length}\n\n`;
    recommendations += `*Ready to start your learning journey? Choose a course that excites you most!* 🚀`;

    return recommendations;
  }

  /**
   * Fallback progress analysis
   */
  getFallbackProgressAnalysis(userProfile, completedCourses, currentCourses) {
    const name = userProfile.firstName || 'there';
    const skills = userProfile.skills || [];
    const completedCount = completedCourses.length;
    const currentCount = currentCourses.length;

    let analysis = `# 📈 Learning Progress Analysis for ${name}\n\n`;

    analysis += `## 🎉 Your Learning Journey So Far\n\n`;
    if (completedCount > 0) {
      analysis += `Congratulations! You've completed **${completedCount}** course${completedCount > 1 ? 's' : ''}. That's fantastic progress! 🎉\n\n`;
      analysis += `**Completed Courses**: ${completedCourses.map(c => c.title || c).join(', ')}\n\n`;
    } else {
      analysis += `You're at the beginning of an exciting learning journey! Every expert was once a beginner. 🌱\n\n`;
    }

    if (currentCount > 0) {
      analysis += `**Currently Learning**: ${currentCourses.map(c => c.title || c).join(', ')}\n\n`;
    }

    analysis += `## 🛠 Your Skills Development\n\n`;
    if (skills.length > 0) {
      analysis += `**Current Skills**: ${skills.join(', ')}\n\n`;
      analysis += `You're building a solid foundation! Each skill you develop opens new opportunities. 💪\n\n`;
    } else {
      analysis += `Ready to develop your first technical skills? The journey of a thousand miles begins with a single step! 🚀\n\n`;
    }

    analysis += `## 🎯 Strengths & Next Steps\n\n`;
    analysis += `**Your Strengths**:\n`;
    analysis += `- 🌟 Commitment to continuous learning\n`;
    analysis += `- 🎯 Clear focus on skill development\n`;
    analysis += `- 💡 Proactive approach to career growth\n\n`;

    analysis += `**Recommended Next Steps**:\n`;
    analysis += `1. 📚 Complete any ongoing courses\n`;
    analysis += `2. 🛠 Practice with hands-on projects\n`;
    analysis += `3. 🤝 Join developer communities\n`;
    analysis += `4. 🎯 Set specific learning goals\n\n`;

    analysis += `## 🚀 Keep Going!\n\n`;
    analysis += `Remember: "The expert in anything was once a beginner." You're making great progress, and every step forward is an achievement worth celebrating! 🎉\n\n`;
    analysis += `*Keep learning, keep growing, and keep pushing forward!* 💪`;

    return analysis;
  }

  /**
   * Fallback chat response when Gemini fails
   */
  getFallbackChatResponse(userMessage, userContext) {
    const message = userMessage.toLowerCase();
    const name = userContext?.firstName || 'there';

    // Detect intent and provide appropriate response
    if (message.includes('hello') || message.includes('hi') || message.includes('hey')) {
      return `Hello ${name}! 👋 Welcome to your AI learning assistant! I'm here to help you find the perfect courses, plan your studies, and track your progress. What would you like to explore today?`;
    }

    if (message.includes('recommend') || message.includes('course') || message.includes('learn')) {
      const skills = userContext?.skills?.join(', ') || 'programming fundamentals';
      return `🎯 I'd love to recommend some courses for you! Based on your profile, here are some suggestions:

📚 **For your current skills (${skills})**:
• Advanced techniques and best practices
• Real-world project-based learning
• Industry-standard tools and frameworks

🚀 **Popular learning paths**:
• **Web Development** - Frontend & Backend
• **Data Science** - Analytics & Machine Learning  
• **Mobile Development** - iOS & Android
• **Cloud Computing** - AWS, Azure, DevOps

💡 **What specific area interests you most?** I can provide more targeted recommendations based on your goals!`;
    }

    if (message.includes('progress') || message.includes('achievement') || message.includes('completed')) {
      const completedCount = userContext?.completedCourses?.length || 0;
      return `📈 **Your Learning Progress**

🎉 Courses Completed: **${completedCount}**
🎯 Current Level: **${userContext?.level || 1}**
⭐ Experience Points: **${userContext?.xp || 0}**

${completedCount > 0 ?
          `Great work on completing your courses! You're building solid foundations. 💪` :
          `You're just getting started - and that's exciting! Every expert was once a beginner. 🌱`}

**Next Steps:**
1. 📚 Continue with hands-on practice
2. 🛠 Build real projects
3. 🤝 Connect with other learners
4. 🎯 Set new learning goals

Keep up the fantastic work! 🚀`;
    }

    if (message.includes('help') || message.includes('what can you do')) {
      return `🤖 **I'm your AI Learning Assistant!** Here's how I can help:

📚 **Course Recommendations**
• Personalized suggestions based on your skills
• Learning path planning
• Career-focused guidance

📈 **Progress Tracking**
• Achievement monitoring
• Skill development insights
• Learning analytics

🎯 **Study Planning**
• Custom study schedules
• Goal setting assistance
• Time management tips

💬 **Learning Support**
• Answer questions about courses
• Provide study tips and motivation
• Connect concepts across subjects

**Try asking me:**
• "Recommend courses for web development"
• "Show my learning progress"
• "Create a study plan for Python"
• "What should I learn next?"

What would you like to explore? 🚀`;
    }

    // INTELLIGENT RESPONSES FOR SPECIFIC TOPICS
    if (message.includes('trending') || message.includes('popular') || message.includes('hot')) {
      return `🔥 **Trending Programming Topics & Technologies:**

🚀 **Most Popular Right Now:**
• **Python** - AI/ML, Data Science, Web Development
• **JavaScript** - Full-stack Development, React, Node.js
• **Cloud Computing** - AWS, Azure, DevOps
• **AI & Machine Learning** - ChatGPT, Computer Vision
• **Web3 & Blockchain** - Smart Contracts, DeFi
• **Mobile Development** - React Native, Flutter

📈 **Growing Fast:**
• **Rust** - System programming, performance
• **Go** - Microservices, backend development
• **TypeScript** - Type-safe JavaScript
• **Kubernetes** - Container orchestration

💡 **Want to dive deeper?** Ask me:
• "Recommend Python courses"
• "Show me AI courses"
• "Best JavaScript learning path"
• "Cloud development courses"

What technology interests you most? 🎯`;
    }

    if (message.includes('python')) {
      return `🐍 **Python is an excellent choice!** It's perfect for:

🔥 **Hot Career Paths:**
• **Data Science & Analytics** - High demand, great pay
• **AI & Machine Learning** - Future-proof skills
• **Web Development** - Django, Flask frameworks
• **Automation & Scripting** - Save time, boost productivity
• **Game Development** - Fun projects with Pygame

📚 **Python Learning Path:**
1. **Basics** - Syntax, variables, functions
2. **Data Structures** - Lists, dictionaries, sets
3. **Object-Oriented Programming** - Classes, inheritance
4. **Libraries** - NumPy, Pandas, Matplotlib
5. **Frameworks** - Django/Flask for web, TensorFlow for AI

💡 **Ready to start?** Try asking:
• "Recommend Python courses for beginners"
• "Python for data science"
• "Best Python projects for practice"

What's your experience level with Python? 🎯`;
    }

    if (message.includes('programming') || message.includes('coding') || message.includes('development')) {
      return `💻 **Programming is an amazing skill to learn!** Here's what's popular:

🌟 **Best Languages to Start:**
• **Python** - Easy to learn, versatile
• **JavaScript** - Essential for web development
• **Java** - Enterprise development, Android apps
• **C++** - Game development, system programming

🎯 **Choose Based on Your Goals:**
• **Web Development** → HTML, CSS, JavaScript, React
• **Mobile Apps** → React Native, Flutter, Swift
• **Data Science** → Python, R, SQL
• **Game Development** → C#, C++, Unity
• **AI/Machine Learning** → Python, TensorFlow, PyTorch

📈 **Career Opportunities:**
• Frontend Developer: $70K-120K
• Backend Developer: $80K-130K
• Full-Stack Developer: $85K-140K
• Data Scientist: $90K-150K
• AI Engineer: $100K-180K

💡 **Want personalized recommendations?** Tell me:
• Your experience level (beginner/intermediate/advanced)
• What you want to build (websites/apps/games/AI)
• How much time you can dedicate

Let's find the perfect learning path for you! 🚀`;
    }

    // Default response for general queries
    return `Thanks for your message! 😊 I'm your AI learning assistant, and I'm here to help you with:

🎯 **Course recommendations** based on your interests
📈 **Learning progress** tracking and insights  
📚 **Study planning** and goal setting
💡 **Learning tips** and career guidance

Feel free to ask me about:
• "What courses should I take?"
• "Show my progress"
• "Help me plan my studies"
• "Learning tips for [topic]"

What would you like to learn about today? 🚀`;
  }

  /**
   * Interactive Learning Questionnaire System
   */
  getWelcomeQuestionnaire() {
    return {
      message: `🎯 **Welcome to Your Personalized Learning Journey!**

I'm here to help you find the perfect courses and videos. Let me ask you a few quick questions to personalize your experience:

**Question 1 of 3** 📝

🤔 **What have you already learned or have experience with?**

Please choose one or more options:

🔹 **Programming Languages** (Python, JavaScript, Java, etc.)
🔹 **Web Development** (HTML, CSS, React, etc.)
🔹 **Data Science** (Analytics, SQL, Machine Learning)
🔹 **Mobile Development** (iOS, Android, React Native)
🔹 **Design** (UI/UX, Graphic Design)
🔹 **Business/Marketing** (Digital Marketing, Business Analysis)
🔹 **I'm completely new to tech** 🌱

*Just type your answer or click one of the options above!*`,
      type: 'questionnaire',
      step: 1,
      quickActions: [
        { id: 'programming', label: 'Programming Languages', value: 'I have experience with programming languages' },
        { id: 'web', label: 'Web Development', value: 'I know web development' },
        { id: 'data', label: 'Data Science', value: 'I have data science experience' },
        { id: 'mobile', label: 'Mobile Development', value: 'I do mobile development' },
        { id: 'design', label: 'Design', value: 'I have design experience' },
        { id: 'business', label: 'Business/Marketing', value: 'I know business and marketing' },
        { id: 'beginner', label: "I'm New to Tech", value: "I'm completely new to tech" }
      ]
    };
  }

  processQuestionnaireStep(step, userResponse, sessionData = {}) {
    sessionData.responses = sessionData.responses || {};

    switch (step) {
      case 1:
        sessionData.responses.experience = userResponse;
        return this.getQuestion2(userResponse);

      case 2:
        sessionData.responses.goals = userResponse;
        return this.getQuestion3(userResponse, sessionData);

      case 3:
        sessionData.responses.timeCommitment = userResponse;
        return this.generatePersonalizedRecommendations(sessionData);

      default:
        return this.getWelcomeQuestionnaire();
    }
  }

  getQuestion2(previousResponse) {
    return {
      message: `Great! 👍 I see you mentioned: "${previousResponse}"

**Question 2 of 3** 🎯

🚀 **What would you like to learn or improve next?**

Choose what excites you most:

🔸 **Build Websites** (Frontend, Backend, Full-Stack)
🔸 **Mobile Apps** (iOS, Android, Cross-platform)
🔸 **Data & AI** (Data Analysis, Machine Learning, AI)
🔸 **Game Development** (Unity, Game Design)
🔸 **Cloud & DevOps** (AWS, Docker, Kubernetes)
🔸 **Cybersecurity** (Ethical Hacking, Security Analysis)
🔸 **Business Skills** (Project Management, Digital Marketing)
🔸 **Something else** (tell me what!)

*What sounds most interesting to you?*`,
      type: 'questionnaire',
      step: 2,
      quickActions: [
        { id: 'web', label: 'Build Websites', value: 'I want to build websites' },
        { id: 'mobile', label: 'Mobile Apps', value: 'I want to create mobile apps' },
        { id: 'data', label: 'Data & AI', value: 'I want to learn data science and AI' },
        { id: 'games', label: 'Game Development', value: 'I want to develop games' },
        { id: 'cloud', label: 'Cloud & DevOps', value: 'I want to learn cloud technologies' },
        { id: 'security', label: 'Cybersecurity', value: 'I want to learn cybersecurity' },
        { id: 'business', label: 'Business Skills', value: 'I want to learn business skills' }
      ]
    };
  }

  getQuestion3(previousResponse, sessionData) {
    return {
      message: `Perfect! 🎉 You want to focus on: "${previousResponse}"

**Question 3 of 3** ⏰

📅 **How much time can you dedicate to learning each week?**

This helps me recommend the right pace and course format:

⚡ **2-5 hours/week** - Casual learning, flexible schedule
🚀 **5-10 hours/week** - Steady progress, committed learner  
🔥 **10-20 hours/week** - Intensive learning, career focused
💪 **20+ hours/week** - Bootcamp style, rapid skill building

*Choose what works best for your lifestyle!*`,
      type: 'questionnaire',
      step: 3,
      quickActions: [
        { id: 'casual', label: '2-5 hours/week', value: '2-5 hours per week' },
        { id: 'steady', label: '5-10 hours/week', value: '5-10 hours per week' },
        { id: 'intensive', label: '10-20 hours/week', value: '10-20 hours per week' },
        { id: 'bootcamp', label: '20+ hours/week', value: '20+ hours per week' }
      ]
    };
  }

  async generatePersonalizedRecommendations(sessionData) {
    const { experience, goals, timeCommitment } = sessionData.responses;

    // Create personalized learning plan with videos
    const recommendations = this.buildPersonalizedPlan(experience, goals, timeCommitment);

    return {
      message: `🎉 **Your Personalized Learning Plan is Ready!**

Based on your responses:
📚 **Experience**: ${experience}
🎯 **Goal**: ${goals}  
⏰ **Time Commitment**: ${timeCommitment}

${recommendations.plan}

🎥 **Recommended Videos to Start:**

${recommendations.videos.map((video, index) =>
        `**${index + 1}. ${video.title}**
🎬 ${video.description}
⏱️ Duration: ${video.duration}
🎯 Level: ${video.level}
📺 [Watch Now](${video.url})`
      ).join('\n\n')}

💡 **Next Steps:**
1. Start with the first video above
2. Practice what you learn immediately  
3. Ask me questions anytime you get stuck
4. I'll track your progress and suggest next videos

Ready to begin? Just click on any video to start learning! 🚀`,
      type: 'personalized-plan',
      data: {
        plan: recommendations.plan,
        videos: recommendations.videos,
        userProfile: sessionData.responses
      }
    };
  }

  buildPersonalizedPlan(experience, goals, timeCommitment) {
    // Sample video recommendations based on user responses
    let videos = [];
    let plan = '';

    // Determine plan based on goals
    if (goals.toLowerCase().includes('web')) {
      plan = `🌐 **Web Development Learning Path**

**Phase 1: Foundations** (Weeks 1-4)
• HTML & CSS Basics
• JavaScript Fundamentals  
• Responsive Design

**Phase 2: Frameworks** (Weeks 5-8)
• React.js or Vue.js
• Backend with Node.js
• Database Integration

**Phase 3: Projects** (Weeks 9-12)
• Build Portfolio Website
• Create Full-Stack App
• Deploy to Production`;

      videos = [
        {
          title: "HTML & CSS Complete Course for Beginners",
          description: "Learn the building blocks of web development from scratch",
          duration: "3 hours",
          level: "Beginner",
          url: "https://www.youtube.com/watch?v=mU6anWqZJcc"
        },
        {
          title: "JavaScript Crash Course",
          description: "Master JavaScript fundamentals in one comprehensive video",
          duration: "1.5 hours",
          level: "Beginner",
          url: "https://www.youtube.com/watch?v=hdI2bqOjy3c"
        },
        {
          title: "React.js Full Course 2024",
          description: "Build modern web applications with React",
          duration: "4 hours",
          level: "Intermediate",
          url: "https://www.youtube.com/watch?v=CgkZ7MvWUAA"
        }
      ];
    } else if (goals.toLowerCase().includes('data') || goals.toLowerCase().includes('ai')) {
      plan = `📊 **Data Science & AI Learning Path**

**Phase 1: Foundations** (Weeks 1-4)
• Python Programming
• Statistics & Mathematics
• Data Manipulation with Pandas

**Phase 2: Analysis** (Weeks 5-8)
• Data Visualization
• SQL for Data Science
• Machine Learning Basics

**Phase 3: Advanced** (Weeks 9-12)
• Deep Learning
• AI Project Development
• Portfolio Building`;

      videos = [
        {
          title: "Python for Data Science Complete Course",
          description: "Learn Python specifically for data science applications",
          duration: "4 hours",
          level: "Beginner",
          url: "https://www.youtube.com/watch?v=LHBE6Q9XlzI"
        },
        {
          title: "Machine Learning Explained",
          description: "Understand ML concepts with practical examples",
          duration: "2 hours",
          level: "Intermediate",
          url: "https://www.youtube.com/watch?v=ukzFI9rgwfU"
        },
        {
          title: "Data Analysis with Pandas",
          description: "Master data manipulation and analysis",
          duration: "3 hours",
          level: "Intermediate",
          url: "https://www.youtube.com/watch?v=vmEHCJofslg"
        }
      ];
    } else if (goals.toLowerCase().includes('mobile')) {
      plan = `📱 **Mobile Development Learning Path**

**Phase 1: Foundations** (Weeks 1-4)
• Programming Fundamentals
• Mobile UI/UX Principles
• Development Environment Setup

**Phase 2: Framework** (Weeks 5-8)
• React Native or Flutter
• State Management
• API Integration

**Phase 3: Publishing** (Weeks 9-12)
• App Store Optimization
• Testing & Debugging
• Launch Your First App`;

      videos = [
        {
          title: "React Native Crash Course",
          description: "Build mobile apps for iOS and Android",
          duration: "3 hours",
          level: "Intermediate",
          url: "https://www.youtube.com/watch?v=0-S5a0eXPoc"
        },
        {
          title: "Flutter Complete Course",
          description: "Create beautiful mobile apps with Flutter",
          duration: "5 hours",
          level: "Beginner",
          url: "https://www.youtube.com/watch?v=VPvVD8t02U8"
        }
      ];
    } else {
      // Default programming path
      plan = `💻 **Programming Fundamentals Path**

**Phase 1: Choose Your Language** (Weeks 1-4)
• Python (easiest to start)
• JavaScript (web focused)
• Java (enterprise focused)

**Phase 2: Core Concepts** (Weeks 5-8)
• Data Structures & Algorithms
• Object-Oriented Programming
• Version Control (Git)

**Phase 3: Projects** (Weeks 9-12)
• Build Real Applications
• Code Portfolio
• Open Source Contributions`;

      videos = [
        {
          title: "Programming Fundamentals",
          description: "Learn core programming concepts that apply to any language",
          duration: "2 hours",
          level: "Beginner",
          url: "https://www.youtube.com/watch?v=zOjov-2OZ0E"
        },
        {
          title: "Python Complete Beginner Course",
          description: "Start your programming journey with Python",
          duration: "4 hours",
          level: "Beginner",
          url: "https://www.youtube.com/watch?v=rfscVS0vtbw"
        }
      ];
    }

    return { plan, videos };
  }

  // Teaching methods for personalized guidance
  getPersonalizedLearningTips(userProfile, courses) {
    const { experience, interests, goals } = userProfile;
    let tips = [];

    // Experience-based tips
    if (experience === 'beginner') {
      tips = [
        "🌱 Start with fundamentals - master the basics before moving to advanced topics",
        "⏰ Set aside 30-60 minutes daily for consistent learning",
        "🛠️ Practice with small projects to reinforce what you learn",
        "👥 Join beginner-friendly communities for support and motivation",
        "📝 Take notes and create your own reference guide",
        "🎯 Focus on one programming language at a time initially"
      ];
    } else if (experience === 'intermediate') {
      tips = [
        "🚀 Challenge yourself with real-world projects",
        "🔄 Refactor and improve your existing code regularly",
        "📚 Read other developers' code to learn different approaches",
        "🏗️ Learn design patterns and best practices",
        "🧪 Write tests for your code to ensure quality",
        "🌐 Contribute to open-source projects"
      ];
    } else if (experience === 'advanced') {
      tips = [
        "🎯 Specialize in cutting-edge technologies in your field",
        "👨‍🏫 Mentor others to solidify your knowledge",
        "📊 Stay updated with industry trends and emerging technologies",
        "🏢 Lead technical discussions and architectural decisions",
        "📖 Write technical blogs or documentation",
        "🚀 Explore leadership and project management skills"
      ];
    }

    // Interest-specific tips
    if (interests.includes('programming')) {
      tips.push("💻 Practice algorithmic thinking with coding challenges");
      tips.push("🔧 Learn version control (Git) early - it's essential");
    }

    if (interests.includes('web-development')) {
      tips.push("🌐 Build responsive websites from day one");
      tips.push("⚡ Focus on performance optimization and accessibility");
    }

    if (interests.includes('data-science')) {
      tips.push("📊 Master data visualization - it's crucial for communication");
      tips.push("🧮 Practice statistics alongside programming");
    }

    return tips;
  }

  generateStudyPlan(userProfile, recommendedCourses) {
    const { experience, interests, goals } = userProfile;

    let studyPlan = {
      duration: "3-6 months",
      schedule: "3-4 hours per week",
      phases: []
    };

    if (experience === 'beginner') {
      studyPlan.phases = [
        {
          phase: "Foundation (Weeks 1-4)",
          description: "Build strong fundamentals",
          courses: recommendedCourses.slice(0, 1),
          activities: [
            "Complete course videos and exercises",
            "Practice coding daily (30 min minimum)",
            "Join beginner programming community",
            "Set up development environment"
          ]
        },
        {
          phase: "Practice & Application (Weeks 5-8)",
          description: "Apply what you've learned",
          courses: recommendedCourses.slice(1, 2),
          activities: [
            "Build 2-3 small projects",
            "Start a coding journal",
            "Participate in coding forums",
            "Review and refactor your code"
          ]
        },
        {
          phase: "Specialization (Weeks 9-12)",
          description: "Dive deeper into your area of interest",
          courses: recommendedCourses.slice(2, 3),
          activities: [
            "Work on a substantial project",
            "Explore advanced topics in your field",
            "Connect with other learners",
            "Consider contributing to open source"
          ]
        }
      ];
    } else {
      studyPlan.phases = [
        {
          phase: "Skill Enhancement (Weeks 1-3)",
          description: "Upgrade existing skills",
          courses: recommendedCourses.slice(0, 2),
          activities: [
            "Focus on advanced concepts",
            "Build challenging projects",
            "Learn industry best practices"
          ]
        },
        {
          phase: "Specialization (Weeks 4-8)",
          description: "Master specific technologies",
          courses: recommendedCourses.slice(2, 3),
          activities: [
            "Work on portfolio projects",
            "Contribute to open source",
            "Network with professionals"
          ]
        }
      ];
    }

    return studyPlan;
  }

  // Get motivational messages based on progress
  getMotivationalMessage(userProfile) {
    const messages = {
      beginner: [
        "🌟 Every expert was once a beginner! You're taking the right first steps.",
        "🚀 Programming is like learning a new language - be patient with yourself!",
        "💪 Each line of code you write makes you stronger as a developer!",
        "🎯 Focus on progress, not perfection. You're doing great!"
      ],
      intermediate: [
        "🔥 You're building solid skills! Keep pushing your boundaries.",
        "⚡ Your foundation is strong - now it's time to build something amazing!",
        "🏗️ Every project teaches you something new. Keep building!",
        "🎨 You're not just coding now - you're creating solutions!"
      ],
      advanced: [
        "🌟 Your expertise is impressive! Consider sharing your knowledge.",
        "🚀 You're at the cutting edge - keep exploring new frontiers!",
        "👑 With great skill comes great opportunity - lead the way!",
        "🎯 You're not just using technology - you're shaping the future!"
      ]
    };

    const levelMessages = messages[userProfile.experience] || messages.beginner;
    return levelMessages[Math.floor(Math.random() * levelMessages.length)];
  }
}

module.exports = GeminiAIService;