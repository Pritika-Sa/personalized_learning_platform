const mongoose = require('mongoose');

const courseSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true
  },
  instructor: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  category: {
    type: String,
    required: true
  },
  level: {
    type: String,
    enum: ['beginner', 'intermediate', 'advanced'],
    default: 'beginner'
  },
  duration: {
    type: Number, // in minutes
    required: true
  },
  price: {
    type: Number,
    default: 0
  },
  thumbnail: {
    type: String,
    default: ''
  },
  videos: [{
    title: String,
    description: String,
    url: String,
    duration: Number,
    thumbnail: String,
    order: Number
  }],
  assessmentMode: {
    type: String,
    enum: ['handmade', 'auto'],
    default: 'handmade'
  },
  assessments: [{
    title: String,
    description: String,
    questions: [{
      question: String,
      options: [String],
      correctAnswer: Number,
      explanation: String
    }],
    passingScore: {
      type: Number,
      default: 70
    }
  }],
  enrolledStudents: [{
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    enrolledAt: {
      type: Date,
      default: Date.now
    },
    progress: {
      type: Number,
      default: 0
    },
    completedVideos: [{
      type: mongoose.Schema.Types.ObjectId
    }],
    completedAssessments: [{
      assessmentId: mongoose.Schema.Types.ObjectId,
      score: Number,
      completedAt: Date
    }],
    certificateEarned: {
      type: Boolean,
      default: false
    },
    certificateEarnedAt: Date
  }],
  rating: {
    average: {
      type: Number,
      default: 0
    },
    count: {
      type: Number,
      default: 0
    }
  },
  tags: [String],
  materials: [{
    title: String,
    content: String, // Extracted text content
    type: { type: String, enum: ['pdf', 'note', 'ppt'], default: 'pdf' },
    url: String, // Original file URL
    fileId: String,
    isProcessed: { type: Boolean, default: false },
    chunks: [{
      text: String,
      pageNumber: Number,
      section: String,
      embedding: [Number]
    }]
  }],
  isPublished: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Virtual for reviews
courseSchema.virtual('reviews', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'course'
});

// Virtual for review count
courseSchema.virtual('reviewCount', {
  ref: 'Review',
  localField: '_id',
  foreignField: 'course',
  count: true
});

// Ensure virtual fields are serialized
courseSchema.set('toJSON', { virtuals: true });
courseSchema.set('toObject', { virtuals: true });

// Index for efficient querying
courseSchema.index({ title: 'text', description: 'text', tags: 'text' });
courseSchema.index({ category: 1, level: 1 });
courseSchema.index({ instructor: 1 });
courseSchema.index({ isPublished: 1 });

// Static method to get course with reviews
courseSchema.statics.getCourseWithReviews = async function (courseId, page = 1, limit = 10) {
  const course = await this.findById(courseId)
    .populate('instructor', 'username firstName lastName profilePicture')
    .populate({
      path: 'reviews',
      populate: {
        path: 'user',
        select: 'username firstName lastName profilePicture'
      },
      options: {
        sort: { createdAt: -1 },
        skip: (page - 1) * limit,
        limit: limit
      }
    });

  return course;
};

// Static method to get popular courses based on reviews
courseSchema.statics.getPopularCourses = async function (limit = 10) {
  return await this.aggregate([
    { $match: { isPublished: true } },
    {
      $lookup: {
        from: 'reviews',
        localField: '_id',
        foreignField: 'course',
        as: 'reviews'
      }
    },
    {
      $addFields: {
        reviewCount: { $size: '$reviews' },
        averageRating: { $avg: '$reviews.rating' }
      }
    },
    { $match: { reviewCount: { $gte: 1 } } },
    { $sort: { averageRating: -1, reviewCount: -1 } },
    { $limit: limit }
  ]);
};

module.exports = mongoose.model('Course', courseSchema);
