import React, { useState, useEffect, useContext, useMemo, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { WindowContext } from '../../context/WindowContext';
import { Sale, LineItem, InventoryItem, Customer, PackingUnit } from '../../types';
import { PlusIcon, TrashIcon, MagnifyingGlassIcon, UsersIcon, BoxIcon } from '../icons';
import Modal from '../shared/Modal';
import AddCustomerForm from '../customers/AddCustomerForm';
import InvoiceView from './InvoiceView';

interface SalesProps {
    windowId?: string;
}

const Sales: React.FC<SalesProps> = ({ windowId }) => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const isEditMode = !!id;

    const { customers, inventory, addSale, updateSale, sales, showToast, sequences, scannedItem, generalSettings } = useContext(DataContext);
    const { visibleWindowId, setWindowDirty, closeWindow } = useContext(WindowContext);
    
    const productSearchRef = useRef<HTMLInputElement>(null);
    const customerSearchRef = useRef<HTMLInputElement>(null);
    const itemInputRefs = useRef<Record<string, { quantity: HTMLInputElement | null; unit: HTMLSelectElement | null; price: HTMLInputElement | null }>>({});

    const [isDirty, setIsDirty] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [activeInvoice, setActiveInvoice] = useState<Partial<Sale>>({});
    const [items, setItems] = useState<LineItem[]>([]);
    const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
    const [customer, setCustomer] = useState<Customer | null>(null);
    const [productSearchTerm, setProductSearchTerm] = useState('');
    const [customerSearchTerm, setCustomerSearchTerm] = useState('');
    const [isAddCustomerModalOpen, setAddCustomerModalOpen] = useState(false);
    const [saleToView, setSaleToView] = useState<Sale | null>(null);
    
    const [highlightedProductIndex, setHighlightedProductIndex] = useState(-1);
    const [highlightedCustomerIndex, setHighlightedCustomerIndex] = useState(-1);
    const [lastAddedItemId, setLastAddedItemId] = useState<string | null>(null);
    const [lastProcessedScan, setLastProcessedScan] = useState(0);
    
    useEffect(() => {
      if (windowId) {
        setWindowDirty(windowId, isDirty);
      }
    }, [isDirty, windowId, setWindowDirty]);

    const manualReset = useCallback(() => {
        setIsProcessing(false);
        setItems([]);
        setCustomer(null);
        setProductSearchTerm('');
        setCustomerSearchTerm('');
        itemInputRefs.current = {};
        setItemErrors({});
        setActiveInvoice({
            id: `INV-${String(sequences.sale).padStart(3, '0')}`,
            date: new Date().toISOString().slice(0, 10),
            status: 'مدفوعة'
        });
        setIsDirty(false);
        customerSearchRef.current?.focus();
    }, [sequences.sale]);

    const resetInvoice = useCallback(() => {
        if(windowId) {
            manualReset();
        } else {
            navigate('/sales/new');
        }
    }, [navigate, windowId, manualReset]);

    useEffect(() => {
        if (isEditMode) {
            const saleToEdit = sales.find((s: Sale) => s.id === id);
            if (saleToEdit) {
                const saleCustomer = customers.find((c: Customer) => c.name === saleToEdit.customer);
                setActiveInvoice(saleToEdit);
                setItems(saleToEdit.items);
                setCustomer(saleCustomer || null);
            } else {
                showToast('لم يتم العثور على الفاتورة.', 'error');
                navigate('/sales');
            }
        } else {
            manualReset();
        }
    }, [id, isEditMode, sales, customers, showToast, navigate, manualReset]);
    
    useEffect(() => {
      if (lastAddedItemId) {
        setTimeout(() => {
          const refs = itemInputRefs.current[lastAddedItemId];
          if (refs?.quantity) {
            refs.quantity.focus();
            refs.quantity.select();
          }
        }, 0);
        setLastAddedItemId(null);
      }
    }, [lastAddedItemId]);

    const totals = useMemo(() => {
        const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const totalDiscount = items.reduce((sum, item) => sum + item.discount, 0);
        const grandTotal = subtotal - totalDiscount;
        return { subtotal, totalDiscount, grandTotal };
    }, [items]);

    const handleProductSelect = useCallback((product: InventoryItem) => {
        setIsDirty(true);
        setItems(currentItems => {
            const existingItem = currentItems.find(item => item.itemId === product.id);
            if (existingItem) {
                return currentItems.map(item =>
                    item.itemId === product.id ? { ...item, quantity: item.quantity + 1, total: (item.quantity + 1) * item.price - item.discount } : item
                );
            } else {
                const newItem: LineItem = {
                    itemId: product.id,
                    itemName: product.name,
                    unitId: 'base',
                    unitName: product.baseUnit,
                    quantity: 1,
                    price: product.salePrice,
                    discount: 0,
                    total: product.salePrice,
                };
                return [...currentItems, newItem];
            }
        });
        setLastAddedItemId(product.id);
        setProductSearchTerm('');
        setHighlightedProductIndex(-1);
    }, []);
    
    useEffect(() => {
        const isCurrentWindow = windowId ? visibleWindowId === windowId : !visibleWindowId;
        if (isCurrentWindow && scannedItem && scannedItem.timestamp > lastProcessedScan) {
            handleProductSelect(scannedItem.item);
            setLastProcessedScan(scannedItem.timestamp);
        }
    }, [scannedItem, lastProcessedScan, visibleWindowId, windowId, handleProductSelect]);

    const handleFinalize = useCallback(async (paymentStatus: Sale['status'], print: boolean = false) => {
        if (items.length === 0) {
            showToast('لا يمكن إنشاء فاتورة فارغة.', 'error');
            return;
        }
        if (paymentStatus === 'مستحقة' && !customer) {
            showToast('يجب اختيار عميل للبيع الآجل.', 'error');
            return;
        }
        setIsProcessing(true);

        const saleData: Omit<Sale, 'id' | 'journalEntryId'> = {
            customer: customer?.name || 'عميل نقدي',
            date: activeInvoice.date!,
            status: paymentStatus,
            items: items,
            subtotal: totals.subtotal,
            totalDiscount: totals.totalDiscount,
            total: totals.grandTotal,
        };

        try {
            if (isEditMode) {
                const updatedSale = await updateSale({ ...saleData, id: id! });
                showToast(`تم تعديل الفاتورة ${updatedSale.id} بنجاح.`);
                if (print) setSaleToView(updatedSale);
                navigate('/sales');
            } else {
                const createdSale = addSale(saleData);
                showToast(`تم إنشاء الفاتورة ${createdSale.id} بنجاح.`);
                setIsDirty(false);
                if (print) {
                    setSaleToView(createdSale);
                    resetInvoice();
                } else {
                    if(windowId) closeWindow(windowId);
                    navigate('/sales');
                }
            }
        } catch (error: any) {
            showToast(error.message || 'حدث خطأ أثناء حفظ الفاتورة', 'error');
        } finally {
             setIsProcessing(false);
        }
    }, [isEditMode, id, items, customer, activeInvoice.date, totals, addSale, updateSale, showToast, navigate, resetInvoice, windowId, closeWindow]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.ctrlKey && e.key.toLowerCase() === 'f') {
                 e.preventDefault();
                 productSearchRef.current?.focus();
            }
            if (e.ctrlKey && e.key.toLowerCase() === 'k') {
                 e.preventDefault();
                 customerSearchRef.current?.focus();
            }
            if (e.key === 'F9') { e.preventDefault(); handleFinalize('مدفوعة', true); }
            if (e.key === 'F2') { e.preventDefault(); handleFinalize('مستحقة', false); }
            if (e.key === 'F3') { e.preventDefault(); resetInvoice(); }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleFinalize, resetInvoice]);

    const handleItemUpdate = (index: number, field: 'quantity' | 'price' | 'discount' | 'unitId', value: string) => {
        setIsDirty(true);
        setItems(currentItems => {
            const newItems = [...currentItems];
            const item = {...newItems[index]};
            const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
            if (!inventoryItem) return newItems;

            if (field === 'unitId') {
                item.unitId = value;
                if (value === 'base') {
                    item.unitName = inventoryItem.baseUnit;
                    item.price = inventoryItem.salePrice;
                } else {
                    const packingUnit = inventoryItem.units.find((u: PackingUnit) => u.id === value);
                    if (packingUnit) {
                        item.unitName = packingUnit.name;
                        item.price = packingUnit.salePrice;
                    }
                }
            } else {
                 const numValue = parseFloat(value) || 0;
                 (item as any)[field] = numValue;
            }
            
            if (field === 'quantity' || field === 'unitId') {
                 let quantityInBaseUnit = item.quantity;
                 if (item.unitId !== 'base') {
                    const packingUnit = inventoryItem.units.find(u => u.id === item.unitId);
                    if(packingUnit) quantityInBaseUnit *= packingUnit.factor;
                 }
                 
                let availableStock = inventoryItem.stock;
                if (isEditMode) {
                    const originalSale = sales.find((s: Sale) => s.id === id);
                    const originalItem = originalSale?.items.find(i => i.itemId === item.itemId);
                    if (originalItem) {
                        let originalQuantityInBaseUnit = originalItem.quantity;
                        if (originalItem.unitId !== 'base') {
                            const packingUnit = inventoryItem.units.find(u => u.id === originalItem.unitId);
                            if(packingUnit) originalQuantityInBaseUnit *= packingUnit.factor;
                        }
                        availableStock += originalQuantityInBaseUnit;
                    }
                }
                 
                if (!generalSettings.allowNegativeStock && quantityInBaseUnit > availableStock) {
                    setItemErrors(prev => ({...prev, [item.itemId]: `المتاح: ${availableStock}`}));
                } else {
                    setItemErrors(prev => {
                        const newErrors = {...prev};
                        delete newErrors[item.itemId];
                        return newErrors;
                    });
                }
            }

            item.total = (item.quantity * item.price) - item.discount;
            newItems[index] = item;
            return newItems;
        });
    };

    const handleItemRemove = (index: number) => {
        setIsDirty(true);
        const itemToRemove = items[index];
        if (itemToRemove && itemInputRefs.current[itemToRemove.itemId]) {
            delete itemInputRefs.current[itemToRemove.itemId];
        }
        setItems(currentItems => currentItems.filter((_, i) => i !== index));
        if (itemToRemove) {
            setItemErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[itemToRemove.itemId];
                return newErrors;
            });
        }
    };

    const productSearchResults = useMemo(() => {
        if (productSearchTerm.length < 1) return [];
        const term = productSearchTerm.toLowerCase();
        return inventory.filter((p: InventoryItem) =>
            !p.isArchived && (p.name.toLowerCase().includes(term) || p.id.toLowerCase().includes(term) || p.barcode?.includes(term))
        ).slice(0, 5);
    }, [productSearchTerm, inventory]);

    const customerSearchResults = useMemo(() => {
        if (customerSearchTerm.length < 1) return [];
        const term = customerSearchTerm.toLowerCase();
        return customers.filter((c: Customer) => !c.isArchived && (c.name.toLowerCase().includes(term) || c.phone.includes(term))).slice(0, 5);
    }, [customerSearchTerm, customers]);

    useEffect(() => { setHighlightedProductIndex(-1); }, [productSearchTerm]);
    useEffect(() => { setHighlightedCustomerIndex(-1); }, [customerSearchTerm]);

    const handleProductSearchKeyDown = (e: React.KeyboardEvent) => {
        if (productSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedProductIndex(prev => (prev + 1) % productSearchResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedProductIndex(prev => (prev - 1 + productSearchResults.length) % productSearchResults.length);
        } else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedProductIndex > -1) {
            e.preventDefault();
            handleProductSelect(productSearchResults[highlightedProductIndex]);
        }
    };
    
    const handleCustomerSearchKeyDown = (e: React.KeyboardEvent) => {
        if (customerSearchResults.length === 0) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            setHighlightedCustomerIndex(prev => (prev + 1) % customerSearchResults.length);
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            setHighlightedCustomerIndex(prev => (prev - 1 + customerSearchResults.length) % customerSearchResults.length);
        } else if ((e.key === 'Enter' || e.key === 'Tab') && highlightedCustomerIndex > -1) {
            e.preventDefault();
            setCustomer(customerSearchResults[highlightedCustomerIndex]);
            setCustomerSearchTerm('');
            setIsDirty(true);
            setHighlightedCustomerIndex(-1);
            productSearchRef.current?.focus();
        }
    };
    
    const handleItemInputKeyDown = (e: React.KeyboardEvent, index: number, field: 'quantity' | 'unit' | 'price') => {
        const moveFocus = (targetIndex: number) => {
            if (targetIndex >= 0 && targetIndex < items.length) {
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
    };

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900/50 text-[--text] font-sans">
            <header className="flex-shrink-0 bg-[--panel] dark:bg-gray-800 shadow-sm p-3 flex flex-wrap justify-between items-center gap-4">
                <div className="flex items-center gap-4">
                    <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">{isEditMode ? 'تعديل فاتورة مبيعات' : 'فاتورة مبيعات جديدة'}</h1>
                    <span className="font-mono text-sm bg-gray-200 dark:bg-gray-700 px-2 py-1 rounded">{activeInvoice.id}</span>
                    <input type="date" value={activeInvoice.date || ''} onChange={e => {setActiveInvoice(p => ({...p, date: e.target.value})); setIsDirty(true);}} className="input-style w-36" />
                </div>
                <div className="flex-grow max-w-sm relative">
                    <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                    <input ref={customerSearchRef} type="text" placeholder="ابحث عن عميل... (Ctrl+K)" value={customerSearchTerm} onChange={(e) => setCustomerSearchTerm(e.target.value)} onKeyDown={handleCustomerSearchKeyDown} className="w-full bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg py-2 pr-10 pl-4 focus:ring-2 focus:ring-[--accent] outline-none" />
                    {customerSearchResults.length > 0 && (
                        <div className="absolute top-full right-0 left-0 bg-[--panel] dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-30">
                            {customerSearchResults.map((c, index) => (
                                <div key={c.id} onClick={() => { setCustomer(c); setCustomerSearchTerm(''); productSearchRef.current?.focus(); setIsDirty(true); }} className={`p-2 cursor-pointer ${index === highlightedCustomerIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}>{c.name} - {c.phone}</div>
                            ))}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {customer ? (
                        <div className="flex items-center gap-2 bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-200 p-2 rounded-lg">
                            <UsersIcon className="w-5 h-5" />
                            <span className="font-semibold">{customer.name}</span>
                            <button onClick={() => {setCustomer(null); setIsDirty(true);}} className="text-red-500 mr-1 text-lg font-bold">×</button>
                        </div>
                    ) : (
                        <button onClick={() => setAddCustomerModalOpen(true)} className="flex items-center gap-2 px-3 py-2 text-sm bg-gray-200 dark:bg-gray-700 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600"><PlusIcon className="w-4 h-4" /> عميل جديد</button>
                    )}
                </div>
            </header>

            <div className="flex-1 flex flex-col md:flex-row gap-4 p-4 overflow-hidden">
                <main className="w-full md:w-2/3 flex flex-col bg-[--panel] dark:bg-gray-800 rounded-lg shadow-[--shadow]">
                    <div className="p-3 border-b dark:border-gray-700 relative">
                        <MagnifyingGlassIcon className="w-5 h-5 text-gray-400 absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input ref={productSearchRef} type="text" placeholder="ابحث بالباركود أو اسم الصنف... (Ctrl+F)" value={productSearchTerm} onChange={(e) => setProductSearchTerm(e.target.value)} onKeyDown={handleProductSearchKeyDown} className="w-full text-lg bg-gray-100 dark:bg-gray-900 border-2 border-gray-200 dark:border-gray-700 rounded-lg p-3 pr-12 focus:ring-2 focus:ring-[--accent] outline-none" />
                        {productSearchResults.length > 0 && (
                            <div className="absolute top-full right-3 left-3 bg-[--panel] dark:bg-gray-800 shadow-lg rounded-b-lg border dark:border-gray-700 z-20">
                                {productSearchResults.map((p, index) => (
                                    <div key={p.id} onClick={() => handleProductSelect(p)} className={`p-3 flex justify-between cursor-pointer ${index === highlightedProductIndex ? 'bg-blue-100 dark:bg-gray-700' : 'hover:bg-gray-100 dark:hover:bg-gray-900'}`}><span>{p.name}</span><span className="text-sm text-gray-500">المتاح: {p.stock}</span></div>
                                ))}
                            </div>
                        )}
                    </div>
                    <div className="flex-1 overflow-y-auto">
                        <table className="w-full text-sm text-right table-auto">
                            <thead className="text-xs text-gray-700 uppercase bg-gray-50 dark:bg-gray-700/50 sticky top-0 z-10"><tr><th className="px-2 py-3 w-20">الكود</th><th className="px-2 py-3">الصنف</th><th className="px-2 py-3 w-28">الكمية</th><th className="px-2 py-3 w-32">الوحدة</th><th className="px-2 py-3 w-28">السعر</th><th className="px-2 py-3 w-28">الخصم</th><th className="px-2 py-3 w-32 text-left">الإجمالي</th><th className="px-2 py-3 w-12"></th></tr></thead>
                            <tbody>
                                {items.length === 0 && (<tr><td colSpan={8}><div className="flex flex-col items-center justify-center h-full text-gray-400 py-16"><BoxIcon className="w-16 h-16"/><p>لم تتم إضافة أي أصناف بعد</p></div></td></tr>)}
                                {items.map((item, index) => {
                                    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
                                    const unitOptions = inventoryItem ? [{ id: 'base', name: inventoryItem.baseUnit }, ...inventoryItem.units] : [];
                                    const error = itemErrors[item.itemId];
                                    return (
                                        <tr key={item.itemId + index} className="border-b dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-900/20">
                                            <td className="px-2 py-2 text-xs font-mono text-center">{item.itemId}</td><td className="px-2 py-2 font-semibold truncate">{item.itemName}</td>
                                            <td className="px-2 py-2">
                                                <input ref={el => { if(!itemInputRefs.current[item.itemId]) itemInputRefs.current[item.itemId] = { quantity: null, unit: null, price: null }; itemInputRefs.current[item.itemId].quantity = el; }} type="number" value={item.quantity} onChange={e => handleItemUpdate(index, 'quantity', e.target.value)} onKeyDown={(e) => handleItemInputKeyDown(e, index, 'quantity')} className={`input-style w-full text-center ${error ? 'border-red-500 ring-1 ring-red-500' : ''}`}/>
                                                {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                                            </td>
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
                        <button onClick={() => handleFinalize('مدفوعة', true)} disabled={isProcessing || Object.keys(itemErrors).length > 0} className="w-full text-xl font-bold p-4 bg-[--accent] text-white rounded-lg hover:opacity-90 disabled:opacity-50 disabled:cursor-wait">{isProcessing ? 'جاري الحفظ...' : (isEditMode ? 'حفظ التعديلات' : 'حفظ وطباعة (F9)')}</button>
                        <div className="grid grid-cols-2 gap-2">
                            <button onClick={() => handleFinalize('مستحقة', false)} disabled={isProcessing || Object.keys(itemErrors).length > 0} className="w-full text-md p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-wait">{isEditMode ? 'حفظ كـ مستحقة' : 'حفظ كمستحقة (F2)'}</button>
                            <button onClick={() => isEditMode ? navigate('/sales') : resetInvoice()} className="w-full text-md p-2 bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600">{isEditMode ? 'إلغاء' : 'فاتورة جديدة (F3)'}</button>
                        </div>
                    </div>
                </aside>
            </div>
            {isAddCustomerModalOpen && (<Modal isOpen={isAddCustomerModalOpen} onClose={() => setAddCustomerModalOpen(false)} title="إضافة عميل جديد"><AddCustomerForm onClose={() => setAddCustomerModalOpen(false)} onSuccess={(c) => { setCustomer(c); setAddCustomerModalOpen(false); setIsDirty(true); }} /></Modal>)}
            {saleToView && (<InvoiceView isOpen={!!saleToView} onClose={() => setSaleToView(null)} sale={saleToView} />)}
        </div>
    );
}

export default Sales;