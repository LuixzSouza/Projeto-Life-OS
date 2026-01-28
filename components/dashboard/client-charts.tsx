"use client";

import dynamic from "next/dynamic";

// Este arquivo é um Client Component, então ele aceita 'ssr: false'

export const FinanceChart = dynamic(
  () => import("@/components/dashboard/finance-chart").then((mod) => mod.FinanceChart),
  { 
    ssr: false,
    loading: () => <div className="h-[250px] w-full bg-muted/10 animate-pulse rounded-xl" /> 
  }
);

export const StudyChart = dynamic(
  () => import("@/components/dashboard/study-chart").then((mod) => mod.StudyChart),
  { 
    ssr: false, 
    loading: () => <div className="h-[220px] w-full bg-muted/10 animate-pulse rounded-xl" />
  }
);