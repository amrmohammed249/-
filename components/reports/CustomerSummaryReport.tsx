import React, { useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import DataTable from '../shared/DataTable';
import { TreasuryTransaction } from '../../types';

interface ReportProps {
    startDate: string;
    endDate: string;
    onDataReady: (props: { data: any[], columns: any[], name: string }) => void;
}

const CustomerSummaryReport: React.FC<ReportProps> = ({ startDate, endDate, onDataReady }) => {
    const { customers, sales, treasury } = useContext(DataContext);

    const customerSummaryData = useMemo(() => {
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);

        return customers.map((customer: any) => {
            const customerSales = sales.filter((s: any) => {
                const saleDate = new Date(s.date);
                return s.customer === customer.name && saleDate >= start && saleDate <= end;
            });

            const customerPayments = treasury.filter((t: TreasuryTransaction) => {
                 const tDate = new Date(t.date);
                return t.partyType === 'customer' && t.partyId === customer.id && t.type === 'سند قبض' && tDate >= start && tDate <= end;
            });

            const totalSales = customerSales.reduce((sum, s) => sum + s.total, 0);
            const totalPayments = customerPayments.reduce((sum, t) => sum + Math.abs(t.amount), 0);

            return {
                id: customer.id,
                name: customer.name,
                totalSales,
                totalPayments,
                finalBalance: customer.balance,
            };
        }).filter((c: any) => c.totalSales > 0 || c.totalPayments > 0 || c.finalBalance !== 0);

    }, [customers, sales, treasury, startDate, endDate]);

    const columns = useMemo(() => [
        { header: 'العميل', accessor: 'name' },
        { header: 'إجمالي المبيعات', accessor: 'totalSales', render: (row: any) => `${row.totalSales.toLocaleString()} جنيه` },
        { header: 'إجمالي المدفوعات', accessor: 'totalPayments', render: (row: any) => `${row.totalPayments.toLocaleString()} جنيه` },
        { header: 'الرصيد النهائي', accessor: 'finalBalance', render: (row: any) => `${row.finalBalance.toLocaleString()} جنيه` },
    ], []);
    
    const reportName = `Customer-Summary-${startDate}-to-${endDate}`;

    useEffect(() => {
        onDataReady({ data: customerSummaryData, columns, name: reportName });
    }, [customerSummaryData, onDataReady, columns, reportName]);


    return (
        <div id="printable-report">
            <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                    <div>
                        <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">ملخص العملاء</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            الفترة من {startDate} إلى {endDate}
                        </p>
                    </div>
                </div>
                <DataTable columns={columns} data={customerSummaryData} searchableColumns={['name']} />
            </div>
        </div>
    );
};

export default CustomerSummaryReport;
