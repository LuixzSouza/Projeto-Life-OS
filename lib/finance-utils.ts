// lib/finance-utils.ts

// Função Auxiliar de INSS (Baseada na tabela progressiva 2024)
export const calculateNetSalary = (gross: number | null | undefined) => {
    const salary = gross || 0; // Garante que não quebra se for nulo
    let inss = 0;

    if (salary <= 1412) inss = salary * 0.075;
    else if (salary <= 2666.68) inss = salary * 0.09;
    else if (salary <= 4000.03) inss = salary * 0.12;
    else inss = salary * 0.14; // Teto simplificado para exemplo

    // Limitando ao teto do INSS (opcional, mas mais correto profissionalmente)
    const TETO_INSS = 908.85;
    const inssFinal = Math.min(inss, TETO_INSS);
    
    const fgts = salary * 0.08;
    const net = salary - inssFinal; 
    
    return { net, inss: inssFinal, fgts };
}

// Formatador de Moeda Padrão
export const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}