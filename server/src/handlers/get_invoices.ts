import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { desc } from 'drizzle-orm';
import { type Invoice } from '../schema';

export const getInvoices = async (): Promise<Invoice[]> => {
  try {
    const results = await db.select()
      .from(invoicesTable)
      .orderBy(desc(invoicesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(invoice => ({
      ...invoice,
      total_amount: parseFloat(invoice.total_amount)
    }));
  } catch (error) {
    console.error('Failed to get invoices:', error);
    throw error;
  }
};