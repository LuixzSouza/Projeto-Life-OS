import fs from 'fs';
import path from 'path';

const CONFIG_PATH = path.join(process.cwd(), 'life-os.config.json');

// Define o caminho padrão caso não tenha config
const DEFAULT_DB_PATH = path.join(process.cwd(), 'prisma', 'life_os.db');

export function getDatabasePath() {
  if (fs.existsSync(CONFIG_PATH)) {
    try {
      const raw = fs.readFileSync(CONFIG_PATH, 'utf-8');
      const config = JSON.parse(raw);
      if (config.dbPath) return config.dbPath;
    } catch (e) {
      console.error("Erro ao ler config do banco:", e);
    }
  }
  return DEFAULT_DB_PATH;
}

export function setDatabasePath(newPath: string) {
  const config = { dbPath: newPath };
  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
}