# COVAL — AI-Powered Collateral Valuation Engine

> Production-ready collateral valuation platform for NBFCs (Non-Banking Financial Companies) in India. Built for property-backed lending workflows — LAP, Mortgage, and Working Capital.

COVAL simulates how a real property valuator thinks, but makes it AI-powered, instant, consistent, and scalable. Instead of a fixed number, it outputs a **confidence-backed value range** with full lending intelligence.

---

## Screenshots

| Property Input | Valuation Dashboard | Full Report |
|---|---|---|
| Multi-step form with city/locality dropdowns | Animated value range, gauges, risk flags | Printable report with RBI compliance notes |

---

## Features

- **Value Range Output** — Never a single number. Always a range (e.g. ₹80L – ₹95L) with a base market value
- **5 AI Engines** running in sequence — Valuation → Liquidity → Distress → Risk/Fraud → Confidence
- **Fraud Detection** — Flags valuation deviations >25% from locality median, over-circle-rate anomalies, CERSAI risk
- **RBI Compliance** — Automatic erosion flag when distress value falls below 50% of assessed value
- **Audit Trail** — Timestamped engine-by-engine breakdown with processing times
- **Admin Dashboard** — Full history with filters by city, property type, and risk level
- **Printable Report** — Full PDF-ready report with methodology, comparables, and lender recommendations

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18, TypeScript, Tailwind CSS v4, Framer Motion, TanStack Query |
| Backend | Node.js, Express.js |
| Database | MongoDB with Mongoose |
| Routing | React Router v7 |
| Icons | Lucide React |
| HTTP Client | Axios |

---

## Project Structure

```
coval/
├── client/                        # React frontend
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
│   │   ├── hooks/
│   │   ├── pages/
│   │   │   ├── AdminDashboard.tsx
│   │   │   ├── FullReport.tsx
│   │   │   ├── PropertyForm.tsx
│   │   │   └── ValuationDashboard.tsx
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── utils/
│   │   │   ├── api.ts
│   │   │   └── format.ts
│   │   ├── App.tsx
│   │   ├── main.tsx
│   │   └── index.css
│   ├── index.html
│   ├── vite.config.ts
│   └── tsconfig.json
│
└── server/                        # Node.js backend
    ├── src/
    │   ├── controllers/
    │   │   ├── marketDataController.js
    │   │   └── valuationController.js
    │   ├── data/
    │   │   └── seed.js            # Seeds 10 cities, 35 localities, 175 comps
    │   ├── engines/
    │   │   ├── confidenceEngine.js
    │   │   ├── distressEngine.js
    │   │   ├── liquidityEngine.js
    │   │   ├── riskEngine.js
    │   │   └── valuationEngine.js
    │   ├── middleware/
    │   │   └── errorHandler.js
    │   ├── models/
    │   │   ├── ComparableTransaction.js
    │   │   ├── MarketData.js
    │   │   ├── Property.js
    │   │   └── Valuation.js
    │   ├── routes/
    │   │   ├── health.js
    │   │   ├── marketData.js
    │   │   └── valuations.js
    │   └── index.js
    ├── .env
    └── package.json
```

---

## Getting Started

### Prerequisites

- Node.js v18+
- MongoDB running locally on port `27017`

### 1. Clone the repo

```bash
git clone https://github.com/vaishnav-reddy/COVAL-TenzorX.git
cd coval
```

### 2. Setup the backend

```bash
cd server
npm install
```

Create a `.env` file in `server/` (already included, update if needed):

```env
MONGODB_URI=mongodb://localhost:27017/coval
PORT=5000
NODE_ENV=development
GOOGLE_MAPS_API_KEY=mock
```

### 3. Seed the database

```bash
npm run seed
```

This populates:
- 35 localities across 10 Indian cities
- 175 comparable property transactions
- Clears all previous valuation history

### 4. Start the backend

```bash
npm run dev
# Server runs on http://localhost:5000
```

### 5. Setup and start the frontend

```bash
cd ../client
npm install
npm run dev
# App runs on http://localhost:3000
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/health` | Health check + DB status |
| `POST` | `/api/valuations/create` | Submit property, run all 5 engines |
| `GET` | `/api/valuations/:id` | Get valuation by ID |
| `GET` | `/api/valuations/history` | All valuations (filterable) |
| `POST` | `/api/valuations/:id/report` | Generate report data |
| `GET` | `/api/market-data/cities` | List all seeded cities |
| `GET` | `/api/market-data/:city` | All localities in a city |
| `GET` | `/api/market-data/:city/:locality` | Locality-level market data |

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

---

## Valuation Logic

```
marketValue = (pricePerSqft × area) × locationMultiplier × ageDepreciation × qualityMultiplier

locationMultiplier  = 0.85 – 1.20  (based on demand index 1–10)
ageDepreciation     = 1 - (age × 0.01), min 0.60
qualityMultiplier   = Standard: 0.95 | Good: 1.00 | Premium: 1.10

valueRange          = [marketValue × 0.92, marketValue × 1.08]
distressValue       = marketValue × 0.72 (residential) | 0.68 (commercial) | 0.60 (land)

liquidityScore      = weighted sum of demand, connectivity, type, age, amenities, floor, size
confidenceScore     = (dataCompleteness × 0.30) + (compAvailability × 0.25)
                    + (locationIntelligence × 0.25) + (100 - riskScore) × 0.20
```

---

## Seeded Cities

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

---

## Test Inputs

### Safe Property
- City: Bengaluru | Locality: Indiranagar | Type: Residential
- Area: 1200 sqft | Year: 2020 | Floor: 5/14 | Quality: Premium
- Amenities: Parking, Lift, Security, Gym, Power Backup, CCTV
- Declared Value: `19200000`

### High Risk Property
- City: Jaipur | Locality: Vaishali Nagar | Type: Commercial
- Area: 800 sqft | Year: 1992 | Floor: 0/2 | Quality: Standard
- Amenities: None
- Declared Value: `25000000`

### Caution Property
- City: Kolkata | Locality: Salt Lake | Type: Residential
- Area: 1800 sqft | Year: 2005 | Floor: 8/10 | Quality: Good
- Amenities: Parking, Lift
- Declared Value: `13500000`

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MONGODB_URI` | `mongodb://localhost:27017/coval` | MongoDB connection string |
| `PORT` | `5000` | Backend server port |
| `NODE_ENV` | `development` | Environment |
| `GOOGLE_MAPS_API_KEY` | `mock` | Maps API (mocked, not required) |

---

## License

MIT
