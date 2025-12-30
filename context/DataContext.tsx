
import React, { createContext, useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { get, set } from './idb-keyval';
import * as seedData from '../data/initialSeedData';
import type {
    AccountNode,
    ActivityLogEntry,
    CompanyInfo,
    Customer,
    FinancialYear,
    GeneralSettings,
    InventoryAdjustment,
    InventoryItem,
    JournalEntry,
    JournalLine,
    Notification,
    PriceQuote,
    PrintSettings,
    Purchase,
    PurchaseQuote,
    PurchaseReturn,
    RecentTransaction,
    Sale,
    SaleReturn,
    Supplier,
    TreasuryTransaction,
    User,
    UnitDefinition,
    PackingUnit,
    LineItem
} from '../types';

// This is a simplified debounce function
const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
};

const findNodeRecursive = (nodes: AccountNode[], key: 'id' | 'code', value: string): AccountNode | null => {
    for (const node of nodes) {
        if (node[key] === value) return node;
        if (node.children) {
            const found = findNodeRecursive(node.children, key, value);
            if (found) return found;
        }
    }
    return null;
};

const updateBalancesRecursively = (nodes: AccountNode[], accountId: string, amount: number): { updated: boolean; change: number } => {
    let totalChange = 0;
    let nodeUpdatedInChildren = false;

    for (const node of nodes) {
        if (node.id === accountId) {
            node.balance = (node.balance || 0) + amount;
            return { updated: true, change: amount };
        }

        if (node.children) {
            const result = updateBalancesRecursively(node.children, accountId, amount);
            if (result.updated) {
                node.balance = (node.balance || 0) + result.change;
                nodeUpdatedInChildren = true;
                totalChange += result.change;
            }
        }
    }
    
    return { updated: nodeUpdatedInChildren, change: totalChange };
};

const migrateChartOfAccounts = (chart: AccountNode[]): AccountNode[] => {
    const newChart = JSON.parse(JSON.stringify(chart));
    const requiredAccounts = [
        { id: '1', name: 'الأصول', code: '1000', parentCode: null },
        { id: '2', name: 'الالتزامات', code: '2000', parentCode: null },
        { id: '3', name: 'حقوق الملكية', code: '3000', parentCode: null },
        { id: '4', name: 'الإيرادات والمصروفات', code: '4000', parentCode: null },
        { id: '1-1', name: 'الأصول المتداولة', code: '1100', parentCode: '1000' },
        { id: '1-2', name: 'الأصول الثابتة', code: '1200', parentCode: '1000' },
        { id: '4-2', name: 'مصروفات تشغيل', code: '4200', parentCode: '4000' },
        { id: '4-3', name: 'إيرادات أخرى', code: '4300', parentCode: '4000' },
        { id: '1-1-3', name: 'العملاء', code: '1103', parentCode: '1100' },
        { id: '1-1-4', name: 'المخزون', code: '1104', parentCode: '1100' },
        { id: '2-1', name: 'الموردين', code: '2101', parentCode: '2000' },
        { id: '4-1', name: 'مبيعات محلية', code: '4101', parentCode: '4000' },
        { id: '4-4', name: 'مردودات المبيعات', code: '4104', parentCode: '4000' },
        { id: '4-5', name: 'خصومات المبيعات', code: '4102', parentCode: '4000' },
        { id: '4-6', name: 'خصومات المشتريات', code: '4103', parentCode: '4000' },
        { id: '4-2-3', name: 'مصروف بضاعة تالفة', code: '4203', parentCode: '4200' },
        { id: '4-2-4', name: 'تكلفة البضاعة المباعة', code: '4204', parentCode: '4200' },
        { id: '4-3-1', name: 'أرباح فروقات جرد', code: '4301', parentCode: '4300' },
    ];
    requiredAccounts.forEach(acc => {
        if (!findNodeRecursive(newChart, 'code', acc.code)) {
            const newNode = { id: acc.id, code: acc.code, name: acc.name, balance: 0, children: [] };
            if (acc.parentCode) {
                 const parent = findNodeRecursive(newChart, 'code', acc.parentCode);
                 if (parent) {
                     if (!parent.children) parent.children = [];
                     parent.children.push(newNode);
                 }
            } else { newChart.push(newNode); }
        }
    });
    return newChart;
};

const initialState = {
    companyInfo: seedData.companyInfo,
    printSettings: seedData.printSettingsData,
    financialYear: seedData.financialYearData,
    generalSettings: seedData.generalSettingsData,
    chartOfAccounts: seedData.chartOfAccountsData,
    sequences: seedData.sequencesData,
    unitDefinitions: seedData.unitDefinitionsData,
    journal: seedData.journalData,
    inventory: seedData.inventoryData,
    inventoryAdjustments: seedData.inventoryAdjustmentsData,
    sales: seedData.salesData,
    priceQuotes: seedData.priceQuotesData,
    purchases: seedData.purchasesData,
    purchaseQuotes: seedData.purchaseQuotesData,
    saleReturns: seedData.saleReturnsData,
    purchaseReturns: seedData.purchaseReturnsData,
    treasury: seedData.treasuryData,
    customers: seedData.customersData,
    suppliers: seedData.suppliersData,
    users: seedData.usersData,
    activityLog: seedData.activityLogData,
    notifications: seedData.notificationsData,
};

type AppState = typeof initialState;
type Action = { type: string; payload?: any };

