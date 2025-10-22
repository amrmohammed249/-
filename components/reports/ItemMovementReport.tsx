import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { InventoryItem, Sale, Purchase, SaleReturn, PurchaseReturn, InventoryAdjustment, PackingUnit, LineItem } from '../../types';
import { BoxIcon } from '../icons';
import Card from '../shared/Card';

interface ReportProps {
    startDate: string;
    endDate: string;
    itemId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const ItemMovementReport: React.FC<ReportProps> = ({ startDate, endDate, itemId, onDataReady }) => {
    const { inventory, sales, purchases, saleReturns, purchaseReturns, inventoryAdjustments } = useContext(DataContext);
    
    const selectedItem = useMemo(() => itemId ? inventory.find((i: InventoryItem) => i.id === itemId) : null, [itemId, inventory]);

    const reportData = useMemo(() => {
        if (!selectedItem) return null;

        const getQuantityInBaseUnits = (lineItem: LineItem, itemDetails: InventoryItem): number => {
            if (lineItem.unitId === 'base') {
                return lineItem.quantity;
            }
            const packingUnit = itemDetails.units.find((u: PackingUnit) => u.id === lineItem.unitId);
            return packingUnit ? lineItem.quantity * packingUnit.factor : lineItem.quantity;
        };
        
        const getItemDetails = (id: string) => inventory.find((inv: InventoryItem) => inv.id === id);

        const allTransactions = [
            ...purchases.flatMap((t: Purchase) => t.items.map(i => ({ ...i, date: t.date, type: 'شراء', description: `فاتورة مشتريات #${t.id}`, change: getQuantityInBaseUnits(i, getItemDetails(i.itemId)!) }))),
            ...sales.flatMap((t: Sale) => t.items.map(i => ({ ...i, date: t.date, type: 'بيع', description: `فاتورة مبيعات #${t.id}`, change: -getQuantityInBaseUnits(i, getItemDetails(i.itemId)!) }))),
            ...saleReturns.flatMap((t: SaleReturn) => t.items.map(i => ({ ...i, date: t.date, type: 'مرتجع بيع', description: `مرتجع مبيعات #${t.id}`, change: getQuantityInBaseUnits(i, getItemDetails(i.itemId)!) }))),
            ...purchaseReturns.flatMap((t: PurchaseReturn) => t.items.map(i => ({ ...i, date: t.date, type: 'مرتجع شراء', description: `مرتجع مشتريات #${t.id}`, change: -getQuantityInBaseUnits(i, getItemDetails(i.itemId)!) }))),
            ...inventoryAdjustments.flatMap((t: InventoryAdjustment) => t.items.map(i => ({ ...i, date: t.date, type: `تسوية ${t.type}`, description: t.description, change: t.type === 'إضافة' ? i.quantity : -i.quantity }))),
        ].filter(tx => tx.itemId === selectedItem.id);

        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const openingBalance = allTransactions
            .filter(tx => new Date(tx.date) < start)
            .reduce((sum, tx) => sum + tx.change, 0);

        const periodTransactions = allTransactions
            .filter(tx => {
                const txDate = new Date(tx.date);
                return txDate >= start && txDate <= end;
            })
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

        let runningBalance = openingBalance;
        const processedTransactions = periodTransactions.map(tx => {
            runningBalance += tx.change;
            return {
                ...tx,
                in_quantity: tx.change > 0 ? tx.change : 0,
                out_quantity: tx.change < 0 ? -tx.change : 0,
                balance: runningBalance,
            };
        });

        const totalIn = processedTransactions.reduce((sum, tx) => sum + tx.in_quantity, 0);
        const totalOut = processedTransactions.reduce((sum, tx) => sum + tx.out_quantity, 0);

        return {
            openingBalance,
            transactions: processedTransactions,
            totalIn,
            totalOut,
            closingBalance: runningBalance,
        };
    }, [selectedItem, startDate, endDate, inventory, sales, purchases, saleReturns, purchaseReturns, inventoryAdjustments]);

    useEffect(() => {
        if(reportData && selectedItem) {
            onDataReady({
                data: reportData.transactions,
                columns: [
                    { header: 'التاريخ', accessor: 'date'},
                    { header: 'البيان', accessor: 'description'},
                    { header: 'وارد', accessor: 'in_quantity'},
                    { header: 'صادر', accessor: 'out_quantity'},
                    { header: 'الرصيد', accessor: 'balance'},
                ],
                name: `Item-Movement-${selectedItem.name}`
            })
        }
    }, [reportData, selectedItem, onDataReady]);


    if (!selectedItem) {
        return (
            <div className="text-center py-20 text-gray-500">
                <BoxIcon className="w-16 h-16 mx-auto mb-4" />
                <p>الرجاء اختيار صنف من شاشة الفلاتر لعرض تقرير الحركة الخاص به.</p>
            </div>
        );
    }
    
    if (!reportData) {
        return <div className="text-center py-20 text-gray-500">جاري تحميل البيانات...</div>
    }

    return (
        <div id="printable-report" className="p-6">
            <div>
                <div className="text-center mb-6">
                    <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">تقرير حركة صنف: {selectedItem.name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                        الفترة من {startDate} إلى {endDate}
                    </p>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 text-center">
                    <Card title="رصيد أول المدة" value={reportData.openingBalance.toLocaleString()} icon={<BoxIcon className="text-gray-500"/>} />
                    <Card title="إجمالي الوارد" value={reportData.totalIn.toLocaleString()} icon={<BoxIcon className="text-green-500"/>} />
                    <Card title="إجمالي الصادر" value={reportData.totalOut.toLocaleString()} icon={<BoxIcon className="text-red-500"/>} />
                    <Card title="الرصيد الختامي" value={reportData.closingBalance.toLocaleString()} icon={<BoxIcon className="text-blue-500"/>} />
                </div>
                
                <div className="overflow-x-auto">
                     <table className="w-full text-sm text-right text-gray-500 dark:text-gray-400">
                        <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700 dark:text-gray-300">
                            <tr>
                                <th className="px-4 py-3">التاريخ</th>
                                <th className="px-4 py-3">البيان</th>
                                <th className="px-4 py-3 text-center">وارد</th>
                                <th className="px-4 py-3 text-center">صادر</th>
                                <th className="px-4 py-3 text-center">الرصيد</th>
                            </tr>
                        </thead>
                        <tbody>
                            {reportData.transactions.map((tx, index) => (
                                <tr key={index} className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600">
                                    <td className="px-4 py-2">{tx.date}</td>
                                    <td className="px-4 py-2 font-medium">{tx.description}</td>
                                    <td className="px-4 py-2 text-center text-green-600 font-mono">{tx.in_quantity > 0 ? tx.in_quantity.toLocaleString() : '-'}</td>
                                    <td className="px-4 py-2 text-center text-red-600 font-mono">{tx.out_quantity > 0 ? tx.out_quantity.toLocaleString() : '-'}</td>
                                    <td className="px-4 py-2 text-center font-semibold font-mono">{tx.balance.toLocaleString()}</td>
                                </tr>
                            ))}
                        </tbody>
                     </table>
                </div>

            </div>
        </div>
    );
};

export default ItemMovementReport;