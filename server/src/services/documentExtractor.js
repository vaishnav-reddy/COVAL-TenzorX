/**
 * ============================================================
 * DOCUMENT EXTRACTOR SERVICE
 * ============================================================
 * Free, zero-API-key pipeline:
 *   1. PDF  → pdf-parse  → raw text
 *   2. Image → Tesseract.js → raw text
 *   3. Raw text → regex field extractor → structured fields
 *   4. Confidence scoring per field
 *
 * Handles Indian property documents:
 *   - Sale Deed / Agreement to Sale
 *   - Property Tax Receipt
 *   - Encumbrance Certificate
 *   - Building Plan Approval
 *   - Khata / Patta
 *   - Aadhaar / PAN (applicant autofill)
 * ============================================================
 */

'use strict';

const path = require('path');
const fs = require('fs');

/* ─────────────────────────────────────────────────────────────
   SECTION A: TEXT EXTRACTION
───────────────────────────────────────────────────────────── */

async function extractTextFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zlib = require('zlib');

  // ── Strategy 1: pdf-parse (fast, works on many PDFs)
  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 10) return data.text;
  } catch (_e) { /* fall through */ }

  // ── Strategy 2: pdf2json
  try {
    const PDFParser = require('pdf2json');
    const text = await new Promise((resolve, reject) => {
      const parser = new PDFParser(null, 1);
      parser.on('pdfParser_dataReady', (data) => {
        try {
          const pages = data.Pages || [];
          const lines = [];
          for (const page of pages) {
            for (const textItem of (page.Texts || [])) {
              const str = (textItem.R || []).map(r => decodeURIComponent(r.T)).join('');
              if (str.trim()) lines.push(str.trim());
            }
          }
          resolve(lines.join('\n'));
        } catch (e) { reject(e); }
      });
      parser.on('pdfParser_dataError', (err) => reject(err.parserError || err));
      parser.parseBuffer(buffer);
    });
    if (text && text.trim().length > 10) return text;
  } catch (_e) { /* fall through */ }

  // ── Strategy 3: Custom extractor — handles PDFKit hex-encoded streams
  // PDFKit encodes text as hex strings in TJ arrays: [<hex> 0] TJ
  try {
    const raw = buffer.toString('binary');
    const allText = [];

    // Find all stream...endstream blocks (handles both \n and \r\n)
    const streamRegex = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = streamRegex.exec(raw)) !== null) {
      const streamData = m[1];

      // Decompress if needed
      let textData = streamData;
      try {
        const compressed = Buffer.from(streamData, 'binary');
        const decompressed = zlib.inflateSync(compressed);
        textData = decompressed.toString('latin1');
      } catch (_e) {
        // Not compressed, use as-is
      }

      // ── Extract hex-encoded TJ arrays: [<hex1> num <hex2> num] TJ
      // This is how PDFKit encodes text
      const hexTJRegex = /\[((?:<[0-9a-fA-F]*>\s*-?\d*\s*)*)\]\s*TJ/g;
      let htj;
      while ((htj = hexTJRegex.exec(textData)) !== null) {
        const inner = htj[1];
        const hexParts = [...inner.matchAll(/<([0-9a-fA-F]*)>/g)];
        const decoded = hexParts
          .map(hp => {
            const hex = hp[1];
            let str = '';
            for (let i = 0; i < hex.length; i += 2) {
              const code = parseInt(hex.substring(i, i + 2), 16);
              if (code > 31) str += String.fromCharCode(code);
            }
            return str;
          })
          .join('');
        if (decoded.trim().length > 0) allText.push(decoded.trim());
      }

      // ── Also extract plain string TJ: (text) Tj
      const tjRegex = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
      let tj;
      while ((tj = tjRegex.exec(textData)) !== null) {
        const decoded = tj[1]
          .replace(/\\n/g, '\n').replace(/\\r/g, '\r')
          .replace(/\\t/g, '\t').replace(/\\\(/g, '(')
          .replace(/\\\)/g, ')').replace(/\\\\/g, '\\')
          .replace(/\\(\d{3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)));
        if (decoded.trim().length > 0) allText.push(decoded.trim());
      }
    }

    if (allText.length > 3) return allText.join('\n');
  } catch (_e) { /* fall through */ }

  throw new Error('Could not extract text from this PDF. Please upload a JPG or PNG image of the document instead.');
}

