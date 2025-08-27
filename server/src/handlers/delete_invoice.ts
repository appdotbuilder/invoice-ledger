import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteInvoice = async (id: number): Promise<boolean> => {
  try {
    // Delete invoice (line items will be deleted automatically due to CASCADE)
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .returning()
      .execute();

    // Return true if at least one row was deleted, false otherwise
    return result.length > 0;
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    throw error;
  }
};