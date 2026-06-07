// src/components/dashboard/types.ts

// ==========================================
// 1. TIPOS GERAIS E STATUS
// ==========================================
export type TransactionType = 'INCOME' | 'EXPENSE';
export type InvoiceStatus = 'PENDING' | 'OVERDUE' | 'PAID' | 'CANCELED';
export type TrendDirection = 'up' | 'down' | 'flat';

// ==========================================
// 2. TIPOS DE ENTRADA (PRISMA / RAW DATA)
// Representam o formato bruto retornado pelo banco de dados
// ==========================================
export interface PrismaFriend {
  id: string;
  name: string;
  birthday: Date | string | null;
  imageUrl: string | null;
  proximity?: string | null;
}

// Interface de suporte para tratar o Decimal do Prisma sem usar "any"
export interface PrismaDecimal {
  toNumber: () => number;
}

export interface PrismaInvoice {
  id: string;
  title: string;
  value: number | PrismaDecimal;
  dueDate: Date;
  status: string;
  billing?: {
    title: string;
    client?: {
      name: string;
    } | null;
  } | null;
}

export interface PrismaEvent {
  id: string;
  title: string;
  startTime: Date;
  endTime: Date | null;
}

export interface StudyAggregationItem {
  subjectId: string;
  _sum: {
    durationMinutes: number | null;
  };
  _count: number;
}

export interface StudySubjectItem {
  id: string;
  title: string;
}

// ==========================================
// 3. TIPOS DE APRESENTAÇÃO (UI / DASHBOARD)
// Dados já formatados e seguros para os componentes React
// ==========================================
export interface BusinessStats {
  totalReceivable: number;
  totalOverdue: number;
}

export interface DashboardInvoice {
  id: string;
  title: string;
  value: number;
  dueDate: Date;
  status: string;
  clientName: string;
  billingTitle: string;
}

export interface DashboardProject {
  id: string;
  title: string;
  description: string | null;
}

export interface DashboardBirthday {
  id: string;
  name: string;
  birthday: string; // ISO ou data formatada para evitar problemas de timezone
  imageUrl: string | null;
  proximity?: string | null;
  daysUntil: number;
  ageTurning: number;
}

export interface DashboardMedia {
  id: string;
  title: string;
  type: string;
  coverUrl: string | null;
}

export interface DashboardTransaction {
  id: string;
  type: string;
  description: string;
  amount: number;
  date: Date;
  account: { name: string };
}

export interface DashboardLink {
  id: string;
  url: string;
  title: string;
}

export interface DashboardEvent {
  title: string;
  startTime: Date;
}

export interface DashboardEventResult {
  title: string;
  time: string;
  relative: string;
  isEmpty: boolean;
}

export interface DashboardStudyChartItem {
  name: string;
  value: number;
  [key: string]: string | number;
}

export interface DashboardStudyResult {
  studyData: DashboardStudyChartItem[];
  totalStudyMinutes: number;
  totalStudyHours: number;
}

export interface ProductivityTrendResult {
  direction: TrendDirection;
  text: string;
}