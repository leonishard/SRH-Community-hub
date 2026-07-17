const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  page.on('pageerror', (err) => console.log('PAGE ERROR:', err.message));
  page.on('console', (msg) => { if (msg.type() === 'error') console.log('CONSOLE ERROR:', msg.text()); });
  page.on('request', (req) => {
    if (req.url().includes('/friendships') && req.method() === 'POST') {
      console.log('POST BODY:', req.postData());
    }
  });
  page.on('response', async (res) => {
    if (res.url().includes('/friendships') && res.request().method() === 'POST') {
      console.log('POST RESPONSE:', res.status(), await res.text().catch(() => 'N/A'));
    }
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#identifier', 'grace.adeyemi@stud.srh.edu');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-circle', { timeout: 10000 });
  console.log('Logged in as Grace');

  await page.click('a:has-text("FRIENDS")');
  await page.waitForSelector('text=ADD A FRIEND');

  const options = await page.locator('.friends-add__select option').allTextContents();
  const candidate = options.find((o) => o !== 'Select a student…');
  console.log('Sending friend request to:', candidate);
  await page.selectOption('.friends-add__select', { label: candidate });
  await page.click('button:has-text("SEND REQUEST")');
  await page.waitForTimeout(1500);

  await browser.close();
})().catch((err) => {
  console.error('DEBUG FAILED:', err);
  process.exit(1);
});
