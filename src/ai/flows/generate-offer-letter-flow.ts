'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { User } from '@/lib/types';
import { format } from 'date-fns';

const OfferLetterInputSchema = z.object({
  candidateName: z.string(),
  jobTitle: z.string(),
  // Add other fields from the User profile that are needed for the letter
});

const OfferLetterOutputSchema = z.object({
  offerLetterText: z.string().describe('The full, formatted text of the offer letter.'),
});
export type OfferLetterOutput = z.infer<typeof OfferLetterOutputSchema>;

export async function generateOfferLetter(user: User): Promise<OfferLetterOutput> {
  const input = {
    candidateName: user.displayName || '',
    jobTitle: user.jobTitle || 'Associate', // Provide a default if not present
    // Map other user fields here as needed
  };
  return generateOfferLetterFlow(input);
}

const prompt = ai.definePrompt({
  name: 'generateOfferLetterPrompt',
  input: { schema: OfferLetterInputSchema },
  output: { schema: OfferLetterOutputSchema },
  prompt: `
  Generate a formal offer letter for a new employee at PHBKT Group Limited.
  The output should be a single string containing the entire letter with professional formatting, including the company letterhead.
  Use today's date for the letter date.
  
  Here is the template to follow. Replace the bracketed placeholders with the provided information.

  [Your Company Letterhead]
  [Company Name, e.g., PHBKT Group Limited]
  [Company Address / Website / Email]
  
  Date: [${format(new Date(), 'dd/MM/yyyy')}]
  
  To,
  [{{candidateName}}]
  [Candidate Address]
  
  Subject: Offer of Employment
  
  Dear [{{candidateName}}],
  
  We are pleased to offer you the position of [{{jobTitle}}] at PHBKT Group Limited. We were impressed by your skills and believe you will be a valuable addition to our team.
  
  Here are the terms and conditions of your employment:
  
  1. Commencement Date: Your employment will commence on [Suggest a start date, e.g., one week from today]. You will report to the Director.
  
  2. Compensation: Your Annual Cost to Company (CTC) will be ₹[Suggest a competitive salary, e.g., 5,00,000] per annum.
     Monthly Gross Salary: ₹[Calculate monthly salary from CTC].
  
  3. Probation Period: You will be on a probation period of 6 months. Upon successful completion, your employment will be confirmed. During probation, the notice period for termination is 15 days.
  
  4. Working Hours: Your working hours will be 9:30 AM to 6:30 PM, Monday to Friday.
  
  5. Work Location: You will be working from our office located at [Company Address].
  
  6. Notice Period: After confirmation, either party may terminate this employment by giving 60 days of written notice or salary in lieu thereof.
  
  7. Confidentiality & Intellectual Property: Given the nature of our work in IT consulting and development, you agree that all code, designs, and intellectual property created during your employment belong solely to PHBKT Group Limited. You also agree to keep all client data confidential.
  
  We look forward to having you join us. Please sign and return a copy of this letter by [Suggest acceptance date, e.g., 3 days from today] to signal your acceptance.
  
  For PHBKT Group Limited,
  
  (Signature)
  
  [Director's Name]
  Director
  `,
});

const generateOfferLetterFlow = ai.defineFlow(
  {
    name: 'generateOfferLetterFlow',
    inputSchema: OfferLetterInputSchema,
    outputSchema: OfferLetterOutputSchema,
  },
  async (input) => {
    const { output } = await prompt(input);
    return output!;
  }
);
