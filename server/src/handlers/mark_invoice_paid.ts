import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type MarkInvoicePaidInput, type Invoice } from '../schema';
import { eq } from 'drizzle-orm';

export const markInvoicePaid = async (input: MarkInvoicePaidInput): Promise<Invoice> => {
  try {
    // Update the invoice payment status to 'paid' and updated_at timestamp
    const result = await db.update(invoicesTable)
      .set({
        payment_status: 'paid',
        updated_at: new Date()
      })
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    // Check if invoice was found and updated
    if (result.length === 0) {
      throw new Error(`Invoice with id ${input.id} not found`);
    }

    // Convert numeric fields back to numbers before returning
    const invoice = result[0];
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount) // Convert string back to number
    };
  } catch (error) {
    console.error('Mark invoice paid failed:', error);
    throw error;
  }
};