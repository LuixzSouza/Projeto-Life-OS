import { z } from "zod";

// ✅ DEFINIÇÃO MANUAL DO TIPO (Sincronizado com o Frontend)
export type SessionType = "LEITURA" | "VIDEO" | "EXERCICIO" | "REVISAO" | "PROJETO" | "PRATICA";

// --- ENUMS E TIPOS DE SESSÃO ---
export const SESSION_TYPES = z.enum(["LEITURA", "VIDEO", "EXERCICIO", "REVISAO", "PROJETO", "PRATICA"]);

// --- SCHEMAS DE VALIDAÇÃO ---

export const SubjectSchema = z.object({
  title: z.string().min(2, "O título deve ter pelo menos 2 caracteres."),
  category: z.string().optional().or(z.literal("")),
  icon: z.string().optional().or(z.literal("")),
  difficulty: z.coerce.number().int().min(1).max(5).default(3),
  goalMinutes: z.coerce.number().int().positive().default(3600), // Padrão 60h
  parentId: z.string().uuid().optional().or(z.literal("")),
});

export const SessionSchema = z.object({
  subjectId: z.string().uuid("Matéria inválida."),
  durationMinutes: z.coerce.number().int().min(0, "A duração não pode ser negativa."),
  notes: z.string().optional().or(z.literal("")),
  focusLevel: z.coerce.number().int().min(1).max(5).default(3),
  type: SESSION_TYPES.default("LEITURA"),
  tags: z.string().optional().or(z.literal("")),
});
