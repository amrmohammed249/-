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
import FixedAssets from './components/fixedassets/FixedAssets';
import { WindowContext } from './context/WindowContext';
import ActiveWindowsBar from './components/layout/ActiveWindowsBar';
import { ActiveWindow } from './types';
import BarcodeTools from './components/barcode/BarcodeTools';
import BarcodeLabelPrint from './components/printing/BarcodeLabelPrint';
import InvoiceTestPrintPage from './components/printing/InvoiceTestPrintPage';
import BarcodeLabelBatchPrint from './components/printing/BarcodeLabelBatchPrint';


const App: React.FC = () => {
  const { currentUser, isDataLoaded, hasData, createNewDataset, processBarcodeScan } = useContext(DataContext);
  const { activeWindows, visibleWindowId } = useContext(WindowContext);
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  const visibleWindow = activeWindows.find(w => w.id === visibleWindowId);
  const isPrintRoute = location.pathname.startsWith('/print/');


  useEffect(() => {
    if (isDataLoaded && !hasData) {
      createNewDataset("الشركة الرئيسية");
    }
  }, [isDataLoaded, hasData, createNewDataset]);

  useEffect(() => {
    // On route change, close the sidebar on mobile
    if (!isPrintRoute) {
      setSidebarOpen(false);
    }
  }, [location, isPrintRoute]);

  // Barcode scanner listener logic
  useEffect(() => {
      let barcode = '';
      let lastKeyTime = 0;

      const handleKeyDown = (e: KeyboardEvent) => {
          // Ignore events from inputs, textareas, and selects to avoid interfering with manual typing
          const activeEl = document.activeElement;
          if (activeEl && (activeEl.tagName === 'INPUT' || activeEl.tagName === 'TEXTAREA' || activeEl.tagName === 'SELECT')) {
              return;
          }

          const currentTime = Date.now();
          const timeDiff = currentTime - lastKeyTime;
          lastKeyTime = currentTime;

          // Reset if the delay between keys is too long, indicating manual typing
          if (timeDiff > 100) {
              barcode = '';
          }

          if (e.key === 'Enter') {
              if (barcode.length > 2) { // Minimum length for a barcode scan
                  e.preventDefault();
                  processBarcodeScan(barcode);
              }
              barcode = '';
          } else if (e.key.length === 1) { // It's a character, not a control key
              barcode += e.key;
          }
      };

      window.addEventListener('keydown', handleKeyDown);
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [processBarcodeScan]);


  const renderFullScreenPage = (window: ActiveWindow) => {
    switch (window.path) {
      case '/price-quotes':
        return <PriceQuotes windowId={window.id} />;
      case '/purchase-quotes':
        return <PurchaseQuotes windowId={window.id} />;
      case '/sales/new':
        return <Sales windowId={window.id} />;
      case '/purchases/new':
        return <Purchases windowId={window.id} />;
      default:
        return null;
    }
  };
  
  // Special rendering for print routes to avoid the main layout
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


  // 1. Initial loading state while waiting for data to load or first dataset to be created.
  if (!isDataLoaded || !hasData) {
    return (
        <div dir="rtl" className="flex h-screen w-full items-center justify-center bg-gray-100 dark:bg-gray-900">
           <p className="text-lg font-semibold text-gray-700 dark:text-gray-200">
             {isDataLoaded && !hasData ? '...جاري إعداد شركتك لأول مرة' : '...جاري تحميل البيانات'}
           </p>
        </div>
    );
  }
  
  // 2. If no user is logged in, only render the Login page for all routes.
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

  // 3. If user is logged in, render the full application layout.
  return (
    <>
      <div dir="rtl" className="flex flex-col h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        <div className="flex flex-1 overflow-hidden">
          {visibleWindow ? (
            <div className="flex-1 flex flex-col overflow-hidden">
              {renderFullScreenPage(visibleWindow)}
            </div>
          ) : (
            <>
              <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
              <div className="flex-1 flex flex-col overflow-hidden">
                <Header onMenuClick={() => setSidebarOpen(true)} />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
                  <Routes>
                    <Route path="/login" element={<Navigate to="/" />} />
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/accounts/chart" element={<ChartOfAccounts />} />
                    <Route path="/accounts/journal" element={<JournalEntries />} />
                    <Route path="/inventory" element={<Inventory />} />
                    <Route path="/inventory/adjustments" element={<InventoryAdjustments />} />
                    <Route path="/barcode-tools" element={<BarcodeTools />} />
                    <Route path="/fixed-assets" element={<FixedAssets />} />
                    <Route path="/sales" element={<SaleList />} />
                    <Route path="/sales/edit/:id" element={<Sales />} />
                    <Route path="/price-quotes/list" element={<PriceQuoteList />} />
                    <Route path="/purchases" element={<PurchaseList />} />
                    <Route path="/purchases/edit/:id" element={<Purchases />} />
                    <Route path="/purchase-quotes/list" element={<PurchaseQuoteList />} />
                    <Route path="/sales-returns" element={<SaleReturns />} />
                    <Route path="/purchases-returns" element={<PurchaseReturns />} />
                    <Route path="/treasury" element={<Treasury />} />
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
            </>
          )}
        </div>
        <ActiveWindowsBar />
      </div>
      <Toast />
    </>
  );
};

export default App;