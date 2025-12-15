
import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import ChartOfAccounts from './components/accounts/ChartOfAccounts';
import JournalEntries from './components/accounts/JournalEntries';
import Inventory from './components/inventory/Inventory';
import InventoryAdjustments from './components/inventory/InventoryAdjustments';
import Sales from './components/sales/Sales';
import SaleList from './components/sales/SaleList';
import PriceQuotes from './components/sales/PriceQuotes';
import PriceQuoteList from './components/sales/PriceQuoteList';
import SaleReturns from './components/sales/SaleReturns';
import Purchases from './components/purchases/Purchases';
import PurchaseList from './components/purchases/PurchaseList';
import PurchaseQuotes from './components/purchases/PurchaseQuotes';
import PurchaseQuoteList from './components/purchases/PurchaseQuoteList';
import PurchaseReturns from './components/purchases/PurchaseReturns';
import Treasury from './components/treasury/Treasury';
import Customers from './components/customers/Customers';
import CustomerProfile from './components/customers/CustomerProfile';
import Suppliers from './components/suppliers/Suppliers';
import SupplierProfile from './components/suppliers/SupplierProfile';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import { DataContext } from './context/DataContext';
import Toast from './components/shared/Toast';
import ActivityLog from './components/activity/ActivityLog';
import Archive from './components/archive/Archive';
import { WindowContext } from './context/WindowContext';
import ActiveWindowsBar from './components/layout/ActiveWindowsBar';
import { ActiveWindow } from './types';
import BarcodeTools from './components/barcode/BarcodeTools';
import BarcodeLabelPrint from './components/printing/BarcodeLabelPrint';
import InvoiceTestPrintPage from './components/printing/InvoiceTestPrintPage';
import BarcodeLabelBatchPrint from './components/printing/BarcodeLabelBatchPrint';
import SaleReturnsForm from './components/sales/SaleReturnsForm';
import PurchaseReturnsForm from './components/purchases/PurchaseReturnsForm';
import PriceListBuilder from './components/sales/PriceListBuilder';
import FixedAssets from './components/fixedassets/FixedAssets';
import Settlements from './components/settlements/Settlements';


