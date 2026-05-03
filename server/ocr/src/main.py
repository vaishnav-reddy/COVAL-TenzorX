"""
main.py
FastAPI server for Land Record OCR extraction.
Endpoints: /ocr/upload, /ocr/batch, /ocr/health, /ocr/supported-documents, /demo

Processing strategy:
  1. Text-based PDF  → PyMuPDF direct text extraction (fast, accurate, no OCR needed)
  2. Scanned PDF / Image → PaddleOCR PP-OCRv5 + EasyOCR fallback
"""

import hashlib
import logging
import os
import tempfile
import time
from typing import Any, Dict, List, Optional

import fitz  # PyMuPDF — already installed via pdf_processor
import uvicorn
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from field_extractor import LandFieldExtractor
from ocr_engine import LandRecordOCREngine
from pdf_processor import PDFProcessor

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("land_ocr")

app = FastAPI(
    title="Land Record OCR API",
    description="AI-powered OCR extraction for Indian land records (Khatauni, 7/12, Jamabandi, etc.)",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ocr_engine: Optional[LandRecordOCREngine] = None
_field_extractor: Optional[LandFieldExtractor] = None
_result_cache: Dict[str, Dict] = {}

MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}


def get_ocr_engine() -> LandRecordOCREngine:
    global _ocr_engine
    if _ocr_engine is None:
        _ocr_engine = LandRecordOCREngine()
    return _ocr_engine


def get_field_extractor() -> LandFieldExtractor:
    global _field_extractor
    if _field_extractor is None:
        _field_extractor = LandFieldExtractor()
    return _field_extractor


def _file_hash(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def _validate_file(file: UploadFile, data: bytes):
    ext = os.path.splitext(file.filename or "")[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=415,
            detail=f"Unsupported file type '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}",
        )
    if len(data) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(data) // 1024}KB). Max allowed: 10MB",
        )
    if len(data) == 0:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")


def _save_temp(data: bytes, suffix: str) -> str:
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    return path


# ---------------------------------------------------------------------------
# Text-PDF fast path — uses PyMuPDF direct text extraction
# ---------------------------------------------------------------------------

# Minimum characters per page to consider a PDF "text-based"
_TEXT_PDF_THRESHOLD = 100


def _extract_text_from_pdf(pdf_path: str) -> tuple[str, int]:
    """
    Extract embedded text from a PDF using PyMuPDF.
    Returns (combined_text, page_count).
    Works for any digitally-created PDF (Word exports, reports, certificates).
    """
    doc = fitz.open(pdf_path)
    pages_text = []
    for page in doc:
        pages_text.append(page.get_text("text"))
    doc.close()
    return "\n\n".join(pages_text), len(pages_text)


def _is_text_pdf(pdf_path: str) -> bool:
    """
    Returns True if the PDF has enough embedded text to skip OCR.
    Scanned PDFs have near-zero text; digital PDFs have hundreds of chars per page.
    """
    try:
        doc = fitz.open(pdf_path)
        total_chars = sum(len(page.get_text("text").strip()) for page in doc)
        page_count = doc.page_count
        doc.close()
        avg_chars = total_chars / max(page_count, 1)
        logger.info(f"PDF text check: {total_chars} chars across {page_count} pages (avg {avg_chars:.0f}/page)")
        return avg_chars >= _TEXT_PDF_THRESHOLD
    except Exception as e:
        logger.warning(f"Text PDF check failed: {e}")
        return False


