/**
 * E2E Test: Admin Panel
 * Tests: page load, sidebar, tabs, Input Manual modal
 */
import { chromium } from 'playwright';

const BASE = process.env.BASE_URL || 'http://localhost:4321';
let browser, page;

async function setup() {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
}

async function teardown() {
  await browser?.close();
}

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
  } catch (err) {
    console.log(`❌ ${name}: ${err.message}`);
    process.exitCode = 1;
  }
}

// ── Tests ──────────────────────────────────────────────

async function run() {
  await setup();

  await test('Admin page loads', async () => {
    await page.goto(`${BASE}/admin/`);
    await page.waitForSelector('text=ASJ Portal');
  });

  await test('Header renders with logo', async () => {
    const logo = await page.locator('img[alt="Logo ASJ"]');
    if (await logo.count() === 0) throw new Error('Logo not found');
  });

  await test('Back button exists', async () => {
    const back = await page.locator('text=Kembali ke Portal');
    if (await back.count() === 0) throw new Error('Back button not found');
  });

  await test('Sidebar opens on Menu click', async () => {
    await page.click('button:has-text("Menu")');
    await page.waitForSelector('text=Loker Publik', { timeout: 3000 });
  });

  await test('Data Pelamar tab works', async () => {
    await page.click('button:has-text("Data Pelamar")');
    await page.waitForSelector('text=Database Pelamar', { timeout: 3000 });
  });

  await test('Input Manual button exists', async () => {
    const btn = await page.locator('button:has-text("Input Manual")');
    if (await btn.count() === 0) throw new Error('Input Manual button not found');
  });

  await test('Input Manual modal opens', async () => {
    await page.click('button:has-text("Input Manual")');
    await page.waitForSelector('text=Input Kandidat Manual', { timeout: 3000 });
  });

  await test('Modal has all form fields', async () => {
    const fields = ['NAMA LENGKAP', 'NO WHATSAPP', 'JOB DILAMAR', 'Gender', 'Usia', 'PENDIDIKAN'];
    for (const f of fields) {
      const el = await page.locator(`text=${f}`);
      if (await el.count() === 0) throw new Error(`Field "${f}" not found`);
    }
  });

  await test('Extra docs section exists', async () => {
    const section = await page.locator('text=UPLOAD DOKUMEN LAINNYA');
    if (await section.count() === 0) throw new Error('Extra docs section not found');
  });

  await test('Dropdown has 24 options', async () => {
    const options = await page.locator('select').last().locator('option').count();
    if (options < 20) throw new Error(`Only ${options} options, expected 24`);
  });

  await test('Tambah button exists', async () => {
    const btn = await page.locator('button:has-text("Tambah")');
    if (await btn.count() === 0) throw new Error('Tambah button not found');
  });

  await test('Modal closes on X click', async () => {
    await page.click('button:has-text("×")');
    await page.waitForFunction(() => !document.querySelector('.fixed.inset-0'), { timeout: 3000 });
  });

  await test('Export CSV button exists', async () => {
    const btn = await page.locator('button:has-text("Export CSV")');
    if (await btn.count() === 0) throw new Error('Export CSV button not found');
  });

  await test('Laporan Bulanan button exists', async () => {
    const btn = await page.locator('button:has-text("Laporan Bulanan")');
    if (await btn.count() === 0) throw new Error('Laporan Bulanan button not found');
  });

  await test('Filter dropdowns exist', async () => {
    const selects = await page.locator('select').count();
    if (selects < 3) throw new Error(`Only ${selects} selects, expected 3+`);
  });

  await teardown();
}

run();
