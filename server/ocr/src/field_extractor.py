"""
field_extractor.py
Extracts structured fields from OCR / direct-text output for:
  1. Land records (Khatauni, 7/12, Jamabandi, Patta, RTC, EC, etc.)
  2. Property documents (Sale Deed, Aadhaar, PAN, Property Tax, Building Plan,
     Property Verification Reports, Valuation Certificates)

Returned schema maps directly to PropertyForm field names via
documentController.js  mapOCRToFormFields().
"""

import datetime
import logging
import re
from typing import Any, Dict, List, Optional

import regex  # 'regex' package — better Unicode support than 're'

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Area conversion constants (relative to 1 hectare)
# ---------------------------------------------------------------------------
AREA_TO_HECTARE = {
    "hectare": 1.0, "ha": 1.0,
    "bigha": 0.2529, "acre": 0.4047,
    "guntha": 0.01012, "cent": 0.004047,
    "marla": 0.002529, "kanal": 0.05059,
    "dismil": 0.004047, "are": 0.01,
}

# ---------------------------------------------------------------------------
# Document type detection patterns
# ---------------------------------------------------------------------------
DOC_TYPE_PATTERNS = {
    "PROPERTY_VERIFICATION": [
        r"Property\s*Verification\s*(?:Report|Certificate)",
        r"Valuation\s*Certificate",
        r"PVC/",
    ],
    "SALE_DEED":     [r"Sale\s*Deed", r"विक्रय\s*पत्र", r"Conveyance\s*Deed"],
    "PROPERTY_TAX":  [r"Property\s*Tax", r"House\s*Tax", r"Municipal\s*Tax", r"संपत्ति\s*कर"],
    "BUILDING_PLAN": [r"Building\s*Plan", r"Floor\s*Plan", r"Approved\s*Plan"],
    "AADHAAR":       [r"Aadhaar", r"UIDAI", r"Unique\s*Identification", r"आधार"],
    "PAN_CARD":      [r"Permanent\s*Account\s*Number", r"Income\s*Tax\s*Department"],
    "INDEX_II":      [r"Index\s*II", r"Index\s*2", r"Registration\s*Certificate"],
    "KHATA_PATTA":   [r"Khata\s*Certificate", r"Patta\s*Chitta"],
    "EC":            [r"\bEC\b", r"Encumbrance\s*Certificate", r"भार\s*प्रमाण"],
    "MutationOrder": [r"दाखिल\s*खारिज", r"Mutation\s*Order"],
    "7/12":          [r"7\s*/\s*12", r"सात\s*बारा", r"satbara"],
    "ROR":           [r"\bROR\b", r"Record\s*of\s*Rights"],
    "Khatauni":      [r"खतौनी", r"Khatauni"],
    "Patta":         [r"पट्टा", r"\bPatta\b"],
    "Jamabandi":     [r"जमाबंदी", r"Jamabandi"],
    "Adangal":       [r"अदंगल", r"Adangal", r"1-B"],
    "RTC":           [r"\bRTC\b", r"Rights?\s*Tenancy\s*Crops?"],
}

STATE_PATTERNS = {
    "Uttar Pradesh":    [r"उत्तर\s*प्रदेश", r"Uttar\s*Pradesh", r"\bU\.?P\.?\b"],
    "Maharashtra":      [r"महाराष्ट्र", r"Maharashtra"],
    "Rajasthan":        [r"राजस्थान", r"Rajasthan"],
    "Madhya Pradesh":   [r"मध्य\s*प्रदेश", r"Madhya\s*Pradesh"],
    "Bihar":            [r"बिहार", r"Bihar"],
    "Gujarat":          [r"गुजरात", r"Gujarat"],
    "Karnataka":        [r"कर्नाटक", r"Karnataka"],
    "Tamil Nadu":       [r"तमिलनाडु", r"Tamil\s*Nadu"],
    "Andhra Pradesh":   [r"आंध्र\s*प्रदेश", r"Andhra\s*Pradesh"],
    "Telangana":        [r"तेलंगाना", r"Telangana"],
    "Punjab":           [r"पंजाब", r"Punjab"],
    "Haryana":          [r"हरियाणा", r"Haryana"],
    "West Bengal":      [r"पश्चिम\s*बंगाल", r"West\s*Bengal"],
    "Odisha":           [r"ओडिशा", r"Odisha", r"Orissa"],
    "Kerala":           [r"केरल", r"Kerala"],
    "Jharkhand":        [r"झारखंड", r"Jharkhand"],
    "Chhattisgarh":     [r"छत्तीसगढ़", r"Chhattisgarh"],
    "Assam":            [r"असम", r"Assam"],
    "Uttarakhand":      [r"उत्तराखंड", r"Uttarakhand"],
    "Himachal Pradesh": [r"हिमाचल\s*प्रदेश", r"Himachal\s*Pradesh"],
    "Goa":              [r"गोवा", r"Goa"],
    "Delhi":            [r"दिल्ली", r"Delhi", r"\bNCT\b"],
}

