"""
field_extractor.py
Extracts structured land record fields from OCR output using
regex patterns for both Hindi (Devanagari) and English text.
"""

import logging
import re
from typing import Any, Dict, List, Optional

import regex  # 'regex' package — better Unicode support than 're'

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Area conversion constants (relative to 1 hectare)
# ---------------------------------------------------------------------------
AREA_TO_HECTARE = {
    "hectare": 1.0,
    "ha": 1.0,
    "bigha": 0.2529,
    "acre": 0.4047,
    "guntha": 0.01012,
    "cent": 0.004047,
    "marla": 0.002529,
    "kanal": 0.05059,
    "dismil": 0.004047,
    "are": 0.01,
}

DOC_TYPE_PATTERNS = {
    "7/12":         [r"7\s*/\s*12", r"सात\s*बारा", r"satbara"],
    "ROR":          [r"\bROR\b", r"Record\s*of\s*Rights", r"अधिकार\s*अभिलेख"],
    "Khatauni":     [r"खतौनी", r"Khatauni", r"खाता\s*बही"],
    "Patta":        [r"पट्टा", r"\bPatta\b", r"पट्टे"],
    "Jamabandi":    [r"जमाबंदी", r"Jamabandi", r"जमा\s*बंदी"],
    "Adangal":      [r"अदंगल", r"Adangal", r"1-B"],
    "RTC":          [r"\bRTC\b", r"Rights?\s*Tenancy\s*Crops?"],
    "EC":           [r"\bEC\b", r"Encumbrance\s*Certificate", r"भार\s*प्रमाण"],
    "MutationOrder":[r"दाखिल\s*खारिज", r"Mutation\s*Order", r"म्युटेशन\s*आदेश"],
}

STATE_PATTERNS = {
    "Uttar Pradesh":    [r"उत्तर\s*प्रदेश", r"Uttar\s*Pradesh", r"\bU\.?P\.?\b"],
    "Maharashtra":      [r"महाराष्ट्र", r"Maharashtra"],
    "Rajasthan":        [r"राजस्थान", r"Rajasthan"],
    "Madhya Pradesh":   [r"मध्य\s*प्रदेश", r"Madhya\s*Pradesh", r"\bM\.?P\.?\b"],
    "Bihar":            [r"बिहार", r"Bihar"],
    "Gujarat":          [r"गुजरात", r"Gujarat"],
    "Karnataka":        [r"कर्नाटक", r"Karnataka"],
    "Tamil Nadu":       [r"तमिलनाडु", r"Tamil\s*Nadu"],
    "Andhra Pradesh":   [r"आंध्र\s*प्रदेश", r"Andhra\s*Pradesh", r"\bA\.?P\.?\b"],
    "Telangana":        [r"तेलंगाना", r"Telangana"],
    "Punjab":           [r"पंजाब", r"Punjab"],
    "Haryana":          [r"हरियाणा", r"Haryana"],
    "West Bengal":      [r"पश्चिम\s*बंगाल", r"West\s*Bengal"],
    "Odisha":           [r"ओडिशा", r"Odisha", r"Orissa"],
    "Kerala":           [r"केरल", r"Kerala"],
    "Jharkhand":        [r"झारखंड", r"Jharkhand"],
    "Chhattisgarh":     [r"छत्तीसगढ़", r"Chhattisgarh"],
    "Assam":            [r"असम", r"Assam"],
    "Uttarakhand":      [r"उत्तराखंड", r"Uttarakhand", r"Uttaranchal"],
    "Himachal Pradesh": [r"हिमाचल\s*प्रदेश", r"Himachal\s*Pradesh", r"\bH\.?P\.?\b"],
    "Goa":              [r"गोवा", r"Goa"],
    "Punjab":           [r"पंजाब", r"Punjab"],
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


def _first_match(patterns: List[str], text: str, flags=0) -> Optional[str]:
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
    if not s:
        return None
    s = s.replace(",", ".")
    try:
        return float(s)
    except ValueError:
        return None


class LandFieldExtractor:
    """Extracts structured fields from OCR output (tables + raw text)."""

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
        }

        fields = self._enrich_from_tables(fields, tables)
        return {k: v for k, v in fields.items() if v is not None}

    def _extract_survey_no(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"सर्वे\s*(?:नं|नंबर|क्र\.?)\s*[:\-]?\s*(\S+)",
            r"Survey\s*(?:No|Number)\.?\s*[:\-]?\s*(\S+)",
            r"Sy\.?\s*No\.?\s*[:\-]?\s*(\S+)",
        ], text))

    def _extract_owner_name(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
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
            r"(?:दिनांक|Date)\s*[:\-]?\s*(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{2,4})",
            r"(\d{1,2}[\/\-\.]\d{1,2}[\/\-\.]\d{4})",
        ], text))

    def _extract_district(self, text: str) -> Optional[str]:
        patterns = [r"(?:जिला|जनपद|District|Dist\.?)\s*[:\-]?\s*([^\n,।]+)"]
        val = _first_match(patterns, text[:500]) or _first_match(patterns, text)
        return _clean_value(val)

    def _extract_tehsil(self, text: str) -> Optional[str]:
        patterns = [r"(?:तहसील|तालुका|Tehsil|Taluka|Mandal)\s*[:\-]?\s*([^\n,।]+)"]
        val = _first_match(patterns, text[:500]) or _first_match(patterns, text)
        return _clean_value(val)

    def _extract_village(self, text: str) -> Optional[str]:
        return _clean_value(_first_match([
            r"(?:ग्राम|गाँव|Village|Gaon|Gram)\s*[:\-]?\s*([^\n,।]+)",
            r"(?:मौजा|Mouza|Mauja)\s*[:\-]?\s*([^\n,।]+)",
        ], text))

    def _extract_state(self, text: str) -> Optional[str]:
        return self.detect_state(text)

    def _extract_area(self, text: str) -> Optional[Dict[str, Optional[float]]]:
        area: Dict[str, Optional[float]] = {"hectare": None, "bigha": None, "acre": None, "guntha": None, "cent": None}

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

    def calculate_confidence_score(self, extracted_fields: Dict[str, Any]) -> int:
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
        return round((earned / total_weight) * 100)

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
