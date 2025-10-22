import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

// Sums balances of all leaf nodes under a given set of nodes.
const sumBalances = (nodes: AccountNode[]): number => {
    return nodes.reduce((sum, node) => {
        if (node.children && node.children.length > 0) {
            return sum + sumBalances(node.children);
        }
        // For revenues (credits), balance is negative. For expenses (debits), balance is positive.
        return sum + (node.balance || 0);
    }, 0);
};

const AccountSection: React.FC<{ nodes: AccountNode[] }> = ({ nodes }) => {
    return (
        <div className="space-y-2 pr-4">
            {nodes.map(node => (
                <div key={node.id} className="flex justify-between py-2 border-b border-dashed dark:border-gray-700">
                    <span className="text-gray-700 dark:text-gray-300">{node.name}</span>
                    <span className="font-mono">{Math.abs(node.balance || 0).toLocaleString()}</span>
                </div>
            ))}
        </div>
    );
};


const ProfitAndLoss: React.FC<ReportProps> = ({ startDate, endDate, onDataReady }) => {
    const { chartOfAccounts } = useContext(DataContext);

    const { revenues, expenses, totalRevenue, totalExpenses, netProfit } = useMemo(() => {
        const revAndExpNode = chartOfAccounts.find((n: any) => n.id === '4'); // الإيرادات والمصروفات
        
        // Revenues are children of 'Revenues and Expenses' that are NOT 'Operating Expenses'
        const revenues = revAndExpNode?.children?.filter((n: AccountNode) => n.id !== '4-2') || [];

        const expenseNode = revAndExpNode?.children?.find((n: any) => n.id === '4-2'); // مصروفات تشغيل
        const expenses = expenseNode?.children || [];

        // Revenue balances are negative (credits), so we take the absolute value for display.
        const totalRevenue = Math.abs(sumBalances(revenues));
        // Expense balances are positive (debits).
        const totalExpenses = Math.abs(sumBalances(expenses));
        const netProfit = totalRevenue - totalExpenses;

        return { revenues, expenses, totalRevenue, totalExpenses, netProfit };
    }, [chartOfAccounts]);

    const reportName = `Profit-Loss-${startDate}-to-${endDate}`;
    useEffect(() => {
        onDataReady({ data: [], columns: [], name: reportName });
    }, [startDate, endDate, onDataReady, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="text-center mb-6">
                    <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">قائمة الدخل</h2>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        عن الفترة من {startDate} إلى {endDate}
                    </p>
                </div>

                <div className="space-y-8 max-w-3xl mx-auto">
                    <div>
                        <h3 className="font-bold text-xl text-gray-600 dark:text-gray-300 mb-2">الإيرادات</h3>
                        <AccountSection nodes={revenues} />
                        <div className="flex justify-between items-center font-bold text-lg p-3 mt-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <span>إجمالي الإيرادات</span>
                            <span className="font-mono">{totalRevenue.toLocaleString()} جنيه</span>
                        </div>
                    </div>

                    <div>
                        <h3 className="font-bold text-xl text-gray-600 dark:text-gray-300 mb-2">المصروفات</h3>
                        <AccountSection nodes={expenses} />
                        <div className="flex justify-between items-center font-bold text-lg p-3 mt-2 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <span>إجمالي المصروفات</span>
                            <span className="font-mono">{totalExpenses.toLocaleString()} جنيه</span>
                        </div>
                    </div>

                    <div className={`flex justify-between items-center font-extrabold text-xl p-4 mt-4 rounded-lg ${netProfit >= 0 ? 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200' : 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200'}`}>
                        <span>صافي {netProfit >= 0 ? 'الربح' : 'الخسارة'}</span>
                        <span className="font-mono">{netProfit.toLocaleString()} جنيه</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProfitAndLoss;