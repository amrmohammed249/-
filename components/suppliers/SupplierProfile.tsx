import React, { useState, useContext, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { Purchase, PurchaseReturn, TreasuryTransaction } from '../../types';
import { TruckIcon, PhoneIcon, MapPinIcon, BanknotesIcon, EyeIcon } from '../icons';
import PurchaseInvoiceView from '../purchases/PurchaseInvoiceView';
import PurchaseReturnView from '../purchases/PurchaseReturnView';
import TreasuryVoucherView from '../treasury/TreasuryVoucherView';

const SupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { suppliers, purchases, purchaseReturns, treasury } = useContext(DataContext);
  
  const [viewingTransaction, setViewingTransaction] = useState<{ type: string; data: any } | null>(null);

  const { statementData, party, openingBalance } = useMemo(() => {
    if (!id) return { statementData: [], party: null, openingBalance: 0 };
    const party = suppliers.find((s: any) => s.id === id);
    if (!party) return { statementData: [], party: null, openingBalance: 0 };

    const purchasesTx = purchases.filter((t: Purchase) => t.supplier === party.name).map((t: Purchase) => ({
        date: t.date, id: t.id, description: `فاتورة مشتريات #${t.id}`,
        debit: 0, credit: t.total, type: 'purchase', original: t
    }));

    const returnsTx = purchaseReturns.filter((t: PurchaseReturn) => t.supplier === party.name).map((t: PurchaseReturn) => ({
        date: t.date, id: t.id, description: `مرتجع مشتريات #${t.id}`,
        debit: t.total, credit: 0, type: 'purchaseReturn', original: t
    }));

    const treasuryTx = treasury.filter((t: TreasuryTransaction) => t.partyType === 'supplier' && t.partyId === party.id).map((t: TreasuryTransaction) => ({
        date: t.date, id: t.id, description: t.description,
        debit: t.type === 'سند صرف' ? Math.abs(t.amount) : 0,
        credit: t.type === 'سند قبض' ? t.amount : 0,
        type: 'treasury', original: t
    }));

    const allTx = [...purchasesTx, ...returnsTx, ...treasuryTx].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

    const totalDebit = allTx.reduce((sum, tx) => sum + tx.debit, 0);
    const totalCredit = allTx.reduce((sum, tx) => sum + tx.credit, 0);
    const openingBalance = party.balance - (totalCredit - totalDebit);
    
    let runningBalance = openingBalance;
    const statementData = allTx.map(tx => {
        runningBalance += (tx.credit - tx.debit);
        return { ...tx, balance: runningBalance };
    }).sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return { statementData, party, openingBalance };
  }, [id, suppliers, purchases, purchaseReturns, treasury]);

  if (!party) {
    return <div className="p-8 text-center">لم يتم العثور على المورد.</div>;
  }
  
  const getRowClass = (credit: number) => credit > 0 ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10';

  return (
    <div className="space-y-6">
      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100 flex items-center gap-3">
              <TruckIcon className="w-8 h-8 text-blue-500" />
              {party.name}
            </h2>
            <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400 mt-2">
                {party.phone && <span className="flex items-center gap-1"><PhoneIcon className="w-4 h-4" /> {party.phone}</span>}
                {party.address && <span className="flex items-center gap-1"><MapPinIcon className="w-4 h-4" /> {party.address}</span>}
            </div>
          </div>
          <div className="mt-4 md:mt-0 text-right">
            <p className="text-sm text-gray-500 dark:text-gray-400">الرصيد الحالي (لنا)</p>
            <p className={`text-3xl font-bold font-mono ${party.balance > 0 ? 'text-green-600' : 'text-red-500'}`}>
              {party.balance.toLocaleString()} جنيه
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4">كشف الحساب</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-gray-50 dark:bg-gray-700/50">
              <tr>
                <th className="px-4 py-2">التاريخ</th>
                <th className="px-4 py-2">البيان</th>
                <th className="px-4 py-2">مدين (له)</th>
                <th className="px-4 py-2">دائن (علينا)</th>
                <th className="px-4 py-2">الرصيد</th>
                <th className="px-4 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {statementData.map((tx, index) => (
                <tr key={`${tx.id}-${index}`} className={`border-b dark:border-gray-700 ${getRowClass(tx.credit)}`}>
                  <td className="px-4 py-2">{tx.date}</td>
                  <td className="px-4 py-2">{tx.description}</td>
                  <td className="px-4 py-2 font-mono">{tx.debit > 0 ? tx.debit.toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 font-mono">{tx.credit > 0 ? tx.credit.toLocaleString() : '-'}</td>
                  <td className="px-4 py-2 font-mono font-semibold">{tx.balance.toLocaleString()}</td>
                  <td className="px-4 py-2">
                    <button onClick={() => setViewingTransaction({ type: tx.type, data: tx.original })} className="text-blue-500 hover:underline">
                      <EyeIcon className="w-5 h-5"/>
                    </button>
                  </td>
                </tr>
              ))}
              <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                  <td colSpan={2} className="px-4 py-2">الرصيد الافتتاحي</td>
                  <td colSpan={3} className="px-4 py-2 font-mono">{openingBalance.toLocaleString()}</td>
                  <td></td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
      
      {viewingTransaction?.type === 'purchase' && <PurchaseInvoiceView isOpen={true} onClose={() => setViewingTransaction(null)} purchase={viewingTransaction.data} />}
      {viewingTransaction?.type === 'purchaseReturn' && <PurchaseReturnView isOpen={true} onClose={() => setViewingTransaction(null)} purchaseReturn={viewingTransaction.data} />}
      {viewingTransaction?.type === 'treasury' && <TreasuryVoucherView isOpen={true} onClose={() => setViewingTransaction(null)} transaction={viewingTransaction.data} />}
    </div>
  );
};

export default SupplierProfile;