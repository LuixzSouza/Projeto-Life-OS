"use server";

// Server actions da Linha do Tempo: paginação por cursor de data ("Carregar
// mais"). A leitura inicial e os insights ficam no page.tsx (RSC).

import { getActivityBefore, type ClientActivity } from "@/lib/activity";

export async function loadOlderActivity(beforeISO: string, limit = 120): Promise<ClientActivity[]> {
  return getActivityBefore(beforeISO, limit);
}
