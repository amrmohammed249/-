
import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem, Sale, Purchase, SaleReturn, PurchaseReturn, InventoryAdjustment, PackingUnit, LineItem } from '../../types';

interface ReportProps {
    asOfDate: string;
    itemId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
    reportType: 'all_purchase' | 'stock_purchase' | 'stock_sale';
}

const InventoryReport: React.FC<ReportProps> = ({ asOfDate, itemId, onDataReady, reportType }) => {
    const { inventory, sales, purchases, saleReturns, purchaseReturns, inventoryAdjustments } = useContext(DataContext);

    const { reportData, reportColumns, footerCalculator, reportTitle } = useMemo(() => {
        const targetDate = new Date(asOfDate);
        targetDate.setHours(23, 59, 59, 999);

        // 1. خوارزمية حساب الأرصدة التاريخية (Backtracking)
        const processedItems = inventory.map((item: InventoryItem) => {
            const getQtyBase = (line: any, invItem: InventoryItem) => {
                if (line.unitId === 'base') return line.quantity;
                const pUnit = invItem.units.find((u: PackingUnit) => u.id === line.unitId);
                return pUnit ? line.quantity * pUnit.factor : line.quantity;
            };

            // حساب كافة الحركات التي تمت بعد التاريخ المستهدف
            const futureSales = sales.filter(s => !s.isArchived && new Date(s.date) > targetDate)
                .flatMap(s => s.items).filter(i => i.itemId === item.id).reduce((sum, i) => sum + getQtyBase(i, item), 0);
            
            const futurePurchases = purchases.filter(p => !p.isArchived && new Date(p.date) > targetDate)
                .flatMap(p => p.items).filter(i => i.itemId === item.id).reduce((sum, i) => sum + getQtyBase(i, item), 0);

            const futureSaleReturns = saleReturns.filter(sr => !sr.isArchived && new Date(sr.date) > targetDate)
                .flatMap(sr => sr.items).filter(i => i.itemId === item.id).reduce((sum, i) => sum + getQtyBase(i, item), 0);

            const futurePurchaseReturns = purchaseReturns.filter(pr => !pr.isArchived && new Date(pr.date) > targetDate)
                .flatMap(pr => pr.items).filter(i => i.itemId === item.id).reduce((sum, i) => sum + getQtyBase(i, item), 0);

            const futureAdjustments = inventoryAdjustments.filter(adj => !adj.isArchived && new Date(adj.date) > targetDate)
                .flatMap(adj => adj.items.filter(i => i.itemId === item.id).map(i => adj.type === 'إضافة' ? i.quantity : -i.quantity))
                .reduce((sum, qty) => sum + qty, 0);

            // الرصيد التاريخي = الرصيد الحالي - (صافي التغير بعد التاريخ المستهدف)
            const futureNetChange = (futurePurchases + futureSaleReturns + (futureAdjustments > 0 ? futureAdjustments : 0)) 
                                  - (futureSales + futurePurchaseReturns + (futureAdjustments < 0 ? Math.abs(futureAdjustments) : 0));
            
            const historyStock = item.stock - futureNetChange;

            // حساب الوحدات الكبرى (مثل: كرتونة و قطعة)
            let detailedQty = '';
            if (item.units && item.units.length > 0) {
                const sortedUnits = [...item.units].sort((a, b) => b.factor - a.factor);
                const largestUnit = sortedUnits[0];
                if (largestUnit && largestUnit.factor > 1 && historyStock >= largestUnit.factor) {
                    const major = Math.floor(historyStock / largestUnit.factor);
                    const minor = Number((historyStock % largestUnit.factor).toFixed(2));
                    detailedQty = minor > 0 
                        ? `${major} ${largestUnit.name} و ${minor} ${item.baseUnit}`
                        : `${major} ${largestUnit.name}`;
                }
            }

            const isSaleValuation = reportType === 'stock_sale';
            const priceToUse = isSaleValuation ? item.salePrice : item.purchasePrice;

            return {
                ...item,
                stock: historyStock,
                detailedQty,
                inventoryValue: historyStock * priceToUse
            };
        });

        // 2. تطبيق فلترة نوع التقرير
        let filteredData = processedItems;
        let title = "تقرير جرد المخزون (كل الأصناف)";

        if (reportType === 'stock_purchase' || reportType === 'stock_sale') {
            filteredData = processedItems.filter(i => i.stock > 0);
            title = reportType === 'stock_sale' ? "أرصدة المخزون المتوفرة (بقيمة البيع)" : "أرصدة المخزون المتوفرة (بتكلفة الشراء)";
        }

        if (itemId) {
            filteredData = filteredData.filter(i => i.id === itemId);
        }

        const columns = [
            { header: 'كود الصنف', accessor: 'id', sortable: true },
            { header: 'اسم الصنف', accessor: 'name', sortable: true },
            { 
                header: 'الكمية (أساسية)', 
                accessor: 'stock', 
                render: (row: any) => <span className="font-mono font-bold text-gray-900 dark:text-white">{row.stock} {row.baseUnit}</span> 
            },
            { 
                header: 'الكمية (وحدات كبرى)', 
                accessor: 'detailedQty',
                render: (row: any) => <span className="text-blue-600 dark:text-blue-400 font-bold">{row.detailedQty || '-'}</span>
            },
            { 
                header: 'سعر التكلفة', 
                accessor: 'purchasePrice', 
                render: (row: any) => `${row.purchasePrice.toLocaleString()} ج.م` 
            },
            { 
                header: 'سعر البيع', 
                accessor: 'salePrice', 
                render: (row: any) => `${row.salePrice.toLocaleString()} ج.م` 
            },
            { 
                header: reportType === 'stock_sale' ? 'قيمة المخزون (بيع)' : 'قيمة المخزون (تكلفة)', 
                accessor: 'inventoryValue', 
                render: (row: any) => <span className="font-bold text-blue-700 dark:text-blue-300">{row.inventoryValue.toLocaleString()} ج.م</span>
            },
        ];

        const footerCalc = (data: any[]) => {
            const totalVal = data.reduce((sum, i) => sum + i.inventoryValue, 0);
            return {
                salePrice: `الإجمالي (${data.length} صنف)`,
                inventoryValue: `${totalVal.toLocaleString()} جنيه مصري`
            };
        };

        return { reportData: filteredData, reportColumns: columns, footerCalculator: footerCalc, reportTitle: title };
    }, [inventory, sales, purchases, saleReturns, purchaseReturns, inventoryAdjustments, asOfDate, itemId, reportType]);
    
    const reportName = `Inventory-Report-${asOfDate}`;
    
    useEffect(() => {
        onDataReady({ data: reportData, columns: reportColumns, name: reportName });
    }, [reportData, reportColumns, reportName, onDataReady]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                    <div>
                        <h3 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{reportTitle}</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                           حالة المخزون محسوبة حتى تاريخ: <span className="font-bold text-blue-600 underline">{asOfDate}</span>
                        </p>
                    </div>
                </div>

                <DataTable 
                    columns={reportColumns} 
                    data={reportData} 
                    calculateFooter={footerCalculator}
                    searchableColumns={['id', 'name']}
                />
                
                <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 no-print">
                    <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg border dark:border-gray-600 text-center">
                        <p className="text-xs text-gray-500 dark:text-gray-400 font-bold uppercase mb-1">عدد الأصناف في التقرير</p>
                        <p className="text-2xl font-bold">{reportData.length}</p>
                    </div>
                    <div className="p-4 bg-blue-100 dark:bg-blue-900/40 rounded-lg border border-blue-200 dark:border-blue-800 md:col-span-2 text-center">
                        <p className="text-xs text-blue-600 dark:text-blue-400 font-bold uppercase mb-1">إجمالي القيمة المالية للمخزون المعروض</p>
                        <p className="text-2xl font-bold font-mono text-blue-900 dark:text-blue-100">
                            {reportData.reduce((s, i) => s + i.inventoryValue, 0).toLocaleString()} ج.م
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryReport;
