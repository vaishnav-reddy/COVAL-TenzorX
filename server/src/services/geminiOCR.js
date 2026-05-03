'use strict';
/**
 * geminiOCR.js — v2
 * Uses Google Gemini 1.5 Pro for maximum extraction accuracy.
 * All files sent in ONE request for cross-document context.
 */

const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');

// ---------------------------------------------------------------------------
// Prompt — comprehensive extraction with flexible matching
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `You are an expert Indian property loan document parser for a bank's collateral valuation system.
You will receive one or more documents (property forms, sale deeds, Aadhaar, PAN, 7/12 extracts, RTC, Khata, etc.).
Extract ALL fields below by reading EVERY document carefully. Cross-reference across documents.
Return ONLY a single valid JSON object — no markdown, no explanation, no extra text.
Use null for fields genuinely absent from ALL documents.

EXTRACTION RULES:
- Read every line, table cell, checkbox, and handwritten annotation
- For checkboxes/radio buttons: if a box is ticked/filled/marked, treat it as selected
- For amenities: include if marked Yes, ticked, checked, or listed under "Available Facilities"
- Indian number formats: "45,00,000" = 4500000; "28,000" = 28000; "45L" = 4500000; "1.2Cr" = 12000000
- Phone: extract 10-digit mobile, strip country code (+91)
- PAN: always 10 chars, format AAAAA9999A
- Area: prefer Built-up > Carpet > Super Built-up; convert sqm × 10.764 to get sqft
- constructionQuality: infer from materials (RCC/Pucca/Brick = "good", marble/premium fittings = "premium", basic/kachha = "standard")
- If occupancyStatus is "rented", also extract monthlyRent
- titleClarity: "clear" if no disputes/litigation mentioned, "disputed" if contested, "litigation" if court case
- For land records (7/12, RTC, Patta, Jamabandi): extract surveyNumber, mutationNumber, village, taluka, district

JSON schema (use EXACTLY these keys):

{
  "propertyType": "residential" | "commercial" | "industrial" | "land" | null,
  "propertySubType": "Apartment" | "Villa" | "Row House" | "Bungalow" | "Studio" | "Penthouse" | "Builder Floor" | "Independent House" | "Shop" | "Office" | "Showroom" | "Mall Unit" | "Business Center" | "Warehouse" | "Factory" | "Godown" | "Shed" | "Industrial Plot" | "Agricultural Land" | "Residential Plot" | null,
  "purpose": "lap" | "mortgage" | "working_capital" | null,
  "loanAmountRequired": <integer rupees> | null,
  "declaredValue": <integer rupees — property's declared/market value if different from loan amount> | null,
  "locality": <neighbourhood/area/society name> | null,
  "city": <city name> | null,
  "pincode": <6-digit string> | null,
  "area": <integer sqft> | null,
  "areaType": "carpet" | "builtup" | "superbuiltup" | null,
  "yearOfConstruction": <4-digit integer> | null,
  "floorNumber": <integer, Ground=0> | null,
  "totalFloors": <integer, "G+7"=8> | null,
  "constructionQuality": "standard" | "good" | "premium" | null,
  "amenities": ["Parking","Lift","Security","Gym","Swimming Pool","Power Backup","Garden","Club House","CCTV","Intercom","Fire Safety","Water Treatment","Solar Panels","Rain Water Harvesting"],
  "ownershipType": "freehold" | "leasehold" | null,
  "titleClarity": "clear" | "disputed" | "litigation" | null,
  "occupancyStatus": "self_occupied" | "rented" | "vacant" | null,
  "monthlyRent": <integer rupees> | null,
  "applicantName": <full legal name> | null,
  "applicantPhone": <10 digits only> | null,
  "applicantPAN": <10-char PAN> | null,
  "applicantEmail": <email address> | null,
  "surveyNumber": <survey/gat/khasra number> | null,
  "mutationNumber": <mutation/registration number> | null,
  "village": <village name> | null,
  "taluka": <taluka/tehsil/mandal name> | null,
  "district": <district name> | null,
  "encumbranceStatus": "nil" | "encumbered" | null
}

Value mappings:
- "Loan Against Property" / "LAP" → "lap"
- "Mortgage" / "Home Loan" / "Housing Loan" → "mortgage"  
- "Working Capital" / "Business Loan" → "working_capital"
- "Residential" / "Apartment" / "Flat" / "Villa" → "residential"
- "Commercial" / "Shop" / "Office" → "commercial"
- "Industrial" / "Warehouse" / "Factory" → "industrial"
- "Land" / "Plot" / "Agricultural" → "land"
- "Freehold" / "Free Hold" → "freehold"
- "Leasehold" / "Lease Hold" → "leasehold"
- "Self Occupied" / "Owner Occupied" → "self_occupied"
- "Rented" / "Leased" / "Tenanted" → "rented"
- Encumbrance "Nil" / "None" / "Clear" → "nil"; any mortgage/lien/charge → "encumbered"`;

