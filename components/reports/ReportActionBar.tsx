import React from 'react';
import { PrinterIcon } from '../icons/PrinterIcon';
import { TableCellsIcon } from '../icons/TableCellsIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';

interface ActionBarProps {
    isTable: boolean;
    onExportPDF: () => void;
    onExportCSV: () => void;
}

const ReportActionBar: React.FC<ActionBarProps> = ({ onExportPDF, onExportCSV, isTable }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="no-print p-3 bg-gray-100 dark:bg-gray-800 border-t dark:border-gray-700 flex justify-center items-center gap-4 rounded-b-lg">
            <button 
                onClick={onExportPDF} 
                className="flex items-center gap-2 px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm"
            >
                <ArrowDownTrayIcon className="w-5 h-5" />
                <span>تصدير إلى PDF</span>
            </button>
            <button 
                onClick={handlePrint} 
                className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-200 border dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors shadow-sm"
            >
                <PrinterIcon className="w-5 h-5" />
                <span>طباعة التقرير</span>
            </button>
            {isTable && (
                 <button 
                    onClick={onExportCSV} 
                    className="flex items-center gap-2 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors shadow-sm"
                >
                    <TableCellsIcon className="w-5 h-5" />
                    <span>تصدير إلى CSV</span>
                </button>
            )}
        </div>
    );
};

export default ReportActionBar;