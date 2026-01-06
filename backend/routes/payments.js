// Payments feature removed: endpoints deprecated
const express = require('express');
const router = express.Router();

router.use((req, res) => {
  res.status(410).json({ message: 'Payments feature has been removed. Courses are available without purchase.' });
});

module.exports = router;

module.exports = router;