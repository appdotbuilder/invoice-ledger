import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteInvoice = async (id: number): Promise<boolean> => {
  try {
    // Due to CASCADE delete constraint, line items will be automatically deleted
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    return (result.rowCount || 0) > 0;
  } catch (error) {
    console.error('Failed to delete invoice:', error);
    throw error;
  }
};