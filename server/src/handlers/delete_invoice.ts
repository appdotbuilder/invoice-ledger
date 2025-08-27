import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { eq } from 'drizzle-orm';

export const deleteInvoice = async (id: number): Promise<boolean> => {
  try {
    // Delete the invoice by ID (cascade delete will handle line items due to FK constraint)
    const result = await db.delete(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .returning({ id: invoicesTable.id })
      .execute();

    // Return true if deletion was successful (at least one row was deleted)
    return result.length > 0;
  } catch (error) {
    console.error('Invoice deletion failed:', error);
    throw error;
  }
};