function dataReducer(state: AppState, action: Action): AppState {
    switch (action.type) {
        case 'SET_STATE': return action.payload;
        case 'ADD_LOG_AND_NOTIFICATION':
            return {
                ...state,
                activityLog: action.payload.log ? [action.payload.log, ...state.activityLog] : state.activityLog,
                notifications: action.payload.notification ? [action.payload.notification, ...state.notifications].slice(0, 50) : state.notifications,
            };
        case 'UPDATE_COMPANY_INFO': return { ...state, companyInfo: action.payload };
        case 'UPDATE_PRINT_SETTINGS': return { ...state, printSettings: action.payload };
        case 'UPDATE_FINANCIAL_YEAR': return { ...state, financialYear: action.payload };
        case 'UPDATE_GENERAL_SETTINGS': return { ...state, generalSettings: action.payload };
        case 'MARK_NOTIFICATION_READ': return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
        case 'MARK_ALL_NOTIFICATIONS_READ': return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
        case 'ADD_ACCOUNT':
            const addNodeToTree = (nodes: AccountNode[]): AccountNode[] => {
                return nodes.map(node => {
                    if (node.id === action.payload.parentId) { return { ...node, children: [...(node.children || []), action.payload.newAccount] }; }
                    if (node.children) { return { ...node, children: addNodeToTree(node.children) }; }
                    return node;
                });
            };
            return { ...state, chartOfAccounts: action.payload.parentId ? addNodeToTree(state.chartOfAccounts) : [...state.chartOfAccounts, action.payload.newAccount], sequences: { ...state.sequences, account: state.sequences.account + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_CHART_OF_ACCOUNTS': return { ...state, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'FORCE_BALANCE_RECALCULATION': return { ...state, customers: action.payload.customers, suppliers: action.payload.suppliers, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] }
        case 'UPDATE_OPENING_BALANCES': return { ...state, customers: action.payload.customers, suppliers: action.payload.suppliers, chartOfAccounts: action.payload.chartOfAccounts, journal: action.payload.journal || state.journal, activityLog: [action.payload.log, ...state.activityLog] };
        case 'RESET_TRANSACTIONAL_DATA': return { ...state, ...action.payload, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_UNIT_DEFINITION': return { ...state, unitDefinitions: [...state.unitDefinitions, action.payload.newUnit], sequences: { ...state.sequences, unit: state.sequences.unit + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_JOURNAL_ENTRY': return { ...state, journal: [action.payload.newEntry, ...state.journal], sequences: { ...state.sequences, journal: state.sequences.journal + 1 }, chartOfAccounts: action.payload.chartOfAccounts, customers: action.payload.updatedCustomers || state.customers, suppliers: action.payload.updatedSuppliers || state.suppliers, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ARCHIVE_JOURNAL_ENTRY':
        case 'UNARCHIVE_JOURNAL_ENTRY':
        case 'DELETE_JOURNAL_ENTRY': return { ...state, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts || state.chartOfAccounts, customers: action.payload.updatedCustomers || state.customers, suppliers: action.payload.updatedSuppliers || state.suppliers, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_SALE': return { ...state, chartOfAccounts: action.payload.updatedChartOfAccounts, journal: [action.payload.journalEntry, ...state.journal], sales: [action.payload.newSale, ...state.sales], inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, sequences: { ...state.sequences, sale: state.sequences.sale + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog], notifications: action.payload.notification ? [action.payload.notification, ...state.notifications].slice(0, 50) : state.notifications };
        case 'UPDATE_SALE':
        case 'UNARCHIVE_SALE': return { ...state, sales: action.payload.updatedSales, inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_PRICE_QUOTE': return { ...state, priceQuotes: [action.payload.newQuote, ...state.priceQuotes], sequences: { ...state.sequences, priceQuote: state.sequences.priceQuote + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_PRICE_QUOTE': return { ...state, priceQuotes: action.payload.priceQuotes, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_PURCHASE_QUOTE': return { ...state, purchaseQuotes: action.payload.purchaseQuotes, activityLog: [action.payload.log, ...state.activityLog] };
        case 'CANCEL_PRICE_QUOTE': return { ...state, priceQuotes: state.priceQuotes.map(q => q.id === action.payload.quoteId ? { ...q, status: 'ملغي' } : q), activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_PRICE_QUOTE': return { ...state, priceQuotes: state.priceQuotes.filter(q => q.id !== action.payload.quoteId), activityLog: [action.payload.log, ...state.activityLog] };
        case 'CONVERT_QUOTE_TO_SALE': return { ...state, priceQuotes: state.priceQuotes.map(q => q.id === action.payload.updatedQuote.id ? action.payload.updatedQuote : q), chartOfAccounts: action.payload.updatedChartOfAccounts, journal: [action.payload.journalEntry, ...state.journal], sales: [action.payload.newSale, ...state.sales], inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, sequences: { ...state.sequences, sale: state.sequences.sale + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog], notifications: action.payload.notification ? [action.payload.notification, ...state.notifications].slice(0, 50) : state.notifications };
        case 'ARCHIVE_SALE':
        case 'DELETE_SALE': return { ...state, sales: action.payload.updatedSales, inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_PURCHASE': return { ...state, chartOfAccounts: action.payload.updatedChartOfAccounts, journal: [action.payload.journalEntry, ...state.journal], purchases: [action.payload.newPurchase, ...state.purchases], inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, sequences: { ...state.sequences, purchase: state.sequences.purchase + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_PURCHASE':
        case 'UNARCHIVE_PURCHASE': return { ...state, purchases: action.payload.updatedPurchases, inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_PURCHASE_QUOTE': return { ...state, purchaseQuotes: [action.payload.newQuote, ...state.purchaseQuotes], sequences: { ...state.sequences, purchaseQuote: state.sequences.purchaseQuote + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'CANCEL_PURCHASE_QUOTE': return { ...state, purchaseQuotes: state.purchaseQuotes.map(q => q.id === action.payload.quoteId ? { ...q, status: 'ملغي' } : q), activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_PURCHASE_QUOTE': return { ...state, purchaseQuotes: state.purchaseQuotes.filter(q => q.id !== action.payload.quoteId), activityLog: [action.payload.log, ...state.activityLog] };
        case 'CONVERT_QUOTE_TO_PURCHASE': return { ...state, purchaseQuotes: state.purchaseQuotes.map(q => q.id === action.payload.updatedQuote.id ? action.payload.updatedQuote : q), chartOfAccounts: action.payload.updatedChartOfAccounts, journal: [action.payload.journalEntry, ...state.journal], purchases: [action.payload.newPurchase, ...state.purchases], inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, sequences: { ...state.sequences, purchase: state.sequences.purchase + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ARCHIVE_PURCHASE':
        case 'DELETE_PURCHASE': return { ...state, purchases: action.payload.updatedPurchases, inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_SALE_RETURN': return { ...state, saleReturns: [action.payload.newSaleReturn, ...state.saleReturns], inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, journal: [action.payload.journalEntry, ...state.journal], chartOfAccounts: action.payload.updatedChartOfAccounts, sequences: { ...state.sequences, saleReturn: state.sequences.saleReturn + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_SALE_RETURN': return { ...state, saleReturns: action.payload.updatedSaleReturns, inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.updatedChartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ARCHIVE_SALE_RETURN':
        case 'UNARCHIVE_SALE_RETURN':
        case 'DELETE_SALE_RETURN_PERMANENT': return { ...state, saleReturns: action.payload.updatedSaleReturns, inventory: action.payload.updatedInventory, customers: action.payload.updatedCustomers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_PURCHASE_RETURN': return { ...state, purchaseReturns: [action.payload.newPurchaseReturn, ...state.purchaseReturns], inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, journal: [action.payload.journalEntry, ...state.journal], chartOfAccounts: action.payload.updatedChartOfAccounts, sequences: { ...state.sequences, purchaseReturn: state.sequences.purchaseReturn + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_PURCHASE_RETURN': return { ...state, purchaseReturns: action.payload.updatedPurchaseReturns, inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.updatedChartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ARCHIVE_PURCHASE_RETURN':
        case 'UNARCHIVE_PURCHASE_RETURN':
        case 'DELETE_PURCHASE_RETURN_PERMANENT': return { ...state, purchaseReturns: action.payload.updatedPurchaseReturns, inventory: action.payload.updatedInventory, suppliers: action.payload.updatedSuppliers, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_TREASURY_TRANSACTION': return { ...state, chartOfAccounts: action.payload.updatedChartOfAccounts, journal: [action.payload.journalEntry, ...state.journal], treasury: [action.payload.newTransaction, ...state.treasury], customers: action.payload.updatedCustomers || state.customers, suppliers: action.payload.updatedSuppliers || state.suppliers, sequences: { ...state.sequences, treasury: state.sequences.treasury + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_TREASURY_TRANSACTION': return { ...state, treasury: action.payload.updatedTreasury, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, customers: action.payload.updatedCustomers || state.customers, suppliers: action.payload.updatedSuppliers || state.suppliers, activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_TREASURY_TRANSACTION': return { ...state, treasury: action.payload.updatedTreasury, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, customers: action.payload.updatedCustomers, suppliers: action.payload.updatedSuppliers, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_INVENTORY_ADJUSTMENT': return { ...state, chartOfAccounts: action.payload.updatedChartOfAccounts, journal: [action.payload.journalEntry, ...state.journal], inventoryAdjustments: [action.payload.newAdjustment, ...state.inventoryAdjustments], inventory: action.payload.updatedInventory, sequences: { ...state.sequences, inventoryAdjustment: state.sequences.inventoryAdjustment + 1, journal: state.sequences.journal + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_INVENTORY_ADJUSTMENT':
        case 'ARCHIVE_INVENTORY_ADJUSTMENT':
        case 'UNARCHIVE_INVENTORY_ADJUSTMENT':
        case 'DELETE_INVENTORY_ADJUSTMENT': return { ...state, inventoryAdjustments: action.payload.updatedAdjustments, inventory: action.payload.updatedInventory, journal: action.payload.updatedJournal, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_USER_PERMANENT': return { ...state, users: state.users.filter(u => u.id !== action.payload.id), activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_CUSTOMER_PERMANENT': return { ...state, customers: state.customers.filter(c => c.id !== action.payload.id), activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_SUPPLIER_PERMANENT': return { ...state, suppliers: state.suppliers.filter(s => s.id !== action.payload.id), activityLog: [action.payload.log, ...state.activityLog] };
        case 'DELETE_ITEM_PERMANENT': return { ...state, inventory: state.inventory.filter(i => i.id !== action.payload.id), activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_USER':
        case 'UPDATE_USER':
        case 'ARCHIVE_USER':
        case 'UNARCHIVE_USER':
        case 'ADD_CUSTOMER':
        case 'UPDATE_CUSTOMER':
        case 'ARCHIVE_CUSTOMER':
        case 'UNARCHIVE_CUSTOMER':
        case 'ADD_SUPPLIER':
        case 'UPDATE_SUPPLIER':
        case 'ARCHIVE_SUPPLIER':
        case 'UNARCHIVE_SUPPLIER':
        case 'ADD_ITEM':
        case 'UPDATE_ITEM':
        case 'ARCHIVE_ITEM':
        case 'UNARCHIVE_ITEM': return { ...state, ...action.payload };
        default: return state;
    }
}

interface DataContextType {
    companyInfo: CompanyInfo; printSettings: PrintSettings; financialYear: FinancialYear; generalSettings: GeneralSettings; chartOfAccounts: AccountNode[]; sequences: any; unitDefinitions: UnitDefinition[]; activityLog: ActivityLogEntry[]; notifications: Notification[]; currentUser: User | null; isDataLoaded: boolean; hasData: boolean; saveStatus: 'idle' | 'saving' | 'saved' | 'error'; dataManager: { datasets: { key: string; name: string }[]; activeDatasetKey: string | null; }; scannedItem: { item: InventoryItem; timestamp: number } | null; customers: Customer[]; suppliers: Supplier[]; users: User[]; inventory: InventoryItem[]; journal: JournalEntry[]; sales: Sale[]; priceQuotes: PriceQuote[]; purchases: Purchase[]; purchaseQuotes: PurchaseQuote[]; saleReturns: SaleReturn[]; purchaseReturns: PurchaseReturn[]; treasury: TreasuryTransaction[]; inventoryAdjustments: InventoryAdjustment[]; archivedCustomers: Customer[]; archivedSuppliers: Supplier[]; archivedUsers: User[]; archivedInventory: InventoryItem[]; archivedJournal: JournalEntry[]; archivedSales: Sale[]; archivedPurchases: Purchase[]; archivedSaleReturns: SaleReturn[]; archivedPurchaseReturns: PurchaseReturn[]; archivedTreasury: TreasuryTransaction[]; archivedInventoryAdjustments: InventoryAdjustment[]; allCustomers: Customer[]; allSuppliers: Supplier[]; allUsers: User[]; allInventory: InventoryItem[]; allJournal: JournalEntry[]; allSales: Sale[]; allPurchases: Purchase[]; allSaleReturns: SaleReturn[]; allPurchaseReturns: PurchaseReturn[]; allTreasury: TreasuryTransaction[]; allInventoryAdjustments: InventoryAdjustment[]; totalReceivables: number; totalPayables: number; inventoryValue: number; totalCashBalance: number; recentTransactions: RecentTransaction[]; topCustomers: any[]; treasuriesList: any[]; login: (username: string, password: string) => boolean; logout: () => void; showToast: (message: string, type?: 'success' | 'error') => void; toast: { show: boolean; message: string; type: 'success' | 'error' }; createNewDataset: (companyName: string) => void; switchDataset: (key: string) => void; renameDataset: (key: string, newName: string) => void; importData: (importedState: any) => void; resetTransactionalData: () => void; forceBalanceRecalculation: () => void; processBarcodeScan: (barcode: string) => void; updateCompanyInfo: (info: CompanyInfo) => void; updatePrintSettings: (settings: PrintSettings) => void; updateFinancialYear: (year: FinancialYear) => void; updateGeneralSettings: (settings: GeneralSettings) => void; markNotificationAsRead: (id: string) => void; markAllNotificationsAsRead: () => void; addAccount: (accountData: { name: string; code: string; parentId: string | null }) => AccountNode; updateAccount: (accountData: { id: string; name: string; code: string; parentId: string | null }) => void; archiveAccount: (id: string) => { success: boolean; message: string }; updateAllOpeningBalances: (updates: any) => void; addUnitDefinition: (name: string) => UnitDefinition; addJournalEntry: (entryData: Omit<JournalEntry, 'id'>) => JournalEntry; updateJournalEntry: (entryData: Omit<JournalEntry, 'debit' | 'credit'>) => void; archiveJournalEntry: (id: string) => void; unarchiveJournalEntry: (id: string) => void; deleteJournalEntry: (id: string) => void; addSale: (saleData: Omit<Sale, 'id' | 'journalEntryId'>) => Sale; updateSale: (saleData: Sale) => Sale; archiveSale: (id: string) => { success: boolean, message: string }; unarchiveSale: (id: string) => void; deleteSale: (id: string) => void; addPriceQuote: (quoteData: Omit<PriceQuote, 'id' | 'status'>) => PriceQuote; updatePriceQuote: (quoteData: PriceQuote) => void; cancelPriceQuote: (quoteId: string) => void; deletePriceQuote: (quoteId: string) => void; convertQuoteToSale: (quoteId: string) => void; addPurchase: (purchaseData: Omit<Purchase, 'id' | 'journalEntryId'>) => Purchase; updatePurchase: (purchaseData: Purchase) => Purchase; archivePurchase: (id: string) => { success: boolean, message: string }; unarchivePurchase: (id: string) => void; deletePurchase: (id: string) => void; addPurchaseQuote: (quoteData: Omit<PurchaseQuote, 'id' | 'status'>) => PurchaseQuote; updatePurchaseQuote: (quoteData: PurchaseQuote) => void; cancelPurchaseQuote: (quoteId: string) => void; deletePurchaseQuote: (quoteId: string) => void; convertQuoteToPurchase: (quoteId: string) => void; addSaleReturn: (returnData: Omit<SaleReturn, 'id' | 'journalEntryId'>) => SaleReturn; updateSaleReturn: (returnData: SaleReturn) => SaleReturn; deleteSaleReturn: (returnId: string) => { success: boolean, message: string }; unarchiveSaleReturn: (id: string) => void; addPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'>) => PurchaseReturn; updatePurchaseReturn: (returnData: PurchaseReturn) => PurchaseReturn; deletePurchaseReturn: (returnId: string) => { success: boolean, message: string }; unarchivePurchaseReturn: (id: string) => void; addTreasuryTransaction: (transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>) => TreasuryTransaction; updateTreasuryTransaction: (id: string, transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId' | 'treasuryAccountName'>) => void; transferTreasuryFunds: (fromTreasuryId: string, toTreasuryId: string, amount: number, notes: string) => void; addInventoryAdjustment: (adjustmentData: Omit<InventoryAdjustment, 'id' | 'journalEntryId'>) => InventoryAdjustment; updateInventoryAdjustment: (adjustmentData: InventoryAdjustment) => InventoryAdjustment; archiveInventoryAdjustment: (id: string) => { success: boolean, message: string }; unarchiveInventoryAdjustment: (id: string) => void; addUser: (userData: Omit<User, 'id'>) => void; updateUser: (userData: User) => void; archiveUser: (id: string) => { success: boolean; message: string }; unarchiveUser: (id: string) => void; deleteUserPermanent: (id: string) => void; addCustomer: (customerData: Omit<Customer, 'id'>) => Customer; updateCustomer: (customerData: Customer) => void; archiveCustomer: (id: string) => { success: boolean; message: string }; unarchiveCustomer: (id: string) => void; deleteCustomerPermanent: (id: string) => void; addSupplier: (supplierData: Omit<Supplier, 'id'>) => Supplier; updateSupplier: (supplierData: Supplier) => void; archiveSupplier: (id: string) => { success: boolean; message: string }; unarchiveSupplier: (id: string) => void; deleteSupplierPermanent: (id: string) => void; addItem: (itemData: Omit<InventoryItem, 'id'>) => InventoryItem; updateItem: (itemData: InventoryItem) => void; archiveItem: (id: string) => { success: boolean; message: string }; unarchiveItem: (id: string) => void; deleteItemPermanent: (id: string) => void; generateAndAssignBarcodesForMissing: () => void;
}

export const DataContext = createContext<DataContextType>(null!);

export const DataProvider = ({ children }: { children?: React.ReactNode }) => {
    const [state, dispatch] = useReducer(dataReducer, initialState);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
    const [scannedItem, setScannedItem] = useState<{ item: InventoryItem; timestamp: number } | null>(null);
    const [dataManager, setDataManager] = useState({ datasets: [] as { key: string; name: string }[], activeDatasetKey: null as string | null });

    useEffect(() => {
        const loadManager = async () => {
            const datasets = await get<{ key: string; name: string }[]>('datasets') || [];
            const activeKey = await get<string>('activeDatasetKey');
            if (activeKey && datasets.some(ds => ds.key === activeKey)) { setDataManager({ datasets, activeDatasetKey: activeKey }); }
            else if (datasets.length > 0) { const firstKey = datasets[0].key; await set('activeDatasetKey', firstKey); setDataManager({ datasets, activeDatasetKey: firstKey }); }
            else { setIsDataLoaded(true); }
        };
        loadManager();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!dataManager.activeDatasetKey) return;
            let savedData = await get<AppState>(dataManager.activeDatasetKey);
            if (savedData) {
                if (savedData.chartOfAccounts) { savedData.chartOfAccounts = migrateChartOfAccounts(savedData.chartOfAccounts); }
                dispatch({ type: 'SET_STATE', payload: savedData });
                setHasData(true);
            } else { setHasData(false); }
            setIsDataLoaded(true);
        };
        setIsDataLoaded(false);
        loadData();
    }, [dataManager.activeDatasetKey]);

    const debouncedSave = useCallback(debounce((dataToSave, key) => {
        if (!key) return;
        setSaveStatus('saving');
        set(key, dataToSave).then(() => setSaveStatus('saved')).catch(() => setSaveStatus('error'));
    }, 1500), []);

    useEffect(() => { if (isDataLoaded && hasData && dataManager.activeDatasetKey) { debouncedSave(state, dataManager.activeDatasetKey); } }, [state, isDataLoaded, hasData, dataManager.activeDatasetKey, debouncedSave]);
    
    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    const addLogAndNotification = useCallback((action: string, details: string, type: Notification['type'] = 'info', link?: string) => {
        if (!currentUser) return;
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser.id, username: currentUser.name, action, details };
        const notification = { id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), message: `${action}: ${details}`, type, link, read: false };
        dispatch({ type: 'ADD_LOG_AND_NOTIFICATION', payload: { log, notification } });
    }, [currentUser]);

    const login = (username: string, password: string): boolean => {
        const user = state.users.find(u => u.username === username && u.password === password && !u.isArchived);
        if (user) { setCurrentUser(user); addLogAndNotification('تسجيل الدخول', `المستخدم ${user.name} قام بتسجيل الدخول.`); return true; }
        return false;
    };
    const logout = () => { if (currentUser) { addLogAndNotification('تسجيل الخروج', `المستخدم ${currentUser.name} قام بتسجيل الخروج.`); } setCurrentUser(null); };

    const processBarcodeScan = useCallback((barcode: string) => {
        const item = state.inventory.find(i => i.barcode === barcode && !i.isArchived);
        if (item) { setScannedItem({ item, timestamp: Date.now() }); showToast(`تم العثور على الصنف: ${item.name}`, 'success'); }
        else { showToast(`لم يتم العثور على صنف بالباركود: ${barcode}`, 'error'); }
    }, [state.inventory, showToast]);
    
    const createNewDataset = useCallback(async (companyName: string) => {
        const newKey = `dataset-${Date.now()}`;
        const newDataset = { key: newKey, name: companyName };
        const currentDatasets = await get<{ key: string; name: string }[]>('datasets') || [];
        const newDatasets = [...currentDatasets, newDataset];
        await set('datasets', newDatasets);
        await set('activeDatasetKey', newKey);
        await set(newKey, { ...initialState, companyInfo: { ...initialState.companyInfo, name: companyName }});
        setDataManager({ datasets: newDatasets, activeDatasetKey: newKey });
    }, []);

    const switchDataset = useCallback(async (key: string) => {
        await set('activeDatasetKey', key);
        Object.keys(sessionStorage).forEach(sessionKey => { if (sessionKey.startsWith('loggedInUser_')) { sessionStorage.removeItem(sessionKey); } });
        setCurrentUser(null);
        setDataManager(prev => ({ ...prev, activeDatasetKey: key }));
    }, []);

    const renameDataset = useCallback(async (key: string, newName: string) => {
        const currentDatasets = await get<{ key: string; name: string }[]>('datasets') || [];
        const updatedDatasets = currentDatasets.map(ds => ds.key === key ? { ...ds, name: newName } : ds);
        await set('datasets', updatedDatasets);
        const datasetData = await get<AppState>(key);
        if (datasetData) { datasetData.companyInfo.name = newName; await set(key, datasetData); }
        setDataManager(prev => ({ ...prev, datasets: updatedDatasets }));
        if (dataManager.activeDatasetKey === key) { dispatch({ type: 'UPDATE_COMPANY_INFO', payload: { ...state.companyInfo, name: newName }}); }
        addLogAndNotification('إدارة البيانات', `تمت إعادة تسمية الشركة إلى "${newName}".`);
        showToast('تمت إعادة تسمية الشركة بنجاح.');
    }, [addLogAndNotification, dataManager.activeDatasetKey, showToast, state.companyInfo]);
    
    const importData = async (importedState: any) => {
        if (!dataManager.activeDatasetKey) return;
        try {
            await set(dataManager.activeDatasetKey, importedState);
            dispatch({ type: 'SET_STATE', payload: importedState });
            addLogAndNotification('استيراد بيانات', 'تم استيراد نسخة احتياطية جديدة بنجاح.');
            showToast('تم استيراد البيانات بنجاح. سيتم إعادة تحميل الصفحة.');
            setTimeout(() => { window.location.reload(); }, 1500);
        } catch (error) { showToast('حدث خطأ أثناء استيراد وحفظ البيانات.', 'error'); }
    };

    const resetTransactionalData = useCallback(() => {
        const resetState = {
            journal: [], sales: [], purchases: [], saleReturns: [], purchaseReturns: [], inventoryAdjustments: [], treasury: [], activityLog: [], notifications: [],
            sequences: { ...state.sequences, sale: 1, purchase: 1, saleReturn: 1, purchaseReturn: 1, journal: 1, treasury: 1, inventoryAdjustment: 1 },
            inventory: state.inventory.map((item: InventoryItem) => ({ ...item, stock: 0 })),
            customers: state.customers.map((c: Customer) => ({ ...c, balance: 0 })),
            suppliers: state.suppliers.map((s: Supplier) => ({ ...s, balance: 0 })),
        };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إعادة ضبط البيانات', details: 'تم حذف جميع الحركات المالية والمخزنية.' };
        dispatch({ type: 'RESET_TRANSACTIONAL_DATA', payload: { ...resetState, log } });
        setTimeout(forceBalanceRecalculation, 100);
        showToast('تمت إعادة ضبط جميع البيانات الحركية بنجاح.', 'success');
    }, [state.sequences, state.inventory, state.customers, state.suppliers, currentUser]);

    const forceBalanceRecalculation = useCallback(() => {
        const newCustomers = JSON.parse(JSON.stringify(state.customers));
        const newSuppliers = JSON.parse(JSON.stringify(state.suppliers));
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        newCustomers.forEach((c: Customer) => c.balance = 0);
        newSuppliers.forEach((s: Supplier) => s.balance = 0);
        const resetAccountBalances = (nodes: AccountNode[]) => { nodes.forEach(node => { node.balance = 0; if (node.children) resetAccountBalances(node.children); }); };
        resetAccountBalances(newChart);
        [...state.journal].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).forEach(entry => {
            if (!entry.isArchived) { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit); }); }
        });
        const allTransactions = [ ...state.sales, ...state.purchases, ...state.saleReturns, ...state.purchaseReturns, ...state.treasury.filter(t => t.partyType === 'customer' || t.partyType === 'supplier') ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
        allTransactions.forEach(tx => {
            if (tx.isArchived) return;
            if ('customer' in tx) { const customer = newCustomers.find((c: Customer) => c.name === tx.customer); if (customer) { if ('originalSaleId' in tx) { customer.balance -= tx.total; } else { customer.balance += (tx.total - (tx.paidAmount || 0)); } } }
            else if ('supplier' in tx) { const supplier = newSuppliers.find((s: Supplier) => s.name === tx.supplier); if (supplier) { if ('originalPurchaseId' in tx) { supplier.balance -= tx.total; } else { supplier.balance += (tx.total - (tx.paidAmount || 0)); } } }
            else if ('partyType' in tx) { const amount = Math.abs(tx.amount); if (tx.partyType === 'customer') { const customer = newCustomers.find((c: Customer) => c.id === tx.partyId); if (customer) { if (tx.type === 'سند قبض') customer.balance -= amount; else customer.balance += amount; } } else if (tx.partyType === 'supplier') { const supplier = newSuppliers.find((s: Supplier) => s.id === tx.partyId); if (supplier) { if (tx.type === 'سند صرف') supplier.balance -= amount; else supplier.balance += amount; } } }
        });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إعادة حساب الأرصدة', details: 'تمت إعادة حساب جميع الأرصدة في النظام.' };
        dispatch({ type: 'FORCE_BALANCE_RECALCULATION', payload: { customers: newCustomers, suppliers: newSuppliers, chartOfAccounts: newChart, log } });
        showToast("تمت إعادة حساب جميع الأرصدة بنجاح.", "success");
    }, [state, currentUser, showToast]);

    const updateCompanyInfo = (info: CompanyInfo) => { dispatch({ type: 'UPDATE_COMPANY_INFO', payload: info }); addLogAndNotification('تحديث الإعدادات', `تم تحديث معلومات الشركة إلى "${info.name}".`); };
    const updatePrintSettings = (settings: PrintSettings) => { dispatch({ type: 'UPDATE_PRINT_SETTINGS', payload: settings }); addLogAndNotification('تحديث الإعدادات', 'تم تحديث إعدادات الطباعة.'); };
    const updateFinancialYear = (year: FinancialYear) => { dispatch({ type: 'UPDATE_FINANCIAL_YEAR', payload: year }); addLogAndNotification('تحديث الإعدادات', `تم تحديث السنة المالية إلى ${year.startDate} - ${year.endDate}.`); };
    const updateGeneralSettings = (settings: GeneralSettings) => { dispatch({ type: 'UPDATE_GENERAL_SETTINGS', payload: settings }); addLogAndNotification('تحديث الإعدادات', 'تم تحديث الإعدادات العامة.'); };
    const markNotificationAsRead = (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    const markAllNotificationsAsRead = () => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
    
    const addAccount = useCallback((accountData: { name: string; code: string; parentId: string | null }): AccountNode => {
        const newAccount: AccountNode = { id: `acc-${state.sequences.account}`, name: accountData.name, code: accountData.code, balance: 0, children: [] };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة حساب', details: `تمت إضافة الحساب "${newAccount.name}" برمز ${newAccount.code}.` };
        dispatch({ type: 'ADD_ACCOUNT', payload: { newAccount, parentId: accountData.parentId, log } });
        showToast('تمت إضافة الحساب بنجاح.'); return newAccount;
    }, [state.sequences.account, currentUser, showToast]);

    const updateAccount = useCallback((accountData: { id: string; name: string; code: string; parentId: string | null }) => {
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let nodeToMove: AccountNode | null = null;
        const removeNode = (nodes: AccountNode[]): AccountNode[] => { return nodes.filter(node => { if (node.id === accountData.id) { nodeToMove = node; return false; } if (node.children) { node.children = removeNode(node.children); } return true; }); };
        let chartWithoutNode = removeNode(newChart);
        if (nodeToMove) { nodeToMove.name = accountData.name; nodeToMove.code = accountData.code; if (accountData.parentId) { const findAndAdd = (nodes: AccountNode[]): boolean => { for (const node of nodes) { if (node.id === accountData.parentId) { if (!node.children) node.children = []; node.children.push(nodeToMove!); return true; } if (node.children && findAndAdd(node.children)) { return true; } } return false; }; if (!findAndAdd(chartWithoutNode)) { showToast('الحساب الرئيسي المحدد غير موجود.', 'error'); return; } } else { chartWithoutNode.push(nodeToMove); } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل حساب', details: `تم تعديل الحساب "${accountData.name}".` };
        dispatch({ type: 'UPDATE_CHART_OF_ACCOUNTS', payload: { chartOfAccounts: chartWithoutNode, log }});
        showToast('تم تعديل الحساب بنجاح.');
    }, [state.chartOfAccounts, currentUser, showToast]);
    
    const archiveAccount = (id: string) => { return {success: false, message: 'ميزة أرشفة الحسابات غير متاحة حاليًا.'} };

    const updateAllOpeningBalances = useCallback((updates: any) => {
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const newCustomers = JSON.parse(JSON.stringify(state.customers));
        const newSuppliers = JSON.parse(JSON.stringify(state.suppliers));
        let newJournal: JournalEntry[] = JSON.parse(JSON.stringify(state.journal));
        const openingBalanceEntryDescription = "قيد الأرصدة الافتتاحية";
        let openingEntry = newJournal.find(e => e.description === openingBalanceEntryDescription);
        const newLines: JournalLine[] = [];
        let totalDebit = 0, totalCredit = 0;
        const resetBalances = (nodes: AccountNode[]) => { nodes.forEach(node => { node.balance = 0; if(node.children) resetBalances(node.children); }); };
        resetBalances(newChart);
        newCustomers.forEach((c: Customer) => c.balance = 0);
        newSuppliers.forEach((s: Supplier) => s.balance = 0);
        if (openingEntry && openingEntry.lines) { openingEntry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, - (line.debit - line.credit)); }); }
        newJournal = newJournal.filter(e => e.description !== openingBalanceEntryDescription);
        updates.accountUpdates.forEach(({ accountId, balance }: any) => { const account = findNodeRecursive(newChart, 'id', accountId); if (account && balance !== 0) { newLines.push({ accountId, accountName: account.name, debit: balance > 0 ? balance : 0, credit: balance < 0 ? Math.abs(balance) : 0 }); } });
        const customerAccount = findNodeRecursive(newChart, 'code', '1103'), supplierAccount = findNodeRecursive(newChart, 'code', '2101');
        updates.customerUpdates.forEach(({ customerId, balance }: any) => { const customer = newCustomers.find((c: Customer) => c.id === customerId); if (customer && balance !== 0) { newLines.push({ accountId: customerAccount!.id, accountName: `${customerAccount!.name} - ${customer.name}`, debit: balance, credit: 0 }); } });
        updates.supplierUpdates.forEach(({ supplierId, balance }: any) => { const supplier = newSuppliers.find((s: Supplier) => s.id === supplierId); if (supplier && balance !== 0) { newLines.push({ accountId: supplierAccount!.id, accountName: `${supplierAccount!.name} - ${supplier.name}`, debit: 0, credit: balance }); } });
        newLines.forEach(line => { totalDebit += line.debit; totalCredit += line.credit; });
        const retainedEarningsAccount = findNodeRecursive(newChart, 'code', '3102');
        const balanceDiff = totalDebit - totalCredit;
        if (balanceDiff !== 0) { newLines.push({ accountId: retainedEarningsAccount!.id, accountName: retainedEarningsAccount!.name, debit: balanceDiff < 0 ? Math.abs(balanceDiff) : 0, credit: balanceDiff > 0 ? balanceDiff : 0 }); totalDebit += (balanceDiff < 0 ? Math.abs(balanceDiff) : 0); totalCredit += (balanceDiff > 0 ? balanceDiff : 0); }
        if (newLines.length > 0) { const newOpeningEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: state.financialYear.startDate, description: openingBalanceEntryDescription, debit: totalDebit, credit: totalCredit, status: 'مرحل', lines: newLines }; newJournal.unshift(newOpeningEntry); }
        const allEntries = [...newJournal, ...state.journal.filter(e => e.description !== openingBalanceEntryDescription)];
        allEntries.forEach(entry => { if(entry.isArchived) return; entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit); }); });
        newCustomers.forEach((c: Customer) => { const customerOpeningBalance = updates.customerUpdates.find((u:any) => u.customerId === c.id)?.balance || 0; const salesTotal = state.sales.filter(s => s.customer === c.name && !s.isArchived).reduce((sum, s) => sum + s.total, 0); const returnsTotal = state.saleReturns.filter(sr => sr.customer === c.name && !sr.isArchived).reduce((sum, sr) => sum + sr.total, 0); const paymentsTotal = state.treasury.filter(t => t.partyId === c.id && t.type === 'سند قبض' && !t.isArchived).reduce((sum, t) => sum + t.amount, 0); const totalRefunds = state.treasury.filter((t: TreasuryTransaction) => t.partyType === 'customer' && t.partyId === c.id && t.type === 'سند صرف' && !t.isArchived).reduce((sum, t) => sum + Math.abs(t.amount), 0); c.balance = customerOpeningBalance + salesTotal + totalRefunds - returnsTotal - paymentsTotal; });
        newSuppliers.forEach((s: Supplier) => { const supplierOpeningBalance = updates.supplierUpdates.find((u:any) => u.supplierId === s.id)?.balance || 0; const purchasesTotal = state.purchases.filter(p => p.supplier === s.name && !p.isArchived).reduce((sum, p) => sum + p.total, 0); const returnsTotal = state.purchaseReturns.filter(pr => pr.supplier === s.name && !pr.isArchived).reduce((sum, pr) => sum + pr.total, 0); const paymentsTotal = state.treasury.filter(t => t.partyId === s.id && t.type === 'سند صرف' && !t.isArchived).reduce((sum, t) => sum + Math.abs(t.amount), 0); const totalRefunds = state.treasury.filter((t: TreasuryTransaction) => t.partyType === 'supplier' && t.partyId === s.id && t.type === 'سند قبض' && !t.isArchived).reduce((sum, t) => sum + t.amount, 0); s.balance = supplierOpeningBalance + purchasesTotal + totalRefunds - returnsTotal - paymentsTotal; });
        allEntries.forEach(entry => { if(!entry.isArchived && entry.relatedPartyId) { if (entry.relatedPartyType === 'customer') { const customer = newCustomers.find((c: Customer) => c.id === entry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '1103'); if (customer && controlAccount) { const lines = entry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => customer.balance += (l.debit - l.credit)); } } else if (entry.relatedPartyType === 'supplier') { const supplier = newSuppliers.find((s: Supplier) => s.id === entry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '2101'); if (supplier && controlAccount) { const lines = entry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => supplier.balance += (l.credit - l.debit)); } } } });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تحديث الأرصدة الافتتاحية', details: 'تم تعديل الأرصدة الافتتاحية للنظام.' };
        dispatch({ type: 'UPDATE_OPENING_BALANCES', payload: { customers: newCustomers, suppliers: newSuppliers, chartOfAccounts: newChart, journal: newLines.length > 0 ? newJournal : state.journal, log } });
        showToast("تم تحديث الأرصدة الافتتاحية بنجاح.", "success");
    }, [state, currentUser, showToast]);
    
    const createGenericFunctions = <T extends { id: string, isArchived?: boolean }>(
        collectionName: keyof AppState,
        collectionLabel: string,
        addType: string,
        updateType: string,
        archiveType: string,
        unarchiveType: string,
        deletePermanentType: string,
        sequenceKey: keyof typeof initialState.sequences
    ) => {
        const add = (data: Omit<T, 'id'>): T => {
            const newId = `${collectionLabel.toUpperCase()}${state.sequences[sequenceKey]}`;
            const newItem = { ...data, id: newId } as T;
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: `إضافة ${collectionLabel}`, details: `تمت إضافة ${collectionLabel} جديد برقم ${newId}.` };
            dispatch({ type: addType, payload: { [collectionName]: [newItem, ...(state[collectionName] as T[])], sequences: { ...state.sequences, [sequenceKey]: state.sequences[sequenceKey] + 1 }, log } });
            showToast(`تمت إضافة ${collectionLabel} بنجاح.`); return newItem;
        };
        const update = (data: T) => {
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: `تعديل ${collectionLabel}`, details: `تم تعديل ${collectionLabel} رقم ${data.id}.` };
            dispatch({ type: updateType, payload: { [collectionName]: (state[collectionName] as T[]).map(item => item.id === data.id ? data : item), log } });
            showToast(`تم تعديل ${collectionLabel} بنجاح.`);
        };
        const archive = (id: string) => {
            const item = (state[collectionName] as T[]).find(i => i.id === id);
            if (item && (item as any).balance !== 0 && (item as any).balance !== undefined) { const message = `لا يمكن أرشفة ${collectionLabel} رصيده لا يساوي صفر.`; showToast(message, 'error'); return { success: false, message }; }
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: `أرشفة ${collectionLabel}`, details: `تمت أرشفة ${collectionLabel} رقم ${id}.` };
            dispatch({ type: archiveType, payload: { [collectionName]: (state[collectionName] as T[]).map(item => item.id === id ? { ...item, isArchived: true } : item), log } });
            return { success: true, message: '' };
        };
        const unarchive = (id: string) => {
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: `إلغاء أرشفة ${collectionLabel}`, details: `تمت استعادة ${collectionLabel} رقم ${id}.` };
            dispatch({ type: unarchiveType, payload: { [collectionName]: (state[collectionName] as T[]).map(item => item.id === id ? { ...item, isArchived: false } : item), log } });
            showToast(`تمت استعادة ${collectionLabel} بنجاح.`);
        };
        const removePermanent = (id: string) => {
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: `حذف نهائي ${collectionLabel}`, details: `تم حذف ${collectionLabel} رقم ${id} نهائياً.` };
            dispatch({ type: deletePermanentType, payload: { id, log } });
            showToast(`تم حذف ${collectionLabel} نهائياً.`);
        };
        return { add, update, archive, unarchive, removePermanent };
    };
    
    const usersOps = createGenericFunctions<User>('users', 'مستخدم', 'ADD_USER', 'UPDATE_USER', 'ARCHIVE_USER', 'UNARCHIVE_USER', 'DELETE_USER_PERMANENT', 'account');
    const customerOps = createGenericFunctions<Customer>('customers', 'عميل', 'ADD_CUSTOMER', 'UPDATE_CUSTOMER', 'ARCHIVE_CUSTOMER', 'UNARCHIVE_CUSTOMER', 'DELETE_CUSTOMER_PERMANENT', 'customer');
    const supplierOps = createGenericFunctions<Supplier>('suppliers', 'مورد', 'ADD_SUPPLIER', 'UPDATE_SUPPLIER', 'ARCHIVE_SUPPLIER', 'UNARCHIVE_SUPPLIER', 'DELETE_SUPPLIER_PERMANENT', 'supplier');
    const itemOps = createGenericFunctions<InventoryItem>('inventory', 'صنف', '', '', 'ARCHIVE_ITEM', 'UNARCHIVE_ITEM', 'DELETE_ITEM_PERMANENT', 'item');

    const addUnitDefinition = (name: string): UnitDefinition => {
        const newUnit = { id: `unit-${state.sequences.unit}`, name: name };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة وحدة قياس', details: `تمت إضافة وحدة "${name}".` };
        dispatch({ type: 'ADD_UNIT_DEFINITION', payload: { newUnit, log }}); return newUnit;
    };

    const addItem = (itemData: Omit<InventoryItem, 'id'>): InventoryItem => {
        if(state.inventory.some(i => i.name === itemData.name && !i.isArchived)) { throw new Error('يوجد صنف آخر بنفس الاسم.'); }
        const newId = `ITM-${state.sequences.item}`, barcode = itemData.barcode || String(state.sequences.barcode);
        if (state.inventory.some(i => i.barcode === barcode && !i.isArchived)) { throw new Error(`الباركود ${barcode} مستخدم بالفعل.`); }
        const newItem = { ...itemData, id: newId, barcode };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة صنف', details: `تمت إضافة الصنف "${newItem.name}" برقم ${newId}.` };
        dispatch({ type: 'ADD_ITEM', payload: { inventory: [newItem, ...state.inventory], sequences: { ...state.sequences, item: state.sequences.item + 1, packingUnit: state.sequences.packingUnit + (itemData.units?.length || 0), barcode: itemData.barcode ? state.sequences.barcode : state.sequences.barcode + 1 }, log } });
        showToast('تمت إضافة الصنف بنجاح.'); return newItem;
    };
    
    const updateItem = (itemData: InventoryItem) => {
        if(state.inventory.some(i => i.name === itemData.name && i.id !== itemData.id && !i.isArchived)) { showToast('يوجد صنف آخر بنفس الاسم.', 'error'); return; }
        if (itemData.barcode && state.inventory.some(i => i.barcode === itemData.barcode && i.id !== itemData.id && !i.isArchived)) { showToast(`الباركود ${itemData.barcode} مستخدم بالفعل.`, 'error'); return; }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل صنف', details: `تم تعديل الصنف "${itemData.name}".` };
        dispatch({ type: 'UPDATE_ITEM', payload: { inventory: state.inventory.map(item => item.id === itemData.id ? itemData : item), log } });
        showToast('تم تعديل الصنف بنجاح.');
    };
    
    const addJournalEntry = (entryData: Omit<JournalEntry, 'id'>): JournalEntry => {
        const newEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, ...entryData };
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts)), updatedCustomers = [...state.customers], updatedSuppliers = [...state.suppliers];
        if (newEntry.status === 'مرحل') {
            newEntry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit); });
            if (newEntry.relatedPartyId && newEntry.relatedPartyType) {
                if (newEntry.relatedPartyType === 'customer') { const customer = updatedCustomers.find(c => c.id === newEntry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '1103'); if (customer && controlAccount) { const lines = newEntry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => { customer.balance += (l.debit - l.credit); }); } }
                else if (newEntry.relatedPartyType === 'supplier') { const supplier = updatedSuppliers.find(s => s.id === newEntry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '2101'); if (supplier && controlAccount) { const lines = newEntry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => { supplier.balance += (l.credit - l.debit); }); } }
            }
        }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة قيد يومية', details: `تمت إضافة قيد #${newEntry.id}.` };
        dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: { newEntry, chartOfAccounts: newChart, log, updatedCustomers, updatedSuppliers } });
        showToast('تمت إضافة القيد بنجاح.'); return newEntry;
    };
    
    const updateJournalEntry = (entryData: Omit<JournalEntry, 'debit' | 'credit'>) => {
        const originalEntry = state.journal.find(e => e.id === entryData.id); if (!originalEntry) return;
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        if (originalEntry.status === 'مرحل' && originalEntry.lines) { originalEntry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit)); }); }
        const newTotalDebit = (entryData.lines || []).reduce((sum, line) => sum + line.debit, 0), newTotalCredit = (entryData.lines || []).reduce((sum, line) => sum + line.credit, 0);
        const updatedEntry = { ...entryData, debit: newTotalDebit, credit: newTotalCredit };
        if (updatedEntry.status === 'مرحل' && updatedEntry.lines) { updatedEntry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit); }); }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل قيد يومية', details: `تم تعديل القيد #${entryData.id}.` };
        const updatedJournal = state.journal.map(e => e.id === entryData.id ? updatedEntry : e);
        dispatch({ type: 'UPDATE_CHART_OF_ACCOUNTS', payload: { chartOfAccounts: newChart, log }});
        dispatch({ type: 'SET_STATE', payload: { ...state, chartOfAccounts: newChart, journal: updatedJournal } });
        showToast('تم تعديل القيد بنجاح.');
    };

    const archiveJournalEntry = (id: string) => {
        const entry = state.journal.find(e => e.id === id); if (!entry) return;
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts)), updatedCustomers = [...state.customers], updatedSuppliers = [...state.suppliers];
        if (entry.status === 'مرحل' && entry.lines) {
            entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit)); });
            if (entry.relatedPartyId && entry.relatedPartyType) {
                if (entry.relatedPartyType === 'customer') { const customer = updatedCustomers.find(c => c.id === entry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '1103'); if (customer && controlAccount) { const lines = entry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => { customer.balance -= (l.debit - l.credit); }); } }
                else if (entry.relatedPartyType === 'supplier') { const supplier = updatedSuppliers.find(s => s.id === entry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '2101'); if (supplier && controlAccount) { const lines = entry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => { supplier.balance -= (l.credit - l.debit); }); } }
            }
        }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'أرشفة قيد يومية', details: `تمت أرشفة القيد #${id}.` };
        const updatedJournal = state.journal.map(e => e.id === id ? { ...e, isArchived: true } : e);
        dispatch({ type: 'ARCHIVE_JOURNAL_ENTRY', payload: { updatedJournal, chartOfAccounts: newChart, log, updatedCustomers, updatedSuppliers } });
    };

    const unarchiveJournalEntry = (id: string) => {
        const entry = state.journal.find(e => e.id === id); if (!entry) return;
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts)), updatedCustomers = [...state.customers], updatedSuppliers = [...state.suppliers];
        if (entry.status === 'مرحل' && entry.lines) {
            entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit); });
            if (entry.relatedPartyId && entry.relatedPartyType) {
                if (entry.relatedPartyType === 'customer') { const customer = updatedCustomers.find(c => c.id === entry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '1103'); if (customer && controlAccount) { const lines = entry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => { customer.balance += (l.debit - l.credit); }); } }
                else if (entry.relatedPartyType === 'supplier') { const supplier = updatedSuppliers.find(s => s.id === entry.relatedPartyId); const controlAccount = findNodeRecursive(newChart, 'code', '2101'); if (supplier && controlAccount) { const lines = entry.lines.filter(l => l.accountId === controlAccount.id); lines.forEach(l => { supplier.balance += (l.credit - l.debit); }); } }
            }
        }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'استعادة قيد يومية', details: `تمت استعادة القيد #${id}.` };
        const updatedJournal = state.journal.map(e => e.id === id ? { ...e, isArchived: false } : e);
        dispatch({ type: 'UNARCHIVE_JOURNAL_ENTRY', payload: { updatedJournal, chartOfAccounts: newChart, log, updatedCustomers, updatedSuppliers } });
    };

    const deleteJournalEntry = (id: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'حذف نهائي لقيد يومية', details: `تم حذف القيد #${id} نهائياً.` };
        dispatch({ type: 'DELETE_JOURNAL_ENTRY', payload: { updatedJournal: state.journal.filter(j => j.id !== id), log } });
        showToast('تم حذف القيد نهائياً.');
    };

    const addSale = (saleData: Omit<Sale, 'id' | 'journalEntryId'>): Sale => {
        const newSale: Sale = { id: `INV-${String(state.sequences.sale).padStart(3, '0')}`, ...saleData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        saleData.items.forEach(lineItem => { const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId); if(item) { let quantityInBaseUnit = lineItem.quantity; if (lineItem.unitId !== 'base') { const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId); if (packingUnit) { quantityInBaseUnit *= packingUnit.factor; } } item.stock -= quantityInBaseUnit; } });
        const updatedCustomers = state.customers.map(c => { if (c.name === saleData.customer) { return { ...c, balance: c.balance + (saleData.total - (saleData.paidAmount || 0)) }; } return c; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts)), customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103'), salesAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4101'), inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104'), cogsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4204'), cashAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '110101');
        const cogsValue = saleData.items.reduce((sum, line) => { const item = state.inventory.find(i => i.id === line.itemId); if(!item) return sum; let quantityInBaseUnit = line.quantity; if(line.unitId !== 'base') { const packingUnit = item.units.find(u => u.id === line.unitId); if(packingUnit) quantityInBaseUnit *= packingUnit.factor; } return sum + (quantityInBaseUnit * item.purchasePrice); }, 0);
        const journalLines: JournalLine[] = [ { accountId: customerAccount!.id, accountName: customerAccount!.name, debit: saleData.total, credit: 0 }, { accountId: salesAccount!.id, accountName: salesAccount!.name, debit: 0, credit: saleData.total }, { accountId: cogsAccount!.id, accountName: cogsAccount!.name, debit: cogsValue, credit: 0 }, { accountId: inventoryAccount!.id, accountName: inventoryAccount!.name, debit: 0, credit: cogsValue } ];
        if (saleData.paidAmount && saleData.paidAmount > 0) { journalLines.push({ accountId: cashAccount!.id, accountName: cashAccount!.name, debit: saleData.paidAmount, credit: 0 }, { accountId: customerAccount!.id, accountName: customerAccount!.name, debit: 0, credit: saleData.paidAmount }); }
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newSale.date, description: `فاتورة مبيعات رقم ${newSale.id}`, debit: journalLines.reduce((s, l) => s + l.debit, 0), credit: journalLines.reduce((s, l) => s + l.credit, 0), status: 'مرحل', lines: journalLines };
        newSale.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة فاتورة مبيعات', details: `تمت إضافة فاتورة #${newSale.id} للعميل ${newSale.customer}.` };
        dispatch({ type: 'ADD_SALE', payload: { newSale, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log, notification: null } });
        return newSale;
    };
    
    // Fix: unarchiveSale implementation added
    const unarchiveSale = (id: string) => {
        const sale = state.sales.find(s => s.id === id); if (!sale) return;
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        sale.items.forEach(lineItem => { const item = updatedInventory.find((i: any) => i.id === lineItem.itemId); if (item) { let q = lineItem.quantity; if (lineItem.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === lineItem.unitId); if (pu) q *= pu.factor; } item.stock -= q; } });
        const updatedCustomers = state.customers.map(c => { if (c.name === sale.customer) return { ...c, balance: c.balance + (sale.total - (sale.paidAmount || 0)) }; return c; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (sale.journalEntryId) { const entry = updatedJournal.find(j => j.id === sale.journalEntryId); if (entry) { entry.isArchived = false; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, (line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إلغاء أرشفة فاتورة مبيعات', details: `تمت استعادة فاتورة مبيعات رقم #${id}.` };
        dispatch({ type: 'UNARCHIVE_SALE', payload: { updatedSales: state.sales.map(s => s.id === id ? { ...s, isArchived: false } : s), updatedInventory, updatedCustomers, log, updatedJournal, chartOfAccounts: newChart } });
    };

    const archiveSale = (id: string): { success: boolean, message: string } => {
        const sale = state.sales.find(s => s.id === id); if (!sale) return { success: false, message: 'الفاتورة غير موجودة.' };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        sale.items.forEach(lineItem => { const item = updatedInventory.find((i: any) => i.id === lineItem.itemId); if (item) { let q = lineItem.quantity; if (lineItem.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === lineItem.unitId); if (pu) q *= pu.factor; } item.stock += q; } });
        const updatedCustomers = state.customers.map(c => { if (c.name === sale.customer) return { ...c, balance: c.balance - (sale.total - (sale.paidAmount || 0)) }; return c; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (sale.journalEntryId) { const entry = updatedJournal.find(j => j.id === sale.journalEntryId); if (entry) { entry.isArchived = true; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'أرشفة فاتورة مبيعات', details: `تمت أرشفة فاتورة مبيعات رقم #${id}.` };
        dispatch({ type: 'ARCHIVE_SALE', payload: { updatedSales: state.sales.map(s => s.id === id ? { ...s, isArchived: true } : s), updatedInventory, updatedCustomers, log, updatedJournal, chartOfAccounts: newChart } });
        return { success: true, message: 'تمت أرشفة الفاتورة بنجاح.' };
    };
    
    // Fix: updateSale implementation added
    const updateSale = (saleData: Sale): Sale => {
        archiveSale(saleData.id);
        const result = addSale(saleData);
        return result;
    };

    const deleteSale = (id: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'حذف نهائي لفاتورة مبيعات', details: `تم حذف الفاتورة رقم #${id} نهائياً.` };
        dispatch({ type: 'DELETE_SALE', payload: { updatedSales: state.sales.filter(s => s.id !== id), updatedInventory: state.inventory, updatedCustomers: state.customers, log, updatedJournal: state.journal, chartOfAccounts: state.chartOfAccounts } });
        showToast('تم حذف الفاتورة نهائياً.');
    };

    // Fix: addPriceQuote implementation added
    const addPriceQuote = (quoteData: Omit<PriceQuote, 'id' | 'status'>): PriceQuote => {
        const newQuote: PriceQuote = { ...quoteData, id: `QT-${String(state.sequences.priceQuote).padStart(3, '0')}`, status: 'جديد' };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة عرض سعر', details: `تم إنشاء عرض سعر #${newQuote.id}.` };
        dispatch({ type: 'ADD_PRICE_QUOTE', payload: { newQuote, log } });
        return newQuote;
    };

    // Fix: updatePriceQuote implementation added
    const updatePriceQuote = (quoteData: PriceQuote) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل عرض سعر', details: `تم تعديل عرض سعر #${quoteData.id}.` };
        dispatch({ type: 'UPDATE_PRICE_QUOTE', payload: { priceQuotes: state.priceQuotes.map(q => q.id === quoteData.id ? quoteData : q), log } });
    };

    // Fix: cancelPriceQuote implementation added
    const cancelPriceQuote = (quoteId: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إلغاء عرض سعر', details: `تم إلغاء عرض سعر #${quoteId}.` };
        dispatch({ type: 'CANCEL_PRICE_QUOTE', payload: { quoteId, log } });
    };

    const deletePriceQuote = (quoteId: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'حذف بيان أسعار', details: `تم حذف بيان أسعار #${quoteId} نهائياً.` };
        dispatch({ type: 'DELETE_PRICE_QUOTE', payload: { quoteId, log } });
        showToast('تم حذف بيان الأسعار بنجاح.');
    };

    // Fix: convertQuoteToSale implementation added
    const convertQuoteToSale = (quoteId: string) => {
        const quote = state.priceQuotes.find(q => q.id === quoteId);
        if (quote) {
            const sale = addSale({ customer: quote.customer, date: new Date().toISOString().slice(0,10), status: 'مستحقة', items: quote.items, subtotal: quote.subtotal, totalDiscount: quote.totalDiscount, total: quote.total });
            const updatedQuote = { ...quote, status: 'تم تحويله' as const };
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تحويل عرض سعر', details: `تم تحويل عرض سعر #${quoteId} إلى فاتورة #${sale.id}.` };
            dispatch({ type: 'CONVERT_QUOTE_TO_SALE', payload: { updatedQuote, newSale: sale, log } });
        }
    };

    const addPurchase = (purchaseData: Omit<Purchase, 'id' | 'journalEntryId'>): Purchase => {
        const newPurchase: Purchase = { id: `BILL-${String(state.sequences.purchase).padStart(3, '0')}`, ...purchaseData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        purchaseData.items.forEach(lineItem => { const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId); if (item) { let q = lineItem.quantity, bp = lineItem.price; if (lineItem.unitId !== 'base') { const pu = item.units.find((u: PackingUnit) => u.id === lineItem.unitId); if (pu && pu.factor > 0) { q *= pu.factor; bp = lineItem.price / pu.factor; } } item.stock += q; item.purchasePrice = bp; } });
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === newPurchase.supplier) return { ...s, balance: s.balance + (newPurchase.total - (newPurchase.paidAmount || 0)) }; return s; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts)), supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101'), inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104'), cashAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '110101');
        const journalLines: JournalLine[] = [ { accountId: inventoryAccount!.id, accountName: inventoryAccount!.name, debit: newPurchase.total, credit: 0 }, { accountId: supplierAccount!.id, accountName: supplierAccount!.name, debit: 0, credit: newPurchase.total } ];
        if (newPurchase.paidAmount && newPurchase.paidAmount > 0) { journalLines.push({ accountId: supplierAccount!.id, accountName: supplierAccount!.name, debit: newPurchase.paidAmount, credit: 0 }, { accountId: cashAccount!.id, accountName: cashAccount!.name, debit: 0, credit: newPurchase.paidAmount }); }
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newPurchase.date, description: `فاتورة مشتريات رقم ${newPurchase.id}`, debit: journalLines.reduce((s, l) => s + l.debit, 0), credit: journalLines.reduce((s, l) => s + l.credit, 0), status: 'مرحل', lines: journalLines };
        newPurchase.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة فاتورة مشتريات', details: `فاتورة #${newPurchase.id} من ${newPurchase.supplier}.` };
        dispatch({ type: 'ADD_PURCHASE', payload: { newPurchase, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } });
        showToast('تمت إضافة فاتورة المشتريات.'); return newPurchase;
    };
    
    // Fix: unarchivePurchase implementation added
    const unarchivePurchase = (id: string) => {
        const purchase = state.purchases.find(p => p.id === id); if (!purchase) return;
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        purchase.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock += q; } });
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === purchase.supplier) return { ...s, balance: s.balance + (purchase.total - (purchase.paidAmount || 0)) }; return s; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (purchase.journalEntryId) { const entry = updatedJournal.find(j => j.id === purchase.journalEntryId); if (entry) { entry.isArchived = false; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, (line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إلغاء أرشفة فاتورة مشتريات', details: `تمت استعادة فاتورة مشتريات رقم #${id}.` };
        dispatch({ type: 'UNARCHIVE_PURCHASE', payload: { updatedPurchases: state.purchases.map(p => p.id === id ? { ...p, isArchived: false } : p), updatedInventory, updatedSuppliers, log, updatedJournal, chartOfAccounts: newChart } });
    };

    const archivePurchase = (id: string): { success: boolean, message: string } => {
        const purchase = state.purchases.find(p => p.id === id); if (!purchase) return { success: false, message: 'الفاتورة غير موجودة.' };
        for (const li of purchase.items) { const item = state.inventory.find(i => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find(u => u.id === li.unitId); if (pu) q *= pu.factor; } if (item.stock < q) return { success: false, message: `لا يمكن أرشفة الفاتورة. الرصيد الحالي للصنف "${item.name}" (${item.stock}) أقل من الكمية المراد إرجاعها (${q}).` }; } }
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        purchase.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock -= q; } });
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === purchase.supplier) return { ...s, balance: s.balance - (purchase.total - (purchase.paidAmount || 0)) }; return s; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (purchase.journalEntryId) { const entry = updatedJournal.find(j => j.id === purchase.journalEntryId); if (entry) { entry.isArchived = true; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'أرشفة فاتورة مشتريات', details: `تمت أرشفة فاتورة مشتريات رقم #${id}.` };
        dispatch({ type: 'ARCHIVE_PURCHASE', payload: { updatedPurchases: state.purchases.map(p => p.id === id ? { ...p, isArchived: true } : p), updatedInventory, updatedSuppliers, log, updatedJournal, chartOfAccounts: newChart } });
        return { success: true, message: 'تمت أرشفة الفاتورة بنجاح.' };
    };
    
    // Fix: updatePurchase implementation added
    const updatePurchase = (purchaseData: Purchase): Purchase => {
        archivePurchase(purchaseData.id);
        return addPurchase(purchaseData);
    };

    const deletePurchase = (id: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'حذف نهائي لفاتورة مشتريات', details: `تم حذف الفاتورة رقم #${id} نهائياً.` };
        dispatch({ type: 'DELETE_PURCHASE', payload: { updatedPurchases: state.purchases.filter(p => p.id !== id), updatedInventory: state.inventory, updatedSuppliers: state.suppliers, log, updatedJournal: state.journal, chartOfAccounts: state.chartOfAccounts } });
        showToast('تم حذف الفاتورة نهائياً.');
    };

    // Fix: addPurchaseQuote implementation added
    const addPurchaseQuote = (quoteData: Omit<PurchaseQuote, 'id' | 'status'>): PurchaseQuote => {
        const newQuote: PurchaseQuote = { ...quoteData, id: `PQT-${String(state.sequences.purchaseQuote).padStart(3, '0')}`, status: 'جديد' };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة طلب شراء', details: `تم إنشاء طلب شراء #${newQuote.id}.` };
        dispatch({ type: 'ADD_PURCHASE_QUOTE', payload: { newQuote, log } });
        return newQuote;
    };

    // Fix: updatePurchaseQuote implementation added
    const updatePurchaseQuote = (quoteData: PurchaseQuote) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل طلب شراء', details: `تم تعديل طلب شراء #${quoteData.id}.` };
        dispatch({ type: 'UPDATE_PURCHASE_QUOTE', payload: { purchaseQuotes: state.purchaseQuotes.map(q => q.id === quoteData.id ? quoteData : q), log } });
    };

    // Fix: cancelPurchaseQuote implementation added
    const cancelPurchaseQuote = (quoteId: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إلغاء طلب شراء', details: `تم إلغاء طلب شراء #${quoteId}.` };
        dispatch({ type: 'CANCEL_PURCHASE_QUOTE', payload: { quoteId, log } });
    };

    const deletePurchaseQuote = (quoteId: string) => {
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'حذف طلب شراء', details: `تم حذف طلب شراء #${quoteId} نهائياً.` };
        dispatch({ type: 'DELETE_PURCHASE_QUOTE', payload: { quoteId, log } });
        showToast('تم حذف طلب الشراء بنجاح.');
    };

    // Fix: convertQuoteToPurchase implementation added
    const convertQuoteToPurchase = (quoteId: string) => {
        const quote = state.purchaseQuotes.find(q => q.id === quoteId);
        if (quote) {
            const purchase = addPurchase({ supplier: quote.supplier, date: new Date().toISOString().slice(0,10), status: 'مستحقة', items: quote.items, subtotal: quote.subtotal, totalDiscount: quote.totalDiscount, total: quote.total });
            const updatedQuote = { ...quote, status: 'تم تحويله' as const };
            const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تحويل طلب شراء', details: `تم تحويل طلب شراء #${quoteId} إلى فاتورة #${purchase.id}.` };
            dispatch({ type: 'CONVERT_QUOTE_TO_PURCHASE', payload: { updatedQuote, newPurchase: purchase, log } });
        }
    };

    // Fix: addSaleReturn implementation added
    const addSaleReturn = (returnData: Omit<SaleReturn, 'id' | 'journalEntryId'>): SaleReturn => {
        const newSaleReturn: SaleReturn = { id: `SRET-${String(state.sequences.saleReturn).padStart(3, '0')}`, ...returnData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        returnData.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock += q; } });
        const updatedCustomers = state.customers.map(c => { if (c.name === newSaleReturn.customer) return { ...c, balance: c.balance - newSaleReturn.total }; return c; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts)), customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103'), returnsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4104'), inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104'), cogsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4204');
        const cogsValue = returnData.items.reduce((sum, line) => { const item = state.inventory.find(i => i.id === line.itemId); if(!item) return sum; let q = line.quantity; if(line.unitId !== 'base') { const pu = item.units.find(u => u.id === line.unitId); if(pu) q *= pu.factor; } return sum + (q * item.purchasePrice); }, 0);
        const journalLines: JournalLine[] = [ { accountId: returnsAccount!.id, accountName: returnsAccount!.name, debit: newSaleReturn.total, credit: 0 }, { accountId: customerAccount!.id, accountName: customerAccount!.name, debit: 0, credit: newSaleReturn.total }, { accountId: inventoryAccount!.id, accountName: inventoryAccount!.name, debit: cogsValue, credit: 0 }, { accountId: cogsAccount!.id, accountName: cogsAccount!.name, debit: 0, credit: cogsValue } ];
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newSaleReturn.date, description: `مرتجع مبيعات رقم ${newSaleReturn.id}`, debit: journalLines.reduce((s, l) => s + l.debit, 0), credit: journalLines.reduce((s, l) => s + l.credit, 0), status: 'مرحل', lines: journalLines };
        newSaleReturn.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة مرتجع مبيعات', details: `مرتجع #${newSaleReturn.id} للعميل ${newSaleReturn.customer}.` };
        dispatch({ type: 'ADD_SALE_RETURN', payload: { newSaleReturn, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log } });
        return newSaleReturn;
    };
    
    // Fix: updateSaleReturn implementation added
    const updateSaleReturn = (returnData: SaleReturn): SaleReturn => {
        deleteSaleReturn(returnData.id);
        return addSaleReturn(returnData);
    };

    // Fix: deleteSaleReturn implementation added (handles archiving)
    const deleteSaleReturn = (returnId: string): { success: boolean, message: string } => {
        const ret = state.saleReturns.find(r => r.id === returnId); if (!ret) return { success: false, message: 'المرتجع غير موجود.' };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        ret.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock -= q; } });
        const updatedCustomers = state.customers.map(c => { if (c.name === ret.customer) return { ...c, balance: c.balance + ret.total }; return c; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (ret.journalEntryId) { const entry = updatedJournal.find(j => j.id === ret.journalEntryId); if (entry) { entry.isArchived = true; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'أرشفة مرتجع مبيعات', details: `تمت أرشفة مرتجع رقم #${returnId}.` };
        dispatch({ type: 'ARCHIVE_SALE_RETURN', payload: { updatedSaleReturns: state.saleReturns.map(r => r.id === returnId ? { ...r, isArchived: true } : r), updatedInventory, updatedCustomers, log, updatedJournal, chartOfAccounts: newChart } });
        return { success: true, message: 'تمت أرشفة المرتجع بنجاح.' };
    };
    
    // Fix: unarchiveSaleReturn implementation added
    const unarchiveSaleReturn = (id: string) => {
        const ret = state.saleReturns.find(r => r.id === id); if (!ret) return;
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        ret.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock += q; } });
        const updatedCustomers = state.customers.map(c => { if (c.name === ret.customer) return { ...c, balance: c.balance - ret.total }; return c; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (ret.journalEntryId) { const entry = updatedJournal.find(j => j.id === ret.journalEntryId); if (entry) { entry.isArchived = false; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, (line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إلغاء أرشفة مرتجع مبيعات', details: `تمت استعادة مرتجع رقم #${id}.` };
        dispatch({ type: 'UNARCHIVE_SALE_RETURN', payload: { updatedSaleReturns: state.saleReturns.map(r => r.id === id ? { ...r, isArchived: false } : r), updatedInventory, updatedCustomers, log, updatedJournal, chartOfAccounts: newChart } });
    };

    // Fix: addPurchaseReturn implementation added
    const addPurchaseReturn = (returnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'>): PurchaseReturn => {
        const newReturn: PurchaseReturn = { id: `PRET-${String(state.sequences.purchaseReturn).padStart(3, '0')}`, ...returnData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        returnData.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock -= q; } });
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === newReturn.supplier) return { ...s, balance: s.balance - newReturn.total }; return s; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts)), supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101'), inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const journalLines: JournalLine[] = [ { accountId: supplierAccount!.id, accountName: supplierAccount!.name, debit: newReturn.total, credit: 0 }, { accountId: inventoryAccount!.id, accountName: inventoryAccount!.name, debit: 0, credit: newReturn.total } ];
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newReturn.date, description: `مرتجع مشتريات رقم ${newReturn.id}`, debit: journalLines.reduce((s, l) => s + l.debit, 0), credit: journalLines.reduce((s, l) => s + l.credit, 0), status: 'مرحل', lines: journalLines };
        newReturn.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة مرتجع مشتريات', details: `مرتجع #${newReturn.id} للمورد ${newReturn.supplier}.` };
        dispatch({ type: 'ADD_PURCHASE_RETURN', payload: { newPurchaseReturn: newReturn, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } });
        return newReturn;
    };
    
    // Fix: updatePurchaseReturn implementation added
    const updatePurchaseReturn = (returnData: PurchaseReturn): PurchaseReturn => {
        deletePurchaseReturn(returnData.id);
        return addPurchaseReturn(returnData);
    };

    // Fix: deletePurchaseReturn implementation added (handles archiving)
    const deletePurchaseReturn = (returnId: string): { success: boolean, message: string } => {
        const ret = state.purchaseReturns.find(r => r.id === returnId); if (!ret) return { success: false, message: 'المرتجع غير موجود.' };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        ret.items.forEach(li => { const item = updatedInventory.find((i: any) => i.id === li.itemId); if (item) { let q = li.quantity; if (li.unitId !== 'base') { const pu = item.units.find((u: any) => u.id === li.unitId); if (pu) q *= pu.factor; } item.stock += q; } });
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === ret.supplier) return { ...s, balance: s.balance + ret.total }; return s; });
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (ret.journalEntryId) { const entry = updatedJournal.find(j => j.id === ret.journalEntryId); if (entry) { entry.isArchived = true; if (entry.status === 'مرحل') { entry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit)); }); } } }
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'أرشفة مرتجع مشتريات', details: `تمت أرشفة مرتجع رقم #${returnId}.` };
        dispatch({ type: 'ARCHIVE_PURCHASE_RETURN', payload: { updatedPurchaseReturns: state.purchaseReturns.map(r => r.id === returnId ? { ...r, isArchived: true } : r), updatedInventory, updatedSuppliers, log, updatedJournal, chartOfAccounts: newChart } });
        return { success: true, message: 'تمت أرشفة المرتجع بنجاح.' };
    };
    
    // Fix: unarchivePurchaseReturn implementation added
    const unarchivePurchaseReturn = (id: string) => {
        const ret = state.purchase