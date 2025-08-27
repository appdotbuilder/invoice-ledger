import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { type UpdateInvoiceInput, type InvoiceWithLineItems } from '../schema';
import { eq } from 'drizzle-orm';

export const updateInvoice = async (input: UpdateInvoiceInput): Promise<InvoiceWithLineItems> => {
  try {
    // First, verify the invoice exists
    const existingInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    if (existingInvoice.length === 0) {
      throw new Error(`Invoice with id ${input.id} not found`);
    }

    // Calculate new total if line items are provided
    let newTotalAmount: number | undefined;
    
    if (input.line_items) {
      newTotalAmount = input.line_items.reduce((sum, item) => {
        const quantity = item.quantity || 1;
        const unitPrice = item.unit_price || 0;
        return sum + (quantity * unitPrice);
      }, 0);
    }

    // Build update object for invoice
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.client_name !== undefined) {
      updateData.client_name = input.client_name;
    }

    if (input.date !== undefined) {
      updateData.date = input.date;
    }

    if (input.due_date !== undefined) {
      updateData.due_date = input.due_date;
    }

    if (input.payment_status !== undefined) {
      updateData.payment_status = input.payment_status;
    }

    if (newTotalAmount !== undefined) {
      updateData.total_amount = newTotalAmount.toString(); // Convert to string for numeric column
    }

    // Update the invoice
    await db.update(invoicesTable)
      .set(updateData)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    // If line items are provided, replace all existing line items
    if (input.line_items) {
      // Delete existing line items
      await db.delete(lineItemsTable)
        .where(eq(lineItemsTable.invoice_id, input.id))
        .execute();

      // Insert new line items
      if (input.line_items.length > 0) {
        const lineItemsToInsert = input.line_items.map(item => ({
          invoice_id: input.id,
          description: item.description!,
          quantity: item.quantity!,
          unit_price: item.unit_price!.toString(), // Convert to string for numeric column
          total: (item.quantity! * item.unit_price!).toString() // Convert to string for numeric column
        }));

        await db.insert(lineItemsTable)
          .values(lineItemsToInsert)
          .execute();
      }
    }

    // Fetch and return the updated invoice with line items
    const updatedInvoice = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, input.id))
      .execute();

    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, input.id))
      .execute();

    // Convert numeric fields back to numbers
    const invoice = updatedInvoice[0];
    return {
      id: invoice.id,
      client_name: invoice.client_name,
      date: invoice.date,
      due_date: invoice.due_date,
      total_amount: parseFloat(invoice.total_amount), // Convert string to number
      payment_status: invoice.payment_status,
      created_at: invoice.created_at,
      updated_at: invoice.updated_at,
      line_items: lineItems.map(item => ({
        id: item.id,
        invoice_id: item.invoice_id,
        description: item.description,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price), // Convert string to number
        total: parseFloat(item.total) // Convert string to number
      }))
    };
  } catch (error) {
    console.error('Invoice update failed:', error);
    throw error;
  }
};