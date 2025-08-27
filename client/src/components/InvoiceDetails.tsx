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
    // Calculate VAT components (assuming current amounts are exclusive of VAT)
    const vatRate = 0.05; // 5% VAT for UAE
    
    // Calculate totals for the invoice
    const totalAmountExclusiveVat = invoice.total_amount;
    const vatAmount = totalAmountExclusiveVat * vatRate;
    const totalAmountInclusiveVat = totalAmountExclusiveVat + vatAmount;
    
    // Create comprehensive print data object with VAT calculations
    const printData = {
      id: invoice.id,
      client_name: invoice.client_name,
      date: invoice.date,
      due_date: invoice.due_date,
      total_amount: invoice.total_amount,
      total_amount_exclusive_vat: totalAmountExclusiveVat,
      vat_amount: vatAmount,
      total_amount_inclusive_vat: totalAmountInclusiveVat,
      payment_status: invoice.payment_status,
      created_at: invoice.created_at,
      line_items: invoice.line_items.map(item => {
        const totalExclusiveVat = item.total;
        const itemVatAmount = totalExclusiveVat * vatRate;
        const totalInclusiveVat = totalExclusiveVat + itemVatAmount;
        
        return {
          id: item.id,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unit_price,
          total: item.total,
          total_exclusive_vat: totalExclusiveVat,
          vat_amount: itemVatAmount,
          total_inclusive_vat: totalInclusiveVat
        };
      })
    };

    // Open new window for print view
    const printWindow = window.open('about:blank', '_blank');
    if (printWindow) {
      printWindow.document.write(generatePrintHTML(printData));
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
        <title>Tax Invoice INV-${String(invoiceData.id).padStart(4, '0')}</title>
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
            line-height: 1.4;
            color: #000;
            background: #fff;
            padding: 30px;
            max-width: 900px;
            margin: 0 auto;
            font-size: 14px;
          }
          
          .invoice-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 30px;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 20px;
          }
          
          .tax-invoice-title {
            font-size: 32px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 5px;
          }
          
          .invoice-number {
            font-size: 16px;
            color: #666;
            font-weight: 500;
          }
          
          .status-badge {
            display: inline-block;
            padding: 6px 16px;
            border-radius: 6px;
            font-size: 12px;
            font-weight: bold;
            text-transform: uppercase;
          }
          
          .status-pending { background: #fef3c7; color: #92400e; border: 1px solid #f59e0b; }
          .status-paid { background: #d1fae5; color: #065f46; border: 1px solid #10b981; }
          .status-overdue { background: #fecaca; color: #991b1b; border: 1px solid #ef4444; }
          
          .company-info {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 40px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f8fafc;
            border-radius: 8px;
          }
          
          .supplier-info, .customer-info {
            border: 1px solid #e2e8f0;
            padding: 20px;
            border-radius: 6px;
            background: white;
          }
          
          .section-title {
            font-size: 16px;
            font-weight: bold;
            color: #2563eb;
            margin-bottom: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
          }
          
          .company-name {
            font-size: 18px;
            font-weight: bold;
            margin-bottom: 8px;
          }
          
          .company-address, .company-trn, .client-name, .client-address, .client-trn {
            margin-bottom: 4px;
            color: #374151;
          }
          
          .invoice-meta {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 30px;
            margin-bottom: 30px;
            padding: 20px;
            background: #f1f5f9;
            border-radius: 8px;
          }
          
          .meta-item {
            display: flex;
            justify-content: space-between;
            margin-bottom: 8px;
            padding: 4px 0;
          }
          
          .meta-label {
            font-weight: 600;
            color: #475569;
          }
          
          .meta-value {
            color: #1e293b;
          }
          
          .line-items-table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 30px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
            border-radius: 8px;
            overflow: hidden;
          }
          
          .line-items-table th {
            background: #2563eb;
            color: white;
            padding: 15px 10px;
            font-weight: 600;
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            text-align: center;
          }
          
          .line-items-table td {
            padding: 12px 10px;
            border-bottom: 1px solid #e2e8f0;
            vertical-align: top;
          }
          
          .line-items-table tbody tr:nth-child(even) {
            background: #f8fafc;
          }
          
          .line-items-table tbody tr:hover {
            background: #e2e8f0;
          }
          
          .text-right {
            text-align: right;
          }
          
          .text-center {
            text-align: center;
          }
          
          .financial-summary {
            margin: 30px 0;
            padding: 25px;
            background: #f8fafc;
            border: 2px solid #2563eb;
            border-radius: 8px;
            text-align: right;
          }
          
          .financial-summary p {
            display: flex;
            justify-content: space-between;
            margin-bottom: 10px;
            font-size: 15px;
          }
          
          .financial-summary h3 {
            display: flex;
            justify-content: space-between;
            font-size: 20px;
            color: #2563eb;
            border-top: 2px solid #2563eb;
            padding-top: 15px;
            margin-top: 15px;
          }
          
          .payment-details {
            margin: 30px 0;
            padding: 20px;
            background: #fef7ff;
            border: 1px solid #d8b4fe;
            border-radius: 8px;
          }
          
          .payment-details h3 {
            color: #7c3aed;
            margin-bottom: 15px;
            font-size: 16px;
          }
          
          .payment-details p {
            margin-bottom: 6px;
            color: #374151;
          }
          
          .footer-info {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
            font-size: 12px;
            color: #6b7280;
            text-align: center;
          }
          
          .tax-note {
            background: #fef9e7;
            border: 1px solid #f59e0b;
            border-radius: 6px;
            padding: 15px;
            margin: 20px 0;
            font-size: 13px;
            color: #92400e;
          }
          
          @media screen {
            body {
              box-shadow: 0 4px 6px rgba(0,0,0,0.1);
              border-radius: 12px;
            }
          }
        </style>
      </head>
      <body>
        <div class="invoice-header">
          <div>
            <h1 class="tax-invoice-title">TAX INVOICE</h1>
            <div class="invoice-number">INV-${String(invoiceData.id).padStart(4, '0')}</div>
          </div>
          <div>
            <span class="status-badge status-${invoiceData.payment_status}">
              ${invoiceData.payment_status.toUpperCase()}
            </span>
          </div>
        </div>

        <div class="company-info">
          <div class="supplier-info">
            <h3 class="section-title">From (Supplier)</h3>
            <p class="company-name">[Your Company Name]</p>
            <p class="company-address">[Your Company Address]</p>
            <p class="company-address">[City, Emirate, UAE]</p>
            <p class="company-trn"><strong>TRN:</strong> [Your TRN Number]</p>
          </div>
          
          <div class="customer-info">
            <h3 class="section-title">Bill To (Customer)</h3>
            <p class="client-name"><strong>${invoiceData.client_name}</strong></p>
            <p class="client-address">[Client Address]</p>
            <p class="client-address">[City, Emirate, UAE]</p>
            <p class="client-trn"><strong>TRN:</strong> [Client TRN Number]</p>
          </div>
        </div>

        <div class="invoice-meta">
          <div>
            <div class="meta-item">
              <span class="meta-label">Invoice No:</span>
              <span class="meta-value">INV-${String(invoiceData.id).padStart(4, '0')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date of Issue:</span>
              <span class="meta-value">${new Date(invoiceData.date).toLocaleDateString('en-AE')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Date of Supply:</span>
              <span class="meta-value">${new Date(invoiceData.date).toLocaleDateString('en-AE')} (Assumed)</span>
            </div>
          </div>
          
          <div>
            <div class="meta-item">
              <span class="meta-label">Due Date:</span>
              <span class="meta-value">${new Date(invoiceData.due_date).toLocaleDateString('en-AE')}</span>
            </div>
            <div class="meta-item">
              <span class="meta-label">Status:</span>
              <span class="meta-value">
                <span class="status-badge status-${invoiceData.payment_status}">${invoiceData.payment_status.toUpperCase()}</span>
              </span>
            </div>
          </div>
        </div>

        <table class="line-items-table">
          <thead>
            <tr>
              <th style="width: 40%; text-align: left;">Description</th>
              <th style="width: 8%;">Qty</th>
              <th style="width: 15%;">Unit Price<br/>(Excl. VAT)</th>
              <th style="width: 8%;">VAT Rate</th>
              <th style="width: 14%;">VAT Amount</th>
              <th style="width: 15%;">Total<br/>(Incl. VAT)</th>
            </tr>
          </thead>
          <tbody>
            ${invoiceData.line_items.map((item: any) => `
              <tr>
                <td style="text-align: left;"><strong>${item.description}</strong></td>
                <td class="text-center">${item.quantity}</td>
                <td class="text-right">AED ${item.unit_price.toFixed(2)}</td>
                <td class="text-center">5%</td>
                <td class="text-right">AED ${(item.total_exclusive_vat * 0.05).toFixed(2)}</td>
                <td class="text-right"><strong>AED ${(item.total_exclusive_vat * 1.05).toFixed(2)}</strong></td>
              </tr>
            `).join('')}
          </tbody>
        </table>

        <div class="tax-note">
          <strong>Note:</strong> This invoice is subject to UAE VAT at the standard rate of 5%. 
          VAT amounts are calculated on the supply value exclusive of VAT.
        </div>

        <div class="financial-summary">
          <p>
            <span><strong>Subtotal (Excl. VAT):</strong></span>
            <span><strong>AED ${invoiceData.total_amount_exclusive_vat.toFixed(2)}</strong></span>
          </p>
          <p>
            <span><strong>Total VAT (5%):</strong></span>
            <span><strong>AED ${invoiceData.vat_amount.toFixed(2)}</strong></span>
          </p>
          <h3>
            <span><strong>Total Amount Due (Incl. VAT):</strong></span>
            <span><strong>AED ${invoiceData.total_amount_inclusive_vat.toFixed(2)}</strong></span>
          </h3>
        </div>

        <div class="payment-details">
          <h3>Payment Information:</h3>
          <p><strong>Bank Name:</strong> [Your Bank Name]</p>
          <p><strong>Account No:</strong> [Your Account Number]</p>
          <p><strong>IBAN:</strong> [Your IBAN Number]</p>
          <p><strong>SWIFT Code:</strong> [Your SWIFT Code]</p>
        </div>

        <div class="footer-info">
          <p>This is a computer-generated tax invoice. No signature is required.</p>
          <p>Generated on ${new Date().toLocaleDateString('en-AE')} at ${new Date().toLocaleTimeString('en-AE')}</p>
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