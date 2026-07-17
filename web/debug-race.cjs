const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const responses = [];
  page.on('response', async (res) => {
    if (res.url().includes('/friendships') && res.request().method() === 'POST') {
      responses.push({ status: res.status(), body: await res.text().catch(() => 'N/A') });
    }
  });

  await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle' });
  await page.fill('#identifier', 'hassan.ali@stud.srh.edu');
  await page.fill('#password', 'Password123!');
  await page.click('button[type="submit"]');
  await page.waitForURL('**/my-circle', { timeout: 10000 });
  console.log('Logged in as Hassan');

  await page.click('a:has-text("FRIENDS")');
  await page.waitForSelector('text=ADD A FRIEND');

  const options = await page.locator('.friends-add__select option').allTextContents();
  const candidate = options.find((o) => o !== 'Select a student…');
  console.log('Target candidate:', candidate);
  await page.selectOption('.friends-add__select', { label: candidate });

  // Rapid-fire click the send button 3 times without waiting, simulating an impatient double-click
  const btn = page.locator('button:has-text("SEND REQUEST")');
  await Promise.all([btn.click(), btn.click(), btn.click()]);
  await page.waitForTimeout(2000);

  console.log('Responses:', JSON.stringify(responses, null, 2));

  await browser.close();
})().catch((err) => {
  console.error('DEBUG FAILED:', err);
  process.exit(1);
});