LAND_TYPE_KEYWORDS = {
    "सिंचित": "Irrigated", "Irrigated": "Irrigated",
    "असिंचित": "Unirrigated", "Unirrigated": "Unirrigated",
    "खुद काश्त": "Self-cultivated",
    "बटाई": "Sharecropped",
    "जिरायत": "Rainfed",
    "नहरी": "Canal-irrigated",
    "Dryland": "Dryland", "Wetland": "Wetland",
}

LAND_USE_KEYWORDS = {
    "कृषि": "Agricultural", "Agricultural": "Agricultural",
    "आवासीय": "Residential", "Residential": "Residential",
    "व्यावसायिक": "Commercial", "Commercial": "Commercial",
    "बंजर": "Barren", "Barren": "Barren",
    "वन": "Forest", "Forest": "Forest",
    "औद्योगिक": "Industrial", "Industrial": "Industrial",
}

# Major Indian cities for city detection
INDIAN_CITIES = (
    "Ahmedabad|Mumbai|Delhi|Bangalore|Bengaluru|Chennai|Hyderabad|Pune|Kolkata|"
    "Jaipur|Surat|Lucknow|Kanpur|Nagpur|Indore|Bhopal|Patna|Vadodara|Ludhiana|"
    "Agra|Nashik|Faridabad|Meerut|Rajkot|Varanasi|Srinagar|Aurangabad|Amritsar|"
    "Allahabad|Prayagraj|Ranchi|Coimbatore|Jabalpur|Gwalior|Vijayawada|Jodhpur|"
    "Madurai|Raipur|Kota|Chandigarh|Guwahati|Solapur|Mysore|Mysuru|Bareilly|"
    "Noida|Gurugram|Gurgaon|Navi Mumbai|Thane|Pimpri|Chinchwad|Gandhinagar|"
    "Anand|Bharuch|Vapi|Junagadh|Bhavnagar|Jamnagar|Mehsana|Morbi"
)

# ---------------------------------------------------------------------------
# Utility helpers
# ---------------------------------------------------------------------------

def _first_match(patterns: List[str], text: str, flags: int = 0) -> Optional[str]:
    for pat in patterns:
        try:
            m = regex.search(pat, text, flags | regex.IGNORECASE | regex.UNICODE)
            if m:
                # Return group(1) if it exists, else group(0)
                return m.group(1).strip() if m.lastindex and m.lastindex >= 1 else m.group(0).strip()
        except Exception:
            continue
    return None


