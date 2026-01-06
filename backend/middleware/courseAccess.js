const Course = require('../models/Course');

// Middleware to check if user has paid for a course or if course is free
const checkCourseAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // If course is free, allow access
    if (course.price === 0) {
      req.courseAccess = {
        hasAccess: true,
        isFree: true,
        hasPaid: false
      };
      return next();
    }

    // For paid courses, rely on enrollment rather than payment records
    const enrollment = course.enrolledStudents.find(
      student => student.student.toString() === userId.toString()
    );

    if (enrollment) {
      req.courseAccess = {
        hasAccess: true,
        isFree: false,
        hasPaid: false,
        enrollment: enrollment
      };
      return next();
    }

    // User is not enrolled
    req.courseAccess = {
      hasAccess: false,
      isFree: false,
      hasPaid: false
    };

    return res.status(403).json({ 
      message: 'Enrollment required to access this course',
      requiresEnrollment: true,
      coursePrice: course.price
    });

  } catch (error) {
    console.error('Course access check error:', error);
    res.status(500).json({ message: 'Failed to verify course access' });
  }
};

// Middleware to check if user has access to course content (videos, assessments, etc.)
const checkContentAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // Get course details
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Check if user is enrolled
    const enrollment = course.enrolledStudents.find(
      student => student.student.toString() === userId.toString()
    );

    if (!enrollment) {
      return res.status(403).json({ 
        message: 'You are not enrolled in this course',
        requiresEnrollment: true
      });
    }

    // If course is free, enrolled user has access
    if (course.price === 0) {
      req.courseAccess = {
        hasAccess: true,
        isFree: true,
        hasPaid: false,
        enrollment: enrollment
      };
      return next();
    }

    // For paid courses, allow access only if enrolled
    if (enrollment) {
      req.courseAccess = {
        hasAccess: true,
        isFree: false,
        hasPaid: false,
        enrollment: enrollment
      };
      return next();
    }

    return res.status(403).json({ 
      message: 'Enrollment required to access course content',
      requiresEnrollment: true,
      coursePrice: course.price
    });

  } catch (error) {
    console.error('Content access check error:', error);
    res.status(500).json({ message: 'Failed to verify content access' });
  }
};

// Middleware specifically for video access
const checkVideoAccess = async (req, res, next) => {
  try {
    const { courseId, videoId } = req.params;
    const userId = req.user._id;

    // First check basic course access
    await checkContentAccess(req, res, async () => {
      // Additional video-specific checks can be added here
      // For now, if user has course access, they have video access
      next();
    });

  } catch (error) {
    console.error('Video access check error:', error);
    res.status(500).json({ message: 'Failed to verify video access' });
  }
};

// Middleware for assessment access
const checkAssessmentAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // First check basic course access
    await checkContentAccess(req, res, async () => {
      // Additional assessment-specific checks
      const course = await Course.findById(courseId);
      
      // Check if user has completed required videos (optional logic)
      const enrollment = req.courseAccess.enrollment;
      const totalVideos = course.videos ? course.videos.length : 0;
      const completedVideos = enrollment.completedVideos ? enrollment.completedVideos.length : 0;
      
      // For now, allow assessment access if user has course access
      // You can add more restrictions here if needed
      req.assessmentAccess = {
        ...req.courseAccess,
        canTakeAssessment: true,
        videosCompleted: completedVideos,
        totalVideos: totalVideos
      };
      
      next();
    });

  } catch (error) {
    console.error('Assessment access check error:', error);
    res.status(500).json({ message: 'Failed to verify assessment access' });
  }
};

// Middleware for certificate access
const checkCertificateAccess = async (req, res, next) => {
  try {
    const { courseId } = req.params;
    const userId = req.user._id;

    // First check basic course access
    await checkContentAccess(req, res, async () => {
      const course = await Course.findById(courseId);
      const enrollment = req.courseAccess.enrollment;
      
      // Check if user has completed the course
      if (!enrollment.certificateEarned) {
        return res.status(403).json({ 
          message: 'Course completion required for certificate access',
          requiresCompletion: true
        });
      }
      
      req.certificateAccess = {
        ...req.courseAccess,
        canAccessCertificate: true,
        certificateEarned: enrollment.certificateEarned,
        certificateEarnedAt: enrollment.certificateEarnedAt
      };
      
      next();
    });

  } catch (error) {
    console.error('Certificate access check error:', error);
    res.status(500).json({ message: 'Failed to verify certificate access' });
  }
};

// Helper function to check payment status without middleware
const checkPaymentStatus = async (userId, courseId) => {
  try {
    const course = await Course.findById(courseId);
    if (!course) {
      return { error: 'Course not found' };
    }

    if (course.price === 0) {
      return {
        isFree: true,
        hasPaid: false,
        hasAccess: true,
        coursePrice: 0
      };
    }

    // Rely on enrollment status instead of payment records
    const enrollmentRecord = course.enrolledStudents.find(
      student => student.student.toString() === userId.toString()
    );

    return {
      isFree: false,
      hasPaid: false,
      hasAccess: !!enrollmentRecord,
      coursePrice: course.price,
      paymentDetails: null
    };

  } catch (error) {
    console.error('Payment status check error:', error);
    return { error: 'Failed to check payment status' };
  }
};

module.exports = {
  checkCourseAccess,
  checkContentAccess,
  checkVideoAccess,
  checkAssessmentAccess,
  checkCertificateAccess,
  checkPaymentStatus
};