import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type MarkInvoicePaidInput, type Invoice } from '../schema';

export const markInvoicePaid = async (input: MarkInvoicePaidInput): Promise<Invoice> => {
  try {
    const result = await db.update(invoicesTable)
      .set({ 
        payment_status: 'paid',
        updated_at: new Date()
      })
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    if (result.length === 0) {
      throw new Error(`Invoice with id ${input.id} not found`);
    }

    const invoice = result[0];

    // Convert numeric fields back to numbers before returning
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount)
    };
  } catch (error) {
    console.error('Failed to mark invoice as paid:', error);
    throw error;
  }
};