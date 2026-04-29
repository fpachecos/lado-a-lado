/**
 * Copia os screenshots relevantes de ../screenshots/ para public/screenshots/
 * mapeando cada tela para o nome usado nas composições Remotion.
 *
 * Uso: node copy-screenshots.mjs
 */

import { copyFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

const SRC = "../screenshots";
const DST = "public/screenshots";

// Mapeamento: arquivo de destino → padrão de busca no nome do arquivo fonte
const MAP = {
  "schedules-list.png":        "iphone65",  // será escolhido por prefixo + rota
  "schedules-new.png":         "iphone65",
  "feedings.png":              "iphone65",
  "feedings-report.png":       "iphone65",
  "weight.png":                "iphone65",
  "diapers.png":               "iphone65",
  "diapers-report.png":        "iphone65",
  "companion.png":             "iphone65",
};

// Descoberta automática: mapeia por substring do nome
const ROUTE_MAP = {
  "schedules-list.png":    "schedules_index",
  "schedules-new.png":     "schedules_new",
  "feedings.png":          "feedings.",
  "feedings-report.png":   "feedings-report",
  "weight.png":            "weight.",
  "diapers.png":           "diapers.",
  "diapers-report.png":    "diapers-report",
  "companion.png":         "companion.",
  "naps.png":              "naps.",
  "naps-report.png":       "naps-report",
  "timeline.png":          "timeline.",
};

if (!existsSync(SRC)) {
  console.error(`Diretório ${SRC} não existe. Rode /app-screenshots primeiro.`);
  process.exit(1);
}

const files = readdirSync(SRC);

for (const [dst, pattern] of Object.entries(ROUTE_MAP)) {
  const match = files.find(f => f.startsWith("iphone65") && f.includes(pattern));
  if (match) {
    copyFileSync(join(SRC, match), join(DST, dst));
    console.log(`✓ ${match} → ${dst}`);
  } else {
    console.warn(`⚠ Não encontrado: ${pattern} — verifique ../screenshots/`);
  }
}

console.log("\nPronto! Edite as composições para usar os screenshots:");
console.log('  content: "screenshots/feedings.png"');
