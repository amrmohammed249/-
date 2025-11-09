import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import Modal from '../shared/Modal';
import { AccountNode, Customer, Supplier, Sale, SaleReturn, TreasuryTransaction, Purchase, PurchaseReturn, JournalEntry, JournalLine } from '../../types';

interface OpeningBalancesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const OpeningBalancesModal: React.FC<OpeningBalancesModalProps> = ({ isOpen, onClose }) => {
  const { 
    chartOfAccounts, customers, suppliers, updateAllOpeningBalances, currentUser,
    journal, sales, saleReturns, treasury, purchases, purchaseReturns 
  } = useContext(DataContext);
  const [activeTab, setActiveTab] = useState<'accounts' | 'customers' | 'suppliers'>('accounts');
  
  const [accountBalances, setAccountBalances] = useState<Record<string, string>>({});
  const [customerBalances, setCustomerBalances] = useState<Record<string, string>>({});
  const [supplierBalances, setSupplierBalances] = useState<Record<string, string>>({});

  const canEdit = currentUser.role === 'مدير النظام' || currentUser.role === 'محاسب';

  const { leafAccounts, customerAccountId, supplierAccountId } = useMemo(() => {
    let customerAccId: string | null = null;
    let supplierAccId: string | null = null;
    let inventoryAccId: string | null = null;

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

    const customerNode = findAccountByCode(chartOfAccounts, '1103');
    if(customerNode) customerAccId = customerNode.id;

    const supplierNode = findAccountByCode(chartOfAccounts, '2101');
    if(supplierNode) supplierAccId = supplierNode.id;
    
    const inventoryNode = findAccountByCode(chartOfAccounts, '1104');
    if(inventoryNode) inventoryAccId = inventoryNode.id;

    const getLeafNodes = (nodes: AccountNode[]): AccountNode[] => {
      let leaves: AccountNode[] = [];
      for (const node of nodes) {
        if (!node.children || node.children.length === 0) {
          leaves.push(node);
        } else {
          leaves = leaves.concat(getLeafNodes(node.children));
        }
      }
      return leaves;
    };
    const allLeafAccounts = getLeafNodes(chartOfAccounts).sort((a, b) => a.code.localeCompare(b.code));
    const filteredLeafs = allLeafAccounts.filter(acc => acc.id !== customerAccId && acc.id !== supplierAccId && acc.id !== inventoryAccId);

    return { leafAccounts: filteredLeafs, customerAccountId: customerAccId, supplierAccountId: supplierAccId };
  }, [chartOfAccounts]);

  useEffect(() => {
    if (isOpen) {
        // Calculate and set initial account balances
        const calculatedAccountBalances = leafAccounts.reduce((acc, account) => {
            let sumOfTransactions = 0;
            journal.forEach((entry: JournalEntry) => {
                if (!entry.isArchived) {
                    (entry.lines || []).forEach((line: JournalLine) => {
                        if (line.accountId === account.id) {
                            sumOfTransactions += (line.debit - line.credit);
                        }
                    });
                }
            });
            const openingBalance = (account.balance || 0) - sumOfTransactions;
            acc[account.id] = String(openingBalance);
            return acc;
        }, {} as Record<string, string>);
        setAccountBalances(calculatedAccountBalances);

        // Calculate and set initial customer balances
        const calculatedCustomerBalances = customers.reduce((acc: any, customer: Customer) => {
            const totalSales = sales.filter((s: Sale) => s.customer === customer.name && !s.isArchived).reduce((sum, s) => sum + s.total, 0);
            const totalReturns = saleReturns.filter((sr: SaleReturn) => sr.customer === customer.name && !sr.isArchived).reduce((sum, sr) => sum + sr.total, 0);
            const totalPayments = treasury.filter((t: TreasuryTransaction) => t.partyType === 'customer' && t.partyId === customer.id && t.type === 'سند قبض' && !t.isArchived).reduce((sum, t) => sum + t.amount, 0);
            const totalRefunds = treasury.filter((t: TreasuryTransaction) => t.partyType === 'customer' && t.partyId === customer.id && t.type === 'سند صرف' && !t.isArchived).reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const sumOfTransactions = (totalSales + totalRefunds) - (totalReturns + totalPayments);
            const openingBalance = customer.balance - sumOfTransactions;
            acc[customer.id] = String(openingBalance);
            return acc;
        }, {} as Record<string, string>);
        setCustomerBalances(calculatedCustomerBalances);
        
        // Calculate and set initial supplier balances
        const calculatedSupplierBalances = suppliers.reduce((acc: any, supplier: Supplier) => {
            const totalPurchases = purchases.filter((p: Purchase) => p.supplier === supplier.name && !p.isArchived).reduce((sum, p) => sum + p.total, 0);
            const totalReturns = purchaseReturns.filter((pr: PurchaseReturn) => pr.supplier === supplier.name && !pr.isArchived).reduce((sum, pr) => sum + pr.total, 0);
            const totalPayments = treasury.filter((t: TreasuryTransaction) => t.partyType === 'supplier' && t.partyId === supplier.id && t.type === 'سند صرف' && !t.isArchived).reduce((sum, t) => sum + Math.abs(t.amount), 0);
            const totalRefunds = treasury.filter((t: TreasuryTransaction) => t.partyType === 'supplier' && t.partyId === supplier.id && t.type === 'سند قبض' && !t.isArchived).reduce((sum, t) => sum + t.amount, 0);
            const sumOfTransactions = (totalPurchases + totalRefunds) - (totalReturns + totalPayments);
            const openingBalance = supplier.balance - sumOfTransactions;
            acc[supplier.id] = String(openingBalance);
            return acc;
        }, {} as Record<string, string>);
        setSupplierBalances(calculatedSupplierBalances);
    }
}, [isOpen, leafAccounts, customers, suppliers, journal, sales, saleReturns, treasury, purchases, purchaseReturns]);


