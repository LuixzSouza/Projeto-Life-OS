// app/(dashboard)/loading.tsx — fallback genérico para rotas sem loading próprio
import { PageSkeleton } from "@/components/ui/page-skeleton";

export default function DashboardLoading() {
  return <PageSkeleton variant="dashboard" />;
}
