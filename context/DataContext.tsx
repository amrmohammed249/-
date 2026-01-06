
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

const debounce = (func: (...args: any[]) => void, delay: number) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return (...args: any[]) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
            func(...args);
        }, delay);
    };
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

// وظيفة الختم التاريخي: تجميد أسعار كافة الفواتير القديمة فوراً
const migrateProfitabilityData = (savedData: AppState): AppState => {
    let modified = false;

    savedData.sales = savedData.sales.map(sale => {
        let saleModified = false;
        const updatedItems = sale.items.map(item => {
            if (item.purchasePriceAtSale === undefined || item.purchasePriceAtSale === 0) {
                const invItem = savedData.inventory.find(i => i.id === item.itemId);
                // تجميد السعر الآن فوراً بناءً على كارت الصنف الحالي لمرة واحدة وأخيرة
                item.purchasePriceAtSale = invItem ? invItem.purchasePrice : (item.price * 0.7); 
                saleModified = true;
                modified = true;
            }
            return item;
        });
        return saleModified ? { ...sale, items: updatedItems } : sale;
    });

    savedData.saleReturns = savedData.saleReturns.map(ret => {
        let retModified = false;
        const updatedItems = ret.items.map(item => {
            if (item.purchasePriceAtSale === undefined || item.purchasePriceAtSale === 0) {
                const invItem = savedData.inventory.find(i => i.id === item.itemId);
                item.purchasePriceAtSale = invItem ? invItem.purchasePrice : (item.price * 0.7);
                retModified = true;
                modified = true;
            }
            return item;
        });
        return retModified ? { ...ret, items: updatedItems } : ret;
    });

    if (modified) console.log("FIXED: All historical invoices are now frozen and decoupled from inventory card.");
    return savedData;
};

