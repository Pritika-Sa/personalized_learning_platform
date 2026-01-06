const express = require('express');
const Assessment = require('../models/Assessment');
const AssessmentProgress = require('../models/AssessmentProgress');
const { auth } = require('../middleware/auth');

const router = express.Router();

// Save assessment progress
router.post('/progress/:courseId', auth, async (req, res) => {
  try {
    const { answers, currentQuestion, timeLeft, timestamp } = req.body;
    const courseIdParam = req.params.courseId;
    const userId = req.user._id;

    let actualCourseId = courseIdParam;

    // Check if courseId is a valid ObjectId, if not try to find by slug
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseIdParam) || courseIdParam.length !== 24) {
      const Course = require('../models/Course');
      const courses = await Course.find();
      const course = courses.find(c => {
        const courseSlug = c.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return courseSlug === courseIdParam;
      });

      if (course) {
        actualCourseId = course._id;
      } else {
        return res.status(404).json({ message: 'Course not found' });
      }
    }

    const courseId = actualCourseId;

    // Find existing progress or create new
    let progress = await AssessmentProgress.findOne({ userId, courseId });


    if (progress) {
      progress.answers = answers;
      progress.currentQuestion = currentQuestion;
      progress.timeLeft = timeLeft;
      progress.lastUpdated = new Date();
    } else {
      progress = new AssessmentProgress({
        userId,
        courseId,
        answers,
        currentQuestion,
        timeLeft,
        lastUpdated: new Date()
      });
    }

    await progress.save();

    res.json({
      message: 'Progress saved successfully',
      progress: {
        answers: progress.answers,
        currentQuestion: progress.currentQuestion,
        timeLeft: progress.timeLeft
      }
    });
  } catch (error) {
    console.error('Save progress error:', error);
    res.status(500).json({ message: 'Failed to save progress' });
  }
});

// Get assessment progress
router.get('/progress/:courseId', auth, async (req, res) => {
  try {
    const courseIdParam = req.params.courseId;
    const userId = req.user._id;

    let actualCourseId = courseIdParam;

    // Check if courseId is a valid ObjectId, if not try to find by slug
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseIdParam) || courseIdParam.length !== 24) {
      const Course = require('../models/Course');
      const courses = await Course.find();
      const course = courses.find(c => {
        const courseSlug = c.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return courseSlug === courseIdParam;
      });

      if (course) {
        actualCourseId = course._id;
      } else {
        return res.status(404).json({ message: 'Course not found' });
      }
    }

    const progress = await AssessmentProgress.findOne({ userId, courseId: actualCourseId });

    if (progress) {
      res.json({
        progress: {
          answers: progress.answers,
          currentQuestion: progress.currentQuestion,
          timeLeft: progress.timeLeft,
          lastUpdated: progress.lastUpdated
        }
      });
    } else {
      res.json({ progress: null });
    }
  } catch (error) {
    console.error('Get progress error:', error);
    res.status(500).json({ message: 'Failed to get progress' });
  }
});

// Delete assessment progress
router.delete('/progress/:courseId', auth, async (req, res) => {
  try {
    const courseIdParam = req.params.courseId;
    const userId = req.user._id;

    let actualCourseId = courseIdParam;

    // Check if courseId is a valid ObjectId, if not try to find by slug
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseIdParam) || courseIdParam.length !== 24) {
      const Course = require('../models/Course');
      const courses = await Course.find();
      const course = courses.find(c => {
        const courseSlug = c.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return courseSlug === courseIdParam;
      });

      if (course) {
        actualCourseId = course._id;
      } else {
        return res.status(404).json({ message: 'Course not found' });
      }
    }

    await AssessmentProgress.findOneAndDelete({ userId, courseId: actualCourseId });

    res.json({ message: 'Progress cleared successfully' });
  } catch (error) {
    console.error('Delete progress error:', error);
    res.status(500).json({ message: 'Failed to clear progress' });
  }
});

// Save assessment result
router.post('/result', auth, async (req, res) => {
  try {
    const { courseId, result, questions } = req.body;
    const userId = req.user._id;

    const assessment = new Assessment({
      userId,
      courseId,
      score: result.score,
      passed: result.passed,
      totalQuestions: result.totalQuestions,
      correctAnswers: result.correctAnswers,
      timeTaken: result.timeTaken,
      answers: result.answers,
      questions: questions,
      completedAt: result.completedAt,
      status: result.passed ? 'passed' : 'failed'
    });

    const savedAssessment = await assessment.save();

    res.status(201).json({
      message: 'Assessment result saved successfully',
      assessment: savedAssessment
    });
  } catch (error) {
    console.error('Save assessment result error:', error);
    res.status(500).json({ message: 'Failed to save assessment result' });
  }
});

// Get assessment results for a user
router.get('/results/user/:userId', auth, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.params.userId })
      .populate('courseId', 'title category level')
      .sort({ completedAt: -1 });

    res.json(assessments);
  } catch (error) {
    console.error('Get assessment results error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment results' });
  }
});

// Get assessment results for a course
router.get('/results/course/:courseId', auth, async (req, res) => {
  try {
    const courseIdParam = req.params.courseId;

    let actualCourseId = courseIdParam;

    // Check if courseId is a valid ObjectId, if not try to find by slug
    const mongoose = require('mongoose');
    if (!mongoose.Types.ObjectId.isValid(courseIdParam) || courseIdParam.length !== 24) {
      const Course = require('../models/Course');
      const courses = await Course.find();
      const course = courses.find(c => {
        const courseSlug = c.title.toLowerCase().replace(/[^a-z0-9]/g, '-');
        return courseSlug === courseIdParam;
      });

      if (course) {
        actualCourseId = course._id;
      } else {
        return res.status(404).json({ message: 'Course not found' });
      }
    }

    const assessments = await Assessment.find({ courseId: actualCourseId })
      .populate('userId', 'firstName lastName email')
      .sort({ completedAt: -1 });

    res.json(assessments);
  } catch (error) {
    console.error('Get course assessment results error:', error);
    res.status(500).json({ message: 'Failed to fetch course assessment results' });
  }
});

// Get assessment statistics
router.get('/stats/user/:userId', auth, async (req, res) => {
  try {
    const assessments = await Assessment.find({ userId: req.params.userId });

    const stats = {
      totalAssessments: assessments.length,
      passedAssessments: assessments.filter(a => a.passed).length,
      failedAssessments: assessments.filter(a => !a.passed).length,
      averageScore: assessments.length > 0
        ? assessments.reduce((sum, assessment) => sum + assessment.score, 0) / assessments.length
        : 0,
      totalTimeSpent: assessments.reduce((sum, assessment) => sum + assessment.timeTaken, 0),
      assessmentsByMonth: {}
    };

    // Group assessments by month
    assessments.forEach(assessment => {
      const month = new Date(assessment.completedAt).toISOString().slice(0, 7); // YYYY-MM
      stats.assessmentsByMonth[month] = (stats.assessmentsByMonth[month] || 0) + 1;
    });

    res.json(stats);
  } catch (error) {
    console.error('Get assessment stats error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment statistics' });
  }
});

// Get specific assessment result
router.get('/result/:assessmentId', auth, async (req, res) => {
  try {
    const assessment = await Assessment.findById(req.params.assessmentId)
      .populate('courseId', 'title category level instructor')
      .populate('userId', 'firstName lastName email');

    if (!assessment) {
      return res.status(404).json({ message: 'Assessment result not found' });
    }

    res.json(assessment);
  } catch (error) {
    console.error('Get assessment result error:', error);
    res.status(500).json({ message: 'Failed to fetch assessment result' });
  }
});

module.exports = router;
