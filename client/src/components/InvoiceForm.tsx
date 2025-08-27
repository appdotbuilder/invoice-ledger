import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { useState } from 'react';
import { Plus, Trash2, Calculator } from 'lucide-react';
import type { CreateInvoiceInput, CreateLineItemInput, PaymentStatus } from '../../../server/src/schema';

interface InvoiceFormProps {
  onSuccess: () => void;
}

export function InvoiceForm({ onSuccess }: InvoiceFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState<CreateInvoiceInput>({
    client_name: '',
    date: new Date(),
    due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
    line_items: [
      {
        description: '',
        quantity: 1,
        unit_price: 0
      }
    ],
    payment_status: 'pending' as PaymentStatus
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await trpc.createInvoice.mutate(formData);
      onSuccess();
      
      // Reset form
      setFormData({
        client_name: '',
        date: new Date(),
        due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        line_items: [
          {
            description: '',
            quantity: 1,
            unit_price: 0
          }
        ],
        payment_status: 'pending'
      });
    } catch (error) {
      console.error('Failed to create invoice:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const addLineItem = () => {
    setFormData((prev: CreateInvoiceInput) => ({
      ...prev,
      line_items: [
        ...prev.line_items,
        {
          description: '',
          quantity: 1,
          unit_price: 0
        }
      ]
    }));
  };

  const removeLineItem = (index: number) => {
    if (formData.line_items.length > 1) {
      setFormData((prev: CreateInvoiceInput) => ({
        ...prev,
        line_items: prev.line_items.filter((_, i) => i !== index)
      }));
    }
  };

  const updateLineItem = (index: number, field: keyof CreateLineItemInput, value: string | number) => {
    setFormData((prev: CreateInvoiceInput) => ({
      ...prev,
      line_items: prev.line_items.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
    }));
  };

  const calculateTotal = () => {
    return formData.line_items.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price),
      0
    );
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic Invoice Information */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Invoice Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="client_name">Client Name</Label>
              <Input
                id="client_name"
                value={formData.client_name}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInvoiceInput) => ({ ...prev, client_name: e.target.value }))
                }
                placeholder="Enter client name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Select
                value={formData.payment_status}
                onValueChange={(value: PaymentStatus) =>
                  setFormData((prev: CreateInvoiceInput) => ({ ...prev, payment_status: value }))
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
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Invoice Date</Label>
              <Input
                id="date"
                type="date"
                value={formatDateForInput(formData.date)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInvoiceInput) => ({ ...prev, date: new Date(e.target.value) }))
                }
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formatDateForInput(formData.due_date)}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                  setFormData((prev: CreateInvoiceInput) => ({ ...prev, due_date: new Date(e.target.value) }))
                }
                required
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Line Items */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Line Items</CardTitle>
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
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {formData.line_items.map((item, index) => (
            <div key={index} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5 space-y-2">
                {index === 0 && <Label>Description</Label>}
                <Input
                  value={item.description}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateLineItem(index, 'description', e.target.value)
                  }
                  placeholder="Item description"
                  required
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                {index === 0 && <Label>Quantity</Label>}
                <Input
                  type="number"
                  min="1"
                  value={item.quantity}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateLineItem(index, 'quantity', parseInt(e.target.value) || 1)
                  }
                  required
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                {index === 0 && <Label>Unit Price</Label>}
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={item.unit_price}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)
                  }
                  required
                />
              </div>
              
              <div className="col-span-2 space-y-2">
                {index === 0 && <Label>Total</Label>}
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center">
                  ${(item.quantity * item.unit_price).toFixed(2)}
                </div>
              </div>
              
              <div className="col-span-1 flex justify-center">
                {formData.line_items.length > 1 && (
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
          
          {/* Total Section */}
          <div className="border-t pt-4 mt-6">
            <div className="flex items-center justify-between text-lg font-semibold">
              <div className="flex items-center">
                <Calculator className="h-5 w-5 mr-2 text-gray-500" />
                Total Amount
              </div>
              <div>${calculateTotal().toFixed(2)}</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Submit Button */}
      <div className="flex justify-end space-x-3">
        <Button 
          type="submit" 
          disabled={isLoading || !formData.client_name || formData.line_items.some(item => !item.description)}
          className="bg-gray-900 hover:bg-gray-800 text-white px-8"
        >
          {isLoading ? 'Creating Invoice...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}