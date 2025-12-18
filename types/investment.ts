// types/investment.ts
export type InvestorProfile = 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
export type MarketAssetType = 'INDEX' | 'CURRENCY' | 'STOCK' | 'FII' | 'CRYPTO' | 'ETF';
export type InvestmentType = 'FIXED_INCOME' | 'EQUITY' | 'HYBRID' | 'CRYPTO' | 'FII';
export type RiskLevel = 1 | 2 | 3 | 4 | 5;

export interface MarketAsset {
  ticker: string;
  name: string;
  value: number;
  variation: number;
  type: MarketAssetType;
  displayValue: string;
  dayHigh?: number;
  dayLow?: number;
  volume?: string;
  marketCap?: string;
  logoUrl?: string;
}

export interface InvestmentProduct {
  id: string;
  name: string;
  description: string;
  type: InvestmentType;
  riskLevel: RiskLevel;
  baseRate: number; // CDI ou Selic
  spread: number; // Spread sobre base rate
  isTaxFree: boolean;
  hasFGC: boolean;
  minimumInvestment: number;
  liquidity: 'IMMEDIATE' | 'SHORT_TERM' | 'MEDIUM_TERM' | 'LONG_TERM';
  rating?: 'AAA' | 'AA' | 'A' | 'BBB' | 'BB';
  tags: string[];
}

export interface InvestmentProjection {
  year: number;
  totalValue: number;
  totalInvested: number;
  netProfit: number;
  inflationAdjustedValue: number;
  savingsValue: number;
}

export interface SimulationConfig {
  initialAmount: number;
  monthlyContribution: number;
  years: number;
  profile: InvestorProfile;
  targetAmount?: number;
  includeInflation: boolean;
  compareWithSavings: boolean;
}