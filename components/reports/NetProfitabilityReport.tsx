
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
    excludedItemIds?: string[];
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
    noPagination?: boolean;
}

interface ProfitabilityGroup {
    groupKey: string;
    itemId: string;
    itemName: string;
    unitCostBase: number;
    unitPriceBase: number;
    soldQuantityBase: number;
    grossSalesValue: number;
    grossCostValue: number;
    returnedQuantityBase: number;
    returnsValue: number;
    returnsCost: number;
    netQuantity?: number;
    netSales?: number;
    netCost?: number;
    grossProfit?: number;
    profitLost?: number;
    netProfit?: number;
    margin?: number;
}

const NetProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, itemId, itemCategoryId, excludedItemIds = [], onDataReady, noPagination }) => {
    const { sales, saleReturns, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: Customer) => c.id === customerId) : null;
        const itemGroups: Record<string, ProfitabilityGroup> = {};

        const getFactor = (line: LineItem, invItem: InventoryItem) => {
            if (line.unitId === 'base') return 1;
            const packingUnit = invItem.units.find((u: PackingUnit) => u.id === line.unitId);
            return packingUnit ? packingUnit.factor : 1;
        };

        const initGroup = (invItem: InventoryItem, basePrice: number, baseCost: number) => {
            const priceKey = basePrice.toFixed(2);
            const costKey = baseCost.toFixed(4);
            const key = `${invItem.id}_${priceKey}_${costKey}`;
            if (!itemGroups[key]) {
                itemGroups[key] = {
                    groupKey: key,
                    itemId: invItem.id,
                    itemName: invItem.name,
                    unitCostBase: Number(costKey),
                    unitPriceBase: Number(priceKey),
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

        // 1. معالجة المبيعات - الاعتماد كلياً على التكلفة المجمدة في الفاتورة
        const filteredSales = sales.filter((sale: Sale) => {
            const saleDate = new Date(sale.date);
            const dateMatch = saleDate >= start && saleDate <= end;
            const customerMatch = !selectedCustomer || sale.customer === selectedCustomer.name;
            return dateMatch && customerMatch && !sale.isArchived;
        });

        filteredSales.forEach((sale: Sale) => {
            sale.items.forEach((line: LineItem) => {
                if (excludedItemIds.includes(line.itemId)) return;
                if (itemId && itemId !== line.itemId) return;

                const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
                if (!inventoryItem) return;
                if (itemCategoryId && itemCategoryId !== inventoryItem.category) return;

                const factor = getFactor(line, inventoryItem);
                const baseQty = line.quantity * factor;
                const basePrice = line.price / factor; 
                
                // استخدام التكلفة المجمدة المسجلة داخل الفاتورة نفسها
                const frozenCost = (line.purchasePriceAtSale !== undefined && line.purchasePriceAtSale !== 0) 
                    ? line.purchasePriceAtSale 
                    : inventoryItem.purchasePrice;

                const costValue = baseQty * frozenCost; 
                
                const group = initGroup(inventoryItem, basePrice, frozenCost);
                group.soldQuantityBase += baseQty;
                group.grossSalesValue += line.total;
                group.grossCostValue += costValue;
            });
        });

        // 2. معالجة المرتجعات - باستخدام التكلفة المجمدة أيضاً
        const filteredReturns = saleReturns.filter((ret: SaleReturn) => {
            const retDate = new Date(ret.date);
            const dateMatch = retDate >= start && retDate <= end;
            const customerMatch = !selectedCustomer || ret.customer === selectedCustomer.name;
            return dateMatch && customerMatch && !ret.isArchived;
        });

        filteredReturns.forEach((ret: SaleReturn) => {
            ret.items.forEach((line: LineItem) => {
                if (excludedItemIds.includes(line.itemId)) return;
                if (itemId && itemId !== line.itemId) return;

                const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
                if (!inventoryItem) return;
                if (itemCategoryId && itemCategoryId !== inventoryItem.category) return;

                const factor = getFactor(line, inventoryItem);
                const baseQty = line.quantity * factor;
                const basePrice = line.price / factor;
                
                const frozenCost = (line.purchasePriceAtSale !== undefined && line.purchasePriceAtSale !== 0) 
                    ? line.purchasePriceAtSale 
                    : inventoryItem.purchasePrice;

                const costValue = baseQty * frozenCost; 

                const group = initGroup(inventoryItem, basePrice, frozenCost);
                group.returnedQuantityBase += baseQty;
                group.returnsValue += line.total;
                group.returnsCost += costValue;
            });
        });

        return Object.values(itemGroups)
            .map(group => {
                const grossProfit = group.grossSalesValue - group.grossCostValue;
                const profitLost = group.returnsValue - group.returnsCost;
                const netProfit = grossProfit - profitLost;
                const netSales = group.grossSalesValue - group.returnsValue;
                const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

                return { ...group, grossProfit, profitLost, netProfit, margin };
            })
            .sort((a, b) => a.itemName === b.itemName ? b.unitPriceBase - a.unitPriceBase : a.itemName.localeCompare(b.itemName));

    }, [sales, saleReturns, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId, excludedItemIds]);

    const columns = useMemo(() => [
        { header: 'الصنف', accessor: 'itemName', sortable: true },
        { 
            header: 'تكلفة تاريخية', 
            accessor: 'unitCostBase', 
            render: (row: any) => <span className="font-mono text-gray-500">{row.unitCostBase.toLocaleString()}</span>,
            sortable: true
        },
        { 
            header: 'سعر بيع', 
            accessor: 'unitPriceBase', 
            render: (row: any) => <span className="font-bold text-blue-600 font-mono">{row.unitPriceBase.toLocaleString()}</span>,
            sortable: true
        },
        { header: 'الكمية', accessor: 'soldQuantityBase', render: (row: any) => row.soldQuantityBase.toLocaleString(), sortable: true },
        { header: 'إجمالي بيع', accessor: 'grossSalesValue', render: (row: any) => `${row.grossSalesValue.toLocaleString()}`, sortable: true },
        { 
            header: 'صافي ربح', 
            accessor: 'netProfit', 
            render: (row: any) => <span className={`font-bold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.netProfit.toLocaleString()}</span>,
            sortable: true
        },
        { header: '%', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(1)}%`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const grossSales = data.reduce((sum, item) => sum + item.grossSalesValue, 0);
        const netProfit = data.reduce((sum, item) => sum + item.netProfit, 0);
        return { itemName: 'الإجماليات', grossSalesValue: `${grossSales.toLocaleString()}`, netProfit: `${netProfit.toLocaleString()}`, };
    }, []);

    const reportName = `Fixed-Profit-Report-${startDate}-to-${endDate}`;
    useEffect(() => { onDataReady({ data: profitabilityData, columns, name: reportName }); }, [profitabilityData, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-4">
                <div className="flex justify-between items-center mb-4 text-right">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير صافي الربحية (منطق التكلفة المجمدة)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">تحليل الربحية بناءً على تكلفة الصنف وقت البيع حصراً.</p>
                    </div>
                </div>
                <DataTable columns={columns} data={profitabilityData} calculateFooter={calculateFooter} searchableColumns={['itemName']} noPagination={noPagination} condensed={true} />
            </div>
        </div>
    );
};

export default NetProfitabilityReport;
