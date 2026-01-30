
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
    saleId: string;
    date: string;
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

        const initGroup = (invItem: InventoryItem, basePrice: number, baseCost: number, saleId: string, date: string) => {
            const priceKey = basePrice.toFixed(2);
            const costKey = baseCost.toFixed(4);
            // إضافة saleId للمفتاح يضمن أن كل فاتورة تظهر في سطر مستقل ولا تندمج مع غيرها
            const key = `${saleId}_${invItem.id}_${priceKey}_${costKey}`;
            if (!itemGroups[key]) {
                itemGroups[key] = {
                    groupKey: key,
                    saleId: saleId,
                    date: date,
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

        // 1. معالجة المبيعات
        sales.filter(sale => {
            const saleDate = new Date(sale.date);
            return !sale.isArchived && (saleDate >= start && saleDate <= end) && (!selectedCustomer || sale.customer === selectedCustomer.name);
        }).forEach(sale => {
            sale.items.forEach(line => {
                if (excludedItemIds.includes(line.itemId) || (itemId && itemId !== line.itemId)) return;
                const invItem = inventory.find(i => i.id === line.itemId);
                if (!invItem || (itemCategoryId && invItem.category !== itemCategoryId)) return;

                const factor = getFactor(line, invItem);
                const baseQty = line.quantity * factor;
                const basePrice = line.price / factor; 
                const frozenCost = (line.purchasePriceAtSale || invItem.purchasePrice);
                
                const group = initGroup(invItem, basePrice, frozenCost, sale.id, sale.date);
                group.soldQuantityBase += baseQty;
                group.grossSalesValue += line.total;
                group.grossCostValue += (baseQty * frozenCost);
            });
        });

        // 2. معالجة المرتجعات
        saleReturns.filter(ret => {
            const retDate = new Date(ret.date);
            return !ret.isArchived && (retDate >= start && retDate <= end) && (!selectedCustomer || ret.customer === selectedCustomer.name);
        }).forEach(ret => {
            ret.items.forEach(line => {
                if (excludedItemIds.includes(line.itemId) || (itemId && itemId !== line.itemId)) return;
                const invItem = inventory.find(i => i.id === line.itemId);
                if (!invItem || (itemCategoryId && invItem.category !== itemCategoryId)) return;

                const factor = getFactor(line, invItem);
                const baseQty = line.quantity * factor;
                const basePrice = line.price / factor;
                const frozenCost = (line.purchasePriceAtSale || invItem.purchasePrice);

                const group = initGroup(invItem, basePrice, frozenCost, ret.id, ret.date);
                group.returnedQuantityBase += baseQty;
                group.returnsValue += line.total;
                group.returnsCost += (baseQty * frozenCost);
            });
        });

        return Object.values(itemGroups)
            .map(group => {
                const netProfit = (group.grossSalesValue - group.grossCostValue) - (group.returnsValue - group.returnsCost);
                const netSales = group.grossSalesValue - group.returnsValue;
                const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0;
                return { ...group, netProfit, margin };
            })
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    }, [sales, saleReturns, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId, excludedItemIds]);

    const columns = useMemo(() => [
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'المستند', accessor: 'saleId', sortable: true, render: (row) => <span className="font-mono text-xs">{row.saleId}</span> },
        { header: 'الصنف', accessor: 'itemName', sortable: true },
        { header: 'التكلفة', accessor: 'unitCostBase', render: (row) => row.unitCostBase.toLocaleString(), sortable: true },
        { header: 'سعر البيع', accessor: 'unitPriceBase', render: (row) => <span className="font-bold text-blue-600">{row.unitPriceBase.toLocaleString()}</span>, sortable: true },
        { header: 'الكمية', accessor: 'soldQuantityBase', render: (row) => row.soldQuantityBase.toLocaleString(), sortable: true },
        { header: 'صافي الربح', accessor: 'netProfit', render: (row) => <span className={`font-bold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.netProfit.toLocaleString()}</span>, sortable: true },
        { header: '%', accessor: 'margin', render: (row) => `${row.margin.toFixed(1)}%`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const netProfit = data.reduce((sum, item) => sum + item.netProfit, 0);
        return { itemName: 'الإجماليات', netProfit: `${netProfit.toLocaleString()} ج.م` };
    }, []);

    const reportName = `Detailed-Profit-Report-${startDate}-to-${endDate}`;
    useEffect(() => { onDataReady({ data: profitabilityData, columns, name: reportName }); }, [profitabilityData, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-4">
                <div className="mb-4">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تحليل الربحية التفصيلي (حسب الفاتورة)</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">تحليل زمني لكل حركة بيع بشكل مستقل.</p>
                </div>
                <DataTable columns={columns} data={profitabilityData} calculateFooter={calculateFooter} searchableColumns={['itemName', 'saleId']} noPagination={noPagination} condensed={true} />
            </div>
        </div>
    );
};

export default NetProfitabilityReport;
