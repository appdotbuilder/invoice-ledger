import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable, lineItemsTable } from '../db/schema';
import { type CreateInvoiceInput } from '../schema';
import { createInvoice } from '../handlers/create_invoice';
import { eq } from 'drizzle-orm';

// Test input with multiple line items
const testInput: CreateInvoiceInput = {
  client_name: 'Test Client Corp',
  date: new Date('2024-01-15'),
  due_date: new Date('2024-02-15'),
  line_items: [
    {
      description: 'Web Development Services',
      quantity: 10,
      unit_price: 150.50
    },
    {
      description: 'UI/UX Design',
      quantity: 5,
      unit_price: 200.00
    }
  ],
  payment_status: 'pending'
};

describe('createInvoice', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should create an invoice with line items', async () => {
    const result = await createInvoice(testInput);

    // Validate invoice fields
    expect(result.client_name).toEqual('Test Client Corp');
    expect(result.date).toEqual(new Date('2024-01-15'));
    expect(result.due_date).toEqual(new Date('2024-02-15'));
    expect(result.payment_status).toEqual('pending');
    expect(result.id).toBeDefined();
    expect(result.created_at).toBeInstanceOf(Date);
    expect(result.updated_at).toBeInstanceOf(Date);

    // Validate calculated total amount
    const expectedTotal = (10 * 150.50) + (5 * 200.00); // 1505 + 1000 = 2505
    expect(result.total_amount).toEqual(expectedTotal);
    expect(typeof result.total_amount).toBe('number');

    // Validate line items
    expect(result.line_items).toHaveLength(2);
    
    // First line item
    expect(result.line_items[0].description).toEqual('Web Development Services');
    expect(result.line_items[0].quantity).toEqual(10);
    expect(result.line_items[0].unit_price).toEqual(150.50);
    expect(typeof result.line_items[0].unit_price).toBe('number');
    expect(result.line_items[0].total).toEqual(1505);
    expect(typeof result.line_items[0].total).toBe('number');
    expect(result.line_items[0].invoice_id).toEqual(result.id);

    // Second line item
    expect(result.line_items[1].description).toEqual('UI/UX Design');
    expect(result.line_items[1].quantity).toEqual(5);
    expect(result.line_items[1].unit_price).toEqual(200.00);
    expect(result.line_items[1].total).toEqual(1000);
    expect(result.line_items[1].invoice_id).toEqual(result.id);
  });

  it('should save invoice to database', async () => {
    const result = await createInvoice(testInput);

    // Query invoice from database
    const invoices = await db.select()
      .from(invoicesTable)
      .where(eq(invoicesTable.id, result.id))
      .execute();

    expect(invoices).toHaveLength(1);
    const invoice = invoices[0];
    expect(invoice.client_name).toEqual('Test Client Corp');
    expect(invoice.date).toEqual(new Date('2024-01-15'));
    expect(invoice.due_date).toEqual(new Date('2024-02-15'));
    expect(parseFloat(invoice.total_amount)).toEqual(2505);
    expect(invoice.payment_status).toEqual('pending');
    expect(invoice.created_at).toBeInstanceOf(Date);
    expect(invoice.updated_at).toBeInstanceOf(Date);
  });

  it('should save line items to database', async () => {
    const result = await createInvoice(testInput);

    // Query line items from database
    const lineItems = await db.select()
      .from(lineItemsTable)
      .where(eq(lineItemsTable.invoice_id, result.id))
      .execute();

    expect(lineItems).toHaveLength(2);

    // Verify first line item in database
    const firstItem = lineItems.find(item => item.description === 'Web Development Services');
    expect(firstItem).toBeDefined();
    expect(firstItem!.quantity).toEqual(10);
    expect(parseFloat(firstItem!.unit_price)).toEqual(150.50);
    expect(parseFloat(firstItem!.total)).toEqual(1505);
    expect(firstItem!.invoice_id).toEqual(result.id);

    // Verify second line item in database
    const secondItem = lineItems.find(item => item.description === 'UI/UX Design');
    expect(secondItem).toBeDefined();
    expect(secondItem!.quantity).toEqual(5);
    expect(parseFloat(secondItem!.unit_price)).toEqual(200.00);
    expect(parseFloat(secondItem!.total)).toEqual(1000);
    expect(secondItem!.invoice_id).toEqual(result.id);
  });

  it('should create invoice with single line item', async () => {
    const singleItemInput: CreateInvoiceInput = {
      client_name: 'Solo Client',
      date: new Date('2024-01-10'),
      due_date: new Date('2024-02-10'),
      line_items: [
        {
          description: 'Consultation Services',
          quantity: 3,
          unit_price: 100.25
        }
      ],
      payment_status: 'pending'
    };

    const result = await createInvoice(singleItemInput);

    expect(result.client_name).toEqual('Solo Client');
    expect(result.total_amount).toEqual(300.75); // 3 * 100.25
    expect(result.line_items).toHaveLength(1);
    expect(result.line_items[0].description).toEqual('Consultation Services');
    expect(result.line_items[0].total).toEqual(300.75);
  });

  it('should handle different payment status', async () => {
    const paidInvoiceInput: CreateInvoiceInput = {
      client_name: 'Paid Client',
      date: new Date('2024-01-01'),
      due_date: new Date('2024-01-31'),
      line_items: [
        {
          description: 'Pre-paid Service',
          quantity: 1,
          unit_price: 500.00
        }
      ],
      payment_status: 'paid'
    };

    const result = await createInvoice(paidInvoiceInput);

    expect(result.payment_status).toEqual('paid');
    expect(result.total_amount).toEqual(500.00);
  });

  it('should calculate totals correctly with decimal values', async () => {
    const decimalInput: CreateInvoiceInput = {
      client_name: 'Decimal Client',
      date: new Date('2024-01-05'),
      due_date: new Date('2024-02-05'),
      line_items: [
        {
          description: 'Fractional Service A',
          quantity: 7,
          unit_price: 33.33
        },
        {
          description: 'Fractional Service B',
          quantity: 3,
          unit_price: 66.67
        }
      ],
      payment_status: 'pending'
    };

    const result = await createInvoice(decimalInput);

    // 7 * 33.33 = 233.31, 3 * 66.67 = 200.01, total = 433.32
    expect(result.total_amount).toEqual(433.32);
    expect(result.line_items[0].total).toEqual(233.31);
    expect(result.line_items[1].total).toEqual(200.01);
  });
});