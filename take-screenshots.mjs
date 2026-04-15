import { chromium } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL  = 'http://localhost:8081';
const OUT_DIR   = path.join(__dirname, 'screenshots');
const APP_DIR   = path.join(__dirname, 'app');

// App Store Connect — viewport × scale = final pixel size
// iPhone 6.5": 414×896 × 3 = 1242×2688
// iPad 13":    1024×1366 × 2 = 2048×2732
const DEVICES = {
  iphone65: { width: 414,  height: 896,  scale: 3, label: 'iphone65' },
  ipad13:   { width: 1024, height: 1366, scale: 2, label: 'ipad13' },
};

// ──────────────────────────────────────────────
// Credentials & Supabase config (from env)
// ──────────────────────────────────────────────
const EMAIL    = process.env.SCREENSHOT_EMAIL    || '';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || '';

// Load .env manually for SUPABASE vars (expo only loads them at build time)
function loadEnv() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) process.env[match[1].trim()] ||= match[2].trim();
  }
}
loadEnv();

const SUPABASE_URL  = process.env.EXPO_PUBLIC_SUPABASE_URL  || '';
const SUPABASE_KEY  = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';
const SCHEMA        = 'ladoalado';

if (!EMAIL || !PASSWORD) {
  console.error('Erro: defina SCREENSHOT_EMAIL e SCREENSHOT_PASSWORD antes de rodar.');
  process.exit(1);
}

// ──────────────────────────────────────────────
// Supabase helpers
// ──────────────────────────────────────────────
async function supabaseQuery(table, select = 'id', limit = 1) {
  if (!SUPABASE_URL || !SUPABASE_KEY) return [];
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/${table}?select=${select}&limit=${limit}`,
      {
        headers: {
          apikey: SUPABASE_KEY,
          Authorization: `Bearer ${SUPABASE_KEY}`,
          'Accept-Profile': SCHEMA,
        },
      }
    );
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// Dynamic route discovery
// ──────────────────────────────────────────────

// Map of dynamic segment names → Supabase table + column to resolve IDs
const DYNAMIC_RESOLVERS = {
  // companion/[id] and companion-activities/[id] both use companions table
  companion:            { table: 'companions',      col: 'id' },
  'companion-activities': { table: 'companions',    col: 'id' },
  schedules:            { table: 'visit_schedules', col: 'id' },
};

async function resolveId(parentSegment) {
  const resolver = DYNAMIC_RESOLVERS[parentSegment];
  if (!resolver) return null;
  const rows = await supabaseQuery(resolver.table, resolver.col, 1);
  return rows?.[0]?.[resolver.col] ?? null;
}

// Convert a file path under app/ to an Expo Router URL
// e.g. app/(tabs)/schedules/[id].tsx → /schedules/:id (to be resolved)
function fileToRoute(filePath) {
  let rel = path.relative(APP_DIR, filePath)
    .replace(/\\/g, '/')
    .replace(/\.tsx$/, '');

  // Remove group segments like (tabs), (auth)
  rel = rel.replace(/\([^)]+\)\//g, '');

  // Remove trailing /index
  rel = rel.replace(/\/index$/, '') || '/';

  return rel.startsWith('/') ? rel : '/' + rel;
}

// Scan app/(tabs)/ recursively; skip _layout, (auth), convite, root index
function discoverScreenFiles() {
  const tabsDir = path.join(APP_DIR, '(tabs)');
  const results = [];

  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.name.endsWith('.tsx') && !entry.name.startsWith('_')) {
        results.push(full);
      }
    }
  }

  walk(tabsDir);
  return results.sort();
}

async function buildScreenList() {
  const files  = discoverScreenFiles();
  const screens = [];
  let   index   = 1;

  for (const file of files) {
    const route = fileToRoute(file);

    if (route.includes('[')) {
      // Dynamic route — resolve real ID from Supabase
      const segments = route.split('/').filter(Boolean);
      const parentSeg = segments[segments.length - 2]; // e.g. "companion", "schedules"
      const id = await resolveId(parentSeg);

      if (id) {
        const resolved = route.replace(/\[.*?\]/, id);
        const name = String(index).padStart(2, '0') + '_' + segments.slice(0, -1).join('_');
        screens.push({ path: resolved, name });
        index++;
      } else {
        console.warn(`⚠ Sem dados para rota dinâmica ${route} (tabela: ${DYNAMIC_RESOLVERS[parentSeg]?.table ?? '?'}) — pulando`);
      }
    } else {
      const label = route === '/' ? 'home' : route.replace(/\//g, '_').replace(/^_/, '');
      const name  = String(index).padStart(2, '0') + '_' + label;
      screens.push({ path: route, name });
      index++;
    }
  }

  return screens;
}

// ──────────────────────────────────────────────
// Playwright helpers
// ──────────────────────────────────────────────
async function login(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  const emailInput    = page.locator('input[type="email"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);

  // RN Web renders TouchableOpacity as div — no <button>
  const submitBtn = page.locator('div[class*="r-cursor-1loqt21"]:has-text("Entrar")').first();
  await submitBtn.click();

  await page.waitForTimeout(4000);
  console.log('  ✓ Login OK — URL:', page.url());
}

async function captureScreen(page, route, filename, deviceLabel) {
  try {
    await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 15000 });
    await page.waitForTimeout(2000);
    const filepath = path.join(OUT_DIR, `${deviceLabel}_${filename}.png`);
    await page.screenshot({ path: filepath, fullPage: false });
    console.log(`✓ ${filepath}`);
  } catch (e) {
    console.error(`✗ ${deviceLabel}/${filename}: ${e.message}`);
  }
}

// ──────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────
async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('Descobrindo telas...');
  const screens = await buildScreenList();
  console.log(`${screens.length} telas encontradas:\n` + screens.map(s => `  ${s.path}`).join('\n'));

  const browser = await chromium.launch({ headless: true });

  for (const [, device] of Object.entries(DEVICES)) {
    console.log(`\n--- ${device.label} (${device.width}×${device.height} @${device.scale}x → ${device.width * device.scale}×${device.height * device.scale}px) ---`);
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
    });
    const page = await context.newPage();

    await login(page);

    for (const screen of screens) {
      await captureScreen(page, screen.path, screen.name, device.label);
    }

    await context.close();
  }

  await browser.close();
  console.log(`\nPronto! ${screens.length * Object.keys(DEVICES).length} screenshots em ./screenshots/`);
}

main().catch(console.error);
