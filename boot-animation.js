/* eslint-disable @typescript-eslint/no-require-imports */
 

// ==========================================
//  LIFE OS - KERNEL BOOTLOADER v3.0 (CYBERPUNK)
// ==========================================

const figlet = require('figlet');
const gradient = require('gradient-string');
const { createSpinner } = require('nanospinner');
const os = require('os'); // Módulo nativo para pegar dados do PC

const sleep = (ms = 1000) => new Promise((r) => setTimeout(r, ms));

// --- UTILITÁRIOS VISUAIS ---

// Centraliza texto baseado na largura do terminal (padrão 80)
const center = (str, width = 80) => {
  const len = str.length;
  if (len >= width) return str;
  const padLeft = Math.floor((width - len) / 2);
  return ' '.repeat(padLeft) + str;
};

// Gera linha horizontal
const line = (width = 60) => '─'.repeat(width);

// Formata Bytes para GB
const formatMem = (mem) => (mem / 1024 / 1024 / 1024).toFixed(2) + ' GB';

// Função para formatar linha da tabela perfeitamente alinhada
const tableRow = (label, value, width = 60) => {
  const labelLen = label.length;
  const valueLen = value.length;
  // -4 para compensar as bordas e espaços (│ label value │)
  const spaces = width - labelLen - valueLen - 4; 
  const gap = ' '.repeat(spaces > 0 ? spaces : 1);
  return gradient.vice('│') + ` ${label}${gap}${value} ` + gradient.vice('│');
};

async function bootSequence() {
  console.clear();

  // 1. "BIOS" CHECK (Efeito rápido de linhas passando)
  // Isso dá a sensação de que o sistema está acordando o hardware
  const bootLogs = [
    'Allocating memory addresses...',
    'Loading kernel modules: [net, crypto, io]...',
    'Mounting file system /dev/disk1...',
    'Verifying encryption keys... OK',
    'Starting graphical interface renderer...',
  ];

  for (const log of bootLogs) {
    console.log(gradient.atlas(`[SYSTEM_INIT] ${log}`));
    await sleep(150); // Rápido
  }
  await sleep(500);
  console.clear();

  // 2. HEADER LOGO
  const font = 'Slant'; // Ou 'ANSI Shadow' se quiser maior
  const titleText = 'LIFE OS';
  
  const titleAscii = await new Promise(resolve => {
    figlet(titleText, { font: font, horizontalLayout: 'fitted' }, (err, data) => resolve(data));
  });

  console.log('\n');
  console.log(gradient.pastel.multiline(titleAscii));
  
  console.log(gradient.cristal(center('SISTEMA OPERACIONAL PESSOAL - v1.0.4', 60)));
  console.log(gradient.cristal(center('AMBIENTE SEGURO • LOCALHOST • CRIPTOGRAFADO', 60)));
  console.log('\n');

  // 3. PAINEL DE INFORMAÇÕES (COM DADOS REAIS DO SEU PC)
  const boxWidth = 60;
  console.log(gradient.vice('┌' + line(boxWidth - 2) + '┐'));
  
  // Cabeçalho da tabela
  const headerText = 'DADOS DO SISTEMA';
  const statusText = 'STATUS';
  const headerGap = ' '.repeat(boxWidth - headerText.length - statusText.length - 4);
  console.log(gradient.vice('│') + ` ${headerText}${headerGap}${statusText} ` + gradient.vice('│'));
  
  console.log(gradient.vice('├' + line(boxWidth - 2) + '┤'));
  
  // Linhas dinâmicas
  const cpuModel = os.cpus()[0].model.split(' @')[0].trim(); // Pega nome da CPU limpo
  const totalRam = formatMem(os.totalmem());
  const freeRam = formatMem(os.freemem());

  // Função auxiliar para delay de digitação
  const printRow = async (l, v) => {
    console.log(tableRow(l, v, boxWidth));
    await sleep(100);
  };

  await printRow('Host CPU', cpuModel.substring(0, 35)); // Corta se for muito longo
  await printRow('Memória Disponível', `${freeRam} / ${totalRam}`);
  await printRow('Arquitetura Kernel', 'Next.js 16 / Node ' + process.version);
  await printRow('Database Engine', 'SQLite (Persistente)');
  await printRow('Interface', 'Tauri / Web Client');
  await printRow('Porta Local', '4321');
  
  console.log(gradient.vice('└' + line(boxWidth - 2) + '┘'));
  console.log('\n');

  // 4. VERIFICAÇÕES DE SISTEMA (Spinners)
  const runTask = async (text, successText, duration) => {
    const spinner = createSpinner(text).start();
    await sleep(duration);
    spinner.success({ text: successText, mark: '✔' });
  };

  await runTask('Conectando Prisma ORM...', 'Prisma Client conectado', 600);
  await runTask('Checando integridade de arquivos...', 'Sistema de arquivos: ÍNTEGRO', 500);
  await runTask('Carregando modelos de IA...', 'IA Engine: PRONTO', 800);
  await runTask('Compilando Dashboard Financeiro...', 'Módulo Financeiro: ATIVO', 600);

  // 5. BARRA DE CARREGAMENTO INTELIGENTE
  console.log('\n');
  const total = 50; // Largura da barra
  const states = [
    "Carregando módulos...", 
    "Otimizando assets...", 
    "Hidratando componentes...", 
    "Iniciando servidor..."
  ];
  
  for (let i = 0; i <= total; i++) {
    const percent = Math.floor((i / total) * 100);
    const filled = '█'.repeat(i);
    const empty = '░'.repeat(total - i);
    
    // Escolhe mensagem baseada na %
    let msgIndex = Math.floor((percent / 100) * states.length);
    if (msgIndex >= states.length) msgIndex = states.length - 1;
    const currentMsg = states[msgIndex];

    const bar = gradient.morning(filled + empty);
    
    // \r reseta a linha
    process.stdout.write(`\r [${bar}] ${percent}% | ${currentMsg}`);
    
    // Acelera no final para dar sensação de "pronto"
    const speed = percent > 80 ? 15 : 40; 
    await sleep(speed);
  }
  
  console.log('\n\n');
  console.log(gradient.summer(' >>> ACESSO CONCEDIDO. BEM-VINDO, ADMINISTRADOR. <<<'));
  console.log('\n');
}

bootSequence();