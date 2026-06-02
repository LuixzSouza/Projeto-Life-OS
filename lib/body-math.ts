// lib/body-math.ts

export type Gender = 'MALE' | 'FEMALE';

export interface BodyStats {
    // Essenciais
    weight: number; 
    height: number; 
    waist: number;  
    neck: number;   
    hip: number;    
    gender: Gender;
    activityFactor: number;
    birthDate?: string; // Formato YYYY-MM-DD

    // Detalhados (Opcionais)
    shoulders?: number;
    chest?: number;
    armLeft?: number;
    armRight?: number;
    forearmLeft?: number;
    forearmRight?: number;
    thighLeft?: number;
    thighRight?: number;
    calfLeft?: number;
    calfRight?: number;
}

export const ACTIVITY_LEVELS = [
    { value: 1.2, label: "Sedentário (Pouco ou nenhum exercício)" },
    { value: 1.375, label: "Levemente ativo (1-3 dias/semana)" },
    { value: 1.55, label: "Moderadamente ativo (3-5 dias/semana)" },
    { value: 1.725, label: "Muito ativo (6-7 dias/semana)" },
    { value: 1.9, label: "Extremamente ativo (Trabalho físico pesado)" },
];

// --- AUXILIARES ---

export const calculateAge = (birthDateString?: string) => {
    if (!birthDateString) return 25; // Fallback padrão
    const today = new Date();
    const birthDate = new Date(birthDateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
        age--;
    }
    return age;
};

// --- CÁLCULOS BÁSICOS ---

export const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return { value: 0, status: "N/A" };
    const h = height / 100;
    const value = weight / (h * h);
    let status = "";
    if (value < 18.5) status = "Abaixo do Peso";
    else if (value < 24.9) status = "Peso Normal";
    else if (value < 29.9) status = "Sobrepeso";
    else if (value < 34.9) status = "Obesidade I";
    else status = "Obesidade II";
    return { value, status };
};

export const calculateBodyFat = (stats: BodyStats) => {
    const { gender, waist, neck, height, hip } = stats;
    if (!waist || !neck || !height || waist <= neck) return 0;

    if (gender === 'MALE') {
        return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
        if (!hip || (waist + hip) <= neck) return 0;
        return 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }
};

export const calculateBMR = (stats: BodyStats) => {
    const { weight, height, birthDate, gender } = stats;
    if (!weight || !height) return 0;
    
    const age = calculateAge(birthDate);
    const base = (10 * weight) + (6.25 * height) - (5 * age);
    return gender === 'MALE' ? base + 5 : base - 161;
};

export const calculateTDEE = (bmr: number, factor: number) => Math.round(bmr * factor);

export const calculateComposition = (weight: number, bodyFat: number) => {
    const fatMass = weight * (bodyFat / 100);
    const leanMass = weight - fatMass;
    return { fatMass, leanMass };
};

export const calculateWater = (weight: number) => Math.round(weight * 35); 

export const calculateRisk = (waist: number, height: number) => {
    if (!waist || !height) return { level: "N/A", color: "text-zinc-500 bg-zinc-100/10" };
    const ratio = waist / height;
    if (ratio < 0.5) return { level: "Baixo Risco", color: "text-emerald-500 bg-emerald-500/10 border-emerald-500/20" };
    if (ratio < 0.6) return { level: "Risco Moderado", color: "text-amber-500 bg-amber-500/10 border-amber-500/20" };
    return { level: "Alto Risco", color: "text-rose-500 bg-rose-500/10 border-rose-500/20" };
};

// --- CÁLCULOS AVANÇADOS ---

export const calculateFFMI = (weight: number, heightCm: number, bodyFatPercent: number) => {
    if (!weight || !heightCm) return { value: "0.0", label: "N/A" };
    const heightM = heightCm / 100;
    const leanMassKg = weight * (1 - (bodyFatPercent / 100));
    const ffmi = leanMassKg / (heightM * heightM);
    const adjustedFFMI = ffmi + (6.1 * (1.8 - heightM));

    let label = "Média";
    if (adjustedFFMI < 18) label = "Abaixo da Média";
    else if (adjustedFFMI < 20) label = "Média";
    else if (adjustedFFMI < 22) label = "Acima da Média";
    else if (adjustedFFMI < 25) label = "Excelente";
    else label = "Superior";

    return { value: adjustedFFMI.toFixed(1), label };
};

export const calculateWHR = (waist: number, hip: number, gender: string) => {
    if (!waist || !hip) return null;
    const ratio = waist / hip;
    let risk = "Baixo";
    if (gender === 'MALE') {
        if (ratio > 0.9) risk = "Moderado";
        if (ratio > 1.0) risk = "Alto";
    } else {
        if (ratio > 0.8) risk = "Moderado";
        if (ratio > 0.85) risk = "Alto";
    }
    return { ratio: ratio.toFixed(2), risk };
};

export const calculateAdonisIndex = (shoulders: number, waist: number) => {
    if (!shoulders || !waist || shoulders <= waist) return null;
    const ratio = shoulders / waist;
    const diff = Math.abs(1.618 - ratio);
    let status = "Distante";
    if (diff < 0.2) status = "Bom";
    if (diff < 0.1) status = "Ótimo";
    if (diff < 0.05) status = "Golden";
    return { ratio: ratio.toFixed(2), status };
};

