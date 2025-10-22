import React, { useState, useMemo, useContext } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import type { Account, TreasuryTransaction, JournalEntry } from '../../types';
import AddTreasuryForm from './AddTreasuryForm';
import GeneralTransactionForm from './GeneralTransactionForm';
import TransferFundsForm from './TransferFundsForm';
import TreasuryVoucherView from './TreasuryVoucherView';

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('ar-EG', { style: 'currency', currency: 'EGP' }).format(amount);
};

const AddIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const TransferIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 me-2" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>;


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

const Treasury: React.FC = () => {
    const { treasuriesList, treasury: treasuryTransactions, chartOfAccounts, customers, suppliers } = useContext(DataContext);
    const treasuries = useMemo(() => treasuriesList.filter((t: any) => !t.isTotal), [treasuriesList]);
    const [selectedTreasuryId, setSelectedTreasuryId] = useState<string | null>(treasuries[0]?.id || null);
    const [isAddTreasuryModalOpen, setAddTreasuryModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'deposit' | 'withdrawal' | 'transfer' | null>(null);
    const [transactionToView, setTransactionToView] = useState<TreasuryTransaction | null>(null);
    
    const treasuryBalances: { [key: string]: number } = useMemo(() => {
        const balances: { [key: string]: number } = {};
        treasuries.forEach((t: Account) => {
            balances[t.id] = t.balance || 0
        });
        return balances;
    }, [treasuries]);

    const totalBalance = Object.values(treasuryBalances).reduce((sum, bal) => sum + bal, 0);

    const selectedTreasuryTransactions = useMemo(() => {
        if (!selectedTreasuryId) return [];

        const treasuryNode = treasuriesList.find((t: any) => t.id === selectedTreasuryId);
        if (!treasuryNode) return [];
        let currentBalance = treasuryNode.balance || 0;

        const filteredAndSortedTxsDesc = treasuryTransactions
            .filter((tx: any) => tx.treasuryAccountId === selectedTreasuryId)
            .sort((a: any,b: any) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));

        return filteredAndSortedTxsDesc.map((tx: any) => {
            const txWithDetails = {
                ...tx,
                balance: currentBalance,
                debit: tx.amount < 0 ? Math.abs(tx.amount) : 0,
                credit: tx.amount > 0 ? tx.amount : 0,
            };
            currentBalance -= tx.amount; // work backwards to get previous balance
            return txWithDetails;
        }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime() || b.id.localeCompare(a.id));
    }, [treasuryTransactions, selectedTreasuryId, treasuriesList]);


    const getContraAccountName = (tx: TreasuryTransaction): string => {
        if (tx.partyType === 'account' && tx.partyId) {
            const account = findAccountById(chartOfAccounts, tx.partyId);
            return account ? account.name : tx.accountName || 'حساب محذوف';
        }
        if (tx.partyType === 'customer' && tx.partyId) {
            const customer = customers.find((c: any) => c.id === tx.partyId);
            return customer ? customer.name : 'عميل محذوف';
        }
        if (tx.partyType === 'supplier' && tx.partyId) {
            const supplier = suppliers.find((s: any) => s.id === tx.partyId);
            return supplier ? supplier.name : 'مورد محذوف';
        }
        if (tx.description.includes('تحويل')) return 'تحويل داخلي';
        return 'غير محدد';
    };

    return (
        <div className="flex flex-col h-full">
             <Modal isOpen={isAddTreasuryModalOpen} onClose={() => setAddTreasuryModalOpen(false)} title="إضافة خزينة جديدة">
                <AddTreasuryForm onClose={() => setAddTreasuryModalOpen(false)} />
            </Modal>

            {modalType && (modalType === 'deposit' || modalType === 'withdrawal') && selectedTreasuryId && (
                <Modal 
                    isOpen={!!modalType} 
                    onClose={() => setModalType(null)} 
                    title={modalType === 'deposit' ? 'إضافة نقدية (سند قبض عام)' : 'صرف نقدية (سند صرف عام)'}
                >
                    <GeneralTransactionForm 
                        treasuryId={selectedTreasuryId}
                        type={modalType}
                        onClose={() => setModalType(null)}
                    />
                </Modal>
            )}

            {modalType === 'transfer' && selectedTreasuryId && (
                <Modal 
                    isOpen={modalType === 'transfer'} 
                    onClose={() => setModalType(null)} 
                    title="تحويل أموال بين الخزائن"
                >
                    <TransferFundsForm 
                        fromTreasuryId={selectedTreasuryId}
                        onClose={() => setModalType(null)}
                    />
                </Modal>
            )}

            {transactionToView && (
                <TreasuryVoucherView 
                    isOpen={!!transactionToView}
                    onClose={() => setTransactionToView(null)}
                    transaction={transactionToView}
                />
            )}
            
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">إدارة الخزينة</h2>
                <div className="text-lg text-left bg-gray-200 dark:bg-gray-700 px-4 py-2 rounded-lg">
                    <span className="font-semibold text-gray-600 dark:text-gray-300">إجمالي الرصيد: </span>
                    <span className="font-bold text-blue-700 dark:text-blue-300">{formatCurrency(totalBalance)}</span>
                </div>
            </div>

            <div className="flex flex-col gap-6 flex-1 overflow-hidden">
                <div className="bg-gray-50 dark:bg-gray-800/50 p-4 rounded-lg flex-shrink-0">
                    <div className="flex justify-between items-center mb-4">
                         <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-200">قائمة الخزائن</h3>
                         <button onClick={() => setAddTreasuryModalOpen(true)} className="flex items-center text-sm bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600">
                           <AddIcon /> <span>جديدة</span>
                        </button>
                    </div>
                    <div className="flex flex-wrap gap-4">
                        {treasuries.map((treasury: Account) => (
                             <div
                                key={treasury.id}
                                onClick={() => setSelectedTreasuryId(treasury.id)}
                                className={`p-4 rounded-lg cursor-pointer transition-all duration-200 border-2 w-64 flex-shrink-0 ${selectedTreasuryId === treasury.id ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-500 shadow-sm' : 'bg-white dark:bg-gray-800 border-transparent hover:bg-gray-100 dark:hover:bg-gray-700 hover:shadow-md'}`}
                            >
                                <p className={`font-semibold text-lg ${selectedTreasuryId === treasury.id ? 'text-blue-800 dark:text-blue-200' : 'text-gray-800 dark:text-gray-200'}`}>{treasury.name}</p>
                                <p className="font-bold text-2xl text-gray-900 dark:text-white text-left mt-2">{formatCurrency(treasuryBalances[treasury.id] || 0)}</p>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="flex-1 overflow-hidden bg-white dark:bg-gray-800 p-4 rounded-lg shadow-md flex flex-col">
                    {selectedTreasuryId ? (
                        <>
                            <div className="flex justify-between items-center mb-4 pb-3 border-b dark:border-gray-700 flex-wrap gap-2">
                                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">
                                    حركات: {treasuries.find((t: Account) => t.id === selectedTreasuryId)?.name}
                                </h3>
                                <div className="flex space-x-2 space-x-reverse">
                                    <button onClick={() => setModalType('deposit')} className="flex items-center bg-green-500 text-white px-3 py-2 rounded-lg hover:bg-green-600 text-sm font-semibold">
                                        <AddIcon /> إضافة نقدية
                                    </button>
                                     <button onClick={() => setModalType('transfer')} className="flex items-center bg-blue-500 text-white px-3 py-2 rounded-lg hover:bg-blue-600 text-sm font-semibold">
                                        <TransferIcon /> تحويل أموال
                                    </button>
                                    <button onClick={() => setModalType('withdrawal')} className="flex items-center bg-red-500 text-white px-3 py-2 rounded-lg hover:bg-red-600 text-sm font-semibold">
                                        <AddIcon /> صرف نقدية
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-y-auto">
                                <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                                  <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300 sticky top-0">
                                      <tr>
                                        {['التاريخ', 'الوصف', 'الحساب المقابل', 'منصرف', 'وارد', 'الرصيد'].map(h => <th key={h} className="px-6 py-3">{h}</th>)}
                                      </tr>
                                  </thead>
                                  <tbody>
                                    {selectedTreasuryTransactions.map((tx) => (
                                        <tr key={tx.id} onClick={() => setTransactionToView(tx)} className="cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50">
                                            <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400">{tx.date}</td>
                                            <td className="px-6 py-4 text-sm text-gray-900 dark:text-gray-100">{tx.description}</td>
                                            <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-300 font-medium">{getContraAccountName(tx)}</td>
                                            <td className="px-6 py-4 text-sm text-red-600 dark:text-red-400 font-semibold">{tx.debit > 0 ? formatCurrency(tx.debit) : '-'}</td>
                                            <td className="px-6 py-4 text-sm text-green-600 dark:text-green-400 font-semibold">{tx.credit > 0 ? formatCurrency(tx.credit) : '-'}</td>
                                            <td className="px-6 py-4 text-sm font-bold text-gray-800 dark:text-gray-200">{formatCurrency(tx.balance)}</td>
                                        </tr>
                                    ))}
                                  </tbody>
                                </table>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
                            <h3 className="mt-4 text-xl font-semibold text-gray-700">اختر خزينة</h3>
                            <p className="mt-1 text-gray-500">اختر خزينة من القائمة لعرض حركاتها.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Treasury;
