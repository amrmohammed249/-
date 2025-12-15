
import React, { useState, useContext, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { Purchase, PurchaseReturn, TreasuryTransaction, JournalEntry } from '../../types';
import { TruckIcon, PhoneIcon, MapPinIcon, BanknotesIcon, EyeIcon, CalculatorIcon } from '../icons';
import PurchaseInvoiceView from '../purchases/PurchaseInvoiceView';
import PurchaseReturnView from '../purchases/PurchaseReturnView';
import TreasuryVoucherView from '../treasury/TreasuryVoucherView';
import ViewDetailsModal from '../shared/ViewDetailsModal';
import Modal from '../shared/Modal';
import SupplierNoteForm from './SupplierNoteForm';

const SupplierProfile: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const { suppliers, purchases, purchaseReturns, treasury, journal } = useContext(DataContext);
  
  const [viewingTransaction, setViewingTransaction] = useState<{ type: string; data: any } | null>(null);
  const [isNoteModalOpen, setNoteModalOpen] = useState(false);

  const { statementData, party, openingBalance } = useMemo(() => {
    if (!id) return { statementData: [], party: null, openingBalance: 0 };
    const party = suppliers.find((s: any) => s.id === id);
    if (!party) return { statementData: [], party: null, openingBalance: 0 };

    const allTx = [
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
            debit: t.type === 'سند صرف' ? Math.abs(t.amount) : 0, // Payment to supplier is a debit
            credit: t.type === 'سند قبض' ? Math.abs(t.amount) : 0, // Refund from supplier is a credit
            type: 'treasury', original: t
        })),
        // Add Journal Entries explicitly linked to this supplier (Debit/Credit Notes)
        ...journal.filter((j: JournalEntry) => !j.isArchived && j.relatedPartyType === 'supplier' && j.relatedPartyId === party.id).map((j: JournalEntry) => ({
            date: j.date, id: j.id, description: j.description,
            // Logic: If user created a "Debit Note" (reduces debt), the Supplier Control Account was debited.
            // In JournalEntry lines, we need to find the line affecting the supplier account.
            // Simplified for display: The 'debit' and 'credit' fields on the JE object represent totals.
            // We assume the JE is balanced. We need to determine the direction relative to the supplier.
            // However, our `SupplierNoteForm` logic:
            // Debit Note -> Debit Supplier Control.
            // Credit Note -> Credit Supplier Control.
            // We can infer direction from description or check lines. Let's check lines for robustness.
            debit: j.lines.reduce((sum, line) => {
                 // Assuming '2101' is the Supplier Control code prefix or we check if debit > 0 on the supplier line
                 // Since we don't easily know which line is the supplier line without code, we use the fact that
                 // Debit Note = reduces balance = Debit column in statement.
                 // Credit Note = increases balance = Credit column in statement.
                 // We can rely on the description convention we set: "إشعار خصم" vs "إشعار إضافة"
                 if (j.description.includes('إشعار خصم')) return sum + j.debit; // Debit Note -> Debit Column
                 return sum;
            }, 0),
            credit: j.lines.reduce((sum, line) => {
                 if (j.description.includes('إشعار إضافة')) return sum + j.credit; // Credit Note -> Credit Column
                 return sum;
            }, 0),
            type: 'journal', original: j
        }))
    ];
    
    // 1. Calculate the "beginning of time" opening balance
    const totalChange = allTx.reduce((sum, tx) => sum + (tx.credit - tx.debit), 0);
    const openingBalance = party.balance - totalChange;

    // 2. Sort all transactions chronologically (Oldest -> Newest).
    const sortedTx = allTx.sort((a, b) => {
        const dateA = new Date(a.date).getTime();
        const dateB = new Date(b.date).getTime();
        if (dateA !== dateB) return dateA - dateB;
        return a.id.localeCompare(b.id);
    });

    // 3. Calculate running balance
    let runningBalance = openingBalance;
    const statementWithBalance = sortedTx.map(tx => {
        const change = tx.credit - tx.debit;
        runningBalance += change;
        return { ...tx, balance: runningBalance };
    });

    // 4. Return as Oldest -> Newest
    const finalStatementData = statementWithBalance;

    return { statementData: finalStatementData, party, openingBalance };
  }, [id, suppliers, purchases, purchaseReturns, treasury, journal]);

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
          <div className="mt-4 md:mt-0 flex items-center gap-4">
             <div className="text-right">
                <p className="text-sm text-gray-500 dark:text-gray-400">الرصيد الحالي (لهم)</p>
                <p className={`text-3xl font-bold font-mono ${party.balance >= 0.01 ? 'text-green-600' : 'text-red-500'}`}>
                {party.balance.toLocaleString()} جنيه
                </p>
            </div>
            <button 
                onClick={() => setNoteModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200 transition-colors"
                title="إضافة إشعار خصم/إضافة"
            >
                <CalculatorIcon className="w-5 h-5" />
                <span>تسوية</span>
            </button>
          </div>
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
        <h3 className="text-xl font-bold mb-4">كشف الحساب (الأقدم للأحدث)</h3>
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
              <tr className="bg-gray-100 dark:bg-gray-700 font-semibold">
                  <td colSpan={2} className="px-4 py-2">الرصيد الافتتاحي الأولي</td>
                  <td colSpan={3} className="px-4 py-2 font-mono">{openingBalance.toLocaleString()}</td>
                  <td></td>
              </tr>
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
            </tbody>
          </table>
        </div>
      </div>
      
      {viewingTransaction?.type === 'purchase' && <PurchaseInvoiceView isOpen={true} onClose={() => setViewingTransaction(null)} purchase={viewingTransaction.data} />}
      {viewingTransaction?.type === 'purchaseReturn' && <PurchaseReturnView isOpen={true} onClose={() => setViewingTransaction(null)} purchaseReturn={viewingTransaction.data} />}
      {viewingTransaction?.type === 'treasury' && <TreasuryVoucherView isOpen={true} onClose={() => setViewingTransaction(null)} transaction={viewingTransaction.data} />}
      {viewingTransaction?.type === 'journal' && <ViewDetailsModal isOpen={true} onClose={() => setViewingTransaction(null)} title={`تفاصيل الإشعار: ${viewingTransaction.data.id}`} data={viewingTransaction.data} />}

      <Modal isOpen={isNoteModalOpen} onClose={() => setNoteModalOpen(false)} title="تسوية حساب (إشعار خصم/إضافة)">
          <SupplierNoteForm supplier={party} onClose={() => setNoteModalOpen(false)} onSuccess={() => setNoteModalOpen(false)} />
      </Modal>
    </div>
  );
};

export default SupplierProfile;
