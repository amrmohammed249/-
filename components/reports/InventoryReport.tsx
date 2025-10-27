import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem } from '../../types';

interface ReportProps {
    asOfDate: string;
    itemId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
    reportType: 'all_purchase' | 'stock_purchase' | 'stock_sale';
}

const InventoryReport: React.FC<ReportProps> = ({ asOfDate, itemId, onDataReady, reportType }) => {
    const { inventory } = useContext(DataContext);

    const { reportData, reportColumns, footerCalculator, reportTitle } = useMemo(() => {
        let data = inventory;
        let title = "تقرير المخزون (كل الأصناف)";

        if (reportType === 'stock_purchase' || reportType === 'stock_sale') {
            data = data.filter((item: InventoryItem) => item.stock > 0);
            title = "تقرير المخزون (الأصناف ذات الرصيد)";
        }
        
        if (itemId) {
            data = data.filter((item: InventoryItem) => item.id === itemId);
        }

        const isSaleView = reportType === 'stock_sale';
        
        const processedData = data.map((item: InventoryItem) => ({
            ...item,
            totalValue: isSaleView ? item.stock * item.salePrice : item.stock * item.purchasePrice,
        }));

        const baseColumns = [
            { header: 'كود الصنف', accessor: 'id' },
            { header: 'اسم الصنف', accessor: 'name' },
            { header: 'الكمية المتاحة', accessor: 'stock' },
            { header: 'سعر التكلفة', accessor: 'purchasePrice', render: (row: any) => `${row.purchasePrice.toLocaleString()} جنيه` },
            { header: 'سعر البيع', accessor: 'salePrice', render: (row: any) => `${row.salePrice.toLocaleString()} جنيه` },
            { 
                header: isSaleView ? 'القيمة بسعر البيع' : 'قيمة المخزون (بالتكلفة)', 
                accessor: 'totalValue', 
                render: (row: any) => `${row.totalValue.toLocaleString()} جنيه`
            },
        ];
        
        const finalColumns = isSaleView 
            ? baseColumns.filter(c => c.accessor !== 'purchasePrice')
            : baseColumns;

        const dynamicFooterCalculator = (footerData: any[]) => {
            const totalValue = footerData.reduce((sum, item) => sum + item.totalValue, 0);
            const footerLabel = `الإجمالي (${footerData.length} صنف)`;
            
            return {
                salePrice: footerLabel,
                totalValue: `${totalValue.toLocaleString()} جنيه`,
            };
        };

        return { 
            reportData: processedData, 
            reportColumns: finalColumns,
            footerCalculator: dynamicFooterCalculator,
            reportTitle: title,
        };

    }, [inventory, itemId, reportType]);
    
    const reportName = `Inventory-Report-${reportType}-${asOfDate}`;
    
    useEffect(() => {
        onDataReady({ data: reportData, columns: reportColumns, name: reportName });
    }, [reportData, reportColumns, reportName, onDataReady]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">{reportTitle}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                           يعرض هذا التقرير حالة المخزون كما في تاريخ {asOfDate}.
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={reportColumns} 
                    data={reportData} 
                    calculateFooter={footerCalculator}
                    searchableColumns={['id', 'name']}
                />
            </div>
        </div>
    );
};

export default InventoryReport;
