import type { AccountNode, Sale, ActivityLogEntry, Purchase, FixedAsset, InventoryItem } from '../types';

export const chartOfAccountsData: AccountNode[] = [
  {
    id: '1', name: 'الأصول', code: '1000',
    children: [
      {
        id: '1-1', name: 'الأصول المتداولة', code: '1100',
        children: [
          { id: '1-1-1', name: 'الخزينة', code: '1101', balance: 50000 },
          { id: '1-1-2', name: 'البنك', code: '1102', balance: 450000 },
          { id: '1-1-3', name: 'العملاء', code: '1103', balance: 120000 },
          { id: '1-1-4', name: 'المخزون', code: '1104', balance: 350000 },
        ],
      },
      {
        id: '1-2', name: 'الأصول الثابتة', code: '1200',
        children: [
          { id: '1-2-1', name: 'المباني', code: '1201', balance: 800000 },
          { id: '1-2-2', name: 'السيارات', code: '1202', balance: 150000 },
        ],
      },
    ],
  },
  {
    id: '2', name: 'الالتزامات', code: '2000',
    children: [
        { id: '2-1', name: 'الموردين', code: '2101', balance: 85000 },
        { id: '2-2', name: 'القروض البنكية', code: '2102', balance: 200000 },
    ]
  },
  {
    id: '3', name: 'حقوق الملكية', code: '3000',
    children: [
        { id: '3-1', name: 'رأس المال', code: '3101', balance: 1000000 },
        { id: '3-2', name: 'الأرباح المحتجزة', code: '3102', balance: 250000 },
    ]
  },
   {
    id: '4', name: 'الإيرادات والمصروفات', code: '4000',
    children: [
        { id: '4-1', name: 'مبيعات محلية', code: '4101', balance: 1250000 },
        { 
            id: '4-2', name: 'مصروفات تشغيل', code: '4200',
            children: [
                {id: '4-2-1', name: 'رواتب', code: '4201', balance: 150000},
                {id: '4-2-2', name: 'كهرباء', code: '4202', balance: 1500},
            ]
        },
    ]
  }
];

export const journalData = [
  { 
    id: 'JV-001', 
    date: '2024-05-12', 
    description: 'إثبات فاتورة مبيعات رقم INV-2024-004', 
    debit: 32000, 
    credit: 32000,
    status: 'مرحل',
    lines: [
        { accountId: '1-1-3', accountName: 'العملاء', debit: 32000, credit: 0 },
        { accountId: '4-1', accountName: 'مبيعات محلية', debit: 0, credit: 32000 },
    ]
  },
  { 
    id: 'JV-002', 
    date: '2024-05-15', 
    description: 'تحصيل دفعة من شركة الأفق', 
    debit: 5000, 
    credit: 5000,
    status: 'مرحل',
    lines: [
        { accountId: '1-1-1', accountName: 'الخزينة', debit: 5000, credit: 0 },
        { accountId: '1-1-3', accountName: 'العملاء', debit: 0, credit: 5000 },
    ]
  },
  { 
    id: 'JV-003', 
    date: '2024-05-16', 
    description: 'سداد فاتورة كهرباء', 
    debit: 1500, 
    credit: 1500,
    status: 'مرحل',
    lines: [
        { accountId: '4-2-2', accountName: 'كهرباء', debit: 1500, credit: 0 },
        { accountId: '1-1-1', accountName: 'الخزينة', debit: 0, credit: 1500 },
    ]
  },
  { 
    id: 'JV-004', 
    date: '2024-05-18', 
    description: 'إثبات فاتورة مشتريات BILL-2024-003', 
    debit: 55000, 
    credit: 55000,
    status: 'مرحل',
    lines: [
        { accountId: '1-1-4', accountName: 'المخزون', debit: 55000, credit: 0 },
        { accountId: '2-1', accountName: 'الموردين', debit: 0, credit: 55000 },
    ]
  },
];

export const inventoryData: InventoryItem[] = [
  { id: 'ITM001', name: 'لابتوب Dell XPS 15', baseUnit: 'قطعة', units: [], category: 'إلكترونيات', purchasePrice: 5500, salePrice: 6500, stock: 15 },
  { id: 'ITM002', name: 'شاشة Samsung 27"', baseUnit: 'قطعة', units: [], category: 'إلكترونيات', purchasePrice: 1200, salePrice: 1500, stock: 25 },
  { id: 'ITM003', name: 'كرسي مكتب طبي', baseUnit: 'قطعة', units: [], category: 'أثاث مكتبي', purchasePrice: 450, salePrice: 600, stock: 40 },
  { id: 'ITM004', name: 'ورق طباعة A4', baseUnit: 'رزنة', units: [], category: 'مستلزمات مكتبية', purchasePrice: 15, salePrice: 20, stock: 200 },
];

