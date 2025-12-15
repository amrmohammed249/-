
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

const findAccountByCode = (nodes: AccountNode[], code: string): AccountNode | null => {
    for (const node of nodes) {
        if (node.code === code) return node;
        if (node.children) {
            const found = findAccountByCode(node.children, code);
            if (found) return found;
        }
    }
    return null;
};

// Helper function to update an account's balance and propagate the change up to its parents
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

const migrateChartOfAccounts = (chart: AccountNode[]): AccountNode[] => {
    const newChart = JSON.parse(JSON.stringify(chart));

    const requiredAccounts = [
        // Roots
        { id: '1', name: 'الأصول', code: '1000', parentCode: null },
        { id: '2', name: 'الالتزامات', code: '2000', parentCode: null },
        { id: '3', name: 'حقوق الملكية', code: '3000', parentCode: null },
        { id: '4', name: 'الإيرادات والمصروفات', code: '4000', parentCode: null },
        // Level 2
        { id: '1-1', name: 'الأصول المتداولة', code: '1100', parentCode: '1000' },
        { id: '1-2', name: 'الأصول الثابتة', code: '1200', parentCode: '1000' },
        { id: '4-2', name: 'مصروفات تشغيل', code: '4200', parentCode: '4000' },
        { id: '4-3', name: 'إيرادات أخرى', code: '4300', parentCode: '4000' },
        // Level 3 & 4 (Leaves)
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
            console.log(`MIGRATION: Account with code ${acc.code} (${acc.name}) is missing. Adding it.`);
            const newNode = { id: acc.id, code: acc.code, name: acc.name, balance: 0, children: [] };
            
            if (acc.parentCode) {
                 const parent = findNodeRecursive(newChart, 'code', acc.parentCode);
                 if (parent) {
                     if (!parent.children) parent.children = [];
                     parent.children.push(newNode);
                 } else {
                     console.error(`Migration failed: Parent account ${acc.parentCode} not found for ${acc.code}.`);
                 }
            } else { // It's a root account
                 newChart.push(newNode);
            }
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
        case 'SET_STATE':
            return action.payload;
        
        case 'ADD_LOG_AND_NOTIFICATION':
            return {
                ...state,
                activityLog: action.payload.log ? [action.payload.log, ...state.activityLog] : state.activityLog,
                notifications: action.payload.notification ? [action.payload.notification, ...state.notifications].slice(0, 50) : state.notifications,
            };

        case 'UPDATE_COMPANY_INFO':
            return { ...state, companyInfo: action.payload };
        case 'UPDATE_PRINT_SETTINGS':
            return { ...state, printSettings: action.payload };
        case 'UPDATE_FINANCIAL_YEAR':
            return { ...state, financialYear: action.payload };
        case 'UPDATE_GENERAL_SETTINGS':
            return { ...state, generalSettings: action.payload };

        case 'MARK_NOTIFICATION_READ':
            return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
        case 'MARK_ALL_NOTIFICATIONS_READ':
            return { ...state, notifications: state.notifications.map(n => ({ ...n, read: true })) };
        
        case 'ADD_ACCOUNT':
            const addNodeToTree = (nodes: AccountNode[]): AccountNode[] => {
                return nodes.map(node => {
                    if (node.id === action.payload.parentId) {
                        return { ...node, children: [...(node.children || []), action.payload.newAccount] };
                    }
                    if (node.children) {
                        return { ...node, children: addNodeToTree(node.children) };
                    }
                    return node;
                });
            };
            const newChartOfAccounts = action.payload.parentId
                ? addNodeToTree(state.chartOfAccounts)
                : [...state.chartOfAccounts, action.payload.newAccount];

            return {
                ...state,
                chartOfAccounts: newChartOfAccounts,
                // FIX: Atomically update sequences within the reducer to avoid race conditions.
                sequences: { ...state.sequences, account: state.sequences.account + 1 },
                activityLog: [action.payload.log, ...state.activityLog]
            };
        
        case 'UPDATE_CHART_OF_ACCOUNTS':
            return {
                ...state,
                chartOfAccounts: action.payload.chartOfAccounts,
                activityLog: [action.payload.log, ...state.activityLog]
            };
        
        case 'FORCE_BALANCE_RECALCULATION':
            return {
                ...state,
                customers: action.payload.customers,
                suppliers: action.payload.suppliers,
                chartOfAccounts: action.payload.chartOfAccounts,
                activityLog: [action.payload.log, ...state.activityLog]
            }

        case 'UPDATE_OPENING_BALANCES':
            return {
                ...state,
                customers: action.payload.customers,
                suppliers: action.payload.suppliers,
                chartOfAccounts: action.payload.chartOfAccounts,
                journal: action.payload.journal || state.journal,
                activityLog: [action.payload.log, ...state.activityLog]
            };
        
        case 'RESET_TRANSACTIONAL_DATA':
             return {
                ...state,
                ...action.payload,
                activityLog: [action.payload.log, ...state.activityLog]
            };

        case 'ADD_UNIT_DEFINITION':
            return {
                ...state,
                unitDefinitions: [...state.unitDefinitions, action.payload.newUnit],
                sequences: { ...state.sequences, unit: state.sequences.unit + 1 },
                activityLog: [action.payload.log, ...state.activityLog]
            };
        
        case 'ADD_JOURNAL_ENTRY': {
            const { newEntry, chartOfAccounts, log, updatedCustomers, updatedSuppliers } = action.payload;
            return {
                ...state,
                journal: [newEntry, ...state.journal],
                sequences: { ...state.sequences, journal: state.sequences.journal + 1 },
                chartOfAccounts,
                customers: updatedCustomers || state.customers,
                suppliers: updatedSuppliers || state.suppliers,
                activityLog: [log, ...state.activityLog]
            };
        }
        
        case 'ARCHIVE_JOURNAL_ENTRY':
        case 'UNARCHIVE_JOURNAL_ENTRY': {
            const { updatedJournal, chartOfAccounts, log } = action.payload;
            // NOTE: Reversing balances for Party linked JEs would require full recalc, but we rely on forceBalanceRecalculation if issues arise.
            return { ...state, journal: updatedJournal, chartOfAccounts, activityLog: [log, ...state.activityLog] };
        }
        
        case 'ADD_SALE': {
            const { newSale, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log, notification } = action.payload;
            return {
                ...state,
                chartOfAccounts: updatedChartOfAccounts,
                journal: [journalEntry, ...state.journal],
                sales: [newSale, ...state.sales],
                inventory: updatedInventory,
                customers: updatedCustomers,
                sequences: { 
                    ...state.sequences, 
                    sale: state.sequences.sale + 1,
                    journal: state.sequences.journal + 1,
                },
                activityLog: [log, ...state.activityLog],
                notifications: notification ? [notification, ...state.notifications].slice(0, 50) : state.notifications,
            };
        }
        
        case 'UPDATE_SALE': {
            const { updatedSale, updatedInventory, updatedCustomers, journal, chartOfAccounts, log, notification } = action.payload;
             return {
                ...state,
                sales: state.sales.map(s => s.id === updatedSale.id ? updatedSale : s),
                inventory: updatedInventory,
                customers: updatedCustomers,
                journal,
                chartOfAccounts,
                sequences: { ...state.sequences, journal: state.sequences.journal + 1 },
                activityLog: [log, ...state.activityLog],
                notifications: notification ? [notification, ...state.notifications].slice(0, 50) : state.notifications,
            };
        }

        case 'ADD_PRICE_QUOTE': {
            return {
                ...state,
                priceQuotes: [action.payload.newQuote, ...state.priceQuotes],
                sequences: { ...state.sequences, priceQuote: state.sequences.priceQuote + 1 },
                activityLog: [action.payload.log, ...state.activityLog]
            };
        }
        case 'UPDATE_PRICE_QUOTE':
        case 'UPDATE_PURCHASE_QUOTE': {
            return { ...state, ...action.payload };
        }
        case 'CANCEL_PRICE_QUOTE': {
            return {
                ...state,
                priceQuotes: state.priceQuotes.map(q => q.id === action.payload.quoteId ? { ...q, status: 'ملغي' } : q),
                activityLog: [action.payload.log, ...state.activityLog]
            };
        }
        case 'CONVERT_QUOTE_TO_SALE': {
            const { updatedQuote, newSale, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log, notification } = action.payload;
            return {
                ...state,
                priceQuotes: state.priceQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q),
                chartOfAccounts: updatedChartOfAccounts,
                journal: [journalEntry, ...state.journal],
                sales: [newSale, ...state.sales],
                inventory: updatedInventory,
                customers: updatedCustomers,
                sequences: { 
                    ...state.sequences, 
                    sale: state.sequences.sale + 1,
                    journal: state.sequences.journal + 1,
                },
                activityLog: [log, ...state.activityLog],
                notifications: notification ? [notification, ...state.notifications].slice(0, 50) : state.notifications,
            };
        }

        case 'ARCHIVE_SALE': {
            const { updatedSales, updatedInventory, updatedCustomers, log, updatedJournal, chartOfAccounts } = action.payload;
            return {
                ...state,
                sales: updatedSales,
                inventory: updatedInventory,
                customers: updatedCustomers,
                journal: updatedJournal,
                chartOfAccounts,
                activityLog: [log, ...state.activityLog],
            };
        }
        
        case 'ADD_PURCHASE': {
            const { newPurchase, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return {
                ...state,
                chartOfAccounts: updatedChartOfAccounts,
                journal: [journalEntry, ...state.journal],
                purchases: [newPurchase, ...state.purchases],
                inventory: updatedInventory,
                suppliers: updatedSuppliers,
                sequences: { 
                    ...state.sequences, 
                    purchase: state.sequences.purchase + 1,
                    journal: state.sequences.journal + 1,
                },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'UPDATE_PURCHASE': {
            const { updatedPurchase, updatedInventory, updatedSuppliers, journal, chartOfAccounts, log } = action.payload;
             return {
                ...state,
                purchases: state.purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p),
                inventory: updatedInventory,
                suppliers: updatedSuppliers,
                journal,
                chartOfAccounts,
                sequences: { ...state.sequences, journal: state.sequences.journal + 1 },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ADD_PURCHASE_QUOTE': {
            return {
                ...state,
                purchaseQuotes: [action.payload.newQuote, ...state.purchaseQuotes],
                sequences: { ...state.sequences, purchaseQuote: state.sequences.purchaseQuote + 1 },
                activityLog: [action.payload.log, ...state.activityLog]
            };
        }
        case 'CANCEL_PURCHASE_QUOTE': {
            return {
                ...state,
                purchaseQuotes: state.purchaseQuotes.map(q => q.id === action.payload.quoteId ? { ...q, status: 'ملغي' } : q),
                activityLog: [action.payload.log, ...state.activityLog]
            };
        }
        case 'CONVERT_QUOTE_TO_PURCHASE': {
            const { updatedQuote, newPurchase, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return {
                ...state,
                purchaseQuotes: state.purchaseQuotes.map(q => q.id === updatedQuote.id ? updatedQuote : q),
                chartOfAccounts: updatedChartOfAccounts,
                journal: [journalEntry, ...state.journal],
                purchases: [newPurchase, ...state.purchases],
                inventory: updatedInventory,
                suppliers: updatedSuppliers,
                sequences: { 
                    ...state.sequences, 
                    purchase: state.sequences.purchase + 1,
                    journal: state.sequences.journal + 1,
                },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ARCHIVE_PURCHASE': {
            const { updatedPurchases, updatedInventory, updatedSuppliers, log, updatedJournal, chartOfAccounts } = action.payload;
            return {
                ...state,
                purchases: updatedPurchases,
                inventory: updatedInventory,
                suppliers: updatedSuppliers,
                journal: updatedJournal,
                chartOfAccounts,
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ADD_SALE_RETURN': {
            const { newSaleReturn, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return {
                ...state,
                saleReturns: [newSaleReturn, ...state.saleReturns],
                inventory: updatedInventory,
                customers: updatedCustomers,
                journal: [journalEntry, ...state.journal],
                chartOfAccounts: updatedChartOfAccounts,
                sequences: { ...state.sequences, saleReturn: state.sequences.saleReturn + 1, journal: state.sequences.journal + 1 },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ARCHIVE_SALE_RETURN': {
            const { updatedSaleReturns, updatedInventory, updatedCustomers, updatedJournal, chartOfAccounts, log } = action.payload;
            return {
                ...state,
                saleReturns: updatedSaleReturns,
                inventory: updatedInventory,
                customers: updatedCustomers,
                journal: updatedJournal,
                chartOfAccounts,
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ADD_PURCHASE_RETURN': {
            const { newPurchaseReturn, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return {
                ...state,
                purchaseReturns: [newPurchaseReturn, ...state.purchaseReturns],
                inventory: updatedInventory,
                suppliers: updatedSuppliers,
                journal: [journalEntry, ...state.journal],
                chartOfAccounts: updatedChartOfAccounts,
                sequences: { ...state.sequences, purchaseReturn: state.sequences.purchaseReturn + 1, journal: state.sequences.journal + 1 },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ARCHIVE_PURCHASE_RETURN': {
            const { updatedPurchaseReturns, updatedInventory, updatedSuppliers, updatedJournal, chartOfAccounts, log } = action.payload;
            return {
                ...state,
                purchaseReturns: updatedPurchaseReturns,
                inventory: updatedInventory,
                suppliers: updatedSuppliers,
                journal: updatedJournal,
                chartOfAccounts,
                activityLog: [log, ...state.activityLog],
            };
        }
        
        case 'ADD_TREASURY_TRANSACTION': {
            const { newTransaction, updatedCustomers, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return {
                ...state,
                chartOfAccounts: updatedChartOfAccounts,
                journal: [journalEntry, ...state.journal],
                treasury: [newTransaction, ...state.treasury],
                customers: updatedCustomers || state.customers,
                suppliers: updatedSuppliers || state.suppliers,
                sequences: { 
                    ...state.sequences, 
                    treasury: state.sequences.treasury + 1,
                    journal: state.sequences.journal + 1,
                },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'UPDATE_TREASURY_TRANSACTION': {
            const { treasury, journal, chartOfAccounts, customers, suppliers, sequences, log } = action.payload;
             return {
                ...state,
                treasury,
                journal,
                chartOfAccounts,
                customers,
                suppliers,
                sequences,
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'APPLY_TREASURY_MIGRATION':
            return {
                ...state,
                treasury: action.payload.treasury,
                chartOfAccounts: action.payload.chartOfAccounts,
                customers: action.payload.customers,
                suppliers: action.payload.suppliers,
                activityLog: [action.payload.log, ...state.activityLog],
                notifications: [action.payload.notification, ...state.notifications].slice(0, 50),
            };

        case 'ADD_INVENTORY_ADJUSTMENT': {
            const { newAdjustment, updatedInventory, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return {
                ...state,
                chartOfAccounts: updatedChartOfAccounts,
                journal: [journalEntry, ...state.journal],
                inventoryAdjustments: [newAdjustment, ...state.inventoryAdjustments],
                inventory: updatedInventory,
                sequences: { 
                    ...state.sequences, 
                    inventoryAdjustment: state.sequences.inventoryAdjustment + 1,
                    journal: state.sequences.journal + 1,
                },
                activityLog: [log, ...state.activityLog],
            };
        }
        
        case 'UPDATE_INVENTORY_ADJUSTMENT': {
            const { updatedAdjustment, updatedInventory, journal, chartOfAccounts, log } = action.payload;
            return {
                ...state,
                inventoryAdjustments: state.inventoryAdjustments.map(adj => adj.id === updatedAdjustment.id ? updatedAdjustment : adj),
                inventory: updatedInventory,
                journal,
                chartOfAccounts,
                sequences: { ...state.sequences, journal: state.sequences.journal + 1 },
                activityLog: [log, ...state.activityLog],
            };
        }

        case 'ARCHIVE_INVENTORY_ADJUSTMENT': {
            const { updatedAdjustments, updatedInventory, log, updatedJournal, chartOfAccounts } = action.payload;
            return {
                ...state,
                inventoryAdjustments: updatedAdjustments,
                inventory: updatedInventory,
                journal: updatedJournal,
                chartOfAccounts,
                activityLog: [log, ...state.activityLog],
            };
        }
        
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
        case 'UNARCHIVE_ITEM': {
            return { ...state, ...action.payload };
        }
        
        default:
            return state;
    }
}


interface DataContextType {
    // Raw state from reducer
    companyInfo: CompanyInfo;
    printSettings: PrintSettings;
    financialYear: FinancialYear;
    generalSettings: GeneralSettings;
    chartOfAccounts: AccountNode[];
    sequences: typeof seedData.sequencesData & { saleReturnStockFixApplied_v2?: boolean };
    unitDefinitions: UnitDefinition[];
    activityLog: ActivityLogEntry[];
    notifications: Notification[];
    
    // Core state for authentication and data loading
    currentUser: User | null;
    isDataLoaded: boolean;
    hasData: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    dataManager: { datasets: { key: string; name: string }[]; activeDatasetKey: string | null; };
    scannedItem: { item: InventoryItem; timestamp: number } | null;
    
    // Active (non-archived) data collections
    customers: Customer[];
    suppliers: Supplier[];
    users: User[];
    inventory: InventoryItem[];
    journal: JournalEntry[];
    sales: Sale[];
    priceQuotes: PriceQuote[];
    purchases: Purchase[];
    purchaseQuotes: PurchaseQuote[];
    saleReturns: SaleReturn[];
    purchaseReturns: PurchaseReturn[];
    treasury: TreasuryTransaction[];
    inventoryAdjustments: InventoryAdjustment[];

    // Archived data collections
    archivedCustomers: Customer[];
    archivedSuppliers: Supplier[];
    archivedUsers: User[];
    archivedInventory: InventoryItem[];
    archivedJournal: JournalEntry[];
    archivedSales: Sale[];
    archivedPurchases: Purchase[];
    archivedSaleReturns: SaleReturn[];
    archivedPurchaseReturns: PurchaseReturn[];
    archivedTreasury: TreasuryTransaction[];
    archivedInventoryAdjustments: InventoryAdjustment[];

    // "All" data collections (active + archived)
    allCustomers: Customer[];
    allSuppliers: Supplier[];
    allUsers: User[];
    allInventory: InventoryItem[];
    allJournal: JournalEntry[];
    allSales: Sale[];
    allPurchases: Purchase[];
    allSaleReturns: SaleReturn[];
    allPurchaseReturns: PurchaseReturn[];
    allTreasury: TreasuryTransaction[];
    allInventoryAdjustments: InventoryAdjustment[];
    
    // Derived Data
    totalReceivables: number;
    totalPayables: number;
    inventoryValue: number;
    totalCashBalance: number;
    recentTransactions: RecentTransaction[];
    topCustomers: any[];
    treasuriesList: any[];
    
    // Functions
    login: (username: string, password: string) => boolean;
    logout: () => void;
    showToast: (message: string, type?: 'success' | 'error') => void;
    toast: { show: boolean; message: string; type: 'success' | 'error' };

    createNewDataset: (companyName: string) => void;
    switchDataset: (key: string) => void;
    renameDataset: (key: string, newName: string) => void;
    importData: (importedState: any) => void;
    resetTransactionalData: () => void;
    forceBalanceRecalculation: () => void;
    
    processBarcodeScan: (barcode: string) => void;
    
    updateCompanyInfo: (info: CompanyInfo) => void;
    updatePrintSettings: (settings: PrintSettings) => void;
    updateFinancialYear: (year: FinancialYear) => void;
    updateGeneralSettings: (settings: GeneralSettings) => void;
    
    markNotificationAsRead: (id: string) => void;
    markAllNotificationsAsRead: () => void;

    addAccount: (accountData: { name: string; code: string; parentId: string | null }) => AccountNode;
    updateAccount: (accountData: { id: string; name: string; code: string; parentId: string | null }) => void;
    archiveAccount: (id: string) => { success: boolean; message: string };
    updateAllOpeningBalances: (updates: any) => void;
    
    addUnitDefinition: (name: string) => UnitDefinition;

    addJournalEntry: (entryData: Omit<JournalEntry, 'id'>) => JournalEntry;
    updateJournalEntry: (entryData: Omit<JournalEntry, 'debit' | 'credit'>) => void;
    archiveJournalEntry: (id: string) => void;
    unarchiveJournalEntry: (id: string) => void;
    
    addSale: (saleData: Omit<Sale, 'id' | 'journalEntryId'>) => Sale;
    updateSale: (saleData: Sale) => Sale;
    archiveSale: (id: string) => { success: boolean, message: string };
    unarchiveSale: (id: string) => void;
    
    addPriceQuote: (quoteData: Omit<PriceQuote, 'id' | 'status'>) => PriceQuote;
    updatePriceQuote: (quoteData: PriceQuote) => void;
    cancelPriceQuote: (quoteId: string) => void;
    convertQuoteToSale: (quoteId: string) => void;

    addPurchase: (purchaseData: Omit<Purchase, 'id' | 'journalEntryId'>) => Purchase;
    updatePurchase: (purchaseData: Purchase) => Purchase;
    archivePurchase: (id: string) => { success: boolean, message: string };
    unarchivePurchase: (id: string) => void;
    
    addPurchaseQuote: (quoteData: Omit<PurchaseQuote, 'id' | 'status'>) => PurchaseQuote;
    updatePurchaseQuote: (quoteData: PurchaseQuote) => void;
    cancelPurchaseQuote: (quoteId: string) => void;
    convertQuoteToPurchase: (quoteId: string) => void;

    addSaleReturn: (returnData: Omit<SaleReturn, 'id' | 'journalEntryId'>) => SaleReturn;
    deleteSaleReturn: (returnId: string) => { success: boolean, message: string };
    unarchiveSaleReturn: (id: string) => void;

    addPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'>) => PurchaseReturn;
    deletePurchaseReturn: (returnId: string) => { success: boolean, message: string };
    unarchivePurchaseReturn: (id: string) => void;

    addTreasuryTransaction: (transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>) => TreasuryTransaction;
    updateTreasuryTransaction: (id: string, transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId' | 'treasuryAccountName'>) => void;
    transferTreasuryFunds: (fromTreasuryId: string, toTreasuryId: string, amount: number, notes: string) => void;

    addInventoryAdjustment: (adjustmentData: Omit<InventoryAdjustment, 'id' | 'journalEntryId'>) => InventoryAdjustment;
    updateInventoryAdjustment: (adjustmentData: InventoryAdjustment) => InventoryAdjustment;
    archiveInventoryAdjustment: (id: string) => { success: boolean, message: string };
    unarchiveInventoryAdjustment: (id: string) => void;

    addUser: (userData: Omit<User, 'id'>) => void;
    updateUser: (userData: User) => void;
    archiveUser: (id: string) => { success: boolean; message: string };
    unarchiveUser: (id: string) => void;

    addCustomer: (customerData: Omit<Customer, 'id'>) => Customer;
    updateCustomer: (customerData: Customer) => void;
    archiveCustomer: (id: string) => { success: boolean; message: string };
    unarchiveCustomer: (id: string) => void;

    addSupplier: (supplierData: Omit<Supplier, 'id'>) => Supplier;
    updateSupplier: (supplierData: Supplier) => void;
    archiveSupplier: (id: string) => { success: boolean; message: string };
    unarchiveSupplier: (id: string) => void;

    addItem: (itemData: Omit<InventoryItem, 'id'>) => InventoryItem;
    updateItem: (itemData: InventoryItem) => void;
    archiveItem: (id: string) => { success: boolean; message: string };
    unarchiveItem: (id: string) => void;
    generateAndAssignBarcodesForMissing: () => void;
}

export const DataContext = createContext<DataContextType>(null!);

// FIX: Make children optional to fix TypeScript error, as the JSX transform seems to have issues.
export const DataProvider = ({ children }: { children?: React.ReactNode }) => {
    const [state, dispatch] = useReducer(dataReducer, initialState);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' as 'success' | 'error' });
    
    const [scannedItem, setScannedItem] = useState<{ item: InventoryItem; timestamp: number } | null>(null);

    const [dataManager, setDataManager] = useState({
        datasets: [] as { key: string; name: string }[],
        activeDatasetKey: null as string | null,
    });

    useEffect(() => {
        const loadManager = async () => {
            const datasets = await get<{ key: string; name: string }[]>('datasets') || [];
            const activeKey = await get<string>('activeDatasetKey');
            
            if (activeKey && datasets.some(ds => ds.key === activeKey)) {
                setDataManager({ datasets, activeDatasetKey: activeKey });
            } else if (datasets.length > 0) {
                const firstKey = datasets[0].key;
                await set('activeDatasetKey', firstKey);
                setDataManager({ datasets, activeDatasetKey: firstKey });
            } else {
                setIsDataLoaded(true);
            }
        };
        loadManager();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!dataManager.activeDatasetKey) return;
            
            let savedData = await get<AppState>(dataManager.activeDatasetKey);
            if (savedData) {
                if (savedData.chartOfAccounts) {
                    savedData.chartOfAccounts = migrateChartOfAccounts(savedData.chartOfAccounts);
                }

                // ONE-TIME MIGRATION FOR OLD SALE RETURNS
                // @ts-ignore
                if (!savedData.sequences.saleReturnStockFixApplied_v2) {
                    let inventoryNeedsUpdate = false;
                    const updatedInventory = JSON.parse(JSON.stringify(savedData.inventory));
    
                    savedData.saleReturns = savedData.saleReturns.map(sr => {
                        if (sr.stockCorrectionApplied) {
                            return sr;
                        }
    
                        if (sr.id === 'SRET-001') {
                            console.log(`MIGRATION: Flagging SRET-001 as corrected without changing stock.`);
                            return { ...sr, stockCorrectionApplied: true };
                        }
    
                        inventoryNeedsUpdate = true;
                        console.log(`MIGRATION: Applying stock correction for old Sale Return: ${sr.id}`);
                        
                        sr.items.forEach(lineItem => {
                            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
                            if (item) {
                                let quantityInBaseUnit = lineItem.quantity;
                                const itemDetails = savedData.inventory.find((i: InventoryItem) => i.id === lineItem.itemId);
                                if (itemDetails && lineItem.unitId !== 'base') {
                                    const packingUnit = itemDetails.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                                    if (packingUnit) {
                                        quantityInBaseUnit *= packingUnit.factor;
                                    }
                                }
                                item.stock += quantityInBaseUnit;
                            }
                        });
                        return { ...sr, stockCorrectionApplied: true };
                    });
    
                    if (inventoryNeedsUpdate) {
                        savedData.inventory = updatedInventory;
                    }

                    // @ts-ignore
                    savedData.sequences.saleReturnStockFixApplied_v2 = true; 
                    console.log('Sale return stock migration logic finished.');
                }
                
                dispatch({ type: 'SET_STATE', payload: savedData });
                setHasData(true);
            } else {
                 setHasData(false);
            }
            setIsDataLoaded(true);
        };

        setIsDataLoaded(false);
        loadData();
    }, [dataManager.activeDatasetKey]);

    const debouncedSave = useCallback(debounce((dataToSave, key) => {
        if (!key) return;
        setSaveStatus('saving');
        set(key, dataToSave)
            .then(() => setSaveStatus('saved'))
            .catch(err => {
                console.error('Save failed:', err);
                setSaveStatus('error');
            });
    }, 1500), []);

    useEffect(() => {
        if (isDataLoaded && hasData && dataManager.activeDatasetKey) {
            debouncedSave(state, dataManager.activeDatasetKey);
        }
    }, [state, isDataLoaded, hasData, dataManager.activeDatasetKey, debouncedSave]);
    
    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    const addLogAndNotification = useCallback((action: string, details: string, type: Notification['type'] = 'info', link?: string) => {
        if (!currentUser) return;
        
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.name,
            action,
            details,
        };
        
        const notification = {
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: `${action}: ${details}`,
            type,
            link,
            read: false,
        };
        
        dispatch({ type: 'ADD_LOG_AND_NOTIFICATION', payload: { log, notification } });
    }, [currentUser]);

    const login = (username: string, password: string): boolean => {
        const user = state.users.find(u => u.username === username && u.password === password && !u.isArchived);
        if (user) {
            setCurrentUser(user);
            addLogAndNotification('تسجيل الدخول', `المستخدم ${user.name} قام بتسجيل الدخول.`);
            return true;
        }
        return false;
    };
    
    const logout = () => {
        if (currentUser) {
            addLogAndNotification('تسجيل الخروج', `المستخدم ${currentUser.name} قام بتسجيل الخروج.`);
        }
        setCurrentUser(null);
    };

    const processBarcodeScan = useCallback((barcode: string) => {
        const item = state.inventory.find(i => i.barcode === barcode && !i.isArchived);
        if (item) {
            setScannedItem({ item, timestamp: Date.now() });
            showToast(`تم العثور على الصنف: ${item.name}`, 'success');
        } else {
            showToast(`لم يتم العثور على صنف بالباركود: ${barcode}`, 'error');
        }
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
        Object.keys(sessionStorage).forEach(sessionKey => {
            if (sessionKey.startsWith('loggedInUser_')) {
                sessionStorage.removeItem(sessionKey);
            }
        });
        setCurrentUser(null);
        setDataManager(prev => ({ ...prev, activeDatasetKey: key }));
    }, []);

    const renameDataset = useCallback(async (key: string, newName: string) => {
        const currentDatasets = await get<{ key: string; name: string }[]>('datasets') || [];
        const updatedDatasets = currentDatasets.map(ds => ds.key === key ? { ...ds, name: newName } : ds);
        await set('datasets', updatedDatasets);

        const datasetData = await get<AppState>(key);
        if (datasetData) {
            datasetData.companyInfo.name = newName;
            await set(key, datasetData);
        }

        setDataManager(prev => ({ ...prev, datasets: updatedDatasets }));
        if (dataManager.activeDatasetKey === key) {
            dispatch({ type: 'UPDATE_COMPANY_INFO', payload: { ...state.companyInfo, name: newName }});
        }
        addLogAndNotification('إدارة البيانات', `تمت إعادة تسمية الشركة إلى "${newName}".`);
        showToast('تمت إعادة تسمية الشركة بنجاح.');
    }, [addLogAndNotification, dataManager.activeDatasetKey, showToast, state.companyInfo]);
    
    const importData = async (importedState: any) => {
        if (typeof importedState.sequences?.sale !== 'number') {
            showToast('ملف استيراد غير صالح.', 'error');
            return;
        }

        if (!dataManager.activeDatasetKey) {
            showToast('لا يمكن الاستيراد. لا توجد قاعدة بيانات نشطة.', 'error');
            return;
        }

        try {
            await set(dataManager.activeDatasetKey, importedState);
            dispatch({ type: 'SET_STATE', payload: importedState });
            
            addLogAndNotification('استيراد بيانات', 'تم استيراد نسخة احتياطية جديدة بنجاح.');
            showToast('تم استيراد البيانات بنجاح. سيتم إعادة تحميل الصفحة.');
            
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (error) {
            console.error("Failed to import and save data:", error);
            showToast('حدث خطأ أثناء استيراد وحفظ البيانات.', 'error');
        }
    };

    const resetTransactionalData = useCallback(() => {
        const resetState = {
            journal: [],
            sales: [],
            purchases: [],
            saleReturns: [],
            purchaseReturns: [],
            inventoryAdjustments: [],
            treasury: [],
            activityLog: [],
            notifications: [],
            sequences: {
                ...state.sequences,
                sale: 1, purchase: 1, saleReturn: 1, purchaseReturn: 1,
                journal: 1, treasury: 1, inventoryAdjustment: 1,
            },
            inventory: state.inventory.map((item: InventoryItem) => ({ ...item, stock: 0 })),
            customers: state.customers.map((c: Customer) => ({ ...c, balance: 0 })),
            suppliers: state.suppliers.map((s: Supplier) => ({ ...s, balance: 0 })),
        };
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'إعادة ضبط البيانات', details: 'تم حذف جميع الحركات المالية والمخزنية.'
        };

        dispatch({ type: 'RESET_TRANSACTIONAL_DATA', payload: { ...resetState, log } });
        
        setTimeout(forceBalanceRecalculation, 100);

        showToast('تمت إعادة ضبط جميع البيانات الحركية بنجاح.', 'success');
    }, [state.sequences, state.inventory, state.customers, state.suppliers, currentUser]);

    const forceBalanceRecalculation = useCallback(() => {
        const newCustomers = JSON.parse(JSON.stringify(state.allCustomers));
        const newSuppliers = JSON.parse(JSON.stringify(state.allSuppliers));
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
    
        // 1. Reset balances
        newCustomers.forEach((c: Customer) => c.balance = 0);
        newSuppliers.forEach((s: Supplier) => s.balance = 0);
        const resetAccountBalances = (nodes: AccountNode[]) => { nodes.forEach(node => { node.balance = 0; if (node.children) resetAccountBalances(node.children); }); };
        resetAccountBalances(newChart);
    
        // 2. Re-apply all journal entries to chart of accounts
        const sortedJournal = [...state.allJournal].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        sortedJournal.forEach(entry => {
            if (!entry.isArchived) {
                entry.lines.forEach(line => {
                    updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit);
                });
            }
        });
    
        // 3. Re-apply all specific transactions to customers/suppliers
        const allTransactions = [
            ...state.allSales, ...state.allPurchases, ...state.allSaleReturns, ...state.allPurchaseReturns,
            ...state.allTreasury.filter(t => t.partyType === 'customer' || t.partyType === 'supplier')
        ].sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
        allTransactions.forEach(tx => {
            if (tx.isArchived) return;
    
            if ('customer' in tx) { // Sale or SaleReturn
                const customer = newCustomers.find((c: Customer) => c.name === tx.customer);
                if (customer) {
                    if ('originalSaleId' in tx) { // It's a SaleReturn
                        customer.balance -= tx.total;
                    } else { // It's a Sale
                        customer.balance += (tx.total - (tx.paidAmount || 0));
                    }
                }
            } else if ('supplier' in tx) { // Purchase or PurchaseReturn
                const supplier = newSuppliers.find((s: Supplier) => s.name === tx.supplier);
                if (supplier) {
                    if ('originalPurchaseId' in tx) { // It's a PurchaseReturn
                        supplier.balance -= tx.total;
                    } else { // It's a Purchase
                        supplier.balance += (tx.total - (tx.paidAmount || 0));
                    }
                }
            } else if ('partyType' in tx) { // TreasuryTransaction
                const amount = Math.abs(tx.amount);
                if (tx.partyType === 'customer') {
                    const customer = newCustomers.find((c: Customer) => c.id === tx.partyId);
                    if (customer) {
                        if (tx.type === 'سند قبض') customer.balance -= amount; // Payment from customer
                        else customer.balance += amount; // Refund to customer
                    }
                } else if (tx.partyType === 'supplier') {
                    const supplier = newSuppliers.find((s: Supplier) => s.id === tx.partyId);
                    if (supplier) {
                        if (tx.type === 'سند صرف') supplier.balance -= amount; // Payment to supplier
                        else supplier.balance += amount; // Refund from supplier
                    }
                }
            }
        });
        
        // 4. Re-apply Journal Entries linked to Customer/Supplier via relatedPartyId (Debit/Credit Notes)
        sortedJournal.forEach(entry => {
            if (!entry.isArchived && entry.relatedPartyId) {
                if (entry.relatedPartyType === 'customer') {
                    const customer = newCustomers.find((c: Customer) => c.id === entry.relatedPartyId);
                    if (customer) {
                        const partyAccountLines = entry.lines.filter(l => l.accountId === '1103' || l.accountName.includes(customer.name)); 
                        // Simplified logic: The net impact of the journal on a party is usually debit - credit for asset accounts (Customers),
                        // and credit - debit for liability accounts (Suppliers).
                        // Since '1103' is an Asset account:
                        // Debit increases balance (they owe more). Credit decreases balance (they owe less).
                        // BUT we need to be precise. 
                        
                        // We will rely on the *account type* logic. 
                        // However, since we don't have account type easily accessible here without traversal, 
                        // we'll assume the journal entry lines target the main control account.
                        const mainControlAccount = findNodeRecursive(newChart, 'code', '1103');
                        if (mainControlAccount) {
                             const relevantLines = entry.lines.filter(l => l.accountId === mainControlAccount.id);
                             relevantLines.forEach(l => {
                                 customer.balance += (l.debit - l.credit);
                             });
                        }
                    }
                } else if (entry.relatedPartyType === 'supplier') {
                    const supplier = newSuppliers.find((s: Supplier) => s.id === entry.relatedPartyId);
                    if (supplier) {
                        const mainControlAccount = findNodeRecursive(newChart, 'code', '2101'); // Suppliers (Liability)
                        if (mainControlAccount) {
                             const relevantLines = entry.lines.filter(l => l.accountId === mainControlAccount.id);
                             relevantLines.forEach(l => {
                                 // Liability: Credit increases balance (we owe more), Debit decreases balance (we owe less).
                                 supplier.balance += (l.credit - l.debit);
                             });
                        }
                    }
                }
            }
        });
        
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إعادة حساب الأرصدة', details: 'تمت إعادة حساب جميع الأرصدة في النظام.' };
        dispatch({ type: 'FORCE_BALANCE_RECALCULATION', payload: { customers: newCustomers, suppliers: newSuppliers, chartOfAccounts: newChart, log } });
        showToast("تمت إعادة حساب جميع الأرصدة بنجاح.", "success");
    }, [state, currentUser, showToast]);

    const updateCompanyInfo = (info: CompanyInfo) => {
        dispatch({ type: 'UPDATE_COMPANY_INFO', payload: info });
        addLogAndNotification('تحديث الإعدادات', `تم تحديث معلومات الشركة إلى "${info.name}".`);
    };
    const updatePrintSettings = (settings: PrintSettings) => {
        dispatch({ type: 'UPDATE_PRINT_SETTINGS', payload: settings });
        addLogAndNotification('تحديث الإعدادات', 'تم تحديث إعدادات الطباعة.');
    };
    const updateFinancialYear = (year: FinancialYear) => {
        dispatch({ type: 'UPDATE_FINANCIAL_YEAR', payload: year });
        addLogAndNotification('تحديث الإعدادات', `تم تحديث السنة المالية إلى ${year.startDate} - ${year.endDate}.`);
    };
    const updateGeneralSettings = (settings: GeneralSettings) => {
        dispatch({ type: 'UPDATE_GENERAL_SETTINGS', payload: settings });
        addLogAndNotification('تحديث الإعدادات', 'تم تحديث الإعدادات العامة.');
    };
    
    const markNotificationAsRead = (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    const markAllNotificationsAsRead = () => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
    
    const addAccount = useCallback((accountData: { name: string; code: string; parentId: string | null }): AccountNode => {
        const newAccount: AccountNode = {
            // FIX: Use the current sequence number for the new ID, as it will be incremented in the reducer.
            id: `acc-${state.sequences.account}`,
            name: accountData.name,
            code: accountData.code,
            balance: 0,
            children: [],
        };

        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'إضافة حساب', details: `تمت إضافة الحساب "${newAccount.name}" برمز ${newAccount.code}.`
        };

        dispatch({ type: 'ADD_ACCOUNT', payload: { newAccount, parentId: accountData.parentId, log } });
        
        showToast('تمت إضافة الحساب بنجاح.');
        return newAccount;

    }, [state.sequences.account, currentUser, showToast]);

    const updateAccount = useCallback((accountData: { id: string; name: string; code: string; parentId: string | null }) => {
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        
        let nodeToMove: AccountNode | null = null;
        
        const removeNode = (nodes: AccountNode[]): AccountNode[] => {
            return nodes.filter(node => {
                if (node.id === accountData.id) {
                    nodeToMove = node;
                    return false;
                }
                if (node.children) {
                    node.children = removeNode(node.children);
                }
                return true;
            });
        };
        
        let chartWithoutNode = removeNode(newChart);

        if (nodeToMove) {
            nodeToMove.name = accountData.name;
            nodeToMove.code = accountData.code;

            if (accountData.parentId) {
                const findAndAdd = (nodes: AccountNode[]): boolean => {
                    for (const node of nodes) {
                        if (node.id === accountData.parentId) {
                            if (!node.children) node.children = [];
                            node.children.push(nodeToMove!);
                            return true;
                        }
                        if (node.children && findAndAdd(node.children)) {
                            return true;
                        }
                    }
                    return false;
                };
                if (!findAndAdd(chartWithoutNode)) {
                     showToast('الحساب الرئيسي المحدد غير موجود.', 'error');
                     return;
                }
            } else {
                chartWithoutNode.push(nodeToMove);
            }
        }
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'تعديل حساب', details: `تم تعديل الحساب "${accountData.name}".`
        };
        
        dispatch({ type: 'UPDATE_CHART_OF_ACCOUNTS', payload: { chartOfAccounts: chartWithoutNode, log }});
        showToast('تم تعديل الحساب بنجاح.');
        
    }, [state.chartOfAccounts, currentUser, showToast]);
    
    const archiveAccount = (id: string) => { return {success: false, message: 'ميزة أرشفة الحسابات غير متاحة حاليًا.'} };

    const updateAllOpeningBalances = useCallback((updates: {
        accountUpdates: { accountId: string, balance: number }[],
        customerUpdates: { customerId: string, balance: number }[],
        supplierUpdates: { supplierId: string, balance: number }[],
    }) => {
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const newCustomers = JSON.parse(JSON.stringify(state.customers));
        const newSuppliers = JSON.parse(JSON.stringify(state.suppliers));
        let newJournal: JournalEntry[] = JSON.parse(JSON.stringify(state.journal));

        const openingBalanceEntryDescription = "قيد الأرصدة الافتتاحية";
        let openingEntry = newJournal.find(e => e.description === openingBalanceEntryDescription);

        const newLines: JournalLine[] = [];
        let totalDebit = 0;
        let totalCredit = 0;

        const resetBalances = (nodes: AccountNode[]) => {
            nodes.forEach(node => {
                node.balance = 0;
                if(node.children) resetBalances(node.children);
            });
        };
        resetBalances(newChart);
        newCustomers.forEach((c: Customer) => c.balance = 0);
        newSuppliers.forEach((s: Supplier) => s.balance = 0);

        if (openingEntry && openingEntry.lines) {
            openingEntry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, - (line.debit - line.credit));
            });
        }
        
        newJournal = newJournal.filter(e => e.description !== openingBalanceEntryDescription);

        updates.accountUpdates.forEach(({ accountId, balance }) => {
            const account = findNodeRecursive(newChart, 'id', accountId);
            if (account && balance !== 0) {
                newLines.push({ 
                    accountId, 
                    accountName: account.name, 
                    debit: balance > 0 ? balance : 0, 
                    credit: balance < 0 ? Math.abs(balance) : 0 
                });
            }
        });
        
        const customerAccount = findNodeRecursive(newChart, 'code', '1103');
        const supplierAccount = findNodeRecursive(newChart, 'code', '2101');
        
        if (!customerAccount || !supplierAccount) {
            showToast("خطأ: لم يتم العثور على حسابات العملاء أو الموردين الرئيسية.", "error");
            return;
        }

        updates.customerUpdates.forEach(({ customerId, balance }) => {
            const customer = newCustomers.find((c: Customer) => c.id === customerId);
            if (customer && balance !== 0) {
                newLines.push({ 
                    accountId: customerAccount.id, 
                    accountName: `${customerAccount.name} - ${customer.name}`, 
                    debit: balance, 
                    credit: 0
                });
            }
        });
        
        updates.supplierUpdates.forEach(({ supplierId, balance }) => {
            const supplier = newSuppliers.find((s: Supplier) => s.id === supplierId);
            if (supplier && balance !== 0) {
                newLines.push({ 
                    accountId: supplierAccount.id, 
                    accountName: `${supplierAccount.name} - ${supplier.name}`, 
                    debit: 0, 
                    credit: balance
                });
            }
        });

        newLines.forEach(line => {
            totalDebit += line.debit;
            totalCredit += line.credit;
        });

        const retainedEarningsAccount = findNodeRecursive(newChart, 'code', '3102');
        if (!retainedEarningsAccount) {
            showToast("خطأ: لم يتم العثور على حساب الأرباح المحتجزة.", "error");
            return;
        }

        const balanceDiff = totalDebit - totalCredit;
        if (balanceDiff !== 0) {
            newLines.push({
                accountId: retainedEarningsAccount.id,
                accountName: retainedEarningsAccount.name,
                debit: balanceDiff < 0 ? Math.abs(balanceDiff) : 0,
                credit: balanceDiff > 0 ? balanceDiff : 0,
            });
            totalDebit += (balanceDiff < 0 ? Math.abs(balanceDiff) : 0);
            totalCredit += (balanceDiff > 0 ? balanceDiff : 0);
        }

        if (newLines.length > 0) {
            const newOpeningEntry: JournalEntry = {
                id: `JE-${state.sequences.journal}`,
                date: state.financialYear.startDate,
                description: openingBalanceEntryDescription,
                debit: totalDebit,
                credit: totalCredit,
                status: 'مرحل',
                lines: newLines,
            };
            newJournal.unshift(newOpeningEntry);
        }

        const allEntries = [...newJournal, ...state.journal.filter(e => e.description !== openingBalanceEntryDescription)];
        
        allEntries.forEach(entry => {
            if(entry.isArchived) return;
            entry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit);
            });
        });
        
        newCustomers.forEach((c: Customer) => {
            const customerOpeningBalance = updates.customerUpdates.find(u => u.customerId === c.id)?.balance || 0;
            const salesTotal = state.sales.filter(s => s.customer === c.name && !s.isArchived).reduce((sum, s) => sum + s.total, 0);
            const returnsTotal = state.saleReturns.filter(sr => sr.customer === c.name && !sr.isArchived).reduce((sum, sr) => sum + sr.total, 0);
            const paymentsTotal = state.treasury.filter(t => t.partyId === c.id && t.type === 'سند قبض' && !t.isArchived).reduce((sum, t) => sum + t.amount, 0);
            c.balance = customerOpeningBalance + salesTotal - returnsTotal - paymentsTotal;
        });

        newSuppliers.forEach((s: Supplier) => {
            const supplierOpeningBalance = updates.supplierUpdates.find(u => u.supplierId === s.id)?.balance || 0;
            const purchasesTotal = state.purchases.filter(p => p.supplier === s.name && !p.isArchived).reduce((sum, p) => sum + p.total, 0);
            const returnsTotal = state.purchaseReturns.filter(pr => pr.supplier === s.name && !pr.isArchived).reduce((sum, pr) => sum + pr.total, 0);
            const paymentsTotal = state.treasury.filter(t => t.partyId === s.id && t.type === 'سند صرف' && !t.isArchived).reduce((sum, t) => sum + Math.abs(t.amount), 0);
            s.balance = supplierOpeningBalance + purchasesTotal - returnsTotal - paymentsTotal;
        });
        
        // Re-calculate balances for manual journal entries linked to parties
        allEntries.forEach(entry => {
            if(!entry.isArchived && entry.relatedPartyId) {
                if (entry.relatedPartyType === 'customer') {
                    const customer = newCustomers.find((c: Customer) => c.id === entry.relatedPartyId);
                    const controlAccount = findNodeRecursive(newChart, 'code', '1103');
                    if (customer && controlAccount) {
                        const lines = entry.lines.filter(l => l.accountId === controlAccount.id);
                        lines.forEach(l => customer.balance += (l.debit - l.credit));
                    }
                } else if (entry.relatedPartyType === 'supplier') {
                    const supplier = newSuppliers.find((s: Supplier) => s.id === entry.relatedPartyId);
                    const controlAccount = findNodeRecursive(newChart, 'code', '2101');
                    if (supplier && controlAccount) {
                        const lines = entry.lines.filter(l => l.accountId === controlAccount.id);
                        lines.forEach(l => supplier.balance += (l.credit - l.debit));
                    }
                }
            }
        });

        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'تحديث الأرصدة الافتتاحية', details: 'تم تعديل الأرصدة الافتتاحية للنظام.'
        };

        dispatch({
            type: 'UPDATE_OPENING_BALANCES',
            payload: {
                customers: newCustomers,
                suppliers: newSuppliers,
                chartOfAccounts: newChart,
                journal: newLines.length > 0 ? newJournal : state.journal,
                log,
            }
        });

        showToast("تم تحديث الأرصدة الافتتاحية بنجاح.", "success");
    }, [state, currentUser, showToast]);
    
    
    const createGenericFunctions = <T extends { id: string, isArchived?: boolean }>(
        collectionName: keyof AppState,
        collectionLabel: string,
        addType: string,
        updateType: string,
        archiveType: string,
        unarchiveType: string,
        sequenceKey: keyof typeof initialState.sequences
    ) => {
        const add = (data: Omit<T, 'id'>): T => {
            const newId = `${collectionLabel.toUpperCase()}${state.sequences[sequenceKey]}`;
            const newItem = { ...data, id: newId } as T;
            
            const log = {
                id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
                action: `إضافة ${collectionLabel}`, details: `تمت إضافة ${collectionLabel} جديد برقم ${newId}.`
            };
            
            const payload = {
                [collectionName]: [newItem, ...(state[collectionName] as T[])],
                sequences: { ...state.sequences, [sequenceKey]: state.sequences[sequenceKey] + 1 },
                log,
            };
            
            dispatch({ type: addType, payload });
            showToast(`تمت إضافة ${collectionLabel} بنجاح.`);
            return newItem;
        };

        const update = (data: T) => {
            const log = {
                id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
                action: `تعديل ${collectionLabel}`, details: `تم تعديل ${collectionLabel} رقم ${data.id}.`
            };
            const payload = {
                [collectionName]: (state[collectionName] as T[]).map(item => item.id === data.id ? data : item),
                log,
            };
            dispatch({ type: updateType, payload });
            showToast(`تم تعديل ${collectionLabel} بنجاح.`);
        };

        const archive = (id: string) => {
            // @ts-ignore
            const item = (state[collectionName] as T[]).find(i => i.id === id);
            // @ts-ignore
            if (item && item.balance !== 0 && item.balance !== undefined) {
                const message = `لا يمكن أرشفة ${collectionLabel} رصيده لا يساوي صفر.`;
                showToast(message, 'error');
                return { success: false, message };
            }

            const log = {
                id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
                action: `أرشفة ${collectionLabel}`, details: `تمت أرشفة ${collectionLabel} رقم ${id}.`
            };
            const payload = {
                [collectionName]: (state[collectionName] as T[]).map(item => item.id === id ? { ...item, isArchived: true } : item),
                log,
            };
            dispatch({ type: archiveType, payload });
            return { success: true, message: '' };
        };

        const unarchive = (id: string) => {
            const log = {
                id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
                action: `إلغاء أرشفة ${collectionLabel}`, details: `تمت استعادة ${collectionLabel} رقم ${id}.`
            };
            const payload = {
                [collectionName]: (state[collectionName] as T[]).map(item => item.id === id ? { ...item, isArchived: false } : item),
                log,
            };
            dispatch({ type: unarchiveType, payload });
            showToast(`تمت استعادة ${collectionLabel} بنجاح.`);
        };

        return { add, update, archive, unarchive };
    };
    
    const { add: addUser, update: updateUser, archive: archiveUser, unarchive: unarchiveUser } = createGenericFunctions<User>('users', 'مستخدم', 'ADD_USER', 'UPDATE_USER', 'ARCHIVE_USER', 'UNARCHIVE_USER', 'account');
    const { add: addCustomer, update: updateCustomer, archive: archiveCustomer, unarchive: unarchiveCustomer } = createGenericFunctions<Customer>('customers', 'عميل', 'ADD_CUSTOMER', 'UPDATE_CUSTOMER', 'ARCHIVE_CUSTOMER', 'UNARCHIVE_CUSTOMER', 'customer');
    const { add: addSupplier, update: updateSupplier, archive: archiveSupplier, unarchive: unarchiveSupplier } = createGenericFunctions<Supplier>('suppliers', 'مورد', 'ADD_SUPPLIER', 'UPDATE_SUPPLIER', 'ARCHIVE_SUPPLIER', 'UNARCHIVE_SUPPLIER', 'supplier');
    
    const addUnitDefinition = (name: string): UnitDefinition => {
        const newUnit = {
            id: `unit-${state.sequences.unit}`,
            name: name,
        };
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'إضافة وحدة قياس', details: `تمت إضافة وحدة "${name}".`
        };
        dispatch({ type: 'ADD_UNIT_DEFINITION', payload: { newUnit, log }});
        return newUnit;
    };

    const addItem = (itemData: Omit<InventoryItem, 'id'>): InventoryItem => {
        if(state.inventory.some(i => i.name === itemData.name && !i.isArchived)) {
            const errorMsg = 'يوجد صنف آخر بنفس الاسم.';
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }

        const newId = `ITM-${state.sequences.item}`;
        const barcode = itemData.barcode || String(state.sequences.barcode);
        
        if (state.inventory.some(i => i.barcode === barcode && !i.isArchived)) {
            const errorMsg = `الباركود ${barcode} مستخدم بالفعل.`;
            showToast(errorMsg, 'error');
            throw new Error(errorMsg);
        }

        const newItem = { ...itemData, id: newId, barcode };
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'إضافة صنف', details: `تمت إضافة الصنف "${newItem.name}" برقم ${newId}.`
        };
        
        const payload = {
            inventory: [newItem, ...state.inventory],
            sequences: { 
                ...state.sequences, 
                item: state.sequences.item + 1,
                packingUnit: state.sequences.packingUnit + (itemData.units?.length || 0),
                barcode: itemData.barcode ? state.sequences.barcode : state.sequences.barcode + 1,
            },
            log,
        };
        
        dispatch({ type: 'ADD_ITEM', payload });
        showToast('تمت إضافة الصنف بنجاح.');
        return newItem;
    };
    
    const updateItem = (itemData: InventoryItem) => {
         if(state.inventory.some(i => i.name === itemData.name && i.id !== itemData.id && !i.isArchived)) {
            showToast('يوجد صنف آخر بنفس الاسم.', 'error');
            return;
        }
        if (itemData.barcode && state.inventory.some(i => i.barcode === itemData.barcode && i.id !== itemData.id && !i.isArchived)) {
            showToast(`الباركود ${itemData.barcode} مستخدم بالفعل.`, 'error');
            return;
        }
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'تعديل صنف', details: `تم تعديل الصنف "${itemData.name}".`
        };
        const payload = {
            inventory: state.inventory.map(item => item.id === itemData.id ? itemData : item),
            log,
        };
        dispatch({ type: 'UPDATE_ITEM', payload });
        showToast('تم تعديل الصنف بنجاح.');
    };
    
    const archiveItem = (id: string) => {
        const item = state.inventory.find(i => i.id === id);
        if (item && item.stock !== 0) {
            const message = 'لا يمكن أرشفة صنف رصيده لا يساوي صفر.';
            showToast(message, 'error');
            return { success: false, message };
        }
        return createGenericFunctions<InventoryItem>('inventory', 'صنف', '', '', 'ARCHIVE_ITEM', '', 'item').archive(id);
    };
    
    const unarchiveItem = (id: string) => createGenericFunctions<InventoryItem>('inventory', 'صنف', '', '', '', 'UNARCHIVE_ITEM', 'item').unarchive(id);
    
    const generateAndAssignBarcodesForMissing = () => {
        let currentBarcodeSequence = state.sequences.barcode;
        const updatedInventory = state.inventory.map(item => {
            if (!item.barcode && !item.isArchived) {
                let newBarcode = String(currentBarcodeSequence);
                while (state.inventory.some(i => i.barcode === newBarcode)) {
                    currentBarcodeSequence++;
                    newBarcode = String(currentBarcodeSequence);
                }
                item.barcode = newBarcode;
                currentBarcodeSequence++;
            }
            return item;
        });
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'إنشاء باركود', details: 'تم إنشاء باركودات تلقائية للأصناف التي لا تملك باركود.'
        };

        const payload = {
            inventory: updatedInventory,
            sequences: { ...state.sequences, barcode: currentBarcodeSequence },
            log,
        };
        dispatch({ type: 'UPDATE_ITEM', payload });
        showToast('تم إنشاء وتعيين الباركودات بنجاح.', 'success');
    };
    
    const addJournalEntry = (entryData: Omit<JournalEntry, 'id'>): JournalEntry => {
        const newEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            ...entryData
        };

        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const updatedCustomers = [...state.customers];
        const updatedSuppliers = [...state.suppliers];

        if (newEntry.status === 'مرحل') {
            newEntry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit);
            });

            // Handle related party balance updates directly
            if (newEntry.relatedPartyId && newEntry.relatedPartyType) {
                if (newEntry.relatedPartyType === 'customer') {
                    const customer = updatedCustomers.find(c => c.id === newEntry.relatedPartyId);
                    const controlAccount = findNodeRecursive(newChart, 'code', '1103');
                    if (customer && controlAccount) {
                        const lines = newEntry.lines.filter(l => l.accountId === controlAccount.id);
                        lines.forEach(l => {
                            // Debit increases Asset (Customer owes us more)
                            // Credit decreases Asset (Customer pays/owes less)
                            customer.balance += (l.debit - l.credit);
                        });
                    }
                } else if (newEntry.relatedPartyType === 'supplier') {
                    const supplier = updatedSuppliers.find(s => s.id === newEntry.relatedPartyId);
                    const controlAccount = findNodeRecursive(newChart, 'code', '2101');
                    if (supplier && controlAccount) {
                        const lines = newEntry.lines.filter(l => l.accountId === controlAccount.id);
                        lines.forEach(l => {
                            // Credit increases Liability (We owe supplier more)
                            // Debit decreases Liability (We pay/owe less)
                            supplier.balance += (l.credit - l.debit);
                        });
                    }
                }
            }
        }
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'إضافة قيد يومية', details: `تمت إضافة قيد #${newEntry.id}.`
        };
        
        dispatch({ 
            type: 'ADD_JOURNAL_ENTRY', 
            payload: { newEntry, chartOfAccounts: newChart, log, updatedCustomers, updatedSuppliers }
        });
        showToast('تمت إضافة القيد بنجاح.');
        return newEntry;
    };
    
    const updateJournalEntry = (entryData: Omit<JournalEntry, 'debit' | 'credit'>) => {
        const originalEntry = state.journal.find(e => e.id === entryData.id);
        if (!originalEntry) {
            showToast('لم يتم العثور على القيد الأصلي.', 'error');
            return;
        }

        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));

        if (originalEntry.status === 'مرحل' && originalEntry.lines) {
            originalEntry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit));
            });
        }
        
        const newTotalDebit = (entryData.lines || []).reduce((sum, line) => sum + line.debit, 0);
        const newTotalCredit = (entryData.lines || []).reduce((sum, line) => sum + line.credit, 0);
        
        const updatedEntry = {
            ...entryData,
            debit: newTotalDebit,
            credit: newTotalCredit,
        };

        if (updatedEntry.status === 'مرحل' && updatedEntry.lines) {
            updatedEntry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit);
            });
        }
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'تعديل قيد يومية', details: `تم تعديل القيد #${entryData.id}.`
        };
        
        // NOTE: Updating manual JEs linked to parties requires force recalc to correct balances properly
        // For simplicity, we just update the chart here and trigger a toast warning if needed, 
        // or the user should run "Recalculate Balances".
        
        const updatedJournal = state.journal.map(e => e.id === entryData.id ? updatedEntry : e);
        dispatch({ type: 'UPDATE_CHART_OF_ACCOUNTS', payload: { chartOfAccounts: newChart, log }});
        dispatch({ type: 'SET_STATE', payload: { ...state, chartOfAccounts: newChart, journal: updatedJournal } });
        showToast('تم تعديل القيد بنجاح. قد تحتاج إلى "إعادة حساب الأرصدة" لتحديث أرصدة العملاء/الموردين.');
    };

    const archiveJournalEntry = (id: string) => {
        const entry = state.journal.find(e => e.id === id);
        if (!entry) return;

        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        if (entry.status === 'مرحل' && entry.lines) {
            entry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit));
            });
        }
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'أرشفة قيد يومية', details: `تمت أرشفة القيد #${id}.`
        };

        const updatedJournal = state.journal.map(e => e.id === id ? { ...e, isArchived: true } : e);
        dispatch({ type: 'ARCHIVE_JOURNAL_ENTRY', payload: { updatedJournal, chartOfAccounts: newChart, log }});
    };
    
    const unarchiveJournalEntry = (id: string) => {
         const entry = state.journal.find(e => e.id === id);
        if (!entry) return;

        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        if (entry.status === 'مرحل' && entry.lines) {
            entry.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit);
            });
        }
        
        const log = {
            id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name,
            action: 'استعادة قيد يومية', details: `تمت استعادة القيد #${id}.`
        };

        const updatedJournal = state.journal.map(e => e.id === id ? { ...e, isArchived: false } : e);
        dispatch({ type: 'UNARCHIVE_JOURNAL_ENTRY', payload: { updatedJournal, chartOfAccounts: newChart, log }});
    };
    
    const addSale = (saleData: Omit<Sale, 'id' | 'journalEntryId'>): Sale => {
        const newSale: Sale = {
            id: `INV-${String(state.sequences.sale).padStart(3, '0')}`,
            ...saleData,
        };
    
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        saleData.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if(item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) {
                        quantityInBaseUnit *= packingUnit.factor;
                    }
                }
                item.stock -= quantityInBaseUnit;
            }
        });
    
        const updatedCustomers = state.customers.map(c => {
            if (c.name === saleData.customer) {
                return { ...c, balance: c.balance + (saleData.total - (saleData.paidAmount || 0)) };
            }
            return c;
        });
    
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103');
        const salesAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const cogsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4204');
        const cashAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '110101');
    
        if (!customerAccount || !salesAccount || !inventoryAccount || !cogsAccount || !cashAccount) {
            showToast("خطأ: لم يتم العثور على الحسابات المحاسبية الأساسية.", "error");
            throw new Error("Missing critical accounts");
        }
    
        const cogsValue = saleData.items.reduce((sum, line) => {
            const item = state.inventory.find(i => i.id === line.itemId);
            if(!item) return sum;
            let quantityInBaseUnit = line.quantity;
            if(line.unitId !== 'base') {
                const packingUnit = item.units.find(u => u.id === line.unitId);
                if(packingUnit) quantityInBaseUnit *= packingUnit.factor;
            }
            return sum + (quantityInBaseUnit * item.purchasePrice);
        }, 0);
    
        const journalLines: JournalLine[] = [
            { accountId: customerAccount.id, accountName: customerAccount.name, debit: saleData.total, credit: 0 },
            { accountId: salesAccount.id, accountName: salesAccount.name, debit: 0, credit: saleData.total },
            { accountId: cogsAccount.id, accountName: cogsAccount.name, debit: cogsValue, credit: 0 },
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: 0, credit: cogsValue },
        ];
        
        if (saleData.paidAmount && saleData.paidAmount > 0) {
            journalLines.push({ accountId: cashAccount.id, accountName: cashAccount.name, debit: saleData.paidAmount, credit: 0 });
            journalLines.push({ accountId: customerAccount.id, accountName: customerAccount.name, debit: 0, credit: saleData.paidAmount });
        }
    
        const journalEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            date: newSale.date,
            description: `فاتورة مبيعات رقم ${newSale.id}`,
            debit: journalLines.reduce((s, l) => s + l.debit, 0),
            credit: journalLines.reduce((s, l) => s + l.credit, 0),
            status: 'مرحل',
            lines: journalLines,
        };
        newSale.journalEntryId = journalEntry.id;
    
        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });
    
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة فاتورة مبيعات',
            details: `تمت إضافة فاتورة #${newSale.id} للعميل ${newSale.customer}.`
        };
    
        const lowStockItems = updatedInventory.filter((i: InventoryItem) => i.stock <= 10 && i.stock > 0);
        const notification = lowStockItems.length > 0 ? {
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: `تنبيه: ${lowStockItems.map(i => i.name).join(', ')} على وشك النفاد.`,
            type: 'warning' as 'warning',
            link: '/inventory',
            read: false,
        } : null;
    
        dispatch({ type: 'ADD_SALE', payload: { newSale, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log, notification } });
    
        return newSale;
    };
    const updateSale = (saleData: Sale): Sale => {
        const originalSale = state.sales.find(s => s.id === saleData.id);
        if (!originalSale) {
            showToast('لم يتم العثور على الفاتورة الأصلية للتعديل.', 'error');
            throw new Error('Original sale not found');
        }

        archiveJournalEntry(originalSale.journalEntryId!);

        let updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        let updatedCustomers = JSON.parse(JSON.stringify(state.customers));
        let updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));

        originalSale.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock += quantityInBaseUnit;
            }
        });

        updatedCustomers = updatedCustomers.map((c: Customer) => {
            if (c.name === originalSale.customer) {
                return { ...c, balance: c.balance - (originalSale.total - (originalSale.paidAmount || 0)) };
            }
            return c;
        });

        saleData.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock -= quantityInBaseUnit;
            }
        });

        updatedCustomers = updatedCustomers.map((c: Customer) => {
            if (c.name === saleData.customer) {
                return { ...c, balance: c.balance + (saleData.total - (saleData.paidAmount || 0)) };
            }
            return c;
        });
        
        const newJournalEntry = addJournalEntry({
            date: saleData.date,
            description: `تعديل فاتورة مبيعات رقم ${saleData.id}`,
            debit: 0, 
            credit: 0, 
            status: 'مرحل',
            lines: [] 
        });
        const customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103');
        const salesAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4101');
        const updatedJournal = state.journal.filter(j => j.id !== originalSale.journalEntryId);
        
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'تعديل فاتورة مبيعات',
            details: `تم تعديل فاتورة #${saleData.id}.`
        };

        dispatch({ type: 'UPDATE_SALE', payload: { updatedSale: saleData, updatedInventory, updatedCustomers, journal: updatedJournal, chartOfAccounts: updatedChartOfAccounts, log, notification: null } });
        
        showToast('تم تعديل الفاتورة بنجاح.');
        return saleData;
    };
    const archiveSale = (id: string): { success: boolean, message: string } => {
        const sale = state.sales.find(s => s.id === id);
        if (!sale) return { success: false, message: 'الفاتورة غير موجودة.' };

        // 1. Restore Inventory
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        sale.items.forEach(lineItem => {
            const item = updatedInventory.find((i: any) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: any) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock += quantityInBaseUnit;
            }
        });

        // 2. Update Customer Balance (Decrease balance by invoice value, effectively cancelling debt)
        const updatedCustomers = state.customers.map(c => {
            if (c.name === sale.customer) {
                return { ...c, balance: c.balance - (sale.total - (sale.paidAmount || 0)) };
            }
            return c;
        });

        // 3. Archive Journal Entry & Reverse GL Impact
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (sale.journalEntryId) {
            const entry = updatedJournal.find(j => j.id === sale.journalEntryId);
            if (entry) {
                entry.isArchived = true;
                if (entry.status === 'مرحل') {
                    entry.lines.forEach(line => {
                        updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit));
                    });
                }
            }
        }

        // 4. Update Sales Array
        const updatedSales = state.sales.map(s => s.id === id ? { ...s, isArchived: true } : s);

        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'أرشفة فاتورة مبيعات',
            details: `تمت أرشفة فاتورة مبيعات رقم #${id}.`
        };

        dispatch({
            type: 'ARCHIVE_SALE',
            payload: { updatedSales, updatedInventory, updatedCustomers, log, updatedJournal, chartOfAccounts: newChart }
        });

        return { success: true, message: 'تمت أرشفة الفاتورة بنجاح.' };
    };
    const unarchiveSale = (id: string): void => {};
    
    const addPriceQuote = (quoteData: Omit<PriceQuote, 'id' | 'status'>): PriceQuote => {
        const newQuote: PriceQuote = {
            id: `QT-${String(state.sequences.priceQuote).padStart(3, '0')}`,
            status: 'جديد',
            ...quoteData,
        };
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة بيان أسعار',
            details: `تمت إضافة بيان أسعار #${newQuote.id}.`
        };
        dispatch({ type: 'ADD_PRICE_QUOTE', payload: { newQuote, log } });
        return newQuote;
    };
    const updatePriceQuote = (quoteData: PriceQuote) => {
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'تعديل بيان أسعار',
            details: `تم تعديل بيان أسعار رقم ${quoteData.id}.`
        };
        const payload = {
            priceQuotes: state.priceQuotes.map(q => q.id === quoteData.id ? quoteData : q),
            log,
        };
        dispatch({ type: 'UPDATE_PRICE_QUOTE', payload });
    };
    const cancelPriceQuote = (quoteId: string): void => {
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إلغاء بيان أسعار',
            details: `تم إلغاء بيان أسعار #${quoteId}.`
        };
        dispatch({ type: 'CANCEL_PRICE_QUOTE', payload: { quoteId, log } });
    };
    const convertQuoteToSale = (quoteId: string) => {
        const quote = state.priceQuotes.find(q => q.id === quoteId);
        if (!quote) {
            showToast('لم يتم العثور على بيان الأسعار.', 'error');
            return;
        }

        // --- STOCK CHECK ---
        if (!state.generalSettings.allowNegativeStock) {
            const insufficientStockItems: string[] = [];
            for (const lineItem of quote.items) {
                const inventoryItem = state.inventory.find((i: InventoryItem) => i.id === lineItem.itemId);
                if (!inventoryItem) {
                    showToast(`الصنف "${lineItem.itemName}" غير موجود في المخزون.`, 'error');
                    return;
                }

                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) {
                        quantityInBaseUnit *= packingUnit.factor;
                    }
                }
                
                if (inventoryItem.stock < quantityInBaseUnit) {
                    insufficientStockItems.push(`${lineItem.itemName} (المطلوب: ${quantityInBaseUnit}, المتاح: ${inventoryItem.stock})`);
                }
            }
            
            if (insufficientStockItems.length > 0) {
                const errorMessage = `لا يمكن التحويل لنقص المخزون: ${insufficientStockItems.join(', ')}`;
                showToast(errorMessage, 'error');
                return;
            }
        }
        // --- END STOCK CHECK ---

        const updatedQuote = { ...quote, status: 'تم تحويله' as const };
        
        const newSale: Sale = {
            id: `INV-${String(state.sequences.sale).padStart(3, '0')}`,
            customer: quote.customer,
            date: new Date().toISOString().slice(0, 10),
            items: quote.items,
            subtotal: quote.subtotal,
            totalDiscount: quote.totalDiscount,
            total: quote.total,
            status: 'مستحقة',
            paidAmount: 0,
        };

        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        newSale.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if(item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) {
                        quantityInBaseUnit *= packingUnit.factor;
                    }
                }
                item.stock -= quantityInBaseUnit;
            }
        });

        const updatedCustomers = state.customers.map(c => {
            if (c.name === newSale.customer) {
                return { ...c, balance: c.balance + (newSale.total - (newSale.paidAmount || 0)) };
            }
            return c;
        });

        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103');
        const salesAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const cogsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4204');
        
        if (!customerAccount || !salesAccount || !inventoryAccount || !cogsAccount) {
            showToast("خطأ: لم يتم العثور على الحسابات المحاسبية الأساسية.", "error");
            throw new Error("Missing critical accounts");
        }
    
        const cogsValue = newSale.items.reduce((sum, line) => {
            const item = state.inventory.find(i => i.id === line.itemId);
            if(!item) return sum;
            let quantityInBaseUnit = line.quantity;
            if(line.unitId !== 'base') {
                const packingUnit = item.units.find(u => u.id === line.unitId);
                if(packingUnit) quantityInBaseUnit *= packingUnit.factor;
            }
            return sum + (quantityInBaseUnit * item.purchasePrice);
        }, 0);
    
        const journalLines: JournalLine[] = [
            { accountId: customerAccount.id, accountName: customerAccount.name, debit: newSale.total, credit: 0 },
            { accountId: salesAccount.id, accountName: salesAccount.name, debit: 0, credit: newSale.total },
            { accountId: cogsAccount.id, accountName: cogsAccount.name, debit: cogsValue, credit: 0 },
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: 0, credit: cogsValue },
        ];
        
        const journalEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            date: newSale.date,
            description: `فاتورة مبيعات رقم ${newSale.id} (من بيان أسعار ${quote.id})`,
            debit: journalLines.reduce((s, l) => s + l.debit, 0),
            credit: journalLines.reduce((s, l) => s + l.credit, 0),
            status: 'مرحل',
            lines: journalLines,
        };
        newSale.journalEntryId = journalEntry.id;
    
        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });
    
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'تحويل بيان أسعار لفاتورة',
            details: `تم تحويل بيان أسعار #${quote.id} إلى فاتورة #${newSale.id}.`
        };
    
        const lowStockItems = updatedInventory.filter((i: InventoryItem) => i.stock <= 10 && i.stock > 0);
        const notification = lowStockItems.length > 0 ? {
            id: `notif-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message: `تنبيه: ${lowStockItems.map(i => i.name).join(', ')} على وشك النفاد.`,
            type: 'warning' as 'warning',
            link: '/inventory',
            read: false,
        } : null;

        const payload = { 
            updatedQuote, newSale, updatedInventory, updatedCustomers, 
            journalEntry, updatedChartOfAccounts, log, notification 
        };
    
        dispatch({ type: 'CONVERT_QUOTE_TO_SALE', payload });
        showToast('تم تحويل بيان الأسعار إلى فاتورة بنجاح.', 'success');
    };

    const addPurchase = (purchaseData: Omit<Purchase, 'id' | 'journalEntryId'>): Purchase => {
        const newPurchase: Purchase = {
            id: `BILL-${String(state.sequences.purchase).padStart(3, '0')}`,
            ...purchaseData,
        };
    
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        purchaseData.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                let newBasePurchasePrice = lineItem.price;

                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit && packingUnit.factor > 0) {
                        quantityInBaseUnit *= packingUnit.factor;
                        newBasePurchasePrice = lineItem.price / packingUnit.factor;
                    }
                }
                item.stock += quantityInBaseUnit;
                // Update the master item purchase price to the latest price
                item.purchasePrice = newBasePurchasePrice;
            }
        });
    
        const updatedSuppliers = state.suppliers.map(s => {
            if (s.name === newPurchase.supplier) {
                const balanceChange = newPurchase.total - (newPurchase.paidAmount || 0);
                return { ...s, balance: s.balance + balanceChange };
            }
            return s;
        });
    
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const cashAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '110101');
    
        if (!supplierAccount || !inventoryAccount || !cashAccount) {
            showToast("خطأ: لم يتم العثور على الحسابات المحاسبية الأساسية.", "error");
            throw new Error("Missing critical accounts");
        }
    
        const journalLines: JournalLine[] = [
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: newPurchase.total, credit: 0 },
            { accountId: supplierAccount.id, accountName: supplierAccount.name, debit: 0, credit: newPurchase.total },
        ];
    
        if (newPurchase.paidAmount && newPurchase.paidAmount > 0) {
            journalLines.push({ accountId: supplierAccount.id, accountName: supplierAccount.name, debit: newPurchase.paidAmount, credit: 0 });
            journalLines.push({ accountId: cashAccount.id, accountName: cashAccount.name, debit: 0, credit: newPurchase.paidAmount });
        }
    
        const journalEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            date: newPurchase.date,
            description: `فاتورة مشتريات رقم ${newPurchase.id}`,
            debit: journalLines.reduce((s, l) => s + l.debit, 0),
            credit: journalLines.reduce((s, l) => s + l.credit, 0),
            status: 'مرحل',
            lines: journalLines,
        };
        newPurchase.journalEntryId = journalEntry.id;
    
        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });
    
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة فاتورة مشتريات',
            details: `فاتورة #${newPurchase.id} من ${newPurchase.supplier}.`
        };
    
        dispatch({ type: 'ADD_PURCHASE', payload: { newPurchase, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } });
        showToast('تمت إضافة فاتورة المشتريات.');
        return newPurchase;
    };
    const updatePurchase = (purchaseData: Purchase): Purchase => {
        const originalPurchase = state.purchases.find(p => p.id === purchaseData.id);
        if (!originalPurchase) {
            showToast('لم يتم العثور على الفاتورة الأصلية للتعديل.', 'error');
            throw new Error('Original purchase not found');
        }

        archiveJournalEntry(originalPurchase.journalEntryId!);

        let updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        let updatedSuppliers = JSON.parse(JSON.stringify(state.suppliers));
        let updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));

        originalPurchase.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock -= quantityInBaseUnit;
            }
        });

        updatedSuppliers = updatedSuppliers.map((s: Supplier) => {
            if (s.name === originalPurchase.supplier) {
                return { ...s, balance: s.balance - (originalPurchase.total - (originalPurchase.paidAmount || 0)) };
            }
            return s;
        });

        purchaseData.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                let newBasePurchasePrice = lineItem.price;

                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) {
                        quantityInBaseUnit *= packingUnit.factor;
                        newBasePurchasePrice = lineItem.price / packingUnit.factor;
                    }
                }
                item.stock += quantityInBaseUnit;
                // Update purchase price in item master to latest cost
                item.purchasePrice = newBasePurchasePrice;
            }
        });

        updatedSuppliers = updatedSuppliers.map((s: Supplier) => {
            if (s.name === purchaseData.supplier) {
                return { ...s, balance: s.balance + (purchaseData.total - (purchaseData.paidAmount || 0)) };
            }
            return s;
        });
        
        const newJournalEntry = addJournalEntry({
            date: purchaseData.date,
            description: `تعديل فاتورة مشتريات رقم ${purchaseData.id}`,
            debit: 0, 
            credit: 0, 
            status: 'مرحل',
            lines: [] 
        });
        const supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const updatedJournal = state.journal.filter(j => j.id !== originalPurchase.journalEntryId);
        
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'تعديل فاتورة مشتريات',
            details: `تم تعديل فاتورة #${purchaseData.id}.`
        };

        dispatch({ type: 'UPDATE_PURCHASE', payload: { updatedPurchase: purchaseData, updatedInventory, updatedSuppliers, journal: updatedJournal, chartOfAccounts: updatedChartOfAccounts, log } });
        
        showToast('تم تعديل فاتورة المشتريات بنجاح.');
        return purchaseData;
     };
    const archivePurchase = (id: string): { success: boolean, message: string } => {
        const purchase = state.purchases.find(p => p.id === id);
        if (!purchase) return { success: false, message: 'الفاتورة غير موجودة.' };

        // 1. Inventory Validation Check
        for (const lineItem of purchase.items) {
            const item = state.inventory.find(i => i.id === lineItem.itemId);
            if (!item) continue;

            let quantityInBaseUnit = lineItem.quantity;
            if (lineItem.unitId !== 'base') {
                const packingUnit = item.units.find(u => u.id === lineItem.unitId);
                if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
            }

            if (item.stock < quantityInBaseUnit) {
                return { 
                    success: false, 
                    message: `لا يمكن أرشفة الفاتورة. الرصيد الحالي للصنف "${item.name}" (${item.stock}) أقل من الكمية المراد إرجاعها (${quantityInBaseUnit}).` 
                };
            }
        }

        // 2. Reduce Inventory
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        purchase.items.forEach(lineItem => {
            const item = updatedInventory.find((i: any) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: any) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock -= quantityInBaseUnit;
            }
        });

        // 3. Update Supplier Balance (Decrease balance by invoice value - effectively reversing the credit)
        const updatedSuppliers = state.suppliers.map(s => {
            if (s.name === purchase.supplier) {
                return { ...s, balance: s.balance - (purchase.total - (purchase.paidAmount || 0)) };
            }
            return s;
        });

        // 4. Archive Journal Entry & Reverse GL Impact
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedJournal = [...state.journal];
        if (purchase.journalEntryId) {
            const entry = updatedJournal.find(j => j.id === purchase.journalEntryId);
            if (entry) {
                entry.isArchived = true;
                if (entry.status === 'مرحل') {
                    entry.lines.forEach(line => {
                        updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit));
                    });
                }
            }
        }

        // 5. Update Purchases Array
        const updatedPurchases = state.purchases.map(p => p.id === id ? { ...p, isArchived: true } : p);

        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'أرشفة فاتورة مشتريات',
            details: `تمت أرشفة فاتورة مشتريات رقم #${id}.`
        };

        dispatch({
            type: 'ARCHIVE_PURCHASE',
            payload: { updatedPurchases, updatedInventory, updatedSuppliers, log, updatedJournal, chartOfAccounts: newChart }
        });

        return { success: true, message: 'تمت أرشفة الفاتورة بنجاح.' };
    };
    const unarchivePurchase = (id: string): void => {};
    
    const addPurchaseQuote = (quoteData: Omit<PurchaseQuote, 'id' | 'status'>): PurchaseQuote => {
        const newQuote: PurchaseQuote = {
            id: `PQT-${String(state.sequences.purchaseQuote).padStart(3, '0')}`,
            status: 'جديد',
            ...quoteData,
        };
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة طلب شراء',
            details: `تمت إضافة طلب شراء #${newQuote.id}.`
        };
        dispatch({ type: 'ADD_PURCHASE_QUOTE', payload: { newQuote, log } });
        return newQuote;
    };
    const updatePurchaseQuote = (quoteData: PurchaseQuote) => {
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'تعديل طلب شراء',
            details: `تم تعديل طلب شراء رقم ${quoteData.id}.`
        };
        const payload = {
            purchaseQuotes: state.purchaseQuotes.map(q => q.id === quoteData.id ? quoteData : q),
            log,
        };
        dispatch({ type: 'UPDATE_PURCHASE_QUOTE', payload });
    };
    const cancelPurchaseQuote = (quoteId: string): void => {
         const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إلغاء طلب شراء',
            details: `تم إلغاء طلب شراء #${quoteId}.`
        };
        dispatch({ type: 'CANCEL_PURCHASE_QUOTE', payload: { quoteId, log } });
    };
    const convertQuoteToPurchase = (quoteId: string): void => {
        const quote = state.purchaseQuotes.find(q => q.id === quoteId);
        if (!quote) {
            showToast('لم يتم العثور على طلب الشراء.', 'error');
            return;
        }

        const updatedQuote = { ...quote, status: 'تم تحويله' as const };
        
        const newPurchase: Purchase = {
            id: `BILL-${String(state.sequences.purchase).padStart(3, '0')}`,
            supplier: quote.supplier,
            date: new Date().toISOString().slice(0, 10),
            items: quote.items,
            subtotal: quote.subtotal,
            totalDiscount: quote.totalDiscount,
            total: quote.total,
            status: 'مستحقة',
        };

        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        newPurchase.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock += quantityInBaseUnit;
            }
        });
    
        const updatedSuppliers = state.suppliers.map(s => {
            if (s.name === newPurchase.supplier) {
                const balanceChange = newPurchase.total - (newPurchase.paidAmount || 0);
                return { ...s, balance: s.balance + balanceChange };
            }
            return s;
        });
    
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
    
        if (!supplierAccount || !inventoryAccount) {
            showToast("خطأ: لم يتم العثور على الحسابات المحاسبية الأساسية.", "error");
            throw new Error("Missing critical accounts");
        }
    
        const journalLines: JournalLine[] = [
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: newPurchase.total, credit: 0 },
            { accountId: supplierAccount.id, accountName: supplierAccount.name, debit: 0, credit: newPurchase.total },
        ];
    
        const journalEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            date: newPurchase.date,
            description: `فاتورة مشتريات #${newPurchase.id} (من طلب شراء ${quote.id})`,
            debit: journalLines.reduce((s, l) => s + l.debit, 0),
            credit: journalLines.reduce((s, l) => s + l.credit, 0),
            status: 'مرحل',
            lines: journalLines,
        };
        newPurchase.journalEntryId = journalEntry.id;
    
        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });
    
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'تحويل طلب شراء لفاتورة',
            details: `طلب شراء #${quote.id} تم تحويله لفاتورة #${newPurchase.id}.`
        };

        const payload = {
            updatedQuote, newPurchase, updatedInventory, updatedSuppliers, 
            journalEntry, updatedChartOfAccounts, log
        };

        dispatch({ type: 'CONVERT_QUOTE_TO_PURCHASE', payload });
        showToast('تم تحويل طلب الشراء إلى فاتورة بنجاح.', 'success');
    };

    const addSaleReturn = (returnData: Omit<SaleReturn, 'id' | 'journalEntryId'>): SaleReturn => {
        const newReturn: SaleReturn = {
            id: `SRET-${String(state.sequences.saleReturn).padStart(3, '0')}`,
            stockCorrectionApplied: true,
            ...returnData
        };

        // 1. Update Inventory
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        returnData.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) {
                        quantityInBaseUnit *= packingUnit.factor;
                    }
                }
                item.stock += quantityInBaseUnit;
            }
        });

        // 2. Update Customer Balance
        const updatedCustomers = state.customers.map(c => {
            if (c.name === newReturn.customer) {
                return { ...c, balance: c.balance - newReturn.total };
            }
            return c;
        });

        // 3. Create Journal Entry
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const salesReturnAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4104');
        const customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const cogsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4204');

        if (!salesReturnAccount || !customerAccount || !inventoryAccount || !cogsAccount) {
            showToast("خطأ: لم يتم العثور على حسابات المرتجعات أو المخزون أو تكلفة البضاعة.", "error");
            throw new Error("Missing critical accounts for sale return");
        }

        const cogsValue = returnData.items.reduce((sum, line) => {
            const item = state.inventory.find(i => i.id === line.itemId);
            if (!item) return sum;
            let quantityInBaseUnit = line.quantity;
            if (line.unitId !== 'base') {
                const packingUnit = item.units.find(u => u.id === line.unitId);
                if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
            }
            return sum + (quantityInBaseUnit * item.purchasePrice);
        }, 0);

        const journalLines: JournalLine[] = [
            // Debit Sales Returns (increase expense/contra-revenue), Credit Customer (decrease receivable)
            { accountId: salesReturnAccount.id, accountName: salesReturnAccount.name, debit: newReturn.total, credit: 0 },
            { accountId: customerAccount.id, accountName: customerAccount.name, debit: 0, credit: newReturn.total },
            // Debit Inventory (increase asset), Credit COGS (decrease expense)
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: cogsValue, credit: 0 },
            { accountId: cogsAccount.id, accountName: cogsAccount.name, debit: 0, credit: cogsValue },
        ];

        const journalEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            date: newReturn.date,
            description: `مرتجع مبيعات رقم ${newReturn.id}`,
            debit: newReturn.total + cogsValue,
            credit: newReturn.total + cogsValue,
            status: 'مرحل',
            lines: journalLines,
        };
        newReturn.journalEntryId = journalEntry.id;
        
        // 4. Update Account Balances
        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });

        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة مرتجع مبيعات',
            details: `تمت إضافة مرتجع مبيعات #${newReturn.id}.`
        };
        
        // 5. Dispatch
        dispatch({
            type: 'ADD_SALE_RETURN',
            payload: {
                newSaleReturn: newReturn,
                updatedInventory,
                updatedCustomers,
                journalEntry,
                updatedChartOfAccounts,
                log,
            }
        });

        return newReturn;
    };
    const deleteSaleReturn = (returnId: string): { success: boolean; message: string } => {
        const saleReturnToDelete = state.saleReturns.find(sr => sr.id === returnId);
        if (!saleReturnToDelete) {
            return { success: false, message: 'لم يتم العثور على المرتجع.' };
        }
    
        // Check inventory levels
        for (const lineItem of saleReturnToDelete.items) {
            const inventoryItem = state.inventory.find(i => i.id === lineItem.itemId);
            if (!inventoryItem) {
                return { success: false, message: `الصنف ${lineItem.itemName} غير موجود.` };
            }
    
            let quantityInBaseUnit = lineItem.quantity;
            if (lineItem.unitId !== 'base') {
                const packingUnit = inventoryItem.units.find(u => u.id === lineItem.unitId);
                if (packingUnit) {
                    quantityInBaseUnit *= packingUnit.factor;
                }
            }
    
            if (inventoryItem.stock < quantityInBaseUnit) {
                return {
                    success: false,
                    message: `لا يمكن حذف المرتجع. تم بيع جزء من الكمية المرتجعة للصنف "${inventoryItem.name}". الرصيد الحالي: ${inventoryItem.stock}.`,
                };
            }
        }
    
        // 1. Reverse inventory
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        saleReturnToDelete.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock -= quantityInBaseUnit;
            }
        });
    
        // 2. Reverse customer balance
        const updatedCustomers = state.customers.map(c => {
            if (c.name === saleReturnToDelete.customer) {
                return { ...c, balance: c.balance + saleReturnToDelete.total };
            }
            return c;
        });
    
        // 3. Archive the journal entry
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const entryToArchive = state.journal.find(e => e.id === saleReturnToDelete.journalEntryId);
        let updatedJournal = state.journal;
        if (entryToArchive) {
            if (entryToArchive.status === 'مرحل') {
                entryToArchive.lines.forEach(line => {
                    updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit));
                });
            }
            updatedJournal = state.journal.map(e => e.id === entryToArchive.id ? { ...e, isArchived: true } : e);
        }
        
        // 4. Remove the sale return (it's not archived, it's deleted)
        const updatedSaleReturns = state.saleReturns.filter(sr => sr.id !== returnId);

        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'حذف مرتجع مبيعات',
            details: `تم حذف مرتجع المبيعات رقم #${returnId}.`
        };
        
        dispatch({
            type: 'ARCHIVE_SALE_RETURN', // Re-using this action type to update state
            payload: {
                updatedSaleReturns,
                updatedInventory,
                updatedCustomers,
                updatedJournal,
                chartOfAccounts: newChart,
                log,
            }
        });
    
        return { success: true, message: 'تم الحذف بنجاح.' };
    };
    const unarchiveSaleReturn = (id: string): void => {};

    const addPurchaseReturn = (returnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'>): PurchaseReturn => {
        const newReturn: PurchaseReturn = {
            id: `PRET-${String(state.sequences.purchaseReturn).padStart(3, '0')}`,
            ...returnData
        };
    
        // 1. Update Inventory
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        returnData.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) {
                        quantityInBaseUnit *= packingUnit.factor;
                    }
                }
                item.stock -= quantityInBaseUnit;
            }
        });
    
        // 2. Update Supplier Balance
        const updatedSuppliers = state.suppliers.map(s => {
            if (s.name === newReturn.supplier) {
                return { ...s, balance: s.balance - newReturn.total };
            }
            return s;
        });
    
        // 3. Create Journal Entry
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
    
        if (!supplierAccount || !inventoryAccount) {
            showToast("خطأ: لم يتم العثور على حسابات الموردين أو المخزون.", "error");
            throw new Error("Missing critical accounts for purchase return");
        }
    
        const journalLines: JournalLine[] = [
            { accountId: supplierAccount.id, accountName: supplierAccount.name, debit: newReturn.total, credit: 0 },
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: 0, credit: newReturn.total },
        ];
    
        const journalEntry: JournalEntry = {
            id: `JE-${state.sequences.journal}`,
            date: newReturn.date,
            description: `مرتجع مشتريات رقم ${newReturn.id}`,
            debit: newReturn.total,
            credit: newReturn.total,
            status: 'مرحل',
            lines: journalLines,
        };
        newReturn.journalEntryId = journalEntry.id;
    
        // 4. Update Account Balances
        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });
    
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة مرتجع مشتريات',
            details: `تمت إضافة مرتجع مشتريات #${newReturn.id}.`
        };
    
        // 5. Dispatch
        dispatch({
            type: 'ADD_PURCHASE_RETURN',
            payload: {
                newPurchaseReturn: newReturn,
                updatedInventory,
                updatedSuppliers,
                journalEntry,
                updatedChartOfAccounts,
                log,
            }
        });
    
        showToast('تمت إضافة مرتجع المشتريات بنجاح.');
        return newReturn;
    };
    const deletePurchaseReturn = (returnId: string): { success: boolean; message: string } => {
        const purchaseReturnToDelete = state.purchaseReturns.find(pr => pr.id === returnId);
        if (!purchaseReturnToDelete) {
            return { success: false, message: 'لم يتم العثور على المرتجع.' };
        }
    
        const supplier = state.suppliers.find(s => s.name === purchaseReturnToDelete.supplier);
        if (!supplier) {
            return { success: false, message: 'لم يتم العثور على المورد المرتبط بالمرتجع.' };
        }
    
        // Check if it's the last transaction for the supplier
        const supplierTransactions = [
            ...state.purchases.filter(p => p.supplier === supplier.name && !p.isArchived).map(p => ({ date: p.date, id: p.id, type: 'purchase' })),
            ...state.purchaseReturns.filter(pr => pr.supplier === supplier.name && !pr.isArchived).map(pr => ({ date: pr.date, id: pr.id, type: 'purchaseReturn' })),
            ...state.treasury.filter(t => t.partyType === 'supplier' && t.partyId === supplier.id && !t.isArchived).map(t => ({ date: t.date, id: t.id, type: 'treasury' })),
        ].sort((a, b) => {
            const dateA = new Date(a.date).getTime();
            const dateB = new Date(b.date).getTime();
            if (dateA !== dateB) return dateB - dateA;
            return b.id.localeCompare(a.id);
        });
    
        if (supplierTransactions.length > 0 && (supplierTransactions[0].id !== returnId || supplierTransactions[0].type !== 'purchaseReturn')) {
            return { success: false, message: 'لا يمكن حذف المرتجع لأنه ليس آخر حركة مالية للمورد. يجب التعامل مع الحركات الأحدث أولاً.' };
        }
    
        // 1. Reverse inventory
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        purchaseReturnToDelete.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let quantityInBaseUnit = lineItem.quantity;
                if (lineItem.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
                item.stock += quantityInBaseUnit;
            }
        });
    
        // 2. Reverse supplier balance
        const updatedSuppliers = state.suppliers.map(s => {
            if (s.id === supplier.id) {
                return { ...s, balance: s.balance + purchaseReturnToDelete.total };
            }
            return s;
        });
    
        // 3. Archive journal entry
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const entryToArchive = state.journal.find(e => e.id === purchaseReturnToDelete.journalEntryId);
        let updatedJournal = state.journal;
        if (entryToArchive) {
            if (entryToArchive.status === 'مرحل') {
                entryToArchive.lines.forEach(line => {
                    updateBalancesRecursively(newChart, line.accountId, -(line.debit - line.credit));
                });
            }
            updatedJournal = state.journal.map(e => e.id === entryToArchive.id ? { ...e, isArchived: true } : e);
        }
    
        // 4. Remove the purchase return
        const updatedPurchaseReturns = state.purchaseReturns.filter(pr => pr.id !== returnId);
    
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'حذف مرتجع مشتريات',
            details: `تم حذف مرتجع المشتريات رقم #${returnId}.`
        };
    
        dispatch({
            type: 'ARCHIVE_PURCHASE_RETURN',
            payload: {
                updatedPurchaseReturns,
                updatedInventory,
                updatedSuppliers,
                updatedJournal,
                chartOfAccounts: newChart,
                log,
            }
        });
    
        return { success: true, message: 'تم الحذف بنجاح.' };
    };
    const unarchivePurchaseReturn = (id: string): void => {};

    const addTreasuryTransaction = (transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>): TreasuryTransaction => {
        const newTransaction: TreasuryTransaction = {
            id: `TR-${state.sequences.treasury}`,
            balance: 0, 
            ...transactionData,
            amount: transactionData.type === 'سند قبض' ? transactionData.amount : -transactionData.amount,
            journalEntryId: `JE-${state.sequences.journal}`,
        };

        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const treasuryAccount = findNodeRecursive(updatedChartOfAccounts, 'id', newTransaction.treasuryAccountId);
        
        let partyAccount: AccountNode | null = null;
        let updatedCustomers = state.customers;
        let updatedSuppliers = state.suppliers;

        if (transactionData.partyType === 'account') {
            partyAccount = findNodeRecursive(updatedChartOfAccounts, 'id', transactionData.partyId!);
        } else if (transactionData.partyType === 'customer') {
            partyAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103'); // العملاء
            updatedCustomers = state.customers.map(c => {
                if (c.id === transactionData.partyId) {
                    const change = transactionData.type === 'سند قبض' ? -transactionData.amount : transactionData.amount;
                    return { ...c, balance: c.balance + change };
                }
                return c;
            });
        } else if (transactionData.partyType === 'supplier') {
            partyAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101'); // الموردين
            updatedSuppliers = state.suppliers.map(s => {
                if (s.id === transactionData.partyId) {
                    const change = transactionData.type === 'سند صرف' ? -transactionData.amount : transactionData.amount;
                    return { ...s, balance: s.balance + change };
                }
                return s;
            });
        }

        if (!treasuryAccount || !partyAccount) {
            showToast("خطأ: لم يتم العثور على الحسابات المحاسبية اللازمة.", "error");
            throw new Error("Missing critical accounts for treasury transaction");
        }

        const journalLines: JournalLine[] = [];
        const absAmount = Math.abs(newTransaction.amount);

        if (newTransaction.type === 'سند قبض') { // Receipt: Debit Treasury, Credit Party
            journalLines.push({ accountId: treasuryAccount.id, accountName: treasuryAccount.name, debit: absAmount, credit: 0 });
            journalLines.push({ accountId: partyAccount.id, accountName: partyAccount.name, debit: 0, credit: absAmount });
        } else { // Payment: Credit Treasury, Debit Party
            journalLines.push({ accountId: partyAccount.id, accountName: partyAccount.name, debit: absAmount, credit: 0 });
            journalLines.push({ accountId: treasuryAccount.id, accountName: treasuryAccount.name, debit: 0, credit: absAmount });
        }

        const journalEntry: JournalEntry = {
            id: newTransaction.journalEntryId,
            date: newTransaction.date,
            description: `${newTransaction.type} - ${newTransaction.description}`,
            debit: absAmount,
            credit: absAmount,
            status: 'مرحل',
            lines: journalLines,
        };

        journalLines.forEach(line => {
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit);
        });
        
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: `إضافة ${transactionData.type}`,
            details: `تمت إضافة سند #${newTransaction.id} بمبلغ ${absAmount}.`
        };

        dispatch({
            type: 'ADD_TREASURY_TRANSACTION',
            payload: {
                newTransaction,
                updatedCustomers,
                updatedSuppliers,
                journalEntry,
                updatedChartOfAccounts,
                log,
            }
        });
        showToast(`تمت إضافة ${transactionData.type} بنجاح.`);
        return newTransaction;
    };
    const updateTreasuryTransaction = (id: string, transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId' | 'treasuryAccountName'>) => {};
    const transferTreasuryFunds = (fromTreasuryId: string, toTreasuryId: string, amount: number, notes: string) => {};

    const addInventoryAdjustment = (adjustmentData: Omit<InventoryAdjustment, 'id' | 'journalEntryId'>): InventoryAdjustment => {
        const newAdjustment: InventoryAdjustment = {
            id: `ADJ-${state.sequences.inventoryAdjustment}`,
            journalEntryId: '', // placeholder
            ...adjustmentData
        };
        const log = {
            id: `log-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser!.id,
            username: currentUser!.name,
            action: 'إضافة تسوية مخزون',
            details: `تمت إضافة تسوية #${newAdjustment.id}.`
        };
        dispatch({ type: 'ADD_INVENTORY_ADJUSTMENT', payload: { newAdjustment, log, updatedInventory: state.inventory, journalEntry: {}, updatedChartOfAccounts: state.chartOfAccounts } });
        return newAdjustment;
    };
    const updateInventoryAdjustment = (adjustmentData: InventoryAdjustment): InventoryAdjustment => { return adjustmentData };
    const archiveInventoryAdjustment = (id: string): { success: boolean, message: string } => { return {success: false, message: 'Not implemented'} };
    const unarchiveInventoryAdjustment = (id: string): void => {};

    const allCustomers = useMemo(() => state.customers, [state.customers]);
    const customers = useMemo(() => allCustomers.filter(c => !c.isArchived), [allCustomers]);
    const archivedCustomers = useMemo(() => allCustomers.filter(c => c.isArchived), [allCustomers]);

    const allSuppliers = useMemo(() => state.suppliers, [state.suppliers]);
    const suppliers = useMemo(() => allSuppliers.filter(s => !s.isArchived), [allSuppliers]);
    const archivedSuppliers = useMemo(() => allSuppliers.filter(s => s.isArchived), [allSuppliers]);

    const allUsers = useMemo(() => state.users, [state.users]);
    const users = useMemo(() => allUsers.filter(u => !u.isArchived), [allUsers]);
    const archivedUsers = useMemo(() => allUsers.filter(u => u.isArchived), [allUsers]);

    const allInventory = useMemo(() => state.inventory, [state.inventory]);
    const inventory = useMemo(() => allInventory.filter(i => !i.isArchived), [allInventory]);
    const archivedInventory = useMemo(() => allInventory.filter(i => i.isArchived), [allInventory]);

    const allJournal = useMemo(() => state.journal, [state.journal]);
    const journal = useMemo(() => allJournal.filter(j => !j.isArchived), [allJournal]);
    const archivedJournal = useMemo(() => allJournal.filter(j => j.isArchived), [allJournal]);

    const allSales = useMemo(() => state.sales, [state.sales]);
    const sales = useMemo(() => allSales.filter(s => !s.isArchived), [allSales]);
    const archivedSales = useMemo(() => allSales.filter(s => s.isArchived), [allSales]);

    const allPurchases = useMemo(() => state.purchases, [state.purchases]);
    const purchases = useMemo(() => allPurchases.filter(p => !p.isArchived), [allPurchases]);
    const archivedPurchases = useMemo(() => allPurchases.filter(p => p.isArchived), [allPurchases]);
    
    const allSaleReturns = useMemo(() => state.saleReturns, [state.saleReturns]);
    const saleReturns = useMemo(() => allSaleReturns.filter(s => !s.isArchived), [allSaleReturns]);
    const archivedSaleReturns = useMemo(() => allSaleReturns.filter(s => s.isArchived), [allSaleReturns]);

    const allPurchaseReturns = useMemo(() => state.purchaseReturns, [state.purchaseReturns]);
    const purchaseReturns = useMemo(() => allPurchaseReturns.filter(p => !p.isArchived), [allPurchaseReturns]);
    const archivedPurchaseReturns = useMemo(() => allPurchaseReturns.filter(p => p.isArchived), [allPurchaseReturns]);

    const allTreasury = useMemo(() => state.treasury, [state.treasury]);
    const treasury = useMemo(() => allTreasury.filter(t => !t.isArchived), [allTreasury]);
    const archivedTreasury = useMemo(() => allTreasury.filter(t => t.isArchived), [allTreasury]);
    
    const allInventoryAdjustments = useMemo(() => state.inventoryAdjustments, [state.inventoryAdjustments]);
    const inventoryAdjustments = useMemo(() => allInventoryAdjustments.filter(t => !t.isArchived), [allInventoryAdjustments]);
    const archivedInventoryAdjustments = useMemo(() => allInventoryAdjustments.filter(t => t.isArchived), [allInventoryAdjustments]);


    const totalReceivables = useMemo(() => customers.reduce((sum, customer) => sum + customer.balance, 0), [customers]);
    const totalPayables = useMemo(() => suppliers.reduce((sum, supplier) => sum + supplier.balance, 0), [suppliers]);
    const inventoryValue = useMemo(() => inventory.reduce((sum, item) => sum + (item.stock * item.purchasePrice), 0), [inventory]);
    
    const treasuriesList = useMemo(() => {
        const treasuryRoot = findNodeRecursive(state.chartOfAccounts, 'code', '1101');
        if (!treasuryRoot || !treasuryRoot.children) return [];
        const treasuries = treasuryRoot.children.map(t => ({...t, isTotal: false }));
        const totalBalance = treasuries.reduce((sum, t) => sum + (t.balance || 0), 0);
        return [ ...treasuries, { id: 'total', name: 'إجمالي الخزائن', code: '', balance: totalBalance, isTotal: true } ];
    }, [state.chartOfAccounts]);

    const totalCashBalance = useMemo(() => treasuriesList.find(t => t.id === 'total')?.balance || 0, [treasuriesList]);
    
    const recentTransactions = useMemo(() => {
        const combined = [
            ...sales.map((s: Sale) => ({ type: 'sale' as 'sale', id: s.id, date: s.date, partyName: s.customer, total: s.total, status: s.status })),
            ...purchases.map((p: Purchase) => ({ type: 'purchase' as 'purchase', id: p.id, date: p.date, partyName: p.supplier, total: p.total, status: p.status }))
        ];
        return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [sales, purchases]);

    const topCustomers = useMemo(() => {
        const customerSales: { [key: string]: number } = {};
        sales.forEach(sale => {
            customerSales[sale.customer] = (customerSales[sale.customer] || 0) + sale.total;
        });
        return Object.entries(customerSales)
            .map(([name, total]) => ({ name, total }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 5);
    }, [sales]);


    const contextValue: DataContextType = {
        // Raw state
        companyInfo: state.companyInfo,
        printSettings: state.printSettings,
        financialYear: state.financialYear,
        generalSettings: state.generalSettings,
        chartOfAccounts: state.chartOfAccounts,
        sequences: state.sequences,
        unitDefinitions: state.unitDefinitions,
        activityLog: state.activityLog,
        notifications: state.notifications,
        // Core
        currentUser,
        isDataLoaded,
        hasData,
        saveStatus,
        dataManager,
        scannedItem,
        toast,
        // Active Data
        customers,
        suppliers,
        users,
        inventory,
        journal,
        sales,
        priceQuotes: state.priceQuotes,
        purchases,
        purchaseQuotes: state.purchaseQuotes,
        saleReturns,
        purchaseReturns,
        treasury,
        inventoryAdjustments,
        // Archived Data
        archivedCustomers,
        archivedSuppliers,
        archivedUsers,
        archivedInventory,
        archivedJournal,
        archivedSales,
        archivedPurchases,
        archivedSaleReturns,
        archivedPurchaseReturns,
        archivedTreasury,
        archivedInventoryAdjustments,
        // All Data
        allCustomers,
        allSuppliers,
        allUsers,
        allInventory,
        allJournal,
        allSales,
        allPurchases,
        allSaleReturns,
        allPurchaseReturns,
        allTreasury,
        allInventoryAdjustments,
        // Derived Data
        totalReceivables,
        totalPayables,
        inventoryValue,
        totalCashBalance,
        recentTransactions,
        topCustomers,
        treasuriesList,
        // Functions
        login,
        logout,
        showToast,
        createNewDataset,
        switchDataset,
        renameDataset,
        importData,
        resetTransactionalData,
        forceBalanceRecalculation,
        processBarcodeScan,
        updateCompanyInfo,
        updatePrintSettings,
        updateFinancialYear,
        updateGeneralSettings,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        addAccount,
        updateAccount,
        archiveAccount,
        updateAllOpeningBalances,
        addUnitDefinition,
        addJournalEntry,
        updateJournalEntry,
        archiveJournalEntry,
        unarchiveJournalEntry,
        addSale,
        updateSale,
        archiveSale,
        unarchiveSale,
        addPriceQuote,
        updatePriceQuote,
        cancelPriceQuote,
        convertQuoteToSale,
        addPurchase,
        updatePurchase,
        archivePurchase,
        unarchivePurchase,
        addPurchaseQuote,
        updatePurchaseQuote,
        cancelPurchaseQuote,
        convertQuoteToPurchase,
        addSaleReturn,
        deleteSaleReturn,
        unarchiveSaleReturn,
        addPurchaseReturn,
        deletePurchaseReturn,
        unarchivePurchaseReturn,
        addTreasuryTransaction,
        updateTreasuryTransaction,
        transferTreasuryFunds,
        addInventoryAdjustment,
        updateInventoryAdjustment,
        archiveInventoryAdjustment,
        unarchiveInventoryAdjustment,
        addUser,
        updateUser,
        archiveUser,
        unarchiveUser,
        addCustomer,
        updateCustomer,
        archiveCustomer,
        unarchiveCustomer,
        addSupplier,
        updateSupplier,
        archiveSupplier,
        unarchiveSupplier,
        addItem,
        updateItem,
        archiveItem,
        unarchiveItem,
        generateAndAssignBarcodesForMissing,
    };
    
    return (
        <DataContext.Provider value={contextValue}>
            {children}
        </DataContext.Provider>
    );
}
