import React from 'react';
import { PrinterIcon } from '../icons/PrinterIcon';
import { BarcodeIcon } from '../icons/BarcodeIcon';

const PrintSettingsPage: React.FC = () => {

    const handleTestPrint = (type: 'invoice' | 'barcode') => {
        // Open in a new tab to not disrupt the current page
        // The target page will automatically trigger the print dialog
        window.open(`/#/print/test/${type}`, '_blank');
    };

    return (
        <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">إعدادات الطباعة</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                قم بإعداد الطابعات الافتراضية لكل نوع من أنواع الطباعة. سيقوم متصفحك بحفظ اختيارك لكل نوع عند الطباعة لأول مرة.
            </p>
            <div className="space-y-6">
                {/* A4 Invoice/Report Printing */}
                <div className="p-4 border rounded-lg dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <PrinterIcon className="w-8 h-8 text-blue-500" />
                        <div>
                            <h3 className="font-semibold text-lg">طباعة الفواتير والتقارير (A4)</h3>
                            <p className="text-sm text-gray-500">مخصصة للطابعات المكتبية العادية.</p>
                        </div>
                    </div>
                    <button onClick={() => handleTestPrint('invoice')} className="btn-secondary">
                        إعداد واختبار الطباعة
                    </button>
                </div>

                {/* Barcode Label Printing */}
                <div className="p-4 border rounded-lg dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <BarcodeIcon className="w-8 h-8 text-blue-500" />
                        <div>
                            <h3 className="font-semibold text-lg">طباعة ملصقات الباركود</h3>
                            <p className="text-sm text-gray-500">مخصصة لطابعات الملصقات الحرارية.</p>
                        </div>
                    </div>
                    <button onClick={() => handleTestPrint('barcode')} className="btn-secondary">
                        إعداد واختبار الطباعة
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PrintSettingsPage;
