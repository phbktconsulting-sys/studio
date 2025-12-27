
'use server';
/**
 * @fileOverview A server-side flow for generating a quotation PDF from a set of tasks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generatePdfFromHtml } from '@/services/image-generation-service';
import { QuotationTaskSchema } from '@/lib/types';


const GenerateQuotationInputSchema = z.object({
  customerName: z.string(),
  customerPhone: z.string(),
  customerBusinessName: z.string().optional(),
  customerAddress: z.string().optional(),
  tasks: z.array(QuotationTaskSchema),
});

const GenerateQuotationOutputSchema = z.object({
  pdfUrl: z.string().optional(),
  error: z.string().optional(),
});

export async function generateQuotation(
  payload: z.infer<typeof GenerateQuotationInputSchema>
): Promise<z.infer<typeof GenerateQuotationOutputSchema>> {
  return generateQuotationFlow(payload);
}

function generateQuotationHtml(payload: z.infer<typeof GenerateQuotationInputSchema>): string {
  const currentDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 15);
  const validUntil = validUntilDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const subtotal = payload.tasks.reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const tasksHtml = payload.tasks.map(task => `
    <tr>
      <td>${task.item}</td>
      <td>${task.description || ''}</td>
      <td class="text-center">${task.quantity}</td>
      <td class="text-right">₹${task.unitPrice.toFixed(2)}</td>
      <td class="text-right">₹${(task.quantity * task.unitPrice).toFixed(2)}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Quotation</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;700&display=swap');
        body { font-family: 'Roboto', sans-serif; margin: 0; padding: 0; background-color: #fff; color: #333; font-size: 12px; }
        .container { max-width: 800px; margin: 20px auto; padding: 20px; border: 1px solid #eee; box-shadow: 0 0 10px rgba(0,0,0,0.1); }
        .header { display: flex; justify-content: space-between; align-items: flex-start; padding-bottom: 20px; border-bottom: 2px solid #333; }
        .header .company-details { text-align: left; }
        .header .company-details h1 { margin: 0; font-size: 24px; color: #000; }
        .header .company-details p { margin: 2px 0; }
        .header .quote-details { text-align: right; }
        .header .quote-details h2 { margin: 0; font-size: 28px; color: #333; }
        .header .quote-details p { margin: 2px 0; }
        .client-details { display: flex; justify-content: space-between; padding: 20px 0; }
        .table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        .table th, .table td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        .table th { background-color: #f2f2f2; font-weight: bold; }
        .table td.text-center { text-align: center; }
        .table td.text-right { text-align: right; }
        .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
        .summary table { width: 40%; border-collapse: collapse; }
        .summary th, .summary td { padding: 8px; }
        .summary .grand-total { font-weight: bold; font-size: 14px; background-color: #f2f2f2; }
        .terms { margin-top: 30px; border-top: 1px solid #eee; padding-top: 15px; }
        .terms h3 { margin-top: 0; font-size: 14px; }
        .terms ul { padding-left: 20px; margin: 10px 0 0; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 2px solid #333; display: flex; justify-content: space-between; font-size: 12px; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <div class="company-details">
            <h1>[YOUR COMPANY NAME]</h1>
            <p>[Your Address Line 1], [City, State, Zip Code]</p>
            <p>[Phone Number] | [Email Address] | [Website URL]</p>
          </div>
          <div class="quote-details">
            <h2>QUOTATION</h2>
            <p><strong>Date:</strong> ${currentDate}</p>
            <p><strong>Quote #:</strong> Q-${Date.now()}</p>
            <p><strong>Valid Until:</strong> ${validUntil}</p>
          </div>
        </div>
        <div class="client-details">
          <div>
            <p><strong>Quotation For:</strong></p>
            <p>${payload.customerName}</p>
            <p>${payload.customerBusinessName || ''}</p>
            <p>${payload.customerAddress || ''}</p>
            <p>Phone: ${payload.customerPhone}</p>
          </div>
        </div>
        <table class="table">
          <thead>
            <tr>
              <th>Item / Service</th>
              <th>Description</th>
              <th class="text-center">Qty / Hours</th>
              <th class="text-right">Unit Price</th>
              <th class="text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            ${tasksHtml}
          </tbody>
        </table>
        <div class="summary">
          <table>
            <tr>
              <td>Subtotal</td>
              <td class="text-right">₹${subtotal.toFixed(2)}</td>
            </tr>
            <tr>
              <td>Discount</td>
              <td class="text-right">₹0.00</td>
            </tr>
            <tr>
              <td>Tax (GST/VAT @ 18%)</td>
              <td class="text-right">₹${tax.toFixed(2)}</td>
            </tr>
            <tr class="grand-total">
              <td>GRAND TOTAL</td>
              <td class="text-right">₹${grandTotal.toFixed(2)}</td>
            </tr>
          </table>
        </div>
        <div class="terms">
          <h3>Terms & Conditions</h3>
          <ul>
            <li>This quotation is valid for 15 days from the date of issue.</li>
            <li>50% advance payment is required to commence the project.</li>
            <li>Remaining balance is due upon project completion.</li>
            <li>Any additional requirements not listed above will be charged separately.</li>
          </ul>
        </div>
        <div class="footer">
          <div style="width: 45%;">
            <p>Thank you for your business!</p>
            <br/><br/><br/>
            <hr style="border-top: 1px solid #333;"/>
            <p style="text-align: center;">Client Signature</p>
          </div>
          <div style="width: 45%;">
            <p>&nbsp;</p>
            <br/><br/><br/>
            <hr style="border-top: 1px solid #333;"/>
            <p style="text-align: center;">Authorized Signature</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}


const generateQuotationFlow = ai.defineFlow(
  {
    name: 'generateQuotationFlow',
    inputSchema: GenerateQuotationInputSchema,
    outputSchema: GenerateQuotationOutputSchema,
  },
  async (payload) => {
    try {
      const htmlContent = generateQuotationHtml(payload);
      const pdfUrl = await generatePdfFromHtml(htmlContent);

      return { pdfUrl };

    } catch (error: any) {
      console.error('Error in generateQuotationFlow:', error);
      return { error: error.message || 'An unexpected error occurred.' };
    }
  }
);
