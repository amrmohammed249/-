const CACHE_NAME = 'erp-app-cache-v2';
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/index.tsx',
  '/App.tsx',
  '/types.ts',
  '/vite.svg',
  'context/DataContext.tsx',
  'context/WindowContext.tsx',
  'context/idb-keyval.ts',
  'data/initialSeedData.ts',
  'data/mockData.ts',
  'components/layout/Sidebar.tsx',
  'components/layout/Header.tsx',
  'components/layout/ActiveWindowsBar.tsx',
  'components/layout/NotificationPanel.tsx',
  'components/dashboard/Dashboard.tsx',
  'components/dashboard/QuickActionButton.tsx',
  'components/dashboard/AccountStatementLauncherModal.tsx',
  'components/accounts/ChartOfAccounts.tsx',
  'components/accounts/JournalEntries.tsx',
  'components/accounts/AddAccountForm.tsx',
  'components/accounts/EditAccountForm.tsx',
  'components/accounts/AddJournalEntryForm.tsx',
  'components/accounts/EditJournalEntryForm.tsx',
  'components/accounts/OpeningBalancesModal.tsx',
  'components/inventory/Inventory.tsx',
  'components/inventory/InventoryAdjustments.tsx',
  'components/inventory/AddItemForm.tsx',
  'components/inventory/EditItemForm.tsx',
  'components/inventory/AddUnitForm.tsx',
  'components/inventory/AddInventoryAdjustmentForm.tsx',
  'components/inventory/EditInventoryAdjustmentForm.tsx',
  'components/sales/Sales.tsx',
  'components/sales/SaleList.tsx',
  'components/sales/AddSaleForm.tsx',
  'components/sales/EditSaleForm.tsx',
  'components/sales/SaleReturns.tsx',
  'components/sales/AddSaleReturnForm.tsx',
  'components/sales/EditSaleReturnForm.tsx',
  'components/sales/SaleReturnsForm.tsx',
  'components/sales/SaleReturnView.tsx',
  'components/sales/InvoiceView.tsx',
  'components/sales/PriceQuotes.tsx',
  'components/sales/PriceQuoteList.tsx',
  'components/sales/AddQuoteForm.tsx',
  'components/sales/QuoteView.tsx',
  'components/purchases/Purchases.tsx',
  'components/purchases/PurchaseList.tsx',
  'components/purchases/AddPurchaseForm.tsx',
  'components/purchases/EditPurchaseForm.tsx',
  'components/purchases/PurchaseReturns.tsx',
  'components/purchases/AddPurchaseReturnForm.tsx',
  'components/purchases/EditPurchaseReturnForm.tsx',
  'components/purchases/PurchaseReturnsForm.tsx',
  'components/purchases/PurchaseInvoiceView.tsx',
  'components/purchases/PurchaseReturnView.tsx',
  'components/purchases/PurchaseQuotes.tsx',
  'components/purchases/PurchaseQuoteList.tsx',
  'components/purchases/QuoteView.tsx',
  'components/treasury/Treasury.tsx',
  'components/treasury/AddTreasuryTransactionForm.tsx',
  'components/treasury/EditTreasuryTransactionForm.tsx',
  'components/treasury/AddTreasuryForm.tsx',
  'components/treasury/TransferFundsForm.tsx',
  'components/treasury/GeneralTransactionForm.tsx',
  'components/treasury/TreasuryVoucherView.tsx',
  'components/customers/Customers.tsx',
  'components/customers/CustomerProfile.tsx',
  'components/customers/AddCustomerForm.tsx',
  'components/customers/EditCustomerForm.tsx',
  'components/suppliers/Suppliers.tsx',
  'components/suppliers/SupplierProfile.tsx',
  'components/suppliers/AddSupplierForm.tsx',
  'components/suppliers/EditSupplierForm.tsx',
  'components/reports/Reports.tsx',
  'components/reports/SalesReport.tsx',
  'components/reports/PurchasesReport.tsx',
  'components/reports/ProfitAndLoss.tsx',
  'components/reports/BalanceSheet.tsx',
  'components/reports/CustomerSummaryReport.tsx',
  'components/reports/InventoryReport.tsx',
  'components/reports/SalesProfitabilityReport.tsx',
  'components/reports/ExpenseReport.tsx',
  'components/reports/SaleReturnsReport.tsx',
  'components/reports/PurchaseReturnsReport.tsx',
  'components/reports/TrialBalance.tsx',
  'components/reports/AccountStatement.tsx',
  'components/reports/GeneralLedger.tsx',
  'components/reports/ReportToolbar.tsx',
  'components/reports/TreasuryReport.tsx',
  'components/reports/ItemMovementReport.tsx',
  'components/reports/CustomerBalancesReport.tsx',
  'components/reports/SupplierBalancesReport.tsx',
  'components/settings/Settings.tsx',
  'components/settings/AddUserForm.tsx',
  'components/settings/EditUserForm.tsx',
  'components/settings/InvoiceCustomizer.tsx',
  'components/settings/BackupAndRestore.tsx',
  'components/settings/PrintSettingsPage.tsx',
  'components/auth/Login.tsx',
  'components/shared/AccessDenied.tsx',
  'components/shared/Card.tsx',
  'components/shared/ConfirmationModal.tsx',
  'components/shared/DataManagerModal.tsx',
  'components/shared/DataTable.tsx',
  'components/shared/Modal.tsx',
  'components/shared/PageHeader.tsx',
  'components/shared/SecurityFeaturesModal.tsx',
  'components/shared/Table.tsx',
  'components/shared/Toast.tsx',
  'components/shared/ViewDetailsModal.tsx',
  'components/activity/ActivityLog.tsx',
  'components/archive/Archive.tsx',
  'components/barcode/BarcodeTools.tsx',
  'components/printing/BarcodeLabelPrint.tsx',
  'components/printing/InvoiceTestPrintPage.tsx',
  'components/printing/BarcodeLabelBatchPrint.tsx',
  'components/invoice-elements/BillToElement.tsx',
  'components/invoice-elements/CompanyInfoElement.tsx',
  'components/invoice-elements/FooterTextElement.tsx',
  'components/invoice-elements/InvoiceMetaElement.tsx',
  'components/invoice-elements/InvoiceTitleElement.tsx',
  'components/invoice-elements/ItemsTableElement.tsx',
  'components/invoice-elements/LogoElement.tsx',
  'components/invoice-elements/SpacerElement.tsx',
  'components/invoice-elements/SummaryElement.tsx',
  'components/invoice-elements/NotesElement.tsx',
  'components/PlaceholderPage.tsx',
  'components/icons/index.ts',
  'components/icons/ArrowDownOnSquareIcon.tsx',
  'components/icons/ArrowDownTrayIcon.tsx',
  'components/icons/ArrowLeftOnRectangleIcon.tsx',
  'components/icons/ArrowPathIcon.tsx',
  'components/icons/ArrowTrendingDownIcon.tsx',
  'components/icons/ArrowTrendingUpIcon.tsx',
  'components/icons/ArrowUturnLeftIcon.tsx',
  'components/icons/ArrowUpOnSquareIcon.tsx',
  'components/icons/ArrowsUpDownIcon.tsx',
  'components/icons/ArchiveBoxIcon.tsx',
  'components/icons/BanknotesIcon.tsx',
  'components/icons/BarcodeIcon.tsx',
  'components/icons/Bars3Icon.tsx',
  'components/icons/BellIcon.tsx',
  'components/icons/BoxIcon.tsx',
  'components/icons/BuildingStorefrontIcon.tsx',
  'components/icons/ChartBarIcon.tsx',
  'components/icons/CheckCircleIcon.tsx',
  'components/icons/CheckIcon.tsx',
  'components/icons/ChevronDownIcon.tsx',
  'components/icons/ChevronLeftIcon.tsx',
  'components/icons/ChevronRightIcon.tsx',
  'components/icons/ChevronUpIcon.tsx',
  'components/icons/CircleStackIcon.tsx',
  'components/icons/ClipboardDocumentCheckIcon.tsx',
  'components/icons/ClipboardDocumentListIcon.tsx',
  'components/icons/ClockIcon.tsx',
  'components/icons/CogIcon.tsx',
  'components/icons/CreditCardIcon.tsx',
  'components/icons/DocumentIcon.tsx',
  'components/icons/DocumentPlusIcon.tsx',
  'components/icons/DocumentReportIcon.tsx',
  'components/icons/DocumentTextIcon.tsx',
  'components/icons/EnvelopeIcon.tsx',
  'components/icons/ExclamationTriangleIcon.tsx',
  'components/icons/EyeIcon.tsx',
  'components/icons/EyeSlashIcon.tsx',
  'components/icons/FolderIcon.tsx',
  'components/icons/FolderOpenIcon.tsx',
  'components/icons/HomeIcon.tsx',
  'components/icons/IdentificationIcon.tsx',
  'components/icons/InformationCircleIcon.tsx',
  'components/icons/LockClosedIcon.tsx',
  'components/icons/MagnifyingGlassIcon.tsx',
  'components/icons/MapPinIcon.tsx',
  'components/icons/MinusIcon.tsx',
  'components/icons/OfficeBuildingIcon.tsx',
  'components/icons/PencilIcon.tsx',
  'components/icons/PencilSquareIcon.tsx',
  'components/icons/PhoneIcon.tsx',
  'components/icons/PlusIcon.tsx',
  'components/icons/PrinterIcon.tsx',
  'components/icons/QuestionMarkCircleIcon.tsx',
  'components/icons/ScaleIcon.tsx',
  'components/icons/ShoppingCartIcon.tsx',
  'components/icons/TableCellsIcon.tsx',
  'components/icons/TrashIcon.tsx',
  'components/icons/TruckIcon.tsx',
  'components/icons/UploadIcon.tsx',
  'components/icons/UserIcon.tsx',
  'components/icons/UsersIcon.tsx',
  'components/icons/XIcon.tsx',
  // External
  'https://cdn.tailwindcss.com',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap',
  'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js',
  'https://aistudiocdn.com/recharts@^3.2.1',
  'https://aistudiocdn.com/react-router-dom@^7.9.3',
  'https://aistudiocdn.com/react@^19.2.0',
  'https://aistudiocdn.com/react-dom@^19.2.0/client',
  'https://aistudiocdn.com/react@^19.2.0/jsx-runtime'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Service Worker: Caching app shell');
        return cache.addAll(ASSETS_TO_CACHE).catch(err => {
            console.error('Failed to cache some assets during install:', err);
        });
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('Service Worker: Deleting old cache', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') {
    return;
  }
  
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      const fetchPromise = fetch(event.request).then((networkResponse) => {
        if (networkResponse && (networkResponse.status === 200 || networkResponse.type === 'opaque')) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
                cache.put(event.request, responseToCache);
            });
        }
        return networkResponse;
      });

      return cachedResponse || fetchPromise;
    })
  );
});