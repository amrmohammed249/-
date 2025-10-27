import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { Customer } from '../../types';

interface ReportProps {
    asOfDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const CustomerBalancesReport: React.FC<ReportProps> = ({ asOfDate, onDataReady }) => {
    const { customers } = useContext(DataContext);

    const indebtedCustomers = useMemo(() => {
        // Filter for customers with a balance of at least 0.01 to avoid floating point issues
        return customers.filter((customer: Customer) => customer.balance >= 0.01);
    }, [customers]);

    const columns = useMemo(() => [
        { header: 'كود العميل', accessor: 'id', sortable: true },
        { header: 'اسم العميل', accessor: 'name', sortable: true },
        { header: 'رقم الهاتف', accessor: 'phone', sortable: true },
        { header: 'الرصيد المدين', accessor: 'balance', render: (row: any) => `${row.balance.toLocaleString()} جنيه`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalDebt = data.reduce((sum, item) => sum + item.balance, 0);
        return {
            phone: `الإجمالي (${data.length} عميل)`,
            balance: `${totalDebt.toLocaleString()} جنيه`,
        };
    }, []);
    
    const reportName = `Customer-Debtors-Report-${asOfDate}`;

    useEffect(() => {
        onDataReady({ data: indebtedCustomers, columns, name: reportName });
    }, [indebtedCustomers, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير أرصدة العملاء (المدينون)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           الأرصدة كما في تاريخ {asOfDate}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={indebtedCustomers} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'name', 'phone']}
                />
            </div>
        </div>
    );
};

export default CustomerBalancesReport;