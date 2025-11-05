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
    const { treasury, treasuriesList, totalCashBalance } = useContext(DataContext);

    const { currentActualBalance, selectedTreasuryName } = useMemo(() => {
        if (treasuryAccountId) {
            const selectedTreasury = treasuriesList.find((t: any) => t.id === treasuryAccountId);
            return {
                currentActualBalance: selectedTreasury?.balance || 0,
                selectedTreasuryName: selectedTreasury?.name || "خزينة محددة",
            };
        }
        return {
            currentActualBalance: totalCashBalance,
            selectedTreasuryName: 'كل الخزائن',
        };
    }, [treasuryAccountId, treasuriesList, totalCashBalance]);

    const { openingBalance, transactions, closingBalance, totalDebits, totalCredits, netChange } = useMemo(() => {
        const start = new Date(startDate);
        start.setHours(0, 0, 0, 0);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const allTxObjects = treasury.filter((t: TreasuryTransaction) => {
            const accountMatch = !treasuryAccountId || t.treasuryAccountId === treasuryAccountId;
            return accountMatch && !t.isArchived;
        });

        // 1. Calculate initial opening balance (at time zero) by working backwards from the true current balance
        const totalChangeAllTime = allTxObjects.reduce((sum, tx) => sum + tx.amount, 0);
        const initialOpeningBalance = currentActualBalance - totalChangeAllTime;

        // 2. Calculate opening balance for the period by applying pre-period transactions
        const openingBalanceForPeriod = allTxObjects
            .filter(tx => new Date(tx.date) < start)
            .reduce((balance, tx) => balance + tx.amount, initialOpeningBalance);
        
        // 3. Filter for transactions within the period and sort them
        const periodTransactionsRaw = allTxObjects
            .filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= start && txDate <= end;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        // 4. Calculate running balance for the period
        let runningBalance = openingBalanceForPeriod;
        const transactionsWithBalance = periodTransactionsRaw.map(tx => {
            runningBalance += tx.amount;
            return {
                ...tx,
                debit: tx.type === 'سند صرف' ? Math.abs(tx.amount) : 0,
                credit: tx.type === 'سند قبض' ? Math.abs(tx.amount) : 0,
                balance: runningBalance
            };
        });
        
        // 5. Calculate totals for the period
        const totals = transactionsWithBalance.reduce((acc, t) => {
            acc.totalDebits += t.debit;
            acc.totalCredits += t.credit;
            return acc;
        }, { totalDebits: 0, totalCredits: 0 });
        
        const netChange = totals.totalCredits - totals.totalDebits;

        return {
            openingBalance: openingBalanceForPeriod,
            transactions: transactionsWithBalance,
            closingBalance: runningBalance,
            totalDebits: totals.totalDebits,
            totalCredits: totals.totalCredits,
            netChange,
        };
    }, [treasury, startDate, endDate, treasuryAccountId, currentActualBalance]);
    
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

                <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/30 border-l-4 border-blue-500 rounded-r-lg">
                    <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">الرصيد الفعلي الحالي لـ "{selectedTreasuryName}"</p>
                    <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100 mt-1">
                        {currentActualBalance.toLocaleString()} جنيه
                    </p>
                </div>
                
                <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md mb-2 flex justify-between items-center">
                    <span className="font-semibold">رصيد أول المدة في {startDate}:</span>
                    <span className="font-bold font-mono">{openingBalance.toLocaleString()} جنيه</span>
                </div>
                
                <div className={`p-3 rounded-md mb-4 flex justify-between items-center ${netChange >= 0 ? 'bg-green-50 dark:bg-green-900/20' : 'bg-red-50 dark:bg-red-900/20'}`}>
                    <span className={`font-semibold ${netChange >= 0 ? 'text-green-800 dark:text-green-200' : 'text-red-800 dark:text-red-200'}`}>صافي الحركة خلال الفترة:</span>
                    <span className={`font-bold font-mono ${netChange >= 0 ? 'text-green-700 dark:text-green-300' : 'text-red-700 dark:text-red-300'}`}>
                        {netChange >= 0 ? '+' : ''}{netChange.toLocaleString()} جنيه
                    </span>
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
                                    <td className="px-6 py-3 font-mono text-red-600 dark:text-red-400">{totalDebits.toLocaleString()}</td>
                                    <td className="px-6 py-3 font-mono text-green-600 dark:text-green-400">{totalCredits.toLocaleString()}</td>
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
