'use strict';
/**
 * documentController.js
 * Primary: Gemini AI extraction (all files in one call).
 * Fallback: regex/pdf-parse when Gemini is unavailable (403/quota/no key).
 */

const fs   = require('fs');
const path = require('path');
const { extractFields, detectDocType, scoreConfidence } = require('./fieldExtractor');
const { extractWithGemini, normalise } = require('../services/geminiOCR');

const CONFIDENCE_RANK = { high: 3, medium: 2, low: 1 };
const TOTAL_POSSIBLE  = 26;

// ---------------------------------------------------------------------------
// Gemini availability check
// ---------------------------------------------------------------------------
function geminiAvailable() {
  const key = process.env.GEMINI_API_KEY;
  return !!(key && key !== 'your_gemini_api_key_here');
}

// Errors that mean Gemini won't work regardless of retry
function isHardGeminiError(err) {
  const msg = (err.message || '').toLowerCase();
  return msg.includes('403') || msg.includes('forbidden') ||
         msg.includes('api key') || msg.includes('api_key') ||
         msg.includes('denied') || msg.includes('not found for api version');
}

// ---------------------------------------------------------------------------
// Raw text extraction (PDF parse → Tesseract fallback)
// ---------------------------------------------------------------------------
async function extractRawText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (mimeType === 'application/pdf' || ext === '.pdf') {
    try {
      const pdfParse = require('pdf-parse');
      const data = await pdfParse(fs.readFileSync(filePath));
      if (data.text && data.text.replace(/\s/g, '').length >= 80)
        return { text: data.text, method: 'pdf-parse' };
    } catch { /* scanned PDF, fall through */ }
  }
  try {
    const { createWorker } = require('tesseract.js');
    const worker = await createWorker(['eng', 'hin'], 1, { logger: () => {} });
    const { data } = await worker.recognize(filePath);
    await worker.terminate();
    return { text: data.text || '', method: 'tesseract' };
  } catch {
    return { text: '', method: 'tesseract' };
  }
}

// ---------------------------------------------------------------------------
// Regex field map builder
// ---------------------------------------------------------------------------
function buildRegexFields(extracted, fileName, confScore) {
  const globalConf = confScore >= 75 ? 'high' : confScore >= 45 ? 'medium' : 'low';
  const fields = {}, confidenceMap = {};

  function set(key, value, conf) {
    const c = conf || globalConf;
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    fields[key] = value;
    confidenceMap[key] = { confidence: c, source: fileName };
  }

  const p = extracted;
  set('applicantName',     p.applicantName,     p.applicantName     ? 'high'   : globalConf);
  set('applicantPAN',      p.applicantPAN,      p.applicantPAN      ? 'high'   : globalConf);
  set('applicantPhone',    p.applicantPhone,    p.applicantPhone    ? 'high'   : globalConf);
  set('applicantEmail',    p.applicantEmail,    p.applicantEmail    ? 'medium' : globalConf);
  set('propertyType',      p.propertyType,      p.propertyType      ? 'high'   : globalConf);
  set('propertySubType',   p.propertySubType,   p.propertySubType   ? 'medium' : globalConf);
  set('purpose',           p.purpose,           p.purpose           ? 'high'   : globalConf);
  set('city',              p.city,              p.city              ? 'high'   : globalConf);
  set('locality',          p.locality,          p.locality          ? 'medium' : globalConf);
  set('pincode',           p.pincode,           p.pincode           ? 'high'   : globalConf);
  if (p.areaSqft)            set('area',              p.areaSqft,                   'high');
  if (p.areaType)            set('areaType',           p.areaType,                   'high');
  if (p.yearOfConstruction)  set('yearOfConstruction', String(p.yearOfConstruction), 'high');
  if (p.floorNumber != null) set('floorNumber',        String(p.floorNumber),        'medium');
  if (p.totalFloors)         set('totalFloors',        String(p.totalFloors),        'medium');
  if (p.constructionQuality) set('constructionQuality',p.constructionQuality,        'medium');
  if (p.amenities?.length)   set('amenities',          p.amenities,                  'high');
  if (p.loanAmountRequired)  set('loanAmountRequired', String(p.loanAmountRequired), 'high');
  if (p.declaredValue)       set('declaredValue',      String(p.declaredValue),      'medium');
  if (p.monthlyRent)         set('monthlyRent',        String(p.monthlyRent),        'medium');
  if (p.ownershipType)       set('ownershipType',      p.ownershipType,              'high');
  if (p.titleClarity)        set('titleClarity',       p.titleClarity,               'high');
  if (p.occupancyStatus)     set('occupancyStatus',    p.occupancyStatus,            'high');
  if (p.encumbranceStatus)   set('encumbranceStatus',  p.encumbranceStatus,          'high');
  if (p.surveyNo)            set('surveyNumber',       p.surveyNo,                   'high');
  if (p.mutationNo)          set('mutationNumber',     p.mutationNo,                 'high');
  if (p.village)             set('village',            p.village,                    'high');
  if (p.tehsil)              set('taluka',             p.tehsil,                     'high');
  if (p.district)            set('district',           p.district,                   'high');

  return { fields, confidenceMap };
}

