import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';

interface ReportProps {
    startDate: string;
    endDate: string;
    supplierId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const PurchaseReturnsReport: React.FC<ReportProps> = ({ startDate, endDate, supplierId, onDataReady }) => {
    const { purchaseReturns, suppliers } = useContext(DataContext);

    const filteredData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedSupplier = supplierId ? suppliers.find((s: any) => s.id === supplierId) : null;

        return purchaseReturns.filter((pr: any) => {
            const prDate = new Date(pr.date);
            const dateMatch = prDate >= start && prDate <= end;
            const supplierMatch = !selectedSupplier || pr.supplier === selectedSupplier.name;
            return dateMatch && supplierMatch;
        });
    }, [purchaseReturns, startDate, endDate, supplierId, suppliers]);

    const columns = useMemo(() => [
        { header: 'رقم المرتجع', accessor: 'id' },
        { header: 'المورد', accessor: 'supplier' },
        { header: 'التاريخ', accessor: 'date' },
        { header: 'الفاتورة الأصلية', accessor: 'originalPurchaseId' },
        { header: 'الإجمالي', accessor: 'total', render: (row: any) => `${row.total.toLocaleString()} جنيه` },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalReturns = data.reduce((sum, item) => sum + item.total, 0);
        return {
            originalPurchaseId: `الإجمالي: (${data.length}) مرتجع`,
            total: `${totalReturns.toLocaleString()} جنيه`,
        };
    }, []);
    
    const selectedSupplier = supplierId ? suppliers.find((s: any) => s.id === supplierId) : null;
    const reportName = `Purchase-Returns-Report-${startDate}-to-${endDate}`;
    
    useEffect(() => {
        onDataReady({ data: filteredData, columns, name: reportName });
    }, [filteredData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير مردودات المشتريات</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedSupplier && ` | المورد: ${selectedSupplier.name}`}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={filteredData} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'supplier', 'date', 'originalPurchaseId']}
                />
            </div>
        </div>
    );
};

export default PurchaseReturnsReport;
