const { test, expect } = require('@playwright/test');

test('login and screenshot target page', async ({ page }) => {
  // Navigate to login page
  await page.goto('http://localhost:8787');
  
  // Wait for login form to be visible
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 10000 });
  
  // Fill login credentials
  await page.fill('input[type="email"], input[name="email"]', 'admin@163.com');
  await page.fill('input[type="password"], input[name="password"]', 'admin123');
  
  // Click login button
  await page.click('button[type="submit"], button:has-text("Login"), button:has-text("登录")');
  
  // Wait for navigation after login
  await page.waitForNavigation({ timeout: 15000 });
  
  // Navigate to the target notebook chat page
  await page.goto('http://localhost:8787/workspace/notebooks/nb_48296b8e06b04503/chats/d8afeb78-a32f-497e-91d2-db9f6b44c921');
  
  // Wait for page to load completely
  await page.waitForLoadState('networkidle', { timeout: 15000 });
  
  // Wait a bit more for any dynamic content to render
  await page.waitForTimeout(3000);
  
  // Take a full page screenshot
  const screenshotPath = '/Users/leven/space/react/deer-flow/temp/screenshot-layout-test.png';
  await page.screenshot({ path: screenshotPath, fullPage: true });
  
  console.log(`Screenshot saved to: ${screenshotPath}`);
  
  // Verify page loaded successfully
  const title = await page.title();
  console.log(`Page title: ${title}`);
});
