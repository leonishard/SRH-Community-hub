const { chromium } = require('playwright');
const path = require('path');

const SHOT_DIR = path.join(__dirname, '..', '..', 'verify-shots2');
require('fs').mkdirSync(SHOT_DIR, { recursive: true });

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('console', (msg) => {
    if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text());
  });
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));

  // 1. Visit root with NO auth -> should land on /discover, not /login
  await page.goto('http://localhost:5173/', { waitUntil: 'networkidle' });
  console.log('STEP 1: unauthenticated root ->', page.url());
  await page.screenshot({ path: path.join(SHOT_DIR, '1-guest-discover.png'), fullPage: true });

  // Sidebar should show Guest + Sign in
  const sidebarText = await page.textContent('.sidebar__footer');
  console.log('SIDEBAR (guest):', sidebarText.replace(/\s+/g, ' ').trim());

  // 2. Groups and Events should be browsable without login
  await page.click('a:has-text("GROUPS")');
  await page.waitForSelector('h1:has-text("Groups")');
  console.log('STEP 2: Groups reachable unauthenticated ->', page.url());

  await page.click('a:has-text("EVENTS")');
  await page.waitForSelector('h1:has-text("Events")');
  console.log('STEP 3: Events reachable unauthenticated ->', page.url());

  // 3. My Circle should redirect to /login when logged out
  await page.click('a:has-text("MY CIRCLE")');
  await page.waitForURL('**/login', { timeout: 5000 });
  console.log('STEP 4: My Circle redirected to login ->', page.url());
  await page.screenshot({ path: path.join(SHOT_DIR, '2-redirected-login.png') });

  // 4. Log in from here -> should bounce back to /my-circle (the page that redirected us)
  await page.fill('#identifier', 'elena.rossi@stud.srh.edu');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-circle', { timeout: 10000 });
  console.log('STEP 5: post-login landed on ->', page.url());

  // 5. Log out -> should return to /discover, sidebar back to guest state
  await page.click('button.sidebar__logout');
  await page.waitForTimeout(500);
  console.log('URL right after logout click:', page.url());
  await page.screenshot({ path: path.join(SHOT_DIR, '2b-after-logout-click.png'), fullPage: true });
  await page.waitForURL('**/discover', { timeout: 10000 });
  console.log('STEP 6: post-logout landed on ->', page.url());
  const sidebarAfterLogout = await page.textContent('.sidebar__footer');
  console.log('SIDEBAR (after logout):', sidebarAfterLogout.replace(/\s+/g, ' ').trim());
  await page.screenshot({ path: path.join(SHOT_DIR, '3-after-logout.png'), fullPage: true });

  await browser.close();
})().catch((err) => {
  console.error('VERIFY SCRIPT FAILED:', err);
  process.exit(1);
});
