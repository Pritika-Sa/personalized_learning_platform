const mongoose = require('mongoose');

/**
 * LearningMemory Schema
 * Comprehensive record of a user's learning journey for a course
 * - Tracks completed topics, quiz history, and mistakes
 * - Records learning speed and patterns
 * - Enables copilot to personalize recommendations and plan adjustments
 * - Acts as the knowledge base for adaptive learning adjustments
 */
const learningMemorySchema = new mongoose.Schema({
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
  learningPlanId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'LearningPlan',
    default: null
  },
  
  // Completed topics tracking
  completedTopics: [{
    topicName: String,
    completedAt: Date,
    masteryScoreAtCompletion: Number,
    timeSpent: Number,
    resourcesUsed: [String]
  }],
  
  // In-progress topics
  currentTopics: [{
    topicName: String,
    startedAt: Date,
    timeSpent: Number,
    progressPercentage: Number
  }],
  
  // Quiz history (detailed)
  quizHistory: [{
    quizId: mongoose.Schema.Types.ObjectId,
    topicName: String,
    attemptNumber: Number,
    score: Number,
    maxScore: { type: Number, default: 100 },
    difficulty: {
      type: String,
      enum: ['easy', 'medium', 'hard', 'adaptive']
    },
    timeSpent: Number,
    questionsAnswered: Number,
    questionsCorrect: Number,
    attemptedAt: Date,
    reviewedAt: Date,
    keyLearnings: [String]
  }],
  
  // Mistake tracking
  mistakeLog: [{
    mistakeId: mongoose.Schema.Types.ObjectId,
    topic: String,
    concept: String,
    mistakeDescription: String,
    correctAnswer: String,
    firstOccurredAt: Date,
    lastOccurredAt: Date,
    occurrenceCount: Number,
    isCorrected: Boolean,
    correctedAt: Date,
    reviewedCount: Number
  }],
  
  // Learning pattern analysis
  learningPatterns: {
    // Time-based patterns
    averageSessionDuration: { type: Number, default: 0 }, // in minutes
    preferredStudyTime: String, // e.g., "9-11 AM"
    averageSessionsPerWeek: { type: Number, default: 0 },
    
    // Pace tracking
    averageTimePerTopic: { type: Number, default: 0 }, // in minutes
    learningVelocity: {
      type: String,
      enum: ['slow', 'moderate', 'fast', 'variable'],
      default: 'moderate'
    },
    
    // Consistency metrics
    consistencyScore: { type: Number, default: 0, min: 0, max: 100 },
    consecutiveDaysLearning: { type: Number, default: 0 },
    longestStreak: { type: Number, default: 0 },
    
    // Engagement metrics
    engagementLevel: {
      type: String,
      enum: ['low', 'moderate', 'high', 'very-high'],
      default: 'moderate'
    }
  },
  
  // Weak and strong topics (cached for quick access)
  topicClassification: {
    weak: [String],
    medium: [String],
    strong: [String]
  },
  
  // Learning goals and objectives
  currentGoal: {
    description: String,
    deadline: Date,
    progress: Number,
    completedAt: Date
  },
  
  // Resources and materials accessed
  resourcesAccessed: [{
    resourceId: mongoose.Schema.Types.ObjectId,
    resourceType: String, // video, article, quiz, discussion
    title: String,
    accessedAt: Date,
    timeSpent: Number,
    completed: Boolean
  }],
  
  // Peer interactions (study groups, discussions)
  peerInteractions: [{
    type: String, // discussion, study-group, peer-help
    description: String,
    participantCount: Number,
    dateTime: Date,
    topicsDiscussed: [String],
    keyTakeaways: [String]
  }],
  
  // Copilot interaction history
  copilotInteractions: [{
    interactionId: mongoose.Schema.Types.ObjectId,
    type: String, // question, suggestion, explanation, plan-adjustment
    topic: String,
    query: String,
    response: String,
    helpfulnessRating: Number, // 1-5
    ratedAt: Date,
    timestamp: Date
  }],
  
  // Summary statistics
  statistics: {
    totalTopicsCovered: { type: Number, default: 0 },
    totalQuizzesTaken: { type: Number, default: 0 },
    averageQuizScore: { type: Number, default: 0 },
    totalMistakesMade: { type: Number, default: 0 },
    totalMistakesCorrected: { type: Number, default: 0 },
    totalTimeInvested: { type: Number, default: 0 }, // in minutes
    lastActivityAt: Date
  },
  
  // Plan adjustments tracking
  planAdjustments: [{
    adjustmentDate: Date,
    reason: String, // 'weak-topic-repeat', 'fast-track-strong', 'pacing-adjustment'
    topicsAffected: [String],
    oldWeeks: [Number],
    newWeeks: [Number],
    automatedBy: {
      type: String,
      enum: ['user', 'copilot-recommendation', 'system-auto']
    }
  }],
  
  // Metadata
  metadata: {
    courseTitle: String,
    courseLevel: String,
    estimatedCompletionDate: Date,
    actualCompletionDate: Date,
    completionPercentage: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  }
}, {
  timestamps: true
});

