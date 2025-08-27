import { afterEach, beforeEach, describe, expect, it } from 'bun:test';
import { resetDB, createDB } from '../helpers';
import { db } from '../db';
import { invoicesTable } from '../db/schema';
import { getInvoices } from '../handlers/get_invoices';
import { type PaymentStatus } from '../schema';

describe('getInvoices', () => {
  beforeEach(createDB);
  afterEach(resetDB);

  it('should return empty array when no invoices exist', async () => {
    const result = await getInvoices();
    expect(result).toEqual([]);
  });

  it('should fetch a single invoice with correct data types', async () => {
    // Insert test invoice
    const testDate = new Date('2024-01-15');
    const testDueDate = new Date('2024-02-15');
    
    await db.insert(invoicesTable).values({
      client_name: 'Test Client',
      date: testDate,
      due_date: testDueDate,
      total_amount: '150.75', // Insert as string
      payment_status: 'pending' as PaymentStatus
    }).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(1);
    expect(result[0].client_name).toEqual('Test Client');
    expect(result[0].date).toEqual(testDate);
    expect(result[0].due_date).toEqual(testDueDate);
    expect(result[0].total_amount).toEqual(150.75);
    expect(typeof result[0].total_amount).toEqual('number'); // Verify numeric conversion
    expect(result[0].payment_status).toEqual('pending');
    expect(result[0].id).toBeDefined();
    expect(result[0].created_at).toBeInstanceOf(Date);
    expect(result[0].updated_at).toBeInstanceOf(Date);
  });

  it('should fetch multiple invoices and order by creation date (newest first)', async () => {
    const baseDate = new Date('2024-01-01');
    
    // Insert invoices with different creation times
    const invoice1 = await db.insert(invoicesTable).values({
      client_name: 'Client A',
      date: baseDate,
      due_date: new Date('2024-02-01'),
      total_amount: '100.00',
      payment_status: 'pending' as PaymentStatus
    }).returning().execute();

    // Wait a moment to ensure different timestamps
    await new Promise(resolve => setTimeout(resolve, 10));

    const invoice2 = await db.insert(invoicesTable).values({
      client_name: 'Client B', 
      date: baseDate,
      due_date: new Date('2024-02-01'),
      total_amount: '200.50',
      payment_status: 'paid' as PaymentStatus
    }).returning().execute();

    await new Promise(resolve => setTimeout(resolve, 10));

    const invoice3 = await db.insert(invoicesTable).values({
      client_name: 'Client C',
      date: baseDate,
      due_date: new Date('2024-02-01'),
      total_amount: '75.25',
      payment_status: 'overdue' as PaymentStatus
    }).returning().execute();

    const result = await getInvoices();

    expect(result).toHaveLength(3);
    
    // Verify ordering (newest first by created_at)
    expect(result[0].client_name).toEqual('Client C');
    expect(result[1].client_name).toEqual('Client B');
    expect(result[2].client_name).toEqual('Client A');

    // Verify numeric conversions for all invoices
    expect(result[0].total_amount).toEqual(75.25);
    expect(result[1].total_amount).toEqual(200.50);
    expect(result[2].total_amount).toEqual(100.00);

    // Verify all are numbers
    result.forEach(invoice => {
      expect(typeof invoice.total_amount).toEqual('number');
    });
  });

  it('should handle invoices with different payment statuses', async () => {
    const testDate = new Date('2024-01-15');
    const testDueDate = new Date('2024-02-15');

    // Insert invoices with all possible payment statuses
    await db.insert(invoicesTable).values([
      {
        client_name: 'Pending Client',
        date: testDate,
        due_date: testDueDate,
        total_amount: '100.00',
        payment_status: 'pending' as PaymentStatus
      },
      {
        client_name: 'Paid Client',
        date: testDate,
        due_date: testDueDate,
        total_amount: '200.00',
        payment_status: 'paid' as PaymentStatus
      },
      {
        client_name: 'Overdue Client',
        date: testDate,
        due_date: testDueDate,
        total_amount: '300.00',
        payment_status: 'overdue' as PaymentStatus
      }
    ]).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(3);
    
    // Check that all payment statuses are present
    const statuses = result.map(invoice => invoice.payment_status);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('paid');
    expect(statuses).toContain('overdue');
  });

  it('should handle decimal amounts correctly', async () => {
    const testDate = new Date('2024-01-15');
    const testDueDate = new Date('2024-02-15');

    // Insert invoices with various decimal amounts
    await db.insert(invoicesTable).values([
      {
        client_name: 'Client 1',
        date: testDate,
        due_date: testDueDate,
        total_amount: '999.99', // High precision decimal
        payment_status: 'pending' as PaymentStatus
      },
      {
        client_name: 'Client 2',
        date: testDate,
        due_date: testDueDate,
        total_amount: '0.01', // Very small amount
        payment_status: 'paid' as PaymentStatus
      },
      {
        client_name: 'Client 3',
        date: testDate,
        due_date: testDueDate,
        total_amount: '1000.00', // Whole number with decimals
        payment_status: 'overdue' as PaymentStatus
      }
    ]).execute();

    const result = await getInvoices();

    expect(result).toHaveLength(3);
    
    // Find specific invoices and verify amounts
    const client1Invoice = result.find(inv => inv.client_name === 'Client 1');
    const client2Invoice = result.find(inv => inv.client_name === 'Client 2');
    const client3Invoice = result.find(inv => inv.client_name === 'Client 3');

    expect(client1Invoice?.total_amount).toEqual(999.99);
    expect(client2Invoice?.total_amount).toEqual(0.01);
    expect(client3Invoice?.total_amount).toEqual(1000.00);

    // Verify all are proper numbers
    result.forEach(invoice => {
      expect(typeof invoice.total_amount).toEqual('number');
      expect(invoice.total_amount).toBeGreaterThanOrEqual(0);
    });
  });
});