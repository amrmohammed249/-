import React, { useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';
import ReportToolbar from './ReportToolbar';
import Table from '../shared/Table';

interface ReportProps {
    asOfDate: string;
}

const TrialBalance: React.FC<ReportProps> = ({ asOfDate }) => {
    const { chartOfAccounts } = useContext(DataContext);

    const trialBalanceData = useMemo(() => {
        const leafAccounts: { code: string; name: string; debit: number; credit: number }[] = [];
        
        const traverse = (nodes: AccountNode[]) => {
            nodes.forEach(node => {
                if (node.children && node.children.length > 0) {
                    traverse(node.children);
                } else {
                    const balance = node.balance || 0;
                    leafAccounts.push({
                        code: node.code,
                        name: node.name,
                        debit: balance > 0 ? balance : 0,
                        credit: balance < 0 ? Math.abs(balance) : 0,
                    });
                }
            });
        };

        traverse(chartOfAccounts);
        return leafAccounts.sort((a, b) => a.code.localeCompare(b.code));

    }, [chartOfAccounts]);

    const columns = [
        { header: 'رمز الحساب', accessor: 'code' },
        { header: 'اسم الحساب', accessor: 'name' },
        { header: 'مدين', accessor: 'debit', render: (row: any) => row.debit.toLocaleString() },
        { header: 'دائن', accessor: 'credit', render: (row: any) => row.credit.toLocaleString() },
    ];
    
    const totals = trialBalanceData.reduce((acc, item) => {
        acc.debit += item.debit;
        acc.credit += item.credit;
        return acc;
    }, { debit: 0, credit: 0 });

    const isBalanced = Math.round(totals.debit) === Math.round(totals.credit);

    const footerData = {
        name: 'الإجمالي',
        debit: totals.debit.toLocaleString(),
        credit: totals.credit.toLocaleString(),
    };

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">ميزان المراجعة</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           كما في تاريخ {asOfDate}
                        </p>
                    </div>
                     <ReportToolbar
                        reportName={`Trial-Balance-${asOfDate}`}
                    />
                </div>
                <Table columns={columns} data={trialBalanceData} footerData={footerData} />
                 <div className={`text-center font-bold p-3 mt-4 rounded-md ${isBalanced ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {isBalanced ? 'ميزان المراجعة متوازن' : `غير متوازن! الفرق: ${(totals.debit - totals.credit).toLocaleString()}`}
                </div>
            </div>
        </div>
    );
};

export default TrialBalance;