// Indexes
learningMemorySchema.index({ userId: 1, courseId: 1 }, { unique: true });
learningMemorySchema.index({ 'quizHistory.attemptedAt': -1 });
learningMemorySchema.index({ 'statistics.lastActivityAt': -1 });
learningMemorySchema.index({ 'learningPatterns.consistencyScore': -1 });

// Method to record a quiz attempt
learningMemorySchema.methods.recordQuizAttempt = function(quizData) {
  const {
    quizId,
    topicName,
    score,
    maxScore,
    difficulty,
    timeSpent,
    questionsAnswered,
    questionsCorrect,
    keyLearnings = []
  } = quizData;

  const previousAttempts = this.quizHistory.filter(q => q.topicName === topicName);
  const attemptNumber = previousAttempts.length + 1;

  this.quizHistory.push({
    quizId,
    topicName,
    attemptNumber,
    score,
    maxScore,
    difficulty,
    timeSpent,
    questionsAnswered,
    questionsCorrect,
    attemptedAt: new Date(),
    keyLearnings
  });

  // Update statistics
  this.statistics.totalQuizzesTaken += 1;
  const allQuizzes = this.quizHistory;
  this.statistics.averageQuizScore = Math.round(
    allQuizzes.reduce((sum, q) => sum + (q.score / q.maxScore) * 100, 0) / allQuizzes.length
  );
  this.statistics.lastActivityAt = new Date();
};

// Method to log a mistake
learningMemorySchema.methods.recordMistake = function(mistakeData) {
  const {
    topic,
    concept,
    mistakeDescription,
    correctAnswer
  } = mistakeData;

  // Check if this mistake was recorded before
  const existingMistake = this.mistakeLog.find(
    m => m.topic === topic && m.concept === concept && !m.isCorrected
  );

  if (existingMistake) {
    existingMistake.occurrenceCount += 1;
    existingMistake.lastOccurredAt = new Date();
  } else {
    this.mistakeLog.push({
      mistakeId: new mongoose.Types.ObjectId(),
      topic,
      concept,
      mistakeDescription,
      correctAnswer,
      firstOccurredAt: new Date(),
      lastOccurredAt: new Date(),
      occurrenceCount: 1,
      isCorrected: false,
      reviewedCount: 0
    });
    this.statistics.totalMistakesMade += 1;
  }
};

// Method to mark mistake as corrected
learningMemorySchema.methods.correctMistake = function(mistakeId) {
  const mistake = this.mistakeLog.find(m => m.mistakeId.toString() === mistakeId.toString());
  if (mistake && !mistake.isCorrected) {
    mistake.isCorrected = true;
    mistake.correctedAt = new Date();
    this.statistics.totalMistakesCorrected += 1;
  }
};

// Method to calculate learning velocity
learningMemorySchema.methods.calculateLearningVelocity = function() {
  if (this.statistics.totalTopicsCovered === 0) return 'moderate';

  const avgTimePerTopic = this.statistics.totalTimeInvested / this.statistics.totalTopicsCovered;

  if (avgTimePerTopic < 30) return 'fast';
  if (avgTimePerTopic < 60) return 'moderate';
  if (avgTimePerTopic < 120) return 'slow';
  return 'slow';
};

// Method to get weak topics for review
learningMemorySchema.methods.getTopicsForReview = function() {
  return this.topicClassification.weak || [];
};

// Method to update learning patterns
learningMemorySchema.methods.updateLearningPatterns = function() {
  if (this.quizHistory.length === 0) return;

  const sessions = this.quizHistory;
  const totalTime = sessions.reduce((sum, q) => sum + q.timeSpent, 0);
  this.learningPatterns.averageSessionDuration = Math.round(totalTime / sessions.length);
  this.learningPatterns.learningVelocity = this.calculateLearningVelocity();

  // Calculate consistency score based on completion patterns
  const topicCoverageRatio = this.statistics.totalTopicsCovered / (this.statistics.totalTopicsCovered + this.topicClassification.weak.length + this.topicClassification.medium.length);
  const quizCompletionRatio = this.quizHistory.length > 0 ? 1 : 0;
  this.learningPatterns.consistencyScore = Math.round((topicCoverageRatio + quizCompletionRatio) / 2 * 100);
};

module.exports = mongoose.model('LearningMemory', learningMemorySchema);
