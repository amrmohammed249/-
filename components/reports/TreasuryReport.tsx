import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { TreasuryTransaction } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    treasuryAccountId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const TreasuryReport: React.FC<ReportProps> = ({ startDate, endDate, treasuryAccountId, onDataReady }) => {
    const { treasury, treasuriesList } = useContext(DataContext);

    const { openingBalance, transactions, closingBalance, totalDebits, totalCredits } = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // 1. Calculate Opening Balance
        const ob = treasury
            .filter((t: TreasuryTransaction) => {
                const tDate = new Date(t.date);
                const accountMatch = !treasuryAccountId || t.treasuryAccountId === treasuryAccountId;
                return tDate < start && accountMatch;
            })
            .reduce((sum, t) => sum + t.amount, 0);

        // 2. Get transactions within date range
        const transactionsInRange = treasury
            .filter((t: TreasuryTransaction) => {
                const tDate = new Date(t.date);
                const accountMatch = !treasuryAccountId || t.treasuryAccountId === treasuryAccountId;
                return tDate >= start && tDate <= end && accountMatch;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 3. Process transactions to include running balance, debits, and credits
        let runningBalance = ob;
        const processedTransactions = transactionsInRange.map(t => {
            runningBalance += t.amount;
            return {
                ...t,
                debit: t.type === 'سند صرف' ? Math.abs(t.amount) : 0,
                credit: t.type === 'سند قبض' ? t.amount : 0,
                balance: runningBalance
            };
        });
        
        // 4. Calculate totals
        const totals = processedTransactions.reduce((acc, t) => {
            acc.totalDebits += t.debit;
            acc.totalCredits += t.credit;
            return acc;
        }, { totalDebits: 0, totalCredits: 0 });

        return {
            openingBalance: ob,
            transactions: processedTransactions,
            closingBalance: runningBalance,
            totalDebits: totals.totalDebits,
            totalCredits: totals.totalCredits,
        };
    }, [treasury, startDate, endDate, treasuryAccountId]);
    
    const columns = [
        { header: 'التاريخ', accessor: 'date' },
        { header: 'البيان', accessor: 'description' },
        { header: 'الخزينة', accessor: 'treasuryAccountName' },
        { header: 'مدين (صرف)', accessor: 'debit', render: (row: any) => row.debit > 0 ? row.debit.toLocaleString() : '-' },
        { header: 'دائن (قبض)', accessor: 'credit', render: (row: any) => row.credit > 0 ? row.credit.toLocaleString() : '-' },
        { header: 'الرصيد', accessor: 'balance', render: (row: any) => row.balance.toLocaleString() },
    ];
    
    const selectedTreasury = treasuryAccountId ? treasuriesList.find((t: any) => t.id === treasuryAccountId) : null;
    const reportName = `Treasury-Movement-${startDate}-to-${endDate}${selectedTreasury ? `-${selectedTreasury.name}` : ''}`;

    useEffect(() => {
        onDataReady({ data: transactions, columns, name: reportName });
    }, [transactions, columns, reportName, onDataReady]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير حركة الخزينة</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedTreasury && ` | الخزينة: ${selectedTreasury.name}`}
                        </p>
                    </div>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-4 flex justify-between items-center">
                    <span className="font-semibold">الرصيد الافتتاحي في {startDate}:</span>
                    <span className="font-bold font-mono">{openingBalance.toLocaleString()} جنيه</span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                {columns.map((col, index) => (
                                    <th key={index} scope="col" className="px-6 py-3">{col.header}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {transactions.length > 0 ? transactions.map((row, rowIndex) => (
                                <tr key={row.id || rowIndex} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    {columns.map((col, colIndex) => (
                                        <td key={colIndex} className="px-6 py-4 font-medium text-gray-900 dark:text-white whitespace-nowrap">
                                            {col.render ? col.render(row) : (row as any)[col.accessor]}
                                        </td>
                                    ))}
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={columns.length} className="text-center py-10 text-gray-500">لا توجد حركات في الفترة المحددة.</td>
                                </tr>
                            )}
                        </tbody>
                        {transactions.length > 0 && (
                            <tfoot className="font-semibold text-gray-800 dark:text-gray-200 bg-gray-100 dark:bg-gray-700/50">
                                <tr>
                                    <td colSpan={3} className="px-6 py-3 text-center">الإجماليات</td>
                                    <td className="px-6 py-3 font-mono">{totalDebits.toLocaleString()}</td>
                                    <td className="px-6 py-3 font-mono">{totalCredits.toLocaleString()}</td>
                                    <td className="px-6 py-3"></td>
                                </tr>
                            </tfoot>
                        )}
                    </table>
                </div>
                
                <div className="bg-gray-100 dark:bg-gray-700 p-3 rounded-md mt-4 flex justify-between items-center">
                    <span className="font-semibold">الرصيد الختامي في {endDate}:</span>
                    <span className="font-bold font-mono text-lg">{closingBalance.toLocaleString()} جنيه</span>
                </div>

            </div>
        </div>
    );
};

export default TreasuryReport;