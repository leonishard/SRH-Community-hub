const { chromium } = require('playwright');
const path = require('path');

const SHOT_DIR = path.join(__dirname, '..', '..', 'verify-shots');
require('fs').mkdirSync(SHOT_DIR, { recursive: true });

const consoleErrors = [];

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
      console.log('CONSOLE ERROR:', msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(`pageerror: ${err.message}`);
    console.log('PAGE ERROR:', err.message);
  });
  page.on('requestfailed', (req) => {
    console.log('REQUEST FAILED:', req.url(), req.failure()?.errorText);
  });
  page.on('response', (res) => {
    if (res.url().includes('localhost:1337') && res.status() >= 400) {
      console.log('API ERROR RESPONSE:', res.status(), res.url());
    }
  });

  // 1. Root -> should redirect to /login
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  await page.waitForURL('**/login');
  await page.screenshot({ path: path.join(SHOT_DIR, '1-login.png') });
  console.log('STEP 1 OK: redirected to', page.url());

  // 2. Log in as elena
  await page.fill('#identifier', 'elena.rossi@stud.srh.edu');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-circle', { timeout: 10000 });
  console.log('Arrived at my-circle, current URL:', page.url());
  await page.screenshot({ path: path.join(SHOT_DIR, '2a-my-circle-arrived.png'), fullPage: true });
  await page.waitForSelector('text=ACTIVITY', { timeout: 10000 });
  await page.waitForTimeout(500); // let the activity fetch resolve
  await page.screenshot({ path: path.join(SHOT_DIR, '2-my-circle-dark.png'), fullPage: true });
  console.log('STEP 2 OK: logged in, my-circle rendered');

  const bodyText = await page.textContent('body');
  console.log('MY CIRCLE MENTIONS GROUPS:', /Member of/.test(bodyText), bodyText.match(/Member of[^\n]*/)?.[0]);
  console.log('HAS LEDGER ENTRIES:', (await page.$$('.ledger-entry')).length);

  // 3. Toggle theme
  await page.click('button:has-text("LIGHT MODE"), button:has-text("DARK MODE")');
  await page.waitForTimeout(300);
  const theme = await page.getAttribute('html', 'data-theme');
  await page.screenshot({ path: path.join(SHOT_DIR, '3-theme-toggled.png'), fullPage: true });
  console.log('STEP 3 OK: theme is now', theme);

  // 4. Nav to stub pages
  for (const label of ['Discover', 'Groups', 'Events']) {
    await page.click(`a:has-text("${label.toUpperCase()}")`);
    await page.waitForSelector(`h1:has-text("${label}")`);
    console.log(`STEP 4 OK: ${label} stub rendered`);
  }
  await page.screenshot({ path: path.join(SHOT_DIR, '4-events-stub.png') });

  // 5. Log out
  await page.click('button:has-text("LOG OUT")');
  await page.waitForURL('**/login', { timeout: 10000 });
  console.log('STEP 5 OK: logged out, back at', page.url());

  console.log('\nCONSOLE ERRORS:', consoleErrors.length ? consoleErrors : 'none');

  await browser.close();
})().catch((err) => {
  console.error('VERIFY SCRIPT FAILED:', err);
  process.exit(1);
});
