import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { trpc } from '@/utils/trpc';
import { useState, useEffect, useCallback } from 'react';
import { Plus, FileText, Calendar, DollarSign, Filter } from 'lucide-react';
import { Toaster } from 'sonner';
import { InvoiceForm } from '@/components/InvoiceForm';
import { InvoiceDetails } from '@/components/InvoiceDetails';
import type { Invoice, InvoiceWithLineItems } from '../../server/src/schema';

function App() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithLineItems | null>(null);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isDetailsDialogOpen, setIsDetailsDialogOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  const loadInvoices = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await trpc.getInvoices.query();
      setInvoices(result);
    } catch (error) {
      console.error('Failed to load invoices:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const handleCreateInvoice = useCallback(async () => {
    await loadInvoices();
    setIsCreateDialogOpen(false);
  }, [loadInvoices]);

  const handleViewInvoice = async (invoiceId: number) => {
    try {
      const invoice = await trpc.getInvoiceById.query({ id: invoiceId });
      if (invoice) {
        setSelectedInvoice(invoice);
        setIsDetailsDialogOpen(true);
      }
    } catch (error) {
      console.error('Failed to load invoice details:', error);
    }
  };

  const handleMarkAsPaid = async (invoiceId: number) => {
    try {
      await trpc.markInvoicePaid.mutate({ id: invoiceId });
      await loadInvoices();
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
    }
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'paid':
        return 'default';
      case 'overdue':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const filteredInvoices = invoices.filter(invoice => {
    if (filter === 'all') return true;
    return invoice.payment_status === filter;
  });

  return (
    <div className="min-h-screen bg-gray-50">
      <Toaster />
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <FileText className="h-6 w-6 text-gray-900" />
              <h1 className="text-xl font-semibold text-gray-900">Invoice Ledger</h1>
            </div>
            
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-gray-900 hover:bg-gray-800 text-white">
                  <Plus className="h-4 w-4 mr-2" />
                  New Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                </DialogHeader>
                <InvoiceForm onSuccess={handleCreateInvoice} />
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Filter Bar */}
        <div className="mb-6">
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-500" />
            <div className="flex space-x-2">
              {['all', 'pending', 'paid', 'overdue'].map((status) => (
                <Button
                  key={status}
                  variant={filter === status ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setFilter(status)}
                  className={filter === status ? 'bg-gray-900 hover:bg-gray-800' : ''}
                >
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </Button>
              ))}
            </div>
          </div>
        </div>

        {/* Invoice List */}
        {isLoading ? (
          <div className="flex items-center justify-center h-64">
            <div className="text-gray-500">Loading invoices...</div>
          </div>
        ) : filteredInvoices.length === 0 ? (
          <Card className="p-12 text-center">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {filter === 'all' ? 'No invoices yet' : `No ${filter} invoices`}
            </h3>
            <p className="text-gray-500 mb-6">
              {filter === 'all' 
                ? 'Create your first invoice to get started.'
                : `There are no ${filter} invoices at the moment.`
              }
            </p>
            {filter === 'all' && (
              <Button 
                onClick={() => setIsCreateDialogOpen(true)}
                className="bg-gray-900 hover:bg-gray-800 text-white"
              >
                <Plus className="h-4 w-4 mr-2" />
                Create Invoice
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredInvoices.map((invoice: Invoice) => (
              <Card 
                key={invoice.id} 
                className="p-6 hover:shadow-md transition-shadow cursor-pointer border-gray-200"
                onClick={() => handleViewInvoice(invoice.id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-6">
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        INV-{String(invoice.id).padStart(4, '0')}
                      </div>
                      <div className="text-sm text-gray-500">#{invoice.id}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.client_name}
                      </div>
                      <div className="flex items-center text-sm text-gray-500">
                        <Calendar className="h-3 w-3 mr-1" />
                        {invoice.date.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-500">Due Date</div>
                      <div className="text-sm font-medium text-gray-900">
                        {invoice.due_date.toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <div className="flex items-center text-lg font-semibold text-gray-900">
                        <DollarSign className="h-4 w-4 mr-1" />
                        {invoice.total_amount.toFixed(2)}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge variant={getStatusBadgeVariant(invoice.payment_status)}>
                        {invoice.payment_status}
                      </Badge>
                      
                      {invoice.payment_status === 'pending' && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMarkAsPaid(invoice.id);
                          }}
                          className="border-green-200 text-green-700 hover:bg-green-50"
                        >
                          Mark Paid
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Invoice Details Dialog */}
      <Dialog open={isDetailsDialogOpen} onOpenChange={setIsDetailsDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Invoice Details - INV-{selectedInvoice ? String(selectedInvoice.id).padStart(4, '0') : ''}
            </DialogTitle>
          </DialogHeader>
          {selectedInvoice && (
            <InvoiceDetails 
              invoice={selectedInvoice} 
              onUpdate={() => {
                loadInvoices();
                setIsDetailsDialogOpen(false);
              }}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default App;