const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('response', async (res) => {
    if (res.url().includes('/friendships') && res.request().method() === 'PUT') {
      console.log('PUT RESPONSE:', res.status(), await res.text().catch(() => 'N/A'));
    }
  });

  // Alice should have a pending incoming request from Grace (created earlier in this debug session)
  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#identifier', 'alice.coordinator@srh.edu');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-circle', { timeout: 10000 });
  console.log('Logged in as Alice');

  await page.click('a:has-text("FRIENDS")');
  await page.waitForSelector('text=ADD A FRIEND');
  await page.waitForTimeout(500);

  const requestsHtml = await page.locator('.friends-section', { hasText: 'REQUESTS' }).innerHTML().catch(() => 'NO REQUESTS SECTION FOUND');
  console.log('REQUESTS SECTION HTML:\n', requestsHtml);

  const acceptButtons = await page.locator('button:has-text("ACCEPT")').count();
  console.log('Number of ACCEPT buttons visible:', acceptButtons);

  if (acceptButtons > 0) {
    await page.locator('button:has-text("ACCEPT")').first().click();
    await page.waitForTimeout(1500);
    const friendsHtml = await page.locator('.friends-section', { hasText: 'YOUR FRIENDS' }).innerHTML().catch(() => 'NO SECTION');
    console.log('YOUR FRIENDS SECTION HTML AFTER ACCEPT:\n', friendsHtml);
  }

  await browser.close();
})().catch((err) => {
  console.error('DEBUG FAILED:', err);
  process.exit(1);
});
