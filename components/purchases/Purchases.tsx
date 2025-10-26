import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import { Purchase, LineItem, InventoryItem, Supplier, PackingUnit } from '../../types';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, UsersIcon, BoxIcon } from '../icons';
import Modal from '../shared/Modal';
import AddSupplierForm from '../suppliers/AddSupplierForm';
import PurchaseInvoiceView from './PurchaseInvoiceView';

interface PurchasesProps {
    windowId?: string;
    windowState?: any;
    onStateChange?: (updater: (prevState: any) => any) => void;
}

const Purchases: React.FC<PurchasesProps> = ({ windowId, windowState, onStateChange }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;
    const isWindowMode = !!windowId;

    const { suppliers, inventory, addPurchase, updatePurchase, purchases, showToast, sequences, scannedItem } = useContext(DataContext);
    const { visibleWindowId, closeWindow } = useContext(WindowContext);

    const productSearchRef = useRef<HTMLInputElement>(null);
    const supplierSearchRef = useRef<HTMLInputElement>(null);
    const itemInputRefs = useRef<Record<string, { quantity: HTMLInputElement | null; unit: HTMLSelectElement | null; price: HTMLInputElement | null }>>({});

    // Local state for non-windowed (edit) mode
    const [localState, setLocalState] = useState({
        activeBill: {},
        items: [],
        supplier: null,
        productSearchTerm: '',
        supplierSearchTerm: '',
        isProcessing: false,
    });

    // Determine which state and setter to use
    const state = isWindowMode ? windowState : localState;
    const setState = isWindowMode ? onStateChange! : (updater) => setLocalState(updater as any);
    
    const { activeBill, items, supplier, productSearchTerm, supplierSearchTerm, isProcessing } = state || {};


    const [isAddSupplierModalOpen, setAddSupplierModalOpen] = useState(false);
    const [purchaseToView, setPurchaseToView] = useState<Purchase | null>(null);

    const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);
    const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(-1);
    const [lastProcessedScan, setLastProcessedScan] = useState(0);

    const resetBill = useCallback(() => {
        const resetState = {
            activeBill: {
                id: `BILL-${String(sequences.purchase).padStart(3, '0')}`,
                date: new Date().toISOString().slice(0, 10),
                status: 'مدفوعة'
            },
            items: [],
            supplier: null,
            productSearchTerm: '',
            supplierSearchTerm: '',
            isProcessing: false,
        };
        if(isWindowMode) {
            setState(() => resetState);
        } else {
            navigate('/purchases/new'); // Fallback for direct navigation
        }
        supplierSearchRef.current?.focus();
    }, [sequences.purchase, isWindowMode, setState, navigate]);


    // Load data for non-windowed edit mode
    useEffect(() => {
        if (!isWindowMode && isEditMode) {
            const purchaseToEdit = purchases.find((p: Purchase) => p.id === id);
            if (purchaseToEdit) {
                const purchaseSupplier = suppliers.find((s: Supplier) => s.name === purchaseToEdit.supplier);
                setState(prev => ({
                    ...prev,
                    activeBill: purchaseToEdit,
                    items: purchaseToEdit.items,
                    supplier: purchaseSupplier || null,
                }));
            } else {
                showToast('لم يتم العثور على الفاتورة.', 'error');
                navigate('/purchases');
            }
        }
    }, [id, isEditMode, isWindowMode, purchases, suppliers, showToast, navigate]);


    const totals = useMemo(() => {
        const subtotal = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
        const totalDiscount = (items || []).reduce((sum, item) => sum + item.discount, 0);
        const grandTotal = subtotal - totalDiscount;
        return { subtotal, totalDiscount, grandTotal };
    }, [items]);

    const handleProductSelect = useCallback((product: InventoryItem) => {
        setState(prev => {
            const currentItems = prev.items || [];
            const existingItem = currentItems.find(item => item.itemId === product.id);
            let newItems;
            if (existingItem) {
                newItems = currentItems.map(item =>
                    item.itemId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price - item.discount } : item
                );
            } else {
                const newItem: LineItem = {
                    itemId: product.id,
                    itemName: product.name,
                    unitId: 'base',
                    unitName: product.baseUnit,
                    quantity: 1,
                    price: product.purchasePrice,
                    discount: 0,
                    total: product.purchasePrice,
                };
                newItems = [...currentItems, newItem];
            }
            return { ...prev, items: newItems, productSearchTerm: '' };
        });

        setHighlightedProductIndex(-1);
        productSearchRef.current?.focus();
    }, [setState]);

    useEffect(() => {
        const isCurrentWindow = windowId ? visibleWindowId === windowId : !visibleWindowId;
        if (isCurrentWindow && scannedItem && scannedItem.timestamp > lastProcessedScan) {
            handleProductSelect(scannedItem.item);
            setLastProcessedScan(scannedItem.timestamp);
        }
    }, [scannedItem, lastProcessedScan, visibleWindowId, windowId, handleProductSelect]);
    
    const handleFinalize = useCallback(async (paymentStatus: Purchase['status'], print: boolean = false) => {
        if (!items || items.length === 0) {
            showToast('لا يمكن إنشاء فاتورة فارغة.', 'error');
            return;
        }
        if (paymentStatus === 'مستحقة' && !supplier) {
            showToast('يجب اختيار مورد للشراء الآجل.', 'error');
            return;
        }
        setState(p => ({...p, isProcessing: true}));

        const purchaseData: Omit<Purchase, 'id' | 'journalEntryId'> = {
            supplier: supplier?.name || 'مورد نقدي',
            date: activeBill.date!,
            status: paymentStatus,
            items: items,
            subtotal: totals.subtotal,
            totalDiscount: totals.totalDiscount,
            total: totals.grandTotal,
        };

        try {
            if (isEditMode) {
                const updatedPurchase = await updatePurchase({ ...purchaseData, id: id! });
                showToast(`تم تعديل فاتورة المشتريات ${updatedPurchase.id} بنجاح.`);
                if (print) setPurchaseToView(updatedPurchase);
                navigate('/purchases');
            } else {
                const createdPurchase = addPurchase(purchaseData);
                showToast(`تم إنشاء فاتورة المشتريات ${createdPurchase.id} بنجاح.`);
                if (print) {
                    setPurchaseToView(createdPurchase);
                    resetBill();
                } else {
                    if (windowId) closeWindow(windowId);
                    else navigate('/purchases');
                }
            }
        } catch (error: any) {
            showToast(error.message || 'حدث خطأ أثناء حفظ الفاتورة', 'error');
        } finally {
            setState(p => ({...p, isProcessing: false}));
        }
    }, [isEditMode, id, items, supplier, activeBill.date, totals, addPurchase, updatePurchase, showToast, navigate, resetBill, windowId, closeWindow, setState]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); productSearchRef.current?.focus(); }
            if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); supplierSearchRef.current?.focus(); }
            if (e.key === 'F9') { e.preventDefault(); handleFinalize('مدفوعة', true); }
            if (e.key === 'F2') { e.preventDefault(); handleFinalize('مستحقة', false); }
            if (e.key === 'F3') { e.preventDefault(); resetBill(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFinalize, resetBill]);

    const handleItemUpdate = (index: number, field: 'quantity' | 'price' | 'discount' | 'unitId', value: string) => {
        setState(prev => {
            const newItems = [...(prev.items || [])];
            const item = {...newItems[index]};
            const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
            if (!inventoryItem) return prev;

            if (field === 'unitId') {
                item.unitId = value;
                if (value === 'base') {
                    item.unitName = inventoryItem.baseUnit;
                    item.price = inventoryItem.purchasePrice;
                } else {
                    const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === value);
                    if (packingUnit) {
                        item.unitName = packingUnit.name;
                        item.price = packingUnit.purchasePrice;
                    }
                }
            } else {
                (item as any)[field] = parseFloat(value) || 0;
            }
            
            item.total = (item.quantity * item.price) - item.discount;
            newItems[index] = item;
            return {...prev, items: newItems};
        });
    };

    const handleItemRemove = (index: number) => {
        setState(prev => {
            const currentItems = prev.items || [];
            const itemToRemove = currentItems[index];
            if (itemToRemove && itemInputRefs.current[itemToRemove.itemId]) {
                delete itemInputRefs.current[itemToRemove.itemId];
            }
            const newItems = currentItems.filter((_, i) => i !== index);
            return {...prev, items: newItems};
        });
    };

    const productSearchResults = useMemo(() => {
        if (!productSearchTerm || productSearchTerm.length < 1) return [];
        const term = productSearchTerm.toLowerCase();
        return inventory.filter((p: InventoryItem) =>
            !p.isArchived && (p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.barcode?.includes(term))
        ).slice(0, 5);
    }, [productSearchTerm, inventory]);

    const supplierSearchResults = useMemo(() => {
        if (!supplierSearchTerm || supplierSearchTerm.length < 1) return [];
        const term = supplierSearchTerm.toLowerCase();
        return suppliers.filter((s: Supplier) => !s.isArchived && (s.name.toLowerCase().includes(term) || s.phone.includes(term))).slice(0, 5);
    }, [supplierSearchTerm, suppliers]);
    
    useEffect(() => { setHighlightedProductIndex(-1); }, [productSearchTerm]);
    useEffect(() => { setHighlightedSupplierIndex(-1); }, [supplierSearchTerm]);

    const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
        if (productSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedProductIndex(prev => (prev + 1) % productSearchResults.length); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedProductIndex(prev => (prev - 1 + productSearchResults.length) % productSearchResults.length); } 
        else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedProductIndex > -1) { e.preventDefault(); handleProductSelect(productSearchResults[highlightedProductIndex]); }
    };
    
    const handleSupplierSearchKeyDown = (e: React.KeyboardEvent) => {
        if (supplierSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedSupplierIndex(prev => (prev + 1) % supplierSearchResults.length); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedSupplierIndex(prev => (prev - 1 + supplierSearchResults.length) % supplierSearchResults.length); } 
        else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedSupplierIndex > -1) { e.preventDefault(); setState(p => ({...p, supplier: supplierSearchResults[highlightedSupplierIndex], supplierSearchTerm: ''})); setHighlightedSupplierIndex(-1); productSearchRef.current?.focus(); }
    };

    const handleItemInputKeyDown = (e: React.KeyboardEvent, index: number, field: 'quantity' | 'unit' | 'price') => {
        const moveFocus = (targetIndex: number) => {
            if (targetIndex >= 0 && targetIndex < (items || []).length) {
                const targetItemId = items[targetIndex].itemId;
                const fieldRef = itemInputRefs.current[targetItemId]?.[field];
                if (fieldRef) {
                    fieldRef.focus();
                    if (fieldRef.tagName === 'INPUT') (fieldRef as HTMLInputElement).select();
                }
            }
        };
        if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(index + 1); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(index - 1); }
        else if (e.key === 'Tab' && !e.shiftKey && field === 'price') {
            e.preventDefault();
            productSearchRef.current?.focus();
        }
    };

    if (!state) return null; // Important for windowed mode initial render

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 text-[--text] font-sans">
            <header className="flex-shrink-0 bg-[--panel] dark:bg-gray-800 shadow-sm p-3 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{isEditMode ? 'تعديل فاتورة مشتريات' : 'فاتورة مشتريات جديدة'}</h1>
                    <span className="font-mono text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{activeBill.id}</span>
                    <input type="date" value={activeBill.date || ''} onChange={e => setState(p => ({...p, activeBill: {...p.activeBill, date: e.target.value}}))} className="input-style w-36" />
                </div>
                <div className="flex-grow max-w-sm relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input ref={supplierSearchRef} type="text" placeholder="ابحث عن مورد... (Ctrl+K)" value={supplierSearchTerm || ''} onChange={(e) => setState(p => ({...p, supplierSearchTerm: e.target.value}))} onKeyDown={handleSupplierSearchKeyDown} className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pr-10 pl-4 focus:ring-2 focus:ring-[--accent] outline-none" />
                    {supplierSearchResults.length > 0 && (
                        <div className="absolute top-full right-0 left-0 bg-[--panel] dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-30">
                            {supplierSearchResults.map((s, index) => (<div key={s.id} onClick={() => { setState(p => ({...p, supplier: s, supplierSearchTerm: ''})); productSearchRef.current?.focus();}} className={`p-2 cursor-pointer ${index === highlightedSupplierIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}>{s.name} - {s.phone}</div>))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {supplier ? (
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg"><UsersIcon className="w-5 h-5" /><span className="font-semibold">{supplier.name}</span><button onClick={() => setState(p => ({...p, supplier: null}))} className="text-red-500 mr-1 text-lg font-bold">×</button></div>
                    ) : (
                        <button onClick={() => setAddSupplierModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"><PlusIcon className="w-4 h-4" /> مورد جديد</button>
                    )}
                </div>
            </header>
            <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
                <main className="w-full md:w-2/3 flex flex-col bg-[--panel] dark:bg-gray-800 rounded-lg shadow-[--shadow]">
                    <div className="p-3 border-b dark:border-gray-700 relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input ref={productSearchRef} type="text" placeholder="ابحث بالباركود أو اسم الصنف... (Ctrl+F)" value={productSearchTerm || ''} onChange={(e) => setState(p => ({...p, productSearchTerm: e.target.value}))} onKeyDown={handleProductSearchKeyDown} className="w-full text-lg bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-[--accent] outline-none" />
                        {productSearchResults.length > 0 && (
                            <div className="absolute top-full right-3 left-3 bg-[--panel] dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-20">
                                {productSearchResults.map((p, index) => (<div key={p.id} onClick={() => handleProductSelect(p)} className={`p-3 flex justify-between cursor-pointer ${index === highlightedProductIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}><span>{p.name}</span><span className="text-sm text-gray-500">سعر الشراء: {p.purchasePrice}</span></div>))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-right table-auto">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10"><tr><th className="px-2 py-3 w-20">الكود</th><th className="px-2 py-3">الصنف</th><th className="px-2 py-3 w-28">الكمية</th><th className="px-2 py-3 w-32">الوحدة</th><th className="px-2 py-3 w-28">السعر</th><th className="px-2 py-3 w-28">الخصم</th><th className="px-2 py-3 w-32 text-left">الإجمالي</th><th className="px-2 py-3 w-12"></th></tr></thead>
                            <tbody>
                                {(!items || items.length === 0) && (<tr><td colSpan={8}><div className="flex flex-col items-center justify-center h-full text-gray-400 py-16"><BoxIcon className="w-16 h-16"/><p>لم تتم إضافة أي أصناف بعد</p></div></td></tr>)}
                                {items && items.map((item, index) => {
                                    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
                                    const unitOptions = inventoryItem ? [{ id: 'base', name: inventoryItem.baseUnit }, ...inventoryItem.units] : [];
                                    return (
                                        <tr key={item.itemId + index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                                            <td className="px-2 py-2 text-xs font-mono text-center">{item.itemId}</td><td className="px-2 py-2 font-semibold truncate">{item.itemName}</td>
                                            <td className="px-2 py-2"><input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].quantity = el; }} type="number" value={item.quantity} onChange={e => handleItemUpdate(index, 'quantity', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'quantity')} className="input-style w-full text-center"/></td>
                                            <td className="px-2 py-2"><select ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].unit = el; }} value={item.unitId} onChange={e => handleItemUpdate(index, 'unitId', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'unit')} className="input-style w-full">{unitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select></td>
                                            <td className="px-2 py-2"><input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].price = el; }} type="number" value={item.price} onChange={e => handleItemUpdate(index, 'price', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'price')} className="input-style w-full text-center"/></td>
                                            <td className="px-2 py-2"><input type="number" value={item.discount} onChange={e => handleItemUpdate(index, 'discount', e.target.value)} className="input-style w-full text-center"/></td>
                                            <td className="px-2 py-2 text-left font-mono font-semibold">{item.total.toLocaleString()}</td><td className="px-2 py-2 text-center"><button onClick={() => handleItemRemove(index)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>
                <aside className="w-full md:w-1/3 flex flex-col gap-4">
                    <div className="bg-[--panel] dark:bg-gray-800 rounded-lg shadow-[--shadow] p-4 flex-grow flex flex-col">
                        <h2 className="text-lg font-bold border-b dark:border-gray-700 pb-2 mb-4">ملخص الفاتورة</h2>
                        <div className="space-y-3 text-md flex-grow"><div className="flex justify-between"><span className="text-[--muted]">المجموع الفرعي</span><span className="font-mono font-semibold">{totals.subtotal.toLocaleString()}</span></div><div className="flex justify-between"><span className="text-[--muted]">إجمالي الخصم</span><span className="font-mono font-semibold text-red-500">{totals.totalDiscount.toLocaleString()}</span></div></div>
                        <div className="border-t-2 border-dashed dark:border-gray-700 pt-3 mt-4"><div className="flex justify-between items-center text-3xl font-bold text-[--accent]"><span>الإجمالي</span><span className="font-mono">{totals.grandTotal.toLocaleString()}</span></div></div>
                    </div>
                    <div className="bg-[--panel] dark:bg-gray-800 rounded-lg shadow-[--shadow] p-4 space-y-3">
                        <button onClick={() => handleFinalize('مدفوعة', true)} disabled={isProcessing} className="w-full text-xl font-bold p-4 bg-[--accent] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait">{isProcessing ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التعديلات' : 'حفظ وطباعة (F9)')}</button>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => handleFinalize('مستحقة', false)} disabled={isProcessing} className="w-full text-md p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">{isEditMode ? 'حفظ كـ مستحقة' : 'حفظ كمستحقة (F2)'}</button>
                             <button onClick={() => isEditMode ? navigate('/purchases') : resetBill()} className="w-full text-md p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">{isEditMode ? 'إلغاء' : 'فاتورة جديدة (F3)'}</button>
                        </div>
                    </div>
                </aside>
            </div>
            {isAddSupplierModalOpen && (<Modal isOpen={isAddSupplierModalOpen} onClose={() => setAddSupplierModalOpen(false)} title="إضافة مورد جديد"><AddSupplierForm onClose={() => setAddSupplierModalOpen(false)} onSuccess={(s) => { setState(p => ({...p, supplier: s})); setAddSupplierModalOpen(false); }} /></Modal>)}
            {purchaseToView && (<PurchaseInvoiceView isOpen={!!purchaseToView} onClose={() => setPurchaseToView(null)} purchase={purchaseToView} />)}
        </div>
    );
}

export default Purchases;