# COVAL — AI-Powered Collateral Valuation Engine

Production-ready collateral valuation for NBFCs. Built for property-backed lending workflows.

## Quick Start

### 1. Start MongoDB
Make sure MongoDB is running on `localhost:27017`.

### 2. Seed the Database
```bash
cd server
npm run seed
```

### 3. Start Backend
```bash
cd server
npm run dev
# Runs on http://localhost:5000
```

### 4. Start Frontend
```bash
cd client
npm run dev
# Runs on http://localhost:3000
```

## Architecture

```
coval/
├── client/          # React 18 + TypeScript + Tailwind v4
│   └── src/
│       ├── pages/   # PropertyForm, ValuationDashboard, FullReport, AdminDashboard
│       ├── components/ui/
│       ├── context/ # ValuationContext
│       └── utils/   # API calls, formatting
└── server/          # Node.js + Express + MongoDB
    └── src/
        ├── engines/ # valuation, distress, liquidity, risk, confidence
        ├── models/  # Property, Valuation, MarketData, ComparableTransaction
        ├── routes/
        └── data/    # seed.js — 10 cities, 35 localities
```

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/valuations/create | Run full valuation |
| GET | /api/valuations/:id | Get valuation by ID |
| GET | /api/valuations/history | All valuations with filters |
| GET | /api/market-data/cities | List all seeded cities |
| GET | /api/market-data/:city | Localities in city |
| POST | /api/valuations/:id/report | Generate report data |
| GET | /api/health | Health check |
