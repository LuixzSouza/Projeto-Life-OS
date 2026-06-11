import { NextResponse } from "next/server";
import { getCurrentUserId } from "@/lib/auth";
import { buildFullBackup, BACKUP_MODULES, BackupModule } from "@/lib/full-backup";

// Gera o backup completo (v3): 100% dos models, IDs preservados, formato
// versionado — a "ponte universal" de migração entre bancos. A seleção de
// módulos continua suportada via ?modules=a,b,c (sem o parâmetro = tudo).
export async function GET(request: Request) {
  try {
    const userId = await getCurrentUserId();
    if (!userId) {
      return NextResponse.json({ error: "Não autorizado." }, { status: 401 });
    }

    const modulesParam = new URL(request.url).searchParams.get("modules");
    const validIds = new Set(BACKUP_MODULES.map((m) => m.id));
    const modules = modulesParam
      ? modulesParam
          .split(",")
          .map((s) => s.trim())
          // "notes" era o id antigo do módulo de estudos na Exportação Avançada.
          .map((s) => (s === "notes" ? "studies" : s))
          .filter((s): s is BackupModule => validIds.has(s as BackupModule))
      : null;

    const backup = await buildFullBackup(userId, modules);
    const json = JSON.stringify(backup, null, 2);

    return new NextResponse(json, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="life-os-backup-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Erro ao gerar backup:", error);
    return NextResponse.json({ error: "Falha ao gerar arquivo de backup." }, { status: 500 });
  }
}
