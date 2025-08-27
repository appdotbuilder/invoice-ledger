import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { type Invoice } from '../schema';
import { desc } from 'drizzle-orm';

export async function getInvoices(): Promise<Invoice[]> {
  try {
    // Query all invoices ordered by creation date (newest first)
    const results = await db.select()
      .from(invoicesTable)
      .orderBy(desc(invoicesTable.created_at))
      .execute();

    // Convert numeric fields back to numbers before returning
    return results.map(invoice => ({
      ...invoice,
      total_amount: parseFloat(invoice.total_amount) // Convert string back to number
    }));
  } catch (error) {
    console.error('Failed to fetch invoices:', error);
    throw error;
  }
}