"""
ocr_engine.py
Core OCR engine using PaddleOCR PP-OCRv5 + PP-StructureV3.
Falls back to EasyOCR for handwritten annotations or low-confidence Hindi text.
"""

import logging
import traceback
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Lazy imports — PaddleOCR and EasyOCR are heavy; import only when needed
# ---------------------------------------------------------------------------
_ppstructure_cls = None
_easyocr_cls = None


def _get_ppstructure():
    global _ppstructure_cls
    if _ppstructure_cls is None:
        from paddleocr import PPStructure
        _ppstructure_cls = PPStructure
    return _ppstructure_cls


def _get_easyocr():
    global _easyocr_cls
    if _easyocr_cls is None:
        import easyocr
        _easyocr_cls = easyocr
    return _easyocr_cls


# ---------------------------------------------------------------------------
# HTML table parser
# ---------------------------------------------------------------------------
def _parse_html_table(html: str) -> List[List[str]]:
    """
    Parse an HTML table string into a list of rows (each row is a list of cell strings).
    Handles colspan/rowspan by filling spanned cells with the same value.
    """
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        table = soup.find("table")
        if not table:
            return []

        rows_out: List[List[str]] = []
        # Track rowspan carry-overs: {col_index: (remaining_rows, value)}
        rowspan_carry: Dict[int, List] = {}

        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            row: List[str] = []
            col_idx = 0

            for cell in cells:
                # Fill in any carried-over rowspan values at this column position
                while col_idx in rowspan_carry and rowspan_carry[col_idx][0] > 0:
                    row.append(rowspan_carry[col_idx][1])
                    rowspan_carry[col_idx][0] -= 1
                    if rowspan_carry[col_idx][0] == 0:
                        del rowspan_carry[col_idx]
                    col_idx += 1

                text = cell.get_text(separator=" ", strip=True)
                colspan = int(cell.get("colspan", 1))
                rowspan = int(cell.get("rowspan", 1))

                for _ in range(colspan):
                    row.append(text)
                    if rowspan > 1:
                        rowspan_carry[col_idx] = [rowspan - 1, text]
                    col_idx += 1

            rows_out.append(row)

        return rows_out

    except Exception as e:
        logger.warning(f"HTML table parse failed: {e}")
        return []


def _table_rows_to_dicts(rows: List[List[str]]) -> List[Dict[str, str]]:
    """
    Convert a list-of-lists table into a list of dicts using the first row as headers.
    """
    if not rows or len(rows) < 2:
        return []

    headers = [h.strip() or f"col_{i}" for i, h in enumerate(rows[0])]
    result = []
    for row in rows[1:]:
        # Pad short rows
        padded = row + [""] * (len(headers) - len(row))
        result.append(dict(zip(headers, padded[: len(headers)])))
    return result


