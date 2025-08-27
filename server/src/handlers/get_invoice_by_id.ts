import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type InvoiceWithLineItems } from '../schema';

export const getInvoiceById = async (id: number): Promise<InvoiceWithLineItems | null> => {
  try {
    // Get the invoice
    const invoiceResults = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    if (invoiceResults.length === 0) {
      return null;
    }

    const invoice = invoiceResults[0];

    // Get the line items for this invoice
    const lineItemsResults = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount), // Convert string back to number
      line_items: lineItemsResults.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price), // Convert string back to number
        total: parseFloat(item.total) // Convert string back to number
      }))
    };
  } catch (error) {
    console.error('Failed to get invoice by id:', error);
    throw error;
  }
};