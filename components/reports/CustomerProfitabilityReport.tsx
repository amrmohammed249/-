
import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem, Sale, Customer, LineItem, PackingUnit, SaleReturn } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const CustomerProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, onDataReady }) => {
    const { sales, saleReturns, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const customerData: Record<string, { totalSales: number; totalCogs: number }> = {};

        // 1. مبيعات العملاء مع تجميد التكلفة
        sales.filter(s => !s.isArchived && new Date(s.date) >= start && new Date(s.date) <= end).forEach(sale => {
            if (!customerData[sale.customer]) customerData[sale.customer] = { totalSales: 0, totalCogs: 0 };
            customerData[sale.customer].totalSales += sale.total;
            sale.items.forEach((line: LineItem) => {
                const invItem = inventory.find(i => i.id === line.itemId);
                if (!invItem) return;
                const factor = line.unitId === 'base' ? 1 : (invItem.units.find(u=>u.id===line.unitId)?.factor || 1);
                const frozenCost = line.purchasePriceAtSale !== undefined ? line.purchasePriceAtSale : invItem.purchasePrice;
                customerData[sale.customer].totalCogs += (line.quantity * factor * frozenCost);
            });
        });

        // 2. مرتجعات العملاء
        saleReturns.filter(r => !r.isArchived && new Date(r.date) >= start && new Date(r.date) <= end).forEach(sr => {
            if (!customerData[sr.customer]) customerData[sr.customer] = { totalSales: 0, totalCogs: 0 };
            customerData[sr.customer].totalSales -= sr.total;
            sr.items.forEach((line: LineItem) => {
                const invItem = inventory.find(i => i.id === line.itemId);
                if (!invItem) return;
                const factor = line.unitId === 'base' ? 1 : (invItem.units.find(u=>u.id===line.unitId)?.factor || 1);
                const frozenCost = line.purchasePriceAtSale !== undefined ? line.purchasePriceAtSale : invItem.purchasePrice;
                customerData[sr.customer].totalCogs -= (line.quantity * factor * frozenCost);
            });
        });

        return Object.entries(customerData).map(([customerName, data]) => {
            const profit = data.totalSales - data.totalCogs;
            const margin = data.totalSales > 0 ? (profit / data.totalSales) * 100 : 0;
            return { customerName, totalSales: data.totalSales, totalCogs: data.totalCogs, profit, margin };
        }).sort((a,b) => b.profit - a.profit);
    }, [sales, saleReturns, inventory, customers, startDate, endDate]);

    const columns = useMemo(() => [
        { header: 'العميل', accessor: 'customerName', sortable: true },
        { header: 'صافي مبيعاته', accessor: 'totalSales', render: (row: any) => `${row.totalSales.toLocaleString()} ج.م`, sortable: true },
        { header: 'تكلفة مبيعاته', accessor: 'totalCogs', render: (row: any) => `${row.totalCogs.toLocaleString()} ج.م`, sortable: true },
        { header: 'الربح المحقق', accessor: 'profit', render: (row: any) => <span className="font-bold text-blue-600">{row.profit.toLocaleString()} ج.م</span>, sortable: true },
        { header: '%', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(1)}%`, sortable: true },
    ], []);
    
    const calculateFooter = (data: any[]) => {
        const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
        return { customerName: 'إجمالي الربح من العملاء', profit: `${totalProfit.toLocaleString()} ج.م` };
    };

    useEffect(() => { onDataReady({ data: profitabilityData, columns, name: `Customer-Profitability` }); }, [profitabilityData, onDataReady, columns]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="mb-4">
                    <h3 className="text-xl font-bold">تقرير ربحية العملاء (المتوسط المرجح)</h3>
                    <p className="text-sm text-gray-500">يقيس مدى مساهمة كل عميل في الأرباح بناءً على تكلفة الأصناف المسحوبة فعلياً.</p>
                </div>
                <DataTable columns={columns} data={profitabilityData} calculateFooter={calculateFooter} searchableColumns={['customerName']} />
            </div>
        </div>
    );
};

export default CustomerProfitabilityReport;
