import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';

interface ReportProps {
    startDate: string;
    endDate: string;
    customerId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const SaleReturnsReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, onDataReady }) => {
    const { saleReturns, customers } = useContext(DataContext);

    const filteredData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;

        return saleReturns.filter((sr: any) => {
            const srDate = new Date(sr.date);
            const dateMatch = srDate >= start && srDate <= end;
            const customerMatch = !selectedCustomer || sr.customer === selectedCustomer.name;
            return dateMatch && customerMatch;
        });
    }, [saleReturns, startDate, endDate, customerId, customers]);

    const columns = useMemo(() => [
        { header: 'رقم المرتجع', accessor: 'id' },
        { header: 'العميل', accessor: 'customer' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الفاتورة الأصلية', accessor: 'originalSaleId' },
        { header: 'الإجمالي', accessor: 'total', render: (row: any) => `${row.total.toLocaleString()} جنيه` },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalReturns = data.reduce((sum, item) => sum + item.total, 0);
        return {
            originalSaleId: `الإجمالي: (${data.length}) مرتجع`,
            total: `${totalReturns.toLocaleString()} جنيه`,
        };
    }, []);
    
    const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
    const reportName = `Sale-Returns-Report-${startDate}-to-${endDate}`;
    
    useEffect(() => {
        onDataReady({ data: filteredData, columns, name: reportName });
    }, [filteredData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير مردودات المبيعات</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedCustomer && ` | العميل: ${selectedCustomer.name}`}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={filteredData} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'customer', 'date', 'originalSaleId']}
                />
            </div>
        </div>
    );
};

export default SaleReturnsReport;
