import { useState } from 'react';
import { Toaster } from 'sonner';
import { InvoiceListPage } from '@/components/InvoiceListPage';
import { NewInvoicePage } from '@/components/NewInvoicePage';

type AppView = 'list' | 'new';

function App() {
  const [currentView, setCurrentView] = useState<AppView>('list');

  const navigateToNewInvoice = () => {
    setCurrentView('new');
  };

  const navigateToList = () => {
    setCurrentView('list');
  };

  const renderCurrentView = () => {
    switch (currentView) {
      case 'new':
        return <NewInvoicePage onNavigateToList={navigateToList} />;
      case 'list':
      default:
        return <InvoiceListPage onNavigateToNewInvoice={navigateToNewInvoice} />;
    }
  };

  return (
    <div className="App">
      <Toaster />
      {renderCurrentView()}
    </div>
  );
}

export default App;