// =========================================================
// MÉTRICAS SEM EQUIPAMENTO (só peso, altura, idade e gênero)
// Úteis mesmo para quem não tem fita métrica ou balança de bioimpedância.
// =========================================================

// BMI Prime: razão do IMC para o limite saudável (25). <1 = dentro do ideal.
export const calculateBMIPrime = (bmi: number) => {
    if (!bmi) return { value: 0, status: "N/A" };
    const prime = bmi / 25;
    let status = "Ideal";
    if (prime < 0.74) status = "Abaixo";
    else if (prime <= 1) status = "Ideal";
    else if (prime <= 1.2) status = "Sobrepeso";
    else status = "Acima";
    return { value: prime, status };
};

// Faixa de peso saudável para a altura (IMC 18.5–24.9).
export const healthyWeightRange = (heightCm: number) => {
    if (!heightCm) return null;
    const h = heightCm / 100;
    return { min: 18.5 * h * h, max: 24.9 * h * h };
};

// Peso ideal (fórmula de Devine) — referência clínica clássica.
export const calculateIdealWeight = (heightCm: number, gender: Gender) => {
    if (!heightCm) return 0;
    const inches = heightCm / 2.54;
    const over60 = Math.max(0, inches - 60);
    const base = gender === "MALE" ? 50 : 45.5;
    return base + 2.3 * over60;
};

// Massa magra estimada (fórmula de Boer) — não exige medir gordura.
export const calculateLeanMassBoer = (weight: number, heightCm: number, gender: Gender) => {
    if (!weight || !heightCm) return 0;
    return gender === "MALE"
        ? 0.407 * weight + 0.267 * heightCm - 19.2
        : 0.252 * weight + 0.473 * heightCm - 48.3;
};

// Área de Superfície Corporal (Du Bois) — usada em medicina/dosagens.
export const calculateBSA = (weight: number, heightCm: number) => {
    if (!weight || !heightCm) return 0;
    return 0.007184 * Math.pow(weight, 0.425) * Math.pow(heightCm, 0.725);
};

// % de gordura estimada via IMC, idade e gênero (Deurenberg) — sem fita métrica.
export const estimateBodyFatBMI = (bmi: number, age: number, gender: Gender) => {
    if (!bmi) return 0;
    const sex = gender === "MALE" ? 1 : 0;
    const bf = 1.2 * bmi + 0.23 * age - 10.8 * sex - 5.4;
    return Math.max(0, bf);
};

// Frequência cardíaca máxima (Tanaka, mais precisa que 220-idade) + zonas.
export const calculateMaxHR = (age: number) => (age > 0 ? Math.round(208 - 0.7 * age) : 0);

export interface HeartZone {
    name: string;
    range: string;     // ex: "120-140"
    min: number;
    max: number;
    desc: string;
    color: string;     // classes tailwind text/bg
}

export const heartRateZones = (maxHR: number): HeartZone[] => {
    if (!maxHR) return [];
    const z = (lo: number, hi: number) => `${Math.round(maxHR * lo)}-${Math.round(maxHR * hi)}`;
    const mk = (lo: number, hi: number) => ({ min: Math.round(maxHR * lo), max: Math.round(maxHR * hi) });
    return [
        { name: "Recuperação", range: z(0.5, 0.6), ...mk(0.5, 0.6), desc: "Aquecimento e regeneração", color: "text-sky-600 bg-sky-500/10" },
        { name: "Queima de Gordura", range: z(0.6, 0.7), ...mk(0.6, 0.7), desc: "Emagrecimento e base aeróbica", color: "text-emerald-600 bg-emerald-500/10" },
        { name: "Aeróbico", range: z(0.7, 0.8), ...mk(0.7, 0.8), desc: "Condicionamento cardiovascular", color: "text-amber-600 bg-amber-500/10" },
        { name: "Anaeróbico", range: z(0.8, 0.9), ...mk(0.8, 0.9), desc: "Performance e potência", color: "text-orange-600 bg-orange-500/10" },
        { name: "Máximo (VO₂)", range: z(0.9, 1.0), ...mk(0.9, 1.0), desc: "Esforço máximo, curtos intervalos", color: "text-rose-600 bg-rose-500/10" },
    ];
};

// Distribuição de macronutrientes a partir de uma meta calórica.
export const calculateMacros = (targetCalories: number, weightKg: number) => {
    if (!targetCalories || !weightKg) return { protein: 0, fat: 0, carbs: 0 };
    const protein = Math.round(weightKg * 2);          // 2 g/kg de peso
    const fat = Math.round((targetCalories * 0.25) / 9); // 25% das calorias
    const carbsKcal = Math.max(0, targetCalories - protein * 4 - fat * 9);
    const carbs = Math.round(carbsKcal / 4);
    return { protein, fat, carbs };
};

export const calculateSymmetry = (left?: number, right?: number) => {
    if (!left || !right) return { status: 'S/ Dados', diff: 0, color: 'text-muted-foreground' };
    const diff = Math.abs(left - right);
    const percent = (diff / Math.max(left, right)) * 100;
    if (percent < 1.5) return { status: 'Simétrico', diff, color: 'text-emerald-500' };
    if (percent < 4) return { status: 'Leve Assimetria', diff, color: 'text-amber-500' };
    return { status: 'Assimetria', diff, color: 'text-rose-500' };
};