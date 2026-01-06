// Debug endpoint to test authentication
const express = require('express');
const { auth } = require('../middleware/auth');
const Course = require('../models/Course');

const router = express.Router();

// Test auth endpoint
router.get('/test-auth', auth, (req, res) => {
  res.json({
    success: true,
    message: 'Authentication working',
    user: {
      id: req.user.id,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
    },
    timestamp: new Date().toISOString()
  });
});

// Test payment status without auth requirement (for debugging)
router.get('/test-payment-status/:courseId', async (req, res) => {
  try {
    const { courseId } = req.params;
    
    // Just return a mock status for debugging
    res.json({
      isFree: false,
      isEnrolled: false,
      hasPaid: false,
      canAccess: false,
      debug: {
        courseId,
        endpoint: 'test-payment-status',
        timestamp: new Date().toISOString(),
        message: 'This is a debug endpoint'
      }
    });
  } catch (error) {
    res.status(500).json({
      message: 'Debug endpoint error',
      error: error.message
    });
  }
});

// Test payment simulation removed because payments feature was disabled
router.post('/test-payment', auth, async (req, res) => {
  res.status(501).json({ message: 'Payments feature disabled' });
});

module.exports = router;