  const handleSave = () => {
    const accountUpdates = Object.entries(accountBalances).map(([accountId, balance]) => ({
      accountId,
      balance: parseFloat(balance as string) || 0,
    }));
    const customerUpdates = Object.entries(customerBalances).map(([customerId, balance]) => ({
      customerId,
      balance: parseFloat(balance as string) || 0,
    }));
    const supplierUpdates = Object.entries(supplierBalances).map(([supplierId, balance]) => ({
      supplierId,
      balance: parseFloat(balance as string) || 0,
    }));

    updateAllOpeningBalances({ accountUpdates, customerUpdates, supplierUpdates });
    onClose();
  };
  
  if (!canEdit) {
      return null;
  }

  const tabs: { key: 'accounts' | 'customers' | 'suppliers'; label: string }[] = [
    { key: 'accounts', label: 'الحسابات' },
    { key: 'customers', label: 'العملاء' },
    { key: 'suppliers', label: 'الموردين' },
  ];
  
  const renderContent = () => {
    switch (activeTab) {
        case 'customers': return (
            <>
                <p className="text-sm text-gray-500 dark:text-gray-400">أدخل الرصيد المستحق على كل عميل كرقم موجب.</p>
                <div className="max-h-[50vh] overflow-y-auto border dark:border-gray-700 rounded-lg mt-4">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">كود العميل</th>
                                <th scope="col" className="px-6 py-3">اسم العميل</th>
                                <th scope="col" className="px-6 py-3">الرصيد الافتتاحي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {customers.map((customer: Customer) => (
                                <tr key={customer.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-2">{customer.id}</td>
                                    <td className="px-6 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{customer.name}</td>
                                    <td className="px-6 py-2">
                                        <input type="number" value={customerBalances[customer.id] || ''} onChange={(e) => setCustomerBalances(prev => ({ ...prev, [customer.id]: e.target.value }))} className="input-style w-full" placeholder="0.00" step="any" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
        case 'suppliers': return (
             <>
                <p className="text-sm text-gray-500 dark:text-gray-400">أدخل الرصيد المستحق لكل مورد كرقم موجب.</p>
                <div className="max-h-[50vh] overflow-y-auto border dark:border-gray-700 rounded-lg mt-4">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">كود المورد</th>
                                <th scope="col" className="px-6 py-3">اسم المورد</th>
                                <th scope="col" className="px-6 py-3">الرصيد الافتتاحي</th>
                            </tr>
                        </thead>
                        <tbody>
                            {suppliers.map((supplier: Supplier) => (
                                <tr key={supplier.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-2">{supplier.id}</td>
                                    <td className="px-6 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{supplier.name}</td>
                                    <td className="px-6 py-2">
                                        <input type="number" value={supplierBalances[supplier.id] || ''} onChange={(e) => setSupplierBalances(prev => ({ ...prev, [supplier.id]: e.target.value }))} className="input-style w-full" placeholder="0.00" step="any" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
        case 'accounts':
        default: return (
             <>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                    أدخل الأرصدة الافتتاحية للحسابات. الأصول والمصروفات تكون موجبة (مدينة)، والالتزامات وحقوق الملكية والإيرادات تكون سالبة (دائنة).
                </p>
                <div className="max-h-[50vh] overflow-y-auto border dark:border-gray-700 rounded-lg mt-4">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 sticky top-0">
                            <tr>
                                <th scope="col" className="px-6 py-3">رمز الحساب</th>
                                <th scope="col" className="px-6 py-3">اسم الحساب</th>
                                <th scope="col" className="px-6 py-3">الرصيد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {leafAccounts.map(account => (
                                <tr key={account.id} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-6 py-2">{account.code}</td>
                                    <td className="px-6 py-2 font-medium text-gray-900 dark:text-white whitespace-nowrap">{account.name}</td>
                                    <td className="px-6 py-2">
                                        <input type="number" value={accountBalances[account.id] || ''} onChange={(e) => setAccountBalances(prev => ({ ...prev, [account.id]: e.target.value }))} className="input-style w-full" placeholder="0.00" step="any" />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </>
        );
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="تحديد الأرصدة الافتتاحية" size="4xl">
        <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="-mb-px flex space-x-4 space-x-reverse" aria-label="Tabs">
                {tabs.map(tab => (
                    <button
                        key={tab.key}
                        onClick={() => setActiveTab(tab.key)}
                        className={`${
                            activeTab === tab.key
                            ? 'border-blue-500 text-blue-600'
                            : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
                    >
                        {tab.label}
                    </button>
                ))}
            </nav>
        </div>
      <div className="mt-6">
        {renderContent()}
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
        <button type="button" onClick={handleSave} className="btn-primary">حفظ الأرصدة</button>
      </div>
    </Modal>
  );
};

export default OpeningBalancesModal;