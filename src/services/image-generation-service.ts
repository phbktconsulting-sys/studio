'use server';

import puppeteer from 'puppeteer';

export async function generatePdfFromHtml(htmlContent: string): Promise<string> {
  let browser;
  try {
    browser = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox'],
    });
    
    const page = await browser.newPage();
    
    // Set the HTML content for the page.
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    
    // Generate a PDF from the page content.
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
    });
    
    return `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;

  } catch (error: any) {
    console.error("Error generating PDF from HTML with Puppeteer:", error);
    throw new Error(`Failed to generate PDF: ${error.message}`);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
