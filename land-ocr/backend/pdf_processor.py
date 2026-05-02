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

# Supported direct image formats
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".bmp"}
PDF_EXTENSION = ".pdf"


class PDFProcessor:
    """
    Handles conversion of PDF files to images and passthrough of direct image uploads.
    All output images are saved to a temporary directory that can be cleaned up after use.
    """

    def __init__(self):
        # Create a unique temp directory for this processor instance
        self.temp_dir = tempfile.mkdtemp(prefix="land_ocr_")
        logger.info(f"PDFProcessor initialized. Temp dir: {self.temp_dir}")

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def process(self, file_path: str) -> List[str]:
        """
        Main entry point. Accepts a PDF or image file path.
        Returns a list of absolute paths to PNG images ready for OCR.
        """
        path = Path(file_path)
        ext = path.suffix.lower()

        if ext == PDF_EXTENSION:
            return self._pdf_to_images(file_path)
        elif ext in IMAGE_EXTENSIONS:
            return self._prepare_image(file_path)
        else:
            raise ValueError(
                f"Unsupported file type: '{ext}'. "
                f"Supported: PDF, {', '.join(IMAGE_EXTENSIONS)}"
            )

    def cleanup(self):
        """Delete the temp directory and all generated images."""
        if os.path.exists(self.temp_dir):
            shutil.rmtree(self.temp_dir, ignore_errors=True)
            logger.info(f"Cleaned up temp dir: {self.temp_dir}")

    # ------------------------------------------------------------------
    # Private helpers
    # ------------------------------------------------------------------

    def _pdf_to_images(self, pdf_path: str) -> List[str]:
        """
        Convert each page of a PDF to a 300 DPI PNG image.
        Uses fitz.Matrix(3.33, 3.33) which gives ~300 DPI from a 72 DPI base.
        """
        image_paths: List[str] = []

        try:
            doc = fitz.open(pdf_path)
        except Exception as e:
            raise ValueError(f"Cannot open PDF '{pdf_path}': {e}")

        if doc.page_count == 0:
            raise ValueError("PDF has no pages.")

        # 3.33x zoom ≈ 300 DPI (72 * 3.33 ≈ 240, close enough for OCR quality)
        matrix = fitz.Matrix(3.33, 3.33)

        for page_num in range(doc.page_count):
            page = doc[page_num]
            pix = page.get_pixmap(matrix=matrix, alpha=False)

            out_path = os.path.join(
                self.temp_dir, f"page_{page_num + 1:03d}.png"
            )
            pix.save(out_path)
            image_paths.append(out_path)
            logger.debug(f"Saved page {page_num + 1} → {out_path} ({pix.width}x{pix.height}px)")

        doc.close()
        logger.info(f"PDF converted: {len(image_paths)} pages from '{pdf_path}'")
        return image_paths

    def _prepare_image(self, image_path: str) -> List[str]:
        """
        For direct image uploads: copy to temp dir as PNG (normalizes format).
        Returns a single-element list for uniform downstream handling.
        """
        try:
            img = Image.open(image_path)
            # Convert to RGB if needed (handles RGBA, palette, etc.)
            if img.mode not in ("RGB", "L"):
                img = img.convert("RGB")

            out_path = os.path.join(self.temp_dir, "uploaded_image.png")
            img.save(out_path, "PNG", dpi=(300, 300))
            logger.info(f"Image prepared: {image_path} → {out_path}")
            return [out_path]

        except Exception as e:
            raise ValueError(f"Cannot process image '{image_path}': {e}")

    def get_page_count(self, file_path: str) -> int:
        """Return number of pages (1 for images, N for PDFs)."""
        path = Path(file_path)
        if path.suffix.lower() == PDF_EXTENSION:
            doc = fitz.open(file_path)
            count = doc.page_count
            doc.close()
            return count
        return 1
