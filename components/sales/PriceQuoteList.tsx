import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import ConfirmationModal from '../shared/ConfirmationModal';
import QuoteView from './QuoteView';
import { PriceQuote, LineItem } from '../../types';
import { DocumentPlusIcon, EyeIcon, ArrowPathIcon, TrashIcon, PencilIcon, TableCellsIcon, Squares2X2Icon, ListBulletIcon } from '../icons';

const StatusBadge: React.FC<{ status: PriceQuote['status'] }> = ({ status }) => {
    const statusClasses = {
        'جديد': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
        'تم تحويله': 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200',
        'ملغي': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
    };
    return <span className={`px-2 py-1 text-xs font-medium rounded-full ${statusClasses[status]}`}>{status}</span>;
}

const PriceQuoteList: React.FC = () => {
    const { priceQuotes, convertQuoteToSale, cancelPriceQuote, showToast, sequences, customers } = useContext(DataContext);
    const { openWindow } = useContext(WindowContext);

    const [quoteToView, setQuoteToView] = useState<PriceQuote | null>(null);
    const [quoteToCancel, setQuoteToCancel] = useState<PriceQuote | null>(null);
    const [quoteToConvert, setQuoteToConvert] = useState<PriceQuote | null>(null);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

    const handleEdit = (quote: PriceQuote) => {
        const customer = customers.find((c: any) => c.name === quote.customer);
        openWindow({
            path: '/price-quotes',
            title: `تعديل ${quote.hidePrices ? 'بيان كميات' : 'عرض سعر'} ${quote.id}`,
            icon: <PencilIcon />,
            state: {
                isEditMode: true,
                activeQuote: quote,
                items: JSON.parse(JSON.stringify(quote.items)),
                customer: customer || null,
                productSearchTerm: '',
                customerSearchTerm: '',
                isProcessing: false,
            }
        });
    };

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
            showToast('تم إلغاء البيان بنجاح.');
        }
        setQuoteToCancel(null);
    };

    const handleToggleSelect = (id: string) => {
        const newSelected = new Set(selectedIds);
        if (newSelected.has(id)) newSelected.delete(id);
        else newSelected.add(id);
        setSelectedIds(newSelected);
    };

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedIds(new Set(priceQuotes.map(q => q.id)));
        } else {
            setSelectedIds(new Set());
        }
    };

    const handleMergeQuotes = (strategy: 'byItem' | 'byPrice') => {
        if (selectedIds.size < 2) {
            showToast('يرجى اختيار عرضي سعر على الأقل للدمج.', 'warning');
            return;
        }

        const selectedQuotes = priceQuotes.filter(q => selectedIds.has(q.id));
        
        let finalItems: LineItem[] = [];

        if (strategy === 'byItem') {
            // منطق التجميع الكمي الذكي (دمج الوحدات المختلفة لنفس الصنف في نص واحد)
            const itemGroups = new Map<string, { itemName: string, units: Map<string, { qty: number, name: string }> }>();

            selectedQuotes.forEach(quote => {
                quote.items.forEach(item => {
                    if (!itemGroups.has(item.itemId)) {
                        itemGroups.set(item.itemId, { itemName: item.itemName, units: new Map() });
                    }
                    const group = itemGroups.get(item.itemId)!;
                    const unitKey = item.unitId;
                    if (!group.units.has(unitKey)) {
                        group.units.set(unitKey, { qty: 0, name: item.unitName });
                    }
                    group.units.get(unitKey)!.qty += item.quantity;
                });
            });

            finalItems = Array.from(itemGroups.entries()).map(([itemId, data]) => {
                const descriptiveStrings = Array.from(data.units.values())
                    .filter(u => u.qty > 0)
                    .map(u => `${u.qty} ${u.name}`);
                
                return {
                    itemId,
                    itemName: data.itemName,
                    quantity: 1, // placeholder
                    unitId: 'aggregated',
                    unitName: descriptiveStrings.join(' و '), // النتيجة: "1 شوال و 10 كيلو"
                    price: 0,
                    discount: 0,
                    total: 0
                };
            });
        } else {
            // التجميع المالي التقليدي (حسب السعر)
            const mergedMap = new Map<string, LineItem>();
            selectedQuotes.forEach(quote => {
                quote.items.forEach(item => {
                    const key = `${item.itemId}_${item.unitId}_${item.price}`;
                    if (mergedMap.has(key)) {
                        const existing = mergedMap.get(key)!;
                        existing.quantity += item.quantity;
                        existing.total = (existing.quantity * existing.price) - existing.discount;
                    } else {
                        mergedMap.set(key, JSON.parse(JSON.stringify(item)));
                    }
                });
            });
            finalItems = Array.from(mergedMap.values());
        }
        
        const mergeId = `QT-MRG-${Date.now().toString().slice(-4)}`;
        
        openWindow({ 
            path: '/price-quotes', 
            title: strategy === 'byItem' ? 'بيان كميات مجمع' : 'عرض سعر مجمع', 
            icon: <TableCellsIcon />,
            state: {
                isEditMode: false,
                activeQuote: {
                    id: mergeId,
                    date: new Date().toISOString().slice(0, 10),
                    hidePrices: strategy === 'byItem', 
                },
                items: finalItems,
                customer: null,
                productSearchTerm: '',
                customerSearchTerm: '',
                isProcessing: false,
            }
        });

        setSelectedIds(new Set());
        showToast(`تم تجميع الأصناف من ${selectedQuotes.length} مستند بنجاح.`);
    };

    const renderActions = (row: PriceQuote) => (
        <div className="flex justify-center items-center space-x-2 space-x-reverse">
            <button onClick={() => setQuoteToView(row)} className="text-gray-400 hover:text-blue-500" title="عرض التفاصيل">
                <EyeIcon className="w-5 h-5"/>
            </button>
            {row.status === 'جديد' && (
                <>
                    <button onClick={() => handleEdit(row)} className="text-gray-400 hover:text-green-500" title="تعديل">
                        <PencilIcon className="w-5 h-5"/>
                    </button>
                    {!row.hidePrices && (
                        <button onClick={() => handleConvert(row)} className="text-gray-400 hover:text-green-500" title="تحويل إلى فاتورة">
                            <ArrowPathIcon className="w-5 h-5"/>
                        </button>
                    )}
                    <button onClick={() => setQuoteToCancel(row)} className="text-gray-400 hover:text-red-500" title="إلغاء">
                        <TrashIcon className="w-5 h-5"/>
                    </button>
                </>
            )}
        </div>
    );
    
    const columns = useMemo(() => [
        { 
            header: (
                <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    onChange={handleSelectAll}
                    checked={selectedIds.size === priceQuotes.length && priceQuotes.length > 0}
                />
            ), 
            accessor: 'selection',
            sortable: false,
            render: (row: PriceQuote) => (
                <input 
                    type="checkbox" 
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    checked={selectedIds.has(row.id)}
                    onChange={() => handleToggleSelect(row.id)}
                    onClick={(e) => e.stopPropagation()}
                />
            )
        },
        { header: 'الرقم', accessor: 'id', sortable: true },
        { header: 'النوع', accessor: 'hidePrices', render: (row: PriceQuote) => row.hidePrices ? 'بيان كميات' : 'عرض سعر', sortable: true },
        { header: 'العميل', accessor: 'customer', sortable: true },
        { header: 'التاريخ', accessor: 'date', sortable: true },
        { header: 'الإجمالي', accessor: 'total', render: (row: PriceQuote) => row.hidePrices ? '-' : `${row.total.toLocaleString()} ج.م`, sortable: true },
        { header: 'الحالة', accessor: 'status', render: (row: PriceQuote) => <StatusBadge status={row.status} />, sortable: true },
        { header: 'الإجراءات', accessor: 'actions', render: renderActions },
    ], [priceQuotes, selectedIds]);

    return (
        <div className="space-y-6">
            <PageHeader 
                title="قائمة بيانات الأسعار" 
                buttonText="إنشاء عرض سعر جديد"
                onButtonClick={() => openWindow({ 
                    path: '/price-quotes', 
                    title: 'إنشاء بيان أسعار', 
                    icon: <DocumentPlusIcon />,
                    state: {
                        isEditMode: false,
                        activeQuote: {
                            id: `QT-${String(sequences.priceQuote).padStart(3, '0')}`,
                            date: new Date().toISOString().slice(0, 10),
                            hidePrices: false
                        },
                        items: [],
                        customer: null,
                        productSearchTerm: '',
                        customerSearchTerm: '',
                        isProcessing: false,
                    }
                })}
                buttonIcon={<DocumentPlusIcon />}
            />

            {selectedIds.size > 0 && (
                <div className="flex flex-col sm:flex-row items-center justify-between p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800 rounded-xl gap-4 shadow-sm animate-fade-in-out">
                    <div className="flex flex-col">
                         <span className="text-blue-700 dark:text-blue-300 font-bold">تجميع ({selectedIds.size}) مستندات</span>
                         <span className="text-[10px] text-gray-500">سيتم دمج الأصناف المتشابهة تلقائياً</span>
                    </div>
                    <div className="flex gap-2 w-full sm:w-auto">
                        <button 
                            onClick={() => handleMergeQuotes('byItem')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-800 font-bold shadow-md transition-all text-xs"
                            title="سيتم دمج الوحدات لنفس الصنف في سطر واحد (مثال: 1 شوال و 10 كيلو)"
                        >
                            <Squares2X2Icon className="w-4 h-4" />
                            تجميع وصفي (بدون أسعار)
                        </button>
                        <button 
                            onClick={() => handleMergeQuotes('byPrice')}
                            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-bold shadow-md transition-all text-xs"
                            title="تجميع مالي دقيق يعتمد على تساوى الصنف والسعر"
                        >
                            <ListBulletIcon className="w-4 h-4" />
                            تجميع مالي (حسب السعر)
                        </button>
                    </div>
                </div>
            )}

            <DataTable 
                columns={columns} 
                data={priceQuotes}
                searchableColumns={['id', 'customer', 'date', 'status']}
                onRowClick={(row) => handleToggleSelect(row.id)}
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