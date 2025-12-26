
'use server';
/**
 * @fileOverview A server-side flow for generating a quotation PDF from a set of tasks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generatePdfFromHtml } from '@/services/image-generation-service';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateQuotationInputSchema = z.object({
  process: z.string(),
  tasks: z.array(z.string()),
  customerName: z.string(),
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
    input: { schema: z.object({
        process: z.string(),
        tasks: z.array(z.string()),
        customerName: z.string(),
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
        - Placeholder for "[YOUR COMPANY NAME / LOGO]"
        - Address: "[Your Address Line 1]", "[City, State, Zip Code]"
        - Contact: "[Phone Number] | [Email Address] | [Website URL]"
      - **Quotation Details:**
        - Title: "QUOTATION"
        - Date: {{{currentDate}}}
        - Quote #: Generate a unique quote number, e.g., "Q-YYYY-####".
        - Valid Until: 15 days from the current date.
      - **Client Details:**
        - Quotation For: {{{customerName}}}
        - Placeholders for Client Address and Contact Name.
      - **Project/Product Details (Table):**
        - Create a table with columns: 'Item / Service', 'Description', 'Qty / Hours', 'Unit Price', 'Total'.
        - For each task provided below, create a row. The task text should be the 'Item / Service'.
        - The 'Description' should be a brief, plausible explanation of the task.
        - 'Qty / Hours' should be '1'.
        - 'Unit Price' should be a realistic but not excessively high whole number.
        - 'Total' is 'Unit Price' * 'Qty / Hours'.
      - **Financial Summary:**
        - **Subtotal:** Sum of all 'Total' values from the table.
        - **Discount:** Generate a reasonable discount (e.g., 5-10% of subtotal) if the subtotal is over 5000. Otherwise, show 0.
        - **Tax (GST/VAT @ 18%):** Calculate 18% tax on (Subtotal - Discount).
        - **GRAND TOTAL:** (Subtotal - Discount) + Tax.
      - **Terms and Conditions:**
        - **Validity:** 15 days from the date of issue.
        - **Payment Terms:** 50% Advance, 50% on completion.
        - **Timeline:** Placeholder for "[X] working days".
        - **Revisions:** Placeholder for "[Number]" rounds of revisions and hourly rate for additional changes.
        - **Exclusions:** Note on third-party costs.
      - **Acceptance:**
        - Include a section for signature and date.

      **Tasks to include in the table:**
      {{#each tasks}}
      - {{{this}}}
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
