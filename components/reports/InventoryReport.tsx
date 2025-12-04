
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

        // Helper to format detailed stock (e.g. "1 Ton and 50 Kg")
        const getDetailedStock = (item: InventoryItem) => {
            if (!item.units || item.units.length === 0) return '-';
            
            // Find largest unit
            const sortedUnits = [...item.units].sort((a, b) => b.factor - a.factor);
            const maxUnit = sortedUnits[0];
            
            if (!maxUnit || maxUnit.factor <= 1) return '-';

            const major = Math.floor(item.stock / maxUnit.factor);
            const remainder = item.stock % maxUnit.factor;
            
            if (major === 0) return '-'; // If less than 1 packing unit, just show dash (base unit column covers it)
            
            return remainder > 0 
                ? `${major} ${maxUnit.name} و ${Number(remainder.toFixed(2))} ${item.baseUnit}`
                : `${major} ${maxUnit.name}`;
        };

        const baseColumns = [
            { header: 'كود الصنف', accessor: 'id' },
            { header: 'اسم الصنف', accessor: 'name' },
            { 
                header: 'الكمية (أساسي)', 
                accessor: 'stock',
                render: (row: any) => <span className="font-bold text-gray-800 dark:text-gray-200">{row.stock} {row.baseUnit}</span>
            },
            { 
                header: 'الرصيد (وحدات كبرى)', 
                accessor: 'detailedStock', 
                render: (row: any) => <span className="text-blue-600 dark:text-blue-400 font-medium" dir="rtl">{getDetailedStock(row)}</span>
            },
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
        // Prepare export data with computed detailed stock
        const exportData = reportData.map(item => ({
            ...item,
            detailedStock: (() => {
                 if (!item.units || item.units.length === 0) return '-';
                 const sorted = [...item.units].sort((a, b) => b.factor - a.factor);
                 const max = sorted[0];
                 if (!max || max.factor <= 1) return '-';
                 const major = Math.floor(item.stock / max.factor);
                 const rem = item.stock % max.factor;
                 if (major === 0) return '-';
                 return rem > 0 ? `${major} ${max.name} و ${rem} ${item.baseUnit}` : `${major} ${max.name}`;
            })()
        }));

        onDataReady({ data: exportData, columns: reportColumns, name: reportName });
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
