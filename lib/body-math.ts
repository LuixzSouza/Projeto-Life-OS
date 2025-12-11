// lib/body-math.ts

export type Gender = 'MALE' | 'FEMALE';

export interface BodyStats {
    weight: number; // kg
    height: number; // cm
    waist: number;  // cm
    neck: number;   // cm
    hip: number;    // cm
    age: number;
    gender: Gender;
    activityFactor: number; // 1.2 a 1.9
}

export const ACTIVITY_LEVELS = [
    { value: 1.2, label: "Sedentário (Pouco ou nenhum exercício)" },
    { value: 1.375, label: "Levemente ativo (1-3 dias/semana)" },
    { value: 1.55, label: "Moderadamente ativo (3-5 dias/semana)" },
    { value: 1.725, label: "Muito ativo (6-7 dias/semana)" },
    { value: 1.9, label: "Extremamente ativo (Trabalho físico/Treino 2x dia)" },
];

export const calculateBMI = (weight: number, height: number) => {
    if (!weight || !height) return { value: 0, status: "N/A" };
    const h = height / 100;
    const value = weight / (h * h);
    let status = "";
    if (value < 18.5) status = "Abaixo do Peso";
    else if (value < 24.9) status = "Peso Normal";
    else if (value < 29.9) status = "Sobrepeso";
    else status = "Obesidade";
    return { value, status };
};

export const calculateBodyFat = (stats: BodyStats) => {
    const { gender, waist, neck, height, hip } = stats;
    
    // Validação de segurança para evitar Log de número negativo
    if (!waist || !neck || !height || waist <= neck) return 0;

    if (gender === 'MALE') {
        return 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(height)) - 450;
    } else {
        if (!hip || (waist + hip) <= neck) return 0;
        return 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.22100 * Math.log10(height)) - 450;
    }
};

export const calculateBMR = (stats: BodyStats) => {
    const { weight, height, age, gender } = stats;
    if (!weight || !height) return 0;
    
    // ✅ CORREÇÃO: Mudado de 'let' para 'const'
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

// Adicionado pois é usado no componente
export const calculateRisk = (waist: number, height: number) => {
    if (!waist || !height) return { level: "N/A", color: "text-zinc-500" };
    const ratio = waist / height;
    if (ratio < 0.5) return { level: "Baixo Risco", color: "text-emerald-500 bg-emerald-100/20" };
    if (ratio < 0.6) return { level: "Risco Moderado", color: "text-yellow-500 bg-yellow-100/20" };
    return { level: "Alto Risco", color: "text-red-500 bg-red-100/20" };
};