
import React, { useContext, useEffect, useState } from 'react';
import { Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Sidebar from './components/layout/Sidebar';
import Header from './components/layout/Header';
import Dashboard from './components/dashboard/Dashboard';
import ChartOfAccounts from './components/accounts/ChartOfAccounts';
import JournalEntries from './components/accounts/JournalEntries';
import Inventory from './components/inventory/Inventory';
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
import ProtectedRoute from './components/auth/ProtectedRoute';
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

  // 2. If we have data, proceed to login or main app.
  if (location.pathname === '/login') {
    return <Login />;
  }

  return (
    <>
      <div dir="rtl" className="flex h-screen bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200">
        {currentUser && <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />}
        <div className="flex-1 flex flex-col overflow-hidden">
          {currentUser && <Header onMenuClick={() => setSidebarOpen(true)} />}
          <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 sm:p-6">
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
              <Route path="/accounts/chart" element={<ProtectedRoute><ChartOfAccounts /></ProtectedRoute>} />
              <Route path="/accounts/journal" element={<ProtectedRoute><JournalEntries /></ProtectedRoute>} />
              <Route path="/inventory" element={<ProtectedRoute><Inventory /></ProtectedRoute>} />
              <Route path="/fixed-assets" element={<ProtectedRoute><FixedAssets /></ProtectedRoute>} />
              <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
              <Route path="/sales-returns" element={<ProtectedRoute><SaleReturns /></ProtectedRoute>} />
              <Route path="/purchases" element={<ProtectedRoute><Purchases /></ProtectedRoute>} />
              <Route path="/purchases-returns" element={<ProtectedRoute><PurchaseReturns /></ProtectedRoute>} />
              <Route path="/treasury" element={<ProtectedRoute><Treasury /></ProtectedRoute>} />
              <Route path="/customers" element={<ProtectedRoute><Customers /></ProtectedRoute>} />
              <Route path="/suppliers" element={<ProtectedRoute><Suppliers /></ProtectedRoute>} />
              <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
              <Route path="/activity-log" element={<ProtectedRoute><ActivityLog /></ProtectedRoute>} />
              <Route path="/archive" element={<ProtectedRoute><Archive /></ProtectedRoute>} />
              <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
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
