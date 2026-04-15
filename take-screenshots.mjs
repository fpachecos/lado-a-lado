import { chromium } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE_URL = 'http://localhost:8081';
const OUT_DIR = path.join(__dirname, 'screenshots');

// App Store Connect dimensions — viewport × scale = final pixel size
// iPhone 6.5": 414×896 × 3 = 1242×2688
// iPad 13":    1024×1366 × 2 = 2048×2732
const DEVICES = {
  iphone65: { width: 414,  height: 896,  scale: 3, label: 'iphone65' },
  ipad13:   { width: 1024, height: 1366, scale: 2, label: 'ipad13' },
};

// Screens to capture (route → filename)
const SCREENS = [
  { path: '/',                    name: '01_home' },
  { path: '/schedules',           name: '02_schedules' },
  { path: '/visits',              name: '03_visits' },
  { path: '/baby',                name: '04_baby' },
  { path: '/feedings',            name: '05_feedings' },
  { path: '/feedings-report',     name: '06_feedings_report' },
  { path: '/weight',              name: '07_weight' },
  { path: '/profile',             name: '08_profile' },
];

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

const EMAIL    = process.env.SCREENSHOT_EMAIL    || '';
const PASSWORD = process.env.SCREENSHOT_PASSWORD || '';

if (!EMAIL || !PASSWORD) {
  console.error('Erro: defina SCREENSHOT_EMAIL e SCREENSHOT_PASSWORD antes de rodar.');
  process.exit(1);
}

async function login(page) {
  await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 20000 });
  await page.waitForTimeout(2000);

  // Fill login form
  const emailInput = page.locator('input[type="email"], input[placeholder*="mail"], input[placeholder*="E-mail"], input[placeholder*="e-mail"]').first();
  const passwordInput = page.locator('input[type="password"]').first();

  await emailInput.fill(EMAIL);
  await passwordInput.fill(PASSWORD);

  // Submit — RN Web renders TouchableOpacity as div with cursor pointer
  const submitBtn = page.locator('div[class*="r-cursor-1loqt21"]:has-text("Entrar")').first();
  await submitBtn.click();

  // Wait for redirect to authenticated area
  await page.waitForTimeout(4000);
  console.log('  ✓ Login OK — URL:', page.url());
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  for (const [key, device] of Object.entries(DEVICES)) {
    console.log(`\n--- ${key} (${device.width}x${device.height}) ---`);
    const context = await browser.newContext({
      viewport: { width: device.width, height: device.height },
      deviceScaleFactor: device.scale,
    });
    const page = await context.newPage();

    await login(page);

    for (const screen of SCREENS) {
      await captureScreen(page, screen.path, screen.name, device.label);
    }

    await context.close();
  }

  await browser.close();
  console.log('\nDone! Screenshots saved to ./screenshots/');
}

main().catch(console.error);
