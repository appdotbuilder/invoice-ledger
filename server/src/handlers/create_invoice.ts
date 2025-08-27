import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { type CreateInvoiceInput, type InvoiceWithLineItems } from '../schema';

export const createInvoice = async (input: CreateInvoiceInput): Promise<InvoiceWithLineItems> => {
  try {
    // Calculate total amount from line items
    const totalAmount = input.line_items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price),
      0
    );

    // Insert invoice record
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: input.client_name,
        date: input.date,
        due_date: input.due_date,
        total_amount: totalAmount.toString(), // Convert number to string for numeric column
        payment_status: input.payment_status || 'pending'
      })
      .returning()
      .execute();

    const invoice = invoiceResult[0];

    // Insert line items
    const lineItemsData = input.line_items.map(item => ({
      invoice_id: invoice.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price.toString(), // Convert number to string for numeric column
      total: (item.quantity * item.unit_price).toString() // Convert number to string for numeric column
    }));

    const lineItemsResult = await db.insert(lineItemsTable)
      .values(lineItemsData)
      .returning()
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount), // Convert string back to number
      line_items: lineItemsResult.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price), // Convert string back to number
        total: parseFloat(item.total) // Convert string back to number
      }))
    };
  } catch (error) {
    console.error('Invoice creation failed:', error);
    throw error;
  }
};