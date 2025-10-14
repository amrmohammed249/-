import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';

interface ReportProps {
    asOfDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const sumBalances = (nodes: AccountNode[]): number => {
    return nodes.reduce((sum, node) => {
        const balance = node.balance !== undefined ? node.balance : sumBalances(node.children || []);
        return sum + balance;
    }, 0);
};

const AccountSection: React.FC<{ nodes: AccountNode[]; level?: number }> = ({ nodes, level = 0 }) => {
    if (!nodes || nodes.length === 0) return null;
    return (
        <>
            {nodes.map(node => {
                 const totalBalance = node.balance !== undefined ? Math.abs(node.balance) : Math.abs(sumBalances(node.children || []));
                 const isParent = node.children && node.children.length > 0;
                 return (
                    <div key={node.id} className={level > 0 ? `mr-${level * 4}` : ''}>
                        <div className={`flex justify-between items-center py-2 ${isParent ? 'font-bold' : 'border-b dark:border-gray-700'}`}>
                            <span className={isParent ? 'text-gray-600 dark:text-gray-300' : 'text-gray-800 dark:text-gray-200'}>{node.name}</span>
                            <span className="font-mono">{totalBalance.toLocaleString()}</span>
                        </div>
                        {isParent && <div className="border-l dark:border-gray-600 mr-2"><AccountSection nodes={node.children!} level={level + 1} /></div>}
                    </div>
                )
            })}
        </>
    );
};

const BalanceSheet: React.FC<ReportProps> = ({ asOfDate, onDataReady }) => {
    const { chartOfAccounts } = useContext(DataContext);

    const { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity } = useMemo(() => {
        const assetsNode = chartOfAccounts.find((n: any) => n.code === '1000');
        const liabilitiesNode = chartOfAccounts.find((n: any) => n.code === '2000');
        const equityNode = chartOfAccounts.find((n: any) => n.code === '3000');

        const assets = assetsNode?.children || [];
        const liabilities = liabilitiesNode?.children || [];
        const equity = equityNode?.children || [];

        const totalAssets = sumBalances(assets);
        const totalLiabilities = Math.abs(sumBalances(liabilities));
        const totalEquity = Math.abs(sumBalances(equity));
        
        return { assets, liabilities, equity, totalAssets, totalLiabilities, totalEquity };
    }, [chartOfAccounts]);
    
    const totalLiabilitiesAndEquity = totalLiabilities + totalEquity;
    const isBalanced = Math.round(totalAssets) === Math.round(totalLiabilitiesAndEquity);
    
    const reportName = `Balance-Sheet-${asOfDate}`;
    useEffect(() => {
        onDataReady({ data: [], columns: [], name: reportName });
    }, [asOfDate, onDataReady, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="text-center mb-6">
                     <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">الميزانية العمومية</h2>
                     <p className="text-sm text-gray-500 dark:text-gray-400">كما في تاريخ {asOfDate}</p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                    <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 border-b-2 dark:border-gray-600 pb-2">الأصول</h3>
                        <AccountSection nodes={assets} />
                        <div className="flex justify-between items-center font-extrabold text-lg p-3 mt-4 bg-gray-100 dark:bg-gray-700/50 rounded-lg">
                            <span>إجمالي الأصول</span>
                            <span className="font-mono">{totalAssets.toLocaleString()} جنيه</span>
                        </div>
                    </div>

                    <div className="space-y-6">
                        <div className="space-y-4">
                            <h3 className="text-xl font-bold text-gray-700 dark:text-gray-200 border-b-2 dark:border-gray-600 pb-2">الالتزامات وحقوق الملكية</h3>
                            <AccountSection nodes={liabilities} />
                             <div className="flex justify-between items-center font-bold text-md p-2 bg-gray-50 dark:bg-gray-700/30 rounded-md">
                                <span>إجمالي الالتزامات</span>
                                <span className="font-mono">{totalLiabilities.toLocaleString()} جنيه</span>
                            </div>
                        </div>
                         <div className="space-y-4">
                             <AccountSection nodes={equity} />
                            <div className="flex justify-between items-center font-bold text-md p-2 bg-gray-50 dark:bg-gray-700/30 rounded-md">
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

                <div className={`text-center font-bold p-3 mt-8 rounded-md ${isBalanced ? 'bg-green-100 text-green-800 dark:bg-green-900/40 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900/40 dark:text-red-200'}`}>
                    {isBalanced ? 'الميزانية متوازنة' : `الميزانية غير متوازنة! الفرق: ${(totalAssets - totalLiabilitiesAndEquity).toLocaleString()}`}
                </div>
            </div>
        </div>
    );
};

export default BalanceSheet;