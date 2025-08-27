import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { trpc } from '@/utils/trpc';
import { useForm, Controller, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'sonner';
import { Plus, Trash2, Calculator } from 'lucide-react';
import type { CreateInvoiceInput, PaymentStatus } from '../../../server/src/schema';
import { createInvoiceInputSchema } from '../../../server/src/schema';

interface InvoiceFormProps {
  onSuccess: () => void;
}

export function InvoiceForm({ onSuccess }: InvoiceFormProps) {
  const {
    register,
    control,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateInvoiceInput>({
    resolver: zodResolver(createInvoiceInputSchema),
    defaultValues: {
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
    }
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'line_items'
  });

  const watchedLineItems = watch('line_items');

  const onSubmit = async (data: CreateInvoiceInput) => {
    try {
      await trpc.createInvoice.mutate(data);
      toast.success('Invoice created successfully!');
      onSuccess();
      reset();
    } catch (error) {
      console.error('Failed to create invoice:', error);
      toast.error('Failed to create invoice. Please try again.');
    }
  };

  const addLineItem = () => {
    append({
      description: '',
      quantity: 1,
      unit_price: 0
    });
  };

  const removeLineItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const calculateTotal = () => {
    return watchedLineItems.reduce(
      (sum, item) => sum + (item.quantity * item.unit_price),
      0
    );
  };

  const formatDateForInput = (date: Date) => {
    return date.toISOString().split('T')[0];
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
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
                {...register('client_name')}
                placeholder="Enter client name"
              />
              {errors.client_name && (
                <p className="text-sm text-red-600">{errors.client_name.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payment_status">Payment Status</Label>
              <Controller
                control={control}
                name="payment_status"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={field.onChange}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="paid">Paid</SelectItem>
                      <SelectItem value="overdue">Overdue</SelectItem>
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.payment_status && (
                <p className="text-sm text-red-600">{errors.payment_status.message}</p>
              )}
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Invoice Date</Label>
              <Input
                id="date"
                type="date"
                {...register('date', { valueAsDate: true })}
              />
              {errors.date && (
                <p className="text-sm text-red-600">{errors.date.message}</p>
              )}
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="due_date">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                {...register('due_date', { valueAsDate: true })}
              />
              {errors.due_date && (
                <p className="text-sm text-red-600">{errors.due_date.message}</p>
              )}
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
          {fields.map((field, index) => (
            <div key={field.id} className="grid grid-cols-12 gap-3 items-end">
              <div className="col-span-5 space-y-2">
                {index === 0 && <Label>Description</Label>}
                <Input
                  {...register(`line_items.${index}.description`)}
                  placeholder="Item description"
                />
                {errors.line_items?.[index]?.description && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.description?.message}</p>
                )}
              </div>
              
              <div className="col-span-2 space-y-2">
                {index === 0 && <Label>Quantity</Label>}
                <Input
                  type="number"
                  min="1"
                  {...register(`line_items.${index}.quantity`, { valueAsNumber: true })}
                />
                {errors.line_items?.[index]?.quantity && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.quantity?.message}</p>
                )}
              </div>
              
              <div className="col-span-2 space-y-2">
                {index === 0 && <Label>Unit Price</Label>}
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  {...register(`line_items.${index}.unit_price`, { valueAsNumber: true })}
                />
                {errors.line_items?.[index]?.unit_price && (
                  <p className="text-sm text-red-600">{errors.line_items[index]?.unit_price?.message}</p>
                )}
              </div>
              
              <div className="col-span-2 space-y-2">
                {index === 0 && <Label>Total</Label>}
                <div className="h-10 px-3 py-2 border rounded-md bg-gray-50 text-sm flex items-center">
                  ${((watchedLineItems[index]?.quantity || 0) * (watchedLineItems[index]?.unit_price || 0)).toFixed(2)}
                </div>
              </div>
              
              <div className="col-span-1 flex justify-center">
                {fields.length > 1 && (
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
          
          {/* Line Items Errors */}
          {errors.line_items && typeof errors.line_items === 'object' && 'message' in errors.line_items && (
            <p className="text-sm text-red-600">{errors.line_items.message}</p>
          )}
          
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
          disabled={isSubmitting}
          className="bg-gray-900 hover:bg-gray-800 text-white px-8"
        >
          {isSubmitting ? 'Creating Invoice...' : 'Create Invoice'}
        </Button>
      </div>
    </form>
  );
}