'use strict';

const path = require('path');
const fs   = require('fs');

/* ═══════════════════════════════════════════════════════════
   SECTION A — TEXT EXTRACTION
═══════════════════════════════════════════════════════════ */

async function extractTextFromPDF(filePath) {
  const buffer = fs.readFileSync(filePath);
  const zlib   = require('zlib');

  try {
    const pdfParse = require('pdf-parse');
    const data = await pdfParse(buffer);
    if (data.text && data.text.trim().length > 20) return data.text;
  } catch (_) {}

  try {
    const PDFParser = require('pdf2json');
    const text = await new Promise((resolve, reject) => {
      const parser = new PDFParser(null, 1);
      parser.on('pdfParser_dataReady', (d) => {
        try {
          const lines = [];
          for (const page of (d.Pages || [])) {
            for (const item of (page.Texts || [])) {
              const s = (item.R || []).map(r => decodeURIComponent(r.T)).join('');
              if (s.trim()) lines.push(s.trim());
            }
          }
          resolve(lines.join('\n'));
        } catch (e) { reject(e); }
      });
      parser.on('pdfParser_dataError', (e) => reject(e.parserError || e));
      parser.parseBuffer(buffer);
    });
    if (text && text.trim().length > 20) return text;
  } catch (_) {}

  try {
    const raw = buffer.toString('binary');
    const allText = [];
    const streamRe = /stream\r?\n([\s\S]*?)\r?\nendstream/g;
    let m;
    while ((m = streamRe.exec(raw)) !== null) {
      let td = m[1];
      try { td = zlib.inflateSync(Buffer.from(m[1], 'binary')).toString('latin1'); } catch (_) {}
      const hexRe = /\[((?:<[0-9a-fA-F]*>\s*-?\d*\s*)*)\]\s*TJ/g;
      let h;
      while ((h = hexRe.exec(td)) !== null) {
        const decoded = [...h[1].matchAll(/<([0-9a-fA-F]*)>/g)]
          .map(hp => { let s = ''; for (let i = 0; i < hp[1].length; i += 2) { const c = parseInt(hp[1].substring(i, i + 2), 16); if (c > 31) s += String.fromCharCode(c); } return s; })
          .join('');
        if (decoded.trim()) allText.push(decoded.trim());
      }
      const tjRe = /\(([^)\\]*(?:\\.[^)\\]*)*)\)\s*(?:Tj|'|")/g;
      let tj;
      while ((tj = tjRe.exec(td)) !== null) {
        const decoded = tj[1].replace(/\\n/g,'\n').replace(/\\r/g,'\r').replace(/\\t/g,'\t').replace(/\\\(/g,'(').replace(/\\\)/g,')').replace(/\\\\/g,'\\').replace(/\\(\d{3})/g,(_,o)=>String.fromCharCode(parseInt(o,8)));
        if (decoded.trim()) allText.push(decoded.trim());
      }
    }
    if (allText.length > 3) return allText.join('\n');
  } catch (_) {}

  throw new Error('Could not extract text from PDF. Try uploading a JPG/PNG scan instead.');
}

async function extractTextFromImage(filePath) {
  const Tesseract = require('tesseract.js');
  const { data: { text } } = await Tesseract.recognize(filePath, 'eng', {
    logger: () => {},
    tessedit_pageseg_mode: '6',
    tessedit_ocr_engine_mode: '1',
    preserve_interword_spaces: '1',
  });
  return text || '';
}

async function extractRawText(filePath, mimeType) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.pdf' || mimeType === 'application/pdf') return extractTextFromPDF(filePath);
  return extractTextFromImage(filePath);
}

/* ═══════════════════════════════════════════════════════════
   SECTION B — KNOWLEDGE BASE
═══════════════════════════════════════════════════════════ */