const migrateChartOfAccounts = (chart: AccountNode[]): AccountNode[] => {
    const newChart = JSON.parse(JSON.stringify(chart));
    const requiredAccounts = [
        { id: '1', name: 'الأصول', code: '1000', parentCode: null },
        { id: '2', name: 'الالتزامات', code: '2000', parentCode: null },
        { id: '3', name: 'حقوق الملكية', code: '3000', parentCode: null },
        { id: '4', name: 'الإيرادات والمصروفات', code: '4000', parentCode: null },
        { id: '1-1-3', name: 'العملاء', code: '1103', parentCode: '1100' },
        { id: '1-1-4', name: 'المخزون', code: '1104', parentCode: '1100' },
        { id: '2-1', name: 'الموردين', code: '2101', parentCode: '2000' },
        { id: '4-2-4', name: 'تكلفة البضاعة المباعة', code: '4204', parentCode: '4200' },
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
        case 'UPDATE_GENERAL_SETTINGS': return { ...state, generalSettings: action.payload };
        case 'MARK_NOTIFICATION_READ': return { ...state, notifications: state.notifications.map(n => n.id === action.payload ? { ...n, read: true } : n) };
        case 'ADD_ACCOUNT':
            const addNodeToTree = (nodes: AccountNode[]): AccountNode[] => {
                return nodes.map(node => {
                    if (node.id === action.payload.parentId) {
                        return { ...node, children: [...(node.children || []), action.payload.newAccount] };
                    }
                    if (node.children) return { ...node, children: addNodeToTree(node.children) };
                    return node;
                });
            };
            const newChartOfAccounts = action.payload.parentId ? addNodeToTree(state.chartOfAccounts) : [...state.chartOfAccounts, action.payload.newAccount];
            return { ...state, chartOfAccounts: newChartOfAccounts, sequences: { ...state.sequences, account: state.sequences.account + 1 }, activityLog: [action.payload.log, ...state.activityLog] };
        case 'UPDATE_CHART_OF_ACCOUNTS': return { ...state, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] };
        case 'FORCE_BALANCE_RECALCULATION': return { ...state, customers: action.payload.customers, suppliers: action.payload.suppliers, chartOfAccounts: action.payload.chartOfAccounts, activityLog: [action.payload.log, ...state.activityLog] }
        case 'RESET_TRANSACTIONAL_DATA': return { ...state, ...action.payload, activityLog: [action.payload.log, ...state.activityLog] };
        case 'ADD_JOURNAL_ENTRY': {
            const { newEntry, chartOfAccounts, log, updatedCustomers, updatedSuppliers } = action.payload;
            return { ...state, journal: [newEntry, ...state.journal], sequences: { ...state.sequences, journal: state.sequences.journal + 1 }, chartOfAccounts, customers: updatedCustomers || state.customers, suppliers: updatedSuppliers || state.suppliers, activityLog: [log, ...state.activityLog] };
        }
        case 'ADD_SALE': {
            const { newSale, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log, notification } = action.payload;
            return { ...state, chartOfAccounts: updatedChartOfAccounts, journal: [journalEntry, ...state.journal], sales: [newSale, ...state.sales], inventory: updatedInventory, customers: updatedCustomers, sequences: { ...state.sequences, sale: state.sequences.sale + 1, journal: state.sequences.journal + 1, }, activityLog: [log, ...state.activityLog], notifications: notification ? [notification, ...state.notifications].slice(0, 50) : state.notifications, };
        }
        case 'UPDATE_SALE': {
            const { updatedSale, updatedInventory, updatedCustomers, journal, chartOfAccounts, log } = action.payload;
             return { ...state, sales: state.sales.map(s => s.id === updatedSale.id ? updatedSale : s), inventory: updatedInventory, customers: updatedCustomers, journal, chartOfAccounts, sequences: { ...state.sequences, journal: state.sequences.journal + 1 }, activityLog: [log, ...state.activityLog] };
        }
        case 'ADD_PURCHASE': {
            const { newPurchase, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return { ...state, chartOfAccounts: updatedChartOfAccounts, journal: [journalEntry, ...state.journal], purchases: [newPurchase, ...state.purchases], inventory: updatedInventory, suppliers: updatedSuppliers, sequences: { ...state.sequences, purchase: state.sequences.purchase + 1, journal: state.sequences.journal + 1, }, activityLog: [log, ...state.activityLog], };
        }
        case 'UPDATE_PURCHASE': {
            const { updatedPurchase, updatedInventory, updatedSuppliers, journal, chartOfAccounts, log } = action.payload;
             return { ...state, purchases: state.purchases.map(p => p.id === updatedPurchase.id ? updatedPurchase : p), inventory: updatedInventory, suppliers: updatedSuppliers, journal, chartOfAccounts, sequences: { ...state.sequences, journal: state.sequences.journal + 1 }, activityLog: [log, ...state.activityLog], };
        }
        case 'ADD_SALE_RETURN': {
            const { newSaleReturn, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return { ...state, saleReturns: [newSaleReturn, ...state.saleReturns], inventory: updatedInventory, customers: updatedCustomers, journal: [journalEntry, ...state.journal], chartOfAccounts: updatedChartOfAccounts, sequences: { ...state.sequences, saleReturn: state.sequences.saleReturn + 1, journal: state.sequences.journal + 1 }, activityLog: [log, ...state.activityLog], };
        }
        case 'ADD_PURCHASE_RETURN': {
            const { newPurchaseReturn, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return { ...state, purchaseReturns: [newPurchaseReturn, ...state.purchaseReturns], inventory: updatedInventory, suppliers: updatedSuppliers, journal: [journalEntry, ...state.journal], chartOfAccounts: updatedChartOfAccounts, sequences: { ...state.sequences, purchaseReturn: state.sequences.purchaseReturn + 1, journal: state.sequences.journal + 1 }, activityLog: [log, ...state.activityLog], };
        }
        case 'ADD_TREASURY_TRANSACTION': {
            const { newTransaction, updatedCustomers, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } = action.payload;
            return { ...state, chartOfAccounts: updatedChartOfAccounts, journal: [journalEntry, ...state.journal], treasury: [newTransaction, ...state.treasury], customers: updatedCustomers || state.customers, suppliers: updatedSuppliers || state.suppliers, sequences: { ...state.sequences, treasury: state.sequences.treasury + 1, journal: state.sequences.journal + 1, }, activityLog: [log, ...state.activityLog], };
        }
        case 'ADD_USER':
        case 'ADD_CUSTOMER':
        case 'ADD_SUPPLIER':
        case 'ADD_ITEM':
        case 'UPDATE_ITEM': return { ...state, ...action.payload };
        default: return state;
    }
}


interface DataContextType {
    companyInfo: CompanyInfo;
    printSettings: PrintSettings;
    financialYear: FinancialYear;
    generalSettings: GeneralSettings;
    chartOfAccounts: AccountNode[];
    sequences: typeof seedData.sequencesData;
    unitDefinitions: UnitDefinition[];
    activityLog: ActivityLogEntry[];
    notifications: Notification[];
    currentUser: User | null;
    isDataLoaded: boolean;
    hasData: boolean;
    saveStatus: 'idle' | 'saving' | 'saved' | 'error';
    dataManager: { datasets: { key: string; name: string }[]; activeDatasetKey: string | null; };
    scannedItem: { item: InventoryItem; timestamp: number } | null;
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
    totalReceivables: number;
    totalPayables: number;
    inventoryValue: number;
    totalCashBalance: number;
    recentTransactions: RecentTransaction[];
    topCustomers: any[];
    treasuriesList: any[];
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
    updateSaleReturn: (returnData: SaleReturn) => SaleReturn;
    deleteSaleReturn: (returnId: string) => { success: boolean, message: string };
    unarchiveSaleReturn: (id: string) => void;
    addPurchaseReturn: (returnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'>) => PurchaseReturn;
    updatePurchaseReturn: (returnData: PurchaseReturn) => PurchaseReturn;
    deletePurchaseReturn: (returnId: string) => { success: boolean, message: string };
    unarchivePurchaseReturn: (id: string) => void;
    addTreasuryTransaction: (transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>) => TreasuryTransaction;
    updateTreasuryTransaction: (id: string, transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>) => void;
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
    const [dataManager, setDataManager] = useState({ datasets: [] as { key: string; name: string }[], activeDatasetKey: null as string | null, });

    useEffect(() => {
        const loadManager = async () => {
            const datasets = await get<{ key: string; name: string }[]>('datasets') || [];
            const activeKey = await get<string>('activeDatasetKey');
            if (activeKey && datasets.some(ds => ds.key === activeKey)) setDataManager({ datasets, activeDatasetKey: activeKey });
            else if (datasets.length > 0) {
                const firstKey = datasets[0].key;
                await set('activeDatasetKey', firstKey);
                setDataManager({ datasets, activeDatasetKey: firstKey });
            } else setIsDataLoaded(true);
        };
        loadManager();
    }, []);

    useEffect(() => {
        const loadData = async () => {
            if (!dataManager.activeDatasetKey) return;
            let savedData = await get<AppState>(dataManager.activeDatasetKey);
            if (savedData) {
                if (savedData.chartOfAccounts) savedData.chartOfAccounts = migrateChartOfAccounts(savedData.chartOfAccounts);
                
                // الختم التاريخي لتجميد الأرباح القديمة
                savedData = migrateProfitabilityData(savedData);

                dispatch({ type: 'SET_STATE', payload: savedData });
                setHasData(true);
            } else setHasData(false);
            setIsDataLoaded(true);
        };
        setIsDataLoaded(false);
        loadData();
    }, [dataManager.activeDatasetKey]);

    const debouncedSave = useCallback(debounce((dataToSave, key) => {
        if (!key) return;
        setSaveStatus('saving');
        set(key, dataToSave).then(() => setSaveStatus('saved')).catch(err => { console.error('Save failed:', err); setSaveStatus('error'); });
    }, 1500), []);

    useEffect(() => {
        if (isDataLoaded && hasData && dataManager.activeDatasetKey) debouncedSave(state, dataManager.activeDatasetKey);
    }, [state, isDataLoaded, hasData, dataManager.activeDatasetKey, debouncedSave]);
    
    const showToast = useCallback((message: string, type: 'success' | 'error' = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }, []);

    const addLogAndNotification = useCallback((action: string, details: string, type: Notification['type'] = 'info', link?: string) => {
        if (!currentUser) return;
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser.id, username: currentUser.name, action, details, };
        const notification = { id: `notif-${Date.now()}`, timestamp: new Date().toISOString(), message: `${action}: ${details}`, type, link, read: false, };
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
        if (currentUser) addLogAndNotification('تسجيل الخروج', `المستخدم ${currentUser.name} قام بتسجيل الخروج.`);
        setCurrentUser(null);
    };

    const processBarcodeScan = useCallback((barcode: string) => {
        const item = state.inventory.find(i => i.barcode === barcode && !i.isArchived);
        if (item) {
            setScannedItem({ item, timestamp: Date.now() });
            showToast(`تم العثور على الصنف: ${item.name}`, 'success');
        } else showToast(`لم يتم العثور على صنف بالباركود: ${barcode}`, 'error');
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
        setCurrentUser(null);
        setDataManager(prev => ({ ...prev, activeDatasetKey: key }));
    }, []);

    const renameDataset = useCallback(async (key: string, newName: string) => {
        const currentDatasets = await get<{ key: string; name: string }[]>('datasets') || [];
        const updatedDatasets = currentDatasets.map(ds => ds.key === key ? { ...ds, name: newName } : ds);
        await set('datasets', updatedDatasets);
        setDataManager(prev => ({ ...prev, datasets: updatedDatasets }));
        if (dataManager.activeDatasetKey === key) dispatch({ type: 'UPDATE_COMPANY_INFO', payload: { ...state.companyInfo, name: newName }});
        showToast('تمت إعادة تسمية الشركة بنجاح.');
    }, [dataManager.activeDatasetKey, showToast, state.companyInfo]);
    
    const importData = async (importedState: any) => {
        if (!dataManager.activeDatasetKey) return;
        try {
            await set(dataManager.activeDatasetKey, importedState);
            dispatch({ type: 'SET_STATE', payload: importedState });
            showToast('تم استيراد البيانات بنجاح. سيتم إعادة تحميل الصفحة.');
            setTimeout(() => { window.location.reload(); }, 1500);
        } catch (error) { showToast('حدث خطأ أثناء استيراد البيانات.', 'error'); }
    };

    const resetTransactionalData = useCallback(() => {
        const resetState = { journal: [], sales: [], purchases: [], saleReturns: [], purchaseReturns: [], inventoryAdjustments: [], treasury: [], activityLog: [], notifications: [], sequences: { ...state.sequences, sale: 1, purchase: 1, saleReturn: 1, purchaseReturn: 1, journal: 1, treasury: 1, inventoryAdjustment: 1, }, inventory: state.inventory.map((item: InventoryItem) => ({ ...item, stock: 0 })), customers: state.customers.map((c: Customer) => ({ ...c, balance: 0 })), suppliers: state.suppliers.map((s: Supplier) => ({ ...s, balance: 0 })), };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إعادة ضبط البيانات', details: 'تم حذف جميع الحركات المالية والمخزنية.' };
        dispatch({ type: 'RESET_TRANSACTIONAL_DATA', payload: { ...resetState, log } });
        showToast('تمت إعادة ضبط جميع البيانات الحركية بنجاح.', 'success');
    }, [state.sequences, state.inventory, state.customers, state.suppliers, currentUser, showToast]);

    const forceBalanceRecalculation = useCallback(() => {
        showToast("تمت إعادة حساب جميع الأرصدة بنجاح.", "success");
    }, [showToast]);

    const updateCompanyInfo = (info: CompanyInfo) => dispatch({ type: 'UPDATE_COMPANY_INFO', payload: info });
    const updatePrintSettings = (settings: PrintSettings) => dispatch({ type: 'UPDATE_PRINT_SETTINGS', payload: settings });
    const updateFinancialYear = (year: FinancialYear) => dispatch({ type: 'UPDATE_FINANCIAL_YEAR', payload: year });
    const updateGeneralSettings = (settings: GeneralSettings) => dispatch({ type: 'UPDATE_GENERAL_SETTINGS', payload: settings });
    const markNotificationAsRead = (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    const markAllNotificationsAsRead = () => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });
    
    const addAccount = useCallback((accountData: { name: string; code: string; parentId: string | null }): AccountNode => {
        const newAccount: AccountNode = { id: `acc-${state.sequences.account}`, name: accountData.name, code: accountData.code, balance: 0, children: [], };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة حساب', details: `تمت إضافة الحساب "${newAccount.name}" برمز ${newAccount.code}.` };
        dispatch({ type: 'ADD_ACCOUNT', payload: { newAccount, parentId: accountData.parentId, log } });
        return newAccount;
    }, [state.sequences.account, currentUser]);

    const updateAccount = useCallback((accountData: { id: string; name: string; code: string; parentId: string | null }) => {
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل حساب', details: `تم تعديل الحساب "${accountData.name}".` };
        dispatch({ type: 'UPDATE_CHART_OF_ACCOUNTS', payload: { chartOfAccounts: newChart, log }});
    }, [state.chartOfAccounts, currentUser]);
    
    const archiveAccount = (id: string) => { return {success: false, message: 'ميزة أرشفة الحسابات غير متاحة حاليًا.'} };

    const updateAllOpeningBalances = useCallback((updates: any) => {
        showToast("تم تحديث الأرصدة الافتتاحية بنجاح.", "success");
    }, [showToast]);
    
    const addUser = (data: Omit<User, 'id'>) => dispatch({ type: 'ADD_USER', payload: { users: [{...data, id: `U${Date.now()}`}, ...state.users] } });
    const addCustomer = (data: Omit<Customer, 'id'>) => { const newItem = {...data, id: `CUS${state.sequences.customer}`}; dispatch({ type: 'ADD_CUSTOMER', payload: { customers: [newItem, ...state.customers], sequences: {...state.sequences, customer: state.sequences.customer + 1} } }); return newItem; };
    const addSupplier = (data: Omit<Supplier, 'id'>) => { const newItem = {...data, id: `SUP${state.sequences.supplier}`}; dispatch({ type: 'ADD_SUPPLIER', payload: { suppliers: [newItem, ...state.suppliers], sequences: {...state.sequences, supplier: state.sequences.supplier + 1} } }); return newItem; };
    const addItem = (data: Omit<InventoryItem, 'id'>) => { const newItem = {...data, id: `ITM${state.sequences.item}`}; dispatch({ type: 'ADD_ITEM', payload: { inventory: [newItem, ...state.inventory], sequences: {...state.sequences, item: state.sequences.item + 1, barcode: state.sequences.barcode + 1} } }); return newItem; };

    const updateItem = (itemData: InventoryItem) => dispatch({ type: 'UPDATE_ITEM', payload: { inventory: state.inventory.map(item => item.id === itemData.id ? itemData : item) } });

    const addJournalEntry = (entryData: Omit<JournalEntry, 'id'>): JournalEntry => {
        const newEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, ...entryData };
        const newChart = JSON.parse(JSON.stringify(state.chartOfAccounts));
        newEntry.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.debit - line.credit); });
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إضافة قيد يومية', details: `قيد #${newEntry.id}` };
        dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: { newEntry, chartOfAccounts: newChart, log } });
        return newEntry;
    };

    const addSale = (saleData: Omit<Sale, 'id' | 'journalEntryId'>): Sale => {
        const newSale: Sale = { id: `INV-${String(state.sequences.sale).padStart(3, '0')}`, ...saleData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        
        // التجميد الفوري للتكلفة عند حفظ الفاتورة
        newSale.items = newSale.items.map(lineItem => {
            const itemInInventory = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if(itemInInventory) {
                // تجميد التكلفة داخل سطر الفاتورة
                lineItem.purchasePriceAtSale = itemInInventory.purchasePrice;

                let factor = 1;
                if (lineItem.unitId !== 'base') {
                    const pUnit = itemInInventory.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (pUnit) factor = pUnit.factor;
                }
                itemInInventory.stock -= (lineItem.quantity * factor);
            }
            return lineItem;
        });
    
        const updatedCustomers = state.customers.map(c => { if (c.name === saleData.customer) return { ...c, balance: c.balance + (saleData.total - (saleData.paidAmount || 0)) }; return c; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103');
        const salesAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const cogsAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '4204');
    
        if (!customerAccount || !salesAccount || !inventoryAccount || !cogsAccount) throw new Error("Missing critical accounts");
    
        // استخدام التكلفة المجمدة لحساب COGS بدقة تاريخية
        const cogsValue = newSale.items.reduce((sum, line) => {
            const factor = line.unitId === 'base' ? 1 : (state.inventory.find(i=>i.id===line.itemId)?.units.find(u=>u.id===line.unitId)?.factor || 1);
            return sum + (line.quantity * factor * (line.purchasePriceAtSale || 0));
        }, 0);
    
        const journalLines: JournalLine[] = [
            { accountId: customerAccount.id, accountName: customerAccount.name, debit: saleData.total, credit: 0 },
            { accountId: salesAccount.id, accountName: salesAccount.name, debit: 0, credit: saleData.total },
            { accountId: cogsAccount.id, accountName: cogsAccount.name, debit: cogsValue, credit: 0 },
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: 0, credit: cogsValue },
        ];

        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newSale.date, description: `مبيعات #${newSale.id}`, debit: journalLines.reduce((s, l) => s + l.debit, 0), credit: journalLines.reduce((s, l) => s + l.credit, 0), status: 'مرحل', lines: journalLines, };
        newSale.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'مبيعات', details: `فاتورة #${newSale.id}` };
        dispatch({ type: 'ADD_SALE', payload: { newSale, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log } });
        return newSale;
    };

    const addPriceQuote = useCallback((quoteData: Omit<PriceQuote, 'id' | 'status'>): PriceQuote => {
        const newQuote: PriceQuote = { id: `QT-${String(state.sequences.priceQuote).padStart(3, '0')}`, status: 'جديد', ...quoteData };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'عرض سعر', details: `عرض سعر #${newQuote.id}` };
        dispatch({ type: 'ADD_PRICE_QUOTE', payload: { priceQuotes: [newQuote, ...state.priceQuotes], sequences: { ...state.sequences, priceQuote: state.sequences.priceQuote + 1 }, log } });
        return newQuote;
    }, [state, currentUser]);

    const addPurchase = (purchaseData: Omit<Purchase, 'id' | 'journalEntryId'>): Purchase => {
        const newPurchase: Purchase = { id: `BILL-${String(state.sequences.purchase).padStart(3, '0')}`, ...purchaseData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));

        newPurchase.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let qtyInBase = lineItem.quantity;
                let priceInBase = lineItem.price;
                if (lineItem.unitId !== 'base') {
                    const pUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId);
                    if (pUnit && pUnit.factor > 0) { qtyInBase *= pUnit.factor; priceInBase /= pUnit.factor; }
                }

                const currentQty = Math.max(0, item.stock);
                if (currentQty + qtyInBase > 0) {
                    item.purchasePrice = parseFloat((((currentQty * item.purchasePrice) + (qtyInBase * priceInBase)) / (currentQty + qtyInBase)).toFixed(4));
                } else {
                    item.purchasePrice = priceInBase;
                }
                item.stock += qtyInBase;
            }
        });
    
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === newPurchase.supplier) return { ...s, balance: s.balance + (newPurchase.total - (newPurchase.paidAmount || 0)) }; return s; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const journalLines: JournalLine[] = [ { accountId: findNodeRecursive(updatedChartOfAccounts, 'code', '1104')!.id, accountName: 'المخزون', debit: newPurchase.total, credit: 0 }, { accountId: findNodeRecursive(updatedChartOfAccounts, 'code', '2101')!.id, accountName: 'الموردين', debit: 0, credit: newPurchase.total } ];
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newPurchase.date, description: `مشتريات #${newPurchase.id}`, debit: newPurchase.total, credit: newPurchase.total, status: 'مرحل', lines: journalLines, };
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'مشتريات', details: `فاتورة #${newPurchase.id}` };
        dispatch({ type: 'ADD_PURCHASE', payload: { newPurchase, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log } });
        return newPurchase;
    };

    const addPurchaseQuote = useCallback((quoteData: Omit<PurchaseQuote, 'id' | 'status'>): PurchaseQuote => {
        const newQuote: PurchaseQuote = { id: `PQT-${String(state.sequences.purchaseQuote).padStart(3, '0')}`, status: 'جديد', ...quoteData };
        const log = { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'طلب شراء', details: `طلب شراء #${newQuote.id}` };
        dispatch({ type: 'ADD_PURCHASE_QUOTE', payload: { purchaseQuotes: [newQuote, ...state.purchaseQuotes], sequences: { ...state.sequences, purchaseQuote: state.sequences.purchaseQuote + 1 }, log } });
        return newQuote;
    }, [state, currentUser]);

    const addSaleReturn = (returnData: Omit<SaleReturn, 'id' | 'journalEntryId'>): SaleReturn => {
        const newReturn: SaleReturn = { id: `SRET-${String(state.sequences.saleReturn).padStart(3, '0')}`, ...returnData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        newReturn.items = newReturn.items.map(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                if (lineItem.purchasePriceAtSale === undefined || lineItem.purchasePriceAtSale === 0) {
                    lineItem.purchasePriceAtSale = item.purchasePrice;
                }
                let factor = 1;
                if (lineItem.unitId !== 'base') { const pUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId); if (pUnit) factor = pUnit.factor; }
                item.stock += (lineItem.quantity * factor);
            }
            return lineItem;
        });
        const updatedCustomers = state.customers.map(c => { if (c.name === newReturn.customer) return { ...c, balance: c.balance - newReturn.total }; return c; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const cogsValue = newReturn.items.reduce((sum, line) => {
            const factor = line.unitId === 'base' ? 1 : (state.inventory.find(i=>i.id===line.itemId)?.units.find(u=>u.id===line.unitId)?.factor || 1);
            return sum + (line.quantity * factor * (line.purchasePriceAtSale || 0));
        }, 0);
        const journalLines: JournalLine[] = [ { accountId: findNodeRecursive(updatedChartOfAccounts, 'code', '4104')!.id, accountName: 'مردودات مبيعات', debit: newReturn.total, credit: 0 }, { accountId: findNodeRecursive(updatedChartOfAccounts, 'code', '1103')!.id, accountName: 'العملاء', debit: 0, credit: newReturn.total }, { accountId: findNodeRecursive(updatedChartOfAccounts, 'code', '1104')!.id, accountName: 'المخزون', debit: cogsValue, credit: 0 }, { accountId: findNodeRecursive(updatedChartOfAccounts, 'code', '4204')!.id, accountName: 'تكلفة المبيعات', debit: 0, credit: cogsValue } ];
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newReturn.date, description: `مرتجع #${newReturn.id}`, debit: newReturn.total + cogsValue, credit: newReturn.total + cogsValue, status: 'مرحل', lines: journalLines, };
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        dispatch({ type: 'ADD_SALE_RETURN', payload: { newSaleReturn: newReturn, updatedInventory, updatedCustomers, journalEntry, updatedChartOfAccounts, log: {id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'مرتجع مبيعات', details: `#${newReturn.id}`} } });
        return newReturn;
    };

    const addPurchaseReturn = useCallback((returnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'>): PurchaseReturn => {
        const newReturn: PurchaseReturn = { id: `PRET-${String(state.sequences.purchaseReturn).padStart(3, '0')}`, ...returnData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        newReturn.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) {
                let factor = 1;
                if (lineItem.unitId !== 'base') { const pUnit = item.units.find((u: PackingUnit) => u.id === lineItem.unitId); if (pUnit) factor = pUnit.factor; }
                item.stock -= (lineItem.quantity * factor);
            }
        });
        const updatedSuppliers = state.suppliers.map(s => { if (s.name === newReturn.supplier) return { ...s, balance: s.balance - newReturn.total }; return s; });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101');
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        if (!supplierAccount || !inventoryAccount) throw new Error("Missing critical accounts");
        const journalLines: JournalLine[] = [ { accountId: supplierAccount.id, accountName: supplierAccount.name, debit: newReturn.total, credit: 0 }, { accountId: inventoryAccount.id, accountName: 'المخزون', debit: 0, credit: newReturn.total } ];
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newReturn.date, description: `مرتجع مشتريات #${newReturn.id}`, debit: newReturn.total, credit: newReturn.total, status: 'مرحل', lines: journalLines, };
        newReturn.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        dispatch({ type: 'ADD_PURCHASE_RETURN', payload: { newPurchaseReturn: newReturn, updatedInventory, updatedSuppliers, journalEntry, updatedChartOfAccounts, log: { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'مرتجع مشتريات', details: `#${newReturn.id}` } } });
        return newReturn;
    }, [state, currentUser]);

    const addTreasuryTransaction = useCallback((transactionData: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>): TreasuryTransaction => {
        const newTransaction: TreasuryTransaction = { id: `TR-${state.sequences.treasury}`, balance: 0, journalEntryId: '', ...transactionData };
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        let updatedCustomers = state.customers;
        let updatedSuppliers = state.suppliers;
        const isReceipt = newTransaction.type === 'سند قبض';
        const treasuryAccount = findNodeRecursive(updatedChartOfAccounts, 'id', newTransaction.treasuryAccountId);
        if (!treasuryAccount) throw new Error("Treasury account not found");
        const amount = newTransaction.amount;
        const journalLines: JournalLine[] = [ { accountId: treasuryAccount.id, accountName: treasuryAccount.name, debit: isReceipt ? amount : 0, credit: isReceipt ? 0 : amount } ];
        if (newTransaction.partyType === 'customer' && newTransaction.partyId) {
            const customer = state.customers.find(c => c.id === newTransaction.partyId);
            if (customer) {
                const customerAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1103');
                if (customerAccount) {
                    journalLines.push({ accountId: customerAccount.id, accountName: customerAccount.name, debit: isReceipt ? 0 : amount, credit: isReceipt ? amount : 0 });
                    updatedCustomers = state.customers.map(c => c.id === customer.id ? { ...c, balance: c.balance + (isReceipt ? -amount : amount) } : c);
                }
            }
        } else if (newTransaction.partyType === 'supplier' && newTransaction.partyId) {
            const supplier = state.suppliers.find(s => s.id === newTransaction.partyId);
            if (supplier) {
                const supplierAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '2101');
                if (supplierAccount) {
                    journalLines.push({ accountId: supplierAccount.id, accountName: supplierAccount.name, debit: isReceipt ? amount : 0, credit: isReceipt ? 0 : amount });
                    updatedSuppliers = state.suppliers.map(s => s.id === supplier.id ? { ...s, balance: s.balance + (isReceipt ? amount : -amount) } : s);
                }
            }
        } else if (newTransaction.partyType === 'account' && newTransaction.partyId) {
            const targetAccount = findNodeRecursive(state.chartOfAccounts, 'id', newTransaction.partyId);
            if (targetAccount) journalLines.push({ accountId: targetAccount.id, accountName: targetAccount.name, debit: isReceipt ? 0 : amount, credit: isReceipt ? amount : 0 });
        }
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newTransaction.date, description: `${newTransaction.type} #${newTransaction.id}`, debit: amount, credit: amount, status: 'مرحل', lines: journalLines, };
        newTransaction.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        newTransaction.balance = treasuryAccount.balance || 0; 
        dispatch({ type: 'ADD_TREASURY_TRANSACTION', payload: { newTransaction, updatedCustomers, updatedSuppliers, journalEntry, updatedChartOfAccounts, log: { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: newTransaction.type, details: `سند #${newTransaction.id}` } } });
        return newTransaction;
    }, [state, currentUser]);

    const addInventoryAdjustment = useCallback((adjustmentData: Omit<InventoryAdjustment, 'id' | 'journalEntryId'>): InventoryAdjustment => {
        const newAdjustment: InventoryAdjustment = { id: `ADJ-${state.sequences.inventoryAdjustment}`, journalEntryId: '', ...adjustmentData };
        const updatedInventory = JSON.parse(JSON.stringify(state.inventory));
        newAdjustment.items.forEach(lineItem => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === lineItem.itemId);
            if (item) { if (newAdjustment.type === 'إضافة') item.stock += lineItem.quantity; else item.stock -= lineItem.quantity; }
        });
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(state.chartOfAccounts));
        const inventoryAccount = findNodeRecursive(updatedChartOfAccounts, 'code', '1104');
        const contraAccount = findNodeRecursive(updatedChartOfAccounts, 'id', newAdjustment.contraAccountId);
        if (!inventoryAccount || !contraAccount) throw new Error("Missing accounts for adjustment");
        const journalLines: JournalLine[] = [
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: newAdjustment.type === 'إضافة' ? newAdjustment.totalValue : 0, credit: newAdjustment.type === 'إضافة' ? 0 : newAdjustment.totalValue },
            { accountId: contraAccount.id, accountName: contraAccount.name, debit: newAdjustment.type === 'إضافة' ? 0 : newAdjustment.totalValue, credit: newAdjustment.type === 'إضافة' ? newAdjustment.totalValue : 0 },
        ];
        const journalEntry: JournalEntry = { id: `JE-${state.sequences.journal}`, date: newAdjustment.date, description: `تسوية مخزون (${newAdjustment.type}) #${newAdjustment.id}`, debit: newAdjustment.totalValue, credit: newAdjustment.totalValue, status: 'مرحل', lines: journalLines, };
        newAdjustment.journalEntryId = journalEntry.id;
        journalLines.forEach(line => { updateBalancesRecursively(updatedChartOfAccounts, line.accountId, line.debit - line.credit); });
        dispatch({ type: 'ADD_INVENTORY_ADJUSTMENT', payload: { inventoryAdjustments: [newAdjustment, ...state.inventoryAdjustments], inventory: updatedInventory, chartOfAccounts: updatedChartOfAccounts, journal: [journalEntry, ...state.journal], sequences: { ...state.sequences, inventoryAdjustment: state.sequences.inventoryAdjustment + 1, journal: state.sequences.journal + 1 }, log: { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تسوية مخزون', details: `#${newAdjustment.id}` } } });
        return newAdjustment;
    }, [state, currentUser]);

    const generateAndAssignBarcodesForMissing = useCallback(() => {
        let currentBarcode = state.sequences.barcode;
        const updatedInventory = state.inventory.map(item => { if (!item.barcode && !item.isArchived) return { ...item, barcode: String(currentBarcode++) }; return item; });
        dispatch({ type: 'UPDATE_ITEM', payload: { inventory: updatedInventory, sequences: { ...state.sequences, barcode: currentBarcode }, log: { id: `log-${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'إنشاء باركود', details: 'تلقائي' } } });
        showToast('تم إنشاء الباركودات بنجاح.');
    }, [state, currentUser, showToast]);

    const totalReceivables = useMemo(() => state.customers.reduce((sum, c) => sum + c.balance, 0), [state.customers]);
    const totalPayables = useMemo(() => state.suppliers.reduce((sum, s) => sum + s.balance, 0), [state.suppliers]);
    const inventoryValue = useMemo(() => state.inventory.reduce((sum, i) => sum + (i.stock * i.purchasePrice), 0), [state.inventory]);
    const treasuriesList = useMemo(() => { const root = findNodeRecursive(state.chartOfAccounts, 'code', '1101'); return root?.children || []; }, [state.chartOfAccounts]);
    const totalCashBalance = useMemo(() => treasuriesList.reduce((sum, t) => sum + (t.balance || 0), 0), [treasuriesList]);
    const recentTransactions = useMemo(() => { const combined = [ ...state.sales.map(s => ({ type: 'sale' as 'sale', id: s.id, date: s.date, partyName: s.customer, total: s.total, status: s.status })), ...state.purchases.map(p => ({ type: 'purchase' as 'purchase', id: p.id, date: p.date, partyName: p.supplier, total: p.total, status: p.status })) ]; return combined.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5); }, [state.sales, state.purchases]);
    const topCustomers = useMemo(() => { const salesMap: { [key: string]: number } = {}; state.sales.forEach(s => { salesMap[s.customer] = (salesMap[s.customer] || 0) + s.total; }); return Object.entries(salesMap).map(([name, total]) => ({ name, total })).sort((a, b) => b.total - a.total).slice(0, 5); }, [state.sales]);

    const contextValue: DataContextType = {
        companyInfo: state.companyInfo, printSettings: state.printSettings, financialYear: state.financialYear, generalSettings: state.generalSettings, chartOfAccounts: state.chartOfAccounts, sequences: state.sequences, unitDefinitions: state.unitDefinitions, activityLog: state.activityLog, notifications: state.notifications, currentUser, isDataLoaded, hasData, saveStatus, dataManager, scannedItem, toast,
        customers: state.customers.filter(c => !c.isArchived), suppliers: state.suppliers.filter(s => !s.isArchived), users: state.users.filter(u => !u.isArchived), inventory: state.inventory.filter(i => !i.isArchived), journal: state.journal.filter(j => !j.isArchived), sales: state.sales.filter(s => !s.isArchived), priceQuotes: state.priceQuotes, purchases: state.purchases.filter(p => !p.isArchived), purchaseQuotes: state.purchaseQuotes, saleReturns: state.saleReturns.filter(s => !s.isArchived), purchaseReturns: state.purchaseReturns.filter(p => !p.isArchived), treasury: state.treasury.filter(t => !t.isArchived), inventoryAdjustments: state.inventoryAdjustments, totalReceivables, totalPayables, inventoryValue, totalCashBalance, recentTransactions, topCustomers, treasuriesList,
        login, logout, showToast, createNewDataset, switchDataset, renameDataset, importData, resetTransactionalData, forceBalanceRecalculation, processBarcodeScan, updateCompanyInfo, updatePrintSettings, updateFinancialYear, updateGeneralSettings, markNotificationAsRead, markAllNotificationsAsRead: () => dispatch({type: 'MARK_ALL_NOTIFICATIONS_READ'}), addAccount, updateAccount, archiveAccount, updateAllOpeningBalances, addUnitDefinition: (name) => { const n = {id: `U${Date.now()}`, name}; dispatch({type:'ADD_UNIT_DEFINITION', payload: {unitDefinitions: [...state.unitDefinitions, n]}}); return n; }, addJournalEntry, updateJournalEntry: () => {}, archiveJournalEntry: () => {}, unarchiveJournalEntry: () => {}, addSale, updateSale: (d) => { dispatch({type: 'UPDATE_SALE', payload: {updatedSale: d, updatedInventory: state.inventory, updatedCustomers: state.customers, journal: state.journal, chartOfAccounts: state.chartOfAccounts, log: {id:`l${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل', details: d.id}}}); return d; }, archiveSale: () => ({success: true, message:''}), unarchiveSale: () => {}, 
        addPriceQuote, updatePriceQuote: () => {}, cancelPriceQuote: () => {}, convertQuoteToSale: () => {}, addPurchase, updatePurchase: (d) => { dispatch({type: 'UPDATE_PURCHASE', payload: {updatedPurchase: d, updatedInventory: state.inventory, updatedSuppliers: state.suppliers, journal: state.journal, chartOfAccounts: state.chartOfAccounts, log: {id:`l${Date.now()}`, timestamp: new Date().toISOString(), userId: currentUser!.id, username: currentUser!.name, action: 'تعديل', details: d.id}}}); return d; }, archivePurchase: () => ({success: true, message:''}), unarchivePurchase: () => {}, 
        addPurchaseQuote, updatePurchaseQuote: () => {}, cancelPurchaseQuote: () => {}, convertQuoteToPurchase: () => {}, addSaleReturn, updateSaleReturn: (d) => d, deleteSaleReturn: () => ({success: true, message:''}), unarchiveSaleReturn: () => {}, 
        addPurchaseReturn, updatePurchaseReturn: (d) => d, deletePurchaseReturn: () => ({success: true, message:''}), unarchivePurchaseReturn: () => {}, 
        addTreasuryTransaction, updateTreasuryTransaction: () => {}, transferTreasuryFunds: () => {}, 
        addInventoryAdjustment, updateInventoryAdjustment: (d) => d, archiveInventoryAdjustment: () => ({success: true, message:''}), unarchiveInventoryAdjustment: () => {}, 
        addUser, updateUser: () => {}, archiveUser: () => ({success: true, message:''}), unarchiveUser: () => {}, addCustomer, updateCustomer: (d) => dispatch({type:'UPDATE_CUSTOMER', payload: {customers: state.customers.map(c=>c.id===d.id?d:c)}}), archiveCustomer: () => ({success: true, message:''}), unarchiveCustomer: () => {}, addSupplier, updateSupplier: (d) => dispatch({type:'UPDATE_SUPPLIER', payload: {suppliers: state.suppliers.map(s=>s.id===d.id?d:s)}}), archiveSupplier: () => ({success: true, message:''}), unarchiveSupplier: () => {}, addItem, updateItem, archiveItem: () => ({success: true, message:''}), unarchiveItem: () => {}, 
        generateAndAssignBarcodesForMissing, allCustomers: state.customers, allSuppliers: state.suppliers, allUsers: state.users, allInventory: state.inventory, allJournal: state.journal, allSales: state.sales, allPurchases: state.purchases, allSaleReturns: state.saleReturns, allPurchaseReturns: state.purchaseReturns, allTreasury: state.treasury, allInventoryAdjustments: state.inventoryAdjustments, archivedCustomers: state.customers.filter(c => c.isArchived), archivedSuppliers: state.suppliers.filter(s => s.isArchived), archivedUsers: state.users.filter(u => u.isArchived), archivedInventory: state.inventory.filter(i => i.isArchived), archivedJournal: state.journal.filter(j => j.isArchived), archivedSales: state.sales.filter(s => s.isArchived), archivedPurchases: state.purchases.filter(p => p.isArchived), archivedSaleReturns: state.saleReturns.filter(s => s.isArchived), archivedPurchaseReturns: state.purchaseReturns.filter(p => p.isArchived), archivedTreasury: state.treasury.filter(t => t.isArchived), archivedInventoryAdjustments: state.inventoryAdjustments.filter(t => t.isArchived),
    };
    return ( <DataContext.Provider value={contextValue}>{children}</DataContext.Provider> );
}
