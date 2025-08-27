import { type Invoice } from '../schema';

export async function getInvoices(): Promise<Invoice[]> {
    // This is a placeholder declaration! Real code should be implemented here.
    // The goal of this handler is fetching all invoices from the database for the main ledger view.
    // Should return invoices with: Invoice ID, Client Name, Date, Total Amount, and Payment Status
    // Order by creation date (newest first) for better UX
    return Promise.resolve([]);
}