import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { type MarkInvoicePaidInput } from '../schema';
import { markInvoicePaid } from '../handlers/mark_invoice_paid';
import { eq } from 'drizzle-orm';

// Test input
const testInput: MarkInvoicePaidInput = {
  id: 1
};

describe('markInvoicePaid', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should mark an invoice as paid', async () => {
    // Create test invoice first
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Test Client',
        date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '1500.00',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;
    const originalUpdatedAt = invoiceResult[0].updated_at;

    // Mark invoice as paid
    const result = await markInvoicePaid({ id: invoiceId });

    // Verify the result
    expect(result.id).toEqual(invoiceId);
    expect(result.client_name).toEqual('Test Client');
    expect(result.payment_status).toEqual('paid');
    expect(result.total_amount).toEqual(1500.00);
    expect(typeof result.total_amount).toBe('number');
    expect(result.updated_at).toBeInstanceOf(Date);
    expect(result.updated_at.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
  });

  it('should update invoice in database', async () => {
    // Create test invoice first
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Database Test Client',
        date: new Date('2024-02-01'),
        due_date: new Date('2024-02-28'),
        total_amount: '2500.50',
        payment_status: 'overdue'
      })
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;

    // Mark invoice as paid
    await markInvoicePaid({ id: invoiceId });

    // Verify database was updated
    const updatedInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(updatedInvoices).toHaveLength(1);
    const updatedInvoice = updatedInvoices[0];
    expect(updatedInvoice.payment_status).toEqual('paid');
    expect(updatedInvoice.client_name).toEqual('Database Test Client');
    expect(parseFloat(updatedInvoice.total_amount)).toEqual(2500.50);
    expect(updatedInvoice.updated_at).toBeInstanceOf(Date);
  });

  it('should throw error for non-existent invoice', async () => {
    // Try to mark non-existent invoice as paid
    await expect(markInvoicePaid({ id: 999 }))
      .rejects.toThrow(/Invoice with id 999 not found/i);
  });

  it('should work with invoice that has line items', async () => {
    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Client with Line Items',
        date: new Date('2024-03-01'),
        due_date: new Date('2024-03-31'),
        total_amount: '750.25',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;

    // Create test line items
    await db.insert(lineItemsTable)
      .values([
        {
          invoice_id: invoiceId,
          description: 'Service A',
          quantity: 2,
          unit_price: '250.00',
          total: '500.00'
        },
        {
          invoice_id: invoiceId,
          description: 'Service B',
          quantity: 1,
          unit_price: '250.25',
          total: '250.25'
        }
      ])
      .execute();

    // Mark invoice as paid
    const result = await markInvoicePaid({ id: invoiceId });

    // Verify the result
    expect(result.id).toEqual(invoiceId);
    expect(result.payment_status).toEqual('paid');
    expect(result.total_amount).toEqual(750.25);

    // Verify line items still exist (should not be affected)
    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, invoiceId))
      .execute();

    expect(lineItems).toHaveLength(2);
    expect(lineItems[0].description).toEqual('Service A');
    expect(lineItems[1].description).toEqual('Service B');
  });

  it('should handle different payment statuses correctly', async () => {
    // Test marking 'pending' invoice as paid
    const pendingInvoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Pending Client',
        date: new Date('2024-04-01'),
        due_date: new Date('2024-04-30'),
        total_amount: '100.00',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const pendingResult = await markInvoicePaid({ id: pendingInvoiceResult[0].id });
    expect(pendingResult.payment_status).toEqual('paid');

    // Test marking 'overdue' invoice as paid
    const overdueInvoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Overdue Client',
        date: new Date('2024-05-01'),
        due_date: new Date('2024-05-31'),
        total_amount: '200.00',
        payment_status: 'overdue'
      })
      .returning()
      .execute();

    const overdueResult = await markInvoicePaid({ id: overdueInvoiceResult[0].id });
    expect(overdueResult.payment_status).toEqual('paid');

    // Test marking already 'paid' invoice as paid (should still work)
    const paidInvoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Already Paid Client',
        date: new Date('2024-06-01'),
        due_date: new Date('2024-06-30'),
        total_amount: '300.00',
        payment_status: 'paid'
      })
      .returning()
      .execute();

    const alreadyPaidResult = await markInvoicePaid({ id: paidInvoiceResult[0].id });
    expect(alreadyPaidResult.payment_status).toEqual('paid');
  });
});