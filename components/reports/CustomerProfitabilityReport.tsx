
import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem, Sale, Customer, LineItem, PackingUnit, SaleReturn } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

interface CustomerProfitability {
    customerId: string;
    customerName: string;
    totalSales: number;
    totalCogs: number;
    profit: number;
    margin: number;
}

const CustomerProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, onDataReady }) => {
    const { sales, saleReturns, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const customerData: Record<string, { totalSales: number; totalCogs: number }> = {};

        // 1. Process Sales
        const filteredSales = sales.filter((sale: Sale) => {
            const saleDate = new Date(sale.date);
            return saleDate >= start && saleDate <= end && !sale.isArchived;
        });

        filteredSales.forEach(sale => {
            if (!customerData[sale.customer]) {
                customerData[sale.customer] = { totalSales: 0, totalCogs: 0 };
            }
            customerData[sale.customer].totalSales += sale.total;
            (sale.items || []).forEach((line: LineItem) => {
                const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
                if (!inventoryItem) return;
                let quantityInBaseUnits = line.quantity;
                if (line.unitId !== 'base') {
                    const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                    if (packingUnit && packingUnit.factor > 0) {
                        quantityInBaseUnits *= packingUnit.factor;
                    }
                }
                const cogs = quantityInBaseUnits * inventoryItem.purchasePrice;
                customerData[sale.customer].totalCogs += cogs;
            });
        });

        // 2. Process Sale Returns
        const filteredSaleReturns = saleReturns.filter((sr: SaleReturn) => {
            const returnDate = new Date(sr.date);
            return returnDate >= start && returnDate <= end && !sr.isArchived;
        });

        filteredSaleReturns.forEach(sr => {
            if (!customerData[sr.customer]) {
                // This can happen if a customer only has returns in the period
                customerData[sr.customer] = { totalSales: 0, totalCogs: 0 };
            }
            // Subtract return value from total sales
            customerData[sr.customer].totalSales -= sr.total;
            
            // Subtract COGS of returned items
            (sr.items || []).forEach((line: LineItem) => {
                 const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
                if (!inventoryItem) return;
                let quantityInBaseUnits = line.quantity;
                if (line.unitId !== 'base') {
                    const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                    if (packingUnit && packingUnit.factor > 0) {
                        quantityInBaseUnits *= packingUnit.factor;
                    }
                }
                const cogsReversal = quantityInBaseUnits * inventoryItem.purchasePrice;
                customerData[sr.customer].totalCogs -= cogsReversal;
            });
        });


        return Object.entries(customerData).map(([customerName, data]: [string, { totalSales: number; totalCogs: number }]) => {
            const customer = customers.find((c: Customer) => c.name === customerName);
            const profit = data.totalSales - data.totalCogs;
            const margin = data.totalSales > 0 ? (profit / data.totalSales) * 100 : 0;
            
            return {
                customerId: customer?.id || customerName,
                customerName,
                totalSales: data.totalSales,
                totalCogs: data.totalCogs,
                profit,
                margin,
            };
        });

    }, [sales, saleReturns, inventory, customers, startDate, endDate]);

    const columns = useMemo(() => [
        { header: 'العميل', accessor: 'customerName', sortable: true },
        { header: 'صافي المبيعات', accessor: 'totalSales', render: (row: any) => `${row.totalSales.toLocaleString()} جنيه`, sortable: true },
        { header: 'صافي التكلفة', accessor: 'totalCogs', render: (row: any) => `${row.totalCogs.toLocaleString()} جنيه`, sortable: true },
        { header: 'إجمالي الربح', accessor: 'profit', render: (row: any) => `${row.profit.toLocaleString()} جنيه`, sortable: true },
        { header: 'هامش الربح', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(2)}%`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0);
        const totalCogs = data.reduce((sum, item) => sum + item.totalCogs, 0);
        const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
        
        return {
            customerName: `الإجمالي (${data.length} عميل)`,
            totalSales: `${totalSales.toLocaleString()} جنيه`,
            totalCogs: `${totalCogs.toLocaleString()} جنيه`,
            profit: `${totalProfit.toLocaleString()} جنيه`,
        };
    }, []);

    const reportName = `Customer-Profitability-${startDate}-to-${endDate}`;
    
    useEffect(() => {
        onDataReady({ data: profitabilityData, columns, name: reportName });
    }, [profitabilityData, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير ربحية العملاء</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={profitabilityData} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['customerName']}
                />
            </div>
        </div>
    );
};

export default CustomerProfitabilityReport;
