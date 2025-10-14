import React from 'react';

const InvoiceMetaElement = ({ sale, printSettings }: any) => {
    if (!printSettings.visibility.invoiceMeta) return null;

    return (
        <div className="text-left mt-4">
            <h3 style={{ fontSize: printSettings.fontSizes.sectionHeadings }} className="font-semibold text-gray-500 dark:text-gray-400">تاريخ الفاتورة</h3>
            <p className="font-medium">{new Date(sale.date).toLocaleDateString('ar-EG')}</p>
            <h3 style={{ fontSize: printSettings.fontSizes.sectionHeadings }} className="font-semibold text-gray-500 dark:text-gray-400 mt-2">الحالة</h3>
            <p className="font-medium">{sale.status}</p>
        </div>
    );
};

export default InvoiceMetaElement;