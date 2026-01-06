const mongoose = require('mongoose');

/**
 * TopicMastery Schema
 * Tracks detailed mastery progress for individual topics within a course
 * - Maintains topic-level knowledge state (weak/medium/strong)
 * - Records quiz attempts and performance history
 * - Used for adaptive plan adjustment and copilot recommendations
 */
const topicMasterySchema = new mongoose.Schema({
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
  
  // Topic information
  topicName: {
    type: String,
    required: true,
    trim: true
  },
  topicOrder: {
    type: Number,
    default: 0
  },
  
  // Mastery tracking (0-100 scale)
  masteryScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Classification based on mastery score
  classification: {
    type: String,
    enum: ['weak', 'medium', 'strong'],
    default: 'weak'
  },
  
  // Learning statistics
  quizAttempts: {
    type: Number,
    default: 0
  },
  practiceSessionsCompleted: {
    type: Number,
    default: 0
  },
  totalTimeSpent: {
    type: Number, // in minutes
    default: 0
  },
  
  // Performance data
  averageQuizScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  highestQuizScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  lowestQuizScore: {
    type: Number,
    default: 0,
    min: 0,
    max: 100
  },
  
  // Quiz performance tracking
  recentQuizzes: [{
    quizId: mongoose.Schema.Types.ObjectId,
    score: Number,
    attemptedAt: Date,
    difficulty: String,
    timeSpent: Number
  }],
  
  // Weak areas within the topic
  weakAreas: {
    type: [String],
    default: []
  },
  
  // Milestones
  completedAt: Date,
  firstAttemptAt: Date,
  lastStudiedAt: Date,
  
  // Metadata for copilot insights
  metadata: {
    conceptsUnderstood: [String],
    conceptsToReview: [String],
    learningSpeed: {
      type: String,
      enum: ['slow', 'moderate', 'fast'],
      default: 'moderate'
    },
    preferredLearningStyle: String,
    mistakesTracked: [{
      mistake: String,
      firstOccurredAt: Date,
      occurrences: Number,
      correctedAt: Date
    }]
  }
}, {
  timestamps: true
});

// Indexes for efficient queries
topicMasterySchema.index({ userId: 1, courseId: 1 });
topicMasterySchema.index({ userId: 1, courseId: 1, topicName: 1 }, { unique: true });
topicMasterySchema.index({ classification: 1 });
topicMasterySchema.index({ lastStudiedAt: -1 });

// Pre-save hook to automatically classify based on mastery score
topicMasterySchema.pre('save', function(next) {
  if (this.masteryScore < 40) {
    this.classification = 'weak';
  } else if (this.masteryScore < 75) {
    this.classification = 'medium';
  } else {
    this.classification = 'strong';
  }
  next();
});

// Method to update mastery based on quiz results
topicMasterySchema.methods.updateMasteryFromQuiz = function(quizScore, quizId, difficulty, timeSpent) {
  this.quizAttempts += 1;
  
  // Record the quiz attempt
  this.recentQuizzes.push({
    quizId,
    score: quizScore,
    attemptedAt: new Date(),
    difficulty,
    timeSpent
  });
  
  // Keep only last 10 quizzes for space efficiency
  if (this.recentQuizzes.length > 10) {
    this.recentQuizzes.shift();
  }
  
  // Update scores
  if (this.quizAttempts === 1) {
    this.firstAttemptAt = new Date();
    this.highestQuizScore = quizScore;
    this.lowestQuizScore = quizScore;
  }
  
  // Update highest/lowest
  if (quizScore > this.highestQuizScore) {
    this.highestQuizScore = quizScore;
  }
  if (quizScore < this.lowestQuizScore) {
    this.lowestQuizScore = quizScore;
  }
  
  // Calculate average
  const totalScore = this.recentQuizzes.reduce((sum, q) => sum + q.score, 0);
  this.averageQuizScore = Math.round(totalScore / this.recentQuizzes.length);
  
  // Update overall mastery score (70% recent performance, 30% historical)
  const recentWeight = 0.7;
  const historicalWeight = 0.3;
  this.masteryScore = Math.round(
    (this.averageQuizScore * recentWeight) + (this.masteryScore * historicalWeight)
  );
  
  this.lastStudiedAt = new Date();
};

// Method to get weak areas needing review
topicMasterySchema.methods.getWeakAreas = function() {
  const incorrectConcepts = this.metadata?.mistakesTracked || [];
  return incorrectConcepts
    .sort((a, b) => b.occurrences - a.occurrences)
    .map(item => item.mistake)
    .slice(0, 5);
};

module.exports = mongoose.model('TopicMastery', topicMasterySchema);