const App: React.FC = () => {
  const { currentUser, isDataLoaded, hasData, createNewDataset, processBarcodeScan } = useContext(DataContext);
  const { activeWindows, visibleWindowId, updateWindowState } = useContext(WindowContext);
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const isPrintRoute = location.pathname.startsWith('/print/');


  useEffect(() => {
    if (isDataLoaded && !hasData) {
      createNewDataset("الشركة الرئيسية");
    }
  }, [isDataLoaded, hasData, createNewDataset]);

  useEffect(() => {
    if (!isPrintRoute) {
      setSidebarOpen(false);
    }
  }, [location, isPrintRoute]);

  useEffect(() => {
      let barcode = '';
      let lastKeyTime = 0;

      const handleKeyDown = (e: KeyboardEvent) => {
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
              return;
          }

          const currentTime = Date.now();
          const timeDiff = currentTime - lastKeyTime;
          lastKeyTime = currentTime;

          if (timeDiff > 100) {
              barcode = '';
          }

          if (e.key === 'Enter') {
              if (barcode.length > 2) {
                  e.preventDefault();
                  processBarcodeScan(barcode);
              }
              barcode = '';
          } else if (e.key.length === 1) {
              barcode += e.key;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [processBarcodeScan]);


  const renderFullScreenPage = (window: ActiveWindow) => {
    const onStateChange = (updater: (prevState: any) => any) => {
      updateWindowState(window.id, updater);
    };

    switch (window.path) {
      case '/price-quotes':
        return <PriceQuotes windowId={window.id} windowState={window.state} onStateChange={onStateChange} />;
      case '/purchase-quotes':
        return <PurchaseQuotes windowId={window.id} windowState={window.state} onStateChange={onStateChange} />;
      case '/sales/new':
        return <Sales windowId={window.id} windowState={window.state} onStateChange={onStateChange} />;
      case '/purchases/new':
        return <Purchases windowId={window.id} windowState={window.state} onStateChange={onStateChange} />;
      case '/sales-returns/new':
        return <SaleReturnsForm windowId={window.id} windowState={window.state} onStateChange={onStateChange} />;
      case '/purchases-returns/new':
        return <PurchaseReturnsForm windowId={window.id} windowState={window.state} onStateChange={onStateChange} />;
      default:
        return null;
    }
  };
  
  if (isPrintRoute) {
    return (
      <Routes>
        <Route path="/print/test/barcode" element={<BarcodeLabelPrint />} />
        <Route path="/print/barcode/batch" element={<BarcodeLabelBatchPrint />} />
        <Route path="/print/barcode/:itemId" element={<BarcodeLabelPrint />} />
        <Route path="/print/test/invoice" element={<InvoiceTestPrintPage />} />
      </Routes>
    );
  }


  if (!isDataLoaded || !hasData) {
    return (
        <div dir="rtl" className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
           <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
             {isDataLoaded && !hasData ? '...جاري إعداد شركتك لأول مرة' : '...جاري تحميل البيانات'}
           </p>
        </div>
    );
  }
  
  if (!currentUser) {
    return (
        <>
            <Routes>
                <Route path="*" element={<Login />} />
            </Routes>
            <Toast />
        </>
    );
  }

  return (
    <>
      <div dir="rtl" className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="flex flex-1 overflow-hidden">
            <div className={`flex flex-1 overflow-hidden ${visibleWindowId ? 'hidden' : 'flex'}`}>
                <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
                <div className="flex-1 flex flex-col overflow-hidden">
                    <Header onMenuClick={() => setSidebarOpen(true)} />
                    <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                        <Routes>
                            <Route path="/login" element={<Navigate to="/" />} />
                            <Route path="/" element={<Dashboard />} />
                            <Route path="/accounts/chart" element={<ChartOfAccounts />} />
                            <Route path="/accounts/journal" element={<JournalEntries />} />
                            <Route path="/accounts/settlements" element={<Settlements />} />
                            <Route path="/inventory" element={<Inventory />} />
                            <Route path="/inventory/adjustments" element={<InventoryAdjustments />} />
                            <Route path="/barcode-tools" element={<BarcodeTools />} />
                            <Route path="/sales" element={<SaleList />} />
                            <Route path="/sales/edit/:id" element={<Sales />} />
                            <Route path="/sales/manual-price-list" element={<PriceListBuilder />} />
                            <Route path="/price-quotes/list" element={<PriceQuoteList />} />
                            <Route path="/purchases" element={<PurchaseList />} />
                            <Route path="/purchases/edit/:id" element={<Purchases />} />
                            <Route path="/purchase-quotes/list" element={<PurchaseQuoteList />} />
                            <Route path="/sales-returns" element={<SaleReturns />} />
                            <Route path="/purchases-returns" element={<PurchaseReturns />} />
                            <Route path="/treasury" element={<Treasury />} />
                            <Route path="/fixed-assets" element={<FixedAssets />} />
                            <Route path="/customers" element={<Customers />} />
                            <Route path="/customers/:id" element={<CustomerProfile />} />
                            <Route path="/suppliers" element={<Suppliers />} />
                            <Route path="/suppliers/:id" element={<SupplierProfile />} />
                            <Route path="/reports" element={<Reports />} />
                            <Route path="/activity-log" element={<ActivityLog />} />
                            <Route path="/archive" element={<Archive />} />
                            <Route path="/settings" element={<Settings />} />
                            <Route path="*" element={<Navigate to="/" />} />
                        </Routes>
                    </main>
                </div>
            </div>

            {activeWindows.map(window => (
                <div
                    key={window.id}
                    className={`flex-1 flex-col overflow-hidden ${window.id === visibleWindowId ? 'flex' : 'hidden'}`}
                >
                    {renderFullScreenPage(window)}
                </div>
            ))}
        </div>
        <ActiveWindowsBar />
      </div>
      <Toast />
    </>
  );
};

export default App;
