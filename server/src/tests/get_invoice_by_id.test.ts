import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { getInvoiceById } from '../handlers/get_invoice_by_id';
import { eq } from 'drizzle-orm';

describe('getInvoiceById', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return null for non-existent invoice', async () => {
    const result = await getInvoiceById(999);
    expect(result).toBeNull();
  });

  it('should return invoice with line items', async () => {
    // Create test invoice
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Test Client',
        date: new Date('2024-01-15'),
        due_date: new Date('2024-02-15'),
        total_amount: '150.00',
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
          description: 'Web Development',
          quantity: 10,
          unit_price: '50.00',
          total: '500.00'
        },
        {
          invoice_id: invoiceId,
          description: 'Consulting',
          quantity: 5,
          unit_price: '100.00',
          total: '500.00'
        }
      ])
      .execute();

    const result = await getInvoiceById(invoiceId);

    // Verify invoice data
    expect(result).not.toBeNull();
    expect(result!.id).toBe(invoiceId);
    expect(result!.client_name).toBe('Test Client');
    expect(result!.date).toEqual(new Date('2024-01-15'));
    expect(result!.due_date).toEqual(new Date('2024-02-15'));
    expect(result!.total_amount).toBe(150.00);
    expect(typeof result!.total_amount).toBe('number');
    expect(result!.payment_status).toBe('pending');
    expect(result!.created_at).toBeInstanceOf(Date);
    expect(result!.updated_at).toBeInstanceOf(Date);

    // Verify line items
    expect(result!.line_items).toHaveLength(2);
    
    const webDevItem = result!.line_items.find(item => item.description === 'Web Development');
    expect(webDevItem).toBeDefined();
    expect(webDevItem!.quantity).toBe(10);
    expect(webDevItem!.unit_price).toBe(50.00);
    expect(typeof webDevItem!.unit_price).toBe('number');
    expect(webDevItem!.total).toBe(500.00);
    expect(typeof webDevItem!.total).toBe('number');

    const consultingItem = result!.line_items.find(item => item.description === 'Consulting');
    expect(consultingItem).toBeDefined();
    expect(consultingItem!.quantity).toBe(5);
    expect(consultingItem!.unit_price).toBe(100.00);
    expect(typeof consultingItem!.unit_price).toBe('number');
    expect(consultingItem!.total).toBe(500.00);
    expect(typeof consultingItem!.total).toBe('number');
  });

  it('should return invoice with empty line items array', async () => {
    // Create invoice without line items
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Client No Items',
        date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '0.00',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;
    const result = await getInvoiceById(invoiceId);

    expect(result).not.toBeNull();
    expect(result!.client_name).toBe('Client No Items');
    expect(result!.line_items).toHaveLength(0);
    expect(Array.isArray(result!.line_items)).toBe(true);
  });

  it('should handle different payment statuses correctly', async () => {
    // Test with 'paid' status
    const paidInvoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Paid Client',
        date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '100.00',
        payment_status: 'paid'
      })
      .returning()
      .execute();

    const paidResult = await getInvoiceById(paidInvoiceResult[0].id);
    expect(paidResult!.payment_status).toBe('paid');

    // Test with 'overdue' status
    const overdueInvoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Overdue Client',
        date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '200.00',
        payment_status: 'overdue'
      })
      .returning()
      .execute();

    const overdueResult = await getInvoiceById(overdueInvoiceResult[0].id);
    expect(overdueResult!.payment_status).toBe('overdue');
  });

  it('should verify data persistence in database', async () => {
    // Create test data
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Persistence Test Client',
        date: new Date('2024-03-01'),
        due_date: new Date('2024-03-31'),
        total_amount: '75.50',
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;

    await db.insert(lineItemsTable)
      .values({
        invoice_id: invoiceId,
        description: 'Test Service',
        quantity: 3,
        unit_price: '25.17', // Test decimal precision
        total: '75.51'
      })
      .execute();

    // Get via handler
    const handlerResult = await getInvoiceById(invoiceId);

    // Verify directly in database
    const dbInvoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, invoiceId))
      .execute();

    const dbLineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, invoiceId))
      .execute();

    expect(dbInvoices).toHaveLength(1);
    expect(dbLineItems).toHaveLength(1);
    
    // Compare handler result with database data
    expect(handlerResult!.client_name).toBe(dbInvoices[0].client_name);
    expect(parseFloat(dbInvoices[0].total_amount)).toBe(handlerResult!.total_amount);
    expect(handlerResult!.line_items[0].description).toBe(dbLineItems[0].description);
    expect(parseFloat(dbLineItems[0].unit_price)).toBe(handlerResult!.line_items[0].unit_price);
  });

  it('should handle decimal precision correctly', async () => {
    const invoiceResult = await db.insert(invoicesTable)
      .values({
        client_name: 'Decimal Test Client',
        date: new Date('2024-01-01'),
        due_date: new Date('2024-01-31'),
        total_amount: '123.45', // Test precise decimal
        payment_status: 'pending'
      })
      .returning()
      .execute();

    const invoiceId = invoiceResult[0].id;

    await db.insert(lineItemsTable)
      .values({
        invoice_id: invoiceId,
        description: 'Precision Test',
        quantity: 1,
        unit_price: '123.45',
        total: '123.45'
      })
      .execute();

    const result = await getInvoiceById(invoiceId);
    
    expect(result!.total_amount).toBe(123.45);
    expect(result!.line_items[0].unit_price).toBe(123.45);
    expect(result!.line_items[0].total).toBe(123.45);
  });
});