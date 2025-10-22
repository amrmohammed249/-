import type { AccountNode, Sale, ActivityLogEntry, Purchase, FixedAsset, InventoryItem } from '../types';

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

export const journalData = [];

export const inventoryData: InventoryItem[] = [];

export const salesData: Sale[] = [];
export const priceQuotesData: any[] = [];

export const purchasesData: Purchase[] = [];
export const purchaseQuotesData: any[] = [];

export const treasuryData = [];

export const customersData = [];

export const suppliersData = [];

export const usersData = [
  { id: 'U01', name: 'مدير النظام', username: 'admin', password: 'admin', role: 'مدير النظام' },
];

export const fixedAssetsData: FixedAsset[] = [];


export const financialYearData = {
  startDate: `${new Date().getFullYear()}-01-01`,
  endDate: `${new Date().getFullYear()}-12-31`,
};

export const activityLogData: ActivityLogEntry[] = [];