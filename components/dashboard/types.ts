// Tipos compartilhados das seções do Dashboard.
// Mantidos desacoplados do Prisma (sem Decimal) para que os componentes
// presentacionais recebam dados já normalizados pela página.

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
  imageUrl: string | null;
  proximity: string | null;
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
