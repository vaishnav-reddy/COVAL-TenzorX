<div align="center">

<p align="center">
  <img width="420" height="152" alt="coval logo" src="https://github.com/user-attachments/assets/f3895b50-4638-490d-9bce-f2a1428abacc" />
</p>

<h1>COVAL — AI-Driven Collateral Valuation & Liquidity Engine</h1>

<p><strong>Built for the TenzorX Hackathon 2026 · Poonawalla Fincorp Challenge</strong></p>

[Live Demo](https://coval.onrender.com/)
[Watch Demo](https://www.youtube.com/watch?v=S0VK7zplLUU)

<br/>

[![License](https://img.shields.io/badge/License-MIT-green?style=for-the-badge)](LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-56.2%25-blue?style=for-the-badge&logo=typescript)](https://github.com/vaishnav-reddy/COVAL)
[![Node.js](https://img.shields.io/badge/Node.js-Backend-green?style=for-the-badge&logo=node.js)](https://github.com/vaishnav-reddy/COVAL)
[![MongoDB](https://img.shields.io/badge/MongoDB-Database-brightgreen?style=for-the-badge&logo=mongodb)](https://github.com/vaishnav-reddy/COVAL)
[![Python](https://img.shields.io/badge/Python-OCR%20Service-yellow?style=for-the-badge&logo=python)](https://github.com/vaishnav-reddy/COVAL)

<br/>

> *India's property-backed lending market is at a critical inflection point — and the manual processes powering it are no longer sufficient.*

</div>

---

## Table of Contents

- [Problem Statement](#problem-statement)
- [Solution: COVAL](#solution-coval)
- [Key Features](#key-features)
- [System Architecture](#system-architecture)
- [5-Engine Pipeline](#5-engine-pipeline)
- [OCR Pipeline](#ocr-pipeline)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Getting Started](#getting-started)
- [API Reference](#api-reference)
- [Screenshots](#screenshots)
- [Regulatory Compliance](#regulatory-compliance)
- [Competitive Landscape](#competitive-landscape)
- [Impact & Market](#impact--market)
- [Feasibility & Challenges](#feasibility--challenges)
- [Seeded Cities & Test Inputs](#seeded-cities--test-inputs)
- [References](#references)

---

##  Problem Statement

**Property-backed lending in NBFCs depends heavily on manual valuation processes — and it's fundamentally broken.**

| Challenge | Reality |
|---|---|
|  **Painfully Slow Approvals** | Standard home loans take 7–15 days for approval. Complex cases stretch to 4–8 weeks. |
|  **Subjective Valuations** | Third-party valuators introduce bias and undisclosed conflicts of interest at every step. |
|  **Fraud & Valuation Risk** | ₹2,434 crore PNB–SREI fraud shows how inflated valuations lead to massive NPA losses. |
|  **Rejection Rate Crisis** | 28% of MSME loans rejected due to poor collateral visibility. |
|  **Distress & Liquidity Risk** | Resale values drop 20–30% in distress scenarios, inflating provisioning needs. |
|  **Flawed Benchmarks** | Government circle rates are compliance tools — they don't reflect real market value. |

> *The Government of India created CERSAI specifically to prevent frauds involving multiple lending against the same immovable property — yet manual valuation processes remain the primary vulnerability in the chain.*

---

##  Solution: COVAL

**COVAL** = **Co**llateral **Val**uation & Liquidity Engine

An AI-driven collateral valuation and resale liquidity engine purpose-built for NBFC workflows like Poonawalla Fincorp's. COVAL doesn't output a single opaque number — it delivers a **value range** (e.g., ₹80.3L – ₹95L) alongside a **confidence score**, **liquidity analysis**, and **risk flags**, giving loan officers everything they need to make a defensible decision, fast.

### How It Works

```
┌──────────────────────────────────────────────────────────┐
│  1. INTAKE       Property data submitted via API or portal│
│                  Integrates into existing loan origination │
│                  systems seamlessly                        │
├──────────────────────────────────────────────────────────┤
│  2. AI ENGINE    Real-time comps, distress modeling,      │
│                  fraud signals, and liquidity scoring      │
│                  — all processed in seconds                │
├──────────────────────────────────────────────────────────┤
│  3. OUTPUT       Value range + confidence score +         │
│                  risk flags + audit trail                  │
│                  → delivered to loan officer instantly     │
├──────────────────────────────────────────────────────────┤
│  4. DECISION     Loan officer approves with confidence.   │
│                  Approval time: Days → Seconds             │
└──────────────────────────────────────────────────────────┘
```

---

##  Key Features

-  **Value Range Output** — Never a single number. Always a range (e.g. ₹80L – ₹95L) with a base market value and ±8% confidence interval
-  **5 AI Engines** — Liquidity → Valuation → Distress → Risk/Fraud → Confidence, running sequentially with full dependency injection
-  **Gemini AI OCR** — Gemini 2.5 Flash as the primary document extraction engine; Tesseract.js + regex as automatic fallback
-  **Fraud Detection** — Flags valuation deviations >25% from locality median, over-circle-rate anomalies, CERSAI encumbrance priors, and LTV breaches
-  **RBI Compliance** — Automatic erosion flag when distress value falls below 50% of assessed value; purpose-based LTV caps enforced
-  **Liquidity Intelligence** — Predicts time-to-sell from "15–30 days" to "12–24 months" using market absorption, property age, floor, size, and location signals
-  **Distress Valuation** — SARFAESI-based forced-sale value using RBI LTV norms and IBC 2016 liquidation methodology
-  **Confidence Scoring** — 10–98 score quantifying data completeness, comparable evidence quality, location intelligence, and risk-adjusted uncertainty
-  **Audit Trail** — Timestamped, engine-by-engine breakdown for regulatory and internal review
-  **Portfolio Dashboard** — Admin view with full history, risk distribution charts, and confidence trend analysis
-  **Printable Report** — Full report with methodology, comparables table, risk flags, and RBI compliance notes

---

##  System Architecture

<p align="center">
  <img width="1024" height="748" alt="COVAL Architecture" src="https://github.com/user-attachments/assets/0c52d6b3-93d7-4412-8c3d-454387a07601" />
</p>
---

##  5-Engine Pipeline

<p align="center">
  <img width="378" height="602" alt="5-Engine Pipeline" src="https://github.com/user-attachments/assets/f2d8db7d-e0a3-4695-9a61-995416caf649" />
</p>

---

### Engine 1 — Liquidity Engine
> Computes the property's resale speed and market certainty (score: 1–100)
> **Regulatory Basis:** RBI Master Circular 2015-16, NHB Housing Finance Report 2022, RICS Guidance Notes

| Component | Weight | Formula |
|---|---|---|
| Market Absorption | 25% | `Months of Inventory = 100 / absorptionRate` |
| Connectivity | 15% | `((connectivity + infrastructure) / 20) × 100` |
| Property Type Base | 15% | Residential: 80 · Commercial: 62 · Industrial: 45 · Land: 38 |
| Age Score | 15% | `100 × e^(-0.035 × age)`, floor: 15 |
| Size Score | 15% | Plottage effect with optimal band per property type |
| Floor Score | 8% | Ground: 72 · 2–5F: 92 · 6–10F: 85 · >20F: 48 |
| Amenities Score | 7% | `MIN(100 × (1 - e^(-0.20 × count)), 100)` |

**Output:** `liquidityScore (1–100)` · `exitCertainty (High / Medium / Low)` · `timeToSell` label

---

### Engine 2 — Valuation Engine
> Computes market value using a hybrid of 3 approaches
> **Regulatory Basis:** RICS Red Book PS2 2022, NHB Residual Life Method, RBI Master Circular 2015-16

**A. Sales Comparison Approach**
```
1. Fetch 5–10 comparable transactions (same city + type, size ±25%)
2. Time-adjust: adjustedPrice = price × (1 + yoy%)^(months/12)
3. Quality, size, floor adjustments per RICS methodology
4. Outlier removal via IQR method (Q1 – 1.5×IQR to Q3 + 1.5×IQR)
5. Final: weighted median × subject area
```

**B. Cost Approach (NHB Residual Life)**
```
Land Value         = circleRate × area × 0.45
Replacement Cost   = costPerSqft × area × qualityFactor   (CPWD 2023 benchmarks)
Depreciation       = 1 - MAX(residualFactor, 0.30)         (30% RBI floor)
Total Cost Value   = Land Value + Depreciated Structure
```

**C. Reconciliation (Age-Based Weights)**

| Age Band | Sales Comparison | Cost Approach |
|---|---|---|
| New (< 5yr) | 70% | 30% |
| Mid (5–20yr) | 65% | 35% |
| Old (20–35yr) | 55% | 45% |
| Very Old (> 35yr) | 45% | 55% |

**Output:** `marketValue` · `valueRange (±8%)` · `pricePerSqft` · approach breakdown · key drivers

---

### Engine 3 — Distress Engine
> Computes forced-sale / liquidation value per SARFAESI norms
> **Regulatory Basis:** RBI Master Circular 2015-16, SARFAESI Act 2002, IBC 2016

| Property Type | Base Multiplier | Floor | Ceiling |
|---|---|---|---|
| Residential | 82% | 55% | 82% |
| Commercial | 72% | 48% | 72% |
| Industrial | 65% | 42% | 65% |
| Land | 58% | 38% | 60% |

```
Adjustments applied to base multiplier:
  Liquidity Score ≥ 75    → +5%
  Liquidity Score ≤ 35    → -5%
  Falling market (YoY<0)  → -3% to -8%
  Property Age > 40yr     → -4%
  Property Age > 25yr     → -2%

RBI Erosion Flag: IF distressValue < marketValue × 0.50
  → MANDATORY NPA classification review + additional provisioning
```

**Output:** `distressValue` · `distressMultiplier` · `liquidationTimeline` · `rbiErosionFlag` · `leverageRatio`

---

### Engine 4 — Risk Engine
> Fraud detection, regulatory compliance, and risk scoring
> **Regulatory Basis:** RBI Fraud Circular, PMLA 2002, CERSAI Act 2002, RERA 2016, FEMA

| Component | Weight | Critical Threshold |
|---|---|---|
| Valuation Deviation | 25% | >50% overpriced → FRAUD flag (RBI Fraud Circular) |
| Distress Risk | 20% | Erosion flag or leverage ratio > 1.5x |
| Circle Rate Compliance | 15% | >60% above circle rate → CRITICAL |
| Structural Risk | 15% | <25% residual life → CRITICAL |
| Market Condition | 10% | Negative YoY appreciation → FALLING_MARKET flag |
| CERSAI Encumbrance | 10% | Bayesian prior ≥ 40% → CRITICAL |
| LTV Breach | 5% | Exceeds RBI cap by > 10% |

**Risk Labels:** `Safe (0–25)` · `Caution (26–60)` · `High Risk (61–100)`

---

### Engine 5 — Confidence Engine
> Assesses valuation reliability (score: 10–98)
> **Regulatory Basis:** RICS Red Book PS2.3, IVS 105

```
confidenceScore =
  dataCompleteness   × 0.30   (field completeness weighted by criticality)
  + compEvidence     × 0.25   (count × 0.40 + recency × 0.35 + depth × 0.25)
  + locationIntel    × 0.25   (demand, connectivity, absorption, YoY reliability)
  + riskAdjustment   × 0.20   (non-linear: 0–30 → -0.3×, 30–60 → -0.8×, >60 → -1.2×)
  + methodologyBonus          (±5 based on approach agreement deviation)

Range: 10–98  (never 0–9 or 99–100 — avoids false precision)
```

| Score | Interpretation |
|---|---|
| 90–98 | Very High Confidence |
| 70–89 | Good Confidence |
| 50–69 | Moderate Confidence |
| 30–49 | Low Confidence |
| 10–29 | Very Low Confidence |

---

##  OCR Pipeline

COVAL uses a two-tier document extraction pipeline. When a user uploads property documents (registered deed, registration certificate, encumbrance certificate, etc.), fields are extracted automatically and used to auto-fill the valuation form with colour-coded confidence scores.

```
User uploads document(s)  (PDF / JPG / PNG)
          ↓
  GEMINI_API_KEY present?
      ├── YES → Gemini 2.5 Flash  (AI-powered field extraction)
      └── NO  → Tesseract.js + regex  (rule-based fallback)
          ↓
  Fields extracted with per-field confidence scores
          ↓
  Frontend auto-fills form with colour-coded confidence indicators
```

### Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ocr/extract` | Single document → extract fields |
| `POST` | `/api/ocr/extract-multi` | Multiple documents → merged extraction |

### Fields Extracted

`area` · `declaredValue` · `yearOfConstruction` · `ownershipType` · `titleClarity` · `floorNumber` · `totalFloors` · `locality` · `city` · `pincode` · `constructionQuality` · `propertyType`

### Setup

Add your Gemini API key to `server/.env`:

```env
GEMINI_API_KEY=your_gemini_api_key_here
```

> **Note:** The `@google/generative-ai` SDK is required and included in `server/package.json`. If `GEMINI_API_KEY` is absent or the Gemini call fails, the pipeline automatically falls back to Tesseract.js + regex — no manual intervention needed.

---

## 📐 Valuation Methodology Summary

All formulas are grounded in Indian regulatory standards and international valuation norms:

| Standard | Application in COVAL |
|---|---|
| **RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16** | LTV caps, collateral valuation norms |
| **SARFAESI Act 2002** | Distress/auction realization rates |
| **NHB Residual Life Method** | Structural depreciation (30% RBI floor enforced) |
| **RICS Red Book PS2.3 (2022)** | 3-approach reconciliation, comparable evidence |
| **IVS 105** | Comparable selection, time adjustment methodology |
| **CERSAI Annual Report 2022-23** | Encumbrance base rates by property type |
| **CPWD Schedule of Rates 2023** | Replacement cost benchmarks (₹/sqft) |
| **National Building Code 2016, Part 6** | Structural useful life — RCC: 60yr · Load-bearing: 40yr · Steel: 50yr |
| **PMLA 2002 / RERA 2016 / FEMA** | Fraud, compliance, and ownership risk checks |

---

##  Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| **Frontend Framework** | React 18 + TypeScript | Component-based UI with type safety |
| **Build Tool** | Vite 4.x | Fast dev server, optimized production builds |
| **Styling** | Tailwind CSS v4 | Responsive, utility-first design |
| **Animations** | Framer Motion | Engine loader, gauge animations |
| **UI Components** | ShadCN / Radix UI | Accessible component primitives |
| **Data Fetching** | TanStack Query | Server state management, caching |
| **Charts** | Recharts | Confidence distribution, risk gauge |
| **HTTP Client** | Axios | API communication |
| **Backend Runtime** | Node.js 18.x | JavaScript backend |
| **Backend Framework** | Express.js 4.x | RESTful API routing |
| **Database** | MongoDB 6.x + Mongoose | Document storage, flexible schema |
| **Scheduler** | node-cron | Batch ingestion, nightly runs |
| **OCR — Primary** | Gemini 2.5 Flash (`@google/generative-ai`) | AI-powered document field extraction |
| **OCR — Fallback** | Tesseract.js + regex | Rule-based extraction when Gemini unavailable |
| **OCR Microservice** | Python 3.11 + FastAPI | Separate Python OCR service (optional) |

---

##  Project Structure

```
coval/
├── client/                          # React frontend
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.tsx
│   │   │   └── ui/
│   │   │       ├── Badge.tsx
│   │   │       ├── Card.tsx
│   │   │       ├── CircularGauge.tsx
│   │   │       ├── EngineLoader.tsx
│   │   │       └── GaugeChart.tsx
│   │   ├── context/
│   │   │   └── ValuationContext.tsx
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx      # Portfolio view, risk distribution
│   │   │   ├── FullReport.tsx          # Printable valuation report
│   │   │   ├── PropertyForm.tsx        # Multi-step property input + OCR upload
│   │   │   └── ValuationDashboard.tsx
│   │   ├── types/index.ts
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   └── format.ts
│   │   └── App.tsx
│   ├── index.html
│   └── vite.config.ts
│
└── server/                          # Node.js backend
    └── src/
        ├── controllers/
        │   ├── marketDataController.js
        │   └── valuationController.js
        ├── data/
        │   └── seed.js              # Seeds 10 cities, 35 localities, 175 comps
        ├── engines/
        │   ├── liquidityEngine.js   # Engine 1: Resale speed & market certainty
        │   ├── valuationEngine.js   # Engine 2: 3-approach hybrid market value
        │   ├── distressEngine.js    # Engine 3: SARFAESI forced-sale value
        │   ├── riskEngine.js        # Engine 4: Fraud detection & compliance
        │   └── confidenceEngine.js  # Engine 5: Uncertainty quantification
        ├── ocr/
        │   ├── geminiOCR.js         # Primary: Gemini 2.5 Flash extraction
        │   └── tesseractOCR.js      # Fallback: Tesseract.js + regex
        ├── models/
        │   ├── ComparableTransaction.js
        │   ├── MarketData.js
        │   ├── Property.js
        │   └── Valuation.js
        ├── routes/
        │   ├── health.js
        │   ├── marketData.js
        │   ├── ocr.js               # /extract and /extract-multi routes
        │   └── valuations.js
        └── index.js
```

---

##  Getting Started

### Prerequisites

- Node.js v18+
- MongoDB running locally on port `27017` (or a MongoDB Atlas URI)
- Python 3.11+ (for the optional Python OCR microservice)
- A Gemini API key (free tier at [aistudio.google.com](https://aistudio.google.com)) — for AI-powered OCR

### 1. Clone the Repository

```bash
git clone https://github.com/vaishnav-reddy/COVAL.git
cd COVAL
```

### 2. Setup the Backend

```bash
cd server
npm install
```

Create a `.env` file in `server/`:

```env
MONGODB_URI=mongodb://localhost:27017/coval
PORT=5000
NODE_ENV=development
VITE_MAPBOX_ACCESS_TOKEN=your_mapbox_access_token_here
GEMINI_API_KEY=your_gemini_api_key_here
```

> If `GEMINI_API_KEY` is not set, the OCR pipeline automatically falls back to Tesseract.js + regex. All 5 valuation engines work regardless.

### 3. Seed the Database

```bash
npm run seed
```

This populates:
- 10 Indian cities · 35 localities · 175 comparable property transactions
- Market absorption rates, demand indices, connectivity scores, circle rates
- Clears all previous valuation history on re-run

### 4. Start the Backend

```bash
npm run dev
# Server runs at http://localhost:5000
```

### 5. Setup and Start the Frontend

```bash
cd ../client
npm install
npm run dev
# App runs at http://localhost:3000
```

### 6. (Optional) Start the Python OCR Microservice

```bash
cd server/ocr
pip install -r requirements.txt
uvicorn main:app --port 8001
# Separate OCR service runs at http://localhost:8001
```

---

##  API Reference

### Valuation

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/valuations/create` | Submit property → run all 5 engines |
| `GET` | `/api/valuations/:id` | Fetch valuation by ID |
| `GET` | `/api/valuations/history` | All valuations (filterable by city, type, risk) |
| `POST` | `/api/valuations/:id/report` | Generate PDF report data |

### Market Data

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/market-data/cities` | List all seeded cities |
| `GET` | `/api/market-data/:city` | All localities in a city |
| `GET` | `/api/market-data/:city/:locality` | Locality-level market data & comparables |

### OCR

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/ocr/extract` | Single document upload → AI field extraction |
| `POST` | `/api/ocr/extract-multi` | Multi-document upload → merged field extraction |

### System

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + DB connection status |

### Sample Request — Create Valuation

```bash
curl -X POST http://localhost:5000/api/valuations/create \
  -H "Content-Type: application/json" \
  -d '{
    "propertyType": "residential",
    "city": "Bengaluru",
    "locality": "Indiranagar",
    "area": 1200,
    "yearOfConstruction": 2020,
    "floorNumber": 5,
    "totalFloors": 14,
    "constructionQuality": "premium",
    "amenities": ["Parking", "Lift", "Security", "Gym"],
    "declaredValue": 19200000,
    "purpose": "lap"
  }'
```

### Sample Response

```json
{
  "success": true,
  "data": {
    "valuation": {
      "marketValue": 18500000,
      "valueRange": { "min": 17020000, "max": 19980000 },
      "pricePerSqft": 15416
    },
    "liquidity": {
      "liquidityScore": 74,
      "exitCertainty": "medium",
      "timeToSell": "2–4 months"
    },
    "distress": {
      "distressValue": 15170000,
      "distressMultiplier": 0.82,
      "rbiErosionFlag": false
    },
    "risk": {
      "riskScore": 22,
      "riskLabel": "safe",
      "ltvBreached": false,
      "redFlags": []
    },
    "confidence": {
      "confidenceScore": 83,
      "interpretation": "Good confidence"
    }
  }
}
```

---

##  Screenshots

### Property Input Form

<p align="center">
  <img src="https://github.com/user-attachments/assets/e3c8e32a-fe4d-4aef-8c1f-291ef4621bd3" width="1000"/>
</p>

> Multi-step form with city/locality dropdowns, OCR document upload (Gemini AI-powered), and map boundary confirmation.

---

### Real-Time Valuation Dashboard

<p align="center">
  <img width="3584" height="5780" alt="Valuation Dashboard" src="https://github.com/user-attachments/assets/7c1f5e04-d5a0-4b9e-8bb5-aceaec5da4d2" />
</p>

> Animated value range display, liquidity gauge, distress output, confidence score breakdown, and risk flags — all generated in under 15 seconds.

---

### Portfolio Dashboard (Admin)

<p align="center">
  <img width="1791" height="1006" alt="Portfolio Dashboard" src="https://github.com/user-attachments/assets/fb1762df-6e52-48aa-be19-aad422fc0221" />
</p>

> Full portfolio view — total AUM (₹79.8Cr), confidence trends, risk distribution, and duplicate incident map.

---

##  Regulatory Compliance

COVAL is designed from the ground up to align with Indian lending regulations:

| Regulation | Enforcement in COVAL |
|---|---|
| **RBI LTV Caps** | LAP: 65% · Mortgage: 75% · Working Capital: 60% — auto-checked at submission |
| **RBI Significant Erosion** (DNBS.CC.PD.No.356) | Flag triggered when distress value < 50% of market value |
| **CERSAI Act 2002** | Bayesian encumbrance prior by property type + age (base: 12% residential, 35% commercial) |
| **SARFAESI Act 2002** | Auction realization rates used as distress multiplier floor/ceiling |
| **PMLA 2002** | Underdisclosure flag when declared value is 25–50% below market |
| **RERA 2016** | Project registration compliance check in risk flags |
| **NBC 2016** | Useful life constants: RCC 60yr · Load-bearing 40yr · Steel 50yr |

---

##  Competitive Landscape

<p align="center">
  <img width="558" height="460" alt="Competitive Landscape" src="https://github.com/user-attachments/assets/6b91977b-69a3-4954-b088-25a481910c38" />
</p>

| Feature | **COVAL** | Manual Valuator | MagicBricks | 99acres | Bank Internal |
|---|:---:|:---:|:---:|:---:|:---:|
| Property Valuation (Range) | ✅ | ✅ | ❌ | ❌ | ✅ |
| Liquidity / Resale Score | ✅ | ❌ | ❌ | ❌ | ❌ |
| Distress Value Calculation | ✅ | ✅ | ❌ | ❌ | ✅ |
| Explainable Output | ✅ | ❌ | ❌ | ❌ | ❌ |
| Risk & Fraud Detection | ✅ | ⚠️ | ❌ | ❌ | ⚠️ |
| Time-to-Sell Prediction | ✅ | ❌ | ❌ | ❌ | ❌ |
| Digital & Instant | ✅ | ❌ | ✅ | ✅ | ❌ |
| Consistency | ✅ | ❌ | ⚠️ | ⚠️ | ⚠️ |
| **Human Dependency** | **Low** | High | Low | Low | Medium |

---

##  Impact & Market

| Metric | Value |
|---|---|
|  **LAP Market Size (2024)** | $756 Billion — India's largest collateral-backed lending segment |
|  **Projected Market (2030)** | $1.6 Trillion — driven by MSME credit demand and real estate expansion |
|  **India Real Estate (2025)** | ₹26.4 Lakh Crore market size |
|  **Approval Time Reduction** | Days → Seconds (15-second valuation pipeline) |
|  **Cost Reduction** | 30–40% reduction in credit processing costs *(McKinsey)* |

> *"This won't generate revenue — but saves something worth more than that: TIME + MONEY."*

---

##  Feasibility & Challenges

### Challenges

| Risk | Description |
|---|---|
| **Data Reliability** | Limited access to real transaction data; dependence on simulated/public datasets |
| **Trust & Adoption** | Banks rely on experienced valuators — resistance to fully automated systems |
| **Regulatory Compliance** | Explainability required for audit and RBI approval processes |
| **Market Variability** | Real estate prices vary drastically by micro-location; dynamic demand-supply |

### Mitigation Strategies

1. **Hybrid Valuation Framework** — Rule-based logic + data signals; avoids black-box AI predictions; scalable across cities
2. **Explainability & Transparency Layer** — Clear value drivers and risk factors for every output; audit-friendly
3. **Confidence-Based Decision System** — Ranges + confidence scores instead of fixed point values
4. **Human-in-the-Loop Integration** — AI as first-level filter; final validation retained by bank/valuator

### Feasibility

-  80%+ financial institutions already use rule-based + hybrid valuation systems
-  Works without proprietary datasets using synthetic + public benchmarks (CPWD, NHB, CERSAI)
-  Aligns with existing NBFC underwriting workflows out of the box
-  Scalable across multiple cities and property types without physical site visits

---

##  Seeded Cities & Test Inputs

### Seeded Data (10 Cities · 35 Localities · 175 Comparables)

| City | Localities |
|---|---|
| Mumbai | Bandra West, Andheri East, Powai, Thane West |
| Pune | Koregaon Park, Wakad, Hinjewadi, Kothrud |
| Delhi | Dwarka, Vasant Kunj, Rohini, Saket |
| Bengaluru | Whitefield, Indiranagar, Sarjapur Road, Koramangala |
| Hyderabad | Gachibowli, Banjara Hills, Kondapur, Madhapur |
| Chennai | Anna Nagar, OMR, Velachery |
| Ahmedabad | Prahlad Nagar, SG Highway, Satellite |
| Kolkata | Salt Lake, New Town, Alipore |
| Jaipur | Malviya Nagar, Vaishali Nagar, C-Scheme |
| Surat | Vesu, Adajan, Althan |

### Test Cases

** Safe Property**
```
City: Bengaluru | Locality: Indiranagar | Type: Residential
Area: 1200 sqft | Year: 2020 | Floor: 5/14 | Quality: Premium
Amenities: Parking, Lift, Security, Gym, Power Backup, CCTV
Declared Value: ₹1,92,00,000 | Purpose: LAP
Expected: riskLabel = "safe", confidenceScore > 80
```

** Caution Property**
```
City: Kolkata | Locality: Salt Lake | Type: Residential
Area: 1800 sqft | Year: 2005 | Floor: 8/10 | Quality: Good
Amenities: Parking, Lift
Declared Value: ₹1,35,00,000 | Purpose: Mortgage
Expected: riskLabel = "caution", moderate liquidity score
```

** High Risk Property**
```
City: Jaipur | Locality: Vaishali Nagar | Type: Commercial
Area: 800 sqft | Year: 1992 | Floor: 0/2 | Quality: Standard
Amenities: None
Declared Value: ₹2,50,00,000 | Purpose: LAP
Expected: riskLabel = "high_risk", structural risk flag, LTV breach
```

---

##  References

1. [KPMG — NBFCs in India: Growth and Stability](https://assets.kpmg.com/content/dam/kpmg/in/pdf/2024/02/nbfcs-in-india-growth-and-stability.pdf)
2. [Precisa — Role of Collateral Valuation in Digital Lending](https://precisa.in/blog/role-collateral-valuation-changing-era-digital-lending/)
3. [ResearchAndMarkets — India Home Equity Loan Market](https://www.researchandmarkets.com/reports/india-home-equity-loan-market)
4. [ShivaFinz — Home Loan Approval Time in India](https://shivafinz.com/home-loan-approval-time-in-india/)
5. [NoBroker — Home Loan Approval Time](https://www.nobroker.in/blog/home-loan-approval-time/)
6. [Protium — Reasons MSME Loan Applications Get Rejected](https://protium.co.in/9-reasons-why-28-of-msme-loan-applications-get-rejected/)
7. [FIDC — RBI NBFCs Report on Trends 2023-24](https://www.fidcindia.org.in/wp-content/uploads/2024/12/RBI-NBFCs-REPORT-ON-TRENDS-2023-24-26-12-24.pdf)
8. [Economic Times — RBI Restores Default Loss Guarantees for NBFCs](https://economictimes.indiatimes.com/)
9. [Hindustan Times — More Property Loans Turn Bad as NBFCs Up Lending](https://www.hindustantimes.com/)
10. [MUDS — How NBFCs Impact Real Estate Sector Growth](https://muds.co.in/)

### Standards & Regulatory References

11. RBI Master Circular DBR.No.BP.BC.2/21.04.048/2015-16 — Prudential Norms on Income Recognition, Asset Classification and Provisioning
12. RBI Circular DNBS.CC.PD.No.356/03.10.01/2013-14 — Significant Erosion (50% Collateral Loss Threshold)
13. CERSAI Annual Report 2022-23 — Encumbrance Base Rates by Property Type
14. RICS Valuation — Global Standards 2022 (Red Book), PS2 — Valuation Approaches & Reconciliation
15. IVS 105 — Valuation Approaches and Methods (Comparable Evidence, Paragraphs 50–80)
16. National Building Code 2016, Part 6, Section 4 — Structural Useful Life
17. CPWD Schedule of Rates 2023 — Construction Cost Benchmarks
18. NHB Housing Finance Report 2022 — Market Absorption & Depreciation Methodology
19. SARFAESI Act 2002 — Secured Asset Enforcement & Auction Methodology
20. IBC (Insolvency & Bankruptcy Code) 2016 — Liquidation Value Definition

---

<div align="center">

**COVAL** · TenzorX Hackathon 2026 · Built for India's NBFC ecosystem

[ Star this repo](https://github.com/vaishnav-reddy/COVAL) · [ Report Bug](https://github.com/vaishnav-reddy/COVAL/issues) · [ Request Feature](https://github.com/vaishnav-reddy/COVAL/issues)

</div>
