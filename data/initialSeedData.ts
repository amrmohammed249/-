import type { AccountNode, Sale, ActivityLogEntry, Purchase, FixedAsset, User, Customer, Supplier, InventoryItem, JournalEntry, TreasuryTransaction, CompanyInfo, FinancialYear, PrintSettings, Notification, SaleReturn, PurchaseReturn, UnitDefinition, InventoryAdjustment, GeneralSettings } from '../types';

export const companyInfo: CompanyInfo = {
  name: "اسم الشركة",
  address: "العنوان",
  phone: "الهاتف",
};

export const generalSettingsData: GeneralSettings = {
  allowNegativeStock: false,
};

export const unitDefinitionsData: UnitDefinition[] = [
  { id: 'unit-1', name: 'قطعة' },
  { id: 'unit-2', name: 'كيلو' },
  { id: 'unit-3', name: 'جرام' },
  { id: 'unit-4', name: 'كرتونة' },
  { id: 'unit-5', name: 'شوال' },
  { id: 'unit-6', name: 'درزن' },
];

export const chartOfAccountsData: AccountNode[] = [
  {
    id: '1', name: 'الأصول', code: '1000', balance: 0,
    children: [
      {
        id: '1-1', name: 'الأصول المتداولة', code: '1100', balance: 0,
        children: [
          { 
            id: '1-1-1', name: 'الخزينة', code: '1101', balance: 0, 
            children: [
              { id: '1-1-1-1', name: 'الخزينة الرئيسية', code: '110101', balance: 0 }
            ]
          },
          { id: '1-1-2', name: 'البنك', code: '1102', balance: 0 },
          { id: '1-1-3', name: 'العملاء', code: '1103', balance: 0 },
          { id: '1-1-4', name: 'المخزون', code: '1104', balance: 0 },
        ],
      },
      {
        id: '1-2', name: 'الأصول الثابتة', code: '1200', balance: 0,
        children: [
          { id: '1-2-1', name: 'المباني', code: '1201', balance: 0 },
          { id: '1-2-2', name: 'السيارات', code: '1202', balance: 0 },
        ],
      },
    ],
  },
  {
    id: '2', name: 'الالتزامات', code: '2000', balance: 0,
    children: [
        { id: '2-1', name: 'الموردين', code: '2101', balance: 0 },
        { id: '2-2', name: 'القروض البنكية', code: '2102', balance: 0 },
    ]
  },
  {
    id: '3', name: 'حقوق الملكية', code: '3000', balance: 0,
    children: [
        { id: '3-1', name: 'رأس المال', code: '3101', balance: 0 },
        { id: '3-2', name: 'الأرباح المحتجزة', code: '3102', balance: 0 },
    ]
  },
   {
    id: '4', name: 'الإيرادات والمصروفات', code: '4000', balance: 0,
    children: [
        { id: '4-1', name: 'مبيعات محلية', code: '4101', balance: 0 },
        { id: '4-5', name: 'خصومات المبيعات', code: '4102', balance: 0 },
        { id: '4-6', name: 'خصومات المشتريات', code: '4103', balance: 0 },
        { 
            id: '4-2', name: 'مصروفات تشغيل', code: '4200', balance: 0,
            children: [
                {id: '4-2-1', name: 'رواتب', code: '4201', balance: 0},
                {id: '4-2-2', name: 'كهرباء', code: '4202', balance: 0},
                {id: '4-2-3', name: 'مصروف بضاعة تالفة', code: '4203', balance: 0},
                {id: '4-2-4', name: 'تكلفة البضاعة المباعة', code: '4204', balance: 0},
            ]
        },
        { id: '4-3', name: 'إيرادات أخرى', code: '4300', balance: 0, 
            children: [
                {id: '4-3-1', name: 'أرباح فروقات جرد', code: '4301', balance: 0}
            ]
        },
    ]
  }
];

export const sequencesData = {
    sale: 1,
    purchase: 1,
    priceQuote: 1,
    purchaseQuote: 1,
    saleReturn: 1,
    purchaseReturn: 1,
    item: 1,
    customer: 1,
    supplier: 1,
    journal: 1,
    treasury: 1,
    fixedAsset: 1,
    inventoryAdjustment: 1,
    account: 1,
    unit: 7,
    packingUnit: 1,
    barcode: 100001,
};


export const journalData: JournalEntry[] = [];

export const inventoryData: InventoryItem[] = [];
export const inventoryAdjustmentsData: InventoryAdjustment[] = [];

export const salesData: Sale[] = [];
export const priceQuotesData: any[] = [];

export const purchasesData: Purchase[] = [];
export const purchaseQuotesData: any[] = [];

export const treasuryData: TreasuryTransaction[] = [];

export const customersData: Customer[] = [];

export const suppliersData: Supplier[] = [];

export const usersData: User[] = [
  { id: 'U01', name: 'مدير النظام', username: 'admin', password: 'admin', role: 'مدير النظام' },
];

export const fixedAssetsData: FixedAsset[] = [];


export const financialYearData: FinancialYear = {
  startDate: `${new Date().getFullYear()}-01-01`,
  endDate: `${new Date().getFullYear()}-12-31`,
};

export const activityLogData: ActivityLogEntry[] = [];
export const saleReturnsData: SaleReturn[] = [];
export const purchaseReturnsData: PurchaseReturn[] = [];
export const notificationsData: Notification[] = [];

export const printSettingsData: PrintSettings = {
    // Base info
    logo: null,
    taxId: '123-456-789',
    commercialRegNo: '987654',
    
    // Visuals
    primaryColor: '#3B82F6',   // blue-500
    secondaryColor: '#1F2937', // gray-800
    fontSizes: {
        companyName: '1.5rem',
        invoiceTitle: '1.875rem',
        sectionHeadings: '0.875rem',
        tableHeader: '0.75rem',
        tableBody: '0.875rem',
        footer: '0.75rem',
    },
    logoSize: 100,
    logoAlignment: 'center',
    
    // Text Content
    text: {
      invoiceTitle: 'فاتورة ضريبية',
      footerText: 'شكراً لتعاملكم معنا.',
    },
    
    // Layout & Structure
    layout: ['itemsTable', 'summary', 'footerText'],
    
    itemsTableColumns: [
        { id: 'index', label: 'م', enabled: true },
        { id: 'itemName', label: 'الصنف/البيان', enabled: true },
        { id: 'unit', label: 'الوحدة', enabled: true },
        { id: 'quantity', label: 'الكمية', enabled: true },
        { id: 'price', label: 'سعر الوحدة', enabled: true },
        { id: 'total', label: 'الإجمالي', enabled: true },
    ],

    // Visibility
    visibility: {
        logo: true,
        companyInfo: true,
        spacer: true,
        invoiceTitle: true,
        billTo: true,
        invoiceMeta: true,
        itemsTable: true,
        summary: true,
        footerText: true,
    },
};