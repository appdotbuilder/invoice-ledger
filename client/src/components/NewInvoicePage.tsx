import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { toast } from 'sonner';
import { ArrowLeft } from 'lucide-react';
import { InvoiceForm } from '@/components/InvoiceForm';

interface NewInvoicePageProps {
  onNavigateToList: () => void;
}

export function NewInvoicePage({ onNavigateToList }: NewInvoicePageProps) {
  const handleSuccess = () => {
    toast.success('Invoice created successfully!');
    onNavigateToList();
  };

  const handleCancel = () => {
    onNavigateToList();
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <Button 
                variant="ghost" 
                size="sm"
                onClick={handleCancel}
                className="text-gray-600 hover:text-gray-900"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Invoices
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl font-semibold text-gray-900">
              Create New Invoice
            </CardTitle>
          </CardHeader>
          <CardContent>
            <InvoiceForm onSuccess={handleSuccess} />
            
            {/* Cancel Button */}
            <div className="flex justify-start mt-6">
              <Button 
                variant="outline" 
                onClick={handleCancel}
                className="border-gray-300 text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}