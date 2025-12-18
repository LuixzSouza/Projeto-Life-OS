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

export const calculateSymmetry = (left?: number, right?: number) => {
    if (!left || !right) return { status: 'S/ Dados', diff: 0, color: 'text-muted-foreground' };
    const diff = Math.abs(left - right);
    const percent = (diff / Math.max(left, right)) * 100;
    if (percent < 1.5) return { status: 'Simétrico', diff, color: 'text-emerald-500' };
    if (percent < 4) return { status: 'Leve Assimetria', diff, color: 'text-amber-500' };
    return { status: 'Assimetria', diff, color: 'text-rose-500' };
};