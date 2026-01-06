const express = require('express');
const { auth } = require('../middleware/auth');
const User = require('../models/User');
const Course = require('../models/Course');
const Assessment = require('../models/Assessment');
const AssessmentProgress = require('../models/AssessmentProgress');

const router = express.Router();

// Get user dashboard data
router.get('/dashboard', auth, async (req, res) => {
  try {
    const userId = req.user._id;

    // Get user details
    const user = await User.findById(userId).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Get enrolled courses
    const enrolledCourses = await Course.find({
      'enrolledStudents.student': userId
    }).select('title thumbnail price level rating students enrolledStudents');

    // Get completed courses
    const completedCourses = enrolledCourses.filter(course => {
      const enrollment = course.enrolledStudents.find(
        e => e.student.toString() === userId.toString()
      );
      return enrollment && enrollment.progress === 100;
    });

    // Get assessment attempts (simplified without populate to avoid errors)
    const assessmentAttempts = await AssessmentProgress.find({
      userId: userId
    });

    // Calculate stats
    const stats = {
      totalCourses: enrolledCourses.length,
      completedCourses: completedCourses.length,
      inProgressCourses: enrolledCourses.length - completedCourses.length,
      assessmentAttempts: assessmentAttempts.length,
      totalLearningHours: Math.round(enrolledCourses.reduce((total, course) => {
        const enrollment = course.enrolledStudents.find(
          e => e.student.toString() === userId.toString()
        );
        return total + (enrollment ? (enrollment.progress || 0) / 10 : 0); // Convert progress to hours estimate
      }, 0))
    };

    res.json({
      user: {
        id: user._id,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      stats,
      enrolledCourses: enrolledCourses.map(course => ({
        id: course._id,
        title: course.title,
        thumbnail: course.thumbnail,
        price: course.price,
        level: course.level,
        rating: course.rating,
        students: course.students,
        progress: course.enrolledStudents.find(
          e => e.student.toString() === userId.toString()
        )?.progress || 0
      })),
      recentActivity: assessmentAttempts.slice(-5).map(attempt => ({
        type: 'assessment',
        courseId: attempt.courseId,
        courseTitle: 'Assessment Progress',
        date: attempt.lastUpdated,
        progress: attempt.currentQuestion || 0
      }))
    });

  } catch (error) {
    console.error('Dashboard data error:', error);
    res.status(500).json({ message: 'Failed to fetch dashboard data' });
  }
});

// Get user profile
router.get('/profile', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    res.json(user);
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({ message: 'Failed to fetch profile' });
  }
});

// Update user profile
router.put('/profile', auth, async (req, res) => {
  try {
    const { name, email } = req.body;
    const user = await User.findByIdAndUpdate(
      req.user._id,
      { name, email },
      { new: true, select: '-password' }
    );
    res.json(user);
  } catch (error) {
    console.error('Profile update error:', error);
    res.status(500).json({ message: 'Failed to update profile' });
  }
});

module.exports = router;