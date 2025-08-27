import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteInvoice = async (id: number): Promise<boolean> => {
  try {
    // Delete line items first (cascade should handle this, but being explicit)
    await db.delete(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, id))
      .execute();

    // Delete invoice
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    // Check if any rows were affected to determine if invoice existed
    return (result.rowCount ?? 0) > 0;
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    throw error;
  }
};