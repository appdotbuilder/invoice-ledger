import { initTRPC } from '@trpc/server';
import { createHTTPServer } from '@trpc/server/adapters/standalone';
import 'dotenv/config';
import cors from 'cors';
import superjson from 'superjson';
import { z } from 'zod';

// Import schemas
import { 
  createInvoiceInputSchema,
  updateInvoiceInputSchema,
  markInvoicePaidInputSchema
} from './schema';

// Import handlers
import { createInvoice } from './handlers/create_invoice';
import { getInvoices } from './handlers/get_invoices';
import { getInvoiceById } from './handlers/get_invoice_by_id';
import { updateInvoice } from './handlers/update_invoice';
import { markInvoicePaid } from './handlers/mark_invoice_paid';
import { deleteInvoice } from './handlers/delete_invoice';

const t = initTRPC.create({
  transformer: superjson,
});

const publicProcedure = t.procedure;
const router = t.router;

const appRouter = router({
  // Health check endpoint
  healthcheck: publicProcedure.query(() => {
    return { status: 'ok', timestamp: new Date().toISOString() };
  }),

  // Invoice management endpoints
  createInvoice: publicProcedure
    .input(createInvoiceInputSchema)
    .mutation(({ input }) => createInvoice(input)),

  getInvoices: publicProcedure
    .query(() => getInvoices()),

  getInvoiceById: publicProcedure
    .input(z.object({ id: z.number() }))
    .query(({ input }) => getInvoiceById(input.id)),

  updateInvoice: publicProcedure
    .input(updateInvoiceInputSchema)
    .mutation(({ input }) => updateInvoice(input)),

  markInvoicePaid: publicProcedure
    .input(markInvoicePaidInputSchema)
    .mutation(({ input }) => markInvoicePaid(input)),

  deleteInvoice: publicProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const success = await deleteInvoice(input.id);
      return { success };
    }),
});

export type AppRouter = typeof appRouter;

async function start() {
  const port = process.env['SERVER_PORT'] || 2022;
  const server = createHTTPServer({
    middleware: (req, res, next) => {
      cors()(req, res, next);
    },
    router: appRouter,
    createContext() {
      return {};
    },
  });
  server.listen(port);
  console.log(`TRPC server listening at port: ${port}`);
}

start();