// ---------------------------------------------------------------------------
// Regex processing for a single file
// ---------------------------------------------------------------------------
async function processFileRegex(filePath, originalName, mimeType) {
  const start = Date.now();
  const { text, method } = await extractRawText(filePath, mimeType);
  const extracted = extractFields(text);
  const docType   = detectDocType(text);
  const confScore = scoreConfidence(extracted);
  const { fields, confidenceMap } = buildRegexFields(extracted, originalName, confScore);

  return {
    fileName:       originalName,
    success:        true,
    documentType:   docType,
    isLandRecord:   isLandRecord(docType),
    processingTime: Date.now() - start,
    extractionRate: Math.round((Object.keys(fields).length / TOTAL_POSSIBLE) * 100),
    extractedCount: Object.keys(fields).length,
    fields, confidenceMap,
    rawText: text.slice(0, 600),
    method,
    error: null,
  };
}

function isLandRecord(docType) {
  return ['7/12','ROR','Khatauni','Patta','Jamabandi','Adangal','RTC','MutationOrder','KHATA'].includes(docType);
}

// ---------------------------------------------------------------------------
// Route: single file
// ---------------------------------------------------------------------------
async function extractDocument(req, res, next) {
  let filePath = null;
  try {
    if (!req.file) return res.status(400).json({ success: false, message: 'No file uploaded.' });
    filePath = req.file.path;
    const start = Date.now();

    if (geminiAvailable()) {
      try {
        const { fields: raw } = await extractWithGemini([
          { filePath, mimeType: req.file.mimetype, originalName: req.file.originalname },
        ]);
        const { fields, confidenceMap } = normalise(raw, req.file.originalname);
        let docType = 'PROPERTY_FORM';
        try { const { text } = await extractRawText(filePath, req.file.mimetype); docType = detectDocType(text) || docType; } catch {}
        const extractedCount = Object.keys(fields).length;
        return res.json({
          success: true,
          data: {
            documentType: docType, isLandRecord: isLandRecord(docType),
            ocrEngine: 'gemini', aiPowered: true,
            processingTime: Date.now() - start,
            extractionRate: Math.round((extractedCount / TOTAL_POSSIBLE) * 100),
            extractedCount, fields, confidenceMap,
          },
        });
      } catch (geminiErr) {
        if (isHardGeminiError(geminiErr)) {
          console.warn('[OCR] Gemini unavailable, falling back to regex:', geminiErr.message);
        } else {
          throw geminiErr; // unexpected error — surface it
        }
      }
    }

    // Regex fallback
    const result = await processFileRegex(filePath, req.file.originalname, req.file.mimetype);
    return res.json({
      success: true,
      data: { ...result, ocrEngine: result.method, aiPowered: false },
    });
  } catch (err) {
    next(err);
  } finally {
    if (filePath && fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }
}

// ---------------------------------------------------------------------------
// Route: multiple files
// ---------------------------------------------------------------------------
async function extractDocuments(req, res, next) {
  const filePaths = [];
  try {
    if (!req.files || req.files.length === 0)
      return res.status(400).json({ success: false, message: 'No files uploaded.' });

    for (const f of req.files) filePaths.push(f.path);
    const start = Date.now();

    // ── Gemini path ───────────────────────────────────────────────────
    if (geminiAvailable()) {
      try {
        const fileList = req.files.map(f => ({
          filePath: f.path, mimeType: f.mimetype, originalName: f.originalname,
        }));
        const { fields: raw } = await extractWithGemini(fileList);
        const sourceLabel = req.files.map(f => f.originalname).join(', ');
        const { fields: mergedFields, confidenceMap: mergedConf } = normalise(raw, sourceLabel);

        const perFile = await Promise.all(req.files.map(async (f) => {
          let docType = 'PROPERTY_FORM';
          try { const { text } = await extractRawText(f.path, f.mimetype); docType = detectDocType(text) || docType; } catch {}
          return {
            fileName: f.originalname, success: true,
            documentType: docType, isLandRecord: isLandRecord(docType),
            processingTime: Date.now() - start,
            extractionRate: 100, extractedCount: 0, ocrEngine: 'gemini', error: null,
          };
        }));

        const extractedCount = Object.keys(mergedFields).length;
        const fieldSources = {};
        for (const k of Object.keys(mergedFields)) fieldSources[k] = sourceLabel;

        return res.json({
          success: true,
          data: {
            fields: mergedFields, confidenceMap: mergedConf, fieldSources,
            extractedCount,
            extractionRate: Math.round((extractedCount / TOTAL_POSSIBLE) * 100),
            documentType: perFile[0]?.documentType || 'PROPERTY_FORM',
            isLandRecord: perFile.some(p => p.isLandRecord),
            aiPowered: true, ocrEngine: 'gemini',
            perFile, totalFiles: req.files.length, successfulFiles: req.files.length,
          },
        });
      } catch (geminiErr) {
        if (isHardGeminiError(geminiErr)) {
          console.warn('[OCR] Gemini unavailable, falling back to regex:', geminiErr.message);
        } else {
          throw geminiErr;
        }
      }
    }

    // ── Regex fallback: process each file, then merge ─────────────────
    const perFileResults = await Promise.all(
      req.files.map(async (f) => {
        try { return await processFileRegex(f.path, f.originalname, f.mimetype); }
        catch (err) {
          return {
            fileName: f.originalname, success: false,
            documentType: 'UNKNOWN', isLandRecord: false,
            processingTime: 0, extractionRate: 0, extractedCount: 0,
            fields: {}, confidenceMap: {}, error: err.message,
          };
        }
      })
    );

    const mergedFields = {}, mergedConf = {}, mergedSources = {};
    for (const r of perFileResults) {
      if (!r.success) continue;
      for (const [key, value] of Object.entries(r.fields)) {
        const newRank = CONFIDENCE_RANK[r.confidenceMap[key]?.confidence] || 0;
        const oldRank = CONFIDENCE_RANK[mergedConf[key]?.confidence]      || 0;
        if (!Object.hasOwn(mergedFields, key) || newRank > oldRank) {
          mergedFields[key]  = value;
          mergedConf[key]    = r.confidenceMap[key];
          mergedSources[key] = r.fileName;
        }
      }
    }

    const extractedCount    = Object.keys(mergedFields).length;
    const successfulResults = perFileResults.filter(r => r.success);
    const primary           = successfulResults.find(r => r.isLandRecord) || successfulResults[0];

    return res.json({
      success: true,
      data: {
        fields: mergedFields, confidenceMap: mergedConf, fieldSources: mergedSources,
        extractedCount,
        extractionRate: Math.round((extractedCount / TOTAL_POSSIBLE) * 100),
        documentType: primary?.documentType || 'UNKNOWN',
        isLandRecord: perFileResults.some(r => r.isLandRecord),
        aiPowered: false, ocrEngine: perFileResults[0]?.method || 'regex',
        perFile: perFileResults.map(r => ({
          fileName: r.fileName, success: r.success,
          documentType: r.documentType, isLandRecord: r.isLandRecord,
          processingTime: r.processingTime, extractionRate: r.extractionRate,
          extractedCount: r.extractedCount, ocrEngine: r.method || 'regex', error: r.error || null,
        })),
        totalFiles: req.files.length, successfulFiles: successfulResults.length,
      },
    });
  } catch (err) {
    next(err);
  } finally {
    for (const fp of filePaths) {
      try { if (fs.existsSync(fp)) fs.unlinkSync(fp); } catch {}
    }
  }
}

module.exports = { extractDocument, extractDocuments };