async def _process_single_file(file: UploadFile) -> Dict[str, Any]:
    data = await file.read()
    _validate_file(file, data)

    file_hash = _file_hash(data)
    if file_hash in _result_cache:
        logger.info(f"Cache hit for {file.filename} ({file_hash[:8]})")
        cached = dict(_result_cache[file_hash])
        cached["cached"] = True
        return cached

    ext = os.path.splitext(file.filename or "")[1].lower()
    tmp_path = _save_temp(data, ext)
    processor = PDFProcessor()

    try:
        global_start = time.time()
        warnings: List[str] = []
        extractor = get_field_extractor()

        combined_text = ""
        all_tables: List = []
        all_confidence: List = []
        pages_processed = 1

        # ── Strategy selection ────────────────────────────────────────────
        if ext == ".pdf" and _is_text_pdf(tmp_path):
            # Fast path: digital/text-based PDF — direct PyMuPDF extraction
            logger.info(f"[Fast path] Text-based PDF detected — using PyMuPDF direct extraction")
            combined_text, pages_processed = _extract_text_from_pdf(tmp_path)
            logger.info(f"[Fast path] Extracted {len(combined_text)} chars from {pages_processed} pages in "
                        f"{time.time()-global_start:.2f}s")
        else:
            # Slow path: scanned PDF or image — run PaddleOCR
            logger.info(f"[OCR path] Scanned/image document — running PaddleOCR PP-OCRv5")
            try:
                image_paths = processor.process(tmp_path)
            except ValueError as e:
                raise HTTPException(status_code=422, detail=f"File processing error: {e}")

            pages_processed = len(image_paths)
            engine = get_ocr_engine()

            for img_path in image_paths:
                try:
                    ocr_result = engine.process_image(img_path)
                    all_raw_text = ocr_result.get("raw_text", "")
                    all_tables.extend(ocr_result.get("tables", []))
                    all_confidence.extend(ocr_result.get("confidence_scores", []))
                    combined_text += "\n\n" + all_raw_text
                except Exception as e:
                    logger.warning(f"OCR failed for page {img_path}: {e}")
                    warnings.append(f"OCR failed for one page: {str(e)}")

            combined_text = combined_text.strip()
            logger.info(f"[OCR path] Done — {len(all_tables)} table(s), {len(combined_text)} chars")

        if not combined_text.strip():
            warnings.append("No text extracted — document may be blank or heavily degraded.")

        # ── Field extraction ──────────────────────────────────────────────
        merged_ocr = {
            "raw_text": combined_text,
            "tables": all_tables,
            "regions": [],
            "confidence_scores": all_confidence,
        }
        extracted = extractor.extract_all_fields(merged_ocr)
        doc_type = extractor.detect_document_type(combined_text)
        confidence_score = extractor.calculate_confidence_score(extracted)

        logger.info(f"Doc type: {doc_type} | Confidence: {confidence_score}/100 | "
                    f"Fields: {len(extracted)} | Time: {time.time()-global_start:.2f}s")

        if confidence_score < 50:
            warnings.append("Low confidence score — consider uploading a higher-resolution scan.")

        processing_time_ms = round((time.time() - global_start) * 1000)

        location = {
            "district": extracted.get("district"),
            "tehsil":   extracted.get("tehsil"),
            "village":  extracted.get("village"),
            "state":    extracted.get("state"),
        }

        response = {
            "status": "success",
            "document_type": doc_type,
            "confidence_score": confidence_score,
            "processing_time_ms": processing_time_ms,
            "pages_processed": pages_processed,
            "extracted_fields": {
                "survey_no":         extracted.get("survey_no"),
                "owner_name":        extracted.get("owner_name"),
                "co_owner":          extracted.get("co_owner_name"),
                "land_area":         extracted.get("land_area"),
                "khasra_no":         extracted.get("khasra_no"),
                "khata_no":          extracted.get("khata_no"),
                "land_type":         extracted.get("land_type"),
                "land_use":          extracted.get("land_use"),
                "mutation_no":       extracted.get("mutation_no"),
                "registration_date": extracted.get("registration_date"),
                "location":          location,
                "property_fields":   extracted.get("property_fields"),
            },
            "raw_ocr_text": combined_text,
            "tables_found": len(all_tables),
            "warnings": warnings,
            "cached": False,
        }

        _result_cache[file_hash] = response
        return response

    finally:
        processor.cleanup()
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.post("/ocr/upload")
async def upload_document(file: UploadFile = File(...)):
    """Process a single land record document (PDF, PNG, JPG, TIFF). Max 10MB."""
    try:
        result = await _process_single_file(file)
        return JSONResponse(content=result, status_code=200)
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Unexpected error processing '{file.filename}': {e}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Internal processing error: {str(e)}")


@app.post("/ocr/batch")
async def batch_upload(files: List[UploadFile] = File(...)):
    """Process up to 10 land record documents in sequence."""
    if len(files) > 10:
        raise HTTPException(
            status_code=400,
            detail=f"Too many files ({len(files)}). Maximum batch size is 10.",
        )

    results = []
    for file in files:
        try:
            result = await _process_single_file(file)
            results.append(result)
        except HTTPException as e:
            results.append({
                "status": "error",
                "filename": file.filename,
                "error": e.detail,
                "status_code": e.status_code,
            })
        except Exception as e:
            results.append({"status": "error", "filename": file.filename, "error": str(e)})

    return JSONResponse(content={"results": results, "total": len(results)})


@app.get("/ocr/health")
async def health_check():
    engine = get_ocr_engine()
    return {
        "status": "healthy",
        "engine_info": engine.get_engine_info(),
        "cache_entries": len(_result_cache),
        "max_file_size_mb": MAX_FILE_SIZE_BYTES // (1024 * 1024),
        "supported_formats": list(ALLOWED_EXTENSIONS),
    }