const KNOWN_CITIES = [
  'Mumbai','Pune','Delhi','New Delhi','Bengaluru','Bangalore',
  'Hyderabad','Chennai','Madras','Ahmedabad','Kolkata','Calcutta',
  'Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore','Thane',
  'Bhopal','Visakhapatnam','Vizag','Patna','Vadodara','Baroda',
  'Ghaziabad','Ludhiana','Agra','Nashik','Faridabad','Meerut',
  'Rajkot','Varanasi','Aurangabad','Amritsar','Navi Mumbai',
  'Allahabad','Prayagraj','Ranchi','Howrah','Coimbatore',
  'Jabalpur','Gwalior','Vijayawada','Jodhpur','Madurai','Raipur',
  'Kota','Chandigarh','Gurgaon','Gurugram','Noida','Greater Noida',
];

const KNOWN_LOCALITIES = [
  'Bandra West','Bandra East','Andheri East','Andheri West','Powai',
  'Thane West','Thane East','Borivali','Malad','Goregaon','Kandivali',
  'Dahisar','Mira Road','Vasai','Virar','Kurla','Chembur','Ghatkopar',
  'Mulund','Bhandup','Vikhroli','Kanjurmarg','Dadar','Parel','Worli',
  'Lower Parel','Matunga','Sion','Wadala','Colaba','Nariman Point',
  'Fort','Churchgate','Marine Lines','Malabar Hill','Pedder Road',
  'Koregaon Park','Wakad','Hinjewadi','Kothrud','Baner','Aundh',
  'Viman Nagar','Kalyani Nagar','Hadapsar','Kharadi','Magarpatta',
  'Wagholi','Undri','Kondhwa','Katraj','Warje','Pimple Saudagar',
  'Pimple Nilakh','Bavdhan','Pashan',
  'Dwarka','Vasant Kunj','Rohini','Saket','Lajpat Nagar',
  'Greater Kailash','Hauz Khas','South Extension','Connaught Place',
  'Karol Bagh','Rajouri Garden','Janakpuri','Pitampura',
  'Whitefield','Indiranagar','Sarjapur Road','Koramangala',
  'HSR Layout','BTM Layout','Jayanagar','JP Nagar','Bannerghatta Road',
  'Electronic City','Marathahalli','Bellandur','Hebbal','Yelahanka',
  'Rajajinagar','Malleshwaram','Basavanagudi','Banashankari',
  'Gachibowli','Banjara Hills','Kondapur','Madhapur','Jubilee Hills',
  'Hitech City','Kukatpally','Miyapur','Manikonda','Nallagandla',
  'Kompally','LB Nagar','Dilsukhnagar',
  'Anna Nagar','OMR','Velachery','Adyar','Besant Nagar',
  'Nungambakkam','T Nagar','Mylapore','Porur','Ambattur',
  'Perambur','Sholinganallur','Perungudi','Thoraipakkam',
  'Prahlad Nagar','SG Highway','Satellite','Bopal','Thaltej',
  'Vastrapur','Navrangpura','Maninagar','Gota','Chandkheda',
  'Salt Lake','New Town','Alipore','Ballygunge','Park Street',
  'Rajarhat','Dum Dum','Behala','Tollygunge','Jadavpur',
  'Malviya Nagar','Vaishali Nagar','C-Scheme','Mansarovar',
  'Jagatpura','Tonk Road','Ajmer Road','Sanganer',
  'Vesu','Adajan','Althan','Pal','Katargam','Udhna',
];

/* ═══════════════════════════════════════════════════════════
   SECTION C — FIELD EXTRACTORS
═══════════════════════════════════════════════════════════ */

