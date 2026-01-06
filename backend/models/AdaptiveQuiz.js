const mongoose = require('mongoose');

/**
 * AdaptiveQuiz Schema
 * Manages topic-wise quizzes with difficulty adjustment based on performance
 * - Creates adaptive quizzes with difficulty levels (easy, medium, hard)
 * - Tracks user performance and adjusts next quiz difficulty
 * - Focuses on weak topics with more questions
 * - Enables personalized learning paths
 */
const adaptiveQuizSchema = new mongoose.Schema({
  // Quiz identification
  quizId: {
    type: mongoose.Schema.Types.ObjectId,
    default: () => new mongoose.Types.ObjectId()
  },
  
  // Reference fields
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  courseId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Course',
    required: true
  },
  topicName: {
    type: String,
    required: true,
    trim: true
  },
  
  // Quiz configuration
  title: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  
  // Difficulty management
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard', 'adaptive'],
    default: 'medium'
  },
  
  // Adaptive difficulty settings
  adaptiveDifficultyConfig: {
    enabled: { type: Boolean, default: true },
    // Adjust based on previous performance
    previousAttemptScore: { type: Number, default: null },
    scorethresholdForLevelUp: { type: Number, default: 80 },
    scoreThresholdForLevelDown: { type: Number, default: 60 },
    autoAdjustBased: {
      type: String,
      enum: ['topicMastery', 'lastQuizScore', 'averagePerformance'],
      default: 'topicMastery'
    }
  },
  
  // Questions
  questions: [{
    questionId: mongoose.Schema.Types.ObjectId,
    questionText: String,
    questionType: {
      type: String,
      enum: ['multiple-choice', 'true-false', 'short-answer'],
      default: 'multiple-choice'
    },
    options: [String],
    correctAnswerIndex: Number,
    correctAnswer: String, // For short-answer questions
    explanation: String,
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: 'medium'
    },
    concepts: [String], // Concepts this question tests
    pointsValue: { type: Number, default: 1 },
    // Question selection metadata
    includeReason: String // Why this question was included
  }],
  
  // Total configuration
  totalQuestions: {
    type: Number,
    required: true
  },
  maxScore: {
    type: Number,
    default: 100
  },
  timeLimit: {
    type: Number, // in minutes
    default: 30
  },
  
  // Question distribution (for adaptive logic)
  questionDistribution: {
    easyCount: Number,
    mediumCount: Number,
    hardCount: Number,
    weakTopicQuestions: Number, // Extra questions on weak areas
    totalDistribution: String // e.g., "40% medium, 30% hard, 20% easy, 10% weak topics"
  },
  
  // Status and tracking
  status: {
    type: String,
    enum: ['draft', 'published', 'active', 'completed', 'archived'],
    default: 'draft'
  },
  
  // User attempt tracking
  userAttempts: [{
    attemptNumber: Number,
    startedAt: Date,
    completedAt: Date,
    timeSpent: Number,
    score: Number,
    maxScore: Number,
    percentageScore: Number,
    passed: Boolean,
    
    // Answer details
    answers: [{
      questionId: mongoose.Schema.Types.ObjectId,
      selectedAnswer: String, // The user's answer
      isCorrect: Boolean,
      timeTaken: Number, // time spent on this question
      flaggedForReview: Boolean
    }],
    
    // Performance metrics
    correctAnswers: Number,
    incorrectAnswers: Number,
    unanswered: Number,
    
    // Weak areas identified in this attempt
    conceptsWithErrors: [String],
    
    // Feedback
    feedback: String,
    strengths: [String],
    areasForImprovement: [String],
    
    // Difficulty adjustment for next attempt
    nextDifficultyRecommended: {
      type: String,
      enum: ['easy', 'medium', 'hard'],
      default: null
    }
  }],
  
  // Performance analytics
  performanceMetrics: {
    totalAttempts: { type: Number, default: 0 },
    bestScore: { type: Number, default: 0 },
    averageScore: { type: Number, default: 0 },
    lowestScore: { type: Number, default: 0 },
    passCount: { type: Number, default: 0 },
    failCount: { type: Number, default: 0 },
    passRate: { type: Number, default: 0 },
    averageTimeSpent: { type: Number, default: 0 }
  },
  
  // Weak concept tracking
  conceptPerformance: [{
    concept: String,
    questionsAsked: Number,
    questionsCorrect: Number,
    accuracy: Number,
    needsReview: Boolean
  }],
  
  // Metadata
  metadata: {
    createdBy: {
      type: String,
      enum: ['instructor', 'system-generated', 'ai-generated'],
      default: 'system-generated'
    },
    associatedLearningPlanWeek: Number,
    recommendedForWeakTopics: Boolean,
    aiGenerated: Boolean,
    generationPrompt: String // The prompt used to generate the quiz if AI-generated
  },
  
  // Scheduling
  scheduledFor: Date,
  dueDate: Date,
  reminderSent: { type: Boolean, default: false }
}, {
  timestamps: true
});

// Indexes
adaptiveQuizSchema.index({ userId: 1, courseId: 1, topicName: 1 });
adaptiveQuizSchema.index({ userId: 1, status: 1 });
adaptiveQuizSchema.index({ 'userAttempts.completedAt': -1 });
adaptiveQuizSchema.index({ difficulty: 1 });