export const salesData: Sale[] = [
  { id: 'INV-2024-001', customer: 'شركة الأفق للتجارة', date: '2024-05-01', total: 15000, status: 'مدفوعة', items: [
      { itemId: 'ITM001', itemName: 'لابتوب Dell XPS 15', unitId: 'base', unitName: 'قطعة', quantity: 2, price: 6500, total: 13000 },
      { itemId: 'ITM002', itemName: 'شاشة Samsung 27"', unitId: 'base', unitName: 'قطعة', quantity: 1, price: 2000, total: 2000 },
  ]},
  { id: 'INV-2024-002', customer: 'مؤسسة البناء الحديث', date: '2024-05-05', total: 8500, status: 'جزئية', items: [
    { itemId: 'ITM003', itemName: 'كرسي مكتب طبي', unitId: 'base', unitName: 'قطعة', quantity: 10, price: 600, total: 6000 },
    { itemId: 'ITM004', itemName: 'ورق طباعة A4', unitId: 'base', unitName: 'رزنة', quantity: 125, price: 20, total: 2500 },
  ] },
  { id: 'INV-2024-003', customer: 'محمد الأحمد', date: '2024-05-10', total: 2500, status: 'مستحقة', items: [
      { itemId: 'ITM002', itemName: 'شاشة Samsung 27"', unitId: 'base', unitName: 'قطعة', quantity: 1, price: 1500, total: 1500 },
      { itemId: 'ITM003', itemName: 'كرسي مكتب طبي', unitId: 'base', unitName: 'قطعة', quantity: 1, price: 600, total: 600 },
  ] },
  { id: 'INV-2024-004', customer: 'شركة الوادي الأخضر', date: '2024-05-12', total: 32000, status: 'مدفوعة', items: [
       { itemId: 'ITM001', itemName: 'لابتوب Dell XPS 15', unitId: 'base', unitName: 'قطعة', quantity: 5, price: 6400, total: 32000 },
  ] },
];

export const purchasesData: Purchase[] = [
    { id: 'BILL-2024-001', supplier: 'الموردون الدوليون', date: '2024-04-20', total: 25000, status: 'مدفوعة', items: [
        { itemId: 'ITM001', itemName: 'لابتوب Dell XPS 15', unitId: 'base', unitName: 'قطعة', quantity: 4, price: 5500, total: 22000 },
        { itemId: 'ITM004', itemName: 'ورق طباعة A4', unitId: 'base', unitName: 'رزنة', quantity: 200, price: 15, total: 3000 },
    ]},
    { id: 'BILL-2024-002', supplier: 'شركة التجهيزات المكتبية', date: '2024-04-25', total: 7200, status: 'مستحقة', items: [
        { itemId: 'ITM003', itemName: 'كرسي مكتب طبي', unitId: 'base', unitName: 'قطعة', quantity: 16, price: 450, total: 7200 }
    ]},
    { id: 'BILL-2024-003', supplier: 'مصنع الإلكترونيات الحديثة', date: '2024-05-02', total: 55000, status: 'مدفوعة', items: [
        { itemId: 'ITM001', itemName: 'لابتوب Dell XPS 15', unitId: 'base', unitName: 'قطعة', quantity: 10, price: 5500, total: 55000 }
    ]},
];

export const treasuryData = [
  { id: 'TRN001', date: '2024-05-15', type: 'سند قبض', description: 'دفعة من شركة الأفق', amount: 5000, balance: 505000 },
  { id: 'TRN002', date: '2024-05-16', type: 'سند صرف', description: 'مصروفات كهرباء', amount: -1500, balance: 503500 },
  { id: 'TRN003', date: '2024-05-16', type: 'سند صرف', description: 'سداد للموردين الدوليين', amount: -25000, balance: 478500 },
  { id: 'TRN004', date: '2024-05-17', type: 'سند قبض', description: 'مبيعات نقدية', amount: 3200, balance: 481700 },
];

export const customersData = [
  { id: 'CUS001', name: 'شركة الأفق للتجارة', contact: 'sales@alofoq.com', phone: '0501234567', balance: 12500 },
  { id: 'CUS002', name: 'مؤسسة البناء الحديث', contact: 'info@modern.sa', phone: '0559876543', balance: 0 },
  { id: 'CUS003', name: 'محمد الأحمد', contact: 'm.ahmad@email.com', phone: '0533334444', balance: -2500 },
  { id: 'CUS004', name: 'شركة الوادي الأخضر', contact: 'contact@greenvalley.com', phone: '0541112222', balance: 5000 },
];

export const suppliersData = [
  { id: 'SUP001', name: 'الموردون الدوليون', contact: 'contact@int-suppliers.com', phone: '0112345678', balance: 45000 },
  { id: 'SUP002', name: 'شركة التجهيزات المكتبية', contact: 'sales@office-supplies.co', phone: '0129876543', balance: 7200 },
  { id: 'SUP003', name: 'مصنع الإلكترونيات الحديثة', contact: 'info@modernelectronics.com', phone: '0133334444', balance: 0 },
];

export const usersData = [
  { id: 'U01', name: 'مدير النظام', username: 'U01', password: 'admin123', role: 'مدير النظام' },
  { id: 'U02', name: 'محاسب', username: 'U02', password: 'acc123', role: 'محاسب' },
  { id: 'U03', name: 'مدخل بيانات', username: 'U03', password: 'data123', role: 'مدخل بيانات' },
];

export const fixedAssetsData: FixedAsset[] = [
  {
    id: 'FA-001',
    name: 'مبنى الإدارة الرئيسي',
    acquisitionDate: '2022-01-15',
    cost: 750000,
    depreciationRate: 2, // 2%
    accumulatedDepreciation: 30000,
    bookValue: 720000,
  },
  {
    id: 'FA-002',
    name: 'سيارة توزيع (تويوتا)',
    acquisitionDate: '2023-06-01',
    cost: 120000,
    depreciationRate: 15, // 15%
    accumulatedDepreciation: 18000,
    bookValue: 102000,
  },
  {
    id: 'FA-003',
    name: 'أجهزة كمبيوتر وخوادم',
    acquisitionDate: '2023-09-20',
    cost: 45000,
    depreciationRate: 25, // 25%
    accumulatedDepreciation: 9375,
    bookValue: 35625,
  },
];


export const financialYearData = {
  startDate: `${new Date().getFullYear()}-01-01`,
  endDate: `${new Date().getFullYear()}-12-31`,
};

export const activityLogData: ActivityLogEntry[] = [];