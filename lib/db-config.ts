import fs from 'fs';
import path from 'path';

// Nome do arquivo de configuração salvo na raiz do projeto
const CONFIG_FILE_NAME = 'life-os-config.json';
const CONFIG_PATH = path.join(process.cwd(), CONFIG_FILE_NAME);

export function getDatabasePath(): string | null {
  // 1. Se o arquivo não existe, retornamos null
  // Isso avisa ao sistema que ele PRECISA ir para o /setup
  if (!fs.existsSync(CONFIG_PATH)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
    const config = JSON.parse(raw);
    
    // Retorna o caminho se existir, ou null se estiver vazio
    return config.databasePath || null;
  } catch (e) {
    console.error("⚠️ Erro ao ler config do banco:", e);
    return null;
  }
}

export function setDatabasePath(newPath: string) {
  const config = { databasePath: newPath };
  
  // Garante que o diretório do arquivo de config existe (process.cwd() sempre existe, mas por segurança)
  const dir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log(`✅ Configuração salva em: ${CONFIG_PATH}`);
}

// Helper para usar nas páginas e layouts
export function isSystemInstalled(): boolean {
  return !!getDatabasePath();
}