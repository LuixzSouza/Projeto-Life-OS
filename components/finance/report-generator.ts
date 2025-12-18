import ExcelJS from 'exceljs';
import { saveAs } from 'file-saver';
import { Transaction, RecurringExpense, WishlistItem } from '@/types/finance';

// Interface específica para os dados recebidos pelo gerador de relatório
interface ReportData {
  totalBalance: number;
  netSalary: number;
  grossSalary: number;
  totalRecurring: number;
  totalPaidDebts: number;
  totalPendingDebts: number;
  // Campos que estavam faltando:
  wishlistTotal?: number;
  wishlistSaved?: number;
  
  metrics: {
    residual: number;
    taxes: number;
    committed: number;
  };
  transactions?: Transaction[];
  recurringExpenses?: RecurringExpense[];
  wishlist?: WishlistItem[];
}

const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

export const generateFinanceReport = async (data: ReportData) => {
  const {
    totalBalance,
    netSalary,
    grossSalary,
    totalRecurring,
    totalPaidDebts,
    totalPendingDebts,
    wishlistTotal = 0, // Valor padrão caso não venha
    wishlistSaved = 0, // Valor padrão caso não venha
    metrics,
    transactions = [],
    recurringExpenses = [],
    wishlist = []
  } = data;

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Life OS Finance';
  workbook.created = new Date();

  // ==========================================
  // ABA 1: VISÃO GERAL (DASHBOARD)
  // ==========================================
  const wsOverview = workbook.addWorksheet('Resumo Executivo', {
    properties: { tabColor: { argb: 'FF1e293b' } }
  });
  
  // Título
  wsOverview.mergeCells('A1:C1');
  const titleCell = wsOverview.getCell('A1');
  titleCell.value = 'RELATÓRIO DE SAÚDE FINANCEIRA';
  titleCell.font = { name: 'Arial', size: 14, bold: true, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0f172a' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  wsOverview.getRow(1).height = 30;

  wsOverview.mergeCells('A2:C2');
  wsOverview.getCell('A2').value = `Gerado em: ${new Date().toLocaleDateString('pt-BR')}`;
  wsOverview.getCell('A2').font = { italic: true, size: 10, color: { argb: 'FF64748b' } };
  wsOverview.getCell('A2').alignment = { horizontal: 'center' };

  wsOverview.addRow([]); 

  // Cabeçalho da Tabela
  const headers = ['INDICADOR', 'VALOR', 'OBSERVAÇÃO'];
  const headerRow = wsOverview.addRow(headers);
  headerRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF334155' } };
    cell.alignment = { horizontal: 'center' };
  });

  // Dados do Resumo
  const overviewData: [string, number, string][] = [
    ['Patrimônio Líquido', totalBalance, 'Saldo total em contas'],
    ['Salário Bruto', grossSalary, 'Renda base'],
    ['Salário Líquido', netSalary, 'Entrada real'],
    ['Custos Fixos Mensais', totalRecurring, 'Comprometimento recorrente'],
    ['Dívidas Pagas (Mês)', totalPaidDebts, 'Amortização realizada'],
    ['Dívidas Pendentes', totalPendingDebts, 'Passivo total a pagar'],
    ['Metas (Wishlist) Total', wishlistTotal, 'Objetivo total de sonhos'],
    ['Metas Guardado', wishlistSaved, 'Valor já reservado'],
    ['Residual (Sobra)', metrics.residual, metrics.residual > 0 ? 'Superávit' : 'Déficit'],
  ];

  overviewData.forEach((row) => {
    const r = wsOverview.addRow(row);
    r.getCell(2).numFmt = '"R$" #,##0.00';
    
    // Cor condicional para o Residual
    if (row[0] === 'Residual (Sobra)') {
        r.font = { bold: true };
        const color = (row[1]) >= 0 ? 'FF166534' : 'FF991B1B';
        r.getCell(2).font = { color: { argb: color }, bold: true };
    }
  });

  wsOverview.getColumn(1).width = 30;
  wsOverview.getColumn(2).width = 20;
  wsOverview.getColumn(3).width = 30;

  // ==========================================
  // ABA 2: EXTRATO DETALHADO
  // ==========================================
  if (transactions.length > 0) {
    const wsTrans = workbook.addWorksheet('Extrato Detalhado', {
      properties: { tabColor: { argb: 'FF0ea5e9' } }
    });
    
    const transHeaders = ['DATA', 'DESCRIÇÃO', 'CATEGORIA', 'TIPO', 'VALOR', 'STATUS'];
    const transHeaderRow = wsTrans.addRow(transHeaders);
    transHeaderRow.eachCell((cell) => {
      cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF0284c7' } };
    });

    transactions.forEach((t) => {
      const row = wsTrans.addRow([
        new Date(t.date),
        t.description,
        t.category || 'Geral',
        t.type === 'INCOME' ? 'Receita' : 'Despesa',
        t.amount,
        'Realizado'
      ]);

      row.getCell(5).numFmt = '"R$" #,##0.00';
      if (t.type === 'INCOME') {
        row.getCell(4).font = { color: { argb: 'FF16a34a' }, bold: true };
        row.getCell(5).font = { color: { argb: 'FF16a34a' } };
      } else {
        row.getCell(4).font = { color: { argb: 'FFdc2626' }, bold: true };
        row.getCell(5).font = { color: { argb: 'FFdc2626' } };
      }
    });

    wsTrans.columns.forEach(col => { if(col) col.width = 20; });
    wsTrans.getColumn(2).width = 40;
  }

  // ==========================================
  // ABA 3: CUSTOS FIXOS
  // ==========================================
  if (recurringExpenses.length > 0) {
    const wsRecurring = workbook.addWorksheet('Custos Fixos', {
      properties: { tabColor: { argb: 'FFf59e0b' } }
    });
    
    const recHeader = wsRecurring.addRow(['DESPESA', 'CATEGORIA', 'DIA VENCIMENTO', 'VALOR ESTIMADO']);
    recHeader.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    recHeader.eachCell(cell => {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFd97706' } };
    });
    
    recurringExpenses.forEach((r) => {
      const row = wsRecurring.addRow([r.title, r.category, r.dayOfMonth, r.amount]);
      row.getCell(4).numFmt = '"R$" #,##0.00';
    });
    wsRecurring.getColumn(1).width = 30;
    wsRecurring.getColumn(4).width = 20;
  }

  // ==========================================
  // DOWNLOAD
  // ==========================================
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, `Relatorio_Financeiro_${new Date().toISOString().split('T')[0]}.xlsx`);
};