
'use server';

import puppeteer from 'puppeteer-core';
import chromium from '@sparticuz/chromium-min';

export async function generatePdfFromHtml(htmlContent: string): Promise<string> {
  let browser;
  try {
    const executablePath = await chromium.executablePath(
      `https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar`
    );

    browser = await puppeteer.launch({
      args: chromium.args,
      defaultViewport: chromium.defaultViewport,
      executablePath,
      headless: chromium.headless,
    });

    const page = await browser.newPage();
    await page.setContent(htmlContent, { waitUntil: 'networkidle0' });
    const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
        margin: {
            top: '20px',
            right: '20px',
            bottom: '20px',
            left: '20px',
        }
    });
    return `data:application/pdf;base64,${pdfBuffer.toString('base64')}`;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF from HTML.');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}
