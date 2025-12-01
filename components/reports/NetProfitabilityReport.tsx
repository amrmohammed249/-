
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

// Group interface to hold data per item-price combination
interface ProfitabilityGroup {
    groupKey: string; // itemId + price
    itemId: string;
    itemName: string;
    
    // Unit Details
    unitCostBase: number;  // Purchase Price (Cost) per Base Unit
    unitPriceBase: number; // Sales Price per Base Unit
    
    // Sales Data
    soldQuantityBase: number; // Quantity in base units
    grossSalesValue: number;
    grossCostValue: number;
    
    // Returns Data
    returnedQuantityBase: number; // Quantity returned in base units
    returnsValue: number; // Value of returned items at sales price
    returnsCost: number;  // Cost of returned items
    
    // Calculated in final step
    netQuantity?: number;
    netSales?: number;
    netCost?: number;
    grossProfit?: number; // Sales - Cost (Before returns)
    profitLost?: number; // Profit lost due to returns
    netProfit?: number; // Final Profit
    margin?: number;
}

const NetProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, itemId, itemCategoryId, onDataReady }) => {
    const { sales, saleReturns, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: Customer) => c.id === customerId) : null;

        // Grouping Object: Key is `${itemId}_${basePrice}`
        const itemGroups: Record<string, ProfitabilityGroup> = {};

        // Helper to get conversion factor
        const getFactor = (line: LineItem, invItem: InventoryItem) => {
            if (line.unitId === 'base') return 1;
            const packingUnit = invItem.units.find((u: PackingUnit) => u.id === line.unitId);
            return packingUnit ? packingUnit.factor : 1;
        };

        // Helper to initialize group if missing
        const initGroup = (invItem: InventoryItem, basePrice: number) => {
            // Round price to 2 decimal places to group effectively
            const priceKey = basePrice.toFixed(2);
            const key = `${invItem.id}_${priceKey}`;
            
            if (!itemGroups[key]) {
                itemGroups[key] = {
                    groupKey: key,
                    itemId: invItem.id,
                    itemName: invItem.name,
                    unitCostBase: invItem.purchasePrice, // Explicitly store cost
                    unitPriceBase: Number(priceKey),     // Explicitly store sales price
                    soldQuantityBase: 0,
                    grossSalesValue: 0,
                    grossCostValue: 0,
                    returnedQuantityBase: 0,
                    returnsValue: 0,
                    returnsCost: 0,
                };
            }
            return itemGroups[key];
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

                // Calculations
                const factor = getFactor(line, inventoryItem);
                const baseQty = line.quantity * factor;
                // Calculate effective price per base unit for this specific line
                const basePrice = line.price / factor; 
                // Cost is constant per item master (Last Purchase Price strategy)
                const cost = baseQty * inventoryItem.purchasePrice; 
                
                const group = initGroup(inventoryItem, basePrice);
                
                group.soldQuantityBase += baseQty;
                group.grossSalesValue += line.total;
                group.grossCostValue += cost;
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

                // Calculations
                const factor = getFactor(line, inventoryItem);
                const baseQty = line.quantity * factor;
                const basePrice = line.price / factor;
                const cost = baseQty * inventoryItem.purchasePrice; 

                const group = initGroup(inventoryItem, basePrice);

                group.returnedQuantityBase += baseQty;
                group.returnsValue += line.total;
                group.returnsCost += cost;
            });
        });

        // 3. Final Calculations & Sort
        return Object.values(itemGroups)
            .map(group => {
                const grossProfit = group.grossSalesValue - group.grossCostValue;
                const profitLost = group.returnsValue - group.returnsCost;
                const netProfit = grossProfit - profitLost;
                const netQuantity = group.soldQuantityBase - group.returnedQuantityBase;
                const netSales = group.grossSalesValue - group.returnsValue;
                const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

                return {
                    ...group,
                    netQuantity,
                    grossProfit,
                    profitLost,
                    netProfit,
                    margin
                };
            })
            .sort((a, b) => {
                // Sort by Item Name then by Price
                if (a.itemName === b.itemName) {
                    return b.unitPriceBase - a.unitPriceBase; // Higher price first
                }
                return a.itemName.localeCompare(b.itemName);
            });

    }, [sales, saleReturns, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId]);

    const columns = useMemo(() => [
        { header: 'الصنف', accessor: 'itemName' },
        { 
            header: 'تكلفة الوحدة (أساسي)', 
            accessor: 'unitCostBase', 
            render: (row: any) => <span className="text-gray-500 font-mono">{row.unitCostBase.toLocaleString()}</span> 
        },
        { 
            header: 'سعر بيع الوحدة (أساسي)', 
            accessor: 'unitPriceBase', 
            render: (row: any) => <span className="font-bold text-blue-600 font-mono">{row.unitPriceBase.toLocaleString()}</span> 
        },
        { header: 'الكمية (أساسي)', accessor: 'soldQuantityBase', render: (row: any) => row.soldQuantityBase.toLocaleString() },
        { header: 'المبيعات (إجمالي)', accessor: 'grossSalesValue', render: (row: any) => `${row.grossSalesValue.toLocaleString()}` },
        { header: 'التكلفة (إجمالي)', accessor: 'grossCostValue', render: (row: any) => `${row.grossCostValue.toLocaleString()}` },
        { 
            header: 'مرتجع (قيمة)', 
            accessor: 'returnsValue', 
            render: (row: any) => row.returnsValue > 0 ? <span className="text-red-500">({row.returnsValue.toLocaleString()})</span> : '-' 
        },
        { 
            header: 'صافي الربح', 
            accessor: 'netProfit', 
            render: (row: any) => <span className={`font-bold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.netProfit.toLocaleString()}</span> 
        },
        { header: 'الهامش', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(1)}%` },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const soldQuantityBase = data.reduce((sum, item) => sum + item.soldQuantityBase, 0);
        const grossSales = data.reduce((sum, item) => sum + item.grossSalesValue, 0);
        const grossCost = data.reduce((sum, item) => sum + item.grossCostValue, 0);
        const returnsVal = data.reduce((sum, item) => sum + item.returnsValue, 0);
        const netProfit = data.reduce((sum, item) => sum + item.netProfit, 0);
        
        return {
            itemName: 'الإجماليات',
            unitCostBase: '-',
            unitPriceBase: '-',
            soldQuantityBase: soldQuantityBase.toLocaleString(),
            grossSalesValue: `${grossSales.toLocaleString()} جنيه`,
            grossCostValue: `${grossCost.toLocaleString()} جنيه`,
            returnsValue: `${returnsVal.toLocaleString()} جنيه`,
            netProfit: `${netProfit.toLocaleString()} جنيه`,
            margin: '-'
        };
    }, []);

    const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;
    const reportName = `Net-Profitability-Detailed-${startDate}-to-${endDate}`;
    
    useEffect(() => {
        onDataReady({ data: profitabilityData, columns, name: reportName });
    }, [profitabilityData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير صافي الربحية التفصيلي (حسب السعر)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                            {selectedCustomer && ` | العميل: ${selectedCustomer.name}`}
                        </p>
                        <p className="text-xs text-gray-400 mt-1">
                            يتم تجميع البيانات بناءً على (الصنف + سعر البيع) لعزل هوامش الربح المختلفة لنفس الصنف.
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

export default NetProfitabilityReport;
