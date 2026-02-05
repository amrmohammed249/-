
import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem, Sale, LineItem, SaleReturn } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    itemId?: string;
    itemCategoryId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

interface ItemProfitStats {
    itemId: string;
    itemName: string;
    totalQty: number;
    totalSales: number;
    totalCogs: number;
    avgSalePrice: number;
    avgCostPrice: number;
    netProfit: number;
    profitMargin: number;
}

const ItemSalesProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, itemId, itemCategoryId, onDataReady }) => {
    const { sales, saleReturns, inventory } = useContext(DataContext);

    const reportData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const statsMap: Record<string, ItemProfitStats> = {};

        const processItems = (itemsList: LineItem[], isReturn: boolean, saleDate: Date) => {
            if (saleDate < start || saleDate > end) return;

            itemsList.forEach(line => {
                if (itemId && line.itemId !== itemId) return;
                
                const invItem = inventory.find(i => i.id === line.itemId);
                if (!invItem) return;
                if (itemCategoryId && invItem.category !== itemCategoryId) return;

                const factor = line.unitId === 'base' ? 1 : (invItem.units.find(u => u.id === line.unitId)?.factor || 1);
                const baseQty = line.quantity * factor;
                const lineTotal = line.total;
                
                // استخدام التكلفة المجمدة في السطر، وإذا لم توجد نستخدم التكلفة الحالية
                const unitCostAtSale = line.purchasePriceAtSale !== undefined ? line.purchasePriceAtSale : invItem.purchasePrice;
                const totalLineCost = baseQty * unitCostAtSale;

                if (!statsMap[line.itemId]) {
                    statsMap[line.itemId] = {
                        itemId: line.itemId,
                        itemName: line.itemName,
                        totalQty: 0,
                        totalSales: 0,
                        totalCogs: 0,
                        avgSalePrice: 0,
                        avgCostPrice: 0,
                        netProfit: 0,
                        profitMargin: 0
                    };
                }

                const multiplier = isReturn ? -1 : 1;
                statsMap[line.itemId].totalQty += (baseQty * multiplier);
                statsMap[line.itemId].totalSales += (lineTotal * multiplier);
                statsMap[line.itemId].totalCogs += (totalLineCost * multiplier);
            });
        };

        // معالجة المبيعات
        sales.filter(s => !s.isArchived).forEach(sale => processItems(sale.items, false, new Date(sale.date)));
        
        // معالجة المرتجعات (خصمها من الربحية)
        saleReturns.filter(r => !r.isArchived).forEach(ret => processItems(ret.items, true, new Date(ret.date)));

        return Object.values(statsMap).map(item => {
            const netProfit = item.totalSales - item.totalCogs;
            return {
                ...item,
                avgSalePrice: item.totalQty !== 0 ? item.totalSales / item.totalQty : 0,
                avgCostPrice: item.totalQty !== 0 ? item.totalCogs / item.totalQty : 0,
                netProfit: netProfit,
                profitMargin: item.totalSales !== 0 ? (netProfit / item.totalSales) * 100 : 0
            };
        }).filter(item => Math.abs(item.totalQty) > 0)
          .sort((a, b) => b.netProfit - a.netProfit);

    }, [sales, saleReturns, inventory, startDate, endDate, itemId, itemCategoryId]);

    const columns = useMemo(() => [
        { header: 'اسم الصنف', accessor: 'itemName', sortable: true },
        { header: 'الكمية المباعة', accessor: 'totalQty', render: (row: any) => row.totalQty.toLocaleString(), sortable: true },
        { header: 'متوسط سعر البيع', accessor: 'avgSalePrice', render: (row: any) => <span className="font-bold text-blue-600">{row.avgSalePrice.toLocaleString(undefined, {maximumFractionDigits: 2})}</span>, sortable: true },
        { header: 'متوسط التكلفة', accessor: 'avgCostPrice', render: (row: any) => row.avgCostPrice.toLocaleString(undefined, {maximumFractionDigits: 2}), sortable: true },
        { header: 'إجمالي المبيعات', accessor: 'totalSales', render: (row: any) => row.totalSales.toLocaleString(), sortable: true },
        { header: 'إجمالي التكلفة', accessor: 'totalCogs', render: (row: any) => row.totalCogs.toLocaleString(), sortable: true },
        { 
            header: 'صافي الربح', 
            accessor: 'netProfit', 
            render: (row: any) => (
                <span className={`font-bold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {row.netProfit.toLocaleString()} ج.م
                </span>
            ),
            sortable: true 
        },
        { 
            header: 'الهامش %', 
            accessor: 'profitMargin', 
            render: (row: any) => (
                <span className="text-xs font-semibold px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded">
                    {row.profitMargin.toFixed(1)}%
                </span>
            ),
            sortable: true 
        },
    ], []);

    const calculateFooter = useCallback((data: any[]) => {
        const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0);
        const totalCogs = data.reduce((sum, item) => sum + item.totalCogs, 0);
        const totalProfit = totalSales - totalCogs;
        return {
            itemName: `الإجمالي (${data.length} صنف)`,
            totalSales: totalSales.toLocaleString(),
            totalCogs: totalCogs.toLocaleString(),
            netProfit: `${totalProfit.toLocaleString()} ج.م`
        };
    }, []);

    const reportName = `Item-Profitability-Analysis-${startDate}-to-${endDate}`;
    
    useEffect(() => {
        onDataReady({ data: reportData, columns, name: reportName });
    }, [reportData, columns, reportName, onDataReady]);

    return (
        <div id="printable-report" className="p-6">
            <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">تحليل مبيعات وربحية الأصناف (المتوسطات المرجحة)</h2>
                <p className="text-sm text-gray-500 mt-1">
                    الفترة: من {startDate} إلى {endDate} | يعتمد التقرير على "متوسط سعر البيع" الفعلي و "التكلفة التاريخية" المجمدة لكل فاتورة.
                </p>
            </div>
            
            <DataTable 
                columns={columns} 
                data={reportData} 
                calculateFooter={calculateFooter}
                searchableColumns={['itemName', 'itemId']}
                noPagination={true}
                condensed={true}
            />

            <div className="mt-8 p-4 bg-green-50 dark:bg-green-900/20 border-r-4 border-green-500 rounded-md no-print">
                <div className="flex justify-between items-center">
                    <div>
                        <p className="text-green-800 dark:text-green-200 font-bold">إجمالي الربح المحقق في هذه الفترة</p>
                        <p className="text-3xl font-extrabold text-green-600 dark:text-green-400 mt-1">
                            {reportData.reduce((s, i) => s + i.netProfit, 0).toLocaleString()} ج.م
                        </p>
                    </div>
                    <div className="text-left">
                        <p className="text-xs text-gray-500">معدل الربحية العام</p>
                        <p className="text-xl font-bold">
                            {( (reportData.reduce((s, i) => s + i.netProfit, 0) / (reportData.reduce((s, i) => s + i.totalSales, 0) || 1)) * 100).toFixed(1)}%
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ItemSalesProfitabilityReport;
