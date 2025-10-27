import React, { useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import ReportToolbar from './ReportToolbar';
import DataTable from '../shared/DataTable';
import { Sale, SaleReturn, Purchase, PurchaseReturn, TreasuryTransaction } from '../../types';

interface ReportProps {
    partyType: 'customer' | 'supplier';
    partyId: string;
    startDate: string;
    endDate: string;
}

const AccountStatement: React.FC<ReportProps> = ({ partyType, partyId, startDate, endDate }) => {
    const { customers, suppliers, sales, purchases, saleReturns, purchaseReturns, treasury } = useContext(DataContext);

    const { party, openingBalanceForPeriod, transactions, closingBalance } = useMemo(() => {
        const party = partyType === 'customer'
            ? customers.find((c: any) => c.id === partyId)
            : suppliers.find((s: any) => s.id === partyId);

        if (!party) return { party: null, openingBalanceForPeriod: 0, transactions: [], closingBalance: 0 };

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Get ALL transaction objects for the party
        let allTxObjects: any[] = [];
        if (partyType === 'customer') {
            sales.filter((s: Sale) => s.customer === party.name && !s.isArchived).forEach((s: Sale) => allTxObjects.push({ date: s.date, description: `فاتورة مبيعات #${s.id}`, debit: s.total, credit: 0, original: s, type: 'sale' }));
            saleReturns.filter((sr: SaleReturn) => sr.customer === party.name && !sr.isArchived).forEach((sr: SaleReturn) => allTxObjects.push({ date: sr.date, description: `مرتجع مبيعات #${sr.id}`, debit: 0, credit: sr.total, original: sr, type: 'saleReturn' }));
            treasury.filter((t: TreasuryTransaction) => t.partyType === 'customer' && t.partyId === party.id && !t.isArchived).forEach((t: TreasuryTransaction) => {
                if (t.type === 'سند قبض') allTxObjects.push({ date: t.date, description: t.description, debit: 0, credit: t.amount > 0 ? t.amount : 0, original: t, type: 'treasury' });
                if (t.type === 'سند صرف') allTxObjects.push({ date: t.date, description: t.description, debit: t.amount < 0 ? Math.abs(t.amount) : 0, credit: 0, original: t, type: 'treasury' });
            });
        } else { // Supplier
            purchases.filter((p: Purchase) => p.supplier === party.name && !p.isArchived).forEach((p: Purchase) => allTxObjects.push({ date: p.date, description: `فاتورة مشتريات #${p.id}`, debit: 0, credit: p.total, original: p, type: 'purchase' }));
            purchaseReturns.filter((pr: PurchaseReturn) => pr.supplier === party.name && !pr.isArchived).forEach((pr: PurchaseReturn) => allTxObjects.push({ date: pr.date, description: `مرتجع مشتريات #${pr.id}`, debit: pr.total, credit: 0, original: pr, type: 'purchaseReturn' }));
            treasury.filter((t: TreasuryTransaction) => t.partyType === 'supplier' && t.partyId === party.id && !t.isArchived).forEach((t: TreasuryTransaction) => {
                if (t.type === 'سند صرف') allTxObjects.push({ date: t.date, description: t.description, debit: t.amount < 0 ? Math.abs(t.amount) : 0, credit: 0, original: t, type: 'treasury' });
                if (t.type === 'سند قبض') allTxObjects.push({ date: t.date, description: t.description, debit: 0, credit: t.amount > 0 ? t.amount : 0, original: t, type: 'treasury' });
            });
        }

        // 2. Calculate Opening Balance for the Period by working backwards from current balance
        let openingBalanceForPeriod = party.balance;
        allTxObjects.forEach(tx => {
            const txDate = new Date(tx.date);
            if (txDate >= start) { // If transaction is in or after the period, reverse its effect from the current balance
                const change = partyType === 'customer' ? (tx.debit - tx.credit) : (tx.credit - tx.debit);
                openingBalanceForPeriod -= change;
            }
        });

        // 3. Filter transactions for the period and calculate running balance
        const periodTransactions = allTxObjects
            .filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= start && txDate <= end;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = openingBalanceForPeriod;
        const transactionsWithBalance = periodTransactions.map((t, index) => {
            const change = partyType === 'customer' ? (t.debit - t.credit) : (t.credit - t.debit);
            runningBalance += change;
            return { ...t, id: `${t.original.id}-${index}`, balance: runningBalance };
        });

        return { 
            party, 
            openingBalanceForPeriod, 
            transactions: transactionsWithBalance.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()), // sort desc for display
            closingBalance: runningBalance 
        };

    }, [partyId, partyType, startDate, endDate, customers, suppliers, sales, purchases, saleReturns, purchaseReturns, treasury]);


    const columns = [
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الوصف', accessor: 'description' },
        { header: 'مدين', accessor: 'debit', render: (row: any) => row.debit > 0 ? row.debit.toLocaleString() : '-' },
        { header: 'دائن', accessor: 'credit', render: (row: any) => row.credit > 0 ? row.credit.toLocaleString() : '-' },
        { header: 'الرصيد', accessor: 'balance', render: (row: any) => row.balance.toLocaleString() },
    ];

    if (!party) return <div className="p-6">الرجاء اختيار طرف صحيح.</div>;

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">كشف حساب {partyType === 'customer' ? 'عميل' : 'مورد'}</h3>
                        <p className="font-semibold text-gray-600 dark:text-gray-300">{party.name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                        </p>
                    </div>
                     <ReportToolbar
                        reportName={`Account-Statement-${party.name}`}
                    />
                </div>

                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4 flex justify-between items-center">
                    <span className="font-semibold">الرصيد الافتتاحي في {startDate}:</span>
                    <span className="font-bold font-mono">{openingBalanceForPeriod.toLocaleString()} جنيه</span>
                </div>

                <DataTable columns={columns} data={transactions} searchableColumns={['description']} />
                
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mt-4 flex justify-between items-center">
                    <span className="font-semibold">الرصيد الختامي في {endDate}:</span>
                    <span className="font-bold font-mono text-lg">{closingBalance.toLocaleString()} جنيه</span>
                </div>
            </div>
        </div>
    );
};

export default AccountStatement;