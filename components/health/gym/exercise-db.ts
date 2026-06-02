// Sugestões de exercícios por grupo muscular (PT-BR) para acelerar o registro.
export const EXERCISES_BY_GROUP: Record<string, string[]> = {
  Peito: [
    "Supino Reto", "Supino Inclinado", "Supino Declinado", "Supino com Halteres",
    "Crucifixo", "Crucifixo Inclinado", "Crossover", "Peck Deck (Voador)", "Flexão de Braço",
  ],
  Costas: [
    "Puxada Frontal", "Puxada Aberta", "Barra Fixa", "Remada Curvada", "Remada Baixa",
    "Remada Unilateral (Serrote)", "Remada Cavalinho", "Pulldown", "Levantamento Terra",
  ],
  Pernas: [
    "Agachamento Livre", "Agachamento Hack", "Leg Press", "Cadeira Extensora", "Cadeira Flexora",
    "Stiff", "Afundo", "Cadeira Abdutora", "Cadeira Adutora", "Panturrilha em Pé", "Panturrilha Sentado",
  ],
  Ombros: [
    "Desenvolvimento", "Desenvolvimento Arnold", "Elevação Lateral", "Elevação Frontal",
    "Crucifixo Inverso", "Remada Alta", "Encolhimento (Trapézio)",
  ],
  Biceps: [
    "Rosca Direta", "Rosca Alternada", "Rosca Martelo", "Rosca Scott", "Rosca Concentrada", "Rosca na Polia",
  ],
  Triceps: [
    "Tríceps Pulley", "Tríceps Corda", "Tríceps Testa", "Tríceps Francês", "Mergulho (Paralelas)", "Tríceps Coice",
  ],
  Abdomen: [
    "Abdominal Supra", "Abdominal Infra", "Prancha", "Elevação de Pernas",
    "Abdominal Oblíquo", "Abdominal na Polia", "Russian Twist",
  ],
  Cardio: [
    "Esteira", "Bicicleta Ergométrica", "Elíptico", "Pular Corda", "Escada (Stair)", "Remo (Ergômetro)", "HIIT",
  ],
};
