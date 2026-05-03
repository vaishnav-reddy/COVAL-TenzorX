'use strict';

const fs = require('fs');
const path = require('path');

// Confidence rank — higher = more trustworthy
const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };

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

    const allowedTypes = [
      'application/pdf', 'image/jpeg', 'image/jpg',
      'image/png', 'image/webp', 'image/tiff', 'image/bmp',
    ];

    if (!allowedTypes.includes(mimeType)) {
      return res.status(400).json({
        success: false,
        message: `Unsupported file type: ${mimeType}. Please upload PDF, JPG, PNG, or WEBP.`,
      });
    }

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
        isLandRecord: result.isLandRecord,
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
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

/**
 * POST /api/documents/extract-multi
 * Accepts up to 5 files, runs OCR on each in parallel,
 * then merges all results — higher-confidence fields win.
 */
async function extractDocuments(req, res, next) {
  const filePaths = [];

  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No files uploaded.',
      });
    }

    // Track paths for cleanup
    for (const f of req.files) filePaths.push(f.path);

    // Run all extractions in parallel
    const perFileResults = await Promise.all(
      req.files.map(async (f) => {
        try {
          const result = await extract(f.path, f.mimetype);
          return {
            fileName: f.originalname,
            success: result.success,
            documentType: result.documentType,
            isLandRecord: result.isLandRecord,
            ocrEngine: result.ocrEngine,
            processingTime: result.processingTime,
            extractionRate: result.success ? result.extractionRate : 0,
            extractedCount: result.success ? result.extractedCount : 0,
            fields: result.success ? result.fields : {},
            confidenceMap: result.success ? result.confidenceMap : {},
            error: result.success ? null : result.error,
          };
        } catch (err) {
          return {
            fileName: f.originalname,
            success: false,
            documentType: 'UNKNOWN',
            isLandRecord: false,
            ocrEngine: 'none',
            processingTime: 0,
            extractionRate: 0,
            extractedCount: 0,
            fields: {},
            confidenceMap: {},
            error: err.message,
          };
        }
      })
    );

    // Merge: for each field, keep the value with the highest confidence
    const mergedFields = {};
    const mergedConfidenceMap = {};
    const mergedSources = {}; // track which file each field came from

    for (const fileResult of perFileResults) {
      if (!fileResult.success) continue;

      for (const [key, value] of Object.entries(fileResult.fields)) {
        const conf = fileResult.confidenceMap[key];
        const existingConf = mergedConfidenceMap[key];

        const newRank = CONFIDENCE_RANK[conf?.confidence] || 0;
        const existingRank = CONFIDENCE_RANK[existingConf?.confidence] || 0;

        // Take this value if: field not yet seen, OR new confidence is higher
        if (!mergedFields[key] || newRank > existingRank) {
          mergedFields[key] = value;
          mergedConfidenceMap[key] = conf;
          mergedSources[key] = fileResult.fileName;
        }
      }
    }

    const extractedCount = Object.keys(mergedFields).length;
    const totalPossibleFields = 14; // standard field count
    const extractionRate = Math.round((extractedCount / totalPossibleFields) * 100);

    // Determine overall document type (prefer non-UNKNOWN, prefer land records)
    const successfulResults = perFileResults.filter(r => r.success);
    const landRecordResult = successfulResults.find(r => r.isLandRecord);
    const primaryResult = landRecordResult || successfulResults[0];

    return res.json({
      success: true,
      data: {
        // Merged result
        fields: mergedFields,
        confidenceMap: mergedConfidenceMap,
        fieldSources: mergedSources,
        extractedCount,
        extractionRate,
        documentType: primaryResult?.documentType || 'UNKNOWN',
        isLandRecord: !!landRecordResult,
        // Per-file breakdown
        perFile: perFileResults,
        totalFiles: req.files.length,
        successfulFiles: successfulResults.length,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    // Clean up all temp files
    for (const fp of filePaths) {
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
    }
  }
}

module.exports = { extractDocument, extractDocuments };

