import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';

interface ReportProps {
    asOfDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

// Helper functions to perform calculations on a temporary copy of the chart
const findNodeRecursive = (nodes: AccountNode[], key: 'id' | 'code', value: string): AccountNode | null => {
    for (const node of nodes) {
        if (node[key] === value) return node;
        if (node.children) {
            const found = findNodeRecursive(node.children, key, value);
            if (found) return found;
        }
    }
    return null;
};

const updateBalancesRecursively = (nodes: AccountNode[], accountId: string, amount: number): { updated: boolean; change: number } => {
    let totalChange = 0;
    let nodeUpdatedInChildren = false;

    for (const node of nodes) {
        if (node.id === accountId) {
            node.balance = (node.balance || 0) + amount;
            return { updated: true, change: amount };
        }

        if (node.children) {
            const result = updateBalancesRecursively(node.children, accountId, amount);
            if (result.updated) {
                node.balance = (node.balance || 0) + result.change;
                nodeUpdatedInChildren = true;
                totalChange += result.change;
            }
        }
    }
    
    return { updated: nodeUpdatedInChildren, change: totalChange };
};


// Robust recursive function to sum balances from leaf nodes up.
const sumBalancesForNode = (node: AccountNode | undefined): number => {
    if (!node) return 0;
    if (!node.children || node.children.length === 0) {
        return node.balance || 0;
    }
    return node.children.reduce((sum, child) => sum + sumBalancesForNode(child), 0);
};


const AccountSection: React.FC<{ node: AccountNode; level?: number }> = ({ node, level = 0 }) => {
    const isParent = node.children && node.children.length > 0;
    // Always calculate the balance from children to ensure accuracy, instead of trusting the node's balance property.
    const calculatedBalance = Math.abs(sumBalancesForNode(node));

    return (
        <div style={{ paddingRight: `${level * 1}rem` }}>
            <div className={`flex justify-between items-center py-2 ${isParent ? '' : 'border-b border-dashed dark:border-gray-700/50'}`}>
                <span className={`${isParent ? 'font-bold text-gray-700 dark:text-gray-300' : 'text-gray-800 dark:text-gray-200'}`}>
                    {node.name}
                </span>
                {isParent ? null : <span className="font-mono">{Math.abs(node.balance || 0).toLocaleString()}</span>}
            </div>
            {isParent && (
                <div className="border-r-2 border-gray-200 dark:border-gray-600 mr-2 pr-2">
                    {node.children.map(child => (
                        <AccountSection key={child.id} node={child} level={level + 1} />
                    ))}
                    <div className="flex justify-between items-center font-bold text-sm py-2 mt-1 border-t-2 dark:border-gray-600">
                        <span>إجمالي {node.name}</span>
                        <span className="font-mono">{calculatedBalance.toLocaleString()}</span>
                    </div>
                </div>
            )}
        </div>
    );
};


const BalanceSheet: React.FC<ReportProps> = ({ asOfDate, onDataReady }) => {
    const { chartOfAccounts, inventory } = useContext(DataContext);
    
    const inventoryValue = useMemo(() => inventory.reduce((sum: number, i: any) => sum + (i.stock * i.purchasePrice), 0), [inventory]);

    const correctedChartOfAccounts = useMemo(() => {
        const newChart = JSON.parse(JSON.stringify(chartOfAccounts));
        const inventoryAccount = findNodeRecursive(newChart, 'id', '1-1-4'); // المخزون
        
        if (inventoryAccount) {
            const currentBalance = inventoryAccount.balance || 0;
            const difference = inventoryValue - currentBalance;

            if (difference !== 0) {
                updateBalancesRecursively(newChart, inventoryAccount.id, difference);
            }
        }
        return newChart;
    }, [chartOfAccounts, inventoryValue]);

    const {
        assets,
        liabilities,
        equityWithProfit,
        totalAssets,
        totalLiabilities,
        totalEquity,
    } = useMemo(() => {
        const rootNodes = {
            assets: correctedChartOfAccounts.find((n: any) => n.id === '1'),
            liabilities: correctedChartOfAccounts.find((n: any) => n.id === '2'),
            equity: correctedChartOfAccounts.find((n: any) => n.id === '3'),
            revAndExp: correctedChartOfAccounts.find((n: any) => n.id === '4'),
        };

        // 1. Calculate Net Profit/Loss for the period
        const revenueNodes = rootNodes.revAndExp?.children?.filter((n: AccountNode) => n.id !== '4-2') || [];
        const expenseNode = rootNodes.revAndExp?.children?.find((n: any) => n.id === '4-2');
        
        const totalRevenueBalance = sumBalancesForNode({ id: 'temp-rev', name: 'temp', code: 'temp', children: revenueNodes});
        const totalExpenseBalance = sumBalancesForNode(expenseNode);
        const netProfitBalance = totalRevenueBalance + totalExpenseBalance;


        // 2. Prepare Equity section with Net Profit included
        const baseEquityNodes = rootNodes.equity?.children || [];
        const netProfitNode: AccountNode = {
            id: 'net-profit',
            name: 'صافي الربح/الخسارة للفترة',
            code: '3999',
            balance: netProfitBalance,
        };
        const equityWithProfit = [...baseEquityNodes, netProfitNode];

        // 3. Calculate totals using the robust summation function
        const totalAssets = sumBalancesForNode(rootNodes.assets);
        const totalLiabilities = Math.abs(sumBalancesForNode(rootNodes.liabilities));
        const baseEquityTotal = sumBalancesForNode(rootNodes.equity);
        const totalEquity = Math.abs(baseEquityTotal + netProfitBalance);

        return {
            assets: rootNodes.assets?.children || [],
            liabilities: rootNodes.liabilities?.children || [],
            equityWithProfit,
            totalAssets,
            totalLiabilities,
            totalEquity
        };
    }, [correctedChartOfAccounts]);
    
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.round(totalAssets) === Math.round(totalLiabilitiesAndEquity);
    
    const reportName = `Balance-Sheet-${asOfDate}`;
    useEffect(() => {
        onDataReady({ data: [], columns: [], name: reportName });
    }, [asOfDate, onDataReady, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="text-center mb-8">
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الميزانية العمومية</h2>
                     <p className="text-sm text-gray-500 dark:text-gray-400">كما في تاريخ {asOfDate}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8 max-w-5xl mx-auto">
                    {/* Assets Column */}
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 border-b-2 dark:border-gray-600 pb-2">الأصول</h3>
                        {assets.map(node => <AccountSection key={node.id} node={node} />)}
                        <div className="flex justify-between items-center font-extrabold text-lg p-3 mt-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <span>إجمالي الأصول</span>
                            <span className="font-mono">{totalAssets.toLocaleString()} جنيه</span>
                        </div>
                    </div>

                    {/* Liabilities & Equity Column */}
                    <div className="space-y-8">
                        <div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 border-b-2 dark:border-gray-600 pb-2">الالتزامات</h3>
                             {liabilities.map(node => <AccountSection key={node.id} node={node} />)}
                             <div className="flex justify-between items-center font-bold text-md p-2 mt-2 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                                <span>إجمالي الالتزامات</span>
                                <span className="font-mono">{totalLiabilities.toLocaleString()} جنيه</span>
                            </div>
                        </div>
                         <div>
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 border-b-2 dark:border-gray-600 pb-2">حقوق الملكية</h3>
                            {equityWithProfit.map(node => <AccountSection key={node.id} node={node} />)}
                            <div className="flex justify-between items-center font-bold text-md p-2 mt-2 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                                <span>إجمالي حقوق الملكية</span>
                                <span className="font-mono">{totalEquity.toLocaleString()} جنيه</span>
                            </div>
                        </div>

                         <div className="flex justify-between items-center font-extrabold text-lg p-3 mt-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <span>إجمالي الالتزامات وحقوق الملكية</span>
                            <span className="font-mono">{totalLiabilitiesAndEquity.toLocaleString()} جنيه</span>
                        </div>
                    </div>
                </div>

                <div className={`text-center font-bold p-3 mt-10 max-w-5xl mx-auto rounded-md ${isBalanced ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
                    {isBalanced ? 'الميزانية متوازنة' : `الميزانية غير متوازنة! الفرق: ${(totalAssets - totalLiabilitiesAndEquity).toLocaleString()}`}
                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;