@app.get("/ocr/supported-documents")
async def supported_documents():
    return {
        "document_types": [
            {"type": "7/12",          "name": "Satbara Utara",              "states": ["Maharashtra", "Gujarat"]},
            {"type": "ROR",           "name": "Record of Rights",           "states": ["All states"]},
            {"type": "Khatauni",      "name": "Khatauni / Khatian",         "states": ["Uttar Pradesh", "Bihar", "Jharkhand", "West Bengal"]},
            {"type": "Patta",         "name": "Patta / Chitta",             "states": ["Tamil Nadu", "Andhra Pradesh", "Telangana", "Karnataka"]},
            {"type": "Jamabandi",     "name": "Jamabandi / Fard",           "states": ["Punjab", "Haryana", "Himachal Pradesh", "Rajasthan"]},
            {"type": "Adangal",       "name": "Adangal / 1-B",              "states": ["Andhra Pradesh", "Telangana"]},
            {"type": "RTC",           "name": "Rights Tenancy Crops (RTC)", "states": ["Karnataka"]},
            {"type": "EC",            "name": "Encumbrance Certificate",    "states": ["All states"]},
            {"type": "MutationOrder", "name": "Mutation / Dakhil Kharij",   "states": ["All states"]},
        ]
    }


@app.get("/demo")
async def demo_data():
    """Returns 3 hardcoded sample extraction results for UI demo/testing."""
    return {
        "samples": [
            {
                "label": "UP Khatauni — Safe (High Confidence)",
                "status": "success",
                "document_type": "Khatauni",
                "confidence_score": 87,
                "processing_time_ms": 2340,
                "pages_processed": 1,
                "extracted_fields": {
                    "survey_no": "124/2",
                    "owner_name": "राम प्रसाद सिंह",
                    "co_owner": "सुमन देवी",
                    "land_area": {"hectare": 1.245, "bigha": 4.924, "acre": 3.076, "guntha": 12.302, "cent": 122.5},
                    "khasra_no": "124/2",
                    "khata_no": "45",
                    "land_type": "Self-cultivated",
                    "land_use": "Agricultural",
                    "mutation_no": "4521",
                    "registration_date": "12/03/2019",
                    "location": {"district": "Lucknow", "tehsil": "Lucknow Sadar", "village": "Amausi", "state": "Uttar Pradesh"},
                },
                "tables_found": 1,
                "warnings": [],
                "cached": False,
            },
            {
                "label": "Maharashtra 7/12 — Caution (Medium Confidence)",
                "status": "success",
                "document_type": "7/12",
                "confidence_score": 63,
                "processing_time_ms": 3120,
                "pages_processed": 2,
                "extracted_fields": {
                    "survey_no": "45/A",
                    "owner_name": "Suresh Vitthal Patil",
                    "co_owner": None,
                    "land_area": {"hectare": 0.81, "bigha": 3.203, "acre": 2.001, "guntha": 8.0, "cent": 79.7},
                    "khasra_no": "45/A",
                    "khata_no": "112",
                    "land_type": "Irrigated",
                    "land_use": "Agricultural",
                    "mutation_no": None,
                    "registration_date": "05/11/2021",
                    "location": {"district": "Pune", "tehsil": "Haveli", "village": "Uruli Kanchan", "state": "Maharashtra"},
                },
                "tables_found": 2,
                "warnings": ["Low confidence on page 2 — handwritten annotations detected."],
                "cached": False,
            },
            {
                "label": "Punjab Jamabandi — Needs Verification (Low Confidence)",
                "status": "success",
                "document_type": "Jamabandi",
                "confidence_score": 41,
                "processing_time_ms": 4890,
                "pages_processed": 3,
                "extracted_fields": {
                    "survey_no": None,
                    "owner_name": "Gurpreet Singh",
                    "co_owner": "Harpreet Kaur",
                    "land_area": {"hectare": 2.023, "bigha": 7.998, "acre": 4.999, "guntha": 19.99, "cent": 199.9},
                    "khasra_no": "88/2",
                    "khata_no": None,
                    "land_type": "Canal-irrigated",
                    "land_use": "Agricultural",
                    "mutation_no": "7834",
                    "registration_date": None,
                    "location": {"district": "Amritsar", "tehsil": "Ajnala", "village": "Fatehpur", "state": "Punjab"},
                },
                "tables_found": 3,
                "warnings": [
                    "Low confidence score — consider uploading a higher-resolution scan.",
                    "Survey number not detected — manual verification required.",
                    "Registration date not found in document.",
                ],
                "cached": False,
            },
        ]
    }


if __name__ == "__main__":
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