function extractApplicantName(text) {
  const t = text.replace(/\r/g, '\n');
  const patterns = [
    // Labeled patterns — most reliable
    /(?:purchaser|buyer|borrower|applicant|mortgagor|vendor|seller|transferee|transferor)\s*[:\-]\s*([A-Za-z][A-Za-z\s\.]{3,50})(?:\n|,|$)/i,
    /(?:name\s*of\s*(?:applicant|borrower|owner|purchaser|buyer))\s*[:\-]\s*([A-Za-z][A-Za-z\s\.]{3,50})(?:\n|,|$)/i,
    // Title prefix
    /(?:Mr\.|Mrs\.|Ms\.|Dr\.|Shri|Smt\.)\s+([A-Za-z][A-Za-z\s\.]{3,50})(?:\n|,|$)/i,
    // Relation patterns
    /(?:S\/O|D\/O|W\/O|son\s+of|daughter\s+of|wife\s+of)\s+([A-Za-z][A-Za-z\s\.]{3,50})(?:\n|,|$)/i,
    // "Name:" standalone label
    /^name\s*[:\-]\s*([A-Za-z][A-Za-z\s\.]{3,50})$/im,
    // Resume: first non-empty line that looks like a name (2-4 words, all letters)
    /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*$/m,
    // ALL CAPS name (common in OCR of official docs)
    /^([A-Z]{2,}(?:\s+[A-Z]{2,}){1,3})\s*$/m,
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) {
      const name = m[1].trim().replace(/\s{2,}/g, ' ');
      if (name.length >= 4 && name.length <= 60 && !/\d/.test(name) && name.split(' ').length <= 5) {
        return { value: name, confidence: 'medium', source: m[0].trim().substring(0, 80) };
      }
    }
  }
  return null;
}

function extractPropertyType(text) {
  const lower = text.toLowerCase();
  const scores = { residential: 0, commercial: 0, industrial: 0, land: 0 };
  if (/\b(?:flat|apartment|dwelling|house|villa|bungalow|row\s*house|penthouse|studio|bhk|bedroom)\b/.test(lower)) scores.residential += 3;
  if (/\bresidential\b/.test(lower)) scores.residential += 2;
  if (/\b(?:shop|office|showroom|retail|mall|plaza|commercial\s*space)\b/.test(lower)) scores.commercial += 3;
  if (/\bcommercial\b/.test(lower)) scores.commercial += 2;
  if (/\b(?:factory|warehouse|industrial|godown|shed|plant|manufacturing)\b/.test(lower)) scores.industrial += 3;
  if (/\bindustrial\b/.test(lower)) scores.industrial += 2;
  if (/\b(?:plot|vacant\s*land|agricultural|farm\s*land|survey\s*no|khasra|gat\s*no)\b/.test(lower)) scores.land += 3;
  if (/\bland\b/.test(lower)) scores.land += 1;
  const best = Object.entries(scores).sort((a, b) => b[1] - a[1])[0];
  if (best[1] === 0) return null;
  return { value: best[0], confidence: best[1] >= 3 ? 'high' : 'medium', source: `${best[0]} keywords (score ${best[1]})` };
}

function extractArea(text) {
  const patterns = [
    { re: /(\d[\d,]*\.?\d*)\s*(?:sq\.?\s*ft\.?|sqft|square\s*feet|sft)/gi, unit: 'sqft' },
    { re: /(\d[\d,]*\.?\d*)\s*(?:sq\.?\s*m\.?|sqm|square\s*met(?:er|re)s?)/gi, unit: 'sqm' },
    { re: /(?:built[- ]?up\s*area|carpet\s*area|super\s*built[- ]?up|plot\s*area|total\s*area|area)[:\s]+(\d[\d,]*\.?\d*)/gi, unit: 'sqft' },
  ];
  for (const { re, unit } of patterns) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) {
      let val = parseFloat(m[1].replace(/,/g, ''));
      if (unit === 'sqm') val = Math.round(val * 10.764);
      if (val > 50 && val < 500000) return { value: Math.round(val), confidence: 'high', source: m[0].trim() };
    }
  }
  const fallback = text.match(/(\d{3,6})\s*(?:sq|sft|sqft)/i);
  if (fallback) {
    const val = parseInt(fallback[1]);
    if (val > 50 && val < 500000) return { value: val, confidence: 'low', source: fallback[0] };
  }
  return null;
}