async function extractTextFromImage(filePath) {
  const Tesseract = require('tesseract.js');
  const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
    logger: () => {}, // suppress progress logs
  });
  return text || '';
}

async function extractRawText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf' || mimeType === 'application/pdf') {
    return await extractTextFromPDF(filePath);
  }
  // Images: jpg, jpeg, png, webp, tiff, bmp
  return await extractTextFromImage(filePath);
}

/* ─────────────────────────────────────────────────────────────
   SECTION B: CITY & LOCALITY KNOWLEDGE BASE
   Used to match location names from raw OCR text.
───────────────────────────────────────────────────────────── */
const KNOWN_CITIES = [
  'Mumbai', 'Pune', 'Delhi', 'Bengaluru', 'Bangalore',
  'Hyderabad', 'Chennai', 'Ahmedabad', 'Kolkata', 'Jaipur', 'Surat',
];

const KNOWN_LOCALITIES = [
  'Bandra West', 'Andheri East', 'Powai', 'Thane West',
  'Koregaon Park', 'Wakad', 'Hinjewadi', 'Kothrud',
  'Dwarka', 'Vasant Kunj', 'Rohini', 'Saket',
  'Whitefield', 'Indiranagar', 'Sarjapur Road', 'Koramangala',
  'Gachibowli', 'Banjara Hills', 'Kondapur', 'Madhapur',
  'Anna Nagar', 'OMR', 'Velachery',
  'Prahlad Nagar', 'SG Highway', 'Satellite',
  'Salt Lake', 'New Town', 'Alipore',
  'Malviya Nagar', 'Vaishali Nagar', 'C-Scheme',
  'Vesu', 'Adajan', 'Althan',
];

/* ─────────────────────────────────────────────────────────────
   SECTION C: FIELD EXTRACTION PATTERNS
   Each extractor returns { value, confidence, source }
   confidence: 'high' | 'medium' | 'low'
───────────────────────────────────────────────────────────── */

/**
 * Extract area in square feet.
 * Handles: "1200 sq.ft", "1,200 sqft", "1200 Sq. Ft.", "area: 1200"
 * Also handles sq.m → converts to sqft (1 sqm = 10.764 sqft)
 */
function extractArea(text) {
  const patterns = [
    // sq ft variants
    { re: /(\d[\d,]*\.?\d*)\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet|sft)/gi, unit: 'sqft' },
    // sq m variants → convert
    { re: /(\d[\d,]*\.?\d*)\s*(?:sq\.?\s*m\.?|sqm|square\s*met(?:er|re)s?)/gi, unit: 'sqm' },
    // "area" label
    { re: /(?:built[- ]?up\s*area|carpet\s*area|super\s*built[- ]?up|plot\s*area|area)[:\s]+(\d[\d,]*\.?\d*)/gi, unit: 'sqft' },
  ];

  for (const { re, unit } of patterns) {
    const match = re.exec(text);
    if (match) {
      let val = parseFloat(match[1].replace(/,/g, ''));
      if (unit === 'sqm') val = Math.round(val * 10.764);
      if (val > 50 && val < 100000) {
        return { value: val, confidence: 'high', source: match[0].trim() };
      }
    }
  }

  // Fallback: any 3-4 digit number near area keywords
  const fallback = text.match(/(?:area|sqft|sq\.ft)[^\d]*(\d{3,5})/i);
  if (fallback) {
    const val = parseInt(fallback[1]);
    if (val > 50 && val < 100000) {
      return { value: val, confidence: 'low', source: fallback[0] };
    }
  }

  return null;
}

/**
 * Extract declared / sale value in INR.
 * Handles: "₹85,00,000", "Rs. 85 Lakhs", "85,00,000/-", "consideration of Rs. 85 lakh"
 */
