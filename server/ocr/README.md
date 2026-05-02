# Land Record OCR Service

Python FastAPI microservice for AI-powered OCR extraction of Indian land records.

## Setup

```bash
cd server/ocr
pip install -r requirements.txt
```

## Run

```bash
cd server/ocr
python src/main.py
# Starts on http://localhost:8001
```

## Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/ocr/upload` | Process a single document |
| POST | `/ocr/batch` | Process up to 10 documents |
| GET | `/ocr/health` | Engine status |
| GET | `/ocr/supported-documents` | Supported document types |
| GET | `/demo` | Sample extraction results |

## Supported Documents

Khatauni, 7/12 Satbara, Jamabandi, Patta, RTC, Adangal, EC, Mutation Order