function extractYearOfConstruction(text) {
  const currentYear = new Date().getFullYear();
  const labeled = [
    /(?:year\s*of\s*construction|constructed\s*in|built\s*in|year\s*built|completion\s*year|date\s*of\s*construction|possession\s*date)[:\s]+(\d{4})/i,
    /(\d{4})\s*(?:construction|built|completed|possession)/i,
  ];
  for (const re of labeled) {
    const m = text.match(re);
    if (m) {
      const y = parseInt(m[1]);
      if (y >= 1950 && y <= currentYear) return { value: y, confidence: 'high', source: m[0].trim() };
    }
  }
  const allYears = [...text.matchAll(/\b(19[5-9]\d|20[0-2]\d)\b/g)]
    .map(m => parseInt(m[1])).filter(y => y >= 1950 && y <= currentYear);
  if (allYears.length > 0) {
    const sorted = [...new Set(allYears)].sort((a, b) => a - b);
    if (sorted.length === 1) return { value: sorted[0], confidence: 'low', source: `Year found: ${sorted[0]}` };
    const candidate = sorted[Math.floor(sorted.length * 0.3)];
    return { value: candidate, confidence: 'low', source: `Estimated from years: ${sorted.join(', ')}` };
  }
  return null;
}

function extractCity(text) {
  const sorted = [...KNOWN_CITIES].sort((a, b) => b.length - a.length);
  for (const city of sorted) {
    const re = new RegExp('\\b' + city.replace(/\s+/g, '\\s+') + '\\b', 'i');
    if (re.test(text)) {
      let normalized = city;
      if (city === 'Bangalore')  normalized = 'Bengaluru';
      if (city === 'Calcutta')   normalized = 'Kolkata';
      if (city === 'Madras')     normalized = 'Chennai';
      if (city === 'Baroda')     normalized = 'Vadodara';
      if (city === 'Gurgaon')    normalized = 'Gurugram';
      if (city === 'New Delhi')  normalized = 'Delhi';
      if (city === 'Prayagraj')  normalized = 'Allahabad';
      return { value: normalized, confidence: 'high', source: `City: ${city}` };
    }
  }
  return null;
}

function extractLocality(text) {
  const sorted = [...KNOWN_LOCALITIES].sort((a, b) => b.length - a.length);
  for (const loc of sorted) {
    const re = new RegExp('\\b' + loc.replace(/\s+/g, '\\s+') + '\\b', 'i');
    if (re.test(text)) return { value: loc, confidence: 'high', source: `Locality: ${loc}` };
  }
  return null;
}

function extractPincode(text) {
  const m = text.match(/(?<!\d)([1-9]\d{5})(?!\d)/);
  if (m) return { value: m[1], confidence: 'high', source: `Pincode: ${m[1]}` };
  return null;
}

function extractDeclaredValue(text) {
  const crore = text.match(/(?:rs\.?|₹|■|inr|rupees?)\s*(\d+\.?\d*)\s*(?:crore|cr\.?)/i);
  if (crore) return { value: Math.round(parseFloat(crore[1]) * 10000000), confidence: 'high', source: crore[0].trim() };

  const lakh = text.match(/(?:rs\.?|₹|■|inr|rupees?)\s*(\d+\.?\d*)\s*(?:lakh|lac|l\.?)/i);
  if (lakh) return { value: Math.round(parseFloat(lakh[1]) * 100000), confidence: 'high', source: lakh[0].trim() };

  const full = text.match(/(?:rs\.?|₹|■|inr)\s*(\d{1,3}(?:[,]\d{2,3})+)/i);
  if (full) {
    const val = parseInt(full[1].replace(/,/g, ''));
    if (val > 100000 && val < 1000000000) return { value: val, confidence: 'medium', source: full[0].trim() };
  }

  const consid = text.match(/consideration\s+of\s+(?:rs\.?|₹)?\s*(\d[\d,]*)/i);
  if (consid) {
    const val = parseInt(consid[1].replace(/,/g, ''));
    if (val > 100000 && val < 1000000000) return { value: val, confidence: 'medium', source: consid[0].trim() };
  }

  const label = text.match(/(?:sale\s*value|market\s*value|property\s*value|consideration\s*amount)[:\s]+(?:rs\.?|₹|■)?\s*(\d[\d,]*)/i);
  if (label) {
    const val = parseInt(label[1].replace(/,/g, ''));
    if (val > 100000 && val < 1000000000) return { value: val, confidence: 'medium', source: label[0].trim() };
  }

  const standalone = text.match(/\b(\d{1,2},\d{2},\d{2},\d{3}|\d{1,2},\d{2},\d{5})\b/);
  if (standalone) {
    const val = parseInt(standalone[1].replace(/,/g, ''));
    if (val > 100000 && val < 1000000000) return { value: val, confidence: 'low', source: standalone[0] };
  }
  return null;
}

