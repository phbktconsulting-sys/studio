'use server';

import puppeteer from 'puppeteer';

export async function generateImageFromHtml(htmlContent: string): Promise<string> {
  let browser;
  try {
    // Launch Puppeteer. The 'new' headless mode is more modern.
    // The --no-sandbox arg is often required in containerized environments.
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set a viewport to define the size of the output image.
    await page.setViewport({ width: 800, height: 1100, deviceScaleFactor: 2 });
    
    // Set the HTML content for the page.
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Take a screenshot of the entire page and get it as a base64 encoded string.
    const imageBuffer = await page.screenshot({
      type: 'png',
      encoding: 'base64',
      fullPage: true,
    });
    
    return `data:image/png;base64,${imageBuffer}`;

  } catch (error: any) {
    console.error("Error generating image from HTML with Puppeteer:", error);
    throw new Error(`Failed to generate image: ${error.message}`);
  } finally {
    // Ensure the browser is closed even if an error occurs.
    if (browser) {
      await browser.close();
    }
  }
}
