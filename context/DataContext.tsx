import React, { createContext, useState, useEffect, useCallback, useMemo } from 'react';
import { get, set } from './idb-keyval';
import * as seedData from '../data/initialSeedData';
import type {
    AccountNode,
    ActivityLogEntry,
    CompanyInfo,
    Customer,
    FinancialYear,
    FixedAsset,
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

const updateNodeBalanceInTree = (nodes: AccountNode[], accountId: string, balance: number): boolean => {
    for (const node of nodes) {
        if (node.id === accountId) {
            node.balance = balance;
            return true;
        }
        if (node.children) {
            if (updateNodeBalanceInTree(node.children, accountId, balance)) {
                return true;
            }
        }
    }
    return false;
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


export const DataContext = createContext<any>(null);

// Helper function to update an account's balance and propagate the change up to its parents
const updateBalancesRecursively = (nodes: AccountNode[], accountId: string, amount: number): { updated: boolean; change: number } => {
    let totalChange = 0;
    let nodeUpdatedInChildren = false;

    for (const node of nodes) {
        // Base case: Found the target node
        if (node.id === accountId) {
            node.balance = (node.balance || 0) + amount;
            return { updated: true, change: amount };
        }

        // Recursive step: Search in children
        if (node.children) {
            const result = updateBalancesRecursively(node.children, accountId, amount);
            if (result.updated) {
                // If a child was updated, update this parent node's balance
                node.balance = (node.balance || 0) + result.change;
                nodeUpdatedInChildren = true; // Mark that an update happened in this branch
                totalChange += result.change; // Propagate the change amount up
            }
        }
    }
    
    return { updated: nodeUpdatedInChildren, change: totalChange };
};


export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    // App state
    const [isDataLoaded, setIsDataLoaded] = useState(false);
    const [hasData, setHasData] = useState(false);
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
    const [toast, setToast] = useState({ show: false, message: '', type: 'success' });
    const [dataManager, setDataManager] = useState({ activeDatasetKey: '', datasets: [] as { key: string, name: string }[] });

    // Data state
    const [companyInfo, setCompanyInfo] = useState<CompanyInfo>(seedData.companyInfo);
    const [printSettings, setPrintSettings] = useState<PrintSettings>(seedData.printSettingsData);
    const [financialYear, setFinancialYear] = useState<FinancialYear>(seedData.financialYearData);
    const [chartOfAccounts, setChartOfAccounts] = useState<AccountNode[]>(seedData.chartOfAccountsData);
    const [sequences, setSequences] = useState<typeof seedData.sequencesData>(seedData.sequencesData);
    const [unitDefinitions, setUnitDefinitions] = useState<UnitDefinition[]>(seedData.unitDefinitionsData);
    const [journal, setJournal] = useState<JournalEntry[]>(seedData.journalData);
    const [inventory, setInventory] = useState<InventoryItem[]>(seedData.inventoryData);
    const [sales, setSales] = useState<Sale[]>(seedData.salesData);
    const [purchases, setPurchases] = useState<Purchase[]>(seedData.purchasesData);
    const [saleReturns, setSaleReturns] = useState<SaleReturn[]>(seedData.saleReturnsData);
    const [purchaseReturns, setPurchaseReturns] = useState<PurchaseReturn[]>(seedData.purchaseReturnsData);
    const [treasury, setTreasury] = useState<TreasuryTransaction[]>(seedData.treasuryData);
    const [customers, setCustomers] = useState<Customer[]>(seedData.customersData);
    const [suppliers, setSuppliers] = useState<Supplier[]>(seedData.suppliersData);
    const [users, setUsers] = useState<User[]>(seedData.usersData);
    const [fixedAssets, setFixedAssets] = useState<FixedAsset[]>(seedData.fixedAssetsData);
    const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>(seedData.activityLogData);
    const [notifications, setNotifications] = useState<Notification[]>(seedData.notificationsData);

    const showToast = (message: string, type = 'success') => {
        setToast({ show: true, message, type });
        setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 3000);
    };
    
    // --- Data Persistence ---

    const saveAllData = useCallback(async (key: string, data: any) => {
        if (!key) return;
        try {
            setSaveStatus('saving');
            await set(key, data);
            setSaveStatus('saved');
            setTimeout(() => setSaveStatus('idle'), 2000);
        } catch (e) {
            console.error("Error saving data:", e);
            setSaveStatus('error');
            showToast('خطأ في حفظ البيانات!', 'error');
        }
    }, [showToast]);

    const debouncedSave = useMemo(() => debounce(saveAllData, 1500), [saveAllData]);

    const loadDataset = useCallback(async (key: string) => {
        const data = await get<any>(key);
        if (data) {
            setCompanyInfo(data.companyInfo || seedData.companyInfo);
            
            const loadedPrintSettings = data.printSettings || seedData.printSettingsData;
            // Gracefully handle old data that might have a 'layout' property
            if (loadedPrintSettings.layout) {
                delete loadedPrintSettings.layout;
            }
            setPrintSettings({ ...seedData.printSettingsData, ...loadedPrintSettings });

            setFinancialYear(data.financialYear || seedData.financialYearData);
            setChartOfAccounts(data.chartOfAccounts || []);
            setSequences(data.sequences || seedData.sequencesData);
            setUnitDefinitions(data.unitDefinitions || seedData.unitDefinitionsData);
            setJournal(data.journal || []);
            const migratedInventory = (data.inventory || []).map((item: any) => ({
                ...item,
                units: item.units || [],
            }));
            setInventory(migratedInventory);
            setSales(data.sales || []);
            setPurchases(data.purchases || []);
            setSaleReturns(data.saleReturns || []);
            setPurchaseReturns(data.purchaseReturns || []);
            setTreasury(data.treasury || []);
            setCustomers(data.customers || []);
            setSuppliers(data.suppliers || []);
            setUsers(data.users || seedData.usersData);
            setFixedAssets(data.fixedAssets || []);
            setActivityLog(data.activityLog || []);
            setNotifications(data.notifications || []);
        }
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
            setIsDataLoaded(true);
        };
        initialize();
    }, [loadDataset]);

    // Autosave on data change
    useEffect(() => {
        if (isDataLoaded && hasData && dataManager.activeDatasetKey) {
            const allData = {
                companyInfo, printSettings, financialYear, chartOfAccounts, sequences, journal, inventory,
                sales, purchases, saleReturns, purchaseReturns, treasury,
                customers, suppliers, users, fixedAssets, activityLog, notifications, unitDefinitions
            };
            debouncedSave(dataManager.activeDatasetKey, allData);
        }
    }, [
        companyInfo, printSettings, financialYear, chartOfAccounts, sequences, journal, inventory, sales,
        purchases, saleReturns, purchaseReturns, treasury, customers, suppliers,
        users, fixedAssets, activityLog, notifications, unitDefinitions, isDataLoaded, hasData, dataManager.activeDatasetKey, debouncedSave
    ]);


    // --- Auth ---
    const login = (username: string, password: string): boolean => {
        const user = users.find(u => u.username === username && u.password === password && !u.isArchived);
        if (user) {
            setCurrentUser(user);
            return true;
        }
        return false;
    };
    const logout = () => setCurrentUser(null);
    
    // --- Utils ---
    const addActivityLog = useCallback((action: string, details: string) => {
        if (!currentUser) return;
        const newLog: ActivityLogEntry = {
            id: `LOG-${Date.now()}`,
            timestamp: new Date().toISOString(),
            userId: currentUser.id,
            username: currentUser.name,
            action,
            details,
        };
        setActivityLog(prev => [newLog, ...prev]);
    }, [currentUser]);

    // --- Notifications ---
    const addNotification = useCallback((message: string, type: 'info' | 'warning' | 'success', link?: string) => {
        const newNotification: Notification = {
            id: `NOTIF-${Date.now()}`,
            timestamp: new Date().toISOString(),
            message,
            type,
            link,
            read: false,
        };
        setNotifications(prev => [newNotification, ...prev].slice(0, 50)); // Keep last 50
    }, []);

    const markNotificationAsRead = (id: string) => {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    };

    const markAllNotificationsAsRead = () => {
        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    };


    // --- Data Management ---
    const createNewDataset = useCallback(async (name: string) => {
        const key = `dataset-${Date.now()}`;
        const newDataset = {
            companyInfo: { ...seedData.companyInfo, name },
            printSettings: seedData.printSettingsData,
            financialYear: seedData.financialYearData,
            chartOfAccounts: seedData.chartOfAccountsData,
            sequences: seedData.sequencesData,
            unitDefinitions: seedData.unitDefinitionsData,
            journal: seedData.journalData,
            inventory: seedData.inventoryData,
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
        await set(key, newDataset);
        const newManager = {
            activeDatasetKey: key,
            datasets: [...dataManager.datasets, { key, name }],
        };
        await set('dataManager', newManager);
        
        // Load the new data directly into state instead of reloading the page
        await loadDataset(key);

        setDataManager(newManager);
        setHasData(true);
    }, [dataManager.datasets, loadDataset]);

    const updateCustomer = (updatedCustomer: Customer) => {
        setCustomers(prev => prev.map(c => c.id === updatedCustomer.id ? updatedCustomer : c));
        addActivityLog('تعديل عميل', `تم تعديل بيانات العميل ${updatedCustomer.name}`);
    };

    const addAccount = (data: { name: string; code: string; parentId: string | null; }): AccountNode => {
        const newAccount: AccountNode = {
            id: `ACC-${Date.now()}`, // Using timestamp for accounts is fine as they are not user-facing documents
            name: data.name,
            code: data.code,
            balance: 0
        };

        if (data.parentId) {
            const addNodeToTree = (nodes: AccountNode[]): AccountNode[] => {
                return nodes.map(node => {
                    if (node.id === data.parentId) {
                        return { ...node, children: [...(node.children || []), newAccount] };
                    }
                    if (node.children) {
                        return { ...node, children: addNodeToTree(node.children) };
                    }
                    return node;
                });
            };
            setChartOfAccounts(prev => addNodeToTree(prev));
        } else {
            setChartOfAccounts(prev => [...prev, newAccount]);
        }
        
        addActivityLog('إضافة حساب', `تمت إضافة الحساب ${data.name} (${data.code})`);
        return newAccount;
    };
    
    const updateAllOpeningBalances = useCallback(({ accountUpdates, customerUpdates, supplierUpdates }: {
        accountUpdates: { accountId: string, balance: number }[],
        customerUpdates: { customerId: string, balance: number }[],
        supplierUpdates: { supplierId: string, balance: number }[],
    }) => {
        // 1. Update customers
        setCustomers(prev => {
            const newCustomers = JSON.parse(JSON.stringify(prev));
            customerUpdates.forEach(update => {
                const customer = newCustomers.find((c: Customer) => c.id === update.customerId);
                if (customer) customer.balance = update.balance;
            });
            return newCustomers;
        });
    
        // 2. Update suppliers
        setSuppliers(prev => {
            const newSuppliers = JSON.parse(JSON.stringify(prev));
            supplierUpdates.forEach(update => {
                const supplier = newSuppliers.find((s: Supplier) => s.id === update.supplierId);
                if (supplier) supplier.balance = update.balance;
            });
            return newSuppliers;
        });
    
        // 3. Update Chart of Accounts
        setChartOfAccounts(prev => {
            const newChart = JSON.parse(JSON.stringify(prev));
    
            // Apply direct account updates from the modal
            accountUpdates.forEach(update => {
                updateNodeBalanceInTree(newChart, update.accountId, update.balance);
            });
    
            // Calculate and update control accounts
            const totalCustomerBalance = customerUpdates.reduce((sum, u) => sum + u.balance, 0);
            const totalSupplierBalance = supplierUpdates.reduce((sum, u) => sum + u.balance, 0);
            
            const customerAccountNode = findAccountByCode(newChart, '1103');
            const supplierAccountNode = findAccountByCode(newChart, '2101');
    
            if (customerAccountNode) {
                updateNodeBalanceInTree(newChart, customerAccountNode.id, totalCustomerBalance);
            }
            if (supplierAccountNode) {
                // Supplier balance is a liability (credit), so it should be negative in our system
                updateNodeBalanceInTree(newChart, supplierAccountNode.id, -totalSupplierBalance);
            }
            
            return newChart;
        });
        
        showToast('تم تحديث الأرصدة الافتتاحية بنجاح.');
        addActivityLog('تحديث الأرصدة الافتتاحية', `تم تحديث الأرصدة الافتتاحية للنظام.`);
    }, [showToast, addActivityLog]);

    const addUnitDefinition = (name: string): UnitDefinition => {
        const newIdNumber = sequences.unit;
        const newUnit: UnitDefinition = {
            id: `unit-${newIdNumber}`,
            name: name,
        };
        let unitExists = false;
        setUnitDefinitions(prev => {
            if (prev.some(u => u.name === name)) {
                showToast('هذه الوحدة موجودة بالفعل.', 'error');
                unitExists = true;
                return prev;
            }
            return [...prev, newUnit];
        });
        
        if(!unitExists) {
            setSequences(prev => ({...prev, unit: prev.unit + 1}));
            addActivityLog('إضافة وحدة قياس', `تمت إضافة الوحدة ${name}`);
        }
        return newUnit;
    };


    // --- CRUD with Sequential Numbering ---
    const addUser = (user: Omit<User, 'id'>) => {
        const newUser = { ...user, id: `U${users.length + 1}` };
        setUsers(prev => [...prev, newUser]);
        addActivityLog('إضافة مستخدم', `تمت إضافة المستخدم ${user.name}`);
        addNotification(`تمت إضافة المستخدم الجديد: ${user.name}`, 'info', '/settings');
        return newUser;
    };

    const updateUser = (updatedUser: Partial<User> & { id: string }) => {
        setUsers(prev => prev.map(u => u.id === updatedUser.id ? { ...u, ...updatedUser } : u));
        addActivityLog('تعديل مستخدم', `تم تعديل بيانات المستخدم ${updatedUser.name}`);
    };

    const archiveUser = (id: string) => {
        if (currentUser?.id === id) return { success: false, message: 'لا يمكن أرشفة المستخدم الحالي.' };
        setUsers(prev => prev.map(u => u.id === id ? { ...u, isArchived: true } : u));
        addActivityLog('أرشفة مستخدم', `تمت أرشفة المستخدم صاحب المعرف ${id}`);
        return { success: true };
    };
    
    const addCustomer = (customer: Omit<Customer, 'id'>): Customer => {
        const newIdNumber = sequences.customer;
        const newCustomer = { ...customer, id: `CUS-${String(newIdNumber).padStart(3, '0')}` };
        setCustomers(prev => [...prev, newCustomer]);
        setSequences(prev => ({...prev, customer: prev.customer + 1}));
        addActivityLog('إضافة عميل', `تمت إضافة العميل ${customer.name}`);
        addNotification(`تمت إضافة عميل جديد: ${customer.name}`, 'info', '/customers');
        return newCustomer;
    };


    const archiveCustomer = (id: string) => {
        const customer = customers.find(c => c.id === id);
        if (customer?.balance !== 0) return { success: false, message: 'لا يمكن أرشفة عميل رصيده لا يساوي صفر.' };
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, isArchived: true } : c));
        addActivityLog('أرشفة عميل', `تمت أرشفة العميل ${customer?.name}`);
        return { success: true };
    };

    const addSale = (sale: Omit<Sale, 'id'>) => {
        const LOW_STOCK_THRESHOLD = 10;
        const newIdNumber = sequences.sale;
        const newSale = { ...sale, id: `INV-${String(newIdNumber).padStart(3, '0')}` };
        setSales(prev => [newSale, ...prev]);
        setSequences(prev => ({ ...prev, sale: prev.sale + 1 }));

        setInventory(prevInventory => {
            const newInventory = JSON.parse(JSON.stringify(prevInventory));
            sale.items.forEach(line => {
                const itemIndex = newInventory.findIndex((i: InventoryItem) => i.id === line.itemId);
                if (itemIndex !== -1) {
                    const inventoryItem = newInventory[itemIndex];
                    let quantityInBaseUnit = line.quantity;
                    if (line.unitId !== 'base') {
                        const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                        if (packingUnit) {
                            quantityInBaseUnit = line.quantity * packingUnit.factor;
                        }
                    }

                    const oldStock = inventoryItem.stock;
                    inventoryItem.stock -= quantityInBaseUnit;
                    const newStock = inventoryItem.stock;
                    if(oldStock > LOW_STOCK_THRESHOLD && newStock <= LOW_STOCK_THRESHOLD) {
                        addNotification(`انخفاض مخزون الصنف "${line.itemName}" (${newStock} متبقي)`, 'warning', '/inventory');
                    }
                }
            });
            return newInventory;
        });

        const customer = customers.find(c => c.name === sale.customer);
        if(customer) {
            updateCustomer({...customer, balance: customer.balance + sale.total});
        }

        addActivityLog('إضافة فاتورة مبيعات', `فاتورة رقم ${newSale.id} للعميل ${sale.customer}`);
        addNotification(`فاتورة مبيعات جديدة #${newSale.id}`, 'success', '/sales');
        return newSale;
    }
    
    const addPurchase = (purchase: Omit<Purchase, 'id'>) => {
        const newIdNumber = sequences.purchase;
        const newPurchase = { ...purchase, id: `BILL-${String(newIdNumber).padStart(3, '0')}` };
        setPurchases(prev => [newPurchase, ...prev]);
        setSequences(prev => ({ ...prev, purchase: prev.purchase + 1 }));
        
        setInventory(prevInventory => {
            const newInventory = JSON.parse(JSON.stringify(prevInventory));
            purchase.items.forEach(line => {
                const itemIndex = newInventory.findIndex((i: InventoryItem) => i.id === line.itemId);
                if (itemIndex !== -1) {
                    const inventoryItem = newInventory[itemIndex];
                    let quantityInBaseUnit = line.quantity;
                     if (line.unitId !== 'base') {
                        const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                        if (packingUnit) {
                            quantityInBaseUnit = line.quantity * packingUnit.factor;
                        }
                    }
                    inventoryItem.stock += quantityInBaseUnit;
                }
            });
            return newInventory;
        });

        const supplier = suppliers.find(s => s.name === purchase.supplier);
        if(supplier) {
            updateSupplier({...supplier, balance: supplier.balance + purchase.total});
        }

        addActivityLog('إضافة فاتورة مشتريات', `فاتورة رقم ${newPurchase.id} للمورد ${purchase.supplier}`);
        addNotification(`فاتورة مشتريات جديدة #${newPurchase.id}`, 'success', '/purchases');
        return newPurchase;
    }

    const addTreasuryTransaction = (tr: Omit<TreasuryTransaction, 'id' | 'balance'>) => {
        const newIdNumber = sequences.treasury;
        const newId = `TRN-${String(newIdNumber).padStart(3, '0')}`;
        setSequences(prev => ({ ...prev, treasury: prev.treasury + 1 }));

        const amountForTreasury = tr.type === 'سند صرف' ? -Math.abs(tr.amount) : Math.abs(tr.amount);

        setChartOfAccounts(prevChart => {
            const newChart = JSON.parse(JSON.stringify(prevChart));
            updateBalancesRecursively(newChart, tr.treasuryAccountId, amountForTreasury);
            if (tr.partyType === 'account' && tr.partyId) {
                const amountForParty = -amountForTreasury;
                updateBalancesRecursively(newChart, tr.partyId, amountForParty);
            } else if (tr.partyType === 'customer' && tr.partyId) {
                const customerAccountNode = findAccountByCode(newChart, '1103');
                if(customerAccountNode) {
                    // Receipt (قبض): Cr. A/R -> decrease balance (-)
                    // Payment/Refund (صرف): Dr. A/R -> increase balance (+)
                    const amountForCustomerGL = tr.type === 'سند صرف' ? Math.abs(tr.amount) : -Math.abs(tr.amount);
                    updateBalancesRecursively(newChart, customerAccountNode.id, amountForCustomerGL);
                }
            } else if (tr.partyType === 'supplier' && tr.partyId) {
                const supplierAccountNode = findAccountByCode(newChart, '2101');
                if(supplierAccountNode) {
                     const amountForParty = tr.type === 'سند صرف' ? -Math.abs(tr.amount) : Math.abs(tr.amount);
                    updateBalancesRecursively(newChart, supplierAccountNode.id, amountForParty);
                }
            }
            return newChart;
        });

        if (tr.partyType === 'customer' && tr.partyId) {
            // Both receipts from and refunds to a customer decrease their balance (what they owe us).
            const change = -Math.abs(tr.amount); 
            setCustomers(prev => prev.map(c => c.id === tr.partyId ? { ...c, balance: c.balance + change } : c));
        }
        if (tr.partyType === 'supplier' && tr.partyId) {
            const change = tr.type === 'سند صرف' ? -Math.abs(tr.amount) : Math.abs(tr.amount);
            setSuppliers(prev => prev.map(s => s.id === tr.partyId ? { ...s, balance: s.balance + change } : s));
        }
        
        const treasuryName = tr.treasuryAccountName;
        
        const newTransaction: TreasuryTransaction = { 
            ...tr, 
            id: newId, 
            balance: 0, 
            amount: amountForTreasury,
            treasuryAccountName: treasuryName
        };
        setTreasury(prev => [newTransaction, ...prev]);
        addActivityLog('إضافة حركة خزينة', `${tr.type} بمبلغ ${tr.amount} في ${treasuryName}`);
        return newTransaction;
    }
    
    // Derived data for treasuriesList to be used in transfer function
    const treasuriesList = useMemo(() => {
        const treasuryRoot = findAccountByCode(chartOfAccounts, '1101');
        const children = treasuryRoot?.children || [];
        const mainTreasuryTotal = {
             name: 'الخزينة (الإجمالي)',
             id: 'main-total',
             balance: treasuryRoot?.balance || 0,
             isTotal: true,
        };
        return [mainTreasuryTotal, ...children];
    }, [chartOfAccounts]);

    const transferTreasuryFunds = (fromTreasuryId: string, toTreasuryId: string, amount: number, notes?: string) => {
        const fromTreasury = treasuriesList.find((t: any) => t.id === fromTreasuryId);
        const toTreasury = treasuriesList.find((t: any) => t.id === toTreasuryId);

        if (!fromTreasury || !toTreasury) {
            showToast('لم يتم العثور على الخزائن المحددة.', 'error');
            return;
        }

        const descriptionForOutgoing = `تحويل إلى ${toTreasury.name}${notes ? ` - ${notes}` : ''}`;
        const descriptionForIncoming = `تحويل من ${fromTreasury.name}${notes ? ` - ${notes}` : ''}`;

        // Create outgoing transaction (saraf)
        addTreasuryTransaction({
            date: new Date().toISOString().slice(0, 10),
            type: 'سند صرف',
            treasuryAccountId: fromTreasuryId,
            treasuryAccountName: fromTreasury.name,
            description: descriptionForOutgoing,
            amount: amount, // addTreasuryTransaction will handle making it negative
            partyType: 'account',
            partyId: toTreasuryId,
        });

        // Create incoming transaction (qabd)
        addTreasuryTransaction({
            date: new Date().toISOString().slice(0, 10),
            type: 'سند قبض',
            treasuryAccountId: toTreasuryId,
            treasuryAccountName: toTreasury.name,
            description: descriptionForIncoming,
            amount: amount,
            partyType: 'account',
            partyId: fromTreasuryId,
        });

        addActivityLog('تحويل بين الخزائن', `تم تحويل ${amount} من ${fromTreasury.name} إلى ${toTreasury.name}`);
    };

    const addItem = (item: Omit<InventoryItem, 'id'>): InventoryItem => {
        const newIdNumber = sequences.item;
        const newPackingUnits = (item.units || []).map((p, index) => ({
             ...p,
             id: `PU-${sequences.packingUnit + index}`
        }));

        const newItem = { 
            ...item, 
            id: `ITM-${String(newIdNumber).padStart(3, '0')}`,
            units: newPackingUnits
        };

        setInventory(prev => [newItem, ...prev]);
        setSequences(prev => ({
            ...prev, 
            item: prev.item + 1,
            packingUnit: prev.packingUnit + newPackingUnits.length
        }));
        addActivityLog('إضافة صنف', `تمت إضافة الصنف ${item.name}`);
        addNotification(`تمت إضافة الصنف "${item.name}" إلى المخزون.`, 'success', '/inventory');
        return newItem;
    };

     const addSaleReturn = (sr: Omit<SaleReturn, 'id'>) => {
        const newIdNumber = sequences.saleReturn;
        const newReturn = { ...sr, id: `SR-${String(newIdNumber).padStart(3, '0')}` };
        setSaleReturns(prev => [newReturn, ...prev]);
        setSequences(prev => ({...prev, saleReturn: prev.saleReturn + 1}));

        setInventory(prevInventory => {
            const newInventory = JSON.parse(JSON.stringify(prevInventory));
            sr.items.forEach(line => {
                const itemIndex = newInventory.findIndex((i: InventoryItem) => i.id === line.itemId);
                if (itemIndex !== -1) {
                    const inventoryItem = newInventory[itemIndex];
                    let quantityInBaseUnit = line.quantity;
                     if (line.unitId !== 'base') {
                        const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                        if (packingUnit) {
                            quantityInBaseUnit = line.quantity * packingUnit.factor;
                        }
                    }
                    inventoryItem.stock += quantityInBaseUnit;
                }
            });
            return newInventory;
        });

        const customer = customers.find(c => c.name === sr.customer);
        if(customer) {
            updateCustomer({...customer, balance: customer.balance - sr.total});
        }

        addActivityLog('إضافة مرتجع مبيعات', `مرتجع رقم ${newReturn.id} من العميل ${sr.customer}`);
        addNotification(`مرتجع مبيعات جديد #${newReturn.id}`, 'success', '/sales-returns');
        return newReturn;
    };

    const addPurchaseReturn = (pr: Omit<PurchaseReturn, 'id'>) => {
        const newIdNumber = sequences.purchaseReturn;
        const newReturn = { ...pr, id: `PR-${String(newIdNumber).padStart(3, '0')}` };
        setPurchaseReturns(prev => [newReturn, ...prev]);
        setSequences(prev => ({...prev, purchaseReturn: prev.purchaseReturn + 1}));

        setInventory(prevInventory => {
            const newInventory = JSON.parse(JSON.stringify(prevInventory));
            pr.items.forEach(line => {
                const itemIndex = newInventory.findIndex((i: InventoryItem) => i.id === line.itemId);
                if (itemIndex !== -1) {
                    const inventoryItem = newInventory[itemIndex];
                    let quantityInBaseUnit = line.quantity;
                    if (line.unitId !== 'base') {
                        const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                        if (packingUnit) {
                            quantityInBaseUnit = line.quantity * packingUnit.factor;
                        }
                    }
                    inventoryItem.stock -= quantityInBaseUnit;
                }
            });
            return newInventory;
        });

        const supplier = suppliers.find(s => s.name === pr.supplier);
        if(supplier) {
            updateSupplier({...supplier, balance: supplier.balance - pr.total});
        }

        addActivityLog('إضافة مرتجع مشتريات', `مرتجع رقم ${newReturn.id} للمورد ${pr.supplier}`);
        addNotification(`مرتجع مشتريات جديد #${newReturn.id}`, 'success', '/purchases-returns');
        return newReturn;
    };

    const addJournalEntry = (entry: Omit<JournalEntry, 'id'>) => {
        const newIdNumber = sequences.journal;
        const newEntry = { ...entry, id: `JV-${String(newIdNumber).padStart(3, '0')}` };
        setJournal(prev => [newEntry, ...prev]);
        setSequences(prev => ({ ...prev, journal: prev.journal + 1 }));

        setChartOfAccounts(prevChart => {
            const newChart = JSON.parse(JSON.stringify(prevChart));
            newEntry.lines.forEach(line => {
                const amount = line.debit - line.credit;
                updateBalancesRecursively(newChart, line.accountId, amount);
            });
            return newChart;
        });

        addActivityLog('إضافة قيد يومية', `تمت إضافة القيد رقم ${newEntry.id}`);
        return newEntry;
    };

    const addSupplier = (supplier: Omit<Supplier, 'id'>): Supplier => {
        const newIdNumber = sequences.supplier;
        const newSupplier = { ...supplier, id: `SUP-${String(newIdNumber).padStart(3, '0')}` };
        setSuppliers(prev => [...prev, newSupplier]);
        setSequences(prev => ({...prev, supplier: prev.supplier + 1}));
        addActivityLog('إضافة مورد', `تمت إضافة المورد ${supplier.name}`);
        addNotification(`تمت إضافة مورد جديد: ${supplier.name}`, 'info', '/suppliers');
        return newSupplier;
    };

    // --- Derived Data ---
    const totalCashBalance = useMemo(() => {
        const treasuryRoot = findAccountByCode(chartOfAccounts, '1101');
        return treasuryRoot?.balance || 0;
    }, [chartOfAccounts]);
    const totalReceivables = useMemo(() => customers.reduce((sum, c) => sum + (c.balance > 0 ? c.balance : 0), 0), [customers]);
    const totalPayables = useMemo(() => suppliers.reduce((sum, s) => sum + (s.balance > 0 ? s.balance : 0), 0), [suppliers]);
    const inventoryValue = useMemo(() => inventory.reduce((sum, i) => sum + (i.stock * i.purchasePrice), 0), [inventory]);
    const recentTransactions: RecentTransaction[] = useMemo(() => {
        const latestSales = sales.filter(s => !s.isArchived).slice(0, 3).map(s => ({ type: 'sale' as const, id: s.id, date: s.date, partyName: s.customer, total: s.total, status: s.status }));
        const latestPurchases = purchases.filter(p => !p.isArchived).slice(0, 3).map(p => ({ type: 'purchase' as const, id: p.id, date: p.date, partyName: p.supplier, total: p.total, status: p.status }));
        return [...latestSales, ...latestPurchases].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5);
    }, [sales, purchases]);
    
    const topCustomers = useMemo(() => [...customers].sort((a,b) => b.balance - a.balance).slice(0, 5), [customers]);
    
    // Memoize all filtered data to prevent unnecessary re-renders
    const activeCustomers = useMemo(() => customers.filter(c => !c.isArchived), [customers]);
    const archivedCustomers = useMemo(() => customers.filter(c => c.isArchived), [customers]);
    const activeSuppliers = useMemo(() => suppliers.filter(s => !s.isArchived), [suppliers]);
    const archivedSuppliers = useMemo(() => suppliers.filter(s => s.isArchived), [suppliers]);
    const activeInventory = useMemo(() => inventory.filter(i => !i.isArchived), [inventory]);
    const archivedInventory = useMemo(() => inventory.filter(i => i.isArchived), [inventory]);
    const activeSales = useMemo(() => sales.filter(s => !s.isArchived), [sales]);
    const archivedSales = useMemo(() => sales.filter(s => s.isArchived), [sales]);
    const activePurchases = useMemo(() => purchases.filter(p => !p.isArchived), [purchases]);
    const archivedPurchases = useMemo(() => purchases.filter(p => p.isArchived), [purchases]);
    const activeSaleReturns = useMemo(() => saleReturns.filter(sr => !sr.isArchived), [saleReturns]);
    const archivedSaleReturns = useMemo(() => saleReturns.filter(sr => sr.isArchived), [saleReturns]);
    const activePurchaseReturns = useMemo(() => purchaseReturns.filter(pr => !pr.isArchived), [purchaseReturns]);
    const archivedPurchaseReturns = useMemo(() => purchaseReturns.filter(pr => pr.isArchived), [purchaseReturns]);
    const activeUsers = useMemo(() => users.filter(u => !u.isArchived), [users]);
    const archivedUsers = useMemo(() => users.filter(u => u.isArchived), [users]);
    const activeFixedAssets = useMemo(() => fixedAssets.filter(fa => !fa.isArchived), [fixedAssets]);
    const archivedFixedAssets = useMemo(() => fixedAssets.filter(fa => fa.isArchived), [fixedAssets]);
    const activeJournal = useMemo(() => journal.filter(j => !j.isArchived), [journal]);
    const archivedJournal = useMemo(() => journal.filter(j => j.isArchived), [journal]);


    const unarchiveCustomer = (id: string) => {
        setCustomers(prev => prev.map(c => c.id === id ? { ...c, isArchived: false } : c));
        addActivityLog('استعادة عميل', `تمت استعادة العميل صاحب المعرف ${id}`);
    };

    // Placeholder for other unarchive functions
    const unarchiveSupplier = (id: string) => {};
    const unarchiveSale = (id: string) => {};
    const unarchivePurchase = (id: string) => {};
    const unarchiveItem = (id: string) => {};
    const unarchiveJournalEntry = (id: string) => {};
    const unarchiveUser = (id: string) => {};
    const unarchiveFixedAsset = (id: string) => {};
    const archiveSale = (id: string) => ({ success: true });
    const archivePurchase = (id: string) => ({ success: true });
    const archiveItem = (id: string) => ({ success: true });
    const archiveJournalEntry = (id: string) => {
        const entry = journal.find(j => j.id === id);
        if (!entry) {
            return { success: false, message: "القيد غير موجود" };
        }
        setJournal(prev => prev.map(j => j.id === id ? { ...j, isArchived: true } : j));
        addActivityLog('أرشفة قيد يومية', `تمت أرشفة القيد رقم ${id}`);
        return { success: true };
    };
    const archiveFixedAsset = (id: string) => ({ success: true });
    const updateAccount = (data: any) => {};
    const archiveAccount = (id: string) => ({ success: true });
    const updateJournalEntry = (entry: any) => {};
    const updateItem = (updatedItem: InventoryItem) => {
        setInventory(prev => prev.map(i => i.id === updatedItem.id ? updatedItem : i));
        addActivityLog('تعديل صنف', `تم تعديل بيانات الصنف ${updatedItem.name}`);
        showToast(`تم تحديث الصنف "${updatedItem.name}" بنجاح.`);
    };

    const updateSale = (sale: any) => {};
    const updatePurchase = (purchase: any) => {};
    const updateSupplier = (supplier: any) => {};
    const archiveSupplier = (id: string) => ({ success: true });
    const addFixedAsset = (asset: any) => {};
    const updateFixedAsset = (asset: any) => {};
    const archiveSaleReturn = (id: string) => ({ success: true });
    const archivePurchaseReturn = (id: string) => ({ success: true });
    const updateCompanyInfo = (info: any) => setCompanyInfo(info);
    const updatePrintSettings = (settings: PrintSettings) => setPrintSettings(settings);
    const updateFinancialYear = (fy: any) => setFinancialYear(fy);
    const switchDataset = (key: string) => {
        setDataManager(prev => ({...prev, activeDatasetKey: key}));
        window.location.reload();
    };
    const renameDataset = async (key: string, name: string) => {
        const newManager = {
            ...dataManager,
            datasets: dataManager.datasets.map(ds => ds.key === key ? {...ds, name} : ds)
        };
        await set('dataManager', newManager);
        setDataManager(newManager);
    };
    const importNewDataset = (name:string, content: string) => {};

    const contextValue = {
        isDataLoaded, hasData, currentUser, saveStatus, toast, showToast,
        dataManager, createNewDataset, switchDataset, renameDataset, importNewDataset,
        login, logout,
        companyInfo, updateCompanyInfo,
        printSettings, updatePrintSettings,
        financialYear, updateFinancialYear,
        chartOfAccounts, addAccount, updateAccount, archiveAccount, updateAllOpeningBalances,
        unitDefinitions, addUnitDefinition,
        journal: activeJournal,
        archivedJournal,
        addJournalEntry, updateJournalEntry, archiveJournalEntry, unarchiveJournalEntry,
        inventory: activeInventory,
        archivedInventory,
        addItem, updateItem, archiveItem, unarchiveItem,
        sales: activeSales,
        archivedSales,
        addSale, updateSale, archiveSale, unarchiveSale,
        purchases: activePurchases,
        archivedPurchases,
        addPurchase, updatePurchase, archivePurchase, unarchivePurchase,
        saleReturns: activeSaleReturns,
        archivedSaleReturns,
        addSaleReturn, archiveSaleReturn, unarchiveSaleReturn: (id: string) => {},
        purchaseReturns: activePurchaseReturns,
        archivedPurchaseReturns,
        addPurchaseReturn, archivePurchaseReturn, unarchivePurchaseReturn: (id: string) => {},
        treasury, addTreasuryTransaction, treasuriesList, transferTreasuryFunds,
        customers: activeCustomers, archivedCustomers, addCustomer, updateCustomer, archiveCustomer, unarchiveCustomer,
        suppliers: activeSuppliers,
        archivedSuppliers,
        addSupplier, updateSupplier, archiveSupplier, unarchiveSupplier,
        users: activeUsers,
        archivedUsers,
        addUser, updateUser, archiveUser, unarchiveUser,
        fixedAssets: activeFixedAssets,
        archivedFixedAssets,
        addFixedAsset, updateFixedAsset, archiveFixedAsset, unarchiveFixedAsset,
        activityLog,
        notifications, addNotification, markNotificationAsRead, markAllNotificationsAsRead,
        sequences,
        // Derived data
        totalReceivables, totalPayables, inventoryValue, recentTransactions, topCustomers, totalCashBalance,
    };

    return <DataContext.Provider value={contextValue}>{children}</DataContext.Provider>;
};