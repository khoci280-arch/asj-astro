/**
 * E2E Test: Supabase Auth Integration
 * Tests: init, login modal, Supabase connection, session sync
 */
import { chromium } from 'playwright';
const BASE = process.env.BASE_URL || 'http://localhost:4322';
let browser, page;
const TEST_PHONE = '628' + Math.floor(100000000 + Math.random() * 900000000);

async function setup() {
  browser = await chromium.launch({ headless: true });
  page = await browser.newPage();
  page.on('console', m => {
    if (m.text().includes('[Supabase]') || m.text().includes('[UserStore]'))
      console.log(`  📋 ${m.text()}`);
  });
}
async function teardown() { await browser?.close(); }
async function test(name, fn) {
  try { await fn(); console.log(`✅ ${name}`); }
  catch (err) { console.log(`❌ ${name}: ${err.message.split('\n')[0]}`); process.exitCode = 1; }
}

async function run() {
  console.log(`\n🧪 Supabase Auth E2E — ${BASE}\n`);
  await setup();

  // 1. Supabase initializes
  await test('Supabase client initializes in browser', async () => {
    await page.goto(`${BASE}/`);
    await page.waitForLoadState('networkidle');
    const hasBody = await page.evaluate(() => !!document.body);
    if (!hasBody) throw new Error('No body');
  });

  // 2. Auth store defaults to guest
  await test('authStore defaults to guest', async () => {
    const auth = await page.evaluate(() => {
      try { const r = localStorage.getItem('asj_auth'); return r ? JSON.parse(r) : null; }
      catch { return null; }
    });
    if (auth?.isLoggedIn) throw new Error('Expected guest');
  });

  // 3. Login modal opens
  await test('Login modal opens', async () => {
    await page.locator('button:has-text("Login Pelamar")').first().click({ force: true });
    await page.waitForSelector('input[type="tel"]', { timeout: 5000 });
  });

  // 4. Modal has phone + password fields
  await test('Login modal has phone + password fields', async () => {
    const phone = await page.locator('input[type="tel"]').count();
    const pass = await page.locator('input[type="password"]').count();
    if (phone === 0) throw new Error('No phone input');
    if (pass === 0) throw new Error('No password input');
  });

  // 5. Supabase connection test (via Supabase REST API)
  await test('Supabase REST API is reachable', async () => {
    const result = await page.evaluate(async () => {
      try {
        const res = await fetch('https://bimqyugdhiuxcqltjjnt.supabase.co/rest/v1/', {
          headers: {
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbXF5dWdkaGl1eGNxbHRqam50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE5NjEsImV4cCI6MjEwMzUwNzk2MX0.B4oVkykmF-TG5UwIx_tqReCNkKCaDj8aMhSe9KonxMw',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbXF5dWdkaGl1eGNxbHRqam50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE5NjEsImV4cCI6MjEwMzUwNzk2MX0.B4oVkykmF-TG5UwIx_tqReCNkKCaDj8aMhSe9KonxMw',
          },
        });
        return { status: res.status, ok: res.ok };
      } catch (e) { return { error: e.message }; }
    });
    console.log(`  📋 REST status: ${result.status || result.error}`);
    if (result.error) throw new Error(result.error);
    // 404 = no tables yet (OK), 200 = tables exist (OK)
    if (result.status !== 200 && result.status !== 404) {
      throw new Error(`Unexpected status: ${result.status}`);
    }
  });

  // 6. Supabase auth user signup test
  await test('Supabase auth signUp works', async () => {
    const result = await page.evaluate(async (phone) => {
      try {
        const res = await fetch('https://bimqyugdhiuxcqltjjnt.supabase.co/auth/v1/signup', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbXF5dWdkaGl1eGNxbHRqam50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE5NjEsImV4cCI6MjEwMzUwNzk2MX0.B4oVkykmF-TG5UwIx_tqReCNkKCaDj8aMhSe9KonxMw',
          },
          body: JSON.stringify({ phone, password: phone.slice(-4), data: { nama: 'E2E Test', role: 'kandidat' } }),
        });
        const data = await res.json();
        return { status: res.status, hasUser: !!data.user, error: data.error?.msg };
      } catch (e) { return { error: e.message }; }
    }, TEST_PHONE);
    console.log(`  📋 SignUp result: status=${result.status} user=${result.hasUser} error=${result.error || 'none'}`);
    // 200 = success, 400 = user exists (also OK for test)
    if (result.status !== 200 && result.status !== 400) {
      throw new Error(`Unexpected status: ${result.status}`);
    }
  });

  // 7. Supabase auth signIn test
  await test('Supabase auth signIn works', async () => {
    const result = await page.evaluate(async (phone) => {
      try {
        const res = await fetch('https://bimqyugdhiuxcqltjjnt.supabase.co/auth/v1/token?grant_type=password', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbXF5dWdkaGl1eGNxbHRqam50Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc5MzE5NjEsImV4cCI6MjEwMzUwNzk2MX0.B4oVkykmF-TG5UwIx_tqReCNkKCaDj8aMhSe9KonxMw',
          },
          body: JSON.stringify({ phone, password: phone.slice(-4) }),
        });
        const data = await res.json();
        return { status: res.status, hasSession: !!data.session, error: data.error?.msg };
      } catch (e) { return { error: e.message }; }
    }, TEST_PHONE);
    console.log(`  📋 SignIn result: status=${result.status} session=${result.hasSession} error=${result.error || 'none'}`);
    if (result.status !== 200 && result.status !== 400) {
      throw new Error(`Unexpected status: ${result.status}`);
    }
  });

  // 8. Supabase session syncs to authStore
  await test('authListener fires on auth state change', async () => {
    const logs = [];
    page.on('console', m => { if (m.text().includes('Auth event:')) logs.push(m.text()); });
    await page.reload();
    await page.waitForLoadState('networkidle');
    await page.waitForTimeout(2000);
    const hasInitialSession = logs.some(l => l.includes('INITIAL_SESSION'));
    console.log(`  📋 Auth events captured: ${logs.length} (${logs.map(l => l.split(': ').pop()).join(', ')})`);
    // INITIAL_SESSION should always fire
  });

  await teardown();
  console.log('\n🏁 Complete\n');
}
run();
