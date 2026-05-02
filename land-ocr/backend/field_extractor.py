"""
field_extractor.py
Extracts structured land record fields from OCR output using
regex patterns for both Hindi (Devanagari) and English text.
"""

import logging
import re
from typing import Any, Dict, List, Optional, Tuple

import regex  # 'regex' package — better Unicode support than 're'

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Area conversion constants
# ---------------------------------------------------------------------------
# All conversions relative to 1 hectare
AREA_TO_HECTARE = {
    "hectare": 1.0,
    "ha": 1.0,
    "bigha": 0.2529,       # 1 bigha (UP/MP standard) = 0.2529 ha
    "acre": 0.4047,
    "guntha": 0.01012,     # 1 guntha = 0.01012 ha
    "cent": 0.004047,      # 1 cent = 0.004047 ha
    "marla": 0.002529,     # 1 marla (Punjab) = 0.002529 ha
    "kanal": 0.05059,      # 1 kanal (Punjab) = 0.05059 ha
    "dismil": 0.004047,    # same as cent
    "are": 0.01,           # 1 are = 0.01 ha
}

# ---------------------------------------------------------------------------
# Document type keywords
# ---------------------------------------------------------------------------
DOC_TYPE_PATTERNS = {
    "7/12": [r"7\s*/\s*12", r"सात\s*बारा", r"satbara"],
    "ROR": [r"\bROR\b", r"Record\s*of\s*Rights", r"अधिकार\s*अभिलेख"],
    "Khatauni": [r"खतौनी", r"Khatauni", r"खाता\s*बही"],
    "Patta": [r"पट्टा", r"\bPatta\b", r"पट्टे"],
    "Jamabandi": [r"जमाबंदी", r"Jamabandi", r"जमा\s*बंदी"],
    "Adangal": [r"अदंगल", r"Adangal", r"1-B"],
    "RTC": [r"\bRTC\b", r"Rights?\s*Tenancy\s*Crops?"],
    "EC": [r"\bEC\b", r"Encumbrance\s*Certificate", r"भार\s*प्रमाण"],
    "MutationOrder": [r"दाखिल\s*खारिज", r"Mutation\s*Order", r"म्युटेशन\s*आदेश"],
}

# ---------------------------------------------------------------------------
# State detection patterns
# ---------------------------------------------------------------------------
STATE_PATTERNS = {
    "Uttar Pradesh": [r"उत्तर\s*प्रदेश", r"Uttar\s*Pradesh", r"\bU\.?P\.?\b"],
    "Maharashtra": [r"महाराष्ट्र", r"Maharashtra"],
    "Rajasthan": [r"राजस्थान", r"Rajasthan"],
    "Madhya Pradesh": [r"मध्य\s*प्रदेश", r"Madhya\s*Pradesh", r"\bM\.?P\.?\b"],
    "Bihar": [r"बिहार", r"Bihar"],
    "Gujarat": [r"गुजरात", r"Gujarat"],
    "Karnataka": [r"कर्नाटक", r"Karnataka"],
    "Tamil Nadu": [r"तमिलनाडु", r"Tamil\s*Nadu"],
    "Andhra Pradesh": [r"आंध्र\s*प्रदेश", r"Andhra\s*Pradesh", r"\bA\.?P\.?\b"],
    "Telangana": [r"तेलंगाना", r"Telangana"],
    "Punjab": [r"पंजाब", r"Punjab"],
    "Haryana": [r"हरियाणा", r"Haryana"],
    "West Bengal": [r"पश्चिम\s*बंगाल", r"West\s*Bengal"],
    "Odisha": [r"ओडिशा", r"Odisha", r"Orissa"],
    "Kerala": [r"केरल", r"Kerala"],
    "Jharkhand": [r"झारखंड", r"Jharkhand"],
    "Chhattisgarh": [r"छत्तीसगढ़", r"Chhattisgarh"],
    "Assam": [r"असम", r"Assam"],
    "Uttarakhand": [r"उत्तराखंड", r"Uttarakhand", r"Uttaranchal"],
    "Himachal Pradesh": [r"हिमाचल\s*प्रदेश", r"Himachal\s*Pradesh", r"\bH\.?P\.?\b"],
    "Goa": [r"गोवा", r"Goa"],
    "Tripura": [r"त्रिपुरा", r"Tripura"],
    "Manipur": [r"मणिपुर", r"Manipur"],
    "Meghalaya": [r"मेघालय", r"Meghalaya"],
    "Nagaland": [r"नागालैंड", r"Nagaland"],
    "Arunachal Pradesh": [r"अरुणाचल\s*प्रदेश", r"Arunachal\s*Pradesh"],
    "Mizoram": [r"मिजोरम", r"Mizoram"],
    "Sikkim": [r"सिक्किम", r"Sikkim"],
}

