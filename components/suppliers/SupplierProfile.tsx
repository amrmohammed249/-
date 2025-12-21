
import React, { useState, useContext, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { Purchase, PurchaseReturn, TreasuryTransaction, Sale, SaleReturn, Customer } from '../../types';
import { TruckIcon, PhoneIcon, MapPinIcon, EyeIcon, CalculatorIcon } from '../icons';
import PurchaseInvoiceView from '../purchases/PurchaseInvoiceView';
import PurchaseReturnView from '../purchases/PurchaseReturnView';
import TreasuryVoucherView from '../treasury/TreasuryVoucherView';
import InvoiceView from '../sales/InvoiceView';
import SaleReturnView from '../sales/SaleReturnView';

const SupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { suppliers, purchases, purchaseReturns, treasury, customers, sales, saleReturns } = useContext(DataContext);
  
  const [viewingTransaction, setViewingTransaction] = useState<{ type: string; data: any } | null>(null);
  const [isUnified, setIsUnified] = useState(false);

  const { statementData, party, linkedCustomer, openingBalance } = useMemo(() => {
    if (!id) return { statementData: [], party: null, linkedCustomer: null, openingBalance: 0 };
    const party = suppliers.find((s: any) => s.id === id);
    if (!party) return { statementData: [], party: null, linkedCustomer: null, openingBalance: 0 };

    const linkedCustomer = party.linkedCustomerId ? customers.find((c: Customer) => c.id === party.linkedCustomerId) : null;

    let allTx = [
        ...purchases.filter((t: Purchase) => t.supplier === party.name && !t.isArchived).map((t: Purchase) => ({
            date: t.date, id: t.id, description: `فاتورة مشتريات #${t.id}`,
            debit: 0, credit: t.total, type: 'purchase', original: t
        })),
        ...purchaseReturns.filter((t: PurchaseReturn) => t.supplier === party.name && !t.isArchived).map((t: PurchaseReturn) => ({
            date: t.date, id: t.id, description: `مرتجع مشتريات #${t.id}`,
            debit: t.total, credit: 0, type: 'purchaseReturn', original: t
        })),
        ...treasury.filter((t: TreasuryTransaction) => t.partyType === 'supplier' && t.partyId === party.id && !t.isArchived).map((t: TreasuryTransaction) => ({
            date: t.date, id: t.id, description: t.description,
            debit: t.type === 'سند صرف' ? Math.abs(t.amount) : 0, 
            credit: t.type === 'سند قبض' ? Math.abs(t.amount) : 0, 
            type: 'treasury', original: t
        }))
    ];

    if (isUnified && linkedCustomer) {
        allTx = [
            ...allTx,
            ...sales.filter((t: Sale) => t.customer === linkedCustomer.name && !t.isArchived).map((t: Sale) => ({
                date: t.date, id: t.id, description: `فاتورة مبيعات #${t.id} (عميل)`,
                debit: t.total, credit: 0, type: 'sale', original: t
            })),
            ...saleReturns.filter((t: SaleReturn) => t.customer === linkedCustomer.name && !t.isArchived).map((t: SaleReturn) => ({
                date: t.date, id: t.id, description: `مرتجع مبيعات #${t.id} (عميل)`,
                debit: 0, credit: t.total, type: 'saleReturn', original: t
            })),
            ...treasury.filter((t: TreasuryTransaction) => t.partyType === 'customer' && t.partyId === linkedCustomer.id && !t.isArchived).map((t: TreasuryTransaction) => ({
                date: t.date, id: t.id, description: `${t.description} (عميل)`,
                debit: t.type === 'سند صرف' ? Math.abs(t.amount) : 0, 
                credit: t.type === 'سند قبض' ? Math.abs(t.amount) : 0, 
                type: 'treasury', original: t
            }))
        ];
    }
    
    const totalChange = allTx.reduce((sum, tx) => sum + (tx.credit - tx.debit), 0);
    const openingBalance = (isUnified && linkedCustomer ? (party.balance - linkedCustomer.balance) : party.balance) - totalChange;

    const sortedTx = allTx.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
    });

    let runningBalance = openingBalance;
    const statementWithBalance = sortedTx.map(tx => {
        const change = tx.credit - tx.debit;
        runningBalance += change;
        return { ...tx, balance: runningBalance };
    });

    return { statementData: statementWithBalance, party, linkedCustomer, openingBalance };
  }, [id, suppliers, purchases, purchaseReturns, treasury, isUnified, customers, sales, saleReturns]);

  if (!party) return <div className="p-8 text-center">لم يتم العثور على المورد.</div>;
  
  const getRowClass = (credit: number) => credit > 0 ? 'bg-green-50/50 dark:bg-green-900/10' : 'bg-red-50/50 dark:bg-red-900/10';

  return (
    <div className="space-y-4 md:space-y-6 px-0 md:px-0">
      <div className="bg-white dark:bg-gray-800 p-4 md:p-6 rounded-xl shadow-md border dark:border-gray-700">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 md:gap-6">
          <div className="flex items-center gap-4">
             <div className="p-3 bg-blue-100 dark:bg-blue-900/40 rounded-full shrink-0">
                <TruckIcon className="w-6 h-6 md:w-8 md:h-8 text-blue-500" />
            </div>
            <div className="min-w-0">
                <h2 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-gray-100 truncate">{party.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs md:text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {party.phone && <span className="flex items-center gap-1 shrink-0"><PhoneIcon className="w-3.5 h-3.5" /> {party.phone}</span>}
                    {party.address && <span className="flex items-center gap-1 shrink-0"><MapPinIcon className="w-3.5 h-3.5" /> {party.address}</span>}
                </div>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 md:gap-4 w-full lg:w-auto">
             <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <p className="text-[10px] md:text-xs text-gray-500 mb-1 font-bold">رصيده كمورد</p>
                <p className="font-bold font-mono text-sm md:text-base text-green-600">{party.balance.toLocaleString()}</p>
            </div>
            {linkedCustomer ? (
                <>
                    <div className="text-center p-2 md:p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                        <p className="text-[10px] md:text-xs text-gray-500 mb-1 font-bold">رصيده كعميل</p>
                        <p className="font-bold font-mono text-sm md:text-base text-red-500">{linkedCustomer.balance.toLocaleString()}</p>
                    </div>
                    <div className="col-span-2 sm:col-span-1 text-center p-2 md:p-3 bg-blue-50 dark:bg-blue-900/30 rounded-lg border border-blue-100 dark:border-blue-800">
                        <p className="text-[10px] md:text-xs text-blue-600 dark:text-blue-400 font-bold mb-1 uppercase">الصافي النهائي</p>
                        <p className={`font-bold font-mono text-base md:text-xl ${(party.balance - linkedCustomer.balance) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {(party.balance - linkedCustomer.balance).toLocaleString()}
                        </p>
                    </div>
                </>
            ) : (
                <div className="hidden sm:block"></div>
            )}
          </div>
        </div>
      </div>

      {linkedCustomer && (
        <div className="flex flex-col sm:flex-row items-center justify-between p-3 md:p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-xl gap-3">
            <div className="flex items-center gap-3 w-full sm:w-auto">
                <CalculatorIcon className="w-5 h-5 md:w-6 md:h-6 text-indigo-500 shrink-0" />
                <span className="text-sm md:text-base font-semibold text-indigo-900 dark:text-indigo-100">
                  مرتبط بعميل: <span className="underline">{linkedCustomer.name}</span>
                </span>
            </div>
            <button 
                onClick={() => setIsUnified(!isUnified)}
                className={`w-full sm:w-auto px-4 py-2 rounded-lg text-sm md:text-base font-bold transition-all shadow-sm ${isUnified ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-700 text-indigo-600 border border-indigo-600'}`}
            >
                {isUnified ? 'إخفاء حركات العميل' : 'عرض كشف الحساب الموحد'}
            </button>
        </div>
      )}

      {/* Responsive Statement Table/List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden border dark:border-gray-700">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800">
            <h3 className="text-lg font-bold">كشف الحساب {isUnified ? 'الموحد' : 'التفصيلي'}</h3>
            <span className="text-[10px] md:text-xs text-gray-400 font-medium">مرتب تاريخياً</span>
        </div>

        {/* Desktop View Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-right">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">التاريخ</th>
                <th className="px-4 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">البيان</th>
                <th className="px-4 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">مدين (له)</th>
                <th className="px-4 py-4 text-sm font-bold text-gray-600 dark:text-gray-300">دائن (علينا)</th>
                <th className="px-4 py-4 text-sm font-bold text-gray-600 dark:text-gray-300 text-left">الرصيد</th>
                <th className="px-4 py-4 w-10"></th>
              </tr>
            </thead>
            <tbody>
              <tr className="bg-gray-100/50 dark:bg-gray-700/30 font-bold border-b dark:border-gray-700">
                  <td colSpan={2} className="px-4 py-3 text-sm">رصيد افتتاحي (قبل الفترة)</td>
                  <td colSpan={2} className="px-4 py-3 text-center">-</td>
                  <td className="px-4 py-3 font-mono text-left">{openingBalance.toLocaleString()}</td>
                  <td></td>
              </tr>
              {statementData.map((tx, index) => (
                <tr key={`${tx.id}-${index}`} className={`border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors ${getRowClass(tx.credit)}`}>
                  <td className="px-4 py-3 whitespace-nowrap text-sm">{tx.date}</td>
                  <td className="px-4 py-3 font-medium text-sm">{tx.description}</td>
                  <td className="px-4 py-3 font-mono text-sm">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 font-mono text-sm">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                  <td className="px-4 py-3 font-mono font-bold text-sm text-left">{tx.balance.toLocaleString()}</td>
                  <td className="px-4 py-3 text-center">
                    <button onClick={() => setViewingTransaction({ type: tx.type, data: tx.original })} className="text-blue-500 hover:bg-blue-50 p-1.5 rounded-full transition-colors">
                      <EyeIcon className="w-5 h-5"/>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile View List */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
             <div className="p-4 bg-gray-50 dark:bg-gray-900 font-bold flex justify-between items-center text-sm">
                <span className="text-gray-500">رصيد افتتاحي:</span>
                <span className="font-mono">{openingBalance.toLocaleString()}</span>
            </div>
            {statementData.map((tx, index) => (
                <div key={`${tx.id}-${index}`} className={`p-4 ${getRowClass(tx.credit)}`}>
                    <div className="flex justify-between items-start mb-2">
                        <div className="min-w-0 flex-1">
                            <p className="text-xs text-gray-500 mb-1">{tx.date}</p>
                            <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight">{tx.description}</p>
                        </div>
                        <button onClick={() => setViewingTransaction({ type: tx.type, data: tx.original })} className="p-2 text-blue-500 bg-white dark:bg-gray-700 rounded-lg shadow-sm border dark:border-gray-600">
                            <EyeIcon className="w-5 h-5"/>
                        </button>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <div className="flex-1 bg-white/50 dark:bg-black/20 p-2 rounded text-center border border-black/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">مدين (له +)</p>
                            <p className="font-mono font-bold text-green-600">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</p>
                        </div>
                        <div className="flex-1 bg-white/50 dark:bg-black/20 p-2 rounded text-center border border-black/5">
                            <p className="text-[10px] text-gray-500 uppercase font-bold">دائن (علينا -)</p>
                            <p className="font-mono font-bold text-red-600">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</p>
                        </div>
                        <div className="flex-1 bg-blue-500/10 p-2 rounded text-center border border-blue-500/20">
                            <p className="text-[10px] text-blue-500 uppercase font-bold">الرصيد</p>
                            <p className="font-mono font-bold text-gray-900 dark:text-white">{tx.balance.toLocaleString()}</p>
                        </div>
                    </div>
                </div>
            ))}
            {statementData.length === 0 && <div className="p-10 text-center text-gray-400">لا توجد حركات.</div>}
        </div>
      </div>
      
      {viewingTransaction?.type === 'purchase' && <PurchaseInvoiceView isOpen={true} onClose={() => setViewingTransaction(null)} purchase={viewingTransaction.data} />}
      {viewingTransaction?.type === 'purchaseReturn' && <PurchaseReturnView isOpen={true} onClose={() => setViewingTransaction(null)} purchaseReturn={viewingTransaction.data} />}
      {viewingTransaction?.type === 'sale' && <InvoiceView isOpen={true} onClose={() => setViewingTransaction(null)} sale={viewingTransaction.data} />}
      {viewingTransaction?.type === 'saleReturn' && <SaleReturnView isOpen={true} onClose={() => setViewingTransaction(null)} saleReturn={viewingTransaction.data} />}
      {viewingTransaction?.type === 'treasury' && <TreasuryVoucherView isOpen={true} onClose={() => setViewingTransaction(null)} transaction={viewingTransaction.data} />}
    </div>
  );
};

export default SupplierProfile;
