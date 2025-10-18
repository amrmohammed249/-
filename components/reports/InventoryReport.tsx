import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';

interface ReportProps {
    asOfDate: string;
    itemId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const InventoryReport: React.FC<ReportProps> = ({ asOfDate, itemId, onDataReady }) => {
    const { inventory } = useContext(DataContext);

    const inventoryReportData = useMemo(() => {
        let data = inventory.map((item: any) => ({
            ...item,
            totalValue: item.stock * item.purchasePrice,
        }));

        if (itemId) {
            data = data.filter((item: any) => item.id === itemId);
        }

        return data;
    }, [inventory, itemId]);

    const columns = useMemo(() => [
        { header: 'كود الصنف', accessor: 'id' },
        { header: 'اسم الصنف', accessor: 'name' },
        { header: 'الكمية المتاحة', accessor: 'stock' },
        { header: 'سعر التكلفة', accessor: 'purchasePrice', render: (row: any) => `${row.purchasePrice.toLocaleString()} جنيه` },
        { header: 'سعر البيع', accessor: 'salePrice', render: (row: any) => `${row.salePrice.toLocaleString()} جنيه` },
        { header: 'قيمة المخزون', accessor: 'totalValue', render: (row: any) => `${row.totalValue.toLocaleString()} جنيه` },
    ], []);

    const calculateFooter = useCallback((data: any[]) => {
        const totalInventoryValue = data.reduce((sum, item) => sum + item.totalValue, 0);
        return {
            salePrice: 'إجمالي قيمة المخزون',
            totalValue: `${totalInventoryValue.toLocaleString()} جنيه`,
        };
    }, []);
    
    const reportName = `Inventory-Report-${asOfDate}`;
    
    useEffect(() => {
        onDataReady({ data: inventoryReportData, columns, name: reportName });
    }, [inventoryReportData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير المخزون</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           يعرض هذا التقرير حالة المخزون كما في تاريخ {asOfDate}.
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={inventoryReportData} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['id', 'name']}
                />
            </div>
        </div>
    );
};

export default InventoryReport;
