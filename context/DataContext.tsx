import React, { createContext, useState, useEffect, useCallback, useMemo, useReducer } from 'react';
import { get, set } from './idb-keyval';
import * as seedData from '../data/initialSeedData';
import type {
    AccountNode,
    ActivityLogEntry,
    CompanyInfo,
    Customer,
    FinancialYear,
    FixedAsset,
    InventoryAdjustment,
    InventoryItem,
    JournalEntry,
    JournalLine,
    Notification,
    PrintSettings,
    Purchase,
    PurchaseReturn,
    RecentTransaction,
    Sale,
    SaleReturn,
    Supplier,
    TreasuryTransaction,
    User,
    UnitDefinition,
    PackingUnit
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
    chartOfAccounts: seedData.chartOfAccountsData,
    sequences: seedData.sequencesData,
    unitDefinitions: seedData.unitDefinitionsData,
    journal: seedData.journalData,
    inventory: seedData.inventoryData,
    inventoryAdjustments: seedData.inventoryAdjustmentsData,
    sales: seedData.salesData,
    purchases: seedData.purchasesData,
    saleReturns: seedData.saleReturnsData,
    purchaseReturns: seedData.purchaseReturnsData,
    treasury: seedData.treasuryData,
    customers: seedData.customersData,
    suppliers: seedData.suppliersData,
    users: seedData.usersData,
    fixedAssets: seedData.fixedAssetsData,
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
                activityLog: [action.payload.log, ...state.activityLog]
            };
        
        case 'UPDATE_OPENING_BALANCES':
            return {
                ...state,
                customers: action.payload.customers,
                suppliers: action.payload.suppliers,
                chartOfAccounts: action.payload.chartOfAccounts,
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
            const { newEntry, chartOfAccounts, log } = action.payload;
            return {
                ...state,
                journal: [newEntry, ...state.journal],
                sequences: { ...state.sequences, journal: state.sequences.journal + 1 },
                chartOfAccounts,
                activityLog: [log, ...state.activityLog]
            };
        }
        
        case 'ARCHIVE_JOURNAL_ENTRY':
        case 'UNARCHIVE_JOURNAL_ENTRY': {
            const { updatedJournal, chartOfAccounts, log } = action.payload;
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
        case 'UNARCHIVE_USER': {
            return { ...state, users: action.payload.users, activityLog: [action.payload.log, ...state.activityLog] };
        }
        case 'ADD_CUSTOMER':
        case 'UPDATE_CUSTOMER':
        case 'ARCHIVE_CUSTOMER':
        case 'UNARCHIVE_CUSTOMER': {
            return { ...state, customers: action.payload.customers, sequences: { ...state.sequences, customer: action.payload.newSequence || state.sequences.customer }, activityLog: [action.payload.log, ...state.activityLog] };
        }
        case 'ADD_SUPPLIER':
        case 'ARCHIVE_SUPPLIER':
        case 'UNARCHIVE_SUPPLIER': {
            return { ...state, suppliers: action.payload.suppliers, sequences: { ...state.sequences, supplier: action.payload.newSequence || state.sequences.supplier }, activityLog: [action.payload.log, ...state.activityLog] };
        }
        case 'ADD_ITEM':
        case 'UPDATE_ITEM':
        case 'ARCHIVE_ITEM':
        case 'UNARCHIVE_ITEM': {
            return { ...state, inventory: action.payload.inventory, sequences: action.payload.newSequences || state.sequences, activityLog: [action.payload.log, ...state.activityLog] };
        }
        
        default:
            return state;
    }
}


export const DataContext = createContext<any>(null);

