// Arte EMBUTIDA de exercícios (recortada das fichas do personal, em
// /public/exercises). Local = funciona offline e nunca "erra o match", ao
// contrário da base externa. Cada arquivo lista os nomes (aliases) que o
// exibem — comparação sem acento/caixa/pontuação.

const norm = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** arquivo (sem .png) → nomes de exercício que usam essa arte. */
const ART: Record<string, string[]> = {
  // --- Treino A (pernas) ---
  "agachamento-salto": ["agachamento com salto", "agachamento salto", "jump squat"],
  "agachamento-isometrico": ["agachamento isometrico", "isometria", "agachamento na parede", "wall sit"],
  "agachamento-com-barra": ["agachamento com barra", "agachamento livre", "agachamento"],
  "terra-hexagonal": ["levantamento terra hexagonal", "terra hexagonal", "hexagonal", "hex bar", "trap bar"],
  "leg-press-45": ["leg press 45", "leg press"],
  "cadeira-adutora": ["cadeira adutora", "adutora"],
  "cadeira-extensora": ["cadeira extensora", "extensora"],
  "flexora-em-pe": ["flexora em pe", "mesa flexora em pe", "flexora unilateral em pe"],
  "passada": ["passada", "afundo passada", "caminhada com halteres", "walking lunge"],
  // --- Treino B (bracos/peito/abs) ---
  "triceps-banco": ["triceps banco", "triceps no banco", "mergulho no banco"],
  "triceps-frances-corda": ["triceps frances na corda", "triceps frances corda", "triceps frances"],
  "triceps-testa-alternado": ["triceps testa alternado", "triceps testa"],
  "rosca-alternada-rotacao": ["rosca alternada com rotacao", "rosca alternada rotacao", "rosca alternada"],
  "rosca-crucifixo-unilateral": ["rosca crucifixo unilateral", "rosca cruz unilateral"],
  "rosca-scott-w": ["rosca scott w", "rosca scott", "scott w"],
  "supino-inclinado": ["supino inclinado"],
  "supino-vertical-unilateral": ["supino vertical unilateral", "supino vertical", "vertical unilateral"],
  "peck-deck-fechado": ["peck deck fechado", "peck deck", "peck deck voador", "voador"],
  "abdominal-bicicleta": ["abdominal bicicleta", "abs bike"],
  "abdominal-crunch": ["abdominal crunch", "abdominal supra", "crunch"],
  "escada": ["escada", "escada stair", "stairmaster", "simulador de escada"],
  // --- Treino C (gluteos/posterior) ---
  "cadeira-abdutora": ["cadeira abdutora", "abdutora"],
  "elevacao-pelvica-bola": ["elevacao pelvica na bola", "elevacao pelvica bola", "pelvica na bola"],
  "rdl": ["levantamento terra romeno", "terra romeno", "rdl", "stiff"],
  "afundo-smith": ["afundo no smith", "afundo smith"],
  "afundo-bulgaro": ["afundo bulgaro", "bulgaro"],
  "cadeira-flexora": ["cadeira flexora", "mesa flexora", "flexora"],
  "bom-dia": ["bom dia", "good morning"],
  "panturrilha-no-caixote": ["panturrilha no caixote", "panturrilha no step", "panturrilha em pe", "caixote vertical"],
  // --- Treino D (costas/ombros/core) ---
  "remada-cavalinho": ["remada cavalinho", "cavalinho", "t bar row"],
  "remada-convergente": ["remada convergente", "convergente"],
  "remada-baixa-maquina": ["remada baixa", "remada baixa maquina", "remada maquina"],
  "pulley-unilateral": ["puxada unilateral", "pulley unilateral", "puxada unilateral pulley"],
  "remada-curvada": ["remada curvada"],
  "remada-alta-polia": ["remada alta", "remada alta na polia"],
  "elevacao-frontal-barra": ["elevacao frontal com barra", "elevacao frontal barra", "elevacao frontal", "elevacao frontal com anilha"],
  "elevacao-lateral": ["elevacao lateral"],
  "prancha-isometrica": ["prancha isometrica", "prancha"],
  "abdominal-obliquo": ["abdominal obliquo", "obliquo"],
  "esteira": ["esteira", "corrida na esteira", "caminhada inclinada"],
};

// Índice reverso alias-normalizado → caminho público (montado uma vez).
const INDEX: Record<string, string> = (() => {
  const map: Record<string, string> = {};
  for (const [file, aliases] of Object.entries(ART)) {
    for (const alias of aliases) map[norm(alias)] = `/exercises/${file}.png`;
  }
  return map;
})();

/** Arte embutida para o exercício (match exato do nome normalizado), ou undefined. */
export function customArtFor(name?: string): string | undefined {
  if (!name?.trim()) return undefined;
  return INDEX[norm(name)];
}
