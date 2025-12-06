
import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { PlusIcon, TrashIcon, PrinterIcon, ArrowPathIcon } from '../icons';

interface PriceListRow {
    id: number;
    name: string;
    unit: string;
    price: string;
}

const PriceListBuilder: React.FC = () => {
    const { companyInfo, printSettings } = useContext(DataContext);
    
    // Initialize state from localStorage or default to 15 empty rows
    const [rows, setRows] = useState<PriceListRow[]>(() => {
        const savedRows = localStorage.getItem('manualPriceListRows');
        if (savedRows) {
            try {
                return JSON.parse(savedRows);
            } catch (e) {
                console.error("Failed to parse saved price list", e);
            }
        }
        // Default initial state
        return Array.from({ length: 15 }, (_, i) => ({
            id: Date.now() + i,
            name: '',
            unit: '',
            price: ''
        }));
    });

    // Save to localStorage whenever rows change
    useEffect(() => {
        localStorage.setItem('manualPriceListRows', JSON.stringify(rows));
    }, [rows]);

    const addRow = () => {
        setRows([...rows, { id: Date.now(), name: '', unit: '', price: '' }]);
    };

    const removeRow = (id: number) => {
        setRows(rows.filter(r => r.id !== id));
    };

    const updateRow = (id: number, field: keyof PriceListRow, value: string) => {
        setRows(rows.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handlePrint = () => {
        window.print();
    };

    const clearTable = () => {
        if(window.confirm('هل أنت متأكد من مسح جميع البيانات في الجدول؟')) {
             // Reset to 15 empty rows
             setRows(
                Array.from({ length: 15 }, (_, i) => ({
                    id: Date.now() + i,
                    name: '',
                    unit: '',
                    price: ''
                }))
             );
        }
    }

    return (
        <div className="p-4 md:p-8 max-w-5xl mx-auto min-h-screen bg-gray-50 dark:bg-gray-900 font-sans">
            {/* Controls - Hidden on Print */}
            <div className="no-print flex flex-wrap justify-between items-center mb-6 bg-white dark:bg-gray-800 p-4 rounded-lg shadow border dark:border-gray-700">
                <h1 className="text-xl font-bold text-gray-800 dark:text-gray-100">منشئ قوائم الأسعار (يدوي)</h1>
                <div className="flex gap-3 mt-2 sm:mt-0">
                    <button onClick={addRow} className="flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 font-semibold transition-colors">
                        <PlusIcon className="w-5 h-5"/> إضافة سطر
                    </button>
                    <button onClick={clearTable} className="flex items-center gap-2 px-4 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 font-semibold transition-colors">
                        <ArrowPathIcon className="w-5 h-5"/> تفريغ
                    </button>
                    <button onClick={handlePrint} className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 shadow font-semibold transition-colors">
                        <PrinterIcon className="w-5 h-5"/> طباعة
                    </button>
                </div>
            </div>

            {/* Printable Sheet */}
            <div id="price-list-sheet" className="bg-white text-black p-8 shadow-lg mx-auto print:shadow-none print:p-0 print:w-full print:mx-0 max-w-[210mm] min-h-[297mm]">
                <style>
                    {`
                        @media print {
                            @page { margin: 10mm; size: A4; }
                            body { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                            .no-print { display: none !important; }
                            #price-list-sheet { box-shadow: none; margin: 0; width: 100%; max-width: none; }
                            input { border: none !important; background: transparent !important; }
                            /* Hide placeholder text on print */
                            input::placeholder { color: transparent; }
                        }
                    `}
                </style>

                {/* Header */}
                <div className="text-center mb-8 border-b-2 border-gray-800 pb-6">
                    {printSettings.logo && (
                        <div className="flex justify-center mb-4">
                            {/* Increased height from h-24 to h-48 for larger visibility */}
                            <img src={printSettings.logo} alt="Logo" className="h-48 object-contain" />
                        </div>
                    )}
                    <h1 className="text-3xl font-bold mb-2">{companyInfo.name}</h1>
                    <div className="inline-block px-8 py-2 mt-2 border-2 border-black rounded-lg">
                        <h2 className="text-xl font-bold uppercase tracking-widest">قائمة أسعار</h2>
                    </div>
                    <div className="flex justify-between mt-6 text-sm font-semibold px-4">
                        <p>التاريخ: {new Date().toLocaleDateString('ar-EG')}</p>
                        {companyInfo.phone && <p>الهاتف: {companyInfo.phone}</p>}
                    </div>
                </div>

                {/* Table */}
                <table className="w-full border-collapse border border-gray-900 text-right" dir="rtl">
                    <thead>
                        <tr className="bg-gray-100 print:bg-gray-200 text-gray-900">
                            <th className="border border-gray-900 p-3 w-16 text-center font-bold">م</th>
                            <th className="border border-gray-900 p-3 font-bold">الصنف / البيان</th>
                            <th className="border border-gray-900 p-3 w-32 text-center font-bold">الوحدة / العبوة</th>
                            <th className="border border-gray-900 p-3 w-32 text-center font-bold">السعر</th>
                            <th className="border border-gray-900 p-3 w-12 no-print bg-white border-none"></th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row, index) => (
                            <tr key={row.id}>
                                <td className="border border-gray-900 p-2 text-center font-mono">{index + 1}</td>
                                <td className="border border-gray-900 p-0">
                                    <input 
                                        type="text" 
                                        value={row.name} 
                                        onChange={(e) => updateRow(row.id, 'name', e.target.value)}
                                        className="w-full h-full p-2 px-3 outline-none bg-transparent print:placeholder-transparent text-right"
                                        placeholder="اسم الصنف..."
                                    />
                                </td>
                                <td className="border border-gray-900 p-0">
                                    <input 
                                        type="text" 
                                        value={row.unit} 
                                        onChange={(e) => updateRow(row.id, 'unit', e.target.value)}
                                        className="w-full h-full p-2 text-center outline-none bg-transparent print:placeholder-transparent"
                                        placeholder="-"
                                    />
                                </td>
                                <td className="border border-gray-900 p-0">
                                    <input 
                                        type="text" 
                                        value={row.price} 
                                        onChange={(e) => updateRow(row.id, 'price', e.target.value)}
                                        className="w-full h-full p-2 text-center outline-none bg-transparent font-bold font-mono print:placeholder-transparent"
                                        placeholder="0.00"
                                    />
                                </td>
                                <td className="p-2 text-center no-print border-none">
                                    <button onClick={() => removeRow(row.id)} className="text-gray-400 hover:text-red-500 transition-colors" title="حذف السطر">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>

                {/* Footer */}
                <div className="mt-12 text-center text-sm text-gray-600 print:fixed print:bottom-0 print:left-0 print:right-0 print:p-4 bg-white">
                    <p className="border-t pt-4">{companyInfo.address}</p>
                </div>
            </div>
        </div>
    );
};

export default PriceListBuilder;
