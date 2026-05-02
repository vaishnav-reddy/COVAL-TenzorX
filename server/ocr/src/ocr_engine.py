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


def _parse_html_table(html: str) -> List[List[str]]:
    try:
        from bs4 import BeautifulSoup
        soup = BeautifulSoup(html, "lxml")
        table = soup.find("table")
        if not table:
            return []

        rows_out: List[List[str]] = []
        rowspan_carry: Dict[int, List] = {}

        for tr in table.find_all("tr"):
            cells = tr.find_all(["td", "th"])
            row: List[str] = []
            col_idx = 0

            for cell in cells:
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
    if not rows or len(rows) < 2:
        return []
    headers = [h.strip() or f"col_{i}" for i, h in enumerate(rows[0])]
    return [
        dict(zip(headers, (row + [""] * (len(headers) - len(row)))[: len(headers)]))
        for row in rows[1:]
    ]


class LandRecordOCREngine:
    """Wraps PP-StructureV3 for layout-aware OCR on Indian land record documents."""

    CONFIDENCE_THRESHOLD = 0.60

    def __init__(self):
        self._structure_engine = None
        self._easyocr_reader = None
        self._initialized = False
        logger.info("LandRecordOCREngine created (lazy init)")

    def _ensure_initialized(self):
        if self._initialized:
            return
        self._init_ppstructure()
        self._initialized = True

    def _init_ppstructure(self):
        try:
            PPStructure = _get_ppstructure()
            self._structure_engine = PPStructure(
                table=True, ocr=True, lang="hi",
                show_log=False, use_gpu=False,
                layout=True, structure_version="PP-StructureV3",
            )
            logger.info("PP-StructureV3 initialized successfully")
        except Exception as e:
            logger.error(f"PP-StructureV3 init failed: {e}")
            self._structure_engine = None

    def _ensure_easyocr(self):
        if self._easyocr_reader is not None:
            return
        try:
            easyocr = _get_easyocr()
            self._easyocr_reader = easyocr.Reader(["hi", "en"], gpu=False)
            logger.info("EasyOCR reader initialized (hi + en)")
        except Exception as e:
            logger.warning(f"EasyOCR init failed: {e}")
            self._easyocr_reader = None

    def process_image(self, image_path: str) -> Dict[str, Any]:
        self._ensure_initialized()

        result: Dict[str, Any] = {"tables": [], "raw_text": "", "regions": [], "confidence_scores": []}
        structure_result = self._run_ppstructure(image_path)

        if structure_result is None:
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
                tables.append(_table_rows_to_dicts(rows))
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

        raw_text = "\n".join(text_blocks)
        avg_conf = sum(confidence_scores) / len(confidence_scores) if confidence_scores else 0.0

        if avg_conf < self.CONFIDENCE_THRESHOLD and raw_text.strip():
            logger.info(f"Avg confidence {avg_conf:.2f} < threshold, running EasyOCR second pass")
            easy_text = self._run_easyocr(image_path)
            if easy_text:
                raw_text = self._merge_texts(raw_text, easy_text)

        result.update({"tables": tables, "raw_text": raw_text, "regions": structure_result, "confidence_scores": confidence_scores})
        return result

    def extract_tables_from_html(self, html: str) -> List[List[str]]:
        return _parse_html_table(html)

    def get_engine_info(self) -> Dict[str, Any]:
        return {
            "ppstructure": "initialized" if self._structure_engine else "not initialized",
            "easyocr": "initialized" if self._easyocr_reader else "not initialized",
            "ppstructure_version": "PP-StructureV3",
            "ocr_lang": "hi (Hindi/Devanagari) + en",
            "gpu": False,
        }

    def _run_ppstructure(self, image_path: str) -> Optional[List[Dict]]:
        if self._structure_engine is None:
            return None
        try:
            img = np.array(Image.open(image_path).convert("RGB"))
            return self._structure_engine(img)
        except Exception as e:
            logger.error(f"PP-Structure processing error: {e}\n{traceback.format_exc()}")
            return None

    def _run_easyocr(self, image_path: str) -> str:
        self._ensure_easyocr()
        if self._easyocr_reader is None:
            return ""
        try:
            results = self._easyocr_reader.readtext(image_path, detail=1)
            return "\n".join(r[1] for r in results if r[2] > 0.3)
        except Exception as e:
            logger.warning(f"EasyOCR failed: {e}")
            return ""

    def _fallback_easyocr(self, image_path: str) -> Dict[str, Any]:
        return {"tables": [], "raw_text": self._run_easyocr(image_path), "regions": [], "confidence_scores": []}

    @staticmethod
    def _merge_texts(primary: str, secondary: str) -> str:
        primary_lines = set(l.strip() for l in primary.splitlines() if l.strip())
        extra = [l for l in secondary.splitlines() if l.strip() and l.strip() not in primary_lines]
        return primary + "\n" + "\n".join(extra) if extra else primary