function extractFloorNumber(text) {
  const patterns = [
    /(?:floor\s*no\.?|floor\s*number)[:\s]+(\d+)/i,
    /(\d+)(?:st|nd|rd|th)\s*floor/i,
    /(?:situated\s*on|located\s*on)\s*(?:the\s*)?(\d+)(?:st|nd|rd|th)?\s*floor/i,
    /^floor[:\s]+(\d+)$/im,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) { const f = parseInt(m[1]); if (f >= 0 && f <= 100) return { value: f, confidence: 'high', source: m[0].trim() }; }
  }
  return null;
}

function extractTotalFloors(text) {
  const patterns = [
    /(?:total\s*floors?|no\.?\s*of\s*floors?|number\s*of\s*floors?)[:\s]+(\d+)/i,
    /g\s*\+\s*(\d+)/i,
    /(\d+)\s*(?:storey|story|storeyed)\s*building/i,
    /(\d+)\s*floors?\s*(?:building|structure|tower|complex)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) { const f = parseInt(m[1]); if (f >= 1 && f <= 100) return { value: f, confidence: 'high', source: m[0].trim() }; }
  }
  return null;
}

function extractConstructionQuality(text) {
  const lower = text.toLowerCase();
  if (/\b(?:premium|luxury|high[- ]end|imported\s*(?:marble|granite|tiles)|modular\s*kitchen|branded\s*fittings)\b/.test(lower))
    return { value: 'premium', confidence: 'medium', source: 'Premium quality keywords' };
  if (/\b(?:standard\s*finish|basic\s*finish|ordinary|normal\s*finish|economy)\b/.test(lower))
    return { value: 'standard', confidence: 'medium', source: 'Standard quality keywords' };
  if (/\b(?:good\s*finish|semi[- ]?premium|vitrified|branded)\b/.test(lower))
    return { value: 'good', confidence: 'medium', source: 'Good quality keywords' };
  return null;
}

function extractPAN(text) {
  const m = text.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  if (m) return { value: m[1], confidence: 'high', source: `PAN: ${m[1]}` };
  return null;
}

function extractPhone(text) {
  const m = text.match(/(?<!\d)([6-9]\d{9})(?!\d)/);
  if (m) return { value: m[1], confidence: 'high', source: `Phone: ${m[1]}` };
  return null;
}

function extractEmail(text) {
  const m = text.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/);
  if (m) return { value: m[1], confidence: 'high', source: `Email: ${m[1]}` };
  return null;
}

/* ═══════════════════════════════════════════════════════════
   SECTION D — LAND RECORD EXTRACTORS
═══════════════════════════════════════════════════════════ */

function detectLandRecordType(text) {
  const lower = text.toLowerCase();
  if (/7\/12|satbara|7-12|saat-baara/.test(lower))                          return 'SEVEN_TWELVE';
  if (/\brtc\b|record\s*of\s*rights|pahani|phani|hissa\s*no/.test(lower))   return 'RTC';
  if (/khata\s*(?:certificate|extract|no|number)|khatha|bbmp\s*khata/.test(lower)) return 'KHATA_CERT';
  if (/\bpatta\b|chitta|adangal|tslr|survey\s*settlement/.test(lower))      return 'PATTA';
  if (/mutation|jamabandi|fard|intiqal|dakhil\s*kharij/.test(lower))        return 'MUTATION';
  if (/encumbrance\s*certificate|ec\s*no|sub\s*registrar\s*office/.test(lower)) return 'EC';
  if (/index\s*ii|index-ii|registration\s*no|igr/.test(lower))              return 'INDEX_II';
  if (/tehsildar|naib\s*tehsildar|patwari|girdawari/.test(lower))           return 'TEHSILDAR_CERT';
  return null;
}