function extractDeclaredValue(text) {
  // Crore patterns
  const croreMatch = text.match(
    /(?:rs\.?|₹|■|inr|rupees?)[^\d]*(\d+\.?\d*)\s*(?:crore|cr\.?)/i
  );
  if (croreMatch) {
    const val = Math.round(parseFloat(croreMatch[1]) * 10000000);
    return { value: val, confidence: 'high', source: croreMatch[0].trim() };
  }

  // Lakh patterns
  const lakhMatch = text.match(
    /(?:rs\.?|₹|■|inr|rupees?)[^\d]*(\d+\.?\d*)\s*(?:lakh|lac|l\.?)/i
  );
  if (lakhMatch) {
    const val = Math.round(parseFloat(lakhMatch[1]) * 100000);
    return { value: val, confidence: 'high', source: lakhMatch[0].trim() };
  }

  // Full number with ₹ or Rs or ■ (■ is how some PDFs render ₹)
  const fullMatch = text.match(/(?:rs\.?|₹|■|inr)[^\d]*(\d{1,3}(?:[,]\d{2,3})+)/i);
  if (fullMatch) {
    const val = parseInt(fullMatch[1].replace(/,/g, ''));
    if (val > 100000) {
      return { value: val, confidence: 'medium', source: fullMatch[0].trim() };
    }
  }

  // "consideration of" pattern (sale deeds)
  const considerationMatch = text.match(
    /consideration\s+of\s+(?:rs\.?|₹)?[^\d]*(\d[\d,]*)/i
  );
  if (considerationMatch) {
    const val = parseInt(considerationMatch[1].replace(/,/g, ''));
    if (val > 100000) {
      return { value: val, confidence: 'medium', source: considerationMatch[0].trim() };
    }
  }

  // "Sale Value:" / "Market Value:" label pattern
  const labelMatch = text.match(
    /(?:sale\s*value|market\s*value|property\s*value)[:\s]+(?:rs\.?|₹|■)?[^\d]*(\d[\d,]*)/i
  );
  if (labelMatch) {
    const val = parseInt(labelMatch[1].replace(/,/g, ''));
    if (val > 100000) {
      return { value: val, confidence: 'medium', source: labelMatch[0].trim() };
    }
  }

  // Standalone Indian format number (e.g. 1,35,00,000/-)
  const standaloneMatch = text.match(/\b(\d{1,2},\d{2},\d{2},\d{3}|\d{2},\d{2},\d{2},\d{3}|\d{1,2},\d{2},\d{5})\b/);
  if (standaloneMatch) {
    const val = parseInt(standaloneMatch[1].replace(/,/g, ''));
    if (val > 100000) {
      return { value: val, confidence: 'low', source: standaloneMatch[0] };
    }
  }

  return null;
}

/**
 * Extract year of construction.
 * Handles: "constructed in 2010", "year of construction: 2015", "built in 2008"
 */
function extractYearOfConstruction(text) {
  const currentYear = new Date().getFullYear();

  const patterns = [
    /(?:year\s*of\s*construction|constructed\s*in|built\s*in|completion\s*year|date\s*of\s*construction)[:\s]+(\d{4})/i,
    /(?:construction\s*completed?|possession)[:\s]+(\d{4})/i,
    /(\d{4})\s*(?:construction|built|completed)/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const year = parseInt(match[1]);
      if (year >= 1900 && year <= currentYear) {
        return { value: year, confidence: 'high', source: match[0].trim() };
      }
    }
  }

  // Fallback: any 4-digit year in reasonable range
  const years = [...text.matchAll(/\b(19[5-9]\d|20[0-2]\d)\b/g)]
    .map(m => parseInt(m[1]))
    .filter(y => y >= 1950 && y <= currentYear);

  if (years.length > 0) {
    // Most likely construction year = earliest year found
    const year = Math.min(...years);
    return { value: year, confidence: 'low', source: `Year found in document: ${year}` };
  }

  return null;
}

/**
 * Extract floor number.
 * Handles: "3rd floor", "Floor No: 5", "flat on 7th floor"
 */
function extractFloorNumber(text) {
  const patterns = [
    /(?:floor\s*no\.?|floor\s*number)[:\s]+(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s*floor/i,
    /flat\s*(?:no\.?\s*\d+\s*)?on\s*(?:the\s*)?(\d+)/i,
    /(?:situated\s*on|located\s*on)\s*(?:the\s*)?(\d+)(?:st|nd|rd|th)?\s*floor/i,
    // "Floor: 5" standalone label (common in structured documents)
    /^floor[:\s]+(\d+)$/im,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const floor = parseInt(match[1]);
      if (floor >= 0 && floor <= 100) {
        return { value: floor, confidence: 'high', source: match[0].trim() };
      }
    }
  }
  return null;
}

/**
 * Extract total floors.
 * Handles: "G+10 floors", "total 12 floors", "10 storey building"
 */
