import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode, TreasuryTransaction } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    expenseAccountId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

// Define explicit types to avoid 'unknown'/'any' from Object.entries
type ExpenseTransaction = TreasuryTransaction & { amount: number; detailName: string };
type L2Group = { total: number; transactions: ExpenseTransaction[] };
type L1Group = { total: number; groups: Record<string, L2Group> };


// Helper to find the full path of an account in the tree
const findAccountPath = (nodes: AccountNode[], accountId: string, currentPath: AccountNode[] = []): AccountNode[] | null => {
    for (const node of nodes) {
        const newPath = [...currentPath, node];
        if (node.id === accountId) {
            return newPath;
        }
        if (node.children) {
            const foundPath = findAccountPath(node.children, accountId, newPath);
            if (foundPath) return foundPath;
        }
    }
    return null;
};


const ExpenseReport: React.FC<ReportProps> = ({ startDate, endDate, expenseAccountId, onDataReady }) => {
    const { treasury, chartOfAccounts } = useContext(DataContext);
    
    const expenseRootId = '4-2'; // ID for 'مصاريف تشغيل'

    const { hierarchicalExpenses, totalExpenses } = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        // Filter for all expense transactions within the date range
        const expenseTransactions = treasury.filter((t: TreasuryTransaction) => {
            const tDate = new Date(t.date);
            if (t.type !== 'سند صرف' || t.partyType !== 'account' || !t.partyId) return false;
            
            const path = findAccountPath(chartOfAccounts, t.partyId);
            if (!path || !path.some(p => p.id === expenseRootId)) return false; // Must be under the main expense account
            
            const dateMatch = tDate >= start && tDate <= end;
            const accountMatch = !expenseAccountId || path.some(p => p.id === expenseAccountId);
            
            return dateMatch && accountMatch;
        });

        // Group transactions hierarchically
        const hierarchy: Record<string, L1Group> = {};
        let total = 0;

        expenseTransactions.forEach(t => {
            const path = findAccountPath(chartOfAccounts, t.partyId!);
            if (!path) return;

            const expenseRootIndex = path.findIndex(p => p.id === expenseRootId);
            if (expenseRootIndex === -1) return;

            // Get path segments starting *after* the main expense root
            const expensePath = path.slice(expenseRootIndex + 1);
            if (expensePath.length < 1) return;

            const l1Node = expensePath[0];
            const l2Node = expensePath.length > 1 ? expensePath[1] : null;
            const l3Node = expensePath.length > 2 ? expensePath[2] : null;

            const l1Name = l1Node.name;
            // If there's no L2 group but it's a direct child of L1, use a default group name
            const l2Name = l2Node ? l2Node.name : 'مصروفات مباشرة';

            const transactionAmount = Math.abs(t.amount);
            total += transactionAmount;

            if (!hierarchy[l1Name]) hierarchy[l1Name] = { total: 0, groups: {} };
            if (!hierarchy[l1Name].groups[l2Name]) hierarchy[l1Name].groups[l2Name] = { total: 0, transactions: [] };

            hierarchy[l1Name].total += transactionAmount;
            hierarchy[l1Name].groups[l2Name].total += transactionAmount;
            hierarchy[l1Name].groups[l2Name].transactions.push({
                ...t,
                amount: transactionAmount,
                // The most detailed account name
                detailName: l3Node?.name || l2Node?.name || l1Node.name,
            });
        });

        return { hierarchicalExpenses: hierarchy, totalExpenses: total };

    }, [treasury, startDate, endDate, expenseAccountId, chartOfAccounts]);
    
    const reportName = `Expense-Report-${startDate}-to-${endDate}${expenseAccountId ? `-Account${expenseAccountId}` : ''}`;

    useEffect(() => {
        const exportData: any[] = [];
        const exportColumns = [
            { header: 'الفئة الرئيسية', accessor: 'l1' },
            { header: 'المجموعة', accessor: 'l2' },
            { header: 'الحساب', accessor: 'accountName' },
            { header: 'التاريخ', accessor: 'date' },
            { header: 'البيان', accessor: 'description' },
            { header: 'المبلغ', accessor: 'amount' },
        ];
        
        Object.entries(hierarchicalExpenses).forEach(([l1Name, l1Data]: [string, L1Group]) => {
            Object.entries(l1Data.groups).forEach(([l2Name, l2Data]: [string, L2Group]) => {
                l2Data.transactions.forEach((t: ExpenseTransaction) => {
                    exportData.push({
                        l1: l1Name,
                        l2: l2Name,
                        accountName: t.accountName,
                        date: t.date,
                        description: t.description,
                        amount: t.amount,
                    });
                });
            });
        });

        onDataReady({ data: exportData, columns: exportColumns, name: reportName });
    }, [hierarchicalExpenses, onDataReady, reportName]);

    const hasExpenses = Object.keys(hierarchicalExpenses).length > 0;
    
    const sortedL1Entries = Object.entries(hierarchicalExpenses).sort(([, a]: [string, L1Group], [, b]: [string, L1Group]) => b.total - a.total);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير المصروفات</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                        </p>
                    </div>
                </div>

                {!hasExpenses ? (
                     <div className="text-center py-12 text-gray-500">لا توجد مصروفات في الفترة المحددة.</div>
                ) : (
                    <div className="space-y-6">
                        {sortedL1Entries.map(([l1Name, l1Data]: [string, L1Group]) => (
                            <div key={l1Name} className="border dark:border-gray-700 rounded-lg">
                                <div className="flex justify-between items-center font-bold bg-gray-100 dark:bg-gray-700/50 p-3 rounded-t-lg">
                                    <h4 className="text-xl text-gray-800 dark:text-gray-100">{l1Name}</h4>
                                    <span className="text-xl font-mono">{l1Data.total.toLocaleString()} جنيه</span>
                                </div>
                                
                                <div className="p-2 md:p-4 space-y-4">
                                  {Object.entries(l1Data.groups).sort(([,a]: [string, L2Group],[,b]: [string, L2Group]) => b.total - a.total).map(([l2Name, l2Data]: [string, L2Group]) => (
                                      <div key={l2Name} className="border-r-4 border-gray-200 dark:border-gray-600 pr-4">
                                          <div className="flex justify-between items-center font-semibold text-gray-700 dark:text-gray-300 mb-2">
                                              <h5 className="text-lg">{l2Name}</h5>
                                              <span className="text-lg font-mono">{l2Data.total.toLocaleString()}</span>
                                          </div>
                                          <ul className="divide-y dark:divide-gray-700/50">
                                              {l2Data.transactions.sort((a: ExpenseTransaction, b: ExpenseTransaction) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((t: ExpenseTransaction) => (
                                                  <li key={t.id} className="flex justify-between items-center py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-700/30 rounded-md -mr-4 px-4">
                                                      <div>
                                                          <p className="font-medium text-gray-800 dark:text-gray-300">{t.description}</p>
                                                          <p className="text-xs text-gray-500">{t.date} &middot; {t.detailName}</p>
                                                      </div>
                                                      <span className="font-mono">{t.amount.toLocaleString()}</span>
                                                  </li>
                                              ))}
                                          </ul>
                                      </div>
                                  ))}
                                </div>
                            </div>
                        ))}
                         <div className="flex justify-between items-center font-extrabold text-2xl p-4 mt-4 bg-gray-200 dark:bg-gray-800 rounded-lg">
                            <span>إجمالي المصروفات</span>
                            <span>{totalExpenses.toLocaleString()} جنيه</span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ExpenseReport;