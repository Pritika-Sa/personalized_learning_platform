// OTP endpoints removed — feature deprecated
const express = require('express');
const router = express.Router();

router.use((req, res) => {
  res.status(410).json({ message: 'OTP verification has been removed' });
});

module.exports = router;