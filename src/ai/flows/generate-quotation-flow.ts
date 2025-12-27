
'use server';
/**
 * @fileOverview A server-side flow for generating a quotation PDF from HTML content.
 *
 * - generateQuotationPdf - The exported function to be called from the client.
 */

import { ai } from '@/ai/genkit';
import { generatePdfFromHtml } from '@/services/image-generation-service';
import { z } from 'zod';
import { QuotationFormSchema } from '@/lib/types';


const GenerateQuotationOutputSchema = z.object({
  pdfDataUrl: z.string().optional(),
  error: z.string().optional(),
});

export async function generateQuotation(
  payload: z.infer<typeof QuotationFormSchema>
): Promise<z.infer<typeof GenerateQuotationOutputSchema>> {
  return generateQuotationFlow(payload);
}

const generateQuotationFlow = ai.defineFlow(
  {
    name: 'generateQuotationFlow',
    inputSchema: QuotationFormSchema,
    outputSchema: GenerateQuotationOutputSchema,
  },
  async (payload) => {
    try {
        const subtotal = payload.tasks.reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
        const tax = subtotal * 0.18;
        const grandTotal = subtotal + tax;

        const lineItemsHtml = payload.tasks.map(task => `
             <tr class="item-row-print">
                 <td>
                     <p class="font-bold-print">${task.item}</p>
                     <p class="text-muted-foreground-print">${task.description || ''}</p>
                 </td>
                 <td class="text-center">${task.quantity}</td>
                 <td class="text-right">₹${task.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                 <td class="text-right">₹${(task.quantity * task.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
             </tr>
        `).join('');

      const htmlContent = `
        <html>
          <head>
            <style>
              @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
              body { 
                font-family: 'Inter', sans-serif; 
                color: #111827; 
                font-size: 10px;
                width: 800px;
                margin: auto;
                padding: 40px;
                background-color: white;
              }
              .meta-header-print { display: flex; justify-content: space-between; font-size: 9px; color: #6b7280; margin-bottom: 20px; }
              .header-print { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 15px; border-bottom: 1px solid #e5e7eb; }
              .company-details-print { display: flex; align-items: center; gap: 16px; }
              .company-details-print .logo-print { height: 40px; width: 40px; }
              .company-details-print .company-name-print { font-size: 18px; font-weight: 700; color: #000; }
              .quote-details-print { text-align: right; }
              .quote-details-print h2 { margin: 0 0 10px; font-size: 24px; font-weight: 700; color: #374151; }
              .quote-details-print p { margin: 2px 0; font-size: 10px; font-weight: 500; }
              .client-details-print { padding: 20px 0; }
              .client-details-print h3 { margin: 0 0 8px; font-size: 10px; font-weight: 700; color: #374151; }
              .client-details-print p { margin: 2px 0; }
              .table-print { width: 100%; border-collapse: collapse; margin-top: 10px; }
              .table-print th { background-color: #f3f4f6; padding: 10px; text-align: left; font-weight: 700; border-bottom: 1px solid #e5e7eb; }
              .table-print td { padding: 10px; vertical-align: top; }
              .item-row-print { border-bottom: 1px solid #e5e7eb; }
              .table-print .text-center { text-align: center; }
              .table-print .text-right { text-align: right; }
              .font-bold-print { font-weight: 700; }
              .text-muted-foreground-print { color: #6b7280; }
              .summary-print { display: flex; justify-content: flex-end; margin-top: 20px; }
              .summary-print table { width: 40%; }
              .summary-print td { padding: 5px 0; }
              .total-row-print td { padding-top: 10px; border-top: 2px solid #111827; font-weight: 700; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="quotation-print">
                 <div class="meta-header-print">
                     <span>${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })}</span>
                     <span>Business Quotation</span>
                 </div>
                 <div class="header-print">
                     <div class="company-details-print">
                        <svg class="logo-print" viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
                          <g transform="translate(50,50)">
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(173 58% 39%)" transform="rotate(0)"/>
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(27 87% 67%)" transform="rotate(90)"/>
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(0 100% 25%)" transform="rotate(180)"/>
                            <path d="M0,0 L0,-50 A50,50 0 0,1 50,0 Z" fill="hsl(0 39% 47%)" transform="rotate(270)"/>
                          </g>
                        </svg>
                        <div>
                          <h1 class="company-name-print">PHBKT Group Limited</h1>
                          <p>123 Business Road, Tech Park</p>
                          <p>Pune, Maharashtra, 411057</p>
                          <p>Email: contact@phbkt.com | Phone: +91 98765 43210</p>
                        </div>
                     </div>
                     <div class="quote-details-print">
                         <h2>QUOTATION</h2>
                         <p><strong>Date:</strong> ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })}</p>
                         <p><strong>Quote #:</strong> Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}</p>
                         <p><strong>Valid Until:</strong> ${(() => { const d = new Date(); d.setDate(d.getDate() + 15); return d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' }); })()}</p>
                     </div>
                 </div>
                 <div class="client-details-print">
                     <h3>Quotation For:</h3>
                     <p>${payload.customerName}</p>
                     ${payload.customerBusinessName ? `<p>${payload.customerBusinessName}</p>` : ''}
                     <p>${payload.customerAddress}</p>
                 </div>
                 <table class="table-print">
                     <thead>
                         <tr>
                             <th>Description</th>
                             <th class="text-center">Quantity</th>
                             <th class="text-right">Unit Price (₹)</th>
                             <th class="text-right">Total (₹)</th>
                         </tr>
                     </thead>
                     <tbody>
                        ${lineItemsHtml}
                     </tbody>
                 </table>
                 <div class="summary-print">
                     <table>
                         <tbody>
                             <tr><td>Subtotal:</td><td class="text-right">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                             <tr><td>Tax (18% GST):</td><td class="text-right">₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                             <tr class="total-row-print"><td>TOTAL:</td><td class="text-right">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td></tr>
                         </tbody>
                     </table>
                 </div>
             </div>
          </body>
        </html>
      `;

      const pdfDataUrl = await generatePdfFromHtml(htmlContent);
      return { pdfDataUrl };
    } catch (e: any) {
      console.error('Flow Error:', e);
      return { error: e.message || 'An unexpected error occurred during PDF generation.' };
    }
  }
);
