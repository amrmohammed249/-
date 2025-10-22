
import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import QuoteView from './QuoteView';
import { PriceQuote } from '../../types';
import { DocumentPlusIcon, EyeIcon, ArrowPathIcon, TrashIcon } from '../icons';

const StatusBadge: React.FC<{ status: PriceQuote['status'] }> = ({ status }) => {
    const statusClasses = {
        'جديد': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'تم تحويله': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'ملغي': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>{status}</span>;
}

const PriceQuoteList: React.FC = () => {
    const { priceQuotes, convertQuoteToSale, cancelPriceQuote, showToast } = useContext(DataContext);
    const { openWindow } = useContext(WindowContext);

    const [quoteToView, setQuoteToView] = useState<PriceQuote | null>(null);
    const [quoteToCancel, setQuoteToCancel] = useState<PriceQuote | null>(null);
    const [quoteToConvert, setQuoteToConvert] = useState<PriceQuote | null>(null);

    const handleConvert = (quote: PriceQuote) => {
        if (quote.status !== 'جديد') {
            showToast('يمكن فقط تحويل بيانات الأسعار التي حالتها "جديد".', 'warning');
            return;
        }
        setQuoteToConvert(quote);
    };
    
    const confirmConvert = () => {
        if (quoteToConvert) {
            convertQuoteToSale(quoteToConvert.id);
        }
        setQuoteToConvert(null);
    };

    const confirmCancel = () => {
        if (quoteToCancel) {
            cancelPriceQuote(quoteToCancel.id);
            showToast('تم إلغاء بيان الأسعار بنجاح.');
        }
        setQuoteToCancel(null);
    };

    const renderActions = (row: PriceQuote) => (
        <div className="flex justify-center items-center space-x-2 space-x-reverse">
            <button onClick={() => setQuoteToView(row)} className="text-gray-400 hover:text-blue-500" title="عرض التفاصيل">
                <EyeIcon className="w-5 h-5"/>
            </button>
            {row.status === 'جديد' && (
                <>
                    <button onClick={() => handleConvert(row)} className="text-gray-400 hover:text-green-500" title="تحويل إلى فاتورة">
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
        { header: 'العميل', accessor: 'customer', sortable: true },
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'الإجمالي', accessor: 'total', render: (row: PriceQuote) => `${row.total.toLocaleString()} جنيه`, sortable: true },
        { header: 'الحالة', accessor: 'status', render: (row: PriceQuote) => <StatusBadge status={row.status} />, sortable: true },
        { header: 'الإجراءات', accessor: 'actions', render: renderActions },
    ], []);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="قائمة بيانات الأسعار" 
                buttonText="إنشاء بيان أسعار جديد"
                onButtonClick={() => openWindow({ path: '/price-quotes', title: 'إنشاء بيان أسعار', icon: <DocumentPlusIcon /> })}
                buttonIcon={<DocumentPlusIcon />}
            />
            <DataTable 
                columns={columns} 
                data={priceQuotes}
                searchableColumns={['id', 'customer', 'date', 'status']}
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
                    message={`هل أنت متأكد من رغبتك في إلغاء بيان الأسعار رقم "${quoteToCancel.id}"؟`}
                />
            )}

            {quoteToConvert && (
                <ConfirmationModal
                    isOpen={!!quoteToConvert}
                    onClose={() => setQuoteToConvert(null)}
                    onConfirm={confirmConvert}
                    title="تأكيد التحويل إلى فاتورة"
                    message={`هل أنت متأكد من رغبتك في تحويل بيان الأسعار رقم "${quoteToConvert.id}" إلى فاتورة مبيعات؟ سيؤثر هذا الإجراء على المخزون والحسابات.`}
                />
            )}
        </div>
    );
};

export default PriceQuoteList;
