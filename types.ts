import { ReactNode } from 'react';

export interface AccountNode {
  id: string;
  name: string;
  code: string;
  balance?: number;
  children?: AccountNode[];
}

export type Account = AccountNode;


export interface UnitDefinition {
  id: string;
  name: string;
}

export interface PackingUnit {
  id: string;
  name: string;
  factor: number; // How many base units are in this packing unit
  purchasePrice: number;
  salePrice: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  barcode?: string;
  baseUnit: string; // The smallest unit for tracking stock (e.g., 'كيلو', 'قطعة')
  units: PackingUnit[]; // Array of bigger units (e.g., 'شوال', 'كرتونة')
  category: string;
  purchasePrice: number; // Price for the base unit
  salePrice: number; // Price for the base unit
  stock: number; // Always in baseUnit
  isArchived?: boolean;
}

export interface LineItem {
  itemId: string;
  itemName: string;
  unitId: string; // Can be 'base' or a PackingUnit.id
  unitName: string; // e.g., 'كيلو' or 'شوال'
  quantity: number; // Quantity of the selected unit
  price: number; // Price of the selected unit
  discount: number; // Discount amount for this line
  total: number;
}

export interface Sale {
  id: string;
  customer: string;
  date: string;
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  status: 'مدفوعة' | 'مستحقة' | 'جزئية';
  journalEntryId?: string;
  isArchived?: boolean;
}

export interface PriceQuote {
  id: string;
  customer: string;
  date: string;
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  status: 'جديد' | 'تم تحويله' | 'ملغي';
  isArchived?: boolean;
}

export interface Purchase {
  id: string;
  supplier: string;
  date: string;
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  status: 'مدفوعة' | 'مستحقة';
  journalEntryId?: string;
  isArchived?: boolean;
}

export interface PurchaseQuote {
  id: string;
  supplier: string;
  date: string;
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  status: 'جديد' | 'تم تحويله' | 'ملغي';
  isArchived?: boolean;
}


export interface SaleReturn {
  id: string;
  customer: string;
  date: string;
  originalSaleId?: string;
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  journalEntryId?: string;
  isArchived?: boolean;
}

export interface PurchaseReturn {
  id: string;
  supplier: string;
  date: string;
  originalPurchaseId?: string;
  items: LineItem[];
  subtotal: number;
  totalDiscount: number;
  total: number;
  journalEntryId?: string;
  isArchived?: boolean;
}

export interface InventoryAdjustmentLineItem {
  itemId: string;
  itemName: string;
  quantity: number; // always in base unit
  cost: number; // purchase price per base unit
  total: number;
}

export interface InventoryAdjustment {
  id: string;
  date: string;
  type: 'إضافة' | 'صرف';
  contraAccountId: string;
  contraAccountName: string;
  description: string;
  items: InventoryAdjustmentLineItem[];
  totalValue: number;
  journalEntryId: string;
  isArchived?: boolean;
}

export interface TreasuryTransaction {
  id: string;
  date: string;
  type: 'سند قبض' | 'سند صرف';
  description: string;
  amount: number;
  balance: number; // This will likely represent the balance of the specific treasury
  partyType?: 'customer' | 'supplier' | 'account';
  partyId?: string;
  accountName?: string;
  treasuryAccountId: string;
  treasuryAccountName: string;
  journalEntryId?: string;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  balance: number;
  isArchived?: boolean;
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  balance: number;
  isArchived?: boolean;
}

export interface User {
  id: string;
  name: string;
  username: string;
  password?: string;
  role: 'مدير النظام' | 'محاسب' | 'مدخل بيانات';
  isArchived?: boolean;
}

export interface JournalLine {
  accountId: string;
  accountName: string;
  debit: number;
  credit: number;
}

export interface JournalEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  status: 'مرحل' | 'تحت المراجعة';
  lines: JournalLine[];
  isArchived?: boolean;
}

export interface FixedAsset {
  id: string;
  name: string;
  acquisitionDate: string;
  cost: number;
  depreciationRate: number;
  accumulatedDepreciation: number;
  bookValue: number;
  isArchived?: boolean;
}

export interface ActivityLogEntry {
  id: string;
  timestamp: string;
  userId: string;
  username: string;
  action: string;
  details: string;
}

export interface Notification {
    id: string;
    timestamp: string;
    message: string;
    type: 'info' | 'warning' | 'success';
    link?: string;
    read: boolean;
}

export interface RecentTransaction {
  type: 'sale' | 'purchase';
  id: string;
  date: string;
  partyName: string;
  total: number;
  status: string;
}

export interface CompanyInfo {
  name: string;
  address: string;
  phone: string;
}

export interface GeneralSettings {
  allowNegativeStock: boolean;
}

export interface FinancialYear {
  startDate: string;
  endDate: string;
}

export type InvoiceComponentType = 'logo' | 'companyInfo' | 'spacer' | 'invoiceTitle' | 'billTo' | 'invoiceMeta' | 'itemsTable' | 'summary' | 'footerText';

export interface InvoiceLayoutItem {
  id: InvoiceComponentType;
  name: string; // For display in DnD list
}


export interface PrintSettings {
  // Base settings
  logo: string | null;
  taxId: string;
  commercialRegNo: string;
  
  // Customizer settings
  primaryColor: string;
  secondaryColor: string;
  
  fontSizes: {
    companyName: string;
    invoiceTitle: string;
    sectionHeadings: string;
    tableHeader: string;
    tableBody: string;
    footer: string;
  };
  logoSize: number;
  logoAlignment: 'flex-start' | 'center' | 'flex-end';

  text: {
    invoiceTitle: string;
    footerText: string;
  };
  
  layout: InvoiceComponentType[];

  itemsTableColumns: {
    id: 'index' | 'itemName' | 'unit' | 'quantity' | 'price' | 'total';
    label: string;
    enabled: boolean;
  }[];
  
  visibility: {
    [key in InvoiceComponentType]?: boolean;
  };
}

export interface ActiveWindow {
  id: string;
  path: string;
  title: string;
  icon: ReactNode;
  isDirty?: boolean;
}