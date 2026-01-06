
import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem, Sale, Customer, LineItem, PackingUnit } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    customerId?: string;
    itemId?: string;
    itemCategoryId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

interface ProfitabilityGroup {
    itemId: string;
    itemName: string;
    totalQuantity: number;
    totalSales: number;
    totalCogs: number;
}

const SalesProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, itemId, itemCategoryId, onDataReady }) => {
    const { sales, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: Customer) => c.id === customerId) : null;

        const filteredSales = sales.filter((sale: Sale) => {
            const saleDate = new Date(sale.date);
            return (saleDate >= start && saleDate <= end) && (!selectedCustomer || sale.customer === selectedCustomer.name) && !sale.isArchived;
        });

        const groupedByItem = filteredSales.reduce((acc, sale) => {
            sale.items.forEach((line: LineItem) => {
                if (itemId && line.itemId !== itemId) return;
                const invItem = inventory.find(i => i.id === line.itemId);
                if (!invItem) return;
                if (itemCategoryId && invItem.category !== itemCategoryId) return;

                const factor = line.unitId === 'base' ? 1 : (invItem.units.find(u=>u.id===line.unitId)?.factor || 1);
                const baseQty = line.quantity * factor;
                
                // الاعتماد على التكلفة المجمدة
                const frozenCost = line.purchasePriceAtSale !== undefined ? line.purchasePriceAtSale : invItem.purchasePrice;
                const cogs = baseQty * frozenCost;

                if (!acc[line.itemId]) {
                    acc[line.itemId] = { itemId: line.itemId, itemName: line.itemName, totalQuantity: 0, totalSales: 0, totalCogs: 0, };
                }
                acc[line.itemId].totalQuantity += baseQty;
                acc[line.itemId].totalSales += line.total;
                acc[line.itemId].totalCogs += cogs;
            });
            return acc;
        }, {} as Record<string, ProfitabilityGroup>);

        return Object.values(groupedByItem).map((item: ProfitabilityGroup) => {
            const profit = item.totalSales - item.totalCogs;
            const margin = item.totalSales > 0 ? (profit / item.totalSales) * 100 : 0;
            return { ...item, profit, margin, };
        }).sort((a,b) => b.profit - a.profit);

    }, [sales, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId]);

    const columns = useMemo(() => [
        { header: 'الصنف', accessor: 'itemName', sortable: true },
        { header: 'صافي الكمية', accessor: 'totalQuantity', render: (row: any) => `${row.totalQuantity.toLocaleString()}`, sortable: true },
        { header: 'إجمالي المبيعات', accessor: 'totalSales', render: (row: any) => `${row.totalSales.toLocaleString()} ج.م`, sortable: true },
        { header: 'إجمالي التكلفة', accessor: 'totalCogs', render: (row: any) => `${row.totalCogs.toLocaleString()} ج.م`, sortable: true },
        { header: 'صافي الربح', accessor: 'profit', render: (row: any) => <span className="font-bold text-green-600">{row.profit.toLocaleString()} ج.م</span>, sortable: true },
        { header: '%', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(1)}%`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0);
        const totalCogs = data.reduce((sum, item) => sum + item.totalCogs, 0);
        const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
        return { itemName: 'الإجماليات', totalSales: `${totalSales.toLocaleString()}`, totalCogs: `${totalCogs.toLocaleString()}`, profit: `${totalProfit.toLocaleString()}`, };
    }, []);

    const reportName = `Sales-Profitability-${startDate}-to-${endDate}`;
    useEffect(() => { onDataReady({ data: profitabilityData, columns, name: reportName }); }, [profitabilityData, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="mb-4">
                    <h3 className="text-xl font-bold">ملخص ربحية المبيعات (تجميد التكلفة)</h3>
                    <p className="text-sm text-gray-500">يعرض أرباح الأصناف بناءً على تكلفتها المسجلة لحظة كل فاتورة.</p>
                </div>
                <DataTable columns={columns} data={profitabilityData} calculateFooter={calculateFooter} searchableColumns={['itemName']} />
            </div>
        </div>
    );
};

export default SalesProfitabilityReport;
