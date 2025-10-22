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

// Define a type for the grouped item object to avoid 'unknown' type errors.
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

        // 1. Filter sales by date and customer
        const filteredSales = sales.filter((sale: Sale) => {
            const saleDate = new Date(sale.date);
            const dateMatch = saleDate >= start && saleDate <= end;
            const customerMatch = !selectedCustomer || sale.customer === selectedCustomer.name;
            return dateMatch && customerMatch;
        });

        // 2. Flatten all line items
        let allLineItems: (LineItem & { saleId: string; customer: string; })[] = [];
        filteredSales.forEach((sale: Sale) => {
            sale.items.forEach((line: LineItem) => {
                allLineItems.push({
                    ...line,
                    saleId: sale.id,
                    customer: sale.customer,
                });
            });
        });

        // Add COGS to each line item
        const itemsWithCogs = allLineItems.map(line => {
            const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
            if (!inventoryItem) return { ...line, cogs: 0, category: '', quantityInBaseUnits: 0 };

            let quantityInBaseUnits = line.quantity;
            if (line.unitId !== 'base') {
                const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === line.unitId);
                if (packingUnit && packingUnit.factor > 0) {
                    quantityInBaseUnits = line.quantity * packingUnit.factor;
                }
            }
            const cogs = quantityInBaseUnits * inventoryItem.purchasePrice;
            return { ...line, cogs, quantityInBaseUnits, category: inventoryItem.category };
        });

        // 3. Filter by item or category
        const filteredItems = itemsWithCogs.filter(line => {
            if (itemId) return line.itemId === itemId;
            if (itemCategoryId) return line.category === itemCategoryId;
            return true;
        });

        // 4. Group by item
        const groupedByItem = filteredItems.reduce((acc, line) => {
            if (!acc[line.itemId]) {
                acc[line.itemId] = {
                    itemId: line.itemId,
                    itemName: line.itemName,
                    totalQuantity: 0,
                    totalSales: 0,
                    totalCogs: 0,
                };
            }
            acc[line.itemId].totalQuantity += line.quantityInBaseUnits;
            acc[line.itemId].totalSales += line.total;
            acc[line.itemId].totalCogs += line.cogs;
            return acc;
        }, {} as Record<string, ProfitabilityGroup>);

        // 5. Convert to array and calculate profit & margin
        return Object.values(groupedByItem).map((item: ProfitabilityGroup) => {
            const profit = item.totalSales - item.totalCogs;
            const margin = item.totalSales > 0 ? (profit / item.totalSales) * 100 : 0;
            return {
                ...item,
                profit,
                margin,
            };
        });

    }, [sales, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId]);

    const columns = useMemo(() => [
        { header: 'الصنف', accessor: 'itemName' },
        { header: 'الكمية المباعة (بالوحدة الأساسية)', accessor: 'totalQuantity', render: (row: any) => `${row.totalQuantity.toLocaleString()}` },
        { header: 'إجمالي المبيعات', accessor: 'totalSales', render: (row: any) => `${row.totalSales.toLocaleString()} جنيه` },
        { header: 'إجمالي التكلفة', accessor: 'totalCogs', render: (row: any) => `${row.totalCogs.toLocaleString()} جنيه` },
        { header: 'إجمالي الربح', accessor: 'profit', render: (row: any) => `${row.profit.toLocaleString()} جنيه` },
        { header: 'هامش الربح', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(2)}%` },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const totalSales = data.reduce((sum, item) => sum + item.totalSales, 0);
        const totalCogs = data.reduce((sum, item) => sum + item.totalCogs, 0);
        const totalProfit = data.reduce((sum, item) => sum + item.profit, 0);
        
        return {
            totalQuantity: 'الإجماليات',
            totalSales: `${totalSales.toLocaleString()} جنيه`,
            totalCogs: `${totalCogs.toLocaleString()} جنيه`,
            profit: `${totalProfit.toLocaleString()} جنيه`,
        };
    }, []);

    const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
    const reportName = `Sales-Profitability-${startDate}-to-${endDate}${selectedCustomer ? `-${selectedCustomer.name}`: ''}`;
    
    useEffect(() => {
        onDataReady({ data: profitabilityData, columns, name: reportName });
    }, [profitabilityData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير ربحية المبيعات</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedCustomer && ` | العميل: ${selectedCustomer.name}`}
                        </p>
                    </div>
                </div>
                <DataTable 
                    columns={columns} 
                    data={profitabilityData} 
                    calculateFooter={calculateFooter}
                    searchableColumns={['itemName']}
                />
            </div>
        </div>
    );
};

export default SalesProfitabilityReport;
