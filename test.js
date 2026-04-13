const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:8787/login');
  
  await page.type('input[name="email"]', 'admin@163.com');
  await page.type('input[name="password"]', 'admin123');
  
  await page.click('button[type="submit"]');
  
  await page.waitForNavigation();
  
  console.log('Logged in successfully, current URL:', page.url());

  // Navigate to the chat page
  await page.goto('http://localhost:8787/workspace/notebooks/nb_144105db66a04a86/chats/e687658f-7207-492a-a97e-cd4cdd1c0d00');

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));

  // Click on the artifact
  await page.click('.artifact-card'); // This is a generic selector, might need adjustment

  await page.waitForTimeout(2000); // Wait for potential errors to appear
  
  await browser.close();
})();