function extractTotalFloors(text) {
  const patterns = [
    /(?:total\s*floors?|no\.?\s*of\s*floors?)[:\s]+(\d+)/i,
    /g\s*\+\s*(\d+)/i,
    /(\d+)\s*(?:storey|story|storeyed|floor)\s*building/i,
    /(\d+)\s*floors?\s*(?:building|structure|tower)/i,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const floors = parseInt(match[1]);
      if (floors >= 1 && floors <= 100) {
        return { value: floors, confidence: 'high', source: match[0].trim() };
      }
    }
  }
  return null;
}

/**
 * Extract city from known list.
 */
function extractCity(text) {
  const normalizedText = text.toLowerCase();
  for (const city of KNOWN_CITIES) {
    if (normalizedText.includes(city.toLowerCase())) {
      // Normalize Bangalore → Bengaluru
      const normalized = city === 'Bangalore' ? 'Bengaluru' : city;
      return { value: normalized, confidence: 'high', source: `City found: ${city}` };
    }
  }
  return null;
}

/**
 * Extract locality from known list.
 */
function extractLocality(text) {
  const normalizedText = text.toLowerCase();
  for (const locality of KNOWN_LOCALITIES) {
    if (normalizedText.includes(locality.toLowerCase())) {
      return { value: locality, confidence: 'high', source: `Locality found: ${locality}` };
    }
  }
  return null;
}

/**
 * Extract pincode.
 * Indian pincodes are 6 digits starting with 1–9.
 */
function extractPincode(text) {
  const match = text.match(/\b([1-9]\d{5})\b/);
  if (match) {
    return { value: match[1], confidence: 'high', source: `Pincode: ${match[1]}` };
  }
  return null;
}

/**
 * Extract property type from document keywords.
 */
function extractPropertyType(text) {
  const lower = text.toLowerCase();
  if (/\b(?:flat|apartment|residential|dwelling|house|villa|bungalow|row\s*house)\b/.test(lower)) {
    return { value: 'residential', confidence: 'high', source: 'Residential property keywords found' };
  }
  if (/\b(?:shop|office|commercial|showroom|retail|mall|plaza)\b/.test(lower)) {
    return { value: 'commercial', confidence: 'high', source: 'Commercial property keywords found' };
  }
  if (/\b(?:factory|warehouse|industrial|godown|shed|plant)\b/.test(lower)) {
    return { value: 'industrial', confidence: 'high', source: 'Industrial property keywords found' };
  }
  if (/\b(?:plot|land|site|vacant\s*land|agricultural|survey\s*no)\b/.test(lower)) {
    return { value: 'land', confidence: 'high', source: 'Land/plot keywords found' };
  }
  return { value: 'residential', confidence: 'low', source: 'Default — no type keywords found' };
}

/**
 * Extract construction quality from document keywords.
 */
function extractConstructionQuality(text) {
  const lower = text.toLowerCase();
  if (/\b(?:premium|luxury|high[- ]end|imported|marble|granite|modular)\b/.test(lower)) {
    return { value: 'premium', confidence: 'medium', source: 'Premium quality keywords found' };
  }
  if (/\b(?:standard|basic|ordinary|normal\s*finish)\b/.test(lower)) {
    return { value: 'standard', confidence: 'medium', source: 'Standard quality keywords found' };
  }
  return { value: 'good', confidence: 'low', source: 'Default — no quality keywords found' };
}

/**
 * Extract applicant name.
 * Handles: "Purchaser: John Doe", "Buyer: ...", "Name: ..."
 */
function extractApplicantName(text) {
  const patterns = [
    /(?:purchaser|buyer|borrower|applicant|owner|name)[:\s]+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})(?:[,\n]|$)/,
    /(?:Mr\.|Mrs\.|Ms\.|Dr\.)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
    /(?:S\/O|D\/O|W\/O)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/i,
    // "Buyer: Rahul Sharma" or "Purchaser: Rahul Sharma" — standalone line
    /^(?:buyer|purchaser|borrower)[:\s]+([A-Za-z]+(?:\s+[A-Za-z]+){1,3})$/im,
    /Purchaser:\s*([A-Za-z]+(?:\s+[A-Za-z]+){1,3})/,
  ];

  for (const re of patterns) {
    const match = text.match(re);
    if (match) {
      const name = match[1].trim();
      if (name.length > 3 && name.length < 60) {
        return { value: name, confidence: 'medium', source: match[0].trim() };
      }
    }
  }
  return null;
}

/**
 * Extract PAN number.
 * Format: 5 letters + 4 digits + 1 letter (e.g. ABCDE1234F)
 */
