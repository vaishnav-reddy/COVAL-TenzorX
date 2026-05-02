export type PropertyType = 'residential' | 'commercial' | 'industrial' | 'land';
export type ConstructionQuality = 'standard' | 'good' | 'premium';
export type Purpose = 'lap' | 'mortgage' | 'working_capital';
export type RiskLabel = 'safe' | 'caution' | 'high_risk';
export type ExitCertainty = 'high' | 'medium' | 'low';
export type ResaleRisk = 'low' | 'medium' | 'high';
export type FlagSeverity = 'low' | 'medium' | 'critical';
export type OwnershipType = 'freehold' | 'leasehold';
export type TitleClarity = 'clear' | 'disputed' | 'litigation';
export type OccupancyStatus = 'self_occupied' | 'rented' | 'vacant';
export type AreaType = 'carpet' | 'builtup' | 'superbuiltup';
export type MarketScenario = 'normal' | 'growth' | 'crash';

export interface PropertyInput {
  propertyType: PropertyType;
  propertySubType?: string;
  city: string;
  locality: string;
  pincode?: string;
  area: number;
  areaType?: AreaType;
  yearOfConstruction?: number;
  floorNumber?: number;
  totalFloors?: number;
  amenities: string[];
  constructionQuality: ConstructionQuality;
  declaredValue: number;
  purpose: Purpose;
  ownershipType?: OwnershipType;
  titleClarity?: TitleClarity;
  occupancyStatus?: OccupancyStatus;
  monthlyRent?: number;
  marketScenario?: MarketScenario;
}

export interface RedFlag {
  code: string;
  message: string;
  severity: FlagSeverity;
}

export interface ValueDriver {
  label: string;
  value: number;
  unit: string;
  weight: number;
}

export interface ConfidenceBreakdownItem {
  score: number;
  weight: number;
  label: string;
}

export interface ValuationResult {
  _id: string;
  valuationId: string;
  propertyId: string;
  propertySnapshot: PropertyInput;
  marketValue: number;
  valueRangeLow: number;
  valueRangeHigh: number;
  pricePerSqft: number;
  valueDrivers: Record<string, ValueDriver>;
  distressValue: number;
  distressMultiplier: number;
  rbiErosionFlag: boolean;
  liquidationTimeline: string;
  resaleRisk: ResaleRisk;
  liquidityScore: number;
  timeToSell: string;
  exitCertainty: ExitCertainty;
  riskScore: number;
  redFlags: RedFlag[];
  overallRiskLabel: RiskLabel;
  confidenceScore: number;
  confidenceBreakdown: Record<string, ConfidenceBreakdownItem>;
  comparables: Comparable[];
  auditTrail: AuditEntry[];
  processingTime: number;
  createdAt: string;
  marketData: MarketDataSummary;
  overCircleRatePercent: number;
  overPricedFlag: boolean;
  propertyAge: number | null;
  declaredVsMarketDeviation: number;
  liquidityBreakdown: Record<string, number>;
}

export interface Comparable {
  _id?: string;
  city: string;
  locality: string;
  propertyType: string;
  area: number;
  price: number;
  pricePerSqft: number;
  floor: number;
  age: number;
  quality: string;
  transactionDate: string;
  description: string;
}

export interface AuditEntry {
  engine: string;
  timestamp: string;
  duration: number;
  output: Record<string, unknown>;
}

export interface MarketDataSummary {
  city: string;
  locality: string;
  avgPricePerSqft: number;
  circleRate: number;
  demandIndex: number;
  yoyAppreciation: number;
}
