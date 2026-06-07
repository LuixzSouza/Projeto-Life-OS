// Banco de exercícios por grupo muscular (PT-BR). Ordenado por relevância
// (compostos/pesados primeiro, isoladores depois) — serve como "ordem boa" padrão.
export const EXERCISES_BY_GROUP: Record<string, string[]> = {
  Peito: [
    "Supino Reto", "Supino Reto com Halteres", "Supino Inclinado", "Supino Inclinado com Halteres",
    "Supino Declinado", "Crucifixo", "Crucifixo Inclinado", "Crossover", "Crossover Baixo",
    "Peck Deck (Voador)", "Flexão de Braço", "Flexão Inclinada", "Pullover", "Supino na Máquina",
  ],
  Costas: [
    "Levantamento Terra", "Barra Fixa", "Puxada Frontal", "Puxada Aberta", "Puxada Triângulo",
    "Remada Curvada", "Remada Curvada Pronada", "Remada Baixa", "Remada Unilateral (Serrote)",
    "Remada Cavalinho", "Remada Máquina", "Pulldown", "Pull-over na Polia", "Hiperextensão Lombar",
    "Encolhimento (Trapézio)", "Face Pull",
  ],
  Pernas: [
    "Agachamento Livre", "Agachamento Frontal", "Agachamento Hack", "Leg Press 45°", "Leg Press Horizontal",
    "Afundo (Passada)", "Afundo Búlgaro", "Cadeira Extensora", "Cadeira Flexora", "Mesa Flexora",
    "Stiff", "Levantamento Terra Romeno", "Cadeira Abdutora", "Cadeira Adutora", "Elevação Pélvica",
    "Panturrilha em Pé", "Panturrilha Sentado", "Panturrilha no Leg Press", "Avanço com Halteres", "Agachamento Sumô",
  ],
  Ombros: [
    "Desenvolvimento com Barra", "Desenvolvimento com Halteres", "Desenvolvimento Arnold", "Desenvolvimento Máquina",
    "Elevação Lateral", "Elevação Lateral na Polia", "Elevação Frontal", "Elevação Frontal com Anilha",
    "Crucifixo Inverso", "Crucifixo Inverso na Máquina", "Remada Alta", "Encolhimento", "Face Pull",
  ],
  Biceps: [
    "Rosca Direta", "Rosca Direta com Barra W", "Rosca Alternada", "Rosca Martelo", "Rosca Scott",
    "Rosca Concentrada", "Rosca na Polia", "Rosca Inversa", "Rosca 21", "Rosca no Banco Inclinado",
  ],
  Triceps: [
    "Tríceps Pulley (Barra)", "Tríceps Corda", "Tríceps Testa", "Tríceps Francês", "Tríceps Coice",
    "Tríceps Banco", "Mergulho (Paralelas)", "Supino Fechado", "Tríceps Unilateral na Polia",
  ],
  Abdomen: [
    "Abdominal Supra", "Abdominal Infra", "Prancha", "Prancha Lateral", "Elevação de Pernas",
    "Elevação de Pernas Suspenso", "Abdominal Oblíquo", "Abdominal na Polia", "Russian Twist",
    "Abdominal Bicicleta", "Roda Abdominal", "Mountain Climber",
  ],
  Gluteos: [
    "Elevação Pélvica", "Coice na Polia", "Cadeira Abdutora", "Agachamento Sumô", "Afundo Búlgaro",
    "Stiff", "Levantamento Terra Romeno", "Ponte de Glúteo",
  ],
  Antebraco: [
    "Rosca de Punho", "Rosca de Punho Inversa", "Rosca Inversa", "Farmer's Walk", "Pegada (Gripper)",
  ],
  Cardio: [
    "Esteira", "Bicicleta Ergométrica", "Elíptico", "Escada (Stair)", "Remo (Ergômetro)",
    "Pular Corda", "Corrida", "HIIT", "Caminhada Inclinada", "Burpee",
  ],
};

// Metadados por grupo: rótulo + cor (usada nas capas/ilustrações e gráficos).
export interface MuscleMeta {
  label: string;
  color: string;
}
export const MUSCLE_META: Record<string, MuscleMeta> = {
  Peito: { label: "Peito", color: "#ef4444" },
  Costas: { label: "Costas", color: "#3b82f6" },
  Pernas: { label: "Pernas", color: "#22c55e" },
  Ombros: { label: "Ombros", color: "#f59e0b" },
  Biceps: { label: "Bíceps", color: "#8b5cf6" },
  Triceps: { label: "Tríceps", color: "#ec4899" },
  Abdomen: { label: "Abdômen", color: "#14b8a6" },
  Gluteos: { label: "Glúteos", color: "#f97316" },
  Antebraco: { label: "Antebraço", color: "#a855f7" },
  Cardio: { label: "Cardio", color: "#06b6d4" },
};

// Lista ordenada de grupos (para os seletores).
export const MUSCLE_GROUPS = Object.keys(MUSCLE_META).map((value) => ({ value, label: MUSCLE_META[value].label }));

// Índice reverso (nome do exercício → grupo) para descobrir o grupo de um exercício avulso.
const GROUP_OF: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [group, items] of Object.entries(EXERCISES_BY_GROUP)) {
    for (const name of items) map[name.toLowerCase()] = group;
  }
  return map;
})();

/** Descobre o grupo de um exercício pelo nome (exato ou por palavra-chave). */
export function groupOfExercise(name: string): string | undefined {
  const key = name.trim().toLowerCase();
  if (GROUP_OF[key]) return GROUP_OF[key];
  // Heurística leve por palavra-chave (exercícios digitados à mão).
  const kw: [string, string][] = [
    ["supino", "Peito"], ["crucifixo", "Peito"], ["crossover", "Peito"], ["flexão", "Peito"], ["peck", "Peito"],
    ["puxada", "Costas"], ["remada", "Costas"], ["barra fixa", "Costas"], ["terra", "Costas"], ["pulldown", "Costas"],
    ["agachamento", "Pernas"], ["leg", "Pernas"], ["cadeira", "Pernas"], ["panturrilha", "Pernas"], ["afundo", "Pernas"], ["stiff", "Pernas"],
    ["desenvolvimento", "Ombros"], ["elevação lateral", "Ombros"], ["elevação frontal", "Ombros"], ["encolhimento", "Ombros"],
    ["rosca", "Biceps"], ["tríceps", "Triceps"], ["triceps", "Triceps"], ["mergulho", "Triceps"],
    ["abdominal", "Abdomen"], ["prancha", "Abdomen"], ["glúteo", "Gluteos"], ["gluteo", "Gluteos"], ["pélvica", "Gluteos"],
    ["punho", "Antebraco"], ["esteira", "Cardio"], ["bicicleta", "Cardio"], ["corrida", "Cardio"], ["corda", "Cardio"],
  ];
  for (const [k, g] of kw) if (key.includes(k)) return g;
  return undefined;
}
