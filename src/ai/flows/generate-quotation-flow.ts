
'use server';
/**
 * @fileOverview A server-side flow for generating a quotation PDF from a set of tasks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generatePdfFromHtml } from '@/services/image-generation-service';
import { QuotationFormSchema, QuotationTaskSchema } from '@/lib/types';


const GenerateQuotationInputSchema = QuotationFormSchema;

const GenerateQuotationOutputSchema = z.object({
  pdfUrl: z.string().optional(),
  error: z.string().optional(),
});

export async function generateQuotation(
  payload: z.infer<typeof GenerateQuotationInputSchema>
): Promise<z.infer<typeof GenerateQuotationOutputSchema>> {
  const transformedPayload = {
    ...payload,
    tasks: payload.tasks.map(t => ({...t, quantity: Number(t.quantity), unitPrice: Number(t.unitPrice)}))
  }
  return generateQuotationFlow(transformedPayload);
}

function generateQuotationHtml(payload: z.infer<typeof GenerateQuotationInputSchema>): string {
  const currentDate = new Date();
  const formattedDate = currentDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const formattedTime = currentDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

  const validUntilDate = new Date();
  validUntilDate.setDate(validUntilDate.getDate() + 15);
  const validUntil = validUntilDate.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });

  const subtotal = payload.tasks.reduce((acc, task) => acc + (task.quantity * task.unitPrice), 0);
  const tax = subtotal * 0.18;
  const grandTotal = subtotal + tax;

  const tasksHtml = payload.tasks.map(task => `
    <tr class="item-row">
      <td>
        <p class="font-bold">${task.item}</p>
        <p class="text-muted-foreground">${task.description || ''}</p>
      </td>
      <td class="text-center">${task.quantity}</td>
      <td class="text-right">₹${task.unitPrice.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td class="text-right">₹${(task.quantity * task.unitPrice).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
    </tr>
  `).join('');

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>Quotation</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;700&display=swap');
        body { 
          font-family: 'Inter', sans-serif; 
          margin: 0; 
          padding: 20px; 
          background-color: #fff; 
          color: #111827; 
          font-size: 10px;
        }
        .container { 
          max-width: 800px; 
          margin: auto;
        }
        .meta-header {
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #6b7280;
          margin-bottom: 20px;
        }
        .header { 
          display: flex; 
          justify-content: space-between; 
          align-items: flex-start; 
          padding-bottom: 15px; 
          border-bottom: 1px solid #e5e7eb;
        }
        .header .company-details h1 { 
          margin: 0 0 5px; 
          font-size: 18px; 
          font-weight: 700;
          color: #000; 
        }
        .header .company-details p { 
          margin: 0; 
          line-height: 1.5;
        }
        .header .quote-details { text-align: right; }
        .header .quote-details h2 { 
          margin: 0 0 10px; 
          font-size: 24px;
          font-weight: 700; 
          color: #374151; 
        }
        .header .quote-details p { 
          margin: 2px 0; 
          font-size: 10px;
          font-weight: 500;
        }
        .client-details { padding: 20px 0; }
        .client-details h3 { 
            margin: 0 0 8px;
            font-size: 10px;
            font-weight: 700;
            color: #374151;
        }
         .client-details p { margin: 2px 0; }
        .table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        .table th {
          background-color: #f3f4f6;
          padding: 10px;
          text-align: left;
          font-weight: 700;
          border-bottom: 1px solid #e5e7eb;
        }
        .table td { 
          padding: 10px; 
          vertical-align: top;
        }
        .table .item-row { border-bottom: 1px solid #e5e7eb; }
        .table .item-row:last-child { border-bottom: none; }

        .table th:first-child, .table td:first-child { width: 50%; }
        .table .text-center { text-align: center; }
        .table .text-right { text-align: right; }
        .font-bold { font-weight: 700; }
        .text-muted-foreground { color: #6b7280; }
        
        .summary { display: flex; justify-content: flex-end; margin-top: 20px; }
        .summary table { width: 40%; }
        .summary td { padding: 5px 0; }
        .summary .total-row td {
            padding-top: 10px;
            border-top: 2px solid #111827;
            font-weight: 700;
            font-size: 12px;
        }
        .summary .text-right { text-align: right; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="meta-header">
            <span>${formattedDate}, ${formattedTime}</span>
            <span>Business Quotation</span>
        </div>
        <div class="header">
          <div class="company-details">
            <h1>[YOUR COMPANY NAME]</h1>
            <p>123 Business Road, Tech Park</p>
            <p>Pune, Maharashtra, 411057</p>
            <p>Email: contact@yourbusiness.com | Phone: +91 98765 43210</p>
          </div>
          <div class="quote-details">
            <h2>QUOTATION</h2>
            <p><strong>Date:</strong> ${formattedDate}</p>
            <p><strong>Quote #:</strong> Q-${new Date().getFullYear()}-${String(Date.now()).slice(-5)}</p>
            <p><strong>Valid Until:</strong> ${validUntil}</p>
          </div>
        </div>

        <div class="client-details">
          <h3>Quotation For:</h3>
          <p>${payload.customerName}</p>
          ${payload.customerBusinessName ? `<p>${payload.customerBusinessName}</p>` : ''}
          <p>${payload.customerAddress || ''}</p>
        </div>

        <table class="table">
          <thead>
            <tr>
              <th>Description</th>
              <th class="text-center">Quantity</th>
              <th class="text-right">Unit Price (₹)</th>
              <th class="text-right">Total (₹)</th>
            </tr>
          </thead>
          <tbody>
            ${tasksHtml}
          </tbody>
        </table>

        <div class="summary">
          <table>
            <tbody>
              <tr>
                <td>Subtotal:</td>
                <td class="text-right">₹${subtotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr>
                <td>Tax (18% GST):</td>
                <td class="text-right">₹${tax.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
              <tr class="total-row">
                <td>TOTAL:</td>
                <td class="text-right">₹${grandTotal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
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
