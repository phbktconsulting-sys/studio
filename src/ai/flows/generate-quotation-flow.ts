'use server';
/**
 * @fileOverview A server-side flow for generating a quotation image from a set of tasks.
 */
import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { generateImageFromHtml } from '@/services/image-generation-service';
import { googleAI } from '@genkit-ai/google-genai';

const GenerateQuotationInputSchema = z.object({
  process: z.string(),
  tasks: z.array(z.string()),
  customerName: z.string(),
});

const GenerateQuotationOutputSchema = z.object({
  imageUrl: z.string().optional(),
  error: z.string().optional(),
});

export async function generateQuotation(
  payload: z.infer<typeof GenerateQuotationInputSchema>
): Promise<z.infer<typeof GenerateQuotationOutputSchema>> {
  return generateQuotationFlow(payload);
}

const quotationHtmlPrompt = ai.definePrompt({
    name: 'quotationHtmlPrompt',
    model: googleAI.model('gemini-1.5-flash'),
    input: { schema: z.object({
        process: z.string(),
        tasks: z.array(z.string()),
        customerName: z.string(),
        currentDate: z.string(),
    })},
    output: { format: 'text' },
    prompt: `
      You are an expert HTML and CSS developer tasked with creating a professional quotation document.
      Generate a single, self-contained HTML file with inline CSS for a quotation.

      **Requirements:**
      - The entire output MUST be a single HTML file.
      - Use inline CSS within a <style> tag in the <head>. Do NOT use external stylesheets.
      - The design should be clean, professional, and modern. Use a professional font like 'Inter' or 'Helvetica'.
      - The quotation should be addressed to: {{{customerName}}}.
      - The quotation date should be: {{{currentDate}}}.
      - The main service category is: {{{process}}}.
      - The document should contain a table listing the selected services/tasks.
      - The table should have three columns: 'Service/Task Description', 'Quantity', and 'Unit Price (USD)'.
      - For each task in the list below, create a row in the table.
      - Assign a Quantity of '1' for each task.
      - Generate a realistic but not excessively high 'Unit Price' for each task. The price should be a whole number.
      - Calculate and display a 'Total Amount' at the bottom of the table.
      - Include a professional header with a placeholder for a company logo and company details (PHBKT Group Limited).
      - Include a professional footer with contact information and "Thank you for your business!".

      **Tasks to include:**
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
        currentDate: new Date().toLocaleDateString('en-US', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        }),
      });

      if (!htmlContent) {
        throw new Error('AI failed to generate HTML content for the quotation.');
      }
      
      const imageUrl = await generateImageFromHtml(htmlContent);

      return { imageUrl };

    } catch (error: any) {
      console.error('Error in generateQuotationFlow:', error);
      return { error: error.message || 'An unexpected error occurred.' };
    }
  }
);