# ---------------------------------------------------------------------------
# Land type keywords
# ---------------------------------------------------------------------------
LAND_TYPE_KEYWORDS = {
    "सिंचित": "Irrigated",
    "Irrigated": "Irrigated",
    "असिंचित": "Unirrigated",
    "Unirrigated": "Unirrigated",
    "खुद काश्त": "Self-cultivated",
    "बटाई": "Sharecropped",
    "जिरायत": "Rainfed",
    "नानकार": "Nankar",
    "चाही": "Well-irrigated",
    "बारानी": "Rainfed",
    "नहरी": "Canal-irrigated",
    "Dryland": "Dryland",
    "Wetland": "Wetland",
}

LAND_USE_KEYWORDS = {
    "कृषि": "Agricultural",
    "Agricultural": "Agricultural",
    "आवासीय": "Residential",
    "Residential": "Residential",
    "व्यावसायिक": "Commercial",
    "Commercial": "Commercial",
    "बंजर": "Barren",
    "Barren": "Barren",
    "वन": "Forest",
    "Forest": "Forest",
    "औद्योगिक": "Industrial",
    "Industrial": "Industrial",
}


# ---------------------------------------------------------------------------
# Helper utilities
# ---------------------------------------------------------------------------

def _first_match(patterns: List[str], text: str, flags=0) -> Optional[str]:
    """Try each pattern in order; return first captured group or None."""
    for pat in patterns:
        try:
            m = regex.search(pat, text, flags | regex.IGNORECASE | regex.UNICODE)
            if m:
                return m.group(1).strip()
        except Exception:
            continue
    return None


def _clean_value(val: Optional[str]) -> Optional[str]:
    if not val:
        return None
    val = val.strip().strip(":-।|")
    return val if val else None


def _parse_number(s: str) -> Optional[float]:
    """Parse a number string that may use comma as decimal separator."""
    if not s:
        return None
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


# ---------------------------------------------------------------------------
# Main extractor class
# ---------------------------------------------------------------------------

