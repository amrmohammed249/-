import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';

interface ReportProps {
    startDate: string;
    endDate: string;
    customerId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const SalesReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, onDataReady }) => {
    const { sales, customers } = useContext(DataContext);

    const filteredSales = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;

        return sales.filter((sale: any) => {
            const saleDate = new Date(sale.date);
            const dateMatch = saleDate >= start && saleDate <= end;
            const customerMatch = !selectedCustomer || sale.customer === selectedCustomer.name;
            return dateMatch && customerMatch;
        });
    }, [sales, startDate, endDate, customerId, customers]);

    const columns = useMemo(() => [
        { header: 'رقم الفاتورة', accessor: 'id' },
        { header: 'العميل', accessor: 'customer' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الإجمالي', accessor: 'total', render: (row: any) => `${row.total.toLocaleString()} جنيه` },
        { header: 'الحالة', accessor: 'status' },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalSales = data.reduce((sum, item) => sum + item.total, 0);
        return {
            date: `الإجمالي: (${data.length}) فاتورة`,
            total: `${totalSales.toLocaleString()} جنيه`,
        };
    }, []);
    
    const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
    const reportName = `Sales-Report-${startDate}-to-${endDate}${selectedCustomer ? `-${selectedCustomer.name}`: ''}`;

    useEffect(() => {
        onDataReady({ data: filteredSales, columns, name: reportName });
    }, [filteredSales, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير المبيعات</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedCustomer && ` | العميل: ${selectedCustomer.name}`}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={filteredSales} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'customer', 'date', 'status']}
                />
            </div>
        </div>
    );
};

export default SalesReport;
