import React, { useState, useContext, useMemo, useRef, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import DataTable from '../shared/DataTable';
import { InventoryItem } from '../../types';
import { MagnifyingGlassIcon } from '../icons/MagnifyingGlassIcon';
import { PrinterIcon } from '../icons/PrinterIcon';

const BarcodeTools: React.FC = () => {
    const { inventory, updateItem, showToast } = useContext(DataContext);
    
    const [scannedBarcode, setScannedBarcode] = useState('');
    const [selectedItemId, setSelectedItemId] = useState('');
    const [itemSearch, setItemSearch] = useState('');
    const barcodeInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        barcodeInputRef.current?.focus();
    }, []);

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
    
    const handlePrint = (item: InventoryItem) => {
        if (item.barcode) {
            window.open(`/#/print/barcode/${item.id}`, '_blank');
        } else {
            showToast('لا يوجد باركود مسجل لهذا الصنف.', 'warning');
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
        { header: 'كود الصنف', accessor: 'id', sortable: true },
        { header: 'اسم الصنف', accessor: 'name', sortable: true },
        { header: 'الباركود', accessor: 'barcode', render: (row: InventoryItem) => row.barcode || <span className="text-gray-400">-- غير محدد --</span>, sortable: true },
        { 
            header: 'طباعة',
            accessor: 'print',
            render: (row: InventoryItem) => (
                <button 
                    onClick={() => handlePrint(row)} 
                    disabled={!row.barcode}
                    className="p-2 text-gray-400 hover:text-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                    title={row.barcode ? "طباعة ملصق الباركود" : "لا يوجد باركود"}
                >
                    <PrinterIcon className="w-5 h-5"/>
                </button>
            )
        }
    ], []);

    return (
        <div className="space-y-6">
            <PageHeader title="أدوات الباركود" buttonText="" />
            
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

            <DataTable
                columns={columns}
                data={inventory}
                searchableColumns={['id', 'name', 'barcode']}
            />
        </div>
    );
};

export default BarcodeTools;