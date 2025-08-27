import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { type InvoiceWithLineItems } from '../schema';
import { eq } from 'drizzle-orm';

export async function getInvoiceById(id: number): Promise<InvoiceWithLineItems | null> {
  try {
    // First, get the invoice data
    const invoiceResults = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, id))
      .execute();

    if (invoiceResults.length === 0) {
      return null;
    }

    const invoiceData = invoiceResults[0];

    // Then, get all line items for this invoice
    const lineItemResults = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, id))
      .execute();

    // Convert numeric fields to numbers for the invoice
    const invoice: InvoiceWithLineItems = {
      id: invoiceData.id,
      client_name: invoiceData.client_name,
      date: invoiceData.date,
      due_date: invoiceData.due_date,
      total_amount: parseFloat(invoiceData.total_amount), // Convert numeric to number
      payment_status: invoiceData.payment_status,
      created_at: invoiceData.created_at,
      updated_at: invoiceData.updated_at,
      line_items: lineItemResults.map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price), // Convert numeric to number
        total: parseFloat(item.total) // Convert numeric to number
      }))
    };

    return invoice;
  } catch (error) {
    console.error('Failed to get invoice by id:', error);
    throw error;
  }
}