class LandFieldExtractor:
    """
    Extracts structured fields from OCR output (tables + raw text).
    All regex patterns support both Hindi (Devanagari) and English.
    """

    def extract_all_fields(self, ocr_output: Dict[str, Any]) -> Dict[str, Any]:
        """
        Master extraction method.
        ocr_output: dict with keys 'tables', 'raw_text', 'regions', 'confidence_scores'
        Returns a flat dict of all extracted fields.
        """
        raw_text: str = ocr_output.get("raw_text", "")
        tables: List[List[Dict]] = ocr_output.get("tables", [])

        # Flatten all table cell values into a searchable string
        table_text = self._flatten_tables(tables)
        combined = raw_text + "\n" + table_text

        fields: Dict[str, Any] = {}

        fields["survey_no"] = self._extract_survey_no(combined)
        fields["owner_name"] = self._extract_owner_name(combined)
        fields["co_owner_name"] = self._extract_co_owner(combined)
        fields["khasra_no"] = self._extract_khasra_no(combined)
        fields["khata_no"] = self._extract_khata_no(combined)
        fields["land_type"] = self._extract_land_type(combined)
        fields["land_use"] = self._extract_land_use(combined)
        fields["mutation_no"] = self._extract_mutation_no(combined)
        fields["registration_date"] = self._extract_registration_date(combined)
        fields["district"] = self._extract_district(combined)
        fields["tehsil"] = self._extract_tehsil(combined)
        fields["village"] = self._extract_village(combined)
        fields["state"] = self._extract_state(combined)

        # Area extraction — returns dict with all units
        area_data = self._extract_area(combined)
        fields["land_area"] = area_data

        # Also try extracting from table rows directly
        fields = self._enrich_from_tables(fields, tables)

        # Clean None values
        fields = {k: v for k, v in fields.items() if v is not None}

        return fields

    # ------------------------------------------------------------------
    # Individual field extractors
    # ------------------------------------------------------------------

    def _extract_survey_no(self, text: str) -> Optional[str]:
        patterns = [
            r"सर्वे\s*(?:नं|नंबर|क्र\.?)\s*[:\-]?\s*(\S+)",
            r"Survey\s*(?:No|Number)\.?\s*[:\-]?\s*(\S+)",
            r"खसरा\s*(?:नं|क्र)\.?\s*[:\-]?\s*(\S+)",
            r"Sy\.?\s*No\.?\s*[:\-]?\s*(\S+)",
            r"S\.?\s*No\.?\s*[:\-]?\s*(\d[\d/\-]*)",
        ]
        return _clean_value(_first_match(patterns, text))

    def _extract_owner_name(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:खाताधारक|भूमि\s*स्वामी|मालिक|काश्तकार)\s*[:\-]?\s*(.+?)(?:\n|।|$)",
            r"(?:Owner|Land\s*Owner|Khatadar|Khatedaar)\s*[:\-]?\s*(.+?)(?:\n|$)",
            r"(?:Name\s*of\s*Owner|Owner'?s?\s*Name)\s*[:\-]?\s*(.+?)(?:\n|$)",
            r"(?:पट्टेदार|पट्टाधारी)\s*[:\-]?\s*(.+?)(?:\n|।|$)",
        ]
        val = _first_match(patterns, text)
        return _clean_value(val)

    def _extract_co_owner(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:सह\s*खाताधारक|सह\s*मालिक|सह\s*स्वामी)\s*[:\-]?\s*(.+?)(?:\n|।|$)",
            r"(?:Co[\-\s]?Owner|Joint\s*Owner|Co[\-\s]?Khatadar)\s*[:\-]?\s*(.+?)(?:\n|$)",
            r"(?:अन्य\s*हिस्सेदार)\s*[:\-]?\s*(.+?)(?:\n|।|$)",
        ]
        val = _first_match(patterns, text)
        return _clean_value(val)

    def _extract_khasra_no(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:खसरा|Khasra)\s*(?:नं|क्र|No)\.?\s*[:\-]?\s*(\S+)",
            r"Kh\.?\s*No\.?\s*[:\-]?\s*(\S+)",
            r"(?:Plot\s*No|प्लॉट\s*नं)\s*[:\-]?\s*(\S+)",
        ]
        return _clean_value(_first_match(patterns, text))

    def _extract_khata_no(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:खाता|Khata|Khatha)\s*(?:नं|No|Number)\.?\s*[:\-]?\s*(\d+)",
            r"Account\s*No\.?\s*[:\-]?\s*(\d+)",
            r"खाता\s*क्र\.?\s*[:\-]?\s*(\d+)",
        ]
        return _clean_value(_first_match(patterns, text))

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
        patterns = [
            r"(?:दाखिल\s*खारिज|म्युटेशन|Mutation)\s*(?:नं|No|Number)\.?\s*[:\-]?\s*(\d+)",
            r"Mutation\s*Entry\s*(?:No|#)\.?\s*[:\-]?\s*(\d+)",
            r"(?:नामांतरण|Namantaran)\s*(?:नं|No)\.?\s*[:\-]?\s*(\d+)",
        ]
        return _clean_value(_first_match(patterns, text))

    def _extract_registration_date(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:पंजीकरण\s*दिनांक|Registration\s*Date|Reg\.?\s*Date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(?:दिनांक|Date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})",  # bare date fallback
        ]
        return _clean_value(_first_match(patterns, text))

    def _extract_district(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:जिला|जनपद|District|Dist\.?)\s*[:\-]?\s*([^\n,।]+)",
            r"(?:जिला\s*नाम|District\s*Name)\s*[:\-]?\s*([^\n,।]+)",
        ]
        # Prefer matches from the first 500 chars (document header)
        header = text[:500]
        val = _first_match(patterns, header) or _first_match(patterns, text)
        return _clean_value(val)

    def _extract_tehsil(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:तहसील|तालुका|Tehsil|Taluka|Taluk|Mandal)\s*[:\-]?\s*([^\n,।]+)",
            r"(?:तहसील\s*नाम|Tehsil\s*Name)\s*[:\-]?\s*([^\n,।]+)",
        ]
        header = text[:500]
        val = _first_match(patterns, header) or _first_match(patterns, text)
        return _clean_value(val)

    def _extract_village(self, text: str) -> Optional[str]:
        patterns = [
            r"(?:ग्राम|गाँव|Village|Gaon|Gram)\s*[:\-]?\s*([^\n,।]+)",
            r"(?:मौजा|Mouza|Mauja)\s*[:\-]?\s*([^\n,।]+)",
            r"(?:हल्का|Halka)\s*[:\-]?\s*([^\n,।]+)",
        ]
        return _clean_value(_first_match(patterns, text))

    def _extract_state(self, text: str) -> Optional[str]:
        return self.detect_state(text)

    def _extract_area(self, text: str) -> Dict[str, Optional[float]]:
        """Extract land area in all available units and cross-convert."""
        area: Dict[str, Optional[float]] = {
            "hectare": None,
            "bigha": None,
            "acre": None,
            "guntha": None,
            "cent": None,
        }

        # Hectare
        m = regex.search(
            r"(\d+[\.,]\d+|\d+)\s*(?:हेक्टेयर|हे\.|Hectare|Hectares?|ha\.?)\b",
            text, regex.IGNORECASE
        )
        if m:
            area["hectare"] = _parse_number(m.group(1))

        # Bigha
        m = regex.search(
            r"(\d+[\.,]\d+|\d+)\s*(?:बीघा|Bigha)\b",
            text, regex.IGNORECASE
        )
        if m:
            area["bigha"] = _parse_number(m.group(1))

        # Acre
        m = regex.search(
            r"(\d+[\.,]\d+|\d+)\s*(?:एकड़|Acre|Acres?)\b",
            text, regex.IGNORECASE
        )
        if m:
            area["acre"] = _parse_number(m.group(1))

        # Guntha
        m = regex.search(
            r"(\d+[\.,]\d+|\d+)\s*(?:गुंठा|Guntha|Gunta)\b",
            text, regex.IGNORECASE
        )
        if m:
            area["guntha"] = _parse_number(m.group(1))

        # Cent
        m = regex.search(
            r"(\d+[\.,]\d+|\d+)\s*(?:Cent|सेंट)\b",
            text, regex.IGNORECASE
        )
        if m:
            area["cent"] = _parse_number(m.group(1))

        # Cross-convert: if we have any one unit, fill in the others
        area = self._fill_area_conversions(area)

        # Return None if nothing was found
        if all(v is None for v in area.values()):
            return None  # type: ignore

        return area

    def _fill_area_conversions(self, area: Dict[str, Optional[float]]) -> Dict[str, Optional[float]]:
        """Given any one known area value, compute the rest."""
        # Find the first non-None value
        base_ha: Optional[float] = None
        for unit, val in area.items():
            if val is not None:
                factor = AREA_TO_HECTARE.get(unit, 1.0)
                base_ha = val * factor
                break

        if base_ha is None:
            return area

        result = {}
        for unit in area:
            if area[unit] is not None:
                result[unit] = round(area[unit], 4)
            else:
                factor = AREA_TO_HECTARE.get(unit, 1.0)
                result[unit] = round(base_ha / factor, 4)

        return result

    # ------------------------------------------------------------------
    # Table enrichment
    # ------------------------------------------------------------------

    def _enrich_from_tables(
        self, fields: Dict[str, Any], tables: List[List[Dict]]
    ) -> Dict[str, Any]:
        """
        Try to fill missing fields by scanning table rows.
        Looks for column headers that match known field names.
        """
        for table in tables:
            for row in table:
                for col_key, cell_val in row.items():
                    col_lower = col_key.lower()
                    cell_str = str(cell_val).strip()
                    if not cell_str:
                        continue

                    if not fields.get("survey_no") and any(
                        k in col_lower for k in ["survey", "सर्वे", "khasra", "खसरा"]
                    ):
                        fields["survey_no"] = cell_str

                    if not fields.get("owner_name") and any(
                        k in col_lower for k in ["owner", "मालिक", "khatadar", "खाताधारक"]
                    ):
                        fields["owner_name"] = cell_str

                    if not fields.get("khata_no") and any(
                        k in col_lower for k in ["khata", "खाता", "account"]
                    ):
                        fields["khata_no"] = cell_str

        return fields

    # ------------------------------------------------------------------
    # Utility methods
    # ------------------------------------------------------------------

    def detect_document_type(self, text: str) -> str:
        """
        Identify the type of land record document.
        Returns one of the known types or 'Unknown'.
        """
        for doc_type, patterns in DOC_TYPE_PATTERNS.items():
            for pat in patterns:
                if regex.search(pat, text, regex.IGNORECASE | regex.UNICODE):
                    return doc_type
        return "Unknown"

    def detect_state(self, text: str) -> Optional[str]:
        """Detect Indian state from document text."""
        for state, patterns in STATE_PATTERNS.items():
            for pat in patterns:
                if regex.search(pat, text, regex.IGNORECASE | regex.UNICODE):
                    return state
        return None

    def calculate_confidence_score(self, extracted_fields: Dict[str, Any]) -> int:
        """
        Score 0–100 based on how many key fields were successfully extracted.
        Key fields are weighted by importance for NBFC lending decisions.
        """
        weights = {
            "owner_name": 20,
            "survey_no": 15,
            "land_area": 15,
            "district": 10,
            "village": 10,
            "khata_no": 8,
            "khasra_no": 8,
            "land_type": 5,
            "land_use": 5,
            "state": 4,
        }
        total_weight = sum(weights.values())
        earned = 0

        for field, weight in weights.items():
            val = extracted_fields.get(field)
            if val is not None:
                if isinstance(val, dict):
                    # For area dict, check if at least one unit has a value
                    if any(v is not None for v in val.values()):
                        earned += weight
                else:
                    earned += weight

        return round((earned / total_weight) * 100)

    def convert_area_units(
        self, value: float, from_unit: str, to_unit: str
    ) -> float:
        """
        Convert area between: hectare, bigha, acre, guntha, cent, marla, kanal, dismil, are.
        """
        from_unit = from_unit.lower()
        to_unit = to_unit.lower()

        if from_unit not in AREA_TO_HECTARE:
            raise ValueError(f"Unknown source unit: '{from_unit}'")
        if to_unit not in AREA_TO_HECTARE:
            raise ValueError(f"Unknown target unit: '{to_unit}'")

        hectares = value * AREA_TO_HECTARE[from_unit]
        result = hectares / AREA_TO_HECTARE[to_unit]
        return round(result, 6)

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    @staticmethod
    def _flatten_tables(tables: List[List[Dict]]) -> str:
        """Convert all table rows to a flat text string for regex searching."""
        lines = []
        for table in tables:
            for row in table:
                lines.append(" | ".join(f"{k}: {v}" for k, v in row.items()))
        return "\n".join(lines)
