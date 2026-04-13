const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

(async () => {
  // Ensure temp directory exists
  const tempDir = '/Users/leven/space/react/deer-flow/temp';
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  
  try {
    // Navigate to login page
    console.log('Navigating to login page...');
    await page.goto('http://localhost:8787', { waitUntil: 'networkidle', timeout: 15000 });
    
    // Fill login credentials - try different selectors
    console.log('Filling login credentials...');
    const emailSelectors = [
      'input[type="email"]', 
      'input[name="email"]',
      'input[placeholder*="email"]',
      '#email'
    ];
    
    const passwordSelectors = [
      'input[type="password"]', 
      'input[name="password"]',
      'input[placeholder*="password"]',
      '#password'
    ];
    
    const buttonSelectors = [
      'button[type="submit"]',
      'button:has-text("Login")',
      'button:has-text("登录")',
      '[role="button"]:has-text("Login")',
      '[role="button"]:has-text("登录")'
    ];
    
    // Find and fill email
    let filledEmail = false;
    for (const selector of emailSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.fill(selector, 'admin@163.com');
        filledEmail = true;
        break;
      } catch (e) {}
    }
    
    if (!filledEmail) {
      throw new Error('Could not find email input field');
    }
    
    // Find and fill password
    let filledPassword = false;
    for (const selector of passwordSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.fill(selector, 'admin123');
        filledPassword = true;
        break;
      } catch (e) {}
    }
    
    if (!filledPassword) {
      throw new Error('Could not find password input field');
    }
    
    // Click login button
    let clickedButton = false;
    for (const selector of buttonSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        clickedButton = true;
        break;
      } catch (e) {}
    }
    
    if (!clickedButton) {
      throw new Error('Could not find login button');
    }
    
    // Wait for navigation after login
    console.log('Waiting for login...');
    await page.waitForNavigation({ waitUntil: 'networkidle', timeout: 15000 });
    
    // Navigate to target page
    console.log('Navigating to target page...');
    await page.goto(
      'http://localhost:8787/workspace/notebooks/nb_48296b8e06b04503/chats/d8afeb78-a32f-497e-91d2-db9f6b44c921',
      { waitUntil: 'networkidle', timeout: 15000 }
    );
    
    // Wait for dynamic content and tabs to render
    console.log('Waiting for content to render...');
    await page.waitForTimeout(3000);
    
    // Find and click the "资料" tab
    console.log('Looking for "资料" tab...');
    const tabSelectors = [
      '[role="tab"]:has-text("资料")',
      'div:has-text("资料")',
      'button:has-text("资料")',
      '[data-tab="资料"]',
      'a:has-text("资料")'
    ];
    
    let clickedTab = false;
    for (const selector of tabSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 2000 });
        await page.click(selector);
        clickedTab = true;
        console.log('Clicked "资料" tab successfully');
        break;
      } catch (e) {}
    }
    
    if (!clickedTab) {
      // If we can't find by text, try to find any tabs and log what's available
      const tabs = await page.$$('[role="tab"]');
      console.log(`Found ${tabs.length} tabs`);
      for (const tab of tabs) {
        const text = await tab.innerText();
        console.log(`  Tab text: "${text}"`);
      }
      throw new Error('Could not find "资料" tab');
    }
    
    // Wait for tab content to load
    await page.waitForTimeout(2000);
    
    // Look for upload button
    console.log('Looking for upload button...');
    const uploadSelectors = [
      'button:has-text("上传")',
      'button:has-text("Upload")',
      '[role="button"]:has-text("上传")',
      '[role="button"]:has-text("Upload")',
      'input[type="file"]',
      '[data-testid="upload-button"]'
    ];
    
    let foundUpload = false;
    for (const selector of uploadSelectors) {
      try {
        await page.waitForSelector(selector, { timeout: 1500 });
        foundUpload = true;
        console.log(`Found upload element with selector: ${selector}`);
        break;
      } catch (e) {}
    }
    
    if (!foundUpload) {
      console.log('Warning: Could not find upload button with common selectors');
    } else {
      // Create a test file to upload
      const testFilePath = path.join(tempDir, 'test-upload.txt');
      fs.writeFileSync(testFilePath, 'This is a test file for upload testing.\nCreated by automation script.\n');
      
      // Try to find file input and set it
      const fileInput = await page.$('input[type="file"]');
      if (fileInput) {
        console.log('Found file input, setting test file...');
        await fileInput.setInputFiles(testFilePath);
        await page.waitForTimeout(2000); // Wait for file list to render
        console.log('Test file added to file list');
      }
    }
    
    // Take screenshot
    const screenshotPath = '/Users/leven/space/react/deer-flow/temp/upload-test.png';
    await page.screenshot({ path: screenshotPath, fullPage: true });
    
    console.log(`✅ Screenshot saved to: ${screenshotPath}`);
    const title = await page.title();
    console.log(`Page loaded successfully. Title: "${title}"`);
    
  } catch (error) {
    console.error('❌ Error during automation:', error.message);
    
    // Take error screenshot
    const errorScreenshotPath = '/Users/leven/space/react/deer-flow/temp/error-screenshot.png';
    try {
      await page.screenshot({ path: errorScreenshotPath, fullPage: true });
      console.log(`Error screenshot saved to: ${errorScreenshotPath}`);
    } catch (e) {}
    
    throw error;
  } finally {
    await browser.close();
  }
})();
