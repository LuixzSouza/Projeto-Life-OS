// components/finance/investment/investment-data.ts

// --- DADOS MACROECONÔMICOS REAIS (MARÇO DE 2026) ---
export const INFLATION_RATE = 3.81; // IPCA acumulado em 12 meses
export const SAVINGS_RATE = 7.17;   // Poupança (6,17% a.a. + Taxa Referencial aproximada)

export const GLOSSARY = {
    CDI: "Certificado de Depósito Interbancário. É a taxa referência da renda fixa (ex: Caixinhas, CDBs). Acompanha de perto a Selic (atualmente em 14,90% a.a.).",
    SELIC: "Taxa básica de juros da economia (15,00% a.a. hoje). Se ela sobe, a renda fixa paga mais; se cai, o crédito encarece.",
    IPCA: "A inflação oficial do Brasil (3,81% no acumulado de 12 meses). Seu lucro real é apenas aquilo que rende acima desse valor.",
    LCI_LCA: "Letras de Crédito Imobiliário e do Agronegócio. São empréstimos feitos a bancos com isenção total de Imposto de Renda para pessoa física.",
    FGC: "Fundo Garantidor de Créditos. Protege seu dinheiro (limitado a R$ 250 mil por instituição) caso o banco em que você investiu venha a falir.",
    TESOURO: "Plataforma do governo federal. Você empresta dinheiro para o Estado. É considerado o investimento mais seguro do país (Risco Soberano).",
    FII: "Fundos de Investimento Imobiliário. Você compra cotas na bolsa e recebe 'aluguéis' mensais isentos de IR diretamente na sua conta."
};

// Ponto da série de projeção exibida no gráfico do simulador.
export interface ProjectionPoint {
    year: string;
    total: number;
    invested: number;
    savings: number;
}

export type ProductType = "CDB" | "LCI_LCA" | "TESOURO" | "FII";

export interface InvestmentProduct {
    id: string;
    name: string;
    type: ProductType;
    rateVal: number;
    fixed?: boolean;
    variable?: boolean;
    isTaxFree: boolean;
    hasFGC: boolean;
    maturity: string;
    risk: "Baixo" | "Médio" | "Alto";
    desc: string;
}

// --- VITRINE DE PRODUTOS REALISTAS (MERCADO ATUAL) ---
export const PRODUCTS: InvestmentProduct[] = [
    // 1. LIQUIDEZ DIÁRIA (Reserva de Emergência)
    { 
        id: "nubank", 
        name: "Caixinha Nubank", 
        type: "CDB", 
        rateVal: 100, // 100% do CDI
        isTaxFree: false, 
        hasFGC: true, 
        maturity: "D+0 (Resgate Imediato)", 
        risk: "Baixo", 
        desc: "Ideal para reserva de emergência. Rende 100% do CDI (aprox. 14,90% a.a.) e você pode sacar quando quiser, inclusive aos finais de semana." 
    },
    
    // 2. CDB DE BANCOS MÉDIOS (Rentabilidade Turbinada)
    { 
        id: "cdb-master", 
        name: "CDB Banco Master", 
        type: "CDB", 
        rateVal: 115, // 115% do CDI
        isTaxFree: false, 
        hasFGC: true, 
        maturity: "2 anos", 
        risk: "Baixo", 
        desc: "Excelente rentabilidade pagando 115% do CDI, mas seu dinheiro fica preso até o vencimento em 2028. Totalmente coberto pela garantia do FGC." 
    },

    // 3. LCI/LCA (Isenção de Imposto)
    { 
        id: "lci-bb", 
        name: "LCI Banco do Brasil", 
        type: "LCI_LCA", 
        rateVal: 92, // 92% do CDI
        isTaxFree: true, 
        hasFGC: true, 
        maturity: "1 ano", 
        risk: "Baixo", 
        desc: "Rendimento de 92% do CDI limpo na conta, pois é isento de Imposto de Renda. Focado no curto prazo com a segurança absoluta de um 'bancão'." 
    },
    { 
        id: "lca-abc", 
        name: "LCA Banco ABC", 
        type: "LCI_LCA", 
        rateVal: 96, // 96% do CDI
        isTaxFree: true, 
        hasFGC: true, 
        maturity: "2 anos", 
        risk: "Baixo", 
        desc: "Isento de IR. Rendimento espetacular de 96% do CDI, o que frequentemente supera CDBs de 115% no cálculo líquido final devido à ausência de impostos." 
    },

    // 4. TESOURO DIRETO (Risco Soberano)
    { 
        id: "tesouro-selic", 
        name: "Tesouro Selic 2029", 
        type: "TESOURO", 
        rateVal: 100.6, // Equivale aproximadamente a Selic + um pequeno prêmio
        isTaxFree: false, 
        hasFGC: false, // Governo não tem FGC, tem garantia soberana
        maturity: "2029", 
        risk: "Baixo", 
        desc: "Acompanha a taxa básica de juros (Selic). O investimento mais seguro do Brasil. Pode ser resgatado a qualquer momento sem risco de perder dinheiro." 
    },
    { 
        id: "tesouro-pre", 
        name: "Tesouro Prefixado 2029", 
        type: "TESOURO", 
        rateVal: 13.37, // Taxa real batida hoje
        fixed: true, 
        isTaxFree: false, 
        hasFGC: false, 
        maturity: "2029", 
        risk: "Médio", 
        desc: "Trava uma taxa exata de 13,37% a.a. independentemente do que aconteça. É perfeito para garantir rentabilidade alta caso a Selic comece a cair." 
    },
    { 
        id: "tesouro-ipca", 
        name: "Tesouro IPCA+ 2032", 
        type: "TESOURO", 
        rateVal: 11.57, // IPCA atual (3.81%) + Taxa pré fixada do papel (7.76%)
        fixed: true, 
        isTaxFree: false, 
        hasFGC: false, 
        maturity: "2032", 
        risk: "Médio", 
        desc: "Garante a Inflação (IPCA) + 7,76% a.a. de ganho real fixo. É a melhor opção do mercado para blindar totalmente o seu poder de compra a longo prazo." 
    },

    // 5. FUNDOS IMOBILIÁRIOS (Renda Variável)
    { 
        id: "mxrf11", 
        name: "FII Maxi Renda (MXRF11)", 
        type: "FII", 
        rateVal: 12.5, // Dividend Yield anual aproximado
        variable: true, 
        isTaxFree: true, 
        hasFGC: false, 
        maturity: "Mensal (Ações)", 
        risk: "Alto", 
        desc: "Fundo imobiliário de papel atrelado ao CDI/IPCA. Você compra cotas e recebe 'aluguéis' (dividendos) mensais isentos de IR. Risco de oscilação da cota." 
    },
    { 
        id: "xpml11", 
        name: "FII XP Malls (XPML11)", 
        type: "FII", 
        rateVal: 10.8, // Dividend Yield anual aproximado
        variable: true, 
        isTaxFree: true, 
        hasFGC: false, 
        maturity: "Mensal (Ações)", 
        risk: "Alto", 
        desc: "Fundo focado em grandes Shopping Centers. Seus ganhos vêm de parte dos aluguéis pagos pelos lojistas e do potencial de valorização do imóvel em si." 
    },
];