// ---------------------------------------------------------------------------
// Extract from ONE OR MORE files in a single Gemini call
// ---------------------------------------------------------------------------
async function extractWithGemini(files) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'your_gemini_api_key_here') {
    throw new Error('GEMINI_API_KEY not configured in .env');
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  // Use 2.5 Flash as default (fast, cost-effective, supports multimodal/PDF)
  // Override via GEMINI_MODEL env var if needed
  const modelName = process.env.GEMINI_MODEL || 'gemini-2.5-flash';
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: 0,
      responseMimeType: 'application/json',
    },
  });

  const parts = [{ text: SYSTEM_PROMPT }];
  for (const f of files) {
    const buf = fs.readFileSync(f.filePath);
    parts.push({
      inlineData: {
        mimeType: f.mimeType === 'application/pdf' ? 'application/pdf' : f.mimeType,
        data: buf.toString('base64'),
      },
    });
    // Add a label so Gemini knows which document it's reading
    parts.push({ text: `[Document: ${f.originalName}]` });
  }

  let result;
  try {
    result = await model.generateContent(parts);
  } catch (proErr) {
    // If Pro quota exceeded or unavailable, retry with Flash
    if (modelName !== 'gemini-1.5-flash') {
      console.warn(`[geminiOCR] ${modelName} failed (${proErr.message}), retrying with gemini-2.5-flash`);
      try {
        const flashModel = genAI.getGenerativeModel({
          model: 'gemini-2.5-flash',
          generationConfig: { temperature: 0, responseMimeType: 'application/json' },
        });
        result = await flashModel.generateContent(parts);
      } catch (flashErr) {
        const msg = flashErr.message || '';
        if (msg.includes('API_KEY') || msg.includes('API key')) {
          throw new Error('Invalid Gemini API key. Check GEMINI_API_KEY in server/.env');
        }
        if (msg.includes('quota') || msg.includes('429')) {
          throw new Error('Gemini API quota exceeded. Try again in a moment.');
        }
        throw new Error(`Gemini extraction failed: ${msg}`);
      }
    } else {
      const msg = proErr.message || '';
      if (msg.includes('API_KEY') || msg.includes('API key')) {
        throw new Error('Invalid Gemini API key. Check GEMINI_API_KEY in server/.env');
      }
      if (msg.includes('quota') || msg.includes('429')) {
        throw new Error('Gemini API quota exceeded. Try again in a moment.');
      }
      throw new Error(`Gemini extraction failed: ${msg}`);
    }
  }

  const rawResponse = result.response.text();
  const jsonStr = rawResponse
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```\s*$/, '')
    .trim();

  let parsed;
  try {
    parsed = JSON.parse(jsonStr);
  } catch {
    // Try to extract JSON object from response
    const jsonMatch = rawResponse.match(/\{[\s\S]+\}/);
    if (jsonMatch) {
      try { parsed = JSON.parse(jsonMatch[0]); }
      catch { throw new Error(`Gemini returned invalid JSON: ${rawResponse.slice(0, 300)}`); }
    } else {
      throw new Error(`Gemini returned invalid JSON: ${rawResponse.slice(0, 300)}`);
    }
  }

  return { fields: parsed, rawResponse };
}

// ---------------------------------------------------------------------------
// Normalise + validate Gemini output
// ---------------------------------------------------------------------------
const VALID_PROPERTY_TYPES = new Set(['residential','commercial','industrial','land']);
const VALID_PURPOSES       = new Set(['lap','mortgage','working_capital']);
const VALID_AREA_TYPES     = new Set(['carpet','builtup','superbuiltup']);
const VALID_QUALITY        = new Set(['standard','good','premium']);
const VALID_OWNERSHIP      = new Set(['freehold','leasehold']);
const VALID_TITLE          = new Set(['clear','disputed','litigation']);
const VALID_OCCUPANCY      = new Set(['self_occupied','rented','vacant']);
const VALID_ENCUMBRANCE    = new Set(['nil','encumbered']);
const VALID_AMENITIES      = new Set([
  'Parking','Lift','Security','Gym','Swimming Pool','Power Backup',
  'Garden','Club House','CCTV','Intercom','Fire Safety','Water Treatment',
  'Solar Panels','Rain Water Harvesting',
]);
const VALID_SUBTYPES = new Set([
  'Apartment','Villa','Row House','Bungalow','Studio','Penthouse','Builder Floor',
  'Independent House','Shop','Office','Showroom','Mall Unit','Business Center',
  'Warehouse','Factory','Godown','Shed','Industrial Plot','Agricultural Land','Residential Plot',
]);

function parseIndianNum(val) {
  if (val === null || val === undefined) return null;
  const s = String(val).replace(/,/g, '').trim();
  if (/^\d+(\.\d+)?\s*[Cc][Rr]/.test(s)) return Math.round(parseFloat(s) * 10000000);
  if (/^\d+(\.\d+)?\s*[Ll]/.test(s))     return Math.round(parseFloat(s) * 100000);
  const n = parseFloat(s);
  return isNaN(n) ? null : Math.round(n);
}

function normalise(geminiFields, sourceLabel) {
  const fields = {};
  const confidenceMap = {};

  function set(key, value, conf = 'high') {
    if (value === null || value === undefined) return;
    if (typeof value === 'string' && value.trim() === '') return;
    if (Array.isArray(value) && value.length === 0) return;
    fields[key] = value;
    confidenceMap[key] = { confidence: conf, source: sourceLabel };
  }

  const g = geminiFields;

  // Property classification
  if (VALID_PROPERTY_TYPES.has(g.propertyType))  set('propertyType', g.propertyType);
  if (g.propertySubType) {
    const sub = String(g.propertySubType).trim();
    set('propertySubType', VALID_SUBTYPES.has(sub) ? sub : sub);
  }
  if (VALID_PURPOSES.has(g.purpose)) set('purpose', g.purpose);

  // Financial
  const loan = parseIndianNum(g.loanAmountRequired);
  if (loan && loan > 0) set('loanAmountRequired', String(loan));

  const declared = parseIndianNum(g.declaredValue);
  if (declared && declared > 0 && declared !== loan) set('declaredValue', String(declared), 'medium');

  const rent = parseIndianNum(g.monthlyRent);
  if (rent && rent > 0) set('monthlyRent', String(rent));

  // Location
  if (g.city)     set('city',     String(g.city).trim());
  if (g.locality) set('locality', String(g.locality).trim(), 'medium');
  if (g.pincode) {
    const pin = String(g.pincode).replace(/\D/g, '');
    if (/^\d{6}$/.test(pin)) set('pincode', pin);
  }

  // Structural
  const area = parseIndianNum(g.area);
  if (area && area > 0) set('area', area);
  if (VALID_AREA_TYPES.has(g.areaType)) set('areaType', g.areaType);

  const year = parseInt(g.yearOfConstruction);
  if (!isNaN(year) && year > 1900 && year <= new Date().getFullYear() + 1)
    set('yearOfConstruction', String(year));

  const floor = parseInt(g.floorNumber);
  if (!isNaN(floor) && floor >= 0) set('floorNumber', String(floor));

  const totalFloors = parseInt(g.totalFloors);
  if (!isNaN(totalFloors) && totalFloors > 0) set('totalFloors', String(totalFloors));

  if (VALID_QUALITY.has(g.constructionQuality)) set('constructionQuality', g.constructionQuality);

  // Amenities
  if (Array.isArray(g.amenities)) {
    const valid = g.amenities.filter(a => VALID_AMENITIES.has(a));
    if (valid.length > 0) set('amenities', valid);
  }

  // Legal
  if (VALID_OWNERSHIP.has(g.ownershipType))    set('ownershipType',   g.ownershipType);
  if (VALID_TITLE.has(g.titleClarity))         set('titleClarity',    g.titleClarity);
  if (VALID_OCCUPANCY.has(g.occupancyStatus))  set('occupancyStatus', g.occupancyStatus);
  if (VALID_ENCUMBRANCE.has(g.encumbranceStatus)) set('encumbranceStatus', g.encumbranceStatus);

  // Applicant
  if (g.applicantName) set('applicantName', String(g.applicantName).trim());

  if (g.applicantPhone) {
    const phone = String(g.applicantPhone).replace(/\D/g, '').slice(-10);
    if (phone.length === 10) set('applicantPhone', phone);
  }

  if (g.applicantPAN) {
    const pan = String(g.applicantPAN).toUpperCase().replace(/\s/g, '');
    if (/^[A-Z]{5}[0-9]{4}[A-Z]$/.test(pan)) set('applicantPAN', pan);
  }

  if (g.applicantEmail) {
    const email = String(g.applicantEmail).toLowerCase().trim();
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) set('applicantEmail', email, 'medium');
  }

  // Land record fields
  if (g.surveyNumber)   set('surveyNumber',   String(g.surveyNumber).trim(),   'high');
  if (g.mutationNumber) set('mutationNumber', String(g.mutationNumber).trim(), 'high');
  if (g.village)        set('village',        String(g.village).trim(),        'high');
  if (g.taluka)         set('taluka',         String(g.taluka).trim(),         'high');
  if (g.district)       set('district',       String(g.district).trim(),       'high');

  return { fields, confidenceMap };
}

module.exports = { extractWithGemini, normalise };
