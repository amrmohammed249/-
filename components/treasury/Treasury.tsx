import React, { useState, useMemo, useContext, useEffect, useCallback } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import type { Account, TreasuryTransaction } from '../../types';
import AddTreasuryForm from './AddTreasuryForm';
import AddTreasuryTransactionForm from './AddTreasuryTransactionForm';
import TransferFundsForm from './TransferFundsForm';
import TreasuryVoucherView from './TreasuryVoucherView';
import ConfirmationModal from '../shared/ConfirmationModal';
import { PencilIcon, BanknotesIcon, ArrowTrendingDownIcon, ArrowTrendingUpIcon } from '../icons';
import EditTreasuryTransactionForm from './EditTreasuryTransactionForm';
import Card from '../shared/Card';
import DataTable from '../shared/DataTable';

const findAccountById = (accounts: Account[], id: string): Account | null => {
    for (const account of accounts) {
        if (account.id === id) return account;
        if (account.children) {
            const found = findAccountById(account.children, id);
            if (found) return found;
        }
    }
    return null;
}

const DateFilterButton: React.FC<{ label: string; filter: string | null; activeFilter: string | null; onClick: (f: string | null) => void }> = ({ label, filter, activeFilter, onClick }) => {
    const isActive = filter === activeFilter;
    return (
        <button
            onClick={() => onClick(filter)}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
                isActive
                    ? 'bg-blue-500 text-white font-semibold shadow'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600'
            }`}
        >
            {label}
        </button>
    );
};

const Treasury: React.FC = () => {
    const { treasuriesList, treasury: treasuryTransactions, chartOfAccounts, customers, suppliers, showToast, financialYear, totalCashBalance } = useContext(DataContext);
    const treasuries = useMemo(() => treasuriesList.filter((t: any) => !t.isTotal), [treasuriesList]);

    const [isAddTreasuryModalOpen, setAddTreasuryModalOpen] = useState(false);
    const [isAddTransactionModalOpen, setAddTransactionModalOpen] = useState(false);
    const [isTransferModalOpen, setTransferModalOpen] = useState(false);
    const [isEditTransactionModalOpen, setEditTransactionModalOpen] = useState(false);
    const [transactionType, setTransactionType] = useState<'سند قبض' | 'سند صرف'>('سند قبض');
    
    const [transactionToView, setTransactionToView] = useState<TreasuryTransaction | null>(null);
    const [transactionToEdit, setTransactionToEdit] = useState<TreasuryTransaction | null>(null);

    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string>('');
    const [activeDateFilter, setActiveDateFilter] = useState<string | null>('today');
    const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
    const [endDate, setEndDate] = useState(new Date().toISOString().slice(0, 10));

    const handleAddTransaction = (type: 'سند قبض' | 'سند صرف') => {
        setTransactionType(type);
        setAddTransactionModalOpen(true);
    };
    
    const handleTransactionAdded = (newTransaction: TreasuryTransaction) => {
        setAddTransactionModalOpen(false);
        setTransactionToView(newTransaction);
    };
    
    const handleTransactionEdited = () => {
        setEditTransactionModalOpen(false);
        setTransactionToEdit(null);
        showToast('تم تعديل السند بنجاح.');
    };
    
    const handleEdit = (transaction: TreasuryTransaction) => {
        setTransactionToEdit(transaction);
        setEditTransactionModalOpen(true);
    };

    const setDateRange = useCallback((filter: string | null) => {
        const today = new Date();
        const isoString = (d: Date) => d.toISOString().split('T')[0];
        
        let start = '';
        let end = isoString(today);
    
        switch(filter) {
            case 'today':
                start = isoString(today);
                break;
            case 'yesterday':
                const yesterday = new Date(today);
                yesterday.setDate(today.getDate() - 1);
                start = isoString(yesterday);
                end = isoString(yesterday);
                break;
            case 'last7':
                const last7 = new Date(today);
                last7.setDate(today.getDate() - 6);
                start = isoString(last7);
                break;
            case 'thisMonth':
                const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
                start = isoString(firstDayOfMonth);
                end = isoString(new Date(today.getFullYear(), today.getMonth() + 1, 0));
                break;
            case 'all':
            default:
                start = financialYear.startDate;
                end = financialYear.endDate;
                break;
        }
        setStartDate(start);
        setEndDate(end);
        setActiveDateFilter(filter);
    }, [financialYear]);

    useEffect(() => {
        setDateRange('today');
    }, [setDateRange]);
    
    const handleManualDateChange = (type: 'start' | 'end', value: string) => {
      if (type === 'start') setStartDate(value);
      if (type === 'end') setEndDate(value);
      setActiveDateFilter(null); // Clear quick filter when manual date is set
    };

    const { currentActualBalance } = useMemo(() => {
        if (selectedTreasuryId) {
            const selectedTreasury = treasuriesList.find((t: any) => t.id === selectedTreasuryId);
            return {
                currentActualBalance: selectedTreasury?.balance || 0,
            };
        }
        return {
            currentActualBalance: totalCashBalance,
        };
    }, [selectedTreasuryId, treasuriesList, totalCashBalance]);

    const { openingBalance, transactionsForPeriod, closingBalance, totalIn, totalOut } = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const allTxForTreasury = treasuryTransactions.filter((t: TreasuryTransaction) => {
            const accountMatch = !selectedTreasuryId || t.treasuryAccountId === selectedTreasuryId;
            return accountMatch && !t.isArchived;
        });

        // 1. Calculate the change that occurred *after* the report's end date.
        const postPeriodChange = allTxForTreasury
            .filter((tx: TreasuryTransaction) => new Date(tx.date) > end)
            .reduce((sum, tx) => sum + tx.amount, 0);

        // 2. The true closing balance for the report period is the current balance minus future changes.
        const trueClosingBalance = currentActualBalance - postPeriodChange;

        // 3. Filter transactions for the selected period.
        const transactionsForPeriod = allTxForTreasury
            .filter((t: TreasuryTransaction) => {
                const txDate = new Date(t.date);
                return txDate >= start && txDate <= end;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. Calculate the net change within the period.
        const periodNetChange = transactionsForPeriod.reduce((sum, tx) => sum + tx.amount, 0);

        // 5. Calculate the opening balance by working backwards from the true closing balance.
        const openingBalanceForPeriod = trueClosingBalance - periodNetChange;

        // 6. Now, build the transaction list for display with correct running balances.
        let runningBalance = openingBalanceForPeriod;
        let totalIn = 0;
        let totalOut = 0;
    
        const processedTransactions = transactionsForPeriod.map(tx => {
            runningBalance += tx.amount;
            const credit = tx.amount > 0 ? tx.amount : 0;
            const debit = tx.amount < 0 ? Math.abs(tx.amount) : 0;
            totalIn += credit;
            totalOut += debit;

            let partyName = '-';
            if (tx.partyType && tx.partyId) {
                switch (tx.partyType) {
                    case 'customer':
                        partyName = customers.find((c: any) => c.id === tx.partyId)?.name || 'عميل غير معروف';
                        break;
                    case 'supplier':
                        partyName = suppliers.find((s: any) => s.id === tx.partyId)?.name || 'مورد غير معروف';
                        break;
                    case 'account':
                        partyName = findAccountById(chartOfAccounts, tx.partyId)?.name || 'حساب غير معروف';
                        break;
                    default:
                        partyName = tx.partyId;
                }
            }

            return { ...tx, credit, debit, balance: runningBalance, partyName };
        });
    
        return {
            openingBalance: openingBalanceForPeriod,
            transactionsForPeriod: processedTransactions.reverse(), // Show most recent first for display
            closingBalance: trueClosingBalance,
            totalIn,
            totalOut
        };
    }, [treasuryTransactions, selectedTreasuryId, startDate, endDate, currentActualBalance, customers, suppliers, chartOfAccounts]);
    
    const columns = useMemo(() => [
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'رقم السند', accessor: 'id', sortable: true },
        { header: 'الخزينة', accessor: 'treasuryAccountName', sortable: true },
        { header: 'الطرف المقابل', accessor: 'partyName', sortable: true },
        { header: 'البيان', accessor: 'description' },
        { header: 'وارد', accessor: 'credit', render: (row: any) => row.credit > 0 ? row.credit.toLocaleString() : '-' },
        { header: 'صادر', accessor: 'debit', render: (row: any) => row.debit > 0 ? row.debit.toLocaleString() : '-' },
        { header: 'الرصيد', accessor: 'balance', render: (row: any) => row.balance.toLocaleString() },
    ], []);
    
    return (
        <div className="space-y-6">
             <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4">
                    <div className="flex-1">
                        <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">كشف حساب الخزينة</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">تتبع جميع الحركات المالية في خزائنك.</p>
                    </div>
                    <div className="flex-shrink-0 flex flex-wrap gap-2">
                         <button onClick={() => handleAddTransaction('سند قبض')} className="btn-primary-small">سند قبض</button>
                         <button onClick={() => handleAddTransaction('سند صرف')} className="btn-secondary-small">سند صرف</button>
                         <button onClick={() => setAddTreasuryModalOpen(true)} className="btn-secondary-small">إضافة خزينة</button>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                <Card title="رصيد أول المدة" value={openingBalance.toLocaleString()} icon={<BanknotesIcon className="text-gray-500"/>} />
                <Card title="إجمالي الوارد" value={totalIn.toLocaleString()} icon={<ArrowTrendingUpIcon className="text-green-500"/>} />
                <Card title="إجمالي الصادر" value={totalOut.toLocaleString()} icon={<ArrowTrendingDownIcon className="text-red-500"/>} />
                <Card title="الرصيد الختامي" value={closingBalance.toLocaleString()} icon={<BanknotesIcon className="text-blue-500"/>} />
            </div>

            <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md">
                 <div className="space-y-4 p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/20">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label htmlFor="treasuryFilter" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">فلترة حسب الخزينة</label>
                            <select id="treasuryFilter" value={selectedTreasuryId} onChange={e => setSelectedTreasuryId(e.target.value)} className="input-style w-full">
                                <option value="">جميع الخزائن</option>
                                {treasuries.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                        </div>
                        <div>
                            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">من تاريخ</label>
                            <input type="date" id="startDate" value={startDate} onChange={e => handleManualDateChange('start', e.target.value)} className="input-style w-full" />
                        </div>
                        <div>
                            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">إلى تاريخ</label>
                            <input type="date" id="endDate" value={endDate} onChange={e => handleManualDateChange('end', e.target.value)} className="input-style w-full" />
                        </div>
                    </div>
                     <div className="flex flex-wrap items-center gap-2 pt-2">
                         <span className="text-sm font-medium text-gray-700 dark:text-gray-300 ml-2">نطاقات سريعة:</span>
                         <DateFilterButton label="اليوم" filter="today" activeFilter={activeDateFilter} onClick={setDateRange} />
                         <DateFilterButton label="الأمس" filter="yesterday" activeFilter={activeDateFilter} onClick={setDateRange} />
                         <DateFilterButton label="آخر 7 أيام" filter="last7" activeFilter={activeDateFilter} onClick={setDateRange} />
                         <DateFilterButton label="هذا الشهر" filter="thisMonth" activeFilter={activeDateFilter} onClick={setDateRange} />
                         <DateFilterButton label="عرض الكل" filter="all" activeFilter={activeDateFilter} onClick={setDateRange} />
                     </div>
                </div>
            </div>

            <DataTable 
                columns={columns} 
                data={transactionsForPeriod}
                actions={['view', 'edit']}
                onView={(row) => setTransactionToView(row)}
                onEdit={handleEdit}
                searchableColumns={['id', 'description', 'treasuryAccountName', 'partyName']}
            />
    
            {isAddTreasuryModalOpen && <Modal isOpen={isAddTreasuryModalOpen} onClose={() => setAddTreasuryModalOpen(false)} title="إضافة خزينة جديدة"><AddTreasuryForm onClose={() => setAddTreasuryModalOpen(false)} /></Modal>}
            {isAddTransactionModalOpen && <Modal isOpen={isAddTransactionModalOpen} onClose={() => setAddTransactionModalOpen(false)} title={`إضافة ${transactionType}`}><AddTreasuryTransactionForm onClose={() => setAddTransactionModalOpen(false)} onSuccess={handleTransactionAdded} defaultType={transactionType} /></Modal>}
            {isTransferModalOpen && <Modal isOpen={isTransferModalOpen} onClose={() => setTransferModalOpen(false)} title="تحويل أموال بين الخزائن"><TransferFundsForm fromTreasuryId={selectedTreasuryId} onClose={() => setTransferModalOpen(false)} /></Modal>}
            {transactionToView && <TreasuryVoucherView isOpen={!!transactionToView} onClose={() => setTransactionToView(null)} transaction={transactionToView} />}
            {transactionToEdit && isEditTransactionModalOpen && <Modal isOpen={isEditTransactionModalOpen} onClose={() => setEditTransactionModalOpen(false)} title="تعديل سند"><EditTreasuryTransactionForm transaction={transactionToEdit} onClose={() => setEditTransactionModalOpen(false)} onSuccess={handleTransactionEdited} /></Modal>}
        </div>
    );
};

export default Treasury;
