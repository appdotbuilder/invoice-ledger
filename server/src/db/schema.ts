import { serial, text, pgTable, timestamp, numeric, integer, pgEnum } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Payment status enum
export const paymentStatusEnum = pgEnum('payment_status', ['pending', 'paid', 'overdue']);

// Invoices table
export const invoicesTable = pgTable('invoices', {
  id: serial('id').primaryKey(),
  client_name: text('client_name').notNull(),
  date: timestamp('date').notNull(),
  due_date: timestamp('due_date').notNull(),
  total_amount: numeric('total_amount', { precision: 10, scale: 2 }).notNull(),
  payment_status: paymentStatusEnum('payment_status').notNull().default('pending'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Line items table
export const lineItemsTable = pgTable('line_items', {
  id: serial('id').primaryKey(),
  invoice_id: integer('invoice_id').notNull().references(() => invoicesTable.id, { onDelete: 'cascade' }),
  description: text('description').notNull(),
  quantity: integer('quantity').notNull(),
  unit_price: numeric('unit_price', { precision: 10, scale: 2 }).notNull(),
  total: numeric('total', { precision: 10, scale: 2 }).notNull(), // quantity * unit_price
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Relations
export const invoicesRelations = relations(invoicesTable, ({ many }) => ({
  line_items: many(lineItemsTable),
}));

export const lineItemsRelations = relations(lineItemsTable, ({ one }) => ({
  invoice: one(invoicesTable, {
    fields: [lineItemsTable.invoice_id],
    references: [invoicesTable.id],
  }),
}));

// TypeScript types for the table schemas
export type Invoice = typeof invoicesTable.$inferSelect; // For SELECT operations
export type NewInvoice = typeof invoicesTable.$inferInsert; // For INSERT operations

export type LineItem = typeof lineItemsTable.$inferSelect; // For SELECT operations
export type NewLineItem = typeof lineItemsTable.$inferInsert; // For INSERT operations

// Important: Export all tables and relations for proper query building
export const tables = { 
  invoices: invoicesTable, 
  lineItems: lineItemsTable 
};

export const tableRelations = { 
  invoicesRelations, 
  lineItemsRelations 
};