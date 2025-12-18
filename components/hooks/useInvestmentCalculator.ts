// hooks/useInvestmentCalculator.ts
import { useMemo } from 'react';
import { InvestorProfile, InvestmentProjection, SimulationConfig } from '@/types/investment';

const SAVINGS_RATE = 6.17; // Taxa da poupança
const INFLATION_RATE = 4.5; // IPCA

interface UseInvestmentCalculatorProps {
  config: SimulationConfig;
  marketRates: {
    cdi: number;
    selic: number;
    ipca: number;
  };
}

export function useInvestmentCalculator({ config, marketRates }: UseInvestmentCalculatorProps) {
  
  const profileRateMultiplier = useMemo((): number => {
    const multipliers: Record<InvestorProfile, number> = {
      CONSERVATIVE: 0.95, // 95% do CDI
      MODERATE: 1.15,    // 115% do CDI
      AGGRESSIVE: 1.35,  // 135% do CDI
    };
    return multipliers[config.profile];
  }, [config.profile]);

  const annualRate = useMemo(() => {
    return marketRates.cdi * profileRateMultiplier;
  }, [marketRates.cdi, profileRateMultiplier]);

  const projections = useMemo((): InvestmentProjection[] => {
    const monthlyRate = annualRate / 100 / 12;
    const savingsMonthlyRate = SAVINGS_RATE / 100 / 12;
    const inflationMonthlyRate = config.includeInflation ? INFLATION_RATE / 100 / 12 : 0;
    
    const projections: InvestmentProjection[] = [];
    let currentValue = config.initialAmount;
    let savingsValue = config.initialAmount;
    
    for (let year = 0; year <= config.years; year++) {
      for (let month = 0; month < 12; month++) {
        currentValue = (currentValue + config.monthlyContribution) * (1 + monthlyRate);
        savingsValue = (savingsValue + config.monthlyContribution) * (1 + savingsMonthlyRate);
        
        if (inflationMonthlyRate > 0) {
          const inflationFactor = Math.pow(1 + inflationMonthlyRate, year * 12 + month);
          currentValue /= inflationFactor;
          savingsValue /= inflationFactor;
        }
      }
      
      const totalInvested = config.initialAmount + (config.monthlyContribution * 12 * year);
      const netProfit = currentValue - totalInvested;
      
      projections.push({
        year,
        totalValue: Math.round(currentValue),
        totalInvested: Math.round(totalInvested),
        netProfit: Math.round(netProfit),
        inflationAdjustedValue: Math.round(currentValue),
        savingsValue: Math.round(savingsValue),
      });
    }
    
    return projections;
  }, [config, annualRate]);

  const requiredMonthlyForGoal = useMemo(() => {
    if (!config.targetAmount) return 0;
    
    const monthlyRate = annualRate / 100 / 12;
    const months = config.years * 12;
    
    if (monthlyRate === 0) {
      return (config.targetAmount - config.initialAmount) / months;
    }
    
    const futureValueOfInitial = config.initialAmount * Math.pow(1 + monthlyRate, months);
    const neededFromContributions = config.targetAmount - futureValueOfInitial;
    
    const payment = neededFromContributions * monthlyRate / 
      (Math.pow(1 + monthlyRate, months) - 1);
    
    return Math.max(0, Math.round(payment));
  }, [config.targetAmount, config.initialAmount, config.years, annualRate]);

  const performanceMetrics = useMemo(() => {
    const finalProjection = projections[projections.length - 1];
    const savingsProjection = projections[projections.length - 1]?.savingsValue || 0;
    
    return {
      finalAmount: finalProjection?.totalValue || 0,
      totalInvested: finalProjection?.totalInvested || 0,
      netProfit: finalProjection?.netProfit || 0,
      vsSavings: finalProjection?.totalValue - savingsProjection,
      realReturn: annualRate - marketRates.ipca,
      requiredMonthly: requiredMonthlyForGoal,
      cdiEquivalence: (annualRate / marketRates.cdi) * 100,
    };
  }, [projections, annualRate, marketRates.ipca, marketRates.cdi, requiredMonthlyForGoal]);

  return {
    projections,
    performanceMetrics,
    annualRate,
  };
}