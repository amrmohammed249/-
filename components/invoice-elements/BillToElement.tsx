import React from 'react';

const BillToElement = ({ customer, printSettings }: any) => {
    if (!printSettings.visibility.billTo) return null;
    return (
        <div>
            <h3 style={{ fontSize: printSettings.fontSizes.sectionHeadings }} className="font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">فاتورة إلى</h3>
            <p className="font-bold" style={{ fontSize: printSettings.fontSizes.tableBody }}>{customer?.name || 'اسم العميل'}</p>
            <p className="text-sm">{customer?.address || 'العنوان'}</p>
            <p className="text-sm">{customer?.phone || '0500000000'}</p>
        </div>
    );
};

export default BillToElement;