// Method to calculate next difficulty based on performance
adaptiveQuizSchema.methods.calculateNextDifficulty = function() {
  if (!this.adaptiveDifficultyConfig.enabled || this.userAttempts.length === 0) {
    return this.difficulty;
  }

  const lastAttempt = this.userAttempts[this.userAttempts.length - 1];
  const score = lastAttempt.percentageScore;

  if (score >= this.adaptiveDifficultyConfig.scorethresholdForLevelUp) {
    // Increase difficulty
    const difficultyProgression = ['easy', 'medium', 'hard'];
    const currentIndex = difficultyProgression.indexOf(this.difficulty);
    if (currentIndex < 2) {
      return difficultyProgression[currentIndex + 1];
    }
    return 'hard';
  } else if (score < this.adaptiveDifficultyConfig.scoreThresholdForLevelDown) {
    // Decrease difficulty
    const difficultyProgression = ['easy', 'medium', 'hard'];
    const currentIndex = difficultyProgression.indexOf(this.difficulty);
    if (currentIndex > 0) {
      return difficultyProgression[currentIndex - 1];
    }
    return 'easy';
  }

  return this.difficulty;
};

// Method to record an attempt and update metrics
adaptiveQuizSchema.methods.recordAttempt = function(attemptData) {
  const {
    startedAt,
    completedAt,
    answers,
    conceptsWithErrors = []
  } = attemptData;

  const timeSpent = (completedAt - startedAt) / 60000; // Convert to minutes
  const attemptNumber = this.userAttempts.length + 1;

  // Calculate score
  let correctAnswers = 0;
  answers.forEach(answer => {
    if (answer.isCorrect) {
      correctAnswers += 1;
    }
  });

  const score = Math.round((correctAnswers / this.totalQuestions) * this.maxScore);
  const percentageScore = Math.round((correctAnswers / this.totalQuestions) * 100);
  const passed = percentageScore >= 70; // Passing threshold

  // Create attempt record
  const attempt = {
    attemptNumber,
    startedAt,
    completedAt,
    timeSpent,
    score,
    maxScore: this.maxScore,
    percentageScore,
    passed,
    answers,
    correctAnswers,
    incorrectAnswers: this.totalQuestions - correctAnswers,
    unanswered: 0,
    conceptsWithErrors,
    nextDifficultyRecommended: this.calculateNextDifficulty()
  };

  this.userAttempts.push(attempt);

  // Update performance metrics
  this.performanceMetrics.totalAttempts += 1;
  if (passed) {
    this.performanceMetrics.passCount += 1;
  } else {
    this.performanceMetrics.failCount += 1;
  }

  this.performanceMetrics.passRate = Math.round(
    (this.performanceMetrics.passCount / this.performanceMetrics.totalAttempts) * 100
  );

  if (this.performanceMetrics.totalAttempts === 1) {
    this.performanceMetrics.bestScore = score;
    this.performanceMetrics.lowestScore = score;
  } else {
    if (score > this.performanceMetrics.bestScore) {
      this.performanceMetrics.bestScore = score;
    }
    if (score < this.performanceMetrics.lowestScore) {
      this.performanceMetrics.lowestScore = score;
    }
  }

  const allScores = this.userAttempts.map(a => a.score);
  this.performanceMetrics.averageScore = Math.round(
    allScores.reduce((sum, s) => sum + s, 0) / allScores.length
  );

  const allTimes = this.userAttempts.map(a => a.timeSpent);
  this.performanceMetrics.averageTimeSpent = Math.round(
    allTimes.reduce((sum, t) => sum + t, 0) / allTimes.length
  );
};

// Method to identify weak concepts
adaptiveQuizSchema.methods.identifyWeakConcepts = function() {
  const conceptStats = {};

  this.userAttempts.forEach(attempt => {
    attempt.answers.forEach(answer => {
      const question = this.questions.find(q => q.questionId.toString() === answer.questionId.toString());
      if (question) {
        question.concepts.forEach(concept => {
          if (!conceptStats[concept]) {
            conceptStats[concept] = { correct: 0, total: 0 };
          }
          conceptStats[concept].total += 1;
          if (answer.isCorrect) {
            conceptStats[concept].correct += 1;
          }
        });
      }
    });
  });

  // Calculate accuracy and identify weak concepts
  const weakConcepts = [];
  Object.keys(conceptStats).forEach(concept => {
    const stats = conceptStats[concept];
    const accuracy = Math.round((stats.correct / stats.total) * 100);
    this.conceptPerformance = this.conceptPerformance || [];
    
    const existing = this.conceptPerformance.find(c => c.concept === concept);
    if (existing) {
      existing.questionsCorrect = stats.correct;
      existing.questionsAsked = stats.total;
      existing.accuracy = accuracy;
      existing.needsReview = accuracy < 70;
    } else {
      this.conceptPerformance.push({
        concept,
        questionsAsked: stats.total,
        questionsCorrect: stats.correct,
        accuracy,
        needsReview: accuracy < 70
      });
    }

    if (accuracy < 70) {
      weakConcepts.push(concept);
    }
  });

  return weakConcepts;
};

// Method to generate questions focused on weak topics
adaptiveQuizSchema.statics.generateAdaptiveQuiz = async function(userId, courseId, topicName, topicMastery) {
  const quiz = new this({
    userId,
    courseId,
    topicName,
    title: `Adaptive Quiz: ${topicName}`,
    difficulty: topicMastery && topicMastery.masteryScore < 40 ? 'easy' : 'medium',
    status: 'draft'
  });

  // Questions will be added by the copilot service or instructor
  return quiz;
};

module.exports = mongoose.model('AdaptiveQuiz', adaptiveQuizSchema);
