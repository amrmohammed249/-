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

    const owedSuppliers = useMemo(() => {
        // Filter for suppliers with a balance of at least 0.01 to avoid floating point issues
        return suppliers.filter((supplier: Supplier) => supplier.balance >= 0.01);
    }, [suppliers]);

    const columns = useMemo(() => [
        { header: 'كود المورد', accessor: 'id', sortable: true },
        { header: 'اسم المورد', accessor: 'name', sortable: true },
        { header: 'رقم الهاتف', accessor: 'phone', sortable: true },
        { header: 'الرصيد الدائن', accessor: 'balance', render: (row: any) => `${row.balance.toLocaleString()} جنيه`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalCredit = data.reduce((sum, item) => sum + item.balance, 0);
        return {
            phone: `الإجمالي (${data.length} مورد)`,
            balance: `${totalCredit.toLocaleString()} جنيه`,
        };
    }, []);
    
    const reportName = `Supplier-Creditors-Report-${asOfDate}`;

    useEffect(() => {
        onDataReady({ data: owedSuppliers, columns, name: reportName });
    }, [owedSuppliers, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير أرصدة الموردين (الدائنون)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           الأرصدة كما في تاريخ {asOfDate}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={owedSuppliers} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'name', 'phone']}
                />
            </div>
        </div>
    );
};

export default SupplierBalancesReport;