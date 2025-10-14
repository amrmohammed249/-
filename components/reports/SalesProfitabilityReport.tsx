import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import Table from '../shared/Table';

interface ReportProps {
    startDate: string;
    endDate: string;
    customerId?: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const SalesProfitabilityReport: React.FC<ReportProps> = ({ startDate, endDate, customerId, onDataReady }) => {
    const { sales, inventory, customers } = useContext(DataContext);

    const profitabilityData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        const selectedCustomer = customerId ? customers.find((c: any) => c.id === customerId) : null;

        const filteredSales = sales.filter((sale: any) => {
            const saleDate = new Date(sale.date);
            const dateMatch = saleDate >= start && saleDate <= end;
            const customerMatch = !selectedCustomer || sale.customer === selectedCustomer.name;
            return dateMatch && customerMatch;
        });

        return filteredSales.map((sale: any) => {
            const cogs = sale.items.reduce((sum: number, lineItem: any) => {
                const inventoryItem = inventory.find((i: any) => i.id === lineItem.itemId);
                const cost = inventoryItem ? inventoryItem.purchasePrice : 0;
                return sum + (lineItem.quantity * cost);
            }, 0);

            const profit = sale.total - cogs;
            const margin = sale.total > 0 ? (profit / sale.total) * 100 : 0;

            return {
                id: sale.id,
                date: sale.date,
                customer: sale.customer,
                totalSale: sale.total,
                cogs,
                profit,
                margin,
            };
        });
    }, [sales, inventory, startDate, endDate, customerId, customers]);

    const columns = [
        { header: 'رقم الفاتورة', accessor: 'id' },
        { header: 'العميل', accessor: 'customer' },
        { header: 'إجمالي البيع', accessor: 'totalSale', render: (row: any) => `${row.totalSale.toLocaleString()} جنيه` },
        { header: 'تكلفة البضاعة', accessor: 'cogs', render: (row: any) => `${row.cogs.toLocaleString()} جنيه` },
        { header: 'الربح', accessor: 'profit', render: (row: any) => `${row.profit.toLocaleString()} جنيه` },
        { header: 'هامش الربح', accessor: 'margin', render: (row: any) => `${row.margin.toFixed(2)}%` },
    ];
    
    const totalProfit = profitabilityData.reduce((sum, item) => sum + item.profit, 0);

    const footerData = {
        cogs: `إجمالي الربح`,
        profit: `${totalProfit.toLocaleString()} جنيه`,
    };

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
                <Table columns={columns} data={profitabilityData} footerData={footerData} />
            </div>
        </div>
    );
};

export default SalesProfitabilityReport;