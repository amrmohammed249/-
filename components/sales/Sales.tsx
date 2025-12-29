import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import { Sale, LineItem, InventoryItem, Customer, PackingUnit, TreasuryTransaction } from '../../types';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, UsersIcon, BoxIcon, InformationCircleIcon } from '../icons';
import Modal from '../shared/Modal';
import AddCustomerForm from '../customers/AddCustomerForm';
import InvoiceView from './InvoiceView';

interface SalesProps {
    windowId?: string;
    windowState?: any;
    onStateChange?: (updater: (prevState: any) => any) => void;
}

const Sales: React.FC<SalesProps> = ({ windowId, windowState, onStateChange }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;
    const isWindowMode = !!windowId;

    const { customers, inventory, addSale, updateSale, sales, showToast, sequences, scannedItem, generalSettings, addTreasuryTransaction, treasuriesList } = useContext(DataContext);
    const { visibleWindowId, closeWindow } = useContext(WindowContext);
    
    const productSearchRef = useRef<HTMLInputElement>(null);
    const customerSearchRef = useRef<HTMLInputElement>(null);
    const itemInputRefs = useRef<Record<string, { quantity: HTMLInputElement | null; unit: HTMLSelectElement | null; price: HTMLInputElement | null }>>({});

    const [localState, setLocalState] = useState({
        activeInvoice: {},
        items: [],
        itemErrors: {},
        customer: null,
        productSearchTerm: '',
        customerSearchTerm: '',
        paidAmount: '0',
        isProcessing: false,
    });
    
    const state = isWindowMode ? windowState : localState;
    const setState = useCallback(
        isWindowMode ? onStateChange! : (updater: any) => setLocalState(updater),
        [isWindowMode, onStateChange]
    );
    
    const { activeInvoice, items, itemErrors, customer, productSearchTerm, customerSearchTerm, paidAmount, isProcessing } = state || {};

    const [isAddCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
    const [saleToView, setSaleToView] = useState<Sale | null>(null);
    const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
    const [lastProcessedScan, setLastProcessedScan] = useState(0);
    const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
    const [lastPriceInfo, setLastPriceInfo] = useState<string>('');

    const resetInvoice = useCallback(() => {
        const resetState = {
            activeInvoice: {
                id: `INV-${String(sequences.sale).padStart(3, '0')}`,
                date: new Date().toISOString().slice(0, 10),
                status: 'مستحقة'
            },
            items: [],
            customer: null,
            productSearchTerm: '',
            customerSearchTerm: '',
            paidAmount: '0',
            itemErrors: {},
            isProcessing: false,
        };
        if(isWindowMode) {
            setState(() => resetState);
        } else {
            navigate('/sales/new');
        }
        customerSearchRef.current?.focus();
    }, [sequences.sale, isWindowMode, setState, navigate]);

    useEffect(() => {
        if (!isWindowMode && isEditMode) {
            const saleToEdit = sales.find((s: Sale) => s.id === id);
            if (saleToEdit) {
                const saleCustomer = customers.find((c: Customer) => c.name === saleToEdit.customer);
                setState(prev => ({
                    ...prev,
                    activeInvoice: saleToEdit,
                    items: saleToEdit.items,
                    customer: saleCustomer || null,
                    paidAmount: String(saleToEdit.paidAmount || 0)
                }));
            } else {
                showToast('لم يتم العثور على الفاتورة.', 'error');
                navigate('/sales');
            }
        }
    }, [id, isEditMode, isWindowMode, sales, customers, showToast, navigate, setState]);
    
    const getLastPriceForItem = useCallback((itemId: string) => {
        if (!customer) return null;
        const customerSales = sales
            .filter((s: Sale) => s.customer === customer.name && !s.isArchived && s.id !== activeInvoice.id)
            .sort((a: Sale, b: Sale) => new Date(b.date).getTime() - new Date(a.date).getTime());
        for (const s of customerSales) {
            const itemInSale = s.items.find(item => item.itemId === itemId);
            if (itemInSale) return { price: itemInSale.price, date: s.date, unitName: itemInSale.unitName };
        }
        return null;
    }, [customer, sales, activeInvoice.id]);

    useEffect(() => {
        if (activeLineIndex === null || !customer || !items || items.length <= activeLineIndex) {
            setLastPriceInfo('');
            return;
        }
        const activeLineItem = items[activeLineIndex];
        if (!activeLineItem) return;
        const foundPrice = getLastPriceForItem(activeLineItem.itemId);
        if (foundPrice) setLastPriceInfo(`آخر سعر: ${foundPrice.price.toLocaleString()} (${foundPrice.unitName}) في ${foundPrice.date}`);
        else setLastPriceInfo('لا يوجد سجل مبيعات سابق لهذا الصنف.');
    }, [activeLineIndex, customer, items, getLastPriceForItem]);

    const { totals, paidAmountValue, remainingAmount } = useMemo(() => {
        const subtotal = (items || []).reduce((sum, item) => sum + item.price * item.quantity, 0);
        const totalDiscount = (items || []).reduce((sum, item) => sum + item.discount, 0);
        const grandTotal = subtotal - totalDiscount;
        const status = activeInvoice?.status;
        const pAmount = parseFloat(paidAmount || '0');
        let finalPaidAmount = 0;
        if (status === 'مدفوعة') finalPaidAmount = grandTotal;
        else if (status === 'جزئية') finalPaidAmount = pAmount;
        const remaining = grandTotal - finalPaidAmount;
        return { totals: { subtotal, totalDiscount, grandTotal }, paidAmountValue: finalPaidAmount, remainingAmount: remaining };
    }, [items, activeInvoice?.status, paidAmount]);

    const handleProductSelect = useCallback((product: InventoryItem) => {
        let initialPrice = product.salePrice;
        const foundPrice = getLastPriceForItem(product.id);
        if (foundPrice) initialPrice = foundPrice.price;
        setState(prev => {
            const currentItems = prev.items || [];
            const existingItem = currentItems.find(item => item.itemId === product.id);
            let newItems;
            if (existingItem) {
                newItems = currentItems.map(item =>
                    item.itemId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price - item.discount } : item
                );
            } else {
                const newItem: LineItem = { itemId: product.id, itemName: product.name, unitId: 'base', unitName: product.baseUnit, quantity: 1, price: initialPrice, discount: 0, total: initialPrice };
                newItems = [...currentItems, newItem];
            }
             return { ...prev, items: newItems, productSearchTerm: '' };
        });
        setHighlightedProductIndex(-1);
        productSearchRef.current?.focus();
    }, [setState, getLastPriceForItem]);
    
    useEffect(() => {
        const isCurrentWindow = windowId ? visibleWindowId === windowId : !visibleWindowId;
        if (isCurrentWindow && scannedItem && scannedItem.timestamp > lastProcessedScan) {
            handleProductSelect(scannedItem.item);
            setLastProcessedScan(scannedItem.timestamp);
        }
    }, [scannedItem, lastProcessedScan, visibleWindowId, windowId, handleProductSelect]);
    
    const handleFinalize = useCallback(async (print: boolean = false) => {
        if (!items || items.length === 0) { showToast('لا يمكن إنشاء فاتورة فارغة.', 'error'); return; }
        if (!customer) { showToast('يجب اختيار عميل قبل حفظ الفاتورة.', 'error'); return; }
        if (activeInvoice.status === 'جزئية' && (paidAmountValue <= 0 || paidAmountValue >= totals.grandTotal)) {
            showToast('المبلغ المدفوع جزئياً يجب أن يكون أكبر من صفر وأقل من الإجمالي.', 'error'); return;
        }
        setState(p => ({...p, isProcessing: true}));
        try {
            if (isEditMode) {
                const updatedSaleData: Sale = { ...(activeInvoice as Sale), customer: customer.name, date: activeInvoice.date!, status: activeInvoice.status!, paidAmount: paidAmountValue > 0 ? paidAmountValue : undefined, items: items, subtotal: totals.subtotal, totalDiscount: totals.totalDiscount, total: totals.grandTotal };
                const updatedSale = updateSale(updatedSaleData);
                showToast(`تم تعديل الفاتورة ${updatedSale.id} بنجاح.`);
                if (print) { setSaleToView(updatedSale); if(windowId) closeWindow(windowId); else navigate('/sales'); }
                else { if(windowId) closeWindow(windowId); else navigate('/sales'); }
                return;
            }
            const saleData: Omit<Sale, 'id' | 'journalEntryId'> = { customer: customer.name, date: activeInvoice.date!, status: activeInvoice.status!, paidAmount: paidAmountValue > 0 ? paidAmountValue : undefined, items: items, subtotal: totals.subtotal, totalDiscount: totals.totalDiscount, total: totals.grandTotal };
            const createdSale = addSale(saleData);
            if (paidAmountValue > 0) {
                const mainTreasury = treasuriesList.find((t: any) => t.name === 'الخزينة الرئيسية') || treasuriesList.find((t: any) => !t.isTotal);
                if (!mainTreasury) throw new Error("لم يتم العثور على خزينة رئيسية لإتمام عملية الدفع.");
                addTreasuryTransaction({ date: createdSale.date, type: 'سند قبض', treasuryAccountId: mainTreasury.id, treasuryAccountName: mainTreasury.name, description: `دفعة من فاتورة مبيعات رقم ${createdSale.id}`, amount: paidAmountValue, partyType: 'customer', partyId: customer.id });
            }
            showToast(`تم إنشاء الفاتورة ${createdSale.id} بنجاح.`);
            if (print) { setSaleToView(createdSale); resetInvoice(); }
            else { if(windowId) closeWindow(windowId); else navigate('/sales'); }
        } catch (error: any) { showToast(error.message || 'حدث خطأ أثناء حفظ الفاتورة', 'error'); } 
        finally { setState(p => ({...p, isProcessing: false})); }
    }, [isEditMode, items, customer, activeInvoice, totals, paidAmountValue, addSale, updateSale, showToast, navigate, resetInvoice, windowId, closeWindow, setState, addTreasuryTransaction, treasuriesList]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'f') { e.preventDefault(); productSearchRef.current?.focus(); }
            if (e.ctrlKey && e.key.toLowerCase() === 'k') { e.preventDefault(); customerSearchRef.current?.focus(); }
            if (e.key === 'F9') { e.preventDefault(); handleFinalize(true); }
            if (e.key === 'F2') { e.preventDefault(); handleFinalize(false); }
            if (e.key === 'F3') { e.preventDefault(); resetInvoice(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFinalize, resetInvoice]);

    const handleItemUpdate = (index: number, field: 'quantity' | 'price' | 'discount' | 'unitId', value: string) => {
        setState(prev => {
            const currentItems = prev.items || [];
            const newItems = [...currentItems];
            const item = {...newItems[index]};
            const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
            if (!inventoryItem) return prev;
            if (field === 'unitId') {
                item.unitId = value;
                if (value === 'base') { item.unitName = inventoryItem.baseUnit; item.price = inventoryItem.salePrice; } 
                else { const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === value); if (packingUnit) { item.unitName = packingUnit.name; item.price = packingUnit.salePrice; } }
            } else { const numValue = parseFloat(value) || 0; (item as any)[field] = numValue; }
            let newErrors = {...(prev.itemErrors || {})};
            if (field === 'quantity' || field === 'unitId') {
                 let quantityInBaseUnit = item.quantity;
                 if (item.unitId !== 'base') { const packingUnit = inventoryItem.units.find(u => u.id === item.unitId); if(packingUnit) quantityInBaseUnit *= packingUnit.factor; }
                let availableStock = inventoryItem.stock;
                if (isEditMode) {
                    const originalSale = sales.find((s: Sale) => s.id === id);
                    const originalItem = originalSale?.items.find(i => i.itemId === item.itemId);
                    if (originalItem) {
                        let origQty = originalItem.quantity;
                        if (originalItem.unitId !== 'base') { const pUnit = inventoryItem.units.find(u => u.id === originalItem.unitId); if(pUnit) origQty *= pUnit.factor; }
                        availableStock += origQty;
                    }
                }
                if (!generalSettings.allowNegativeStock && quantityInBaseUnit > availableStock) newErrors[item.itemId] = `المتاح: ${availableStock}`;
                else delete newErrors[item.itemId];
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
            if (itemToRemove && itemInputRefs.current[itemToRemove.itemId]) delete itemInputRefs.current[itemToRemove.itemId];
            const newItems = currentItems.filter((_, i) => i !== index);
            let newErrors = {...(prev.itemErrors || {})};
            if (itemToRemove) delete newErrors[itemToRemove.itemId];
            return {...prev, items: newItems, itemErrors: newErrors};
        });
        setActiveLineIndex(null);
        setLastPriceInfo('');
    };

    const productSearchResults = useMemo(() => {
        if (!productSearchTerm || productSearchTerm.length < 1) return [];
        const term = productSearchTerm.toLowerCase();
        return inventory.filter((p: InventoryItem) => !p.isArchived && (p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.barcode?.includes(term))).slice(0, 5);
    }, [productSearchTerm, inventory]);

    const customerSearchResults = useMemo(() => {
        if (!customerSearchTerm || customerSearchTerm.length < 1) return [];
        const term = customerSearchTerm.toLowerCase();
        return customers.filter((c: Customer) => !c.isArchived && (c.name.toLowerCase().includes(term) || c.phone.includes(term))).slice(0, 5);
    }, [customerSearchTerm, customers]);

    useEffect(() => { setHighlightedProductIndex(-1); }, [productSearchTerm]);
    useEffect(() => { setHighlightedCustomerIndex(-1); }, [customerSearchTerm]);

    const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
        if (productSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedProductIndex(prev => (prev + 1) % productSearchResults.length); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedProductIndex(prev => (prev - 1 + productSearchResults.length) % productSearchResults.length); } 
        else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedProductIndex > -1) { e.preventDefault(); handleProductSelect(productSearchResults[highlightedProductIndex]); }
    };
    
    const handleCustomerSearchKeyDown = (e: React.KeyboardEvent) => {
        if (customerSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') { e.preventDefault(); setHighlightedCustomerIndex(prev => (prev + 1) % customerSearchResults.length); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); setHighlightedCustomerIndex(prev => (prev - 1 + customerSearchResults.length) % customerSearchResults.length); } 
        else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedCustomerIndex > -1) { e.preventDefault(); setState(p => ({...p, customer: customerSearchResults[highlightedCustomerIndex], customerSearchTerm: ''})); setHighlightedCustomerIndex(-1); productSearchRef.current?.focus(); }
    };
    
    const handleItemInputKeyDown = (e: React.KeyboardEvent, index: number, field: 'quantity' | 'unit' | 'price') => {
        const moveFocus = (targetIndex: number) => {
            if (targetIndex >= 0 && targetIndex < (items || []).length) {
                const targetItemId = items[targetIndex].itemId;
                const fieldRef = itemInputRefs.current[targetItemId]?.[field];
                if (fieldRef) { fieldRef.focus(); if (fieldRef.tagName === 'INPUT') (fieldRef as HTMLInputElement).select(); }
            }
        };
        if (e.key === 'ArrowDown') { e.preventDefault(); moveFocus(index + 1); } 
        else if (e.key === 'ArrowUp') { e.preventDefault(); moveFocus(index - 1); }
        else if (e.key === 'Tab' && !e.shiftKey && field === 'price') { e.preventDefault(); productSearchRef.current?.focus(); }
    };

    if (!state) return null; 

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 text-[--text] font-sans overflow-x-hidden">
            <header className="flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm p-3 flex flex-wrap justify-between items-center gap-3">
                <div className="flex items-center gap-3 shrink-0">
                    <h1 className="text-lg sm:text-xl font-bold text-gray-800 dark:text-gray-100">{isEditMode ? 'تعديل' : 'مبيعات جديدة'}</h1>
                    <span className="font-mono text-xs bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded shrink-0">{activeInvoice.id}</span>
                    <input type="date" value={activeInvoice.date || ''} onChange={e => setState(p => ({...p, activeInvoice: {...p.activeInvoice, date: e.target.value}}))} className="input-style text-sm py-1 w-32 sm:w-36" />
                </div>
                <div className="flex-grow max-w-full sm:max-w-sm relative order-3 sm:order-2">
                    <MagnifyingGlassIcon className="w-4 h-4 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input ref={customerSearchRef} type="text" placeholder="بحث عميل... (Ctrl+K)" value={customerSearchTerm || ''} onChange={(e) => setState(p => ({...p, customerSearchTerm: e.target.value}))} onKeyDown={handleCustomerSearchKeyDown} className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pr-9 pl-4 text-sm focus:ring-2 focus:ring-[--accent] outline-none" />
                    {customerSearchResults.length > 0 && (
                        <div className="absolute top-full right-0 left-0 bg-white dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-50">
                            {customerSearchResults.map((c, index) => (
                                <div key={c.id} onClick={() => { setState(p => ({...p, customer: c, customerSearchTerm: ''})); productSearchRef.current?.focus(); }} className={`p-2 text-sm cursor-pointer ${index === highlightedCustomerIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}>{c.name}</div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2 order-2 sm:order-3">
                    {customer ? (
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-1.5 sm:p-2 rounded-lg text-xs sm:text-sm">
                            <UsersIcon className="w-4 h-4" />
                            <span className="font-semibold truncate max-w-[80px] sm:max-w-[150px]">{customer.name}</span>
                            <button onClick={() => setState(p => ({...p, customer: null}))} className="text-red-500 font-bold ml-1">×</button>
                        </div>
                    ) : (
                        <button onClick={() => setAddCustomerModalOpen(true)} className="flex items-center gap-1 px-2 py-1.5 text-xs bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300"><PlusIcon className="w-3.5 h-3.5" /> عميل</button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row gap-4 p-2 sm:p-4 overflow-hidden">
                <main className="w-full md:w-2/3 flex flex-col bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 overflow-hidden">
                    <div className="p-2 sm:p-3 border-b dark:border-gray-700 relative bg-gray-50/50 dark:bg-gray-800">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input ref={productSearchRef} type="text" placeholder="مسح باركود أو اسم الصنف... (Ctrl+F)" value={productSearchTerm || ''} onChange={(e) => setState(p => ({...p, productSearchTerm: e.target.value}))} onKeyDown={handleProductSearchKeyDown} className="w-full text-base sm:text-lg bg-white dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-2.5 pr-12 focus:ring-2 focus:ring-[--accent] outline-none" />
                        {productSearchResults.length > 0 && (
                            <div className="absolute top-full right-3 left-3 bg-white dark:bg-gray-800 shadow-xl rounded-b-lg border dark:border-gray-700 z-50">
                                {productSearchResults.map((p, index) => (
                                    <div key={p.id} onClick={() => handleProductSelect(p)} className={`p-3 flex justify-between cursor-pointer border-b last:border-0 dark:border-gray-700 ${index === highlightedProductIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}><span className="text-sm font-bold">{p.name}</span><span className="text-xs text-gray-500">المتاح: {p.stock}</span></div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        {/* Mobile Optimized View */}
                        <div className="md:hidden divide-y dark:divide-gray-700">
                            {(!items || items.length === 0) && (
                                <div className="flex flex-col items-center justify-center py-20 text-gray-400">
                                    <BoxIcon className="w-16 h-16 opacity-20 mb-2"/>
                                    <p className="text-sm">لا توجد أصناف في الفاتورة</p>
                                </div>
                            )}
                            {items && items.map((item, index) => {
                                const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
                                const unitOptions = inventoryItem ? [{ id: 'base', name: inventoryItem.baseUnit }, ...inventoryItem.units] : [];
                                const error = (itemErrors || {})[item.itemId];
                                return (
                                    <div key={item.itemId + index} className="p-3 bg-white dark:bg-gray-800" onFocus={() => setActiveLineIndex(index)}>
                                        <div className="flex justify-between items-start mb-2">
                                            <span className="font-bold text-sm text-gray-900 dark:text-white truncate flex-1 ml-4">{item.itemName}</span>
                                            <button onClick={() => handleItemRemove(index)} className="text-red-400 p-1"><TrashIcon className="w-5 h-5"/></button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="relative">
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">الكمية</label>
                                                <input type="number" value={item.quantity} onChange={e => handleItemUpdate(index, 'quantity', e.target.value)} className={`input-style w-full text-center text-sm py-1.5 ${error ? 'border-red-500' : ''}`} />
                                                {error && <p className="text-[10px] text-red-500 absolute top-full left-0">{error}</p>}
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">الوحدة</label>
                                                <select value={item.unitId} onChange={e => handleItemUpdate(index, 'unitId', e.target.value)} className="input-style w-full text-sm py-1.5">
                                                    {unitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-gray-400 uppercase">السعر</label>
                                                <input type="number" value={item.price} onChange={e => handleItemUpdate(index, 'price', e.target.value)} className="input-style w-full text-center text-sm py-1.5" />
                                            </div>
                                            <div className="flex flex-col justify-end text-left">
                                                <span className="text-[10px] font-bold text-gray-400 uppercase">الإجمالي</span>
                                                <span className="font-mono font-bold text-blue-600 dark:text-blue-400">{item.total.toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        {/* Desktop Table View */}
                        <table className="hidden md:table w-full text-sm text-right table-auto">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10">
                                <tr><th className="px-2 py-3 w-20">الكود</th><th className="px-2 py-3">الصنف</th><th className="px-2 py-3 w-28">الكمية</th><th className="px-2 py-3 w-32">الوحدة</th><th className="px-2 py-3 w-28">السعر</th><th className="px-2 py-3 w-28">الخصم</th><th className="px-2 py-3 w-32 text-left">الإجمالي</th><th className="px-2 py-3 w-12"></th></tr>
                            </thead>
                            <tbody>
                                {(!items || items.length === 0) && (<tr><td colSpan={8}><div className="flex flex-col items-center justify-center h-full text-gray-400 py-16"><BoxIcon className="w-16 h-16"/><p>لم تتم إضافة أي أصناف بعد</p></div></td></tr>)}
                                {items && items.map((item, index) => {
                                    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
                                    const unitOptions = inventoryItem ? [{ id: 'base', name: inventoryItem.baseUnit }, ...inventoryItem.units] : [];
                                    const error = (itemErrors || {})[item.itemId];
                                    const lastPriceData = getLastPriceForItem(item.itemId);
                                    const isMatchingLastPrice = lastPriceData !== null && Math.abs(item.price - lastPriceData.price) < 0.01;
                                    const priceInputClass = `input-style w-full text-center ${isMatchingLastPrice ? 'bg-green-50 text-green-700 border-green-500 font-bold focus:ring-green-500' : ''}`;
                                    return (
                                        <tr key={item.itemId + index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20" onFocus={() => setActiveLineIndex(index)}>
                                            <td className="px-2 py-2 text-xs font-mono text-center">{item.itemId}</td><td className="px-2 py-2 font-semibold truncate">{item.itemName}</td>
                                            <td className="px-2 py-2"><input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].quantity = el; }} type="number" value={item.quantity} onChange={e => handleItemUpdate(index, 'quantity', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'quantity')} className={`input-style w-full text-center ${error ? 'border-red-500' : ''}`} /></td>
                                            <td className="px-2 py-2"><select ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].unit = el; }} value={item.unitId} onChange={e => handleItemUpdate(index, 'unitId', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'unit')} className="input-style w-full">{unitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}</select></td>
                                            <td className="px-2 py-2"><input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].price = el; }} type="number" value={item.price} onChange={e => handleItemUpdate(index, 'price', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'price')} className={priceInputClass} /></td>
                                            <td className="px-2 py-2"><input type="number" value={item.discount} onChange={e => handleItemUpdate(index, 'discount', e.target.value)} className="input-style w-full text-center"/></td>
                                            <td className="px-2 py-2 text-left font-mono font-semibold">{item.total.toLocaleString()}</td>
                                            <td className="px-2 py-2 text-center"><button onClick={() => handleItemRemove(index)} className="text-red-400 hover:text-red-600"><TrashIcon className="w-5 h-5"/></button></td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                    {lastPriceInfo && activeLineIndex !== null && items[activeLineIndex] && (
                        <div className="p-2 sm:p-3 bg-blue-50 dark:bg-blue-900/20 border-t border-blue-200 dark:border-blue-800 flex items-center gap-2 text-xs sm:text-sm text-blue-800 dark:text-blue-200">
                            <InformationCircleIcon className="w-4 h-4 sm:w-5 h-5 text-blue-500 shrink-0" />
                            <span className="truncate">{lastPriceInfo}</span>
                        </div>
                    )}
                </main>
                <aside className="w-full md:w-1/3 flex flex-col gap-4">
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-3 sm:p-4 flex-grow flex flex-col">
                        <div className="flex justify-between items-center border-b dark:border-gray-700 pb-2 mb-3 sm:mb-4">
                             <h2 className="text-base sm:text-lg font-bold">ملخص الحساب</h2>
                             <select value={activeInvoice.status || 'مدفوعة'} onChange={e => setState(p => ({...p, activeInvoice: {...p.activeInvoice, status: e.target.value}, paidAmount: '0'}))} disabled={isEditMode} className="input-style text-xs py-1 px-2 border-blue-500 text-blue-600 font-bold">
                                <option value="مدفوعة">مدفوعة كاش</option>
                                <option value="مستحقة">مستحقة (آجل)</option>
                                <option value="جزئية">دفعة جزئية</option>
                             </select>
                        </div>
                        <div className="space-y-2 text-sm flex-grow">
                            <div className="flex justify-between"><span className="text-gray-500">المجموع الفرعي</span><span className="font-mono">{totals.subtotal.toLocaleString()}</span></div>
                            <div className="flex justify-between"><span className="text-gray-500">الخصومات</span><span className="font-mono text-red-500">-{totals.totalDiscount.toLocaleString()}</span></div>
                            {activeInvoice.status === 'جزئية' && (
                                <div className="flex justify-between items-center bg-blue-50 dark:bg-blue-900/20 p-2 rounded-md my-2">
                                    <label className="text-xs font-bold text-blue-700 dark:text-blue-300">المبلغ المدفوع</label>
                                    <input type="number" value={paidAmount} onChange={e => setState(p => ({...p, paidAmount: e.target.value}))} disabled={isEditMode} className="input-style w-24 text-left font-mono text-sm py-1" min="0"/>
                                </div>
                            )}
                             <div className="flex justify-between border-t dark:border-gray-700 pt-2 mt-2"><span className="text-gray-500 font-bold">الباقي (مدين)</span><span className="font-mono font-bold text-red-600">{remainingAmount.toLocaleString()}</span></div>
                        </div>
                        <div className="border-t-2 border-dashed dark:border-gray-700 pt-3 mt-4">
                            <div className="flex justify-between items-center text-2xl sm:text-3xl font-bold text-blue-600 dark:text-blue-400">
                                <span>الإجمالي</span>
                                <span className="font-mono">{totals.grandTotal.toLocaleString()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border dark:border-gray-700 p-3 sm:p-4 space-y-2 sm:space-y-3">
                        <button onClick={() => handleFinalize(true)} disabled={isProcessing || Object.keys(itemErrors || {}).length > 0} className="w-full text-lg sm:text-xl font-bold p-3 sm:p-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 shadow-lg disabled:opacity-50">
                            {isProcessing ? 'جاري الحفظ...' : (isEditMode ? 'تعديل وطباعة' : 'حفظ وطباعة (F9)')}
                        </button>
                        <div className="grid grid-cols-2 gap-2">
                             <button onClick={() => handleFinalize(false)} disabled={isProcessing || Object.keys(itemErrors || {}).length > 0} className="w-full text-xs sm:text-sm font-bold p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200">حفظ فقط (F2)</button>
                             <button onClick={() => isEditMode ? navigate('/sales') : resetInvoice()} className="w-full text-xs sm:text-sm font-bold p-2.5 bg-gray-100 dark:bg-gray-700 rounded-lg hover:bg-gray-200 text-red-500">إلغاء (F3)</button>
                        </div>
                    </div>
                </aside>
            </div>
            {isAddCustomerModalOpen && (
                <Modal isOpen={isAddCustomerModalOpen} onClose={() => setAddCustomerModalOpen(false)} title="إضافة عميل جديد">
                    <AddCustomerForm onClose={() => setAddCustomerModalOpen(false)} onSuccess={(c) => { setState(p => ({...p, customer: c})); setAddCustomerModalOpen(false); }} />
                </Modal>
            )}
            {saleToView && (
                <InvoiceView isOpen={!!saleToView} onClose={() => setSaleToView(null)} sale={saleToView} />
            )}
        </div>
    );
};

export default Sales;