import React from 'react';

const SummaryElement = ({ sale, customer, printSettings }: any) => {
    if (!printSettings.visibility.summary) return null;

    const grandTotal = sale.items.reduce((sum: number, item: any) => sum + item.total, 0);
    const currentBalance = customer?.balance || 0;
    const previousBalance = sale.id.startsWith('PREVIEW') ? currentBalance - grandTotal : (customer?.balance || 0) - grandTotal;

    return (
        <section className="flex justify-end mt-6">
            <div className="w-full max-w-xs space-y-2">
                <div className="flex justify-between font-bold text-lg">
                    <span>الإجمالي</span>
                    <span>{grandTotal.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                    <span className="text-gray-500 dark:text-gray-400">الرصيد السابق</span>
                    <span>{previousBalance.toLocaleString()}</span>
                </div>
                <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-gray-600">
                    <span>الرصيد الجديد</span>
                    <span>{currentBalance.toLocaleString()}</span>
                </div>
            </div>
        </section>
    );
};

export default SummaryElement;