function isLandRecord(documentType) {
  return ['SEVEN_TWELVE','RTC','KHATA_CERT','PATTA','MUTATION','EC','INDEX_II','TEHSILDAR_CERT'].includes(documentType);
}

function extractSurveyNumber(text) {
  const patterns = [
    { re: /(?:gat\s*no\.?|gat\s*number)[:\s]+([A-Z0-9\/\-]+)/i, label: 'Gat No' },
    { re: /(?:survey\s*no\.?|s\.no\.?)[:\s]+([0-9]+(?:\/[0-9]+)?(?:[A-Z])?)/i, label: 'Survey No' },
    { re: /(?:khasra\s*no\.?|khata\s*no\.?)[:\s]+([0-9]+(?:\/[0-9]+)?)/i, label: 'Khasra No' },
    { re: /(?:hissa\s*no\.?|hissa\s*number)[:\s]+([0-9]+(?:\/[0-9]+)?)/i, label: 'Hissa No' },
    { re: /(?:plot\s*no\.?|plot\s*number)[:\s]+([A-Z0-9\/\-]+)/i, label: 'Plot No' },
    { re: /sy\.?\s*no\.?\s*[:\s]+([0-9]+(?:\/[0-9]+)?)/i, label: 'Sy. No' },
  ];
  for (const { re, label } of patterns) {
    const m = text.match(re);
    if (m) return { value: m[1].trim(), confidence: 'high', source: `${label}: ${m[0].trim()}` };
  }
  return null;
}

function extractLandArea(text) {
  const conversions = [
    { re: /(\d+\.?\d*)\s*(?:guntha|gunta|gunthas?)/gi, factor: 1089, unit: 'guntha' },
    { re: /(\d+\.?\d*)\s*(?:acres?)/gi, factor: 43560, unit: 'acre' },
    { re: /(\d+\.?\d*)\s*(?:hectares?|ha\.?)/gi, factor: 107639, unit: 'hectare' },
    { re: /(\d+\.?\d*)\s*(?:cents?)/gi, factor: 435.6, unit: 'cent' },
    { re: /(\d+\.?\d*)\s*(?:bigha)/gi, factor: 27000, unit: 'bigha' },
    { re: /(\d+\.?\d*)\s*(?:kanal)/gi, factor: 5445, unit: 'kanal' },
    { re: /(\d+\.?\d*)\s*(?:marla)/gi, factor: 272.25, unit: 'marla' },
    { re: /(\d+\.?\d*)\s*(?:sq\.?\s*m\.?|sqm|square\s*met(?:er|re)s?)/gi, factor: 10.764, unit: 'sqm' },
    { re: /(\d+\.?\d*)\s*(?:sq\.?\s*yd\.?|square\s*yards?)/gi, factor: 9, unit: 'sqyd' },
  ];
  for (const { re, factor, unit } of conversions) {
    re.lastIndex = 0;
    const m = re.exec(text);
    if (m) {
      const sqft = Math.round(parseFloat(m[1]) * factor);
      if (sqft > 50 && sqft < 50000000) return { value: sqft, confidence: 'high', source: `${m[1]} ${unit} = ${sqft.toLocaleString('en-IN')} sqft` };
    }
  }
  return extractArea(text);
}

function extractLandOwnerName(text) {
  const patterns = [
    /(?:khatedar|malik|pattadar|owner\s*name|land\s*owner|registered\s*owner)[:\s]+([A-Za-z\s\.]+?)(?:\n|,|$)/i,
    /(?:name\s*of\s*owner|owner)[:\s]+([A-Za-z\s\.]+?)(?:\n|,|$)/i,
    /(?:purchaser|buyer|transferee)[:\s]+([A-Za-z\s\.]+?)(?:\n|,|$)/i,
    /(?:S\/O|D\/O|W\/O|son\s*of|daughter\s*of|wife\s*of)\s+([A-Za-z\s\.]+?)(?:\n|,|$)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) {
      const name = m[1].trim().replace(/\s+/g, ' ');
      if (name.length > 2 && name.length < 80) return { value: name, confidence: 'medium', source: m[0].trim() };
    }
  }
  return extractApplicantName(text);
}

