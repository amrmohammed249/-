
import React, { useContext, useMemo, useEffect, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { InventoryItem, Sale, Customer, LineItem, PackingUnit, SaleReturn } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    customerId?: string;
    itemId?: string;
    itemCategoryId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

// Group interface to hold data per item
interface ProfitabilityGroup {
    itemId: string;
    itemName: string;
    
    // Sales Data
    grossSalesValue: number;
    grossCostValue: number;
    
    // Returns Data
    returnsValue: number; // Value of returned items at sales price
    returnsCost: number;  // Cost of returned items
    
    // Calculated in final step
    netSales?: number;
    netCost?: number;
    grossProfit?: number; // Sales - Cost (Before returns)
    profitLost?: number; // Profit lost due to returns
    netProfit?: number; // Final Profit
}

const NetProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, itemId, itemCategoryId, onDataReady }) => {
    const { sales, saleReturns, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: Customer) => c.id === customerId) : null;

        // Grouping Object
        const itemGroups: Record<string, ProfitabilityGroup> = {};

        // Helper to initialize group if missing
        const initGroup = (id: string, name: string) => {
            if (!itemGroups[id]) {
                itemGroups[id] = {
                    itemId: id,
                    itemName: name,
                    grossSalesValue: 0,
                    grossCostValue: 0,
                    returnsValue: 0,
                    returnsCost: 0,
                };
            }
        };

        // Helper to calculate Base Quantity from any unit
        const getBaseQty = (line: LineItem, invItem: InventoryItem) => {
            let qty = line.quantity;
            if (line.unitId !== 'base') {
                const packingUnit = invItem.units.find((u: PackingUnit) => u.id === line.unitId);
                if (packingUnit && packingUnit.factor > 0) {
                    qty *= packingUnit.factor;
                }
            }
            return qty;
        };

        // 1. Process Sales (Gross)
        const filteredSales = sales.filter((sale: Sale) => {
            const saleDate = new Date(sale.date);
            const dateMatch = saleDate >= start && saleDate <= end;
            const customerMatch = !selectedCustomer || sale.customer === selectedCustomer.name;
            return dateMatch && customerMatch && !sale.isArchived;
        });

        filteredSales.forEach((sale: Sale) => {
            sale.items.forEach((line: LineItem) => {
                const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
                
                // Filters
                if (!inventoryItem) return;
                if (itemId && itemId !== line.itemId) return;
                if (itemCategoryId && itemCategoryId !== inventoryItem.category) return;

                initGroup(line.itemId, line.itemName);
                
                // Calculations
                const baseQty = getBaseQty(line, inventoryItem);
                // Use current master purchase price as per "Last Price" requirement
                const cost = baseQty * inventoryItem.purchasePrice; 
                
                itemGroups[line.itemId].grossSalesValue += line.total;
                itemGroups[line.itemId].grossCostValue += cost;
            });
        });

        // 2. Process Returns
        const filteredReturns = saleReturns.filter((ret: SaleReturn) => {
            const retDate = new Date(ret.date);
            const dateMatch = retDate >= start && retDate <= end;
            const customerMatch = !selectedCustomer || ret.customer === selectedCustomer.name;
            return dateMatch && customerMatch && !ret.isArchived;
        });

        filteredReturns.forEach((ret: SaleReturn) => {
            ret.items.forEach((line: LineItem) => {
                const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);

                // Filters
                if (!inventoryItem) return;
                if (itemId && itemId !== line.itemId) return;
                if (itemCategoryId && itemCategoryId !== inventoryItem.category) return;

                initGroup(line.itemId, line.itemName);

                // Calculations
                const baseQty = getBaseQty(line, inventoryItem);
                const cost = baseQty * inventoryItem.purchasePrice; 

                itemGroups[line.itemId].returnsValue += line.total;
                itemGroups[line.itemId].returnsCost += cost;
            });
        });

        // 3. Final Calculations
        return Object.values(itemGroups).map(group => {
            const grossProfit = group.grossSalesValue - group.grossCostValue;
            // Profit lost = (Return Sales Value - Return Cost)
            const profitLost = group.returnsValue - group.returnsCost;
            
            // Net Profit = Gross Profit - Profit Lost
            const netProfit = grossProfit - profitLost;

            return {
                ...group,
                grossProfit,
                profitLost,
                netProfit
            };
        });

    }, [sales, saleReturns, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId]);

    const columns = useMemo(() => [
        { header: 'الصنف', accessor: 'itemName' },
        { header: 'المبيعات (إجمالي)', accessor: 'grossSalesValue', render: (row: any) => `${row.grossSalesValue.toLocaleString()} جنيه` },
        { header: 'تكلفة المبيعات', accessor: 'grossCostValue', render: (row: any) => `${row.grossCostValue.toLocaleString()} جنيه` },
        { header: 'الربح (قبل المرتجع)', accessor: 'grossProfit', render: (row: any) => `${row.grossProfit.toLocaleString()} جنيه` },
        { header: 'قيمة المرتجعات', accessor: 'returnsValue', render: (row: any) => <span className="text-red-600">{row.returnsValue.toLocaleString()}</span> },
        { header: 'الربح المخصوم', accessor: 'profitLost', render: (row: any) => <span className="text-red-600">{row.profitLost.toLocaleString()}</span> },
        { header: 'صافي الربح النهائي', accessor: 'netProfit', render: (row: any) => <span className="font-bold text-green-600">{row.netProfit.toLocaleString()} جنيه</span> },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const grossSales = data.reduce((sum, item) => sum + item.grossSalesValue, 0);
        const grossCost = data.reduce((sum, item) => sum + item.grossCostValue, 0);
        const grossProfit = data.reduce((sum, item) => sum + item.grossProfit, 0);
        const returnsVal = data.reduce((sum, item) => sum + item.returnsValue, 0);
        const profitLost = data.reduce((sum, item) => sum + item.profitLost, 0);
        const netProfit = data.reduce((sum, item) => sum + item.netProfit, 0);
        
        return {
            itemName: 'الإجماليات',
            grossSalesValue: `${grossSales.toLocaleString()} جنيه`,
            grossCostValue: `${grossCost.toLocaleString()} جنيه`,
            grossProfit: `${grossProfit.toLocaleString()} جنيه`,
            returnsValue: `${returnsVal.toLocaleString()} جنيه`,
            profitLost: `${profitLost.toLocaleString()} جنيه`,
            netProfit: `${netProfit.toLocaleString()} جنيه`,
        };
    }, []);

    const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
    const reportName = `Net-Profitability-${startDate}-to-${endDate}`;
    
    useEffect(() => {
        onDataReady({ data: profitabilityData, columns, name: reportName });
    }, [profitabilityData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير صافي الربحية التفصيلي</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedCustomer && ` | العميل: ${selectedCustomer.name}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">يظهر هذا التقرير أثر المرتجعات المباشر على الأرباح المحققة.</p>
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

export default NetProfitabilityReport;
