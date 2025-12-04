
import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { Supplier } from '../../types';

interface ReportProps {
    asOfDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const SupplierBalancesReport: React.FC<ReportProps> = ({ asOfDate, onDataReady }) => {
    const { suppliers } = useContext(DataContext);

    const reportData = useMemo(() => {
        // Filter for suppliers with a non-zero balance (either positive or negative)
        return suppliers.filter((supplier: Supplier) => Math.abs(supplier.balance) >= 0.01);
    }, [suppliers]);

    const columns = useMemo(() => [
        { header: 'كود المورد', accessor: 'id', sortable: true },
        { header: 'اسم المورد', accessor: 'name', sortable: true },
        { header: 'رقم الهاتف', accessor: 'phone', sortable: true },
        { 
            header: 'الرصيد', 
            accessor: 'balance', 
            render: (row: any) => (
                <span className={`font-mono font-semibold ${row.balance > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {Math.abs(row.balance).toLocaleString()} جنيه {row.balance > 0 ? '(له)' : '(عليه)'}
                </span>
            ), 
            sortable: true 
        },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalCredit = data.filter(s => s.balance > 0).reduce((sum, item) => sum + item.balance, 0);
        const totalDebit = data.filter(s => s.balance < 0).reduce((sum, item) => sum + Math.abs(item.balance), 0);
        
        // Net balance calculation (Positive means we net owe suppliers)
        const netBalance = totalCredit - totalDebit;

        return {
            phone: `الإجمالي (${data.length} مورد)`,
            balance: `${Math.abs(netBalance).toLocaleString()} جنيه ${netBalance >= 0 ? '(صافي لهم)' : '(صافي لنا)'}`,
        };
    }, []);
    
    const reportName = `Supplier-Balances-Report-${asOfDate}`;

    useEffect(() => {
        onDataReady({ data: reportData, columns, name: reportName });
    }, [reportData, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير أرصدة الموردين الشامل</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           الأرصدة كما في تاريخ {asOfDate}
                        </p>
                    </div>
                </div>

                <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                     <div className="bg-green-50 dark:bg-green-900/20 p-3 rounded-lg border border-green-100 dark:border-green-800">
                        <p className="text-sm text-green-800 dark:text-green-300">إجمالي المستحق للموردين (دائن)</p>
                        <p className="text-xl font-bold text-green-600 dark:text-green-400">
                            {reportData.filter(s => s.balance > 0).reduce((sum, s) => sum + s.balance, 0).toLocaleString()} جنيه
                        </p>
                     </div>
                     <div className="bg-red-50 dark:bg-red-900/20 p-3 rounded-lg border border-red-100 dark:border-red-800">
                        <p className="text-sm text-red-800 dark:text-red-300">إجمالي المستحق على الموردين (مدين)</p>
                        <p className="text-xl font-bold text-red-600 dark:text-red-400">
                            {reportData.filter(s => s.balance < 0).reduce((sum, s) => sum + Math.abs(s.balance), 0).toLocaleString()} جنيه
                        </p>
                     </div>
                </div>

                <DataTable 
                    columns={columns} 
                    data={reportData} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'name', 'phone']}
                />
            </div>
        </div>
    );
};

export default SupplierBalancesReport;
