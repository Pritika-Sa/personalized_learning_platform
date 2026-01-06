const { GoogleGenerativeAI } = require('@google/generative-ai');
const Course = require('../models/Course');
const LearningMemory = require('../models/LearningMemory');
const TopicMastery = require('../models/TopicMastery');
const AdaptiveQuiz = require('../models/AdaptiveQuiz');
const LearningPlan = require('../models/LearningPlan');
require('dotenv').config();

/**
 * Learning Copilot Service
 * Advanced AI-powered learning assistant that provides:
 * - Course-context Q&A with RAG-like behavior
 * - Step-by-step concept explanations
 * - Personalized learning suggestions
 * - Adaptive quiz recommendations
 * - Learning path guidance
 * 
 * The copilot remembers user learning history and tailors responses accordingly
 */
class LearningCopilotService {
  constructor() {
    this.isGeminiAvailable = false;
    
    if (!process.env.GEMINI_API_KEY) {
      console.warn('⚠️  GEMINI_API_KEY not found. Using fallback copilot responses.');
      return;
    }
    
    try {
      this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      this.model = this.genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Learning Copilot Service initialized');
    } catch (error) {
      console.warn('⚠️  Gemini AI initialization failed:', error.message);
    }
  }

  /**
   * Test Gemini availability
   */
  async testAvailability() {
    if (!this.model) return false;
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
   * Get course content summary for context
   * Used for RAG-like behavior to ensure responses are course-specific
   */
  async getCourseContext(courseId) {
    try {
      const course = await Course.findById(courseId).select(
        'title description category level skills assessments videos'
      );
      
      if (!course) return null;

      // Build course context from available data
      const context = {
        title: course.title,
        description: course.description,
        category: course.category,
        level: course.level,
        skills: course.skills || [],
        topicsSummary: course.assessments?.map(a => a.title) || [],
        videoCount: course.videos?.length || 0
      };

      return context;
    } catch (error) {
      console.error('Error fetching course context:', error);
      return null;
    }
  }

  /**
   * Get user's learning context from memory
   */
  async getLearningContext(userId, courseId) {
    try {
      const memory = await LearningMemory.findOne({ userId, courseId });
      const topicMasteries = await TopicMastery.find({ userId, courseId })
        .select('topicName masteryScore classification');

      const context = {
        completedTopics: memory?.completedTopics?.map(t => t.topicName) || [],
        currentTopics: memory?.currentTopics?.map(t => t.topicName) || [],
        weakTopics: topicMasteries.filter(t => t.classification === 'weak').map(t => t.topicName),
        strongTopics: topicMasteries.filter(t => t.classification === 'strong').map(t => t.topicName),
        averageQuizScore: memory?.statistics?.averageQuizScore || 0,
        totalTimeInvested: memory?.statistics?.totalTimeInvested || 0,
        mistakesCount: memory?.mistakeLog?.length || 0,
        learningPace: memory?.learningPatterns?.learningVelocity || 'moderate'
      };

      return context;
    } catch (error) {
      console.error('Error fetching learning context:', error);
      return {};
    }
  }

  /**
   * Main copilot method: Answer user question with course context
   * Ensures responses reference the course and user's learning state
   */
  async answerQuestion(userId, courseId, question, conversationContext = []) {
    try {
      // Test Gemini availability
      if (!this.isGeminiAvailable && this.model) {
        await this.testAvailability();
      }

      // Gather context
      const courseContext = await this.getCourseContext(courseId);
      const learningContext = await this.getLearningContext(userId, courseId);

      if (!courseContext) {
        return this.fallbackAnswer(question, 'Course not found');
      }

      // Build copilot prompt with course and learning context
      const prompt = this.buildCopilotPrompt(
        question,
        courseContext,
        learningContext,
        conversationContext
      );

      // Get AI response
      let response;
      if (this.isGeminiAvailable && this.model) {
        const result = await this.model.generateContent(prompt);
        response = await result.response;
        response = response.text();
      } else {
        response = this.generateFallbackResponse(question, courseContext, learningContext);
      }

      // Record copilot interaction
      if (learningContext.completedTopics) {
        const memory = await LearningMemory.findOne({ userId, courseId });
        if (memory) {
          memory.copilotInteractions.push({
            type: 'question',
            topic: this.extractTopicFromQuestion(question, courseContext),
            query: question,
            response: response.substring(0, 500), // Store first 500 chars
            timestamp: new Date()
          });
          await memory.save();
        }
      }

      return {
        success: true,
        response,
        source: this.isGeminiAvailable ? 'gemini-ai' : 'fallback',
        courseContext: courseContext.title,
        learningContext: {
          completedTopics: learningContext.completedTopics.length,
          weakTopics: learningContext.weakTopics.length,
          averageScore: learningContext.averageQuizScore
        }
      };
    } catch (error) {
      console.error('❌ Copilot Error:', error.message);
      return this.fallbackAnswer(question, error.message);
    }
  }

  /**
   * Suggest next topic to study
   * Based on learning plan, mastery levels, and quiz history
   */
  async suggestNextTopic(userId, courseId) {
    try {
      // Get learning plan
      const plan = await LearningPlan.findOne({ userId, courseId });
      const memory = await LearningMemory.findOne({ userId, courseId });

      if (!plan || !memory) {
        return {
          success: false,
          message: 'Learning plan not found. Please generate a plan first.'
        };
      }

      // Get current week
      const today = new Date();
      const currentWeek = plan.weeks.find(w => w.status !== 'completed');

      if (!currentWeek) {
        return {
          success: true,
          message: 'Congratulations! You have completed all topics in this course.',
          nextTopic: null
        };
      }

      // Get weak topics that need review
      const topicMasteries = await TopicMastery.find({ userId, courseId })
        .sort({ masteryScore: 1 });

      const weakTopics = topicMasteries
        .filter(t => t.classification === 'weak')
        .map(t => t.topicName);

      // Prioritize weak topics, then current week topics
      let recommendedTopic;
      if (weakTopics.length > 0) {
        recommendedTopic = weakTopics[0];
      } else if (currentWeek.topics.length > 0) {
        recommendedTopic = currentWeek.topics.find(t => !memory.completedTopics.some(ct => ct.topicName === t));
      }

      return {
        success: true,
        nextTopic: recommendedTopic,
        reason: weakTopics.length > 0 
          ? `You have ${weakTopics.length} weak topics. Let's strengthen "${recommendedTopic}" first.`
          : `This week's focus: "${recommendedTopic}"`,
        currentWeek: currentWeek.weekNumber,
        weakTopics: weakTopics.slice(0, 3),
        suggestedResources: await this.getSuggestedResources(courseId, recommendedTopic)
      };
    } catch (error) {
      console.error('Error suggesting next topic:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Explain a concept step-by-step
   * Uses course context and learning history
   */
  async explainConcept(userId, courseId, concept, depth = 'beginner') {
    try {
      if (!this.isGeminiAvailable && this.model) {
        await this.testAvailability();
      }

      const courseContext = await this.getCourseContext(courseId);
      const learningContext = await this.getLearningContext(userId, courseId);

      const prompt = `
You are an expert learning assistant. Explain the concept "${concept}" in the context of the course "${courseContext?.title || 'this course'}".

User's learning level: ${depth}
User's learning pace: ${learningContext.learningPace || 'moderate'}
Topics they've completed: ${learningContext.completedTopics.join(', ') || 'none yet'}

Provide a structured, step-by-step explanation that:
1. Starts with a simple definition
2. Breaks down into smaller concepts
3. Provides concrete examples relevant to ${courseContext?.category || 'this topic'}
4. Connects to related topics they may have learned
5. Ends with practical application

Keep explanations clear and avoid jargon unless necessary.
      `;

      let explanation;
      if (this.isGeminiAvailable && this.model) {
        const result = await this.model.generateContent(prompt);
        explanation = (await result.response).text();
      } else {
        explanation = this.generateFallbackExplanation(concept, courseContext);
      }

      return {
        success: true,
        concept,
        explanation,
        depth,
        source: this.isGeminiAvailable ? 'gemini-ai' : 'fallback',
        relatedTopics: this.getRelatedTopics(concept, courseContext),
        nextSteps: [
          'Practice this concept with a quiz',
          'Read additional materials',
          'Apply it in a real-world scenario'
        ]
      };
    } catch (error) {
      console.error('Error explaining concept:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Recommend an adaptive quiz
   * Based on topic mastery and recent performance
   */
  async recommendAdaptiveQuiz(userId, courseId) {
    try {
      // Get weak topics
      const topicMasteries = await TopicMastery.find({ userId, courseId })
        .sort({ masteryScore: 1 })
        .limit(3);

      const weakTopics = topicMasteries.filter(t => t.classification === 'weak');

      if (weakTopics.length === 0) {
        return {
          success: true,
          message: 'Great work! No weak topics identified. You can take a comprehensive review quiz.',
          recommendedTopic: null,
          difficulty: 'hard'
        };
      }

      const topicToQuiz = weakTopics[0];

      // Check if quiz exists for this topic
      let quiz = await AdaptiveQuiz.findOne({
        userId,
        courseId,
        topicName: topicToQuiz.topicName,
        status: { $in: ['draft', 'published'] }
      });

      // If no quiz, suggest creating one
      if (!quiz) {
        return {
          success: true,
          recommendedTopic: topicToQuiz.topicName,
          masteryScore: topicToQuiz.masteryScore,
          difficulty: topicToQuiz.masteryScore < 40 ? 'easy' : 'medium',
          message: `Quiz recommended for topic: "${topicToQuiz.topicName}"`,
          action: 'CREATE_QUIZ',
          suggestedDifficulty: topicToQuiz.masteryScore < 40 ? 'easy' : 'medium',
          estimatedDuration: 15,
          questionCount: 10
        };
      }

      return {
        success: true,
        quiz: {
          quizId: quiz._id,
          title: quiz.title,
          topic: quiz.topicName,
          difficulty: quiz.difficulty,
          questionCount: quiz.totalQuestions,
          estimatedDuration: quiz.timeLimit
        },
        reason: `This quiz targets your weak area: "${topicToQuiz.topicName}" (Mastery: ${topicToQuiz.masteryScore}%)`
      };
    } catch (error) {
      console.error('Error recommending quiz:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Get personalized study tips based on learning patterns
   */
  async getStudyTips(userId, courseId) {
    try {
      const memory = await LearningMemory.findOne({ userId, courseId });
      const topicMasteries = await TopicMastery.find({ userId, courseId });

      if (!memory) {
        return {
          success: false,
          message: 'Start your learning journey first!'
        };
      }

      const tips = [];

      // Tip based on learning velocity
      if (memory.learningPatterns.learningVelocity === 'slow') {
        tips.push({
          title: 'Try Shorter Sessions',
          description: 'You seem to learn better with shorter, focused study sessions. Try 20-30 minute sessions instead of longer ones.',
          priority: 'high'
        });
      }

      // Tip based on weak topics
      const weakTopics = topicMasteries.filter(t => t.classification === 'weak');
      if (weakTopics.length > 2) {
        tips.push({
          title: `Focus on Weak Topics (${weakTopics.length})`,
          description: `You have ${weakTopics.length} topics that need attention: ${weakTopics.map(t => t.topicName).join(', ')}. Allocate more time to these.`,
          priority: 'high'
        });
      }

      // Tip based on mistake patterns
      const frequentMistakes = memory.mistakeLog
        .filter(m => !m.isCorrected && m.occurrenceCount > 2)
        .slice(0, 3);

      if (frequentMistakes.length > 0) {
        tips.push({
          title: 'Review Recurring Mistakes',
          description: `You've made these mistakes multiple times: ${frequentMistakes.map(m => m.concept).join(', ')}. Let's review these concepts.`,
          priority: 'high'
        });
      }

      // Tip based on consistency
      if (memory.learningPatterns.consistencyScore < 50) {
        tips.push({
          title: 'Build Consistency',
          description: 'Try to maintain a regular learning schedule. Even 15 minutes daily is more effective than sporadic long sessions.',
          priority: 'medium'
        });
      }

      // Generic tips
      if (tips.length < 3) {
        tips.push({
          title: 'Test Your Knowledge',
          description: 'Take quizzes regularly to identify weak areas early.',
          priority: 'medium'
        });
        tips.push({
          title: 'Teach Others',
          description: 'Try explaining concepts to someone else - it\'s one of the best ways to solidify your understanding.',
          priority: 'medium'
        });
      }

      return {
        success: true,
        tips: tips.slice(0, 5),
        learningMetrics: {
          consistency: memory.learningPatterns.consistencyScore,
          weeklyAverage: Math.round(memory.statistics.totalTimeInvested / 4),
          weeksTaking: Math.ceil(memory.statistics.totalTimeInvested / (7 * 24 * 60))
        }
      };
    } catch (error) {
      console.error('Error getting study tips:', error);
      return { success: false, message: error.message };
    }
  }

  /**
   * Build copilot prompt with course and user context
   */
  buildCopilotPrompt(question, courseContext, learningContext, conversationContext) {
    let prompt = `
You are an expert Learning Copilot for the course: "${courseContext.title}" (${courseContext.category}, Level: ${courseContext.level})

Course Description: ${courseContext.description}
Course Skills: ${courseContext.skills.join(', ')}

USER'S LEARNING CONTEXT:
- Topics Completed: ${learningContext.completedTopics.join(', ') || 'None yet'}
- Topics in Progress: ${learningContext.currentTopics.join(', ') || 'None'}
- Weak Topics (Need Review): ${learningContext.weakTopics.join(', ') || 'None'}
- Strong Topics: ${learningContext.strongTopics.join(', ') || 'None'}
- Average Quiz Score: ${learningContext.averageQuizScore}%
- Learning Pace: ${learningContext.learningPace}

IMPORTANT GUIDELINES:
1. Always reference the course context - ensure answers are specific to "${courseContext.title}"
2. Personalize responses based on user's completed topics and learning pace
3. If the question is about a weak topic, provide extra examples and clarification
4. Use simple language if learning pace is 'slow', more technical if 'fast'
5. Connect new concepts to topics they've already completed
6. If question is outside course scope, politely redirect

${conversationContext.length > 0 ? `\nPREVIOUS CONVERSATION:\n${conversationContext.map(c => `User: ${c.question}\nCopilot: ${c.response}`).join('\n\n')}` : ''}

USER'S QUESTION: "${question}"

Provide a helpful, personalized response that:
- Is specific to the course
- Respects their learning level
- References their learning progress
- Suggests next steps if appropriate
    `;
    return prompt;
  }

  /**
   * Fallback response when Gemini is unavailable
   */
  fallbackAnswer(question, error) {
    return {
      success: true,
      response: `I'm currently unable to provide a detailed response to: "${question}". This might be due to API availability. However, I recommend:\n\n1. Review your course materials\n2. Check the related assessment\n3. Ask in the course discussion forum\n\nTry again in a moment!`,
      source: 'fallback',
      error: error
    };
  }

  /**
   * Generate fallback response based on simple heuristics
   */
  generateFallbackResponse(question, courseContext, learningContext) {
    const questionLower = question.toLowerCase();
    
    if (questionLower.includes('how') || questionLower.includes('explain')) {
      return `To understand this better, consider reviewing the course materials on "${courseContext.title}". The key concepts are typically explained through:\n\n1. Video lessons\n2. Practice assessments\n3. Real-world examples\n\nWould you like me to recommend a specific topic or quiz to help?`;
    }
    
    if (questionLower.includes('practice') || questionLower.includes('quiz')) {
      return `Great idea! Taking quizzes is one of the best ways to test your knowledge. I can help recommend an adaptive quiz based on your current progress.\n\nYour current strong areas: ${learningContext.strongTopics.join(', ') || 'You\'re just starting!'}\nWould you like to challenge yourself or focus on improving weak areas?`;
    }

    return `That's a great question about "${courseContext.title}". Here are some suggestions:\n\n1. Review the relevant course materials\n2. Check if this is covered in the assessments\n3. Try explaining it in your own words\n\nLet me know if you need specific help with a topic!`;
  }

  /**
   * Generate fallback concept explanation
   */
  generateFallbackExplanation(concept, courseContext) {
    return `
## Understanding "${concept}"

### Simple Definition
"${concept}" is an important concept in ${courseContext?.category || 'this course'} that helps you understand ${courseContext?.title || 'the material'}.

### Key Components
1. **Foundation**: Start by understanding the basic definition
2. **Building Blocks**: Break it into smaller, manageable pieces
3. **Relationships**: See how it connects to other concepts
4. **Application**: Learn how it's used in practice

### How It Relates to Your Course
In the context of "${courseContext?.title}", this concept is essential for:
- Understanding more advanced topics
- Applying knowledge to real-world scenarios
- Building a strong foundation

### Next Steps
1. Review the course materials on this topic
2. Watch the related video lessons
3. Take a practice quiz to test your understanding

Would you like me to explain any specific aspect in more detail?
    `;
  }

  /**
   * Extract topic from question
   */
  extractTopicFromQuestion(question, courseContext) {
    // Simple heuristic: find keywords from course skills/assessments
    const keywords = [...(courseContext.skills || []), ...(courseContext.topicsSummary || [])];
    for (const keyword of keywords) {
      if (question.toLowerCase().includes(keyword.toLowerCase())) {
        return keyword;
      }
    }
    return 'general';
  }

  /**
   * Get related topics for a concept
   */
  getRelatedTopics(concept, courseContext) {
    // This could be enhanced with vector similarity
    return courseContext.topicsSummary?.slice(0, 3) || [];
  }

  /**
   * Get suggested resources for a topic
   */
  async getSuggestedResources(courseId, topicName) {
    try {
      const course = await Course.findById(courseId).select('videos assessments');
      
      const resources = [];
      
      if (course.videos) {
        resources.push(...course.videos.slice(0, 2).map(v => ({
          type: 'video',
          title: v.title,
          duration: v.duration
        })));
      }

      if (course.assessments) {
        resources.push(...course.assessments.slice(0, 1).map(a => ({
          type: 'quiz',
          title: a.title
        })));
      }

      return resources;
    } catch (error) {
      return [];
    }
  }
}

module.exports = LearningCopilotService;