function extractVillageTaluka(text) {
  const result = {};
  const vm = text.match(/(?:village|gram|gaon|mouza)[:\s]+([A-Za-z\s]+?)(?:\n|,|taluka|district|$)/i);
  if (vm) result.village = vm[1].trim();
  const tm = text.match(/(?:taluka|tehsil|mandal|block)[:\s]+([A-Za-z\s]+?)(?:\n|,|district|$)/i);
  if (tm) result.taluka = tm[1].trim();
  const dm = text.match(/(?:district|zilla)[:\s]+([A-Za-z\s]+?)(?:\n|,|state|$)/i);
  if (dm) result.district = dm[1].trim();
  return Object.keys(result).length > 0 ? result : null;
}

function extractLandUse(text) {
  const lower = text.toLowerCase();
  if (/\bna\s*plot\b|non[- ]?agricultural\s*plot|n\.a\.\s*plot/.test(lower))
    return { value: 'land', confidence: 'high', source: 'NA Plot classification' };
  if (/\b(?:jirayat|bagayat|kharif|rabi|agricultural|farm\s*land|cultivable)\b/.test(lower))
    return { value: 'land', confidence: 'high', source: 'Agricultural land classification' };
  if (/\b(?:residential\s*plot|house\s*site|building\s*site)\b/.test(lower))
    return { value: 'residential', confidence: 'high', source: 'Residential plot classification' };
  if (/\b(?:commercial\s*plot|industrial\s*plot|shop\s*site)\b/.test(lower))
    return { value: 'commercial', confidence: 'medium', source: 'Commercial/industrial plot' };
  return null;
}

function extractMutationNumber(text) {
  const patterns = [
    /(?:mutation\s*no\.?|mutation\s*number)[:\s]+([A-Z0-9\/\-]+)/i,
    /(?:registration\s*no\.?|reg\.?\s*no\.?)[:\s]+([A-Z0-9\/\-]+)/i,
    /(?:document\s*no\.?|doc\.?\s*no\.?)[:\s]+([A-Z0-9\/\-]+)/i,
    /(?:intiqal\s*no\.?|dakhil\s*kharij\s*no\.?)[:\s]+([A-Z0-9\/\-]+)/i,
  ];
  for (const re of patterns) {
    const m = text.match(re);
    if (m) return { value: m[1].trim(), confidence: 'high', source: m[0].trim() };
  }
  return null;
}

function extractEncumbranceStatus(text) {
  const lower = text.toLowerCase();
  if (/nil\s*encumbrance|no\s*encumbrance|free\s*from\s*encumbrance/.test(lower))
    return { value: 'nil', confidence: 'high', source: 'Nil encumbrance stated' };
  if (/encumbrance\s*found|mortgage|charge\s*created|hypothecation/.test(lower))
    return { value: 'encumbered', confidence: 'high', source: 'Encumbrance/charge found' };
  return null;
}

/* ═══════════════════════════════════════════════════════════
   SECTION E — DOCUMENT TYPE DETECTION
═══════════════════════════════════════════════════════════ */

function detectDocumentType(text) {
  const lower = text.toLowerCase();
  const landType = detectLandRecordType(lower);
  if (landType) return landType;
  if (/sale\s*deed|agreement\s*to\s*sale|conveyance\s*deed/.test(lower))    return 'SALE_DEED';
  if (/property\s*tax|house\s*tax|municipal\s*tax/.test(lower))             return 'PROPERTY_TAX';
  if (/encumbrance\s*certificate|ec\s*certificate/.test(lower))             return 'ENCUMBRANCE_CERT';
  if (/building\s*plan|plan\s*approval|sanctioned\s*plan/.test(lower))      return 'BUILDING_PLAN';
  if (/khata|patta|revenue\s*record/.test(lower))                           return 'KHATA_PATTA';
  if (/aadhaar|aadhar|uid/.test(lower))                                     return 'AADHAAR';
  if (/permanent\s*account\s*number|pan\s*card/.test(lower))                return 'PAN_CARD';
  return 'UNKNOWN';
}

/* ═══════════════════════════════════════════════════════════
   SECTION F — MAIN EXTRACTION ORCHESTRATOR
═══════════════════════════════════════════════════════════ */

async function extract(filePath, mimeType) {
  const startTime = Date.now();
  let rawText = '';
  let ocrEngine = 'none';

  try {
    rawText = await extractRawText(filePath, mimeType);
    ocrEngine = mimeType === 'application/pdf' ? 'pdf-parse' : 'tesseract.js';
  } catch (err) {
    return { success: false, error: `Text extraction failed: ${err.message}`, fields: {}, rawText: '' };
  }

  if (!rawText || rawText.trim().length < 20) {
    return { success: false, error: 'Could not extract readable text. Ensure the document is clear and not handwritten.', fields: {}, rawText: '' };
  }

  const documentType = detectDocumentType(rawText);
  const landRecord   = isLandRecord(documentType);

  let extracted;

  if (landRecord) {
    const areaResult       = extractLandArea(rawText);
    const ownerResult      = extractLandOwnerName(rawText);
    const landUseResult    = extractLandUse(rawText);
    const cityResult       = extractCity(rawText);
    const localityResult   = extractLocality(rawText);
    const pincodeResult    = extractPincode(rawText);
    const surveyResult     = extractSurveyNumber(rawText);
    const mutationResult   = extractMutationNumber(rawText);
    const encResult        = extractEncumbranceStatus(rawText);
    const panResult        = extractPAN(rawText);
    const phoneResult      = extractPhone(rawText);
    const emailResult      = extractEmail(rawText);
    const valueResult      = extractDeclaredValue(rawText);
    const villageTaluka    = extractVillageTaluka(rawText);

    const localityFallback = (!localityResult && villageTaluka && villageTaluka.village)
      ? { value: villageTaluka.village, confidence: 'medium', source: `Village from land record: ${villageTaluka.village}` }
      : localityResult;

    extracted = {
      propertyType:        landUseResult || { value: 'land', confidence: 'medium', source: 'Land record — defaulting to land' },
      city:                cityResult,
      locality:            localityFallback,
      pincode:             pincodeResult,
      area:                areaResult,
      constructionQuality: null,
      declaredValue:       valueResult,
      applicantName:       ownerResult,
      applicantPAN:        panResult,
      applicantPhone:      phoneResult,
      applicantEmail:      emailResult,
      surveyNumber:        surveyResult,
      mutationNumber:      mutationResult,
      encumbranceStatus:   encResult,
      village:             villageTaluka && villageTaluka.village ? { value: villageTaluka.village, confidence: 'high', source: 'Village from land record' } : null,
      taluka:              villageTaluka && villageTaluka.taluka  ? { value: villageTaluka.taluka,  confidence: 'high', source: 'Taluka from land record'  } : null,
      district:            villageTaluka && villageTaluka.district? { value: villageTaluka.district,confidence: 'high', source: 'District from land record' } : null,
    };
  } else {
    extracted = {
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
  }

  // Build clean fields object (only non-null)
  const fields = {};
  const confidenceMap = {};
  let extractedCount = 0;

  for (const [key, result] of Object.entries(extracted)) {
    if (result !== null && result !== undefined) {
      fields[key] = result.value;
      confidenceMap[key] = { confidence: result.confidence, source: result.source };
      extractedCount++;
    }
  }

  const totalFields = Object.keys(extracted).length;
  const extractionRate = Math.round((extractedCount / totalFields) * 100);

  return {
    success: true,
    documentType,
    isLandRecord: landRecord,
    ocrEngine,
    processingTime: Date.now() - startTime,
    extractionRate,
    extractedCount,
    totalFields,
    fields,
    confidenceMap,
    rawTextLength: rawText.length,
    rawTextPreview: rawText.substring(0, 500).replace(/\s+/g, ' ').trim(),
  };
}

module.exports = { extract };
