

import React, { useState, useContext, useRef, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { PrintSettings, Sale, InvoiceComponentType } from '../../types';
import InvoiceView from '../sales/InvoiceView';
import { TrashIcon } from '../icons';

// Sample sale for the preview functionality
const sampleSaleForPreview: Sale = { 
    id: 'PREVIEW-001', 
    customer: 'عميل افتراضي', 
    date: new Date().toISOString().slice(0, 10),
    items: [
        { itemId: 'ITM001', itemName: 'منتج افتراضي 1', unitId: 'base', unitName: 'قطعة', quantity: 2, price: 150.00, discount: 0, total: 300.00 },
        { itemId: 'ITM002', itemName: 'منتج افتراضي 2', unitId: 'base', unitName: 'وحدة', quantity: 1, price: 450.50, discount: 0, total: 450.50 },
    ],
    subtotal: 750.50,
    totalDiscount: 0,
    total: 750.50,
    status: 'مدفوعة'
};

const DraggableItem: React.FC<{ item: any, index: number, onDragStart: any, onDragEnter: any, onDragEnd: any, onToggle: any }> = ({ item, index, onDragStart, onDragEnter, onDragEnd, onToggle }) => (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragEnter={(e) => onDragEnter(e, index)}
      onDragEnd={onDragEnd}
      className="p-2 my-1 flex items-center justify-between bg-white dark:bg-gray-700 rounded-md border dark:border-gray-600 cursor-grab"
    >
      <span>{item.name}</span>
      <input type="checkbox" checked={item.enabled} onChange={() => onToggle(item.id)} className="form-checkbox h-5 w-5 text-blue-600" />
    </div>
);


const InvoiceCustomizer: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const { printSettings, updatePrintSettings, showToast } = useContext(DataContext);
    const [settings, setSettings] = useState<PrintSettings>(printSettings);

    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    const availableComponents: { id: InvoiceComponentType; name: string }[] = [
        { id: 'spacer', name: 'فاصل' },
        { id: 'itemsTable', name: 'جدول الأصناف' },
        { id: 'summary', name: 'الملخص المالي' },
        { id: 'footerText', name: 'تذييل الفاتورة' },
    ];

    const [layoutItems, setLayoutItems] = useState(() => {
        // Ensure all available components are in the list, preserving order and enabled status
        const layoutOrder = settings.layout;
        const allComponents = availableComponents.map(comp => ({
            ...comp,
            enabled: layoutOrder.includes(comp.id)
        }));
        
        // Sort them according to the saved layout, putting new/un-ordered items at the end
        allComponents.sort((a, b) => {
            const indexA = layoutOrder.indexOf(a.id);
            const indexB = layoutOrder.indexOf(b.id);
            if (indexA === -1 && indexB === -1) return 0;
            if (indexA === -1) return 1;
            if (indexB === -1) return -1;
            return indexA - indexB;
        });

        return allComponents;
    });

    useEffect(() => {
        // Update the main settings layout whenever the draggable list changes
        const newOrderedLayout = layoutItems.map(item => item.id);
        const newVisibility = layoutItems.reduce((acc, item) => {
            acc[item.id] = item.enabled;
            return acc;
        }, {} as { [key in InvoiceComponentType]?: boolean });

        setSettings(prev => ({
            ...prev,
            layout: newOrderedLayout,
            visibility: { ...prev.visibility, ...newVisibility }
        }));
    }, [layoutItems]);

    const handleDragStart = (e: React.DragEvent, index: number) => {
        dragItem.current = index;
    };
    const handleDragEnter = (e: React.DragEvent, index: number) => {
        dragOverItem.current = index;
    };
    const handleDragEnd = () => {
        if (dragItem.current !== null && dragOverItem.current !== null && dragItem.current !== dragOverItem.current) {
            const newLayoutItems = [...layoutItems];
            const draggedItemContent = newLayoutItems.splice(dragItem.current, 1)[0];
            newLayoutItems.splice(dragOverItem.current, 0, draggedItemContent);
            setLayoutItems(newLayoutItems);
        }
        dragItem.current = null;
        dragOverItem.current = null;
    };
    const handleToggleComponent = (id: InvoiceComponentType) => {
        setLayoutItems(prev => prev.map(item => item.id === id ? { ...item, enabled: !item.enabled } : item));
    };

    const handleSettingsChange = (section: 'text' | 'fontSizes' | 'visibility', field: string, value: any) => {
        setSettings(prev => ({
            ...prev,
            [section]: {
                // @ts-ignore
                ...prev[section],
                [field]: value
            }
        }));
    };
    
    const handleColumnChange = (id: string, field: 'label' | 'enabled', value: any) => {
        setSettings(prev => ({
            ...prev,
            itemsTableColumns: prev.itemsTableColumns.map(col => col.id === id ? {...col, [field]: value} : col)
        }))
    };

    const handleSave = () => {
        updatePrintSettings(settings);
        showToast('تم حفظ تصميم الفاتورة بنجاح.');
        onClose();
    };

    return (
        <div className="flex flex-col md:flex-row h-full max-h-[85vh] gap-6">
            {/* Preview Pane */}
            <div className="md:w-1/2 h-full overflow-y-auto bg-gray-100 dark:bg-gray-900 p-4 rounded-lg border dark:border-gray-700">
                <div className="transform scale-90 origin-top">
                     <InvoiceView isOpen={true} onClose={() => {}} sale={sampleSaleForPreview} customSettings={settings} />
                </div>
            </div>

            {/* Controls Pane */}
            <div className="md:w-1/2 h-full overflow-y-auto pr-2 space-y-4">
                 {/* Visuals */}
                <details className="space-y-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg" open>
                    <summary className="font-semibold cursor-pointer">المظهر العام</summary>
                    <div className="grid grid-cols-2 gap-4 pt-2">
                        <div>
                            <label className="text-sm">اللون الأساسي</label>
                            <input type="color" value={settings.primaryColor} onChange={e => setSettings(p => ({...p, primaryColor: e.target.value}))} className="w-full h-10 p-1 border-none rounded-md" />
                        </div>
                        <div>
                            <label className="text-sm">اللون الثانوي</label>
                            <input type="color" value={settings.secondaryColor} onChange={e => setSettings(p => ({...p, secondaryColor: e.target.value}))} className="w-full h-10 p-1 border-none rounded-md" />
                        </div>
                    </div>
                </details>
                
                 {/* Text Content */}
                <details className="space-y-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <summary className="font-semibold cursor-pointer">محتوى النصوص</summary>
                    <div className="pt-2 space-y-3">
                         <div>
                            <label className="text-sm">عنوان الفاتورة</label>
                            <input type="text" value={settings.text.invoiceTitle} onChange={e => handleSettingsChange('text', 'invoiceTitle', e.target.value)} className="input-style w-full"/>
                        </div>
                        <div>
                            <label className="text-sm">نص التذييل</label>
                            <textarea value={settings.text.footerText} onChange={e => handleSettingsChange('text', 'footerText', e.target.value)} className="input-style w-full" rows={2}/>
                        </div>
                    </div>
                </details>

                {/* Layout & Structure */}
                <details className="space-y-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <summary className="font-semibold cursor-pointer">ترتيب وهيكل جسم الفاتورة</summary>
                     <p className="text-xs text-gray-500">اسحب وأفلت لترتيب المكونات. ألغِ التحديد لإخفاء مكون.</p>
                     <div>
                        {layoutItems.map((item, index) => (
                            <DraggableItem key={item.id} item={item} index={index} onDragStart={handleDragStart} onDragEnter={handleDragEnter} onDragEnd={handleDragEnd} onToggle={handleToggleComponent} />
                        ))}
                     </div>
                </details>

                {/* Table Columns */}
                 <details className="space-y-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <summary className="font-semibold cursor-pointer">أعمدة جدول المنتجات</summary>
                     {settings.itemsTableColumns.map(col => (
                         <div key={col.id} className="flex items-center gap-2">
                             <input type="checkbox" checked={col.enabled} onChange={e => handleColumnChange(col.id, 'enabled', e.target.checked)} />
                             <input type="text" value={col.label} onChange={e => handleColumnChange(col.id, 'label', e.target.value)} className="input-style w-full text-sm"/>
                         </div>
                     ))}
                </details>
                
                 {/* General Info */}
                <details className="space-y-4 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
                    <summary className="font-semibold cursor-pointer">معلومات عامة وشعار</summary>
                    <div className="pt-2 space-y-3">
                         <div>
                            <label className="text-sm">الرقم الضريبي</label>
                            <input type="text" value={settings.taxId} onChange={e => setSettings(p => ({...p, taxId: e.target.value}))} className="input-style w-full"/>
                        </div>
                        <div>
                            <label className="text-sm">رقم السجل التجاري</label>
                            <input type="text" value={settings.commercialRegNo} onChange={e => setSettings(p => ({...p, commercialRegNo: e.target.value}))} className="input-style w-full"/>
                        </div>
                        <div>
                            <label className="text-sm">حجم الشعار</label>
                             <input type="range" min="30" max="200" value={settings.logoSize} onChange={e => setSettings(p => ({...p, logoSize: Number(e.target.value)}))} className="w-full" />
                        </div>
                        <div>
                            <label className="text-sm">محاذاة الشعار</label>
                            <select value={settings.logoAlignment} onChange={e => setSettings(p => ({...p, logoAlignment: e.target.value as any}))} className="input-style w-full">
                                <option value="flex-start">يمين</option>
                                <option value="center">وسط</option>
                                <option value="flex-end">يسار</option>
                            </select>
                        </div>
                    </div>
                </details>

            </div>

             {/* Actions */}
            <div className="md:col-span-2 flex justify-end gap-2 p-3 border-t dark:border-gray-700">
              <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
              <button type="button" onClick={handleSave} className="btn-primary">حفظ التصميم</button>
            </div>
        </div>
    );
};

export default InvoiceCustomizer;