const resetAccountBalances = (nodes: AccountNode[]): AccountNode[] => {
    return nodes.map(node => {
        const newNode = { ...node, balance: 0 };
        if (node.children) {
            newNode.children = resetAccountBalances(node.children);
        }
        return newNode;
    });
};


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // App state
    const [isDataLoaded, useStateIsDataLoaded] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('saved');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [dataManager, setDataManager] = useState({ activeDatasetKey: '', datasets: [] as { key: string, name: string }[] });
    
    const [data, dispatch] = useReducer(dataReducer, initialState);
    
    const showToast = useCallback((message: string, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    }, []);
    
    // --- Data Persistence ---

    const saveAllData = useCallback(async (key: string, dataToSave: any) => {
        if (!key) return;
        try {
            await set(key, dataToSave);
            setSaveStatus('saved');
        } catch (e) {
            console.error("Error saving data:", e);
            setSaveStatus('error');
            showToast('خطأ في حفظ البيانات!', 'error');
        }
    }, [showToast]);

    const debouncedSave = useMemo(() => debounce(saveAllData, 1500), [saveAllData]);
    
    const loadDataset = useCallback(async (key: string) => {
        const loadedData = await get<any>(key);
        let finalState = { ...initialState };
        if (loadedData) {
            finalState.companyInfo = loadedData.companyInfo || seedData.companyInfo;
            const loadedPrintSettings = loadedData.printSettings || seedData.printSettingsData;
            finalState.printSettings = { ...seedData.printSettingsData, ...loadedPrintSettings };
            finalState.financialYear = loadedData.financialYear || seedData.financialYearData;
            
            // Migrate Chart of Accounts to ensure all required accounts exist
            const chart = loadedData.chartOfAccounts || [];
            finalState.chartOfAccounts = migrateChartOfAccounts(chart);

            finalState.sequences = loadedData.sequences || seedData.sequencesData;
            finalState.unitDefinitions = loadedData.unitDefinitions || seedData.unitDefinitionsData;
            finalState.journal = loadedData.journal || [];
            finalState.inventory = (loadedData.inventory || []).map((item: any) => ({ ...item, units: item.units || [] }));
            finalState.inventoryAdjustments = loadedData.inventoryAdjustments || [];
            finalState.sales = loadedData.sales || [];
            finalState.purchases = loadedData.purchases || [];
            finalState.saleReturns = loadedData.saleReturns || [];
            finalState.purchaseReturns = loadedData.purchaseReturns || [];
            finalState.treasury = loadedData.treasury || [];
            finalState.customers = loadedData.customers || [];
            finalState.suppliers = loadedData.suppliers || [];
            finalState.users = loadedData.users || seedData.usersData;
            finalState.fixedAssets = loadedData.fixedAssets || [];
            finalState.activityLog = loadedData.activityLog || [];
            finalState.notifications = loadedData.notifications || [];
        }
        dispatch({ type: 'SET_STATE', payload: finalState });
    }, []);
    
    // Initial Load
    useEffect(() => {
        const initialize = async () => {
            const storedDataManager = await get<any>('dataManager');
            if (storedDataManager && storedDataManager.datasets.length > 0) {
                setDataManager(storedDataManager);
                setHasData(true);
                if (storedDataManager.activeDatasetKey) {
                    await loadDataset(storedDataManager.activeDatasetKey);
                }
            }
            useStateIsDataLoaded(true);
        };
        initialize();
    }, [loadDataset]);

    // Autosave on data change
    useEffect(() => {
        if (isDataLoaded && hasData && dataManager.activeDatasetKey) {
            setSaveStatus('saving');
            debouncedSave(dataManager.activeDatasetKey, data);
        }
    }, [data, isDataLoaded, hasData, dataManager.activeDatasetKey, debouncedSave]);

    const createActivityLog = useCallback((action: string, details: string): ActivityLogEntry | null => {
        if (!currentUser) return null;
        return {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.name,
            action,
            details,
        };
    }, [currentUser]);

    const createNotification = useCallback((message: string, type: 'info' | 'warning' | 'success', link?: string): Notification => {
        return {
            id: `NOTIF-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message, type, link, read: false,
        };
    }, []);

    // --- Auth ---
    const login = (username: string, password: string): boolean => {
        const user = data.users.find(u => u.username === username && u.password === password && !u.isArchived);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    };
    const logout = () => setCurrentUser(null);
    
    // --- Notifications ---
    const markNotificationAsRead = (id: string) => dispatch({ type: 'MARK_NOTIFICATION_READ', payload: id });
    const markAllNotificationsAsRead = () => dispatch({ type: 'MARK_ALL_NOTIFICATIONS_READ' });

    // --- Data Management ---
    const createNewDataset = useCallback(async (name: string) => {
        const key = `dataset-${Date.now()}`;
        const newDataset = {
            ...initialState,
            companyInfo: { ...seedData.companyInfo, name },
        };
        await set(key, newDataset);
        const newManager = {
            activeDatasetKey: key,
            datasets: [...dataManager.datasets, { key, name }],
        };
        await set('dataManager', newManager);
        
        dispatch({ type: 'SET_STATE', payload: newDataset });
        setDataManager(newManager);
        setHasData(true);
    }, [dataManager.datasets]);

    const findAccountById = useCallback((nodes: AccountNode[], id: string): AccountNode | null => {
        for (const node of nodes) {
            if (node.id === id) return node;
            if (node.children) {
                const found = findAccountById(node.children, id);
                if (found) return found;
            }
        }
        return null;
    }, []);

    const addAccount = useCallback((accountData: { name: string; code: string; parentId: string | null; }): AccountNode => {
        const newAccount: AccountNode = { id: `ACC-${Date.now()}`, ...accountData, balance: 0 };
        dispatch({ type: 'ADD_ACCOUNT', payload: {
            ...accountData,
            newAccount,
            log: createActivityLog('إضافة حساب', `تمت إضافة الحساب ${accountData.name} (${accountData.code})`)
        }});
        return newAccount;
    }, [createActivityLog]);
    
    const updateAllOpeningBalances = useCallback(({ accountUpdates, customerUpdates, supplierUpdates }: {
        accountUpdates: { accountId: string, balance: number }[],
        customerUpdates: { customerId: string, balance: number }[],
        supplierUpdates: { supplierId: string, balance: number }[],
    }) => {
        const newCustomers = data.customers.map((c: Customer) => {
            const update = customerUpdates.find(u => u.customerId === c.id);
            return update ? { ...c, balance: update.balance } : c;
        });
    
        const newSuppliers = data.suppliers.map((s: Supplier) => {
            const update = supplierUpdates.find(u => u.supplierId === s.id);
            return update ? { ...s, balance: update.balance } : s;
        });

        const newChart = JSON.parse(JSON.stringify(data.chartOfAccounts));

        accountUpdates.forEach(update => {
            const account = findAccountById(newChart, update.accountId);
            if (account) {
                const oldBalance = account.balance || 0;
                const difference = update.balance - oldBalance;
                if (difference !== 0) {
                    updateBalancesRecursively(newChart, update.accountId, difference);
                }
            }
        });
        
        const customerAccountNode = findAccountByCode(newChart, '1103');
        if (customerAccountNode) {
            const newTotalCustomerBalance = customerUpdates.reduce((sum, u) => sum + u.balance, 0);
            const oldTotalCustomerBalance = customerAccountNode.balance || 0;
            const difference = newTotalCustomerBalance - oldTotalCustomerBalance;
            if(difference !== 0) {
                 updateBalancesRecursively(newChart, customerAccountNode.id, difference);
            }
        }
        
        const supplierAccountNode = findAccountByCode(newChart, '2101');
        if (supplierAccountNode) {
            const newTotalSupplierBalance = supplierUpdates.reduce((sum, u) => sum + u.balance, 0);
            // Supplier balances are credits, so they are negative in the chart.
            const oldTotalSupplierBalance = supplierAccountNode.balance || 0;
            const difference = (-newTotalSupplierBalance) - oldTotalSupplierBalance;
             if(difference !== 0) {
                updateBalancesRecursively(newChart, supplierAccountNode.id, difference);
            }
        }

        dispatch({ type: 'UPDATE_OPENING_BALANCES', payload: {
            customers: newCustomers,
            suppliers: newSuppliers,
            chartOfAccounts: newChart,
            log: createActivityLog('تحديث الأرصدة الافتتاحية', `تم تحديث الأرصدة الافتتاحية للنظام.`)
        }});
        showToast('تم تحديث الأرصدة الافتتاحية بنجاح.');
    }, [data.customers, data.suppliers, data.chartOfAccounts, createActivityLog, showToast, findAccountById]);

    const addUnitDefinition = useCallback((name: string): UnitDefinition => {
        if (data.unitDefinitions.some(u => u.name === name)) {
            showToast('هذه الوحدة موجودة بالفعل.', 'error');
            return data.unitDefinitions.find(u => u.name === name)!;
        }
        
        const newUnit: UnitDefinition = { id: `unit-${data.sequences.unit}`, name };
        dispatch({ type: 'ADD_UNIT_DEFINITION', payload: {
            newUnit,
            log: createActivityLog('إضافة وحدة قياس', `تمت إضافة الوحدة ${name}`)
        }});
        return newUnit;
    }, [data.unitDefinitions, data.sequences.unit, createActivityLog, showToast]);
    
    const addJournalEntry = useCallback((entry: Omit<JournalEntry, 'id'>): JournalEntry => {
        const newIdNumber = data.sequences.journal;
        const newEntry = { ...entry, id: `JV-${String(newIdNumber).padStart(3, '0')}` };

        const newChart = JSON.parse(JSON.stringify(data.chartOfAccounts));
        newEntry.lines.forEach(line => {
            const amount = line.debit - line.credit;
            updateBalancesRecursively(newChart, line.accountId, amount);
        });

        dispatch({ type: 'ADD_JOURNAL_ENTRY', payload: {
            newEntry,
            chartOfAccounts: newChart,
            log: createActivityLog('إضافة قيد يومية', `تمت إضافة القيد رقم ${newEntry.id}`)
        }});
        return newEntry;
    }, [data.sequences.journal, data.chartOfAccounts, createActivityLog]);
    
    const archiveJournalEntry = useCallback((id: string, isArchiving: boolean = true) => {
        const entry = data.journal.find(j => j.id === id);
        if (!entry) return;
        if (entry.isArchived === isArchiving) return;
    
        const newChart = JSON.parse(JSON.stringify(data.chartOfAccounts));
        const factor = isArchiving ? -1 : 1;
        entry.lines.forEach(line => {
            const amountToApply = (line.debit - line.credit) * factor;
            updateBalancesRecursively(newChart, line.accountId, amountToApply);
        });
        
        const updatedJournal = data.journal.map(j => j.id === id ? {...j, isArchived: isArchiving} : j);
        const actionType = isArchiving ? 'ARCHIVE_JOURNAL_ENTRY' : 'UNARCHIVE_JOURNAL_ENTRY';
        const logAction = isArchiving ? 'أرشفة قيد يومية' : 'استعادة قيد يومية';

        dispatch({ type: actionType, payload: {
            updatedJournal,
            chartOfAccounts: newChart,
            log: createActivityLog(logAction, `تمت ${isArchiving ? 'أرشفة' : 'استعادة'} القيد رقم ${id}`)
        }});
    }, [data.journal, data.chartOfAccounts, createActivityLog]);

    const addSale = useCallback((sale: Omit<Sale, 'id' | 'journalEntryId'>): Sale => {
        const LOW_STOCK_THRESHOLD = 10;
        const newSaleId = `INV-${String(data.sequences.sale).padStart(3, '0')}`;
        const newJournalEntryId = `JV-${String(data.sequences.journal).padStart(3, '0')}`;
        
        let costOfGoodsSold = 0;
        const updatedInventory = JSON.parse(JSON.stringify(data.inventory));
        let notification: Notification | null = null;
        sale.items.forEach(line => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === line.itemId);
            if (item) {
                let quantityInBaseUnit = line.quantity;
                if (line.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === line.unitId);
                    if (packingUnit) quantityInBaseUnit = line.quantity * packingUnit.factor;
                }
                const oldStock = item.stock;
                item.stock -= quantityInBaseUnit;
                costOfGoodsSold += quantityInBaseUnit * item.purchasePrice;
                if(oldStock > LOW_STOCK_THRESHOLD && item.stock <= LOW_STOCK_THRESHOLD) {
                   notification = createNotification(`انخفاض مخزون الصنف "${line.itemName}" (${item.stock} متبقي)`, 'warning', '/inventory');
                }
            }
        });

        const updatedCustomers = data.customers.map(c => c.name === sale.customer ? {...c, balance: c.balance + sale.total} : c);

        const customerAccount = findAccountByCode(data.chartOfAccounts, '1103');
        const salesAccount = findAccountByCode(data.chartOfAccounts, '4101');
        const salesDiscountAccount = findAccountByCode(data.chartOfAccounts, '4102');
        const cogsAccount = findAccountByCode(data.chartOfAccounts, '4204');
        const inventoryAccount = findAccountByCode(data.chartOfAccounts, '1104');

        if (!customerAccount || !salesAccount || !salesDiscountAccount || !cogsAccount || !inventoryAccount) {
            const missing = [
                !customerAccount && "'العملاء (1103)'",
                !salesAccount && "'مبيعات محلية (4101)'",
                !salesDiscountAccount && "'خصومات المبيعات (4102)'",
                !cogsAccount && "'تكلفة البضاعة المباعة (4204)'",
                !inventoryAccount && "'المخزون (1104)'",
            ].filter(Boolean).join(', ');
            throw new Error(`حسابات نظام أساسية مفقودة: ${missing}. يرجى مراجعة شجرة الحسابات.`);
        }
        
        const journalEntryLines: JournalLine[] = [
            { accountId: customerAccount.id, accountName: customerAccount.name, debit: sale.total, credit: 0 },
            { accountId: salesDiscountAccount.id, accountName: salesDiscountAccount.name, debit: sale.totalDiscount, credit: 0 },
            { accountId: salesAccount.id, accountName: salesAccount.name, debit: 0, credit: sale.subtotal },
            { accountId: cogsAccount.id, accountName: cogsAccount.name, debit: costOfGoodsSold, credit: 0 },
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: 0, credit: costOfGoodsSold },
        ];
    
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(data.chartOfAccounts));
        journalEntryLines.forEach(line => {
            const amount = line.debit - line.credit;
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, amount);
        });
    
        const newJournalEntry: JournalEntry = {
            id: newJournalEntryId,
            date: sale.date, description: `فاتورة مبيعات رقم ${newSaleId}`,
            debit: sale.total + sale.totalDiscount + costOfGoodsSold, 
            credit: sale.subtotal + costOfGoodsSold, 
            status: 'مرحل',
            lines: journalEntryLines
        };
    
        const newSale: Sale = { ...sale, id: newSaleId, journalEntryId: newJournalEntryId };
        
        dispatch({ type: 'ADD_SALE', payload: {
            newSale, 
            updatedInventory, 
            updatedCustomers,
            journalEntry: newJournalEntry,
            updatedChartOfAccounts,
            log: createActivityLog('إضافة فاتورة مبيعات', `فاتورة رقم ${newSale.id} للعميل ${sale.customer}`),
            notification: notification || createNotification(`فاتورة مبيعات جديدة #${newSale.id}`, 'success', '/sales'),
        }});
    
        return newSale;
    }, [data.sequences.sale, data.sequences.journal, data.inventory, data.customers, data.chartOfAccounts, createActivityLog, createNotification]);
    
    const archiveSale = useCallback((id: string) => {
        const sale = data.sales.find(s => s.id === id);
        if (!sale || sale.isArchived) return { success: false, message: 'الفاتورة غير موجودة أو مؤرشفة بالفعل.' };

        const updatedInventory = JSON.parse(JSON.stringify(data.inventory));
        sale.items.forEach(line => {
            const item = updatedInventory.find(i => i.id === line.itemId);
            if (item) {
                let quantityInBaseUnit = line.quantity;
                if (line.unitId !== 'base') {
                    const packingUnit = item.units.find(u => u.id === line.unitId);
                    if (packingUnit) quantityInBaseUnit = line.quantity * packingUnit.factor;
                }
                item.stock += quantityInBaseUnit;
            }
        });
        const updatedCustomers = data.customers.map(c => c.name === sale.customer ? {...c, balance: c.balance - sale.total} : c);
        const updatedSales = data.sales.map(s => s.id === id ? {...s, isArchived: true} : s);
        
        // Logic for reversing journal entry
        const entryToReverse = data.journal.find(j => j.id === sale.journalEntryId);
        let updatedJournal = data.journal;
        let reversedChartOfAccounts = data.chartOfAccounts;
        if (entryToReverse) {
            const newChart = JSON.parse(JSON.stringify(data.chartOfAccounts));
            entryToReverse.lines.forEach(line => {
                const amountToReverse = line.credit - line.debit;
                updateBalancesRecursively(newChart, line.accountId, amountToReverse);
            });
            reversedChartOfAccounts = newChart;
            updatedJournal = data.journal.map(j => j.id === sale.journalEntryId ? {...j, isArchived: true} : j);
        }

        dispatch({ type: 'ARCHIVE_SALE', payload: {
            updatedSales, updatedInventory, updatedCustomers,
            updatedJournal, chartOfAccounts: reversedChartOfAccounts,
            log: createActivityLog('أرشفة فاتورة مبيعات', `تمت أرشفة الفاتورة رقم ${id}`),
        }});
        return { success: true };
    }, [data.sales, data.inventory, data.customers, data.journal, data.chartOfAccounts, createActivityLog]);

    const addPurchase = useCallback((purchase: Omit<Purchase, 'id' | 'journalEntryId'>) => {
        const newPurchaseId = `BILL-${String(data.sequences.purchase).padStart(3, '0')}`;
        const newJournalEntryId = `JV-${String(data.sequences.journal).padStart(3, '0')}`;
        
        const updatedInventory = JSON.parse(JSON.stringify(data.inventory));
        purchase.items.forEach(line => {
            const item = updatedInventory.find((i: InventoryItem) => i.id === line.itemId);
            if (item) {
                let quantityInBaseUnit = line.quantity;
                if (line.unitId !== 'base') {
                    const packingUnit = item.units.find((u: PackingUnit) => u.id === line.unitId);
                    if (packingUnit) quantityInBaseUnit = line.quantity * packingUnit.factor;
                }
                item.stock += quantityInBaseUnit;
            }
        });
        const updatedSuppliers = data.suppliers.map(s => s.name === purchase.supplier ? {...s, balance: s.balance + purchase.total} : s);

        const inventoryAccount = findAccountByCode(data.chartOfAccounts, '1104');
        const supplierAccount = findAccountByCode(data.chartOfAccounts, '2101');
        const purchaseDiscountAccount = findAccountByCode(data.chartOfAccounts, '4103');

        if (!inventoryAccount || !supplierAccount || !purchaseDiscountAccount) {
            const missing = [
                !inventoryAccount && "'المخزون (1104)'",
                !supplierAccount && "'الموردين (2101)'",
                !purchaseDiscountAccount && "'خصومات المشتريات (4103)'",
            ].filter(Boolean).join(', ');
            throw new Error(`حسابات نظام أساسية مفقودة: ${missing}. يرجى مراجعة شجرة الحسابات.`);
        }

        const journalEntryLines: JournalLine[] = [
            { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: purchase.subtotal, credit: 0 },
            { accountId: supplierAccount.id, accountName: supplierAccount.name, debit: 0, credit: purchase.total },
            { accountId: purchaseDiscountAccount.id, accountName: purchaseDiscountAccount.name, debit: 0, credit: purchase.totalDiscount },
        ];
    
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(data.chartOfAccounts));
        journalEntryLines.forEach(line => {
            const amount = line.debit - line.credit;
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, amount);
        });
    
        const newJournalEntry: JournalEntry = {
            id: newJournalEntryId,
            date: purchase.date, description: `فاتورة مشتريات رقم ${newPurchaseId}`,
            debit: purchase.subtotal, 
            credit: purchase.total + purchase.totalDiscount, 
            status: 'مرحل',
            lines: journalEntryLines,
        };
    
        const newPurchase: Purchase = { ...purchase, id: newPurchaseId, journalEntryId: newJournalEntryId };
        
        dispatch({ type: 'ADD_PURCHASE', payload: {
            newPurchase, 
            updatedInventory, 
            updatedSuppliers,
            journalEntry: newJournalEntry,
            updatedChartOfAccounts,
            log: createActivityLog('إضافة فاتورة مشتريات', `فاتورة رقم ${newPurchase.id} للمورد ${purchase.supplier}`)
        }});
    
        return newPurchase;
    }, [data.sequences.purchase, data.sequences.journal, data.inventory, data.suppliers, data.chartOfAccounts, createActivityLog]);
    
    const archivePurchase = useCallback((id: string) => {
        const purchase = data.purchases.find(p => p.id === id);
        if (!purchase || purchase.isArchived) return { success: false, message: 'الفاتورة غير موجودة أو مؤرشفة بالفعل.' };

        const updatedInventory = JSON.parse(JSON.stringify(data.inventory));
        purchase.items.forEach(line => {
            const item = updatedInventory.find(i => i.id === line.itemId);
            if (item) {
                let quantityInBaseUnit = line.quantity;
                if (line.unitId !== 'base') {
                    const packingUnit = item.units.find(u => u.id === line.unitId);
                    if (packingUnit) quantityInBaseUnit = line.quantity * packingUnit.factor;
                }
                item.stock -= quantityInBaseUnit;
            }
        });
        const updatedSuppliers = data.suppliers.map(s => s.name === purchase.supplier ? {...s, balance: s.balance - purchase.total} : s);
        const updatedPurchases = data.purchases.map(p => p.id === id ? {...p, isArchived: true} : p);
        
        const entryToReverse = data.journal.find(j => j.id === purchase.journalEntryId);
        let updatedJournal = data.journal;
        let reversedChartOfAccounts = data.chartOfAccounts;
        if (entryToReverse) {
            const newChart = JSON.parse(JSON.stringify(data.chartOfAccounts));
            entryToReverse.lines.forEach(line => {
                updateBalancesRecursively(newChart, line.accountId, line.credit - line.debit);
            });
            reversedChartOfAccounts = newChart;
            updatedJournal = data.journal.map(j => j.id === purchase.journalEntryId ? {...j, isArchived: true} : j);
        }
        dispatch({ type: 'ARCHIVE_PURCHASE', payload: {
            updatedPurchases, updatedInventory, updatedSuppliers,
            updatedJournal, chartOfAccounts: reversedChartOfAccounts,
            log: createActivityLog('أرشفة فاتورة مشتريات', `تمت أرشفة الفاتورة رقم ${id}`),
        }});
        return { success: true };
    }, [data.purchases, data.inventory, data.suppliers, data.journal, data.chartOfAccounts, createActivityLog]);

    const addTreasuryTransaction = useCallback((tr: Omit<TreasuryTransaction, 'id' | 'balance' | 'journalEntryId'>) => {
        const newId = `TRN-${String(data.sequences.treasury).padStart(3, '0')}`;
        const newJournalEntryId = `JV-${String(data.sequences.journal).padStart(3, '0')}`;
        
        const customerAccount = findAccountByCode(data.chartOfAccounts, '1103');
        const supplierAccount = findAccountByCode(data.chartOfAccounts, '2101');

        let contraAccountId: string, contraAccountName: string;
        let updatedCustomers: Customer[] | undefined;
        let updatedSuppliers: Supplier[] | undefined;

        if (tr.partyType === 'customer') {
            if (!customerAccount) throw new Error("حساب العملاء الرئيسي (1103) مفقود.");
            contraAccountId = customerAccount.id;
            contraAccountName = customerAccount.name;
            updatedCustomers = data.customers.map(c => c.id === tr.partyId ? {...c, balance: c.balance + (tr.type === 'سند صرف' ? Math.abs(tr.amount) : -Math.abs(tr.amount))} : c);
        } else if (tr.partyType === 'supplier') {
            if (!supplierAccount) throw new Error("حساب الموردين الرئيسي (2101) مفقود.");
            contraAccountId = supplierAccount.id;
            contraAccountName = supplierAccount.name;
            updatedSuppliers = data.suppliers.map(s => s.id === tr.partyId ? {...s, balance: s.balance + (tr.type === 'سند صرف' ? -Math.abs(tr.amount) : Math.abs(tr.amount))} : s);
        } else {
             const account = findAccountById(data.chartOfAccounts, tr.partyId!);
             if (!account) throw new Error(`الحساب المحدد بالمعرف ${tr.partyId} غير موجود.`);
             contraAccountId = account.id;
             contraAccountName = account.name;
        }
        
        const journalEntryLines: JournalLine[] = tr.type === 'سند قبض' ? [
            { accountId: tr.treasuryAccountId, accountName: tr.treasuryAccountName, debit: Math.abs(tr.amount), credit: 0 },
            { accountId: contraAccountId, accountName: contraAccountName, debit: 0, credit: Math.abs(tr.amount) },
        ] : [
            { accountId: contraAccountId, accountName: contraAccountName, debit: Math.abs(tr.amount), credit: 0 },
            { accountId: tr.treasuryAccountId, accountName: tr.treasuryAccountName, debit: 0, credit: Math.abs(tr.amount) },
        ];
    
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(data.chartOfAccounts));
        journalEntryLines.forEach(line => {
            const amount = line.debit - line.credit;
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, amount);
        });
    
        const newJournalEntry: JournalEntry = {
            id: newJournalEntryId,
            date: tr.date, description: tr.description, status: 'مرحل',
            debit: Math.abs(tr.amount), credit: Math.abs(tr.amount),
            lines: journalEntryLines,
        };
        
        const amountForTreasury = tr.type === 'سند صرف' ? -Math.abs(tr.amount) : Math.abs(tr.amount);
        const newTransaction: TreasuryTransaction = { ...tr, id: newId, balance: 0, amount: amountForTreasury, journalEntryId: newJournalEntryId };
        
        dispatch({ type: 'ADD_TREASURY_TRANSACTION', payload: {
            newTransaction, 
            updatedCustomers, 
            updatedSuppliers,
            journalEntry: newJournalEntry,
            updatedChartOfAccounts,
            log: createActivityLog('إضافة حركة خزينة', `${tr.type} بمبلغ ${tr.amount} في ${tr.treasuryAccountName}`),
        }});
        return newTransaction;
    }, [data.sequences.treasury, data.sequences.journal, data.chartOfAccounts, data.customers, data.suppliers, createActivityLog, findAccountById]);
    
    const treasuriesList = useMemo(() => {
        const treasuryRoot = findAccountByCode(data.chartOfAccounts, '1101');
        if (!treasuryRoot) return [];
        return [
            { name: 'الخزينة (الإجمالي)', id: treasuryRoot.id, balance: treasuryRoot.balance || 0, isTotal: true },
            ...(treasuryRoot.children || [])
        ];
    }, [data.chartOfAccounts]);

    const transferTreasuryFunds = useCallback((fromTreasuryId: string, toTreasuryId: string, amount: number, notes?: string) => {
        const fromTreasury = treasuriesList.find((t: any) => t.id === fromTreasuryId);
        const toTreasury = treasuriesList.find((t: any) => t.id === toTreasuryId);
        if (!fromTreasury || !toTreasury) { showToast('لم يتم العثور على الخزائن المحددة.', 'error'); return; }

        const description = `تحويل من ${fromTreasury.name} إلى ${toTreasury.name}${notes ? ` - ${notes}` : ''}`;
        addTreasuryTransaction({ 
            date: new Date().toISOString().slice(0, 10), 
            type: 'سند صرف', treasuryAccountId: fromTreasuryId, treasuryAccountName: fromTreasury.name, 
            description, amount, partyType: 'account', partyId: toTreasuryId 
        });
    }, [addTreasuryTransaction, treasuriesList, showToast]);

    const addInventoryAdjustment = useCallback((adjustment: Omit<InventoryAdjustment, 'id' | 'journalEntryId'>): InventoryAdjustment => {
        const newId = `ADJ-${String(data.sequences.inventoryAdjustment).padStart(3, '0')}`;
        const newJournalEntryId = `JV-${String(data.sequences.journal).padStart(3, '0')}`;
        
        const inventoryAccount = findAccountByCode(data.chartOfAccounts, '1104');
        if (!inventoryAccount) throw new Error("حساب المخزون الرئيسي (1104) مفقود.");
        
        const updatedInventory = JSON.parse(JSON.stringify(data.inventory));
        adjustment.items.forEach(line => {
            const item = updatedInventory.find(i => i.id === line.itemId);
            if (item) item.stock += (adjustment.type === 'إضافة' ? line.quantity : -line.quantity);
        });
    
        const journalLines: JournalLine[] = adjustment.type === 'صرف'
            ? [
                { accountId: adjustment.contraAccountId, accountName: adjustment.contraAccountName, debit: adjustment.totalValue, credit: 0 },
                { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: 0, credit: adjustment.totalValue }
              ]
            : [
                { accountId: inventoryAccount.id, accountName: inventoryAccount.name, debit: adjustment.totalValue, credit: 0 },
                { accountId: adjustment.contraAccountId, accountName: adjustment.contraAccountName, debit: 0, credit: adjustment.totalValue }
              ];
        
        const updatedChartOfAccounts = JSON.parse(JSON.stringify(data.chartOfAccounts));
        journalLines.forEach(line => {
            const amount = line.debit - line.credit;
            updateBalancesRecursively(updatedChartOfAccounts, line.accountId, amount);
        });
    
        const newJournalEntry: JournalEntry = {
            id: newJournalEntryId,
            date: adjustment.date, 
            description: `تسوية مخزون رقم ${newId}: ${adjustment.description}`,
            debit: adjustment.totalValue, 
            credit: adjustment.totalValue, 
            status: 'مرحل', 
            lines: journalLines,
        };
        
        const newAdjustment: InventoryAdjustment = { ...adjustment, id: newId, journalEntryId: newJournalEntryId };
        
        dispatch({ type: 'ADD_INVENTORY_ADJUSTMENT', payload: {
            newAdjustment, 
            updatedInventory,
            journalEntry: newJournalEntry,
            updatedChartOfAccounts,
            log: createActivityLog('إضافة تسوية مخزون', `تمت إضافة التسوية رقم ${newId}`)
        }});
        showToast('تمت إضافة تسوية المخزون بنجاح.');
        return newAdjustment;
    }, [data.sequences.inventoryAdjustment, data.sequences.journal, data.inventory, data.chartOfAccounts, createActivityLog, showToast]);

    const archiveInventoryAdjustment = useCallback((id: string) => {
        const adj = data.inventoryAdjustments.find(a => a.id === id);
        if (!adj || adj.isArchived) return { success: false, message: 'التسوية غير موجودة أو مؤرشفة.' };
    
        const updatedInventory = JSON.parse(JSON.stringify(data.inventory));
        adj.items.forEach(line => {
            const item = updatedInventory.find(i => i.id === line.itemId);
            if (item) item.stock -= (adj.type === 'إضافة' ? line.quantity : -line.quantity);
        });
        const updatedAdjustments = data.inventoryAdjustments.map(a => a.id === id ? {...a, isArchived: true} : a);

        const entryToReverse = data.journal.find(j => j.id === adj.journalEntryId);
        let updatedJournal = data.journal;
        let reversedChartOfAccounts = data.chartOfAccounts;
        if(entryToReverse){
            const newChart = JSON.parse(JSON.stringify(data.chartOfAccounts));
            entryToReverse.lines.forEach(line => { updateBalancesRecursively(newChart, line.accountId, line.credit - line.debit); });
            reversedChartOfAccounts = newChart;
            updatedJournal = data.journal.map(j => j.id === adj.journalEntryId ? {...j, isArchived: true} : j);
        }

        dispatch({ type: 'ARCHIVE_INVENTORY_ADJUSTMENT', payload: {
            updatedAdjustments, updatedInventory,
            updatedJournal, chartOfAccounts: reversedChartOfAccounts,
            log: createActivityLog('أرشفة تسوية مخزون', `تمت أرشفة التسوية رقم ${id}`)
        }});
        return { success: true };
    }, [data.inventoryAdjustments, data.inventory, data.journal, data.chartOfAccounts, createActivityLog]);

    const genericCRUD = useCallback((domain: string, action: 'add' | 'update' | 'archive' | 'unarchive', payload: any) => {
        const domainPlural = `${domain}s`;
        const stateDomain = (data as any)[domainPlural];
        let newDomainState;
        let logAction = '';
        let logDetails = '';

        let newSequence;

        switch(action) {
            case 'add':
                const newIdNumber = (data.sequences as any)[domain]++;
                const newItem = { ...payload, id: `${domain.toUpperCase().substring(0,3)}-${String(newIdNumber).padStart(3, '0')}` };
                newDomainState = [...stateDomain, newItem];
                logAction = `إضافة ${domain}`;
                logDetails = `تمت إضافة ${payload.name}`;
                newSequence = newIdNumber + 1;
                break;
            case 'update':
                newDomainState = stateDomain.map((i: any) => i.id === payload.id ? { ...i, ...payload } : i);
                logAction = `تعديل ${domain}`;
                logDetails = `تم تعديل ${payload.name}`;
                break;
            case 'archive':
                newDomainState = stateDomain.map((i: any) => i.id === payload.id ? { ...i, isArchived: true } : i);
                logAction = `أرشفة ${domain}`;
                logDetails = `تمت أرشفة ${payload.name}`;
                break;
            case 'unarchive':
                newDomainState = stateDomain.map((i: any) => i.id === payload.id ? { ...i, isArchived: false } : i);
                logAction = `استعادة ${domain}`;
                logDetails = `تمت استعادة ${payload.name}`;
                break;
        }

        dispatch({
            type: `${action.toUpperCase()}_${domain.toUpperCase()}`,
            payload: {
                [domainPlural]: newDomainState,
                log: createActivityLog(logAction, logDetails),
                newSequence,
            }
        });
        return newDomainState[newDomainState.length - 1];

    }, [data.sequences, createActivityLog]);
    
    // --- CRUD with Sequential Numbering ---
    const addUser = (user: Omit<User, 'id'>) => {
        const newUser = { ...user, id: `U${data.users.length + 1}` };
        dispatch({ type: 'ADD_USER', payload: { users: [...data.users, newUser], log: createActivityLog('إضافة مستخدم', `تمت إضافة المستخدم ${user.name}`) } });
    };
    const updateUser = (updatedUser: Partial<User> & { id: string }) => {
        dispatch({ type: 'UPDATE_USER', payload: { users: data.users.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u), log: createActivityLog('تعديل مستخدم', `تم تعديل بيانات المستخدم ${updatedUser.name}`) } });
    };
    const archiveUser = (id: string) => {
        if (currentUser?.id === id) return { success: false, message: 'لا يمكن أرشفة المستخدم الحالي.' };
        dispatch({ type: 'ARCHIVE_USER', payload: { users: data.users.map(u => u.id === id ? { ...u, isArchived: true } : u), log: createActivityLog('أرشفة مستخدم', `تمت أرشفة المستخدم صاحب المعرف ${id}`) } });
        return { success: true };
    };
    const unarchiveUser = (id:string) => dispatch({ type: 'UNARCHIVE_USER', payload: { users: data.users.map(u => u.id === id ? { ...u, isArchived: false } : u), log: createActivityLog('إلغاء أرشفة مستخدم', `تم إلغاء أرشفة المستخدم صاحب المعرف ${id}`) } });
    
    const addCustomer = (customer: Omit<Customer, 'id'>): Customer => {
        const newIdNumber = data.sequences.customer;
        const newCustomer = { ...customer, id: `CUS-${String(newIdNumber).padStart(3, '0')}` };
        dispatch({ type: 'ADD_CUSTOMER', payload: { customers: [...data.customers, newCustomer], newSequence: newIdNumber + 1, log: createActivityLog('إضافة عميل', `تمت إضافة العميل ${customer.name}`) } });
        return newCustomer;
    };
    const updateCustomer = (updatedCustomer: Customer) => {
        dispatch({ type: 'UPDATE_CUSTOMER', payload: { customers: data.customers.map(c => c.id === updatedCustomer.id ? updatedCustomer : c), log: createActivityLog('تعديل عميل', `تم تعديل بيانات العميل ${updatedCustomer.name}`) } });
    };
    const archiveCustomer = (id: string) => {
        const customer = data.customers.find(c => c.id === id);
        if (!customer) return { success: false, message: 'العميل غير موجود.' };
        if (customer.balance !== 0) return { success: false, message: 'لا يمكن أرشفة عميل رصيده لا يساوي صفر.' };
        dispatch({ type: 'ARCHIVE_CUSTOMER', payload: { customers: data.customers.map(c => c.id === id ? {...c, isArchived: true} : c), log: createActivityLog('أرشفة عميل', `تمت أرشفة العميل ${customer.name}`) } });
        return { success: true };
    };
    const unarchiveCustomer = (id: string) => {
        dispatch({ type: 'UNARCHIVE_CUSTOMER', payload: { customers: data.customers.map(c => c.id === id ? {...c, isArchived: false} : c), log: createActivityLog('استعادة عميل', `تمت استعادة العميل صاحب المعرف ${id}`) } });
    };

    const addSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
        const newIdNumber = data.sequences.supplier;
        const newSupplier = { ...supplier, id: `SUP-${String(newIdNumber).padStart(3, '0')}` };
        dispatch({ type: 'ADD_SUPPLIER', payload: { suppliers: [...data.suppliers, newSupplier], newSequence: newIdNumber + 1, log: createActivityLog('إضافة مورد', `تمت إضافة المورد ${supplier.name}`) } });
        return newSupplier;
    };
    const updateSupplier = useCallback((supplier: Supplier) => {}, []);
    const archiveSupplier = (id: string) => {
        const supplier = data.suppliers.find(c => c.id === id);
        if (!supplier) return { success: false, message: 'المورد غير موجود.' };
        if (supplier.balance !== 0) return { success: false, message: 'لا يمكن أرشفة مورد رصيده لا يساوي صفر.' };
        dispatch({ type: 'ARCHIVE_SUPPLIER', payload: { suppliers: data.suppliers.map(s => s.id === id ? {...s, isArchived: true} : s), log: createActivityLog('أرشفة مورد', `تمت أرشفة المورد ${supplier.name}`) } });
        return { success: true };
    };
    const unarchiveSupplier = (id:string) => {
        dispatch({ type: 'UNARCHIVE_SUPPLIER', payload: { suppliers: data.suppliers.map(s => s.id === id ? {...s, isArchived: false} : s), log: createActivityLog('إلغاء أرشفة مورد', `تم إلغاء أرشفة المورد صاحب المعرف ${id}`) } });
    };

    const addItem = (item: Omit<InventoryItem, 'id'>): InventoryItem => {
        const newIdNumber = data.sequences.item;
        const newPackingUnitStart = data.sequences.packingUnit;
        const newPackingUnits = (item.units || []).map((p, index) => ({ ...p, id: `PU-${newPackingUnitStart + index}` }));
        const newItem = { ...item, id: `ITM-${String(newIdNumber).padStart(3, '0')}`, units: newPackingUnits };
        
        dispatch({ type: 'ADD_ITEM', payload: {
            inventory: [newItem, ...data.inventory],
            newSequences: { ...data.sequences, item: newIdNumber + 1, packingUnit: newPackingUnitStart + newPackingUnits.length },
            log: createActivityLog('إضافة صنف', `تمت إضافة الصنف ${item.name}`),
        }});
        return newItem;
    };
    const updateItem = (updatedItem: InventoryItem) => {
        dispatch({ type: 'UPDATE_ITEM', payload: {
            inventory: data.inventory.map(i => i.id === updatedItem.id ? updatedItem : i),
            log: createActivityLog('تعديل صنف', `تم تعديل بيانات الصنف ${updatedItem.name}`),
        }});
        showToast(`تم تحديث الصنف "${updatedItem.name}" بنجاح.`);
    };
    const archiveItem = (id: string) => {
        const item = data.inventory.find(i => i.id === id);
        if (!item) return { success: false, message: "الصنف غير موجود." };
        if (item.stock !== 0) return { success: false, message: "لا يمكن أرشفة صنف رصيده لا يساوي صفر." };
        dispatch({ type: 'ARCHIVE_ITEM', payload: { inventory: data.inventory.map(i => i.id === id ? {...i, isArchived: true} : i), log: createActivityLog('أرشفة صنف', `تمت أرشفة الصنف ${item.name}`) } });
        return { success: true };
    };
    const unarchiveItem = (id: string) => {
        dispatch({ type: 'UNARCHIVE_ITEM', payload: { inventory: data.inventory.map(i => i.id === id ? {...i, isArchived: false} : i), log: createActivityLog('إلغاء أرشفة صنف', `تم إلغاء أرشفة الصنف صاحب المعرف ${id}`) } });
    };
    
    // --- Derived Data ---
    const totalCashBalance = useMemo(() => {
        const treasuryRoot = findAccountByCode(data.chartOfAccounts, '1101');
        if (!treasuryRoot) {
            return 0;
        }
        return (treasuryRoot.children || []).reduce((sum, child) => sum + (child.balance || 0), 0);
    }, [data.chartOfAccounts]);
    const totalReceivables = useMemo(() => data.customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0), [data.customers]);
    const totalPayables = useMemo(() => data.suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0), [data.suppliers]);
    const inventoryValue = useMemo(() => data.inventory.reduce((sum, i) => sum + (i.stock * i.purchasePrice), 0), [data.inventory]);
    const recentTransactions: RecentTransaction[] = useMemo(() => {
        const latestSales = data.sales.filter(s => !s.isArchived).slice(0, 3).map(s => ({ type: 'sale' as const, id: s.id, date: s.date, partyName: s.customer, total: s.total, status: s.status }));
        const latestPurchases = data.purchases.filter(p => !p.isArchived).slice(0, 3).map(p => ({ type: 'purchase' as const, id: p.id, date: p.date, partyName: p.supplier, total: p.total, status: p.status }));
        return [...latestSales, ...latestPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [data.sales, data.purchases]);
    const topCustomers = useMemo(() => [...data.customers].sort((a,b) => b.balance - a.balance).slice(0, 5), [data.customers]);
    
    // Memoize all filtered data to prevent unnecessary re-renders
    const activeData = useMemo(() => ({
        customers: data.customers.filter(c => !c.isArchived),
        suppliers: data.suppliers.filter(s => !s.isArchived),
        inventory: data.inventory.filter(i => !i.isArchived),
        inventoryAdjustments: data.inventoryAdjustments.filter(i => !i.isArchived),
        sales: data.sales.filter(s => !s.isArchived),
        purchases: data.purchases.filter(p => !p.isArchived),
        saleReturns: data.saleReturns.filter(sr => !sr.isArchived),
        purchaseReturns: data.purchaseReturns.filter(pr => !pr.isArchived),
        users: data.users.filter(u => !u.isArchived),
        fixedAssets: data.fixedAssets.filter(fa => !fa.isArchived),
        journal: data.journal.filter(j => !j.isArchived),
    }), [data]);
    
    const archivedData = useMemo(() => ({
        customers: data.customers.filter(c => c.isArchived),
        suppliers: data.suppliers.filter(s => s.isArchived),
        inventory: data.inventory.filter(i => i.isArchived),
        inventoryAdjustments: data.inventoryAdjustments.filter(i => i.isArchived),
        sales: data.sales.filter(s => s.isArchived),
        purchases: data.purchases.filter(p => p.isArchived),
        saleReturns: data.saleReturns.filter(sr => sr.isArchived),
        purchaseReturns: data.purchaseReturns.filter(pr => pr.isArchived),
        users: data.users.filter(u => u.isArchived),
        fixedAssets: data.fixedAssets.filter(fa => fa.isArchived),
        journal: data.journal.filter(j => j.isArchived),
    }), [data]);

    const updateCompanyInfo = (info: any) => dispatch({ type: 'UPDATE_COMPANY_INFO', payload: info });
    const updatePrintSettings = (settings: PrintSettings) => dispatch({ type: 'UPDATE_PRINT_SETTINGS', payload: settings });
    const updateFinancialYear = (fy: any) => dispatch({ type: 'UPDATE_FINANCIAL_YEAR', payload: fy });
    
    const resetTransactionalData = useCallback(() => {
        const resetState = {
            journal: [],
            inventory: data.inventory.map((item: InventoryItem) => ({ ...item, stock: 0 })),
            inventoryAdjustments: [],
            sales: [],
            purchases: [],
            saleReturns: [],
            purchaseReturns: [],
            treasury: [],
            customers: data.customers.map((c: Customer) => ({ ...c, balance: 0 })),
            suppliers: data.suppliers.map((s: Supplier) => ({ ...s, balance: 0 })),
            fixedAssets: data.fixedAssets.map((fa: FixedAsset) => ({ ...fa, accumulatedDepreciation: 0, bookValue: fa.cost })),
            activityLog: [],
            notifications: [],
            chartOfAccounts: resetAccountBalances(data.chartOfAccounts),
            sequences: seedData.sequencesData,
        };

        dispatch({
            type: 'RESET_TRANSACTIONAL_DATA',
            payload: {
                ...resetState,
                log: createActivityLog('إعادة ضبط البيانات', 'تم حذف جميع البيانات الحركية في النظام.')
            }
        });

        showToast('تمت إعادة ضبط جميع البيانات بنجاح.');
    }, [data.inventory, data.customers, data.suppliers, data.fixedAssets, data.chartOfAccounts, createActivityLog, showToast]);


    // Placeholder for other functions
    const updateAccount = (data: any) => {};
    const archiveAccount = (id: string) => ({ success: true });
    const updateJournalEntry = (entry: any) => {};
    const updateSale = (sale: any) => {};
    const updatePurchase = (purchase: any) => {};
    const addFixedAsset = (asset: any) => {};
    const updateFixedAsset = (asset: any) => {};
    const archiveFixedAsset = (id: string) => ({ success: true });
    const unarchiveFixedAsset = (id: string) => {};
    const addSaleReturn = useCallback((sr: Omit<SaleReturn, 'id'>) => ({...sr, id:'1'}), []);
    const archiveSaleReturn = useCallback((id: string) => ({ success: true }), []);
    const addPurchaseReturn = useCallback((pr: Omit<PurchaseReturn, 'id'>) => ({...pr, id:'1'}), []);
    const archivePurchaseReturn = useCallback((id: string) => ({ success: true }), []);
    const unarchiveInventoryAdjustment = useCallback((id:string) => ({ success: true }), []);
    
    const switchDataset = (key: string) => {
        setDataManager(prev => ({...prev, activeDatasetKey: key}));
        window.location.reload();
    };
    const renameDataset = async (key: string, name: string) => {
        const newManager = { ...dataManager, datasets: dataManager.datasets.map(ds => ds.key === key ? {...ds, name} : ds) };
        await set('dataManager', newManager);
        setDataManager(newManager);
    };
    
    const importData = useCallback(async (importedData: any) => {
        try {
            if (!dataManager.activeDatasetKey) {
                showToast('لا يوجد قاعدة بيانات نشطة للاستيراد إليها.', 'error');
                return;
            }
            await set(dataManager.activeDatasetKey, importedData);
            showToast('تم استيراد البيانات بنجاح! سيتم إعادة تحميل التطبيق الآن.');
            setTimeout(() => {
                window.location.reload();
            }, 2000);
        } catch (error) {
            console.error("Failed to import data:", error);
            showToast('فشل استيراد البيانات.', 'error');
        }
    }, [dataManager.activeDatasetKey, showToast]);

    const contextValue = {
        isDataLoaded, hasData, currentUser, saveStatus, toast, showToast,
        dataManager, createNewDataset, switchDataset, renameDataset, importData,
        data,
        resetTransactionalData,
        login, logout,
        companyInfo: data.companyInfo, updateCompanyInfo,
        printSettings: data.printSettings, updatePrintSettings,
        financialYear: data.financialYear, updateFinancialYear,
        chartOfAccounts: data.chartOfAccounts, addAccount, updateAccount, archiveAccount, updateAllOpeningBalances,
        unitDefinitions: data.unitDefinitions, addUnitDefinition,
        journal: activeData.journal, archivedJournal: archivedData.journal,
        addJournalEntry, updateJournalEntry, archiveJournalEntry: (id: string) => archiveJournalEntry(id, true), unarchiveJournalEntry: (id: string) => archiveJournalEntry(id, false),
        inventory: activeData.inventory, archivedInventory: archivedData.inventory,
        addItem, updateItem, archiveItem, unarchiveItem,
        inventoryAdjustments: activeData.inventoryAdjustments, addInventoryAdjustment, archiveInventoryAdjustment, unarchiveInventoryAdjustment,
        sales: activeData.sales, archivedSales: archivedData.sales,
        addSale, updateSale, archiveSale, unarchiveSale: () => {},
        purchases: activeData.purchases, archivedPurchases: archivedData.purchases,
        addPurchase, updatePurchase, archivePurchase, unarchivePurchase: () => {},
        saleReturns: activeData.saleReturns, archivedSaleReturns: archivedData.saleReturns,
        addSaleReturn, archiveSaleReturn, unarchiveSaleReturn: () => {},
        purchaseReturns: activeData.purchaseReturns, archivedPurchaseReturns: archivedData.purchaseReturns,
        addPurchaseReturn, archivePurchaseReturn, unarchivePurchaseReturn: () => {},
        treasury: data.treasury, addTreasuryTransaction, treasuriesList, transferTreasuryFunds,
        customers: activeData.customers, archivedCustomers: archivedData.customers, addCustomer, updateCustomer, archiveCustomer, unarchiveCustomer,
        suppliers: activeData.suppliers, archivedSuppliers: archivedData.suppliers,
        addSupplier, updateSupplier, archiveSupplier, unarchiveSupplier,
        users: activeData.users, archivedUsers: archivedData.users,
        addUser, updateUser, archiveUser, unarchiveUser,
        fixedAssets: activeData.fixedAssets, archivedFixedAssets: archivedData.fixedAssets,
        addFixedAsset, updateFixedAsset, archiveFixedAsset, unarchiveFixedAsset,
        activityLog: data.activityLog,
        notifications: data.notifications, markNotificationAsRead, markAllNotificationsAsRead,
        sequences: data.sequences,
        // Derived data
        totalReceivables, totalPayables, inventoryValue, recentTransactions, topCustomers, totalCashBalance,
    };

    return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};