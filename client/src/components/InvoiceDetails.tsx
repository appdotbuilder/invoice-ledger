import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import { Edit2, Save, X, Trash2, Plus, Calculator, Calendar, User, DollarSign, Printer } from 'lucide-react';
import type { InvoiceWithLineItems, UpdateInvoiceInput, UpdateLineItemInput, PaymentStatus } from '../../../server/src/schema';

interface InvoiceDetailsProps {
  invoice: InvoiceWithLineItems;
  onUpdate: () => void;
}

export function InvoiceDetails({ invoice, onUpdate }: InvoiceDetailsProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [editData, setEditData] = useState<UpdateInvoiceInput>({
    id: invoice.id,
    client_name: invoice.client_name,
    date: invoice.date,
    due_date: invoice.due_date,
    payment_status: invoice.payment_status,
    line_items: invoice.line_items.map(item => ({
      id: item.id,
      description: item.description,
      quantity: item.quantity,
      unit_price: item.unit_price
    }))
  });

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await trpc.updateInvoice.mutate(editData);
      onUpdate();
      setIsEditing(false);
    } catch (error) {
      console.error('Failed to update invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = () => {
    setEditData({
      id: invoice.id,
      client_name: invoice.client_name,
      date: invoice.date,
      due_date: invoice.due_date,
      payment_status: invoice.payment_status,
      line_items: invoice.line_items.map(item => ({
        id: item.id,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price
      }))
    });
    setIsEditing(false);
  };

  const handleDelete = async () => {
    try {
      await trpc.deleteInvoice.mutate({ id: invoice.id });
      onUpdate();
    } catch (error) {
      console.error('Failed to delete invoice:', error);
    }
  };

  const handleMarkAsPaid = async () => {
    try {
      await trpc.markInvoicePaid.mutate({ id: invoice.id });
      onUpdate();
    } catch (error) {
      console.error('Failed to mark invoice as paid:', error);
    }
  };

  const addLineItem = () => {
    if (editData.line_items) {
      setEditData((prev: UpdateInvoiceInput) => ({
        ...prev,
        line_items: [
          ...(prev.line_items || []),
          {
            description: '',
            quantity: 1,
            unit_price: 0
          }
        ]
      }));
    }
  };

  const removeLineItem = (index: number) => {
    if (editData.line_items && editData.line_items.length > 1) {
      setEditData((prev: UpdateInvoiceInput) => ({
        ...prev,
        line_items: prev.line_items?.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index: number, field: keyof UpdateLineItemInput, value: string | number) => {
    if (editData.line_items) {
      setEditData((prev: UpdateInvoiceInput) => ({
        ...prev,
        line_items: prev.line_items?.map((item, i) =>
          i === index ? { ...item, [field]: value } : item
        )
      }));
    }
  };

  const calculateTotal = () => {
    if (!editData.line_items) return 0;
    return editData.line_items.reduce(
      (sum, item) => sum + ((item.quantity || 0) * (item.unit_price || 0)),
      0
    );
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
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

  const handlePrint = () => {
    // Create print data object to pass to the new window
    const printData = {
      invoice: {
        id: invoice.id,
        client_name: invoice.client_name,
        date: invoice.date.toISOString(),
        due_date: invoice.due_date.toISOString(),
        total_amount: invoice.total_amount,
        payment_status: invoice.payment_status,
        created_at: invoice.created_at.toISOString(),
        line_items: invoice.line_items.map(item => ({
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total
        }))
      }
    };

    // Open new window for print view
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(printData.invoice));
      printWindow.document.close();
      
      // Wait for content to load, then trigger print
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const generatePrintHTML = (invoiceData: any) => {
    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Invoice INV-${String(invoiceData.id).padStart(4, '0')}</title>
        <style>
          @media print {
            body { margin: 0; }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
          }
          
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
            line-height: 1.5;
            color: #000;
            background: #fff;
            padding: 40px;
            max-width: 800px;
            margin: 0 auto;
          }
          
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 40px;
            border-bottom: 2px solid #000;
            padding-bottom: 20px;
          }
          
          .invoice-title {
            font-size: 28px;
            font-weight: bold;
            color: #000;
          }
          
          .invoice-number {
            font-size: 18px;
            color: #666;
            margin-top: 5px;
          }
          
          .invoice-status {
            text-align: right;
          }
          
          .status-badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
            border: 1px solid #000;
          }
          
          .status-pending { background: #f3f4f6; color: #374151; }
          .status-paid { background: #d1fae5; color: #065f46; }
          .status-overdue { background: #fecaca; color: #991b1b; }
          
          .invoice-details {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 40px;
          }
          
          .detail-section h3 {
            font-size: 14px;
            font-weight: bold;
            color: #666;
            text-transform: uppercase;
            margin-bottom: 10px;
          }
          
          .detail-section p {
            font-size: 16px;
            margin-bottom: 8px;
          }
          
          .line-items {
            margin-bottom: 40px;
          }
          
          .line-items h3 {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 20px;
            color: #000;
          }
          
          .items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          
          .items-table th,
          .items-table td {
            text-align: left;
            padding: 12px 8px;
            border-bottom: 1px solid #e5e7eb;
          }
          
          .items-table th {
            background: #f9fafb;
            font-weight: bold;
            font-size: 12px;
            text-transform: uppercase;
            color: #666;
          }
          
          .items-table td {
            font-size: 14px;
          }
          
          .text-right {
            text-align: right;
          }
          
          .total-section {
            border-top: 2px solid #000;
            padding-top: 20px;
            text-align: right;
          }
          
          .total-amount {
            font-size: 24px;
            font-weight: bold;
            color: #000;
          }
          
          .print-date {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #666;
            text-align: center;
          }
          
          @media screen {
            body {
              box-shadow: 0 0 20px rgba(0,0,0,0.1);
              border-radius: 8px;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <h1 class="invoice-title">INVOICE</h1>
            <div class="invoice-number">INV-${String(invoiceData.id).padStart(4, '0')}</div>
          </div>
          <div class="invoice-status">
            <span class="status-badge status-${invoiceData.payment_status}">
              ${invoiceData.payment_status}
            </span>
          </div>
        </div>

        <div class="invoice-details">
          <div class="detail-section">
            <h3>Bill To</h3>
            <p><strong>${invoiceData.client_name}</strong></p>
          </div>
          
          <div class="detail-section">
            <h3>Invoice Details</h3>
            <p><strong>Invoice Date:</strong> ${new Date(invoiceData.date).toLocaleDateString()}</p>
            <p><strong>Due Date:</strong> ${new Date(invoiceData.due_date).toLocaleDateString()}</p>
            <p><strong>Created:</strong> ${new Date(invoiceData.created_at).toLocaleDateString()}</p>
          </div>
        </div>

        <div class="line-items">
          <h3>Items</h3>
          <table class="items-table">
            <thead>
              <tr>
                <th>Description</th>
                <th class="text-right">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.line_items.map((item: any) => `
                <tr>
                  <td>${item.description}</td>
                  <td class="text-right">${item.quantity}</td>
                  <td class="text-right">$${item.unit_price.toFixed(2)}</td>
                  <td class="text-right">$${item.total.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          
          <div class="total-section">
            <div class="total-amount">
              Total: $${invoiceData.total_amount.toFixed(2)}
            </div>
          </div>
        </div>

        <div class="print-date">
          Printed on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}
        </div>
      </body>
      </html>
    `;
  };

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold">INV-{String(invoice.id).padStart(4, '0')}</h2>
            <p className="text-sm text-gray-500">Created {invoice.created_at.toLocaleDateString()}</p>
          </div>
          <Badge variant={getStatusBadgeVariant(invoice.payment_status)}>
            {invoice.payment_status}
          </Badge>
        </div>
        
        <div className="flex items-center space-x-2">
          {invoice.payment_status === 'pending' && (
            <Button
              onClick={handleMarkAsPaid}
              variant="outline"
              size="sm"
              className="border-green-200 text-green-700 hover:bg-green-50"
            >
              Mark as Paid
            </Button>
          )}
          
          {isEditing ? (
            <>
              <Button onClick={handleSave} disabled={isLoading} size="sm" className="bg-gray-900 hover:bg-gray-800">
                <Save className="h-4 w-4 mr-1" />
                Save
              </Button>
              <Button onClick={handleCancel} variant="outline" size="sm">
                <X className="h-4 w-4 mr-1" />
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handlePrint} variant="outline" size="sm">
                <Printer className="h-4 w-4 mr-1" />
                Print
              </Button>
              <Button onClick={() => setIsEditing(true)} variant="outline" size="sm">
                <Edit2 className="h-4 w-4 mr-1" />
                Edit
              </Button>
            </>
          )}
          
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Invoice</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete this invoice? This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700">
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      {/* Invoice Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <User className="h-5 w-5 mr-2" />
            Invoice Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Client Name</Label>
              {isEditing ? (
                <Input
                  value={editData.client_name || ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData((prev: UpdateInvoiceInput) => ({ ...prev, client_name: e.target.value }))
                  }
                />
              ) : (
                <p className="text-sm font-medium">{invoice.client_name}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label>Payment Status</Label>
              {isEditing ? (
                <Select
                  value={editData.payment_status || 'pending'}
                  onValueChange={(value: PaymentStatus) =>
                    setEditData((prev: UpdateInvoiceInput) => ({ ...prev, payment_status: value }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="paid">Paid</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                  </SelectContent>
                </Select>
              ) : (
                <Badge variant={getStatusBadgeVariant(invoice.payment_status)}>
                  {invoice.payment_status}
                </Badge>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Invoice Date
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.date ? formatDateForInput(editData.date) : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData((prev: UpdateInvoiceInput) => ({ ...prev, date: new Date(e.target.value) }))
                  }
                />
              ) : (
                <p className="text-sm font-medium">{invoice.date.toLocaleDateString()}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center">
                <Calendar className="h-4 w-4 mr-1" />
                Due Date
              </Label>
              {isEditing ? (
                <Input
                  type="date"
                  value={editData.due_date ? formatDateForInput(editData.due_date) : ''}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setEditData((prev: UpdateInvoiceInput) => ({ ...prev, due_date: new Date(e.target.value) }))
                  }
                />
              ) : (
                <p className="text-sm font-medium">{invoice.due_date.toLocaleDateString()}</p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Line Items</CardTitle>
            {isEditing && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addLineItem}
                className="border-gray-900 text-gray-900 hover:bg-gray-900 hover:text-white"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Item
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <div className="space-y-4">
              {editData.line_items?.map((item, index) => (
                <div key={index} className="grid grid-cols-12 gap-3 items-end">
                  <div className="col-span-5 space-y-2">
                    {index === 0 && <Label>Description</Label>}
                    <Input
                      value={item.description || ''}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateLineItem(index, 'description', e.target.value)
                      }
                      placeholder="Item description"
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    {index === 0 && <Label>Quantity</Label>}
                    <Input
                      type="number"
                      min="1"
                      value={item.quantity || 1}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)
                      }
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    {index === 0 && <Label>Unit Price</Label>}
                    <Input
                      type="number"
                      min="0"
                      step="0.01"
                      value={item.unit_price || 0}
                      onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                        updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                      }
                    />
                  </div>
                  
                  <div className="col-span-2 space-y-2">
                    {index === 0 && <Label>Total</Label>}
                    <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center">
                      ${((item.quantity || 0) * (item.unit_price || 0)).toFixed(2)}
                    </div>
                  </div>
                  
                  <div className="col-span-1 flex justify-center">
                    {editData.line_items && editData.line_items.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeLineItem(index)}
                        className="text-red-600 hover:text-red-800 hover:bg-red-50"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3">
              {invoice.line_items.map((item) => (
                <div key={item.id} className="flex items-center justify-between py-3 border-b border-gray-100 last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{item.description}</p>
                    <p className="text-sm text-gray-500">
                      {item.quantity} × ${item.unit_price.toFixed(2)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">${item.total.toFixed(2)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
          
          {/* Total */}
          <div className="border-t pt-4 mt-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <div className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-gray-500" />
                <Calculator className="h-4 w-4 mr-1 text-gray-500" />
                Total Amount
              </div>
              <div>
                ${isEditing ? calculateTotal().toFixed(2) : invoice.total_amount.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}