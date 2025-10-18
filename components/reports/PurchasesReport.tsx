import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';

interface ReportProps {
    startDate: string;
    endDate: string;
    supplierId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const PurchasesReport: React.FC<ReportProps> = ({ startDate, endDate, supplierId, onDataReady }) => {
    const { purchases, suppliers } = useContext(DataContext);

    const filteredPurchases = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        
        const selectedSupplier = supplierId ? suppliers.find((s: any) => s.id === supplierId) : null;

        return purchases.filter((p: any) => {
            const pDate = new Date(p.date);
            const dateMatch = pDate >= start && pDate <= end;
            const supplierMatch = !selectedSupplier || p.supplier === selectedSupplier.name;
            return dateMatch && supplierMatch;
        });
    }, [purchases, startDate, endDate, supplierId, suppliers]);

    const columns = useMemo(() => [
        { header: 'رقم الفاتورة', accessor: 'id' },
        { header: 'المورد', accessor: 'supplier' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الإجمالي', accessor: 'total', render: (row: any) => `${row.total.toLocaleString()} جنيه` },
        { header: 'الحالة', accessor: 'status' },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalPurchases = data.reduce((sum, item) => sum + item.total, 0);
        return {
            date: `الإجمالي: (${data.length}) فاتورة`,
            total: `${totalPurchases.toLocaleString()} جنيه`,
        };
    }, []);
    
    const selectedSupplier = supplierId ? suppliers.find((s: any) => s.id === supplierId) : null;
    const reportName = `Purchases-Report-${startDate}-to-${endDate}${selectedSupplier ? `-${selectedSupplier.name}`: ''}`;

    useEffect(() => {
        onDataReady({ data: filteredPurchases, columns, name: reportName });
    }, [filteredPurchases, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير المشتريات</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedSupplier && ` | المورد: ${selectedSupplier.name}`}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={filteredPurchases} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'supplier', 'date', 'status']}
                />
            </div>
        </div>
    );
};

export default PurchasesReport;
