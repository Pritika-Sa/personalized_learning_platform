const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { auth, requireRole } = require('../middleware/auth');

const router = express.Router();

const RAGService = require('../services/RAGService');

const videoDir = path.join(__dirname, '..', 'public', 'videos');
if (!fs.existsSync(videoDir)) {
  fs.mkdirSync(videoDir, { recursive: true });
}

const videoStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, videoDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, safe);
  }
});

const uploadVideo = multer({ storage: videoStorage });

const materialDir = path.join(__dirname, '..', 'public', 'materials');
if (!fs.existsSync(materialDir)) {
  fs.mkdirSync(materialDir, { recursive: true });
}

const materialStorage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, materialDir);
  },
  filename: function (req, file, cb) {
    const safe = Date.now() + '-' + file.originalname.replace(/[^a-zA-Z0-9_.-]/g, '_');
    cb(null, safe);
  }
});

const uploadMaterial = multer({ storage: materialStorage });

// POST /api/uploads/video -> returns { url }
router.post('/video', auth, requireRole(['admin', 'instructor']), uploadVideo.single('file'), (req, res) => {
  try {
    const filename = req.file.filename;
    const url = `${process.env.BACKEND_PUBLIC_URL || `http://localhost:${process.env.PORT || 5001}`}/static/videos/${filename}`;
    res.json({ url, filename });
  } catch (e) {
    res.status(500).json({ message: 'Upload failed' });
  }
});

/**
 * POST /api/uploads/material
 * Upload a PDF material and process it for RAG
 * Body: { courseId }
 * File: 'file'
 */
router.post('/material', auth, requireRole(['admin', 'instructor']), uploadMaterial.single('file'), async (req, res) => {
  try {
    const { courseId } = req.body;
    if (!courseId) return res.status(400).json({ message: 'courseId is required' });

    const material = await RAGService.addMaterialToCourse(courseId, {
      path: req.file.path,
      originalname: req.file.originalname
    });

    res.json({ success: true, material });
  } catch (error) {
    console.error('Material upload error:', error);
    res.status(500).json({ message: 'Failed to upload and process material' });
  }
});

module.exports = router;


