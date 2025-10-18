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
import SaleReturns from './components/sales/SaleReturns';
import Purchases from './components/purchases/Purchases';
import PurchaseReturns from './components/purchases/PurchaseReturns';
import Treasury from './components/treasury/Treasury';
import Customers from './components/customers/Customers';
import Suppliers from './components/suppliers/Suppliers';
import Reports from './components/reports/Reports';
import Settings from './components/settings/Settings';
import Login from './components/auth/Login';
import { DataContext } from './context/DataContext';
import Toast from './components/shared/Toast';
import ActivityLog from './components/activity/ActivityLog';
import Archive from './components/archive/Archive';
import FixedAssets from './components/fixedassets/FixedAssets';


const App: React.FC = () => {
  const { currentUser, isDataLoaded, hasData, createNewDataset } = useContext(DataContext);
  const location = useLocation();
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    if (isDataLoaded && !hasData) {
      createNewDataset("الشركة الرئيسية");
    }
  }, [isDataLoaded, hasData, createNewDataset]);

  useEffect(() => {
    // On route change, close the sidebar on mobile
    setSidebarOpen(false);
  }, [location]);

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
      <div dir="rtl" className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
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
              <Route path="/fixed-assets" element={<FixedAssets />} />
              <Route path="/sales" element={<Sales />} />
              <Route path="/sales-returns" element={<SaleReturns />} />
              <Route path="/purchases" element={<Purchases />} />
              <Route path="/purchases-returns" element={<PurchaseReturns />} />
              <Route path="/treasury" element={<Treasury />} />
              <Route path="/customers" element={<Customers />} />
              <Route path="/suppliers" element={<Suppliers />} />
              <Route path="/reports" element={<Reports />} />
              <Route path="/activity-log" element={<ActivityLog />} />
              <Route path="/archive" element={<Archive />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>
      </div>
      <Toast />
    </>
  );
};

export default App;
