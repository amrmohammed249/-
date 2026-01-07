
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
    saleId: string; // إضافة رقم الفاتورة لفك الدمج
    itemId: string;
    itemName: string;
    customerName: string;
    unitCostBase: number;
    unitPriceBase: number;
    soldQuantityBase: number;
    grossSalesValue: number;
    grossCostValue: number;
    returnedQuantityBase: number;
    returnsValue: number;
    returnsCost: number;
    latestDate: string;
    netQuantity?: number;
    netSales?: number;
    netCost?: number;
    grossProfit?: number;
    profitLost?: number;
    netProfit?: number;
    margin?: number;
}

const NetProfitabilityByCustomerReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, itemId, itemCategoryId, excludedItemIds = [], onDataReady, noPagination }) => {
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

        const initGroup = (invItem: InventoryItem, basePrice: number, customerName: string, frozenCost: number, txDate: string, saleId: string) => {
            const priceKey = basePrice.toFixed(2);
            // المفتاح الآن يتضمن رقم الفاتورة (saleId) لضمان عدم الدمج بين فواتير مختلفة
            const key = `${saleId}_${invItem.id}_${priceKey}_${frozenCost.toFixed(4)}`;
            if (!itemGroups[key]) {
                itemGroups[key] = {
                    groupKey: key,
                    saleId: saleId,
                    itemId: invItem.id,
                    itemName: invItem.name,
                    customerName: customerName,
                    unitCostBase: frozenCost,
                    unitPriceBase: Number(priceKey),
                    soldQuantityBase: 0,
                    grossSalesValue: 0,
                    grossCostValue: 0,
                    returnedQuantityBase: 0,
                    returnsValue: 0,
                    returnsCost: 0,
                    latestDate: txDate,
                };
            }
            return itemGroups[key];
        };

        // 1. معالجة المبيعات
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
                
                const frozenCost = (line.purchasePriceAtSale !== undefined && line.purchasePriceAtSale !== 0) 
                    ? line.purchasePriceAtSale 
                    : inventoryItem.purchasePrice;

                const cost = baseQty * frozenCost; 
                
                const group = initGroup(inventoryItem, basePrice, sale.customer, frozenCost, sale.date, sale.id);
                group.soldQuantityBase += baseQty;
                group.grossSalesValue += line.total;
                group.grossCostValue += cost;
            });
        });

        // 2. معالجة المرتجعات
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

                const cost = baseQty * frozenCost; 

                // المرتجع قد لا يكون له "رقم فاتورة أصلية" في بعض الحالات، نستخدم رقم المرتجع نفسه كمميز
                const group = initGroup(inventoryItem, basePrice, ret.customer, frozenCost, ret.date, ret.id);
                group.returnedQuantityBase += baseQty;
                group.returnsValue += line.total;
                group.returnsCost += cost;
            });
        });

        // 3. الحسابات النهائية والفرز حسب التاريخ
        return Object.values(itemGroups)
            .map(group => {
                const grossProfit = group.grossSalesValue - group.grossCostValue;
                const profitLost = group.returnsValue - group.returnsCost;
                const netProfit = grossProfit - profitLost;
                const netSales = group.grossSalesValue - group.returnsValue;
                const margin = netSales > 0 ? (netProfit / netSales) * 100 : 0;

                return { ...group, grossProfit, profitLost, netProfit, margin };
            })
            .filter(g => g.soldQuantityBase !== 0 || g.returnedQuantityBase !== 0)
            .sort((a, b) => new Date(b.latestDate).getTime() - new Date(a.latestDate).getTime());

    }, [sales, saleReturns, inventory, customers, startDate, endDate, customerId, itemId, itemCategoryId, excludedItemIds]);

    const columns = useMemo(() => [
        { header: 'التاريخ', accessor: 'latestDate', sortable: true },
        { 
            header: 'المستند', 
            accessor: 'saleId', 
            render: (row: any) => <span className="font-mono text-xs bg-gray-100 px-1 rounded">{row.saleId}</span>,
            sortable: true 
        },
        { header: 'العميل', accessor: 'customerName', sortable: true },
        { header: 'الصنف', accessor: 'itemName', sortable: true },
        { 
            header: 'التكلفة', 
            accessor: 'unitCostBase', 
            render: (row: any) => <span className="font-mono text-gray-500">{row.unitCostBase.toLocaleString()}</span>,
            sortable: true
        },
        { 
            header: 'سعر البيع', 
            accessor: 'unitPriceBase', 
            render: (row: any) => <span className="font-bold text-blue-600 font-mono">{row.unitPriceBase.toLocaleString()}</span>,
            sortable: true
        },
        { header: 'الكمية', accessor: 'soldQuantityBase', render: (row: any) => row.soldQuantityBase.toLocaleString(), sortable: true },
        { header: 'صافي ربح', accessor: 'netProfit', render: (row: any) => <span className={`font-bold ${row.netProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>{row.netProfit.toLocaleString()}</span>, sortable: true },
        { header: '%', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(1)}%`, sortable: true },
    ], []);
    
    const calculateFooter = useCallback((data: any[]) => {
        const netProfit = data.reduce((sum, item) => sum + item.netProfit, 0);
        return { itemName: 'الإجماليات', netProfit: `${netProfit.toLocaleString()}` };
    }, []);

    const reportName = `Detailed-Profit-By-Invoice-${startDate}-to-${endDate}`;
    useEffect(() => { onDataReady({ data: profitabilityData, columns, name: reportName }); }, [profitabilityData, onDataReady, columns, reportName]);

    return (
        <div id="printable-report">
            <div className="p-4">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تحليل الربحية التفصيلي (لكل فاتورة)</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">تحليل مستقل لكل حركة بيع لضمان دقة التقارير التاريخية.</p>
                    </div>
                </div>
                <DataTable columns={columns} data={profitabilityData} calculateFooter={calculateFooter} searchableColumns={['itemName', 'customerName', 'saleId', 'latestDate']} noPagination={noPagination} condensed={true} />
            </div>
        </div>
    );
};

export default NetProfitabilityByCustomerReport;