# ---------------------------------------------------------------------------
# Main engine class
# ---------------------------------------------------------------------------
class LandRecordOCREngine:
    """
    Wraps PP-StructureV3 for layout-aware OCR on Indian land record documents.
    Provides a fallback to EasyOCR for handwritten or low-confidence regions.
    """

    CONFIDENCE_THRESHOLD = 0.60  # Below this → trigger EasyOCR fallback

    def __init__(self):
        self._structure_engine = None
        self._easyocr_reader = None
        self._initialized = False
        logger.info("LandRecordOCREngine created (lazy init — engines load on first use)")

    # ------------------------------------------------------------------
    # Lazy initialization
    # ------------------------------------------------------------------

    def _ensure_initialized(self):
        if self._initialized:
            return
        self._init_ppstructure()
        self._initialized = True

    def _init_ppstructure(self):
        """Initialize PP-StructureV3 with Hindi + table support."""
        try:
            PPStructure = _get_ppstructure()
            self._structure_engine = PPStructure(
                table=True,
                ocr=True,
                lang="hi",           # Hindi/Devanagari primary
                show_log=False,
                use_gpu=False,       # CPU mode for compatibility
                layout=True,
                structure_version="PP-StructureV3",
            )
            logger.info("PP-StructureV3 initialized successfully")
        except Exception as e:
            logger.error(f"PP-StructureV3 init failed: {e}")
            self._structure_engine = None

    def _ensure_easyocr(self):
        """Lazy-init EasyOCR reader for handwritten fallback."""
        if self._easyocr_reader is not None:
            return
        try:
            easyocr = _get_easyocr()
            self._easyocr_reader = easyocr.Reader(["hi", "en"], gpu=False)
            logger.info("EasyOCR reader initialized (hi + en)")
        except Exception as e:
            logger.warning(f"EasyOCR init failed (fallback unavailable): {e}")
            self._easyocr_reader = None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process_image(self, image_path: str) -> Dict[str, Any]:
        """
        Run PP-StructureV3 on a single image.
        Returns:
            {
                "tables": [list of dicts per table],
                "raw_text": "full concatenated text",
                "regions": [raw region list from PPStructure],
                "confidence_scores": [float per region],
            }
        """
        self._ensure_initialized()

        result: Dict[str, Any] = {
            "tables": [],
            "raw_text": "",
            "regions": [],
            "confidence_scores": [],
        }

        # ── Primary: PP-StructureV3 ──────────────────────────────────
        structure_result = self._run_ppstructure(image_path)

        if structure_result is None:
            # PP-Structure failed entirely — fall back to basic OCR
            logger.warning("PP-Structure returned None, falling back to EasyOCR")
            return self._fallback_easyocr(image_path)

        tables: List[List[Dict]] = []
        text_blocks: List[str] = []
        confidence_scores: List[float] = []

        for region in structure_result:
            region_type = region.get("type", "").lower()
            res = region.get("res", {})

            if region_type == "table":
                html = res.get("html", "") if isinstance(res, dict) else ""
                rows = self.extract_tables_from_html(html)
                dicts = _table_rows_to_dicts(rows)
                tables.append(dicts)

            elif region_type in ("text", "title", "list"):
                if isinstance(res, list):
                    for line in res:
                        if isinstance(line, (list, tuple)) and len(line) >= 2:
                            text_part = line[1]
                            if isinstance(text_part, (list, tuple)) and len(text_part) >= 2:
                                text_blocks.append(str(text_part[0]))
                                confidence_scores.append(float(text_part[1]))
                            elif isinstance(text_part, str):
                                text_blocks.append(text_part)

            # figure regions are skipped (no text content)

        raw_text = "\n".join(text_blocks)

        # ── Fallback: EasyOCR for low-confidence Hindi ───────────────
        avg_conf = (
            sum(confidence_scores) / len(confidence_scores)
            if confidence_scores
            else 0.0
        )
        if avg_conf < self.CONFIDENCE_THRESHOLD and raw_text.strip():
            logger.info(
                f"Avg confidence {avg_conf:.2f} < {self.CONFIDENCE_THRESHOLD}, "
                "running EasyOCR second pass"
            )
            easy_text = self._run_easyocr(image_path)
            if easy_text:
                raw_text = self._merge_texts(raw_text, easy_text)

        result["tables"] = tables
        result["raw_text"] = raw_text
        result["regions"] = structure_result
        result["confidence_scores"] = confidence_scores

        return result

    def extract_tables(self, structure_result: List[Dict]) -> List[List[List[str]]]:
        """
        Extract all tables from a PP-StructureV3 result list.
        Returns a list of tables; each table is a list of rows; each row is a list of strings.
        """
        all_tables = []
        for region in structure_result:
            if region.get("type", "").lower() == "table":
                res = region.get("res", {})
                html = res.get("html", "") if isinstance(res, dict) else ""
                rows = self.extract_tables_from_html(html)
                if rows:
                    all_tables.append(rows)
        return all_tables

    def extract_tables_from_html(self, html: str) -> List[List[str]]:
        """Parse HTML table string → list of rows (list of cell strings)."""
        return _parse_html_table(html)

    def get_engine_info(self) -> Dict[str, Any]:
        """Return engine status for the /health endpoint."""
        return {
            "ppstructure": "initialized" if self._structure_engine else "not initialized",
            "easyocr": "initialized" if self._easyocr_reader else "not initialized",
            "ppstructure_version": "PP-StructureV3",
            "ocr_lang": "hi (Hindi/Devanagari) + en",
            "gpu": False,
        }

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _run_ppstructure(self, image_path: str) -> Optional[List[Dict]]:
        """Run PP-StructureV3 and return raw result list, or None on failure."""
        if self._structure_engine is None:
            return None
        try:
            img = np.array(Image.open(image_path).convert("RGB"))
            result = self._structure_engine(img)
            return result
        except Exception as e:
            logger.error(f"PP-Structure processing error: {e}\n{traceback.format_exc()}")
            return None

    def _run_easyocr(self, image_path: str) -> str:
        """Run EasyOCR and return concatenated text string."""
        self._ensure_easyocr()
        if self._easyocr_reader is None:
            return ""
        try:
            results = self._easyocr_reader.readtext(image_path, detail=1)
            lines = [r[1] for r in results if r[2] > 0.3]  # filter low-conf
            return "\n".join(lines)
        except Exception as e:
            logger.warning(f"EasyOCR failed: {e}")
            return ""

    def _fallback_easyocr(self, image_path: str) -> Dict[str, Any]:
        """Full fallback when PP-Structure fails entirely."""
        text = self._run_easyocr(image_path)
        return {
            "tables": [],
            "raw_text": text,
            "regions": [],
            "confidence_scores": [],
        }

    @staticmethod
    def _merge_texts(primary: str, secondary: str) -> str:
        """
        Merge PP-Structure text with EasyOCR text.
        Strategy: keep primary, append any lines from secondary not already present.
        """
        primary_lines = set(l.strip() for l in primary.splitlines() if l.strip())
        extra = [
            l for l in secondary.splitlines()
            if l.strip() and l.strip() not in primary_lines
        ]
        if extra:
            return primary + "\n" + "\n".join(extra)
        return primary
