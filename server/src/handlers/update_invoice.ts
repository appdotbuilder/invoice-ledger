import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { eq } from 'drizzle-orm';
import { type UpdateInvoiceInput, type InvoiceWithLineItems } from '../schema';

export const updateInvoice = async (input: UpdateInvoiceInput): Promise<InvoiceWithLineItems> => {
  try {
    // Calculate new total amount if line items are provided
    let totalAmount: number | undefined;
    if (input.line_items) {
      totalAmount = input.line_items.reduce(
        (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)),
        0
      );
    }

    // Prepare invoice update data
    const invoiceUpdateData: any = {};
    if (input.client_name !== undefined) invoiceUpdateData.client_name = input.client_name;
    if (input.date !== undefined) invoiceUpdateData.date = input.date;
    if (input.due_date !== undefined) invoiceUpdateData.due_date = input.due_date;
    if (input.payment_status !== undefined) invoiceUpdateData.payment_status = input.payment_status;
    if (totalAmount !== undefined) invoiceUpdateData.total_amount = totalAmount.toString();
    invoiceUpdateData.updated_at = new Date();

    // Update invoice
    const invoiceResult = await db.update(invoicesTable)
      .set(invoiceUpdateData)
      .where(eq(invoicesTable.id, input.id))
      .returning()
      .execute();

    if (invoiceResult.length === 0) {
      throw new Error('Invoice not found');
    }

    const updatedInvoice = invoiceResult[0];

    // Update line items if provided
    if (input.line_items) {
      // Delete existing line items
      await db.delete(lineItemsTable)
        .where(eq(lineItemsTable.invoice_id, input.id))
        .execute();

      // Insert new line items
      const lineItemsData = input.line_items
        .filter(item => item.description && item.quantity && item.unit_price) // Filter out incomplete items
        .map(item => ({
          invoice_id: input.id,
          description: item.description!,
          quantity: item.quantity!,
          unit_price: item.unit_price!.toString(), // Convert number to string for numeric column
          total: (item.quantity! * item.unit_price!).toString() // Convert number to string for numeric column
        }));

      if (lineItemsData.length > 0) {
        await db.insert(lineItemsTable)
          .values(lineItemsData)
          .execute();
      }
    }

    // Get updated line items
    const lineItemsResults = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, input.id))
      .execute();

    // Convert numeric fields back to numbers before returning
    return {
      ...updatedInvoice,
      total_amount: parseFloat(updatedInvoice.total_amount), // Convert string back to number
      line_items: lineItemsResults.map(item => ({
        ...item,
        unit_price: parseFloat(item.unit_price), // Convert string back to number
        total: parseFloat(item.total) // Convert string back to number
      }))
    };
  } catch (error) {
    console.error('Invoice update failed:', error);
    throw error;
  }
};