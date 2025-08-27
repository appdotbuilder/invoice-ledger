import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type InvoiceWithLineItems } from '../schema';

export const getInvoiceById = async (id: number): Promise<InvoiceWithLineItems | null> => {
  try {
    // Get invoice
    const invoiceResults = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    if (invoiceResults.length === 0) {
      return null;
    }

    const invoice = invoiceResults[0];

    // Get line items for the invoice
    const lineItemsResults = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount),
      line_items: lineItemsResults.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        total: parseFloat(item.total)
      }))
    };
  } catch (error) {
    console.error('Failed to get invoice by ID:', error);
    throw error;
  }
};