def _clean_value(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = val.strip().strip(":-।|")
    return val if val else None


def _parse_number(s: str) -> Optional[float]:
    if not s:
        return None
    s = s.replace(",", "").replace(" ", "")
    try:
        return float(s)
    except ValueError:
        return None


def _parse_int(s: str) -> Optional[int]:
    if not s:
        return None
    m = re.search(r"\d+", str(s))
    return int(m.group()) if m else None


# ---------------------------------------------------------------------------
# Main extractor class
# ---------------------------------------------------------------------------

class LandFieldExtractor:
    """
    Extracts structured fields from OCR / direct-text output.
    Handles both land records and property documents.
    """

    def extract_all_fields(self, ocr_output: Dict[str, Any]) -> Dict[str, Any]:
        raw_text: str = ocr_output.get("raw_text", "")
        tables: List[List[Dict]] = ocr_output.get("tables", [])
        table_text = self._flatten_tables(tables)
        combined = raw_text + "\n" + table_text

        fields: Dict[str, Any] = {
            "survey_no":         self._extract_survey_no(combined),
            "owner_name":        self._extract_owner_name(combined),
            "co_owner_name":     self._extract_co_owner(combined),
            "khasra_no":         self._extract_khasra_no(combined),
            "khata_no":          self._extract_khata_no(combined),
            "land_type":         self._extract_land_type(combined),
            "land_use":          self._extract_land_use(combined),
            "mutation_no":       self._extract_mutation_no(combined),
            "registration_date": self._extract_registration_date(combined),
            "district":          self._extract_district(combined),
            "tehsil":            self._extract_tehsil(combined),
            "village":           self._extract_village(combined),
            "state":             self._extract_state(combined),
            "land_area":         self._extract_area(combined),
            "property_fields":   self._extract_property_fields(combined, tables),
        }

        fields = self._enrich_from_tables(fields, tables)
        return {k: v for k, v in fields.items() if v is not None}

    # ── Land record extractors ─────────────────────────────────────────────

    def _extract_survey_no(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"Survey\s*/\s*CTS\s*No\.?\s+([\w\-/\s]+?)(?:\n|$)",
            r"सर्वे\s*(?:नं|नंबर|क्र\.?)\s*[:\-]?\s*(\S+)",
            r"Survey\s*(?:No|Number)\.?\s*[:\-]?\s*(\S+)",
            r"Sy\.?\s*No\.?\s*[:\-]?\s*(\S+)",
            r"TP[\-\s]*\d+\s*/\s*FP\s*No\.?\s*([\w/]+)",
        ], text))

    def _extract_owner_name(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"Full\s*Legal\s*Name\s+([A-Z][a-zA-Z\s]{3,50})(?:\n|$)",
            r"(?:खाताधारक|भूमि\s*स्वामी|मालिक)\s*[:\-]?\s*(.+?)(?:\n|।|$)",
            r"(?:Owner|Land\s*Owner|Khatadar)\s*[:\-]?\s*(.+?)(?:\n|$)",
            r"(?:Name\s*of\s*Owner|Owner'?s?\s*Name)\s*[:\-]?\s*(.+?)(?:\n|$)",
        ], text))

    def _extract_co_owner(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"(?:सह\s*खाताधारक|सह\s*मालिक)\s*[:\-]?\s*(.+?)(?:\n|।|$)",
            r"(?:Co[\-\s]?Owner|Joint\s*Owner)\s*[:\-]?\s*(.+?)(?:\n|$)",
        ], text))

    def _extract_khasra_no(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"(?:खसरा|Khasra)\s*(?:नं|क्र|No)\.?\s*[:\-]?\s*(\S+)",
            r"Kh\.?\s*No\.?\s*[:\-]?\s*(\S+)",
        ], text))

    def _extract_khata_no(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"(?:खाता|Khata|Khatha)\s*(?:नं|No|Number)\.?\s*[:\-]?\s*(\d+)",
            r"Account\s*No\.?\s*[:\-]?\s*(\d+)",
        ], text))

    def _extract_land_type(self, text: str) -> Optional[str]:
        for keyword, english in LAND_TYPE_KEYWORDS.items():
            if keyword in text:
                return english
        return None

    def _extract_land_use(self, text: str) -> Optional[str]:
        for keyword, english in LAND_USE_KEYWORDS.items():
            if keyword in text:
                return english
        return None

    def _extract_mutation_no(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"(?:दाखिल\s*खारिज|म्युटेशन|Mutation)\s*(?:नं|No|Number)\.?\s*[:\-]?\s*(\d+)",
            r"Mutation\s*Entry\s*(?:No|#)\.?\s*[:\-]?\s*(\d+)",
        ], text))

    def _extract_registration_date(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"(?:पंजीकरण\s*दिनांक|Registration\s*Date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:दिनांक|Date\s*of\s*Application)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4}|\d{2}\s+\w+\s+\d{4})",
            r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})",
        ], text))

    def _extract_district(self, text: str) -> Optional[str]:
        patterns = [r"(?:जिला|जनपद|District|Dist\.?)\s*[:\-]?\s*([^\n,।]+)"]
        val = _first_match(patterns, text[:800]) or _first_match(patterns, text)
        return _clean_value(val)

    def _extract_tehsil(self, text: str) -> Optional[str]:
        patterns = [
            r"Village\s*/\s*Taluka\s+[^,\n]+,\s*Taluka:\s*([^\n]+)",
            r"(?:तहसील|तालुका|Tehsil|Taluka|Mandal)\s*[:\-]?\s*([^\n,।]+)",
        ]
        val = _first_match(patterns, text[:800]) or _first_match(patterns, text)
        return _clean_value(val)

    def _extract_village(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"Village\s*/\s*Taluka\s+([^,\n]+?)(?:,|\s+Taluka)",
            r"(?:ग्राम|गाँव|Village|Gaon|Gram)\s*[:\-]?\s*([^\n,।]+)",
            r"(?:मौजा|Mouza|Mauja)\s*[:\-]?\s*([^\n,।]+)",
        ], text))

    def _extract_state(self, text: str) -> Optional[str]:
        return self.detect_state(text)

    def _extract_area(self, text: str) -> Optional[Dict[str, Optional[float]]]:
        area: Dict[str, Optional[float]] = {
            "hectare": None, "bigha": None, "acre": None, "guntha": None, "cent": None,
        }
        patterns = [
            ("hectare", r"(\d+[\.,]\d+|\d+)\s*(?:हेक्टेयर|हे\.|Hectare|Hectares?|ha\.?)\b"),
            ("bigha",   r"(\d+[\.,]\d+|\d+)\s*(?:बीघा|Bigha)\b"),
            ("acre",    r"(\d+[\.,]\d+|\d+)\s*(?:एकड़|Acre|Acres?)\b"),
            ("guntha",  r"(\d+[\.,]\d+|\d+)\s*(?:गुंठा|Guntha|Gunta)\b"),
            ("cent",    r"(\d+[\.,]\d+|\d+)\s*(?:Cent|सेंट)\b"),
        ]
        for unit, pat in patterns:
            m = regex.search(pat, text, regex.IGNORECASE)
            if m:
                area[unit] = _parse_number(m.group(1))
        area = self._fill_area_conversions(area)
        return None if all(v is None for v in area.values()) else area

    def _fill_area_conversions(self, area: Dict[str, Optional[float]]) -> Dict[str, Optional[float]]:
        base_ha: Optional[float] = None
        for unit, val in area.items():
            if val is not None:
                base_ha = val * AREA_TO_HECTARE.get(unit, 1.0)
                break
        if base_ha is None:
            return area
        return {
            unit: round(area[unit], 4) if area[unit] is not None
                  else round(base_ha / AREA_TO_HECTARE.get(unit, 1.0), 4)
            for unit in area
        }

    # ── Property document field extractor ─────────────────────────────────
    # Handles: Property Verification Reports, Sale Deed, Aadhaar, PAN,
    #          Property Tax, Building Plan, Valuation Certificates

    def _extract_property_fields(self, text: str, tables: List[List[Dict]]) -> Optional[Dict[str, Any]]:
        """
        Extracts PropertyForm-compatible fields.
        Patterns cover the exact label formats used in Indian property documents.
        """
        pf: Dict[str, Any] = {}

        # ── Applicant / Owner name ─────────────────────────────────────────
        name = _clean_value(_first_match([
            # Property Verification Report: "Full Legal Name   Rajesh Kumar Mehta"
            r"Full\s*Legal\s*Name\s+([A-Z][a-zA-Z\s]{3,50})(?:\n|$)",
            r"Full\s*Legal\s*Name\s*[:\-]\s*([A-Z][a-zA-Z\s]{3,50})",
            # Property Tax / Valuation
            r"(?:Owner'?s?\s*Name|Property\s*Owner|Name\s*of\s*Owner)\s*[:\-]?\s*([A-Z][a-zA-Z\s]{3,50})(?:\n|$)",
            # Aadhaar — name appears before 12-digit number
            r"(?:^|\n)([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\n\d{4}\s+\d{4}\s+\d{4}",
            # PAN card
            r"(?:Name\s*of\s*(?:the\s*)?(?:Assessee|Individual|Person))\s*[:\-]?\s*([A-Z][a-zA-Z\s]{3,50})",
            # Sale Deed
            r"(?:Vendor|Vendee|Seller|Buyer|Purchaser|Transferor|Transferee)\s*[:\-]?\s*(?:Mr\.?|Mrs\.?|Ms\.?)?\s*([A-Z][a-zA-Z\s]{3,50})(?:\n|,|$)",
        ], text))
        if name:
            pf["applicant_name"] = name.strip()

        # ── PAN number ────────────────────────────────────────────────────
        pan = _clean_value(_first_match([
            r"PAN\s*(?:Number|No\.?|Card)?\s*[:\-]?\s*([A-Z]{5}[0-9]{4}[A-Z])\b",
            r"\b([A-Z]{5}[0-9]{4}[A-Z])\b",
        ], text))
        if pan:
            pf["applicant_pan"] = pan

        # ── Phone number ──────────────────────────────────────────────────
        phone = _clean_value(_first_match([
            # "Contact Phone   +91 98250 47831"
            r"Contact\s*Phone\s+(\+?91[-\s]?\d{5}\s?\d{5})",
            r"Contact\s*Phone\s*[:\-]\s*(\+?91[-\s]?\d{5}\s?\d{5})",
            r"(?:Mobile|Phone|Contact|Mob\.?)\s*[:\-]?\s*(\+?91[-\s]?[6-9]\d{9})",
            r"\b(\+91[-\s]?[6-9]\d{9})\b",
            r"\b([6-9]\d{9})\b",
        ], text))
        if phone:
            pf["applicant_phone"] = re.sub(r"\s+", "", phone)

        # ── Email ─────────────────────────────────────────────────────────
        email = _clean_value(_first_match([
            r"\b([a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,})\b",
        ], text))
        if email:
            pf["applicant_email"] = email

        # ── Property type ─────────────────────────────────────────────────
        prop_type = _clean_value(_first_match([
            r"Property\s*Type\s+(Residential|Commercial|Industrial|Land|Agricultural)\b",
            r"Property\s*Type\s*[:\-]\s*(Residential|Commercial|Industrial|Land|Agricultural)\b",
            r"\b(Apartment|Flat|Villa|Bungalow|Row\s*House|Shop|Office|Warehouse|Plot)\b",
        ], text))
        if prop_type:
            pf["property_type"] = prop_type

        # ── City ──────────────────────────────────────────────────────────
        # Match known Indian city names directly from the text
        city_m = regex.search(
            r"\b(" + INDIAN_CITIES + r")\b",
            text, regex.IGNORECASE
        )
        if city_m:
            pf["city"] = city_m.group(1).strip()

        # ── Locality ──────────────────────────────────────────────────────
        locality = _clean_value(_first_match([
            # "Plot No. 47-B, Shyamal Cross Roads, Satellite, Ahmedabad"
            # Extract the neighbourhood/area name (segment before city)
            r"(?:Plot\s*No\.?|House\s*No\.?|Flat\s*No\.?|Door\s*No\.?)\s*[\w\-/]+\s*,\s*([^,\n]{3,50}),",
            r"Full\s*Address\s+[^\n]*,\s*([^,\n]{3,40}),\s*(?:" + INDIAN_CITIES + r")",
            r"(?:Locality|Area|Sector|Ward|Colony|Nagar|Layout)\s*[:\-]?\s*([^\n,]{3,40})",
        ], text))
        if locality:
            pf["locality"] = locality.strip()

        # ── Pincode ───────────────────────────────────────────────────────
        pincode = _clean_value(_first_match([
            r"Pin\s*Code\s+(\d{6})\b",
            r"Pin\s*Code\s*[:\-]\s*(\d{6})\b",
            r"(?:PIN|Pincode|Zip)\s*[:\-]?\s*(\d{6})\b",
            r"—\s*(\d{6})\b",
            r",\s*(\d{6})\b",
        ], text))
        if pincode:
            pf["pincode"] = pincode

        # ── Area in sqft ──────────────────────────────────────────────────
        # Priority: Built-up > Carpet > Super Built-up
        area_sqft = None
        for pat in [
            r"Built[\-\s]?up\s*Area\s+([\d,]+)\s*sq\s*ft",
            r"Built[\-\s]?up\s*Area\s*[:\-]\s*([\d,]+)\s*sq\s*ft",
            r"Carpet\s*Area\s+([\d,]+)\s*sq\s*ft",
            r"Carpet\s*Area\s*[:\-]\s*([\d,]+)\s*sq\s*ft",
            r"Super\s*Built[\-\s]?up\s*Area\s+([\d,]+)\s*sq\s*ft",
            r"([\d,]+)\s*(?:sq\.?\s*ft\.?|square\s*feet|sqft)",
        ]:
            m = regex.search(pat, text, regex.IGNORECASE)
            if m:
                area_sqft = m.group(1)
                break
        if area_sqft:
            val = _parse_number(area_sqft.replace(",", ""))
            if val and val > 0:
                pf["area_sqft"] = val

        # ── Year of construction ──────────────────────────────────────────
        year = _first_match([
            r"Year\s*of\s*Construction\s+((?:19|20)\d{2})\b",
            r"Year\s*of\s*Construction\s*[:\-]\s*((?:19|20)\d{2})\b",
            r"(?:Built\s*in|Constructed\s*in|Year\s*Built)\s*[:\-]?\s*((?:19|20)\d{2})\b",
        ], text)
        if year:
            y = _parse_int(year)
            if y and 1900 < y <= 2030:
                pf["year_of_construction"] = y

        # ── Floor number ──────────────────────────────────────────────────
        floor = _first_match([
            r"Floor\s*No\.?\s+((?:\d+(?:st|nd|rd|th)?|Ground|GF|G))\b",
            r"Floor\s*No\.?\s*[:\-]\s*((?:\d+(?:st|nd|rd|th)?|Ground|GF|G))\b",
            r"(\d+)(?:st|nd|rd|th)\s*Floor\b",
        ], text)
        if floor:
            fc = floor.lower().replace("st","").replace("nd","").replace("rd","").replace("th","").strip()
            if fc in ("ground", "gf", "g"):
                pf["floor_number"] = 0
            else:
                f = _parse_int(fc)
                if f is not None:
                    pf["floor_number"] = f

        # ── Total floors ──────────────────────────────────────────────────
        # Handles "G + 7" format (ground + 7 upper = 8 total)
        gplus = regex.search(r"Total\s*Floors?\s+G\s*\+\s*(\d+)", text, regex.IGNORECASE)
        if gplus:
            pf["total_floors"] = int(gplus.group(1)) + 1
        else:
            total_floors = _first_match([
                r"Total\s*Floors?\s+(G\s*\+\s*\d+|\d+)\b",
                r"Total\s*Floors?\s*[:\-]\s*(\d+)\b",
                r"G\s*\+\s*(\d+)\s*(?:floors?|storeys?)?",
            ], text)
            if total_floors:
                tf = _parse_int(total_floors)
                if tf:
                    pf["total_floors"] = tf

        # ── Construction quality ──────────────────────────────────────────
        quality = _first_match([
            r"Construction\s*Quality\s+(Good|Standard|Premium|RCC|Pucca)",
            r"Construction\s*Quality\s*[:\-]\s*(Good|Standard|Premium|RCC|Pucca)",
        ], text)
        if quality:
            q = quality.lower()
            pf["construction_quality"] = "premium" if q in ("rcc","pucca","premium") else \
                                         "good"    if q == "good" else "standard"

        # ── Declared / Loan value ─────────────────────────────────────────
        value = _first_match([
            # "Loan Amount Required ■ 85,00,000"
            r"Loan\s*Amount\s*Required\s*[■\-]?\s*([\d,]+)",
            # "Estimated Market Value ■ 1,12,00,000"
            r"(?:Estimated\s*Market\s*Value|Weighted\s*Average)\s*[■\-]?\s*([\d,]+)",
            r"(?:Sale\s*(?:Consideration|Price|Value)|Declared\s*Value)\s*[:\-]?\s*(?:Rs\.?|₹|INR|■)?\s*([\d,]+)",
            r"(?:Rs\.?|₹|INR|■)\s*([\d,]+(?:\.\d+)?)\s*(?:only|/-)",
        ], text)
        if value:
            v = _parse_number(value.replace(",", ""))
            if v and v > 0:
                pf["declared_value"] = v

        # ── Monthly rent ──────────────────────────────────────────────────
        rent = _first_match([
            r"Monthly\s*Rental\s*Income\s*[■\-]?\s*([\d,]+)\s*per\s*month",
            r"Monthly\s*Rent(?:al)?\s*[:\-]?\s*(?:Rs\.?|₹|■)?\s*([\d,]+)",
        ], text)
        if rent:
            rv = _parse_number(rent.replace(",", ""))
            if rv and rv > 0:
                pf["monthly_rent"] = rv

        # ── Occupancy status ──────────────────────────────────────────────
        occ = _first_match([
            r"Occupancy\s*Status\s+(Rented|Self[\-\s]?Occupied|Vacant|Owner\s*Occupied)",
            r"Occupancy\s*Status\s*[:\-]\s*(Rented|Self[\-\s]?Occupied|Vacant)",
        ], text)
        if occ:
            o = occ.lower()
            pf["occupancy_status"] = "rented" if "rent" in o else \
                                     "vacant" if "vacant" in o else "self_occupied"

        # ── Ownership type ────────────────────────────────────────────────
        own = _first_match([
            r"Ownership\s*Type\s+((?:CLEAR\s*)?Freehold|Leasehold)",
            r"Ownership\s*Type\s*[:\-]\s*(Freehold|Leasehold)",
        ], text)
        if own:
            pf["ownership_type"] = "leasehold" if "lease" in own.lower() else "freehold"

        # ── Encumbrance status ────────────────────────────────────────────
        enc = text.lower()
        if any(kw in enc for kw in ["nil dues", "nil encumbrance", "no encumbrance",
                                     "free from encumbrance", "no encumbrances found",
                                     "ec issued", "clear title", "nil"]):
            pf["encumbrance_status"] = "nil"
        elif any(kw in enc for kw in ["encumbered", "mortgage", "lien", "charge", "hypothecation"]):
            pf["encumbrance_status"] = "encumbered"

        return pf if pf else None

    # ── Table enrichment ──────────────────────────────────────────────────

    def _enrich_from_tables(self, fields: Dict[str, Any], tables: List[List[Dict]]) -> Dict[str, Any]:
        for table in tables:
            for row in table:
                for col_key, cell_val in row.items():
                    col_lower = col_key.lower()
                    cell_str = str(cell_val).strip()
                    if not cell_str:
                        continue
                    if not fields.get("survey_no") and any(k in col_lower for k in ["survey", "सर्वे", "khasra", "खसरा"]):
                        fields["survey_no"] = cell_str
                    if not fields.get("owner_name") and any(k in col_lower for k in ["owner", "मालिक", "khatadar", "खाताधारक"]):
                        fields["owner_name"] = cell_str
                    if not fields.get("khata_no") and any(k in col_lower for k in ["khata", "खाता", "account"]):
                        fields["khata_no"] = cell_str
        return fields

    # ── Document type & state detection ───────────────────────────────────

    def detect_document_type(self, text: str) -> str:
        for doc_type, patterns in DOC_TYPE_PATTERNS.items():
            for pat in patterns:
                if regex.search(pat, text, regex.IGNORECASE | regex.UNICODE):
                    return doc_type
        return "Unknown"

    def detect_state(self, text: str) -> Optional[str]:
        for state, patterns in STATE_PATTERNS.items():
            for pat in patterns:
                if regex.search(pat, text, regex.IGNORECASE | regex.UNICODE):
                    return state
        return None

    # ── Confidence scoring ────────────────────────────────────────────────

    def calculate_confidence_score(self, extracted_fields: Dict[str, Any]) -> int:
        """
        Weighted score: land record fields (80 pts max) + property field bonus (20 pts).
        """
        weights = {
            "owner_name": 20, "survey_no": 15, "land_area": 15,
            "district": 10, "village": 10, "khata_no": 8,
            "khasra_no": 8, "land_type": 5, "land_use": 5, "state": 4,
        }
        total_weight = sum(weights.values())
        earned = sum(
            w for field, w in weights.items()
            if (val := extracted_fields.get(field)) is not None
            and (any(v is not None for v in val.values()) if isinstance(val, dict) else True)
        )

        # Bonus for property document fields
        pf = extracted_fields.get("property_fields") or {}
        bonus_fields = ["applicant_name", "applicant_pan", "area_sqft", "declared_value",
                        "city", "year_of_construction", "applicant_phone"]
        bonus = sum(4 for f in bonus_fields if pf.get(f))
        bonus = min(bonus, 20)

        raw = round(((earned / total_weight) * 80) + bonus)
        return min(raw, 100)

    def convert_area_units(self, value: float, from_unit: str, to_unit: str) -> float:
        from_unit, to_unit = from_unit.lower(), to_unit.lower()
        if from_unit not in AREA_TO_HECTARE:
            raise ValueError(f"Unknown source unit: '{from_unit}'")
        if to_unit not in AREA_TO_HECTARE:
            raise ValueError(f"Unknown target unit: '{to_unit}'")
        return round(value * AREA_TO_HECTARE[from_unit] / AREA_TO_HECTARE[to_unit], 6)

    @staticmethod
    def _flatten_tables(tables: List[List[Dict]]) -> str:
        lines = []
        for table in tables:
            for row in table:
                lines.append(" | ".join(f"{k}: {v}" for k, v in row.items()))
        return "\n".join(lines)
