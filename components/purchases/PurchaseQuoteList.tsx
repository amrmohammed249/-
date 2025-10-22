
import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import QuoteView from './QuoteView';
import { PurchaseQuote } from '../../types';
import { DocumentPlusIcon, EyeIcon, ArrowPathIcon, TrashIcon } from '../icons';

const StatusBadge: React.FC<{ status: PurchaseQuote['status'] }> = ({ status }) => {
    const statusClasses = {
        'جديد': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'تم تحويله': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'ملغي': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>{status}</span>;
}

const PurchaseQuoteList: React.FC = () => {
    const { purchaseQuotes, convertQuoteToPurchase, cancelPurchaseQuote, showToast } = useContext(DataContext);
    const { openWindow } = useContext(WindowContext);

    const [quoteToView, setQuoteToView] = useState<PurchaseQuote | null>(null);
    const [quoteToCancel, setQuoteToCancel] = useState<PurchaseQuote | null>(null);
    const [quoteToConvert, setQuoteToConvert] = useState<PurchaseQuote | null>(null);

    const handleConvert = (quote: PurchaseQuote) => {
        if (quote.status !== 'جديد') {
            showToast('يمكن فقط تحويل طلبات الشراء التي حالتها "جديد".', 'warning');
            return;
        }
        setQuoteToConvert(quote);
    };
    
    const confirmConvert = () => {
        if (quoteToConvert) {
            convertQuoteToPurchase(quoteToConvert.id);
        }
        setQuoteToConvert(null);
    };

    const confirmCancel = () => {
        if (quoteToCancel) {
            cancelPurchaseQuote(quoteToCancel.id);
            showToast('تم إلغاء طلب الشراء بنجاح.');
        }
        setQuoteToCancel(null);
    };

    const renderActions = (row: PurchaseQuote) => (
        <div className="flex justify-center items-center space-x-2 space-x-reverse">
            <button onClick={() => setQuoteToView(row)} className="text-gray-400 hover:text-blue-500" title="عرض التفاصيل">
                <EyeIcon className="w-5 h-5"/>
            </button>
            {row.status === 'جديد' && (
                <>
                    <button onClick={() => handleConvert(row)} className="text-gray-400 hover:text-green-500" title="تحويل إلى فاتورة مشتريات">
                        <ArrowPathIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setQuoteToCancel(row)} className="text-gray-400 hover:text-red-500" title="إلغاء">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </>
            )}
        </div>
    );
    
    const columns = useMemo(() => [
        { header: 'الرقم', accessor: 'id', sortable: true },
        { header: 'المورد', accessor: 'supplier', sortable: true },
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'الإجمالي', accessor: 'total', render: (row: PurchaseQuote) => `${row.total.toLocaleString()} جنيه`, sortable: true },
        { header: 'الحالة', accessor: 'status', render: (row: PurchaseQuote) => <StatusBadge status={row.status} />, sortable: true },
        { header: 'الإجراءات', accessor: 'actions', render: renderActions },
    ], []);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="قائمة طلبات الشراء" 
                buttonText="إنشاء طلب شراء جديد"
                onButtonClick={() => openWindow({ path: '/purchase-quotes', title: 'إنشاء طلب شراء', icon: <DocumentPlusIcon /> })}
                buttonIcon={<DocumentPlusIcon />}
            />
            <DataTable 
                columns={columns} 
                data={purchaseQuotes}
                searchableColumns={['id', 'supplier', 'date', 'status']}
            />

            {quoteToView && (
                <QuoteView isOpen={!!quoteToView} onClose={() => setQuoteToView(null)} quote={quoteToView} />
            )}

            {quoteToCancel && (
                <ConfirmationModal
                    isOpen={!!quoteToCancel}
                    onClose={() => setQuoteToCancel(null)}
                    onConfirm={confirmCancel}
                    title="تأكيد الإلغاء"
                    message={`هل أنت متأكد من رغبتك في إلغاء طلب الشراء رقم "${quoteToCancel.id}"؟`}
                />
            )}

            {quoteToConvert && (
                <ConfirmationModal
                    isOpen={!!quoteToConvert}
                    onClose={() => setQuoteToConvert(null)}
                    onConfirm={confirmConvert}
                    title="تأكيد التحويل إلى فاتورة"
                    message={`هل أنت متأكد من رغبتك في تحويل طلب الشراء رقم "${quoteToConvert.id}" إلى فاتورة مشتريات؟ سيؤثر هذا الإجراء على المخزون والحسابات.`}
                />
            )}
        </div>
    );
};

export default PurchaseQuoteList;