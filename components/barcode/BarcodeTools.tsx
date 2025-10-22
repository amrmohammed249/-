import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import { InventoryItem } from '../../types';
import { PrinterIcon, PlusIcon, BarcodeIcon } from '../icons';
import Modal from '../shared/Modal';
import ConfirmationModal from '../shared/ConfirmationModal';

const BarcodeTools: React.FC = () => {
    const { inventory, updateItem, showToast, generateAndAssignBarcodesForMissing } = useContext(DataContext);
    
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);
    
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [printModalItem, setPrintModalItem] = useState<InventoryItem | null>(null);
    const [printQuantity, setPrintQuantity] = useState(1);
    const [isBatchPrintModalOpen, setBatchPrintModalOpen] = useState(false);
    const [batchPrintQuantities, setBatchPrintQuantities] = useState<Record<string, number>>({});
    const [isGenerateModalOpen, setGenerateModalOpen] = useState(false);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);
    
    useEffect(() => {
        if(isBatchPrintModalOpen) {
            const initialQuantities: Record<string, number> = {};
            selectedItems.forEach(id => {
                initialQuantities[id] = 1;
            });
            setBatchPrintQuantities(initialQuantities);
        }
    }, [isBatchPrintModalOpen, selectedItems]);

    const handleLink = () => {
        if (!scannedBarcode || !selectedItemId) {
            showToast('الرجاء مسح باركود واختيار صنف.', 'error');
            return;
        }
        const item = inventory.find((i: any) => i.id === selectedItemId);
        if (!item) {
            showToast('الصنف المختار غير موجود.', 'error');
            return;
        }
        
        try {
            updateItem({ ...item, barcode: scannedBarcode });
            showToast(`تم ربط الباركود "${scannedBarcode}" بالصنف "${item.name}" بنجاح.`);
            setScannedBarcode('');
            setSelectedItemId('');
            setItemSearch('');
            barcodeInputRef.current?.focus();
        } catch(e) {
            // showToast is already called inside updateItem on failure
        }
    };

    const confirmGenerate = () => {
        generateAndAssignBarcodesForMissing();
        setGenerateModalOpen(false);
    };
    
    const handleOpenPrintModal = (item: InventoryItem) => {
        if (!item.barcode) {
            showToast('لا يوجد باركود مسجل لهذا الصنف.', 'warning');
            return;
        }
        setPrintModalItem(item);
        setPrintQuantity(1);
    }
    
    const handleSinglePrint = () => {
        if (!printModalItem || printQuantity <= 0) return;
        window.open(`/#/print/barcode/${printModalItem.id}?quantity=${printQuantity}`, '_blank');
        setPrintModalItem(null);
    }
    
    const handleBatchPrint = () => {
        const itemsToPrint = Object.entries(batchPrintQuantities).filter(([, qty]: [string, number]) => qty > 0);
        if(itemsToPrint.length === 0) {
            showToast('الرجاء تحديد كمية لواحد من الأصناف على الأقل.', 'warning');
            return;
        }
        
        sessionStorage.setItem('batchPrintData', JSON.stringify(Object.fromEntries(itemsToPrint)));
        window.open('/#/print/barcode/batch', '_blank');
        setBatchPrintModalOpen(false);
        setSelectedItems(new Set());
    };

    const handleToggleSelect = (itemId: string) => {
        const newSelection = new Set(selectedItems);
        if (newSelection.has(itemId)) {
            newSelection.delete(itemId);
        } else {
            newSelection.add(itemId);
        }
        setSelectedItems(newSelection);
    };

    const handleToggleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(new Set(inventory.map((i: InventoryItem) => i.id)));
        } else {
            setSelectedItems(new Set());
        }
    };
    
    const itemOptions = useMemo(() => {
        if (!itemSearch) return [];
        return inventory.filter((i: any) => 
            !i.isArchived && 
            (i.name.toLowerCase().includes(itemSearch.toLowerCase()) || i.id.toLowerCase().includes(itemSearch.toLowerCase()))
        );
    }, [inventory, itemSearch]);

    const columns = useMemo(() => [
        { 
            header: (
                <input 
                    type="checkbox" 
                    onChange={handleToggleSelectAll}
                    checked={selectedItems.size === inventory.length && inventory.length > 0}
                    // @ts-ignore
                    indeterminate={(selectedItems.size > 0 && selectedItems.size < inventory.length).toString()}
                />
            ), 
            accessor: 'select',
            render: (row: InventoryItem) => (
                <input 
                    type="checkbox"
                    checked={selectedItems.has(row.id)}
                    onChange={() => handleToggleSelect(row.id)}
                />
            )
        },
        { header: 'كود الصنف', accessor: 'id', sortable: true },
        { header: 'اسم الصنف', accessor: 'name', sortable: true },
        { header: 'الباركود', accessor: 'barcode', render: (row: InventoryItem) => row.barcode || <span className="text-gray-400">-- غير محدد --</span>, sortable: true },
        { 
            header: 'طباعة',
            accessor: 'print',
            render: (row: InventoryItem) => (
                <button 
                    onClick={() => handleOpenPrintModal(row)} 
                    disabled={!row.barcode}
                    className="p-2 text-gray-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={row.barcode ? "طباعة ملصق الباركود" : "لا يوجد باركود"}
                >
                    <PrinterIcon className="w-5 h-5"/>
                </button>
            )
        }
    ], [inventory, selectedItems]);

    return (
        <div className="space-y-6">
            <PageHeader title="أدوات الباركود" buttonText="" onButtonClick={()=>{}}/>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">الربط السريع للباركود</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">امسح الباركود ثم اختر الصنف المقابل له لربطهما.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 items-end">
                    <div>
                        <label htmlFor="barcode-scan" className="input-label">1. امسح الباركود هنا</label>
                        <input
                            ref={barcodeInputRef}
                            id="barcode-scan"
                            type="text"
                            value={scannedBarcode}
                            onChange={e => setScannedBarcode(e.target.value)}
                            className="input-style w-full mt-1"
                            placeholder="...انتظار المسح"
                        />
                    </div>
                    <div className="relative">
                        <label htmlFor="item-select" className="input-label">2. اختر الصنف</label>
                         <input
                            type="text"
                            value={itemSearch}
                            onChange={(e) => { setItemSearch(e.target.value); setSelectedItemId(''); }}
                            placeholder="ابحث عن صنف بالاسم أو الكود..."
                            className="input-style w-full mt-1"
                        />
                        {itemSearch && itemOptions.length > 0 && (
                            <div className="absolute top-full right-0 left-0 bg-white dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-10 max-h-60 overflow-y-auto">
                                {itemOptions.map((item: any) => (
                                    <div 
                                        key={item.id} 
                                        onClick={() => { setSelectedItemId(item.id); setItemSearch(item.name); }}
                                        className={`p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 ${selectedItemId === item.id ? 'bg-blue-100 dark:bg-blue-700' : ''}`}
                                    >
                                        {item.name} ({item.id})
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div>
                        <button onClick={handleLink} className="btn-primary w-full">3. ربط</button>
                    </div>
                </div>
            </div>
            
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
                <h3 className="text-xl font-bold text-gray-800 dark:text-gray-100">إنشاء باركود تلقائي</h3>
                <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    يقوم هذا الإجراء بالبحث عن كل الأصناف التي لا تملك باركود وتعيين باركود رقمي فريد لها تلقائيًا.
                </p>
                <div className="mt-4">
                    <button onClick={() => setGenerateModalOpen(true)} className="btn-secondary flex items-center gap-2">
                        <BarcodeIcon className="w-5 h-5" />
                        إنشاء باركود للأصناف المتبقية
                    </button>
                </div>
            </div>


            {selectedItems.size > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg flex items-center justify-between">
                    <span className="font-semibold text-blue-800 dark:text-blue-200">{selectedItems.size} أصناف محددة</span>
                    <button onClick={() => setBatchPrintModalOpen(true)} className="btn-primary flex items-center gap-2">
                        <PrinterIcon className="w-5 h-5" />
                        طباعة ملصقات للأصناف المحددة
                    </button>
                </div>
            )}

            <DataTable
                columns={columns}
                data={inventory}
                searchableColumns={['id', 'name', 'barcode']}
            />
            
            {/* Single Print Modal */}
            <Modal isOpen={!!printModalItem} onClose={() => setPrintModalItem(null)} title={`طباعة ملصقات لـ: ${printModalItem?.name}`}>
                <div className="space-y-4">
                    <div>
                        <label htmlFor="print-quantity" className="input-label">عدد الملصقات المطلوب</label>
                        <input type="number" id="print-quantity" value={printQuantity} onChange={e => setPrintQuantity(Number(e.target.value))} min="1" className="input-style w-full mt-1" />
                    </div>
                    <button onClick={() => setPrintQuantity(printModalItem?.stock || 1)} className="w-full btn-secondary">
                        طباعة الكمية بالمخزون ({printModalItem?.stock})
                    </button>
                </div>
                <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => setPrintModalItem(null)} className="btn-secondary">إلغاء</button>
                    <button onClick={handleSinglePrint} className="btn-primary">طباعة</button>
                </div>
            </Modal>
            
            {/* Batch Print Modal */}
            <Modal isOpen={isBatchPrintModalOpen} onClose={() => setBatchPrintModalOpen(false)} title="طباعة ملصقات مجمعة" size="4xl">
                <div className="space-y-4">
                    <button 
                        onClick={() => {
                            const newQuantities: Record<string, number> = {};
                            inventory.forEach((item: InventoryItem) => {
                                if (selectedItems.has(item.id)) {
                                    newQuantities[item.id] = item.stock;
                                }
                            });
                            setBatchPrintQuantities(newQuantities);
                        }}
                        className="w-full btn-secondary"
                    >
                        تطبيق الكمية بالمخزون للكل
                    </button>
                    <div className="max-h-96 overflow-y-auto space-y-2 border p-2 rounded-lg">
                        {inventory.filter((i: InventoryItem) => selectedItems.has(i.id)).map((item: InventoryItem) => (
                            <div key={item.id} className="grid grid-cols-3 gap-4 items-center">
                                <span className="font-semibold truncate">{item.name}</span>
                                <span>الكمية بالمخزون: {item.stock}</span>
                                <input 
                                    type="number" 
                                    value={batchPrintQuantities[item.id] || 1}
                                    onChange={(e) => setBatchPrintQuantities(p => ({...p, [item.id]: Number(e.target.value)}))}
                                    min="0"
                                    className="input-style"
                                />
                            </div>
                        ))}
                    </div>
                </div>
                 <div className="mt-6 flex justify-end gap-2">
                    <button onClick={() => setBatchPrintModalOpen(false)} className="btn-secondary">إلغاء</button>
                    <button onClick={handleBatchPrint} className="btn-primary">طباعة الكل</button>
                </div>
            </Modal>
            
            <ConfirmationModal
                isOpen={isGenerateModalOpen}
                onClose={() => setGenerateModalOpen(false)}
                onConfirm={confirmGenerate}
                title="تأكيد إنشاء الباركودات"
                message="هل أنت متأكد من رغبتك في إنشاء باركودات فريدة لكل الأصناف التي لا تملك باركود حاليًا؟"
            />

        </div>
    );
};

export default BarcodeTools;