function extractPAN(text) {
  const match = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  if (match) {
    return { value: match[1], confidence: 'high', source: `PAN: ${match[1]}` };
  }
  return null;
}

/**
 * Extract phone number.
 * Indian mobile: 10 digits starting with 6–9
 */
function extractPhone(text) {
  const match = text.match(/\b([6-9]\d{9})\b/);
  if (match) {
    return { value: match[1], confidence: 'high', source: `Phone: ${match[1]}` };
  }
  return null;
}

/**
 * Extract email.
 */
function extractEmail(text) {
  const match = text.match(/\b([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})\b/);
  if (match) {
    return { value: match[1], confidence: 'high', source: `Email: ${match[1]}` };
  }
  return null;
}

/* ─────────────────────────────────────────────────────────────
   SECTION D: DOCUMENT TYPE DETECTION
───────────────────────────────────────────────────────────── */
function detectDocumentType(text) {
  const lower = text.toLowerCase();
  if (/sale\s*deed|agreement\s*to\s*sale|conveyance\s*deed/.test(lower)) return 'SALE_DEED';
  if (/property\s*tax|house\s*tax|municipal\s*tax/.test(lower)) return 'PROPERTY_TAX';
  if (/encumbrance\s*certificate|ec\s*certificate/.test(lower)) return 'ENCUMBRANCE_CERT';
  if (/building\s*plan|plan\s*approval|sanctioned\s*plan/.test(lower)) return 'BUILDING_PLAN';
  if (/khata|patta|revenue\s*record/.test(lower)) return 'KHATA_PATTA';
  if (/aadhaar|aadhar|uid/.test(lower)) return 'AADHAAR';
  if (/permanent\s*account\s*number|pan\s*card/.test(lower)) return 'PAN_CARD';
  return 'UNKNOWN';
}

/* ─────────────────────────────────────────────────────────────
   SECTION E: MAIN EXTRACTION ORCHESTRATOR
───────────────────────────────────────────────────────────── */
async function extract(filePath, mimeType) {
  const startTime = Date.now();

  // Step 1: Get raw text
  let rawText = '';
  let ocrEngine = 'none';

  try {
    rawText = await extractRawText(filePath, mimeType);
    ocrEngine = mimeType === 'application/pdf' ? 'pdf-parse' : 'tesseract.js';
  } catch (err) {
    return {
      success: false,
      error: `Text extraction failed: ${err.message}`,
      fields: {},
      rawText: '',
    };
  }

  if (!rawText || rawText.trim().length < 20) {
    return {
      success: false,
      error: 'Could not extract readable text from document. Please ensure the document is clear and not handwritten.',
      fields: {},
      rawText: '',
    };
  }

  // Step 2: Detect document type
  const documentType = detectDocumentType(rawText);

  // Step 3: Extract all fields
  const extracted = {
    propertyType:        extractPropertyType(rawText),
    city:                extractCity(rawText),
    locality:            extractLocality(rawText),
    pincode:             extractPincode(rawText),
    area:                extractArea(rawText),
    yearOfConstruction:  extractYearOfConstruction(rawText),
    floorNumber:         extractFloorNumber(rawText),
    totalFloors:         extractTotalFloors(rawText),
    constructionQuality: extractConstructionQuality(rawText),
    declaredValue:       extractDeclaredValue(rawText),
    applicantName:       extractApplicantName(rawText),
    applicantPAN:        extractPAN(rawText),
    applicantPhone:      extractPhone(rawText),
    applicantEmail:      extractEmail(rawText),
  };

  // Step 4: Build clean fields object (only non-null)
  const fields = {};
  const confidenceMap = {};
  let extractedCount = 0;

  for (const [key, result] of Object.entries(extracted)) {
    if (result !== null) {
      fields[key] = result.value;
      confidenceMap[key] = {
        confidence: result.confidence,
        source: result.source,
      };
      extractedCount++;
    }
  }

  // Step 5: Overall extraction quality
  const totalFields = Object.keys(extracted).length;
  const extractionRate = Math.round((extractedCount / totalFields) * 100);

  return {
    success: true,
    documentType,
    ocrEngine,
    processingTime: Date.now() - startTime,
    extractionRate,
    extractedCount,
    totalFields,
    fields,
    confidenceMap,
    rawTextLength: rawText.length,
    // Include first 500 chars of raw text for debugging
    rawTextPreview: rawText.substring(0, 500).replace(/\s+/g, ' ').trim(),
  };
}

module.exports = { extract };
