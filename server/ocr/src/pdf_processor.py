"""
pdf_processor.py
Converts PDF pages to high-resolution PNG images for OCR processing.
Also handles direct image uploads (PNG, JPG, TIFF).
"""

import os
import shutil
import tempfile
import logging
from pathlib import Path
from typing import List

import fitz  # PyMuPDF
from PIL import Image

logger = logging.getLogger(__name__)

IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}
PDF_EXTENSION = ".pdf"


class PDFProcessor:
    """Converts PDF files to images and normalises direct image uploads."""

    def __init__(self):
        self.temp_dir = tempfile.mkdtemp(prefix="land_ocr_")
        logger.info(f"PDFProcessor initialized. Temp dir: {self.temp_dir}")

    def process(self, file_path: str) -> List[str]:
        """Returns a list of absolute PNG paths ready for OCR."""
        ext = Path(file_path).suffix.lower()
        if ext == PDF_EXTENSION:
            return self._pdf_to_images(file_path)
        elif ext in IMAGE_EXTENSIONS:
            return self._prepare_image(file_path)
        else:
            raise ValueError(f"Unsupported file type: '{ext}'")

    def cleanup(self):
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info(f"Cleaned up temp dir: {self.temp_dir}")

    def _pdf_to_images(self, pdf_path: str) -> List[str]:
        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            raise ValueError(f"Cannot open PDF '{pdf_path}': {e}")

        if doc.page_count == 0:
            raise ValueError("PDF has no pages.")

        matrix = fitz.Matrix(3.33, 3.33)  # ~300 DPI
        image_paths: List[str] = []

        for page_num in range(doc.page_count):
            pix = doc[page_num].get_pixmap(matrix=matrix, alpha=False)
            out_path = os.path.join(self.temp_dir, f"page_{page_num + 1:03d}.png")
            pix.save(out_path)
            image_paths.append(out_path)

        doc.close()
        logger.info(f"PDF converted: {len(image_paths)} pages from '{pdf_path}'")
        return image_paths

    def _prepare_image(self, image_path: str) -> List[str]:
        try:
            img = Image.open(image_path)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")
            out_path = os.path.join(self.temp_dir, "uploaded_image.png")
            img.save(out_path, "PNG", dpi=(300, 300))
            return [out_path]
        except Exception as e:
            raise ValueError(f"Cannot process image '{image_path}': {e}")

    def get_page_count(self, file_path: str) -> int:
        if Path(file_path).suffix.lower() == PDF_EXTENSION:
            doc = fitz.open(file_path)
            count = doc.page_count
            doc.close()
            return count
        return 1
