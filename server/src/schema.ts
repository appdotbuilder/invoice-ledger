import { z } from 'zod';

// Payment Status enum schema
export const paymentStatusSchema = z.enum(['pending', 'paid', 'overdue']);
export type PaymentStatus = z.infer<typeof paymentStatusSchema>;

// Line Item schema
export const lineItemSchema = z.object({
  id: z.number(),
  invoice_id: z.number(),
  description: z.string(),
  quantity: z.number().int().positive(),
  unit_price: z.number().positive(),
  total: z.number() // quantity * unit_price, calculated field
});

export type LineItem = z.infer<typeof lineItemSchema>;

// Invoice schema with proper numeric handling
export const invoiceSchema = z.object({
  id: z.number(),
  client_name: z.string(),
  date: z.coerce.date(),
  due_date: z.coerce.date(),
  total_amount: z.number(),
  payment_status: paymentStatusSchema,
  created_at: z.coerce.date(),
  updated_at: z.coerce.date()
});

export type Invoice = z.infer<typeof invoiceSchema>;

// Input schema for creating line items
export const createLineItemInputSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().int().positive('Quantity must be a positive integer'),
  unit_price: z.number().positive('Unit price must be positive')
});

export type CreateLineItemInput = z.infer<typeof createLineItemInputSchema>;

// Input schema for creating invoices
export const createInvoiceInputSchema = z.object({
  client_name: z.string().min(1, 'Client name is required'),
  date: z.coerce.date(),
  due_date: z.coerce.date(),
  line_items: z.array(createLineItemInputSchema).min(1, 'At least one line item is required'),
  payment_status: paymentStatusSchema.default('pending')
});

export type CreateInvoiceInput = z.infer<typeof createInvoiceInputSchema>;

// Input schema for updating line items
export const updateLineItemInputSchema = z.object({
  id: z.number().optional(),
  description: z.string().min(1).optional(),
  quantity: z.number().int().positive().optional(),
  unit_price: z.number().positive().optional()
});

export type UpdateLineItemInput = z.infer<typeof updateLineItemInputSchema>;

// Input schema for updating invoices
export const updateInvoiceInputSchema = z.object({
  id: z.number(),
  client_name: z.string().min(1).optional(),
  date: z.coerce.date().optional(),
  due_date: z.coerce.date().optional(),
  line_items: z.array(updateLineItemInputSchema).optional(),
  payment_status: paymentStatusSchema.optional()
});

export type UpdateInvoiceInput = z.infer<typeof updateInvoiceInputSchema>;

// Input schema for marking invoice as paid
export const markInvoicePaidInputSchema = z.object({
  id: z.number()
});

export type MarkInvoicePaidInput = z.infer<typeof markInvoicePaidInputSchema>;

// Schema for invoice with line items (for detailed view)
export const invoiceWithLineItemsSchema = invoiceSchema.extend({
  line_items: z.array(lineItemSchema)
});

export type InvoiceWithLineItems = z.infer<typeof invoiceWithLineItemsSchema>;