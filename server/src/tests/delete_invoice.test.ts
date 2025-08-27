import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { deleteInvoice } from '../handlers/delete_invoice';
import { eq } from 'drizzle-orm';

// Test data for creating invoices and line items
const testInvoiceData = {
  client_name: 'Test Client',
  date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  total_amount: '150.00',
  payment_status: 'pending' as const
};

const testLineItemData = {
  description: 'Test Service',
  quantity: 2,
  unit_price: '75.00',
  total: '150.00'
};

describe('deleteInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should delete an existing invoice', async () => {
    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values(testInvoiceData)
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;

    // Delete the invoice
    const deleteResult = await deleteInvoice(invoiceId);

    // Verify deletion was successful
    expect(deleteResult).toBe(true);

    // Verify invoice no longer exists in database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(invoices).toHaveLength(0);
  });

  it('should delete invoice and cascade delete associated line items', async () => {
    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values(testInvoiceData)
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;

    // Create test line items
    await db.insert(lineItemsTable)
      .values([
        {
          ...testLineItemData,
          invoice_id: invoiceId,
          description: 'Line Item 1'
        },
        {
          ...testLineItemData,
          invoice_id: invoiceId,
          description: 'Line Item 2',
          unit_price: '50.00',
          total: '100.00'
        }
      ])
      .execute();

    // Verify line items exist before deletion
    const lineItemsBefore = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, invoiceId))
      .execute();

    expect(lineItemsBefore).toHaveLength(2);

    // Delete the invoice
    const deleteResult = await deleteInvoice(invoiceId);

    // Verify deletion was successful
    expect(deleteResult).toBe(true);

    // Verify invoice no longer exists
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    expect(invoices).toHaveLength(0);

    // Verify line items were cascade deleted
    const lineItemsAfter = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, invoiceId))
      .execute();

    expect(lineItemsAfter).toHaveLength(0);
  });

  it('should return false when trying to delete non-existent invoice', async () => {
    const nonExistentId = 9999;

    // Try to delete non-existent invoice
    const deleteResult = await deleteInvoice(nonExistentId);

    // Should return false since no rows were affected
    expect(deleteResult).toBe(false);
  });

  it('should handle multiple invoices correctly', async () => {
    // Create multiple test invoices
    const invoice1Result = await db.insert(invoicesTable)
      .values({
        ...testInvoiceData,
        client_name: 'Client 1'
      })
      .returning()
      .execute();

    const invoice2Result = await db.insert(invoicesTable)
      .values({
        ...testInvoiceData,
        client_name: 'Client 2'
      })
      .returning()
      .execute();

    const invoice1Id = invoice1Result[0].id;
    const invoice2Id = invoice2Result[0].id;

    // Delete first invoice
    const deleteResult1 = await deleteInvoice(invoice1Id);
    expect(deleteResult1).toBe(true);

    // Verify first invoice is deleted
    const invoice1Check = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice1Id))
      .execute();

    expect(invoice1Check).toHaveLength(0);

    // Verify second invoice still exists
    const invoice2Check = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice2Id))
      .execute();

    expect(invoice2Check).toHaveLength(1);
    expect(invoice2Check[0].client_name).toBe('Client 2');

    // Delete second invoice
    const deleteResult2 = await deleteInvoice(invoice2Id);
    expect(deleteResult2).toBe(true);

    // Verify second invoice is also deleted
    const invoice2CheckFinal = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoice2Id))
      .execute();

    expect(invoice2CheckFinal).toHaveLength(0);
  });
});