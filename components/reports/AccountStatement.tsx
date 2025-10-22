import React, { useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import ReportToolbar from './ReportToolbar';
import DataTable from '../shared/DataTable';

interface ReportProps {
    partyType: 'customer' | 'supplier';
    partyId: string;
    startDate: string;
    endDate: string;
}

const AccountStatement: React.FC<ReportProps> = ({ partyType, partyId, startDate, endDate }) => {
    const { customers, suppliers, sales, purchases, saleReturns, purchaseReturns, treasury } = useContext(DataContext);

    const { party, openingBalance, transactions, closingBalance } = useMemo(() => {
        const party = partyType === 'customer'
            ? customers.find(c => c.id === partyId)
            : suppliers.find(s => s.id === partyId);

        if (!party) return { party: null, openingBalance: 0, transactions: [], closingBalance: 0 };

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Calculate opening balance
        let ob = 0;
        if (partyType === 'customer') {
            sales.forEach(s => { if (s.customer === party.name && new Date(s.date) < start) ob += s.total; });
            saleReturns.forEach(sr => { if (sr.customer === party.name && new Date(sr.date) < start) ob -= sr.total; });
            treasury.forEach(t => { if (t.partyType === 'customer' && t.partyId === party.id && new Date(t.date) < start) ob -= t.amount; });
        } else {
            purchases.forEach(p => { if (p.supplier === party.name && new Date(p.date) < start) ob += p.total; });
            purchaseReturns.forEach(pr => { if (pr.supplier === party.name && new Date(pr.date) < start) ob -= pr.total; });
            treasury.forEach(t => { if (t.partyType === 'supplier' && t.partyId === party.id && new Date(t.date) < start) ob += t.amount; });
        }

        // Get transactions in range
        let allTransactions: { date: string; description: string; debit: number; credit: number; }[] = [];
        
        if (partyType === 'customer') {
            sales.forEach(s => { if (s.customer === party.name && new Date(s.date) >= start && new Date(s.date) <= end) allTransactions.push({ date: s.date, description: `فاتورة مبيعات رقم ${s.id}`, debit: s.total, credit: 0 }); });
            saleReturns.forEach(sr => { if (sr.customer === party.name && new Date(sr.date) >= start && new Date(sr.date) <= end) allTransactions.push({ date: sr.date, description: `مرتجع مبيعات رقم ${sr.id}`, debit: 0, credit: sr.total }); });
            treasury.forEach(t => { if (t.partyType === 'customer' && t.partyId === party.id && new Date(t.date) >= start && new Date(t.date) <= end) allTransactions.push({ date: t.date, description: t.description, debit: t.amount < 0 ? Math.abs(t.amount) : 0, credit: t.amount > 0 ? t.amount : 0 }); });
        } else {
            purchases.forEach(p => { if (p.supplier === party.name && new Date(p.date) >= start && new Date(p.date) <= end) allTransactions.push({ date: p.date, description: `فاتورة مشتريات رقم ${p.id}`, debit: 0, credit: p.total }); });
            purchaseReturns.forEach(pr => { if (pr.supplier === party.name && new Date(pr.date) >= start && new Date(pr.date) <= end) allTransactions.push({ date: pr.date, description: `مرتجع مشتريات رقم ${pr.id}`, debit: pr.total, credit: 0 }); });
            treasury.forEach(t => { 
                if (t.partyType === 'supplier' && t.partyId === party.id && new Date(t.date) >= start && new Date(t.date) <= end) {
                    // Payment to supplier (amount < 0) is a DEBIT.
                    // Receipt from supplier (amount > 0) is a CREDIT.
                    allTransactions.push({ 
                        date: t.date, 
                        description: t.description, 
                        debit: t.amount < 0 ? Math.abs(t.amount) : 0, 
                        credit: t.amount > 0 ? t.amount : 0 
                    });
                }
            });
        }

        allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = ob;
        const transactionsWithBalance = allTransactions.map((t, index) => {
            if (partyType === 'customer') {
                runningBalance += (t.debit - t.credit);
            } else { // Supplier is a liability account
                runningBalance += (t.credit - t.debit);
            }
            return { ...t, id: index, balance: runningBalance };
        });

        return { party, openingBalance: ob, transactions: transactionsWithBalance, closingBalance: runningBalance };

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
                    <span className="font-bold font-mono">{openingBalance.toLocaleString()} جنيه</span>
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