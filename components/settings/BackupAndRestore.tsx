import React, { useContext, useRef, useState } from 'react';
import { DataContext } from '../../context/DataContext';
import { ArrowDownTrayIcon, UploadIcon, ExclamationTriangleIcon } from '../icons';
import ConfirmationModal from '../shared/ConfirmationModal';

const BackupAndRestore: React.FC = () => {
    const { data: allData, importData, showToast, resetTransactionalData } = useContext(DataContext);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [isConfirmOpen, setConfirmOpen] = useState(false);
    const [isResetConfirmOpen, setResetConfirmOpen] = useState(false);
    const [dataToImport, setDataToImport] = useState<any | null>(null);

    const handleExport = () => {
        try {
            const dataStr = JSON.stringify(allData, null, 2);
            const blob = new Blob([dataStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            link.download = `erp-backup-${date}.json`;
            link.href = url;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
            showToast('تم تصدير النسخة الاحتياطية بنجاح.');
        } catch (error) {
            console.error('Failed to export data:', error);
            showToast('فشل تصدير النسخة الاحتياطية.', 'error');
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const text = e.target?.result;
                if (typeof text !== 'string') throw new Error("File content is not text");
                const parsedData = JSON.parse(text);
                if (parsedData && typeof parsedData === 'object' && !Array.isArray(parsedData)) {
                    setDataToImport(parsedData);
                    setConfirmOpen(true);
                } else {
                    throw new Error("Invalid backup file format. Expected a JSON object.");
                }
            } catch (error) {
                console.error('Failed to parse backup file:', error);
                showToast('ملف النسخة الاحتياطية غير صالح أو تالف.', 'error');
            }
        };
        reader.readAsText(file);
        
        event.target.value = '';
    };

    const confirmImport = () => {
        if (dataToImport) {
            importData(dataToImport);
        }
        setConfirmOpen(false);
        setDataToImport(null);
    };

    const confirmReset = () => {
        resetTransactionalData();
        setResetConfirmOpen(false);
    };

    return (
        <>
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100 mb-2">النسخ الاحتياطي والاستعادة</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
                    قم بتصدير نسخة كاملة من بياناتك لحفظها في مكان آمن، أو استورد نسخة محفوظة مسبقًا لاستعادة بياناتك.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Export */}
                    <div className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-semibold text-lg mb-2">تصدير نسخة احتياطية</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            سيتم تنزيل ملف يحتوي على جميع بيانات شركتك الحالية (الحسابات، الفواتير، العملاء، إلخ). احتفظ بهذا الملف في مكان آمن.
                        </p>
                        <button onClick={handleExport} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 font-semibold">
                            <ArrowDownTrayIcon className="w-5 h-5" />
                            <span>تصدير البيانات الآن</span>
                        </button>
                    </div>

                    {/* Import */}
                    <div className="p-4 border rounded-lg dark:border-gray-700 bg-gray-50 dark:bg-gray-700/50">
                        <h3 className="font-semibold text-lg mb-2 text-red-600 dark:text-red-400">استيراد نسخة احتياطية</h3>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            <span className="font-bold">تحذير:</span> هذه العملية ستحذف جميع البيانات الحالية بشكل دائم وتستبدلها ببيانات الملف الذي تختاره.
                        </p>
                        <button onClick={handleImportClick} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                            <UploadIcon className="w-5 h-5" />
                            <span>استيراد من ملف</span>
                        </button>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} accept=".json" className="hidden" />
                    </div>
                </div>

                 {/* Reset Data */}
                <div className="mt-8 bg-red-50 dark:bg-red-900/20 p-6 rounded-lg shadow-md border-l-4 border-red-500">
                    <h2 className="text-xl font-bold text-red-800 dark:text-red-200 mb-2">إعادة ضبط بيانات الشركة</h2>
                    <p className="text-sm text-red-700 dark:text-red-300 mb-6">
                        <span className="font-bold">تحذير خطير:</span> هذا الإجراء سيقوم بحذف <span className="font-bold">جميع</span> البيانات الحركية مثل الفواتير، القيود، الحركات المالية، وأرصدة المخزون والعملاء والموردين بشكل نهائي. سيتم الإبقاء على هيكل شجرة الحسابات وتعريفات الأصناف والعملاء والموردين والمستخدمين فقط. <span className="font-bold">لا يمكن التراجع عن هذا الإجراء.</span>
                    </p>
                    <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        <span className="font-bold">نصيحة:</span> قبل القيام بهذه العملية، قم بتصدير نسخة احتياطية من بياناتك الحالية.
                    </div>
                    <button onClick={() => setResetConfirmOpen(true)} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-semibold">
                        <ExclamationTriangleIcon className="w-5 h-5" />
                        <span>أفهم المخاطر، قم بإعادة ضبط البيانات</span>
                    </button>
                </div>
            </div>
            
            <ConfirmationModal
                isOpen={isConfirmOpen}
                onClose={() => setConfirmOpen(false)}
                onConfirm={confirmImport}
                title="تأكيد عملية الاستيراد"
                message="هل أنت متأكد تمامًا من رغبتك في المتابعة؟ سيتم حذف جميع البيانات الحالية واستبدالها بالبيانات من الملف المحدد. لا يمكن التراجع عن هذا الإجراء."
            />
            <ConfirmationModal
                isOpen={isResetConfirmOpen}
                onClose={() => setResetConfirmOpen(false)}
                onConfirm={confirmReset}
                title="تأكيد إعادة ضبط البيانات"
                message="هل أنت متأكد تمامًا؟ سيتم حذف جميع الفواتير، القيود، الحركات المالية، وأرصدة المخزون والعملاء والموردين بشكل نهائي. لا يمكن التراجع عن هذا الإجراء. يُنصح بشدة بأخذ نسخة احتياطية أولاً."
            />
        </>
    );
};

export default BackupAndRestore;