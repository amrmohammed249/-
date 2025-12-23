
import { ReactNode } from 'react';

export interface AccountNode {
  id: string;
  name: string;
  code: string;
  balance?: number;
  children?: AccountNode[];
  isArchived?: boolean;
}

export type Account = AccountNode;


export interface UnitDefinition {
  id: string;
  name: string;
}

export interface PackingUnit {
  id: string;
  name: string;
  factor: number;
  purchasePrice: number;
  salePrice: number;
}

export interface InventoryItem {
  id: string;
  name: string;
  barcode?: string;
  baseUnit: string;
  units: PackingUnit[];
  category: string;
  purchasePrice: number;
  salePrice: number;
  stock: number;
  isArchived?: boolean;
}

export interface LineItem {
  itemId: string;
  itemName: string;
  unitId: string;
  unitName: string;
  quantity: number;
  price: number;
  discount: number;
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
  paidAmount?: number;
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
  status: 'مدفوعة' | 'مستحقة' | 'جزئية';
  paidAmount?: number;
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
  stockCorrectionApplied?: boolean;
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
  quantity: number;
  cost: number;
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
  balance: number;
  partyType?: 'customer' | 'supplier' | 'account';
  partyId?: string;
  accountName?: string;
  treasuryAccountId: string;
  treasuryAccountName: string;
  journalEntryId: string;
  isArchived?: boolean;
}

export interface Customer {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  balance: number;
  isArchived?: boolean;
  linkedSupplierId?: string; // حقل الربط
}

export interface Supplier {
  id: string;
  name: string;
  contact: string;
  phone: string;
  address: string;
  balance: number;
  isArchived?: boolean;
  linkedCustomerId?: string; // حقل الربط
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
  relatedPartyId?: string;
  relatedPartyType?: 'customer' | 'supplier';
  relatedPartyName?: string;
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
  name: string;
}


export interface PrintSettings {
  logo: string | null;
  taxId: string;
  commercialRegNo: string;
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
  state?: any;
}
