'use server';
/**
 * @fileOverview A server-side flow for generating a quotation PDF from a set of tasks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generatePdfFromHtml } from '@/services/image-generation-service';
import { googleAI } from '@genkit-ai/google-genai';
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

const quotationHtmlPrompt = ai.definePrompt({
    name: 'quotationHtmlPrompt',
    model: googleAI.model('gemini-1.5-flash-latest'),
    input: { schema: GenerateQuotationInputSchema.extend({
        currentDate: z.string(),
    })},
    output: { format: 'text' },
    prompt: `
      You are an expert HTML and CSS developer tasked with creating a professional quotation document.
      Generate a single, self-contained HTML file with inline CSS for a quotation, closely following the template provided.

      **Template and Requirements:**
      - The entire output MUST be a single HTML file with inline CSS within a <style> tag.
      - Use professional fonts and a clean, modern layout.
      - **Company Details (Header):**
        - Company Name: "[YOUR COMPANY NAME]"
        - Address: "[Your Address Line 1]", "[City, State, Zip Code]"
        - Contact: "[Phone Number] | [Email Address] | [Website URL]"
      - **Quotation Details:**
        - Title: "QUOTATION"
        - Date: {{{currentDate}}}
        - Quote #: Q-{{#each tasks}}{{@index}}{{/each}}-{{tasks.length}}
        - Valid Until: 15 days from the current date.
      - **Client Details:**
        - Quotation For: {{{customerName}}}
        - Business: {{{customerBusinessName}}}
        - Address: {{{customerAddress}}}
        - Phone: {{{customerPhone}}}
      - **Project/Product Details (Table):**
        - Create a table with columns: 'Item / Service', 'Description', 'Qty / Hours', 'Unit Price', 'Total'.
        - Use the exact tasks provided below to create the rows.
        - 'Total' is 'Unit Price' * 'Qty / Hours'.
      - **Financial Summary:**
        - **Subtotal:** Sum of all 'Total' values from the table.
        - **Discount:** 0
        - **Tax (GST/VAT @ 18%):** Calculate 18% tax on (Subtotal - Discount).
        - **GRAND TOTAL:** (Subtotal - Discount) + Tax.
       - **Terms & Conditions:**
        - This quotation is valid for 15 days from the date of issue.
        - 50% advance payment is required to commence the project.
        - Remaining balance is due upon project completion.
        - Any additional requirements not listed above will be charged separately.
      - **Acceptance:**
        - Include a "Thank you for your business!" message.
        - Create two signature areas at the bottom, one for "Client Signature" and one for "Authorized Signature", with a line above each for the signature.

      **Tasks to include in the table:**
      {{#each tasks}}
      - Item: {{{this.item}}}, Description: {{{this.description}}}, Quantity: {{{this.quantity}}}, Unit Price: {{{this.unitPrice}}}
      {{/each}}

      Your response must be only the HTML code, starting with <!DOCTYPE html> and ending with </html>.
    `,
});


const generateQuotationFlow = ai.defineFlow(
  {
    name: 'generateQuotationFlow',
    inputSchema: GenerateQuotationInputSchema,
    outputSchema: GenerateQuotationOutputSchema,
  },
  async (payload) => {
    try {
      const { output: htmlContent } = await quotationHtmlPrompt({
        ...payload,
        currentDate: new Date().toLocaleDateString('en-GB', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      });

      if (!htmlContent) {
        throw new Error('AI failed to generate HTML content for the quotation.');
      }
      
      const pdfUrl = await generatePdfFromHtml(htmlContent);

      return { pdfUrl };

    } catch (error: any) {
      console.error('Error in generateQuotationFlow:', error);
      return { error: error.message || 'An unexpected error occurred.' };
    }
  }
);
