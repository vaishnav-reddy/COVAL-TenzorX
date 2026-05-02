'use strict';

const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const os = require('os');
const { extractDocument, extractDocuments } = require('../controllers/documentController');

// Store uploads in OS temp dir — cleaned up after processing
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, os.tmpdir()),
  filename: (req, file, cb) => {
    const unique = `coval_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 15 * 1024 * 1024, // 15 MB max
  },
  fileFilter: (req, file, cb) => {
    const allowed = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/bmp',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`File type ${file.mimetype} not supported`));
    }
  },
});

// POST /api/documents/extract  (single file — legacy)
router.post('/extract', upload.single('document'), extractDocument);

// POST /api/documents/extract-multi  (up to 5 files, merged result)
router.post('/extract-multi', upload.array('documents', 5), extractDocuments);

module.exports = router;
