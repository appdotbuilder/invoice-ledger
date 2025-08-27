import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { type UpdateInvoiceInput } from '../schema';
import { updateInvoice } from '../handlers/update_invoice';
import { eq } from 'drizzle-orm';

// Test helper to create a base invoice
const createTestInvoice = async () => {
  const invoiceResult = await db.insert(invoicesTable).values({
    client_name: 'Test Client',
    date: new Date('2024-01-01'),
    due_date: new Date('2024-01-31'),
    total_amount: '100.00',
    payment_status: 'pending'
  }).returning().execute();

  const invoice = invoiceResult[0];

  // Add line items
  await db.insert(lineItemsTable).values([
    {
      invoice_id: invoice.id,
      description: 'Item 1',
      quantity: 2,
      unit_price: '25.00',
      total: '50.00'
    },
    {
      invoice_id: invoice.id,
      description: 'Item 2',
      quantity: 1,
      unit_price: '50.00',
      total: '50.00'
    }
  ]).execute();

  return invoice.id;
};

describe('updateInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should update basic invoice fields', async () => {
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Updated Client Name',
      payment_status: 'paid'
    };

    const result = await updateInvoice(updateInput);

    expect(result.id).toEqual(invoiceId);
    expect(result.client_name).toEqual('Updated Client Name');
    expect(result.payment_status).toEqual('paid');
    expect(result.total_amount).toEqual(100); // Should remain unchanged
    expect(result.line_items).toHaveLength(2); // Original line items preserved
  });

  it('should update dates correctly', async () => {
    const invoiceId = await createTestInvoice();
    const newDate = new Date('2024-02-01');
    const newDueDate = new Date('2024-02-28');

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      date: newDate,
      due_date: newDueDate
    };

    const result = await updateInvoice(updateInput);

    expect(result.date).toEqual(newDate);
    expect(result.due_date).toEqual(newDueDate);
    expect(result.updated_at).toBeInstanceOf(Date);
  });

  it('should replace line items and recalculate total', async () => {
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      line_items: [
        {
          description: 'New Item 1',
          quantity: 3,
          unit_price: 15.50
        },
        {
          description: 'New Item 2',
          quantity: 2,
          unit_price: 22.75
        }
      ]
    };

    const result = await updateInvoice(updateInput);

    expect(result.line_items).toHaveLength(2);
    expect(result.line_items[0].description).toEqual('New Item 1');
    expect(result.line_items[0].quantity).toEqual(3);
    expect(result.line_items[0].unit_price).toEqual(15.50);
    expect(result.line_items[0].total).toEqual(46.50); // 3 * 15.50

    expect(result.line_items[1].description).toEqual('New Item 2');
    expect(result.line_items[1].quantity).toEqual(2);
    expect(result.line_items[1].unit_price).toEqual(22.75);
    expect(result.line_items[1].total).toEqual(45.50); // 2 * 22.75

    expect(result.total_amount).toEqual(92.00); // 46.50 + 45.50
  });

  it('should handle empty line items array', async () => {
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      line_items: []
    };

    const result = await updateInvoice(updateInput);

    expect(result.line_items).toHaveLength(0);
    expect(result.total_amount).toEqual(0);
  });

  it('should update both invoice fields and line items together', async () => {
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Combined Update Client',
      payment_status: 'overdue',
      line_items: [
        {
          description: 'Combined Item',
          quantity: 5,
          unit_price: 12.00
        }
      ]
    };

    const result = await updateInvoice(updateInput);

    expect(result.client_name).toEqual('Combined Update Client');
    expect(result.payment_status).toEqual('overdue');
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0].description).toEqual('Combined Item');
    expect(result.total_amount).toEqual(60.00); // 5 * 12.00
  });

  it('should save updates to database', async () => {
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Database Test Client',
      line_items: [
        {
          description: 'Database Test Item',
          quantity: 1,
          unit_price: 99.99
        }
      ]
    };

    await updateInvoice(updateInput);

    // Verify invoice was updated in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(invoices).toHaveLength(1);
    expect(invoices[0].client_name).toEqual('Database Test Client');
    expect(parseFloat(invoices[0].total_amount)).toEqual(99.99);

    // Verify line items were updated in database
    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, invoiceId))
      .execute();

    expect(lineItems).toHaveLength(1);
    expect(lineItems[0].description).toEqual('Database Test Item');
    expect(parseFloat(lineItems[0].unit_price)).toEqual(99.99);
  });

  it('should preserve unchanged fields', async () => {
    const invoiceId = await createTestInvoice();

    // Get original invoice
    const originalInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();
    const originalInvoice = originalInvoices[0];

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      client_name: 'Only Name Changed'
      // Don't update other fields
    };

    const result = await updateInvoice(updateInput);

    expect(result.client_name).toEqual('Only Name Changed');
    expect(result.date).toEqual(originalInvoice.date);
    expect(result.due_date).toEqual(originalInvoice.due_date);
    expect(result.payment_status).toEqual(originalInvoice.payment_status);
    expect(result.total_amount).toEqual(parseFloat(originalInvoice.total_amount));
    expect(result.line_items).toHaveLength(2); // Original line items preserved
  });

  it('should throw error for non-existent invoice', async () => {
    const updateInput: UpdateInvoiceInput = {
      id: 99999, // Non-existent ID
      client_name: 'Should Fail'
    };

    expect(updateInvoice(updateInput)).rejects.toThrow(/not found/i);
  });

  it('should handle numeric precision correctly', async () => {
    const invoiceId = await createTestInvoice();

    const updateInput: UpdateInvoiceInput = {
      id: invoiceId,
      line_items: [
        {
          description: 'Precision Test',
          quantity: 3,
          unit_price: 19.95 // Use a cleaner decimal for testing
        }
      ]
    };

    const result = await updateInvoice(updateInput);

    expect(typeof result.total_amount).toBe('number');
    expect(typeof result.line_items[0].unit_price).toBe('number');
    expect(typeof result.line_items[0].total).toBe('number');
    expect(result.line_items[0].unit_price).toEqual(19.95);
    expect(result.total_amount).toEqual(59.85); // 3 * 19.95
  });
});