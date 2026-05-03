'use strict';
/**
 * fieldExtractor.js — v4
 * Fixes: amenity regex escape, multi-option field ambiguity, rent parsing,
 * locality extraction, construction quality inference.
 */

// ---------------------------------------------------------------------------
// Document type detection
// ---------------------------------------------------------------------------
const DOC_TYPE_MAP = [
  { type: 'PROPERTY_CLASSIFICATION', patterns: [/Property\s*Classification\s*Form/i, /Loan\s*Application.*Property\s*Details/i] },
  { type: 'STRUCTURAL_METRICS',      patterns: [/Structural\s*Metrics\s*&\s*Amenities/i, /Structural\s*Metrics/i] },
  { type: 'LEGAL_MARKET_APPLICANT',  patterns: [/Legal.*Market.*Applicant/i, /Legal\s*Compliance/i] },
  { type: 'PROPERTY_VERIFICATION',   patterns: [/Property\s*Verification\s*(Report|Certificate)/i, /PVC\//i] },
  { type: 'SALE_DEED',               patterns: [/Sale\s*Deed/i, /Conveyance\s*Deed/i] },
  { type: 'PROPERTY_TAX',            patterns: [/Property\s*Tax/i, /House\s*Tax/i] },
  { type: 'BUILDING_PLAN',           patterns: [/Building\s*Plan/i, /Approved\s*Plan/i] },
  { type: 'AADHAAR',                 patterns: [/Aadhaar/i, /UIDAI/i] },
  { type: 'PAN_CARD',                patterns: [/Permanent\s*Account\s*Number/i, /Income\s*Tax\s*Department/i] },
  { type: 'EC',                      patterns: [/Encumbrance\s*Certificate/i] },
  { type: 'MutationOrder',           patterns: [/Mutation\s*Order/i, /Mutation\s*Register/i] },
  { type: '7/12',                    patterns: [/7\s*\/\s*12/i, /satbara/i, /saat\s*baara/i] },
  { type: 'Khatauni',                patterns: [/Khatauni/i, /Khasra/i] },
  { type: 'Jamabandi',               patterns: [/Jamabandi/i] },
  { type: 'Patta',                   patterns: [/\bPatta\b/i, /\bChitta\b/i] },
  { type: 'RTC',                     patterns: [/\bRTC\b/, /Rights?\s*Tenancy/i, /Pahani/i] },
  { type: 'ROR',                     patterns: [/Record\s*of\s*Rights/i] },
  { type: 'KHATA',                   patterns: [/\bKhata\b/i, /\bKhatha\b/i] },
];

function detectDocType(text) {
  for (const { type, patterns } of DOC_TYPE_MAP) {
    if (patterns.some(p => p.test(text))) return type;
  }
  return 'UNKNOWN';
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function clean(v) {
  return v ? v.trim().replace(/^[:\-\s]+|[:\-\s]+$/g, '').trim() : null;
}

function parseNum(s) {
  if (!s) return null;
  const str = String(s).replace(/,/g, '').trim();
  if (/^\d+(\.\d+)?\s*[Cc][Rr]/.test(str)) return Math.round(parseFloat(str) * 10000000);
  if (/^\d+(\.\d+)?\s*[Ll]/.test(str))     return Math.round(parseFloat(str) * 100000);
  const n = parseFloat(str.replace(/\s/g, ''));
  return isNaN(n) ? null : n;
}

/**
 * Extract value after a label. Tries "Label: Value" and "Label Value" (space/newline).
 * valuePattern must contain exactly one capture group.
 */
function labelVal(label, text, valuePattern) {
  const vp = valuePattern || '([^\\n]{1,80})';
  const tries = [
    new RegExp(label + '\\s*[:\\-]\\s*' + vp, 'i'),
    new RegExp(label + '\\s*[:\\-]\\s*\\n\\s*' + vp, 'i'),
    new RegExp(label + '\\s+' + vp, 'i'),
  ];
  for (const re of tries) {
    const m = text.match(re);
    if (m && m[1]) {
      const v = clean(m[1]);
      if (v) return v;
    }
  }
  return null;
}

/**
 * Like labelVal but only matches when the value is a SINGLE option (not "A / B / C").
 * Prevents picking up template placeholder text like "Freehold / Leasehold".
 */
function labelValSingle(label, text, valuePattern) {
  const raw = labelVal(label, text, valuePattern);
  if (!raw) return null;
  // Reject if value contains " / " — means all options are listed (unfilled template)
  if (raw.includes(' / ') || raw.includes('/')) return null;
  return raw;
}

// Major Indian cities
const CITIES = [
  'Ahmedabad','Mumbai','Delhi','Bangalore','Bengaluru','Chennai','Hyderabad',
  'Pune','Kolkata','Jaipur','Surat','Lucknow','Kanpur','Nagpur','Indore',
  'Bhopal','Patna','Vadodara','Ludhiana','Agra','Nashik','Faridabad','Meerut',
  'Rajkot','Varanasi','Amritsar','Allahabad','Prayagraj','Ranchi','Coimbatore',
  'Jodhpur','Madurai','Raipur','Kota','Chandigarh','Guwahati','Solapur',
  'Mysore','Mysuru','Noida','Gurugram','Gurgaon','Navi Mumbai','Thane',
  'Gandhinagar','Anand','Bharuch','Vapi','Junagadh','Bhavnagar','Jamnagar',
  'Aurangabad','Vijayawada','Gwalior','Jabalpur','Bareilly','Aligarh',
  'Moradabad','Jalandhar','Bhubaneswar','Warangal','Guntur','Bhiwandi',
  'Saharanpur','Gorakhpur','Bikaner','Amravati','Pimpri','Chinchwad',
  'Nanded','Kolhapur','Akola','Latur','Dhule','Ahmednagar','Sangli',
  'Mangalore','Hubli','Dharwad','Belgaum','Bellary','Shimoga','Tumkur',
  'Tirupati','Nellore','Kurnool','Rajahmundry','Kakinada','Vizag','Visakhapatnam',
  'Tiruchirappalli','Trichy','Salem','Tirunelveli','Erode','Vellore',
  'Kochi','Thiruvananthapuram','Kozhikode','Thrissur',
  'Dehradun','Haridwar','Roorkee','Udaipur','Ajmer','Bhilwara',
];
const CITY_REGEX = new RegExp('\\b(' + CITIES.join('|') + ')\\b', 'i');

const STATE_MAP = {
  'Gujarat': /Gujarat/i, 'Maharashtra': /Maharashtra/i,
  'Uttar Pradesh': /Uttar\s*Pradesh/i, 'Rajasthan': /Rajasthan/i,
  'Karnataka': /Karnataka/i, 'Tamil Nadu': /Tamil\s*Nadu/i,
  'Andhra Pradesh': /Andhra\s*Pradesh/i, 'Telangana': /Telangana/i,
  'Punjab': /Punjab/i, 'Haryana': /Haryana/i,
  'West Bengal': /West\s*Bengal/i, 'Madhya Pradesh': /Madhya\s*Pradesh/i,
  'Bihar': /Bihar/i, 'Kerala': /Kerala/i, 'Odisha': /Odisha|Orissa/i,
  'Delhi': /\bDelhi\b/i, 'Uttarakhand': /Uttarakhand/i,
  'Jharkhand': /Jharkhand/i, 'Chhattisgarh': /Chhattisgarh/i,
  'Assam': /Assam/i, 'Himachal Pradesh': /Himachal\s*Pradesh/i,
};

// Amenities — NOTE: escape must use literal backslash-dollar, NOT template literals
const AMENITY_LIST = [
  'Parking', 'Lift', 'Security', 'Gym', 'Swimming Pool',
  'Power Backup', 'Garden', 'Club House', 'CCTV', 'Intercom',
  'Fire Safety', 'Water Treatment', 'Solar Panels', 'Rain Water Harvesting',
];

// ---------------------------------------------------------------------------
// Main field extractor — v4
// ---------------------------------------------------------------------------
function extractFields(text) {
  const t = text || '';
  const out = {};

  // ── 1. Applicant name ─────────────────────────────────────────────────
  const namePatterns = [
    /Full\s*Legal\s*Name\s*[:\-]?\s*([A-Za-z][A-Za-z\s.]{3,60}?)(?:\n|$)/i,
    /(?:Owner'?s?\s*Name|Applicant\s*Name|Borrower\s*Name|Name\s*of\s*Owner)\s*[:\-]?\s*([A-Za-z][A-Za-z\s.]{3,60}?)(?:\n|$)/i,
    /Name\s*[:\-]\s*([A-Za-z][A-Za-z\s.]{3,60}?)(?:\n|$)/i,
  ];
  for (const p of namePatterns) {
    const m = t.match(p);
    if (m && m[1]) { out.applicantName = clean(m[1]); break; }
  }

  // ── 2. PAN ────────────────────────────────────────────────────────────
  const panM = t.match(/\b([A-Z]{5}[0-9]{4}[A-Z])\b/);
  if (panM) out.applicantPAN = panM[1];

  // ── 3. Phone ──────────────────────────────────────────────────────────
  // Handles "+91 98250 47831" with spaces
  const phonePatterns = [
    /(?:Contact\s*Phone|Mobile|Phone|Cell|Mob\.?)\s*[:\-]?\s*(\+?91[-\s]?[6-9]\d[\d\s]{8,10})/i,
    /(?:Contact\s*Phone|Mobile|Phone|Cell|Mob\.?)\s*[:\-]?\s*([6-9]\d{9})/i,
    /\b(\+91[-\s]?[6-9]\d[\d\s]{8,10})\b/,
    /\b([6-9]\d{9})\b/,
  ];
  for (const p of phonePatterns) {
    const m = t.match(p);
    if (m && m[1]) {
      const digits = m[1].replace(/\D/g, '');
      const phone = digits.length >= 10 ? digits.slice(-10) : null;
      if (phone) { out.applicantPhone = phone; break; }
    }
  }

  // ── 4. Email ──────────────────────────────────────────────────────────
  const emailM = t.match(/\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b/);
  if (emailM) out.applicantEmail = emailM[1].toLowerCase();

  // ── 5. Property type ──────────────────────────────────────────────────
  // Use labelValSingle to avoid "Residential / Commercial / ..." template lines
  const typeRaw = labelValSingle('(?:Property\\s*)?Type', t, '(Residential|Commercial|Industrial|Land|Agricultural|Apartment|Villa|Flat|Plot)\\b')
    || (t.match(/\b(Residential|Commercial|Industrial)\s*Property\b/i) || [])[1];
  if (typeRaw) {
    const rt = typeRaw.toLowerCase();
    out.propertyType = rt.includes('commercial') ? 'commercial'
      : rt.includes('industrial') ? 'industrial'
      : (rt.includes('land') || rt.includes('plot') || rt.includes('agricultural')) ? 'land'
      : 'residential';
  }

  // ── 6. Property sub-type ──────────────────────────────────────────────
  const subTypeRaw = labelValSingle(
    'Sub[-\\s]?[Tt]ype',
    t,
    '(Apartment|Villa|Row\\s*House|Bungalow|Studio|Penthouse|Builder\\s*Floor|Shop|Office|Showroom|Mall\\s*Unit|Business\\s*Center|Warehouse|Factory|Godown|Shed|Industrial\\s*Plot|Flat|Independent\\s*House)\\b'
  );
  if (subTypeRaw) {
    out.propertySubType = subTypeRaw.trim();
  } else {
    // Infer from free text only if not in a "Sub-type: X" label context
    const subInfer = t.match(/\bSub[-\s]?type\s*[:\-]\s*(Apartment|Villa|Bungalow|Penthouse|Studio|Warehouse|Factory|Showroom|Flat)\b/i);
    if (subInfer) out.propertySubType = subInfer[1];
  }

  // ── 7. Loan purpose ───────────────────────────────────────────────────
  const purposeRaw = labelVal('(?:Loan\\s*)?Purpose', t, '([^\\n]{5,80})');
  if (purposeRaw && !purposeRaw.includes('/')) {
    const pl = purposeRaw.toLowerCase();
    out.purpose = pl.includes('working') ? 'working_capital'
      : (pl.includes('mortgage') || pl.includes('home')) ? 'mortgage'
      : 'lap';
  } else if (/Loan\s*Against\s*Property|(?<!\w)LAP(?!\w)/i.test(t)) {
    out.purpose = 'lap';
  } else if (/Home\s*Loan|Housing\s*Loan/i.test(t)) {
    out.purpose = 'mortgage';
  }

  // ── 8. Loan amount ────────────────────────────────────────────────────
  // Handles "Rs. 45,00,000" with space after Rs.
  const loanPatterns = [
    /Loan\s*Amount\s*(?:Required|Requested|Sought|Applied)?\s*[:\-]?\s*(?:Rs\.?\s*|₹\s*|INR\s*)?([\d,]+(?:\.\d+)?)/i,
    /(?:Rs\.?\s*|₹\s*)([\d,]+(?:\.\d+)?)\s*(?:loan|required|requested)/i,
  ];
  for (const p of loanPatterns) {
    const m = t.match(p);
    if (m) { const v = parseNum(m[1]); if (v && v > 10000) { out.loanAmountRequired = v; break; } }
  }

  // ── 9. Declared / market value ────────────────────────────────────────
  const valPatterns = [
    /(?:Estimated\s*Market\s*Value|Declared\s*Value|Sale\s*(?:Consideration|Price)|Property\s*Value|Base\s*Case)\s*[:\-]?\s*(?:Rs\.?\s*|₹\s*|INR\s*)?([\d,]+(?:\.\d+)?)/i,
  ];
  for (const p of valPatterns) {
    const m = t.match(p);
    if (m) { const v = parseNum(m[1]); if (v && v > 10000) { out.declaredValue = v; break; } }
  }

  // ── 10. City ──────────────────────────────────────────────────────────
  const cityLabel = labelVal('(?:City|Town)', t, '([A-Za-z\\s]{3,30}?)(?:\\n|,|$)');
  if (cityLabel) {
    const cm = cityLabel.match(CITY_REGEX);
    if (cm) out.city = cm[1];
  }
  if (!out.city) {
    const cm = t.match(CITY_REGEX);
    if (cm) out.city = cm[1];
  }

  // ── 11. Locality ──────────────────────────────────────────────────────
  // Try explicit label
  const localityLabel = labelVal('(?:Locality|Area|Sector|Colony|Nagar|Neighbourhood|Neighborhood|Society|Layout)', t, '([^\\n,]{3,50})');
  if (localityLabel && !/^\d+$/.test(localityLabel)) {
    out.locality = localityLabel;
  }
  // Extract from multiline address: find line just before city line
  if (!out.locality && out.city) {
    const lines = t.split('\n').map(l => l.trim()).filter(Boolean);
    const cityIdx = lines.findIndex(l => new RegExp('\\b' + out.city + '\\b', 'i').test(l));
    if (cityIdx > 0) {
      // Walk backwards to find a non-flat/non-number line
      for (let i = cityIdx - 1; i >= 0; i--) {
        const line = lines[i];
        if (line.length > 3 && !/^(flat|plot|house|door|no\.|unit|block|wing|\d+)/i.test(line)) {
          // Strip trailing comma
          out.locality = line.replace(/,\s*$/, '').trim();
          break;
        }
      }
    }
  }
  // Fallback: address line
  if (!out.locality) {
    const addrM = t.match(/(?:Full\s*Address|Address|Property\s*Address)\s*[:\-]?\s*([^\n]{10,100})/i);
    if (addrM) {
      const parts = addrM[1].split(',').map(s => s.trim()).filter(Boolean);
      const best = parts.find(p => p.length > 4 && !/^\d/.test(p) && !/^(flat|plot|house|door|no\.|unit)/i.test(p));
      if (best) out.locality = best;
    }
  }

  // ── 12. Pincode ───────────────────────────────────────────────────────
  const pinPatterns = [
    /(?:PIN\s*Code|Pincode|Zip\s*Code|Postal\s*Code)\s*[:\-]?\s*(\d{6})\b/i,
    /[—\-,\s](\d{6})\b/,
    /\b(\d{6})\b/,
  ];
  for (const p of pinPatterns) {
    const m = t.match(p);
    if (m && /^\d{6}$/.test(m[1])) { out.pincode = m[1]; break; }
  }

  // ── 13. Area sqft ─────────────────────────────────────────────────────
  // Priority: Built-up > Carpet > Super Built-up > generic
  // Handles "- Built-up: 1,200 sq ft" format
  let areaSqft = null, areaType = null;
  const areaPatterns = [
    { p: /[-\u2013]\s*Built[\-\s]?up\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,           type: 'builtup' },
    { p: /Built[\-\s]?up\s*(?:Area)?\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,           type: 'builtup' },
    { p: /[-\u2013]\s*Carpet\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,                   type: 'carpet' },
    { p: /Carpet\s*(?:Area)?\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,                   type: 'carpet' },
    { p: /[-\u2013]\s*Super\s*Built[\-\s]?up\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,   type: 'superbuiltup' },
    { p: /Super\s*Built[\-\s]?up\s*(?:Area)?\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,   type: 'superbuiltup' },
    { p: /(?:Total\s*)?Area\s*[:\-]?\s*([\d,]+)\s*sq\s*ft/i,                    type: 'builtup' },
    { p: /([\d,]+)\s*sq\s*ft/i,                                                  type: 'builtup' },
    { p: /([\d,]+)\s*(?:sqm|sq\.?\s*m\.?|square\s*met(?:er|re)s?)/i,            type: 'builtup', mult: 10.764 },
  ];
  for (const { p, type, mult } of areaPatterns) {
    const m = t.match(p);
    if (m) {
      const raw = parseNum(m[1]);
      if (raw && raw > 0) { areaSqft = mult ? Math.round(raw * mult) : raw; areaType = type; break; }
    }
  }
  if (areaSqft && areaSqft > 0) { out.areaSqft = areaSqft; out.areaType = areaType; }

  // ── 14. Year of construction ──────────────────────────────────────────
  // "Year of Construction: 2018 (Mid-age: ~7 years)" — must not grab the ~7
  const yearM = t.match(/(?:Year\s*of\s*Construction|Year\s*Built|Constructed\s*in|Built\s*in|Year\s*of\s*Completion)\s*[:\-]?\s*((?:19|20)\d{2})\b/i)
    || t.match(/\b((?:19|20)\d{2})\b/);
  if (yearM) {
    const y = parseInt(yearM[1], 10);
    if (y > 1900 && y <= new Date().getFullYear() + 1) out.yearOfConstruction = y;
  }

  // ── 15. Floor number ──────────────────────────────────────────────────
  // "Floor No.: 3rd Floor"
  const floorPatterns = [
    /Floor\s*No\.?\s*[:\-]?\s*(\d+)(?:st|nd|rd|th)?\s*Floor/i,
    /Floor\s*No\.?\s*[:\-]?\s*(Ground|GF|G)\b/i,
    /(\d+)(?:st|nd|rd|th)\s*Floor\b/i,
    /\b(Ground|GF)\s*Floor\b/i,
  ];
  for (const p of floorPatterns) {
    const m = t.match(p);
    if (m && m[1]) {
      const fc = m[1].toLowerCase().replace(/st|nd|rd|th/g, '').trim();
      out.floorNumber = (fc === 'ground' || fc === 'gf' || fc === 'g') ? 0 : (parseInt(fc, 10) || 0);
      break;
    }
  }

  // ── 16. Total floors ──────────────────────────────────────────────────
  // "Total Floors: G + 7" → 8
  const gplusM = t.match(/Total\s*Floors?\s*[:\-]?\s*G\s*\+\s*(\d+)/i);
  if (gplusM) {
    out.totalFloors = parseInt(gplusM[1], 10) + 1;
  } else {
    const tfRaw = labelVal('Total\\s*Floors?', t, '(\\d+)\\b');
    if (tfRaw) out.totalFloors = parseInt(tfRaw, 10);
  }

  // ── 17. Construction quality ──────────────────────────────────────────
  // Form 2 lists "- Standard: 0.95x / - Good: 1.00x / - Premium: 1.10x"
  // No single option is marked, so we cannot determine quality from this form.
  // Only extract if a single value is explicitly selected/stated.
  const qualExplicit = labelValSingle('Construction\\s*Quality', t, '(Good|Standard|Premium|RCC|Pucca|Basic|Superior)\\b');
  if (qualExplicit) {
    const q = qualExplicit.toLowerCase();
    out.constructionQuality = (q === 'rcc' || q === 'pucca' || q === 'premium' || q === 'superior') ? 'premium'
      : (q === 'good') ? 'good' : 'standard';
  }
  // Infer from material keywords if no explicit label
  if (!out.constructionQuality) {
    if (/\bpremium\s*(?:finish|quality|construction)\b|\bmarble\b|\bvitrified\b/i.test(t)) {
      out.constructionQuality = 'premium';
    } else if (/\bRCC\b|\bpucca\b|\breinforced\b/i.test(t)) {
      out.constructionQuality = 'good';
    }
  }

  // ── 18. Amenities ─────────────────────────────────────────────────────
  // CRITICAL: escape must use String.replace with literal replacement, NOT template literal
  const amenities = [];
  for (const amenity of AMENITY_LIST) {
    // Manually escape each special char — avoids any template/tooling corruption
    const escaped = amenity
      .replace(/\\/g, '\\\\')
      .replace(/\./g, '\\.')
      .replace(/\*/g, '\\*')
      .replace(/\+/g, '\\+')
      .replace(/\?/g, '\\?')
      .replace(/\^/g, '\\^')
      .replace(/\$/g, '\\$')
      .replace(/\{/g, '\\{')
      .replace(/\}/g, '\\}')
      .replace(/\[/g, '\\[')
      .replace(/\]/g, '\\]')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)')
      .replace(/\|/g, '\\|');

    // "AmenityName: Yes" or "AmenityName: No" — only pick Yes
    const yesRe = new RegExp(escaped + '\\s*[:\\-]?\\s*(?:Yes|Y\\b|\\u2713|\\u2714|Available|Present)', 'i');
    // Amenity listed in a comma/bullet list under "Amenities:" heading
    const listRe = new RegExp('(?:Amenities|Facilities|Features)[^\\n]{0,200}' + escaped, 'is');
    if (yesRe.test(t) || listRe.test(t)) amenities.push(amenity);
  }
  if (amenities.length > 0) out.amenities = amenities;

  // ── 19. Monthly rent ──────────────────────────────────────────────────
  // "Monthly Rent: Rs. 28,000 per month" — capture the number after Rs.
  const rentM = t.match(/Monthly\s*Rent(?:al)?\s*[:\-]?\s*(?:Rs\.?\s*|₹\s*|INR\s*)?([\d,]+(?:\.\d+)?)/i);
  if (rentM) { const rv = parseNum(rentM[1]); if (rv && rv > 0) out.monthlyRent = rv; }

  // ── 20. Occupancy status ──────────────────────────────────────────────
  // Use labelValSingle to reject "Self-occupied / Rented / Vacant" template lines
  const occRaw = labelValSingle('Occupancy\\s*(?:Status|Type)', t, '(Rented|Self[-\\s]?Occupied|Vacant|Owner\\s*Occupied|Leased)\\b');
  if (occRaw) {
    const o = occRaw.toLowerCase();
    out.occupancyStatus = (o.includes('rent') || o.includes('leas')) ? 'rented'
      : o.includes('vacant') ? 'vacant' : 'self_occupied';
  }

  // ── 21. Ownership type ────────────────────────────────────────────────
  // Use labelValSingle to reject "Freehold / Leasehold" template lines
  const ownRaw = labelValSingle('Ownership\\s*(?:Type|Status)', t, '(Freehold|Leasehold|Free\\s*Hold|Lease\\s*Hold)\\b')
    || (() => {
      // Only match standalone word if it's NOT followed by " / "
      const m = t.match(/\b(Freehold|Leasehold)\b(?!\s*\/)/i);
      return m ? m[1] : null;
    })();
  if (ownRaw) out.ownershipType = ownRaw.toLowerCase().includes('lease') ? 'leasehold' : 'freehold';

  // ── 22. Title clarity ─────────────────────────────────────────────────
  // Use labelValSingle to reject "Clear / Disputed / Litigation" template lines
  const titleRaw = labelValSingle('Title\\s*(?:Status|Clarity)', t, '(Clear|Disputed|Litigation|Under\\s*Litigation)\\b')
    || (() => {
      const m = t.match(/\b(Clear|Disputed|Litigation)\b(?!\s*\/)/i);
      return m ? m[1] : null;
    })();
  if (titleRaw) {
    const tl = titleRaw.toLowerCase();
    out.titleClarity = tl.includes('litig') ? 'litigation'
      : tl.includes('disput') ? 'disputed' : 'clear';
  }

  // ── 23. Encumbrance ───────────────────────────────────────────────────
  if (/nil\s*encumbrance|no\s*encumbrance|free\s*from\s*encumbrance|encumbrance[:\s]*nil/i.test(t)) {
    out.encumbranceStatus = 'nil';
  } else if (/encumbered|mortgage\s*(?:on|over)|lien|charge\s*on|hypothecation/i.test(t)) {
    out.encumbranceStatus = 'encumbered';
  }

  // ── 24. Land record fields ────────────────────────────────────────────
  const surveyRaw = labelVal('Survey\\s*(?:No|Number|Num)\\.?', t, '([\\w\\-/\\s]+?)(?:\\n|,|$)')
    || labelVal('Gat\\s*(?:No|Number)\\.?', t, '([\\w\\-/\\s]+?)(?:\\n|,|$)')
    || labelVal('Khasra\\s*(?:No|Number)\\.?', t, '([\\w\\-/\\s]+?)(?:\\n|,|$)');
  if (surveyRaw) out.surveyNo = surveyRaw;

  const mutationRaw = labelVal('Mutation\\s*(?:No|Number|Entry)\\.?', t, '([\\w\\-/\\s]+?)(?:\\n|,|$)');
  if (mutationRaw) out.mutationNo = mutationRaw;

  out.district = clean(labelVal('District', t, '([\\w\\s]+?)(?:\\n|,|$)'));
  out.tehsil   = clean(labelVal('(?:Tehsil|Taluka|Mandal|Tahasil)', t, '([^\\n,]{2,40})'));
  out.village  = clean(labelVal('(?:Village|Gaon|Gram|Mouza)', t, '([^\\n,]{2,40})'));

  for (const [state, pattern] of Object.entries(STATE_MAP)) {
    if (pattern.test(t)) { out.state = state; break; }
  }

  return Object.fromEntries(Object.entries(out).filter(([, v]) => v !== null && v !== undefined && v !== ''));
}

// ---------------------------------------------------------------------------
// Confidence scoring
// ---------------------------------------------------------------------------
function scoreConfidence(extracted) {
  const weights = {
    applicantName: 10, applicantPhone: 8, applicantPAN: 8,
    city: 10, pincode: 8, areaSqft: 10,
    yearOfConstruction: 5, loanAmountRequired: 8, declaredValue: 5,
    propertyType: 8, constructionQuality: 4, locality: 6,
    floorNumber: 3, totalFloors: 2, amenities: 5,
    ownershipType: 4, titleClarity: 4, occupancyStatus: 4,
  };
  const total = Object.values(weights).reduce((a, b) => a + b, 0);
  const earned = Object.entries(weights).reduce((sum, [k, w]) => {
    const v = extracted[k];
    const present = v !== null && v !== undefined && v !== '' && !(Array.isArray(v) && v.length === 0);
    return sum + (present ? w : 0);
  }, 0);
  return Math.round((earned / total) * 100);
}

module.exports = { extractFields, detectDocType, scoreConfidence };
