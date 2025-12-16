// components/investment/investment-data.ts

export const INFLATION_RATE = 4.5;
export const SAVINGS_RATE = 6.17;

export const GLOSSARY = {
    CDI: "Taxa referência da renda fixa (Nubank, CDBs). Segue a Selic.",
    SELIC: "Taxa básica de juros. Se sobe, renda fixa paga mais.",
    IPCA: "A inflação oficial. Seu lucro real é o que excede isso.",
    LCI_LCA: "Investimentos isentos de Imposto de Renda focados em Imóveis/Agro.",
    FGC: "Fundo Garantidor de Créditos. Segura até R$ 250k se o banco quebrar."
};

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

export const PRODUCTS: InvestmentProduct[] = [
    { id: "nubank", name: "Caixinha Nubank", type: "CDB", rateVal: 100, isTaxFree: false, hasFGC: true, maturity: "D+0", risk: "Baixo", desc: "Liquidez diária. Rende 100% do CDI e você saca quando quiser." },
    { id: "cdb-promo", name: "CDB Banco Médio", type: "CDB", rateVal: 115, isTaxFree: false, hasFGC: true, maturity: "2 anos", risk: "Baixo", desc: "Rende mais que o Nubank, mas seu dinheiro fica preso até o vencimento." },
    { id: "lci", name: "LCI/LCA Isenta", type: "LCI_LCA", rateVal: 92, isTaxFree: true, hasFGC: true, maturity: "1 ano", risk: "Baixo", desc: "Isento de IR. 92% aqui bate CDBs de 115% porque não tem desconto de imposto." },
    { id: "tesouro", name: "Tesouro Prefixado 2029", type: "TESOURO", rateVal: 13.08, fixed: true, isTaxFree: false, hasFGC: false, maturity: "2029", risk: "Médio", desc: "Trava uma taxa altíssima hoje. Ótimo se os juros caírem no futuro." },
    { id: "mxrf11", name: "FII (MXRF11)", type: "FII", rateVal: 12.5, variable: true, isTaxFree: true, hasFGC: false, maturity: "Mensal", risk: "Médio", desc: "Renda variável. Você vira dono de imóveis e recebe aluguel todo mês." },
];