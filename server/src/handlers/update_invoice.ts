import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateInvoiceInput, type InvoiceWithLineItems } from '../schema';

export const updateInvoice = async (input: UpdateInvoiceInput): Promise<InvoiceWithLineItems> => {
  try {
    // Calculate total amount from line items if line_items are provided
    let totalAmount: number | undefined;
    if (input.line_items) {
      totalAmount = input.line_items.reduce(
        (sum, item) => sum + ((item.quantity || 1) * (item.unit_price || 0)),
        0
      );
    }

    // Update invoice record
    const updateData: any = {
      updated_at: new Date()
    };

    if (input.client_name !== undefined) updateData.client_name = input.client_name;
    if (input.date !== undefined) updateData.date = input.date;
    if (input.due_date !== undefined) updateData.due_date = input.due_date;
    if (input.payment_status !== undefined) updateData.payment_status = input.payment_status;
    if (totalAmount !== undefined) updateData.total_amount = totalAmount.toString();

    const invoiceResult = await db.update(invoicesTable)
      .set(updateData)
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    if (invoiceResult.length === 0) {
      throw new Error(`Invoice with id ${input.id} not found`);
    }

    const invoice = invoiceResult[0];

    // Update line items if provided
    if (input.line_items) {
      // Delete existing line items
      await db.delete(lineItemsTable)
        .where(eq(lineItemsTable.invoice_id, input.id))
        .execute();

      // Insert new line items
      const lineItemsData = input.line_items
        .filter(item => item.description) // Only include items with descriptions
        .map(item => ({
          invoice_id: input.id,
          description: item.description!,
          quantity: item.quantity || 1,
          unit_price: (item.unit_price || 0).toString(),
          total: ((item.quantity || 1) * (item.unit_price || 0)).toString()
        }));

      if (lineItemsData.length > 0) {
        const lineItemsResult = await db.insert(lineItemsTable)
          .values(lineItemsData)
          .returning()
          .execute();

        // Convert numeric fields back to numbers before returning
        return {
          ...invoice,
          total_amount: parseFloat(invoice.total_amount),
          line_items: lineItemsResult.map(item => ({
            ...item,
            unit_price: parseFloat(item.unit_price),
            total: parseFloat(item.total)
          }))
        };
      }
    }

    // If no line items to update, get existing ones
    const existingLineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, input.id))
      .execute();

    return {
      ...invoice,
      total_amount: parseFloat(invoice.total_amount),
      line_items: existingLineItems.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price),
        total: parseFloat(item.total)
      }))
    };
  } catch (error) {
    console.error('Invoice update failed:', error);
    throw error;
  }
};