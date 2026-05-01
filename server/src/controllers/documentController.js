'use strict';

const fs = require('fs');
const path = require('path');
const { extract } = require('../services/documentExtractor');

async function extractDocument(req, res, next) {
  let filePath = null;

  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded. Please attach a document (PDF, JPG, PNG).',
      });
    }

    filePath = req.file.path;
    const mimeType = req.file.mimetype;

    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
      'image/tiff',
      'image/bmp',
    ];

    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${mimeType}. Please upload PDF, JPG, PNG, or WEBP.`,
      });
    }

    // Run extraction
    const result = await extract(filePath, mimeType);

    if (!result.success) {
      return res.status(422).json({
        success: false,
        message: result.error,
        hint: 'Try uploading a clearer scan or a PDF version of the document.',
      });
    }

    return res.json({
      success: true,
      data: {
        documentType: result.documentType,
        ocrEngine: result.ocrEngine,
        processingTime: result.processingTime,
        extractionRate: result.extractionRate,
        extractedCount: result.extractedCount,
        fields: result.fields,
        confidenceMap: result.confidenceMap,
        rawTextPreview: result.rawTextPreview,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    // Always clean up uploaded temp file
    if (filePath && fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  }
}

module.exports = { extractDocument };
