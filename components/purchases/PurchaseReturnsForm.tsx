import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import { PurchaseReturn, LineItem, InventoryItem, Supplier, PackingUnit } from '../../types';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, UsersIcon, BoxIcon } from '../icons';
import Modal from '../shared/Modal';
import AddSupplierForm from '../suppliers/AddSupplierForm';
import PurchaseReturnView from './PurchaseReturnView';

interface PurchaseReturnsFormProps {
    windowId: string;
    windowState?: any;
    onStateChange?: (updater: (prevState: any) => any) => void;
}

const PurchaseReturnsForm: React.FC<PurchaseReturnsFormProps> = ({ windowId, windowState, onStateChange }) => {
    const { suppliers, inventory, addPurchaseReturn, showToast, sequences, scannedItem, generalSettings } = useContext(DataContext);
    const { visibleWindowId } = useContext(WindowContext);
    
    const productSearchRef = useRef<HTMLInputElement>(null);
    const supplierSearchRef = useRef<HTMLInputElement>(null);
    const itemInputRefs = useRef<Record<string, { quantity: HTMLInputElement | null; unit: HTMLSelectElement | null; price: HTMLInputElement | null }>>({});

    const setState = onStateChange!;
    const state = windowState || {};
    const { activeReturn, items, supplier, productSearchTerm, supplierSearchTerm, isProcessing, itemErrors } = state;

    const [isAddSupplierModalOpen, setAddSupplierModalOpen] = useState(false);
    const [returnToView, setReturnToView] = useState<PurchaseReturn | null>(null);
    
    const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);
    const [highlightedSupplierIndex, setHighlightedSupplierIndex] = useState(-1);
    const [lastProcessedScan, setLastProcessedScan] = useState(0);

    const resetForm = useCallback(() => {
        const resetState = {
            activeReturn: {
                id: `PRET-${String(sequences.purchaseReturn).padStart(3, '0')}`,
                date: new Date().toISOString().slice(0, 10),
            },
            items: [],
            supplier: null,
            productSearchTerm: '',
            supplierSearchTerm: '',
            isProcessing: false,
            itemErrors: {},
        };
        setState(() => resetState);
        supplierSearchRef.current?.focus();
    }, [sequences.purchaseReturn, setState]);

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
            if (existingItem) {
                return prev; // Or increment quantity if desired
            }
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
            const newItems = [...currentItems, newItem];
            return { ...prev, items: newItems, productSearchTerm: '' };
        });
        setHighlightedProductIndex(-1);
        productSearchRef.current?.focus();
    }, [setState]);
    
    useEffect(() => {
        if (visibleWindowId === windowId && scannedItem && scannedItem.timestamp > lastProcessedScan) {
            handleProductSelect(scannedItem.item);
            setLastProcessedScan(scannedItem.timestamp);
        }
    }, [scannedItem, lastProcessedScan, visibleWindowId, windowId, handleProductSelect]);

    const handleFinalize = useCallback(async (print: boolean = false) => {
        if (!items || items.length === 0) {
            showToast('لا يمكن إنشاء مرتجع فارغ.', 'error'); return;
        }
        if (!supplier) {
            showToast('يجب اختيار مورد.', 'error'); return;
        }
        if (Object.keys(itemErrors || {}).length > 0) {
            showToast('لا يمكن حفظ المرتجع لوجود أخطاء في الكميات.', 'error'); return;
        }

        setState(p => ({...p, isProcessing: true}));

        const newReturnData: Omit<PurchaseReturn, 'id' | 'journalEntryId'> = {
            supplier: supplier?.name,
            date: activeReturn.date!,
            items: items,
            subtotal: totals.subtotal,
            totalDiscount: totals.totalDiscount,
            total: totals.grandTotal,
        };

        try {
            const createdReturn = addPurchaseReturn(newReturnData);
            showToast(`تم إنشاء مرتجع المشتريات ${createdReturn.id} بنجاح.`);
            if (print) {
                setReturnToView(createdReturn);
            }
            resetForm();
        } catch (error: any) {
            showToast(error.message || 'حدث خطأ أثناء حفظ المرتجع', 'error');
        } finally {
            setState(p => ({...p, isProcessing: false}));
        }
    }, [items, supplier, activeReturn, totals, itemErrors, addPurchaseReturn, showToast, resetForm, setState]);

    const handleItemUpdate = (index: number, field: 'quantity' | 'price' | 'discount' | 'unitId', value: string) => {
        setState(prev => {
            const newItems = [...(prev.items || [])];
            const item = {...newItems[index]};
            const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
            if (!inventoryItem) return prev;
            let newErrors = {...(prev.itemErrors || {})};

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

            if (field === 'quantity' || field === 'unitId') {
                let quantityInBaseUnit = item.quantity;
                if (item.unitId !== 'base') {
                    const packingUnit = inventoryItem.units.find(u => u.id === item.unitId);
                    if (packingUnit) quantityInBaseUnit *= packingUnit.factor;
                }
        
                if (!generalSettings.allowNegativeStock && quantityInBaseUnit > inventoryItem.stock) {
                    newErrors[item.itemId] = `المخزون غير كافٍ (المتاح: ${inventoryItem.stock})`;
                } else {
                    delete newErrors[item.itemId];
                }
            }

            item.total = (item.quantity * item.price) - item.discount;
            newItems[index] = item;
            return {...prev, items: newItems, itemErrors: newErrors };
        });
    };

    const handleItemRemove = (index: number) => {
        setState(prev => {
            const currentItems = prev.items || [];
            const itemToRemove = currentItems[index];
            const newItems = currentItems.filter((_, i) => i !== index);
            let newErrors = {...(prev.itemErrors || {})};
            if (itemToRemove) {
                delete newErrors[itemToRemove.itemId];
            }
            return {...prev, items: newItems, itemErrors: newErrors};
        });
    };

    const productSearchResults = useMemo(() => {
        if (!productSearchTerm || productSearchTerm.length < 1) return [];
        return inventory.filter((p: InventoryItem) => !p.isArchived && (p.name.toLowerCase().includes(productSearchTerm.toLowerCase()) || p.id.toLowerCase().includes(productSearchTerm.toLowerCase()))).slice(0, 5);
    }, [productSearchTerm, inventory]);

    const supplierSearchResults = useMemo(() => {
        if (!supplierSearchTerm || supplierSearchTerm.length < 1) return [];
        return suppliers.filter((c: Supplier) => !c.isArchived && c.name.toLowerCase().includes(supplierSearchTerm.toLowerCase())).slice(0, 5);
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
        else if (e.key === 'Tab' && !e.shiftKey && field === 'price') { e.preventDefault(); productSearchRef.current?.focus(); }
    };

    if (!state || !activeReturn) return null;

    return (
        <div className="flex flex-col h-full bg-[--bg] text-[--text] font-sans">
            <header className="flex-shrink-0 bg-[--panel] dark:bg-gray-800 shadow-sm p-3 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold">مرتجع مشتريات جديد</h1>
                    <span className="font-mono text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{activeReturn.id}</span>
                    <input type="date" value={activeReturn.date || ''} onChange={e => setState(p => ({...p, activeReturn: {...p.activeReturn, date: e.target.value}}))} className="input-style w-36"/>
                </div>
                <div className="flex-grow max-w-sm relative">
                    <input ref={supplierSearchRef} type="text" placeholder="ابحث عن مورد..." value={supplierSearchTerm || ''} onChange={(e) => setState(p => ({...p, supplierSearchTerm: e.target.value}))}  onKeyDown={handleSupplierSearchKeyDown} className="input-style w-full"/>
                    {supplierSearchResults.length > 0 && (
                        <div className="absolute top-full right-0 left-0 bg-[--panel] dark:bg-gray-800 shadow-lg z-30">
                            {supplierSearchResults.map((s, index) => ( <div key={s.id} onClick={() => { setState(p => ({...p, supplier: s, supplierSearchTerm: ''})); productSearchRef.current?.focus(); }} className={`p-2 cursor-pointer ${index === highlightedSupplierIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}>{s.name}</div>))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {supplier ? <div className="flex items-center gap-2 p-2 rounded-lg bg-blue-100 dark:bg-blue-900/30"><UsersIcon className="w-5 h-5" /><span className="font-semibold">{supplier.name}</span><button onClick={() => setState(p => ({...p, supplier: null}))} className="text-red-500 mr-1 font-bold">×</button></div>
                    : <button onClick={() => setAddSupplierModalOpen(true)} className="btn-secondary-small"><PlusIcon className="w-4 h-4" /> مورد جديد</button>}
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
                <main className="w-full md:w-2/3 flex flex-col bg-[--panel] dark:bg-gray-800 rounded-lg shadow-md">
                    <div className="p-3 border-b dark:border-gray-700 relative">
                        <input ref={productSearchRef} type="text" placeholder="ابحث بالباركود أو اسم الصنف..." value={productSearchTerm || ''} onChange={(e) => setState(p => ({...p, productSearchTerm: e.target.value}))} onKeyDown={handleProductSearchKeyDown} className="input-style w-full text-lg p-3"/>
                        {productSearchResults.length > 0 && (
                            <div className="absolute top-full right-3 left-3 bg-[--panel] dark:bg-gray-800 shadow-lg z-20">
                                {productSearchResults.map((p, index) => ( <div key={p.id} onClick={() => handleProductSelect(p)} className={`p-3 flex justify-between cursor-pointer ${index === highlightedProductIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-700'}`}><span>{p.name}</span><span className="text-sm text-gray-500">المتاح: {p.stock}</span></div>))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-right">
                            <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                                <tr><th className="px-2 py-3">الصنف</th><th className="px-2 py-3">الكمية</th><th className="px-2 py-3">الوحدة</th><th className="px-2 py-3">السعر</th><th className="px-2 py-3">الإجمالي</th><th className="px-2 py-3"></th></tr>
                            </thead>
                            <tbody>
                                {(!items || items.length === 0) && (<tr><td colSpan={6}><div className="text-center py-16 text-gray-400"><BoxIcon className="w-16 h-16 mx-auto"/><p>لم تتم إضافة أصناف.</p></div></td></tr>)}
                                {items && items.map((item, index) => {
                                    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
                                    const unitOptions = inventoryItem ? [{ id: 'base', name: inventoryItem.baseUnit }, ...inventoryItem.units] : [];
                                    const error = (itemErrors || {})[item.itemId];
                                    return (
                                        <tr key={item.itemId + index} className="border-b dark:border-gray-700">
                                            <td className="px-2 py-2 font-semibold">{item.itemName}</td>
                                            <td className="px-2 py-2 w-28">
                                                <input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].quantity = el; }} type="number" value={item.quantity} onChange={e => handleItemUpdate(index, 'quantity', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'quantity')} className={`input-style w-full text-center ${error ? 'border-red-500' : ''}`}/>
                                                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                                            </td>
                                            <td className="px-2 py-2 w-32"><select ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].unit = el; }} value={item.unitId} onChange={e => handleItemUpdate(index, 'unitId', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'unit')} className="input-style w-full">{unitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select></td>
                                            <td className="px-2 py-2 w-28"><input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].price = el; }} type="number" value={item.price} onChange={e => handleItemUpdate(index, 'price', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'price')} className="input-style w-full text-center"/></td>
                                            <td className="px-2 py-2 w-32 text-left font-mono font-semibold">{item.total.toLocaleString()}</td>
                                            <td className="px-2 py-2 w-12 text-center"><button onClick={() => handleItemRemove(index)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                </main>
                <aside className="w-full md:w-1/3 flex flex-col gap-4">
                    <div className="bg-[--panel] dark:bg-gray-800 rounded-lg shadow-md p-4 flex-grow flex flex-col">
                        <h2 className="text-lg font-bold border-b dark:border-gray-700 pb-2 mb-4">ملخص المرتجع</h2>
                        <div className="flex-grow"></div>
                        <div className="border-t-2 border-dashed pt-3 mt-4"><div className="flex justify-between items-center text-3xl font-bold text-[--accent]"><span>الإجمالي</span><span className="font-mono">{totals.grandTotal.toLocaleString()}</span></div></div>
                    </div>
                    <div className="bg-[--panel] dark:bg-gray-800 rounded-lg shadow-md p-4 space-y-3">
                        <button onClick={() => handleFinalize(true)} disabled={isProcessing || Object.keys(itemErrors || {}).length > 0} className="w-full text-xl font-bold p-4 bg-[--accent] text-white rounded-lg hover:opacity-90 disabled:opacity-50">حفظ وطباعة الإشعار</button>
                        <button onClick={resetForm} className="w-full text-md p-2 bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">مرتجع جديد</button>
                    </div>
                </aside>
            </div>
            {isAddSupplierModalOpen && (
                <Modal isOpen={isAddSupplierModalOpen} onClose={() => setAddSupplierModalOpen(false)} title="إضافة مورد جديد">
                    <AddSupplierForm onClose={() => setAddSupplierModalOpen(false)} onSuccess={(s) => { setState(p => ({...p, supplier: s})); setAddSupplierModalOpen(false); }} />
                </Modal>
            )}
            {returnToView && <PurchaseReturnView isOpen={!!returnToView} onClose={() => setReturnToView(null)} purchaseReturn={returnToView} />}
        </div>
    );
};

export default PurchaseReturnsForm;