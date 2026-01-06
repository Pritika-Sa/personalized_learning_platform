const express = require('express');
const router = express.Router();
const Review = require('../models/Review');
const Course = require('../models/Course');
const User = require('../models/User');
const { auth } = require('../middleware/auth');
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


// @route   GET /api/reviews/course/:courseId
// @desc    Get reviews for a specific course
// @access  Public
router.get('/course/:courseId', async (req, res) => {
  try {
    const { courseId: idOrSlug } = req.params;
    const { page = 1, limit = 10, sortBy = 'createdAt' } = req.query;

    // Validate course exists
    const course = await resolveCourse(idOrSlug);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const courseId = course._id;

    const reviews = await Review.getCourseReviews(
      courseId,
      parseInt(page),
      parseInt(limit),
      sortBy
    );

    const totalReviews = await Review.countDocuments({ course: courseId });

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / parseInt(limit)),
        totalReviews,
        hasNext: parseInt(page) * parseInt(limit) < totalReviews,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching course reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/user/:userId
// @desc    Get reviews by a specific user
// @access  Public
router.get('/user/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    const { page = 1, limit = 10 } = req.query;

    // Validate user exists
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    const reviews = await Review.getUserReviews(
      userId,
      parseInt(page),
      parseInt(limit)
    );

    const totalReviews = await Review.countDocuments({ user: userId });

    res.json({
      reviews,
      pagination: {
        currentPage: parseInt(page),
        totalPages: Math.ceil(totalReviews / parseInt(limit)),
        totalReviews,
        hasNext: parseInt(page) * parseInt(limit) < totalReviews,
        hasPrev: parseInt(page) > 1
      }
    });
  } catch (error) {
    console.error('Error fetching user reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/course/:courseId/rating
// @desc    Get course rating summary
// @access  Public
router.get('/course/:courseId/rating', async (req, res) => {
  try {
    const { courseId: idOrSlug } = req.params;

    // Validate course exists
    const course = await resolveCourse(idOrSlug);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const courseId = course._id;

    const ratingData = await Review.calculateCourseRating(courseId);
    res.json(ratingData);
  } catch (error) {
    console.error('Error fetching course rating:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/course/:courseId/can-review
// @desc    Check if user can review a course
// @access  Private
router.get('/course/:courseId/can-review', auth, async (req, res) => {
  try {
    const { courseId: idOrSlug } = req.params;
    const userId = req.user.id;

    const course = await resolveCourse(idOrSlug);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }
    const courseId = course._id;

    const canReview = await Review.canUserReview(userId, courseId);
    res.json(canReview);
  } catch (error) {
    console.error('Error checking review eligibility:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/reviews
// @desc    Create a new review
// @access  Private
router.post('/', auth, async (req, res) => {
  try {
    const { courseId: idOrSlug, rating, title, comment } = req.body;
    const userId = req.user._id;

    console.log('Creating review:', { courseId: idOrSlug, rating, title, comment, userId });

    // Validate required fields
    if (!idOrSlug || !rating || !title || !comment) {
      return res.status(400).json({
        message: 'Please provide courseId, rating, title, and comment'
      });
    }

    // Validate rating
    if (rating < 1 || rating > 5) {
      return res.status(400).json({
        message: 'Rating must be between 1 and 5'
      });
    }

    // Check if course exists
    const course = await resolveCourse(idOrSlug);
    if (!course) {
      return res.status(404).json({
        message: 'Course not found'
      });
    }
    const courseId = course._id;

    // Check if user can review
    const canReview = await Review.canUserReview(userId, courseId);
    if (!canReview.canReview) {
      console.log('User cannot review:', canReview.reason);
      return res.status(400).json({
        message: 'You cannot review this course',
        reason: canReview.reason
      });
    }

    // Create review
    const review = new Review({
      course: courseId,
      user: userId,
      rating,
      title,
      comment,
      isVerified: true // Auto-verify for completed courses
    });

    await review.save();
    await review.populate('user', 'username firstName lastName profilePicture');

    console.log('Review created successfully:', review._id);

    res.status(201).json({
      message: 'Review created successfully',
      review
    });
  } catch (error) {
    console.error('Error creating review:', error);
    if (error.code === 11000) {
      return res.status(400).json({
        message: 'You have already reviewed this course'
      });
    }
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/reviews/:reviewId
// @desc    Update a review
// @access  Private
router.put('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { rating, title, comment } = req.body;
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns the review
    if (review.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this review' });
    }

    // Update review
    if (rating !== undefined) {
      if (rating < 1 || rating > 5) {
        return res.status(400).json({
          message: 'Rating must be between 1 and 5'
        });
      }
      review.rating = rating;
    }

    if (title !== undefined) review.title = title;
    if (comment !== undefined) review.comment = comment;
    review.updatedAt = new Date();

    await review.save();
    await review.populate('user', 'username firstName lastName profilePicture');

    res.json({
      message: 'Review updated successfully',
      review
    });
  } catch (error) {
    console.error('Error updating review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/reviews/:reviewId
// @desc    Delete a review
// @access  Private
router.delete('/:reviewId', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user owns the review or is admin
    if (review.user.toString() !== userId.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized to delete this review' });
    }

    await review.remove();

    res.json({ message: 'Review deleted successfully' });
  } catch (error) {
    console.error('Error deleting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/reviews/:reviewId/helpful
// @desc    Mark a review as helpful
// @access  Private
router.post('/:reviewId/helpful', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const userId = req.user._id;

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is trying to mark their own review as helpful
    if (review.user.toString() === userId.toString()) {
      return res.status(400).json({
        message: 'You cannot mark your own review as helpful'
      });
    }

    await review.markHelpful(userId);

    res.json({
      message: 'Review helpful status updated',
      helpfulCount: review.helpful.count,
      isHelpful: review.helpful.users.includes(userId)
    });
  } catch (error) {
    console.error('Error updating review helpful status:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/reviews/:reviewId/report
// @desc    Report a review
// @access  Private
router.post('/:reviewId/report', auth, async (req, res) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    // Validate reason
    const validReasons = ['inappropriate', 'spam', 'fake', 'other'];
    if (!reason || !validReasons.includes(reason)) {
      return res.status(400).json({
        message: 'Please provide a valid report reason'
      });
    }

    // Find review
    const review = await Review.findById(reviewId);
    if (!review) {
      return res.status(404).json({ message: 'Review not found' });
    }

    // Check if user is trying to report their own review
    if (review.user.toString() === userId) {
      return res.status(400).json({
        message: 'You cannot report your own review'
      });
    }

    // Update review
    review.isReported = true;
    review.reportReason = reason;
    await review.save();

    res.json({ message: 'Review reported successfully' });
  } catch (error) {
    console.error('Error reporting review:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/reviews/recent
// @desc    Get recent reviews across all courses
// @access  Public
router.get('/recent', async (req, res) => {
  try {
    const { limit = 10 } = req.query;

    const reviews = await Review.find()
      .populate('user', 'username firstName lastName profilePicture')
      .populate('course', 'title thumbnail category level')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit));

    res.json(reviews);
  } catch (error) {
    console.error('Error fetching recent reviews:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
