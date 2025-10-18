

import React from 'react';
import { PrinterIcon } from '../icons/PrinterIcon';
import { TableCellsIcon } from '../icons/TableCellsIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';

declare var jspdf: any;
declare var html2canvas: any;
declare var XLSX: any;

interface ReportToolbarProps {
  reportName: string;
  data: any[];
  columns: { header: string; accessor: string; render?: (row: any) => string | number | React.ReactNode }[];
}

const ReportToolbar: React.FC<ReportToolbarProps> = ({ reportName, data, columns }) => {
    
    const onExportPDF = () => {
        const input = document.getElementById('printable-report');
        if (input) {
            const isDarkMode = document.documentElement.classList.contains('dark');
            html2canvas(input, { scale: 2, useCORS: true, backgroundColor: isDarkMode ? '#111827' : '#ffffff' })
                .then(canvas => {
                    const imgData = canvas.toDataURL('image/png');
                    const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
                    const pdfWidth = pdf.internal.pageSize.getWidth();
                    const imgProps = pdf.getImageProperties(imgData);
                    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
                    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
                    pdf.save(`${reportName}.pdf`);
                });
        }
    };

    const onExportCSV = () => {
        if (!data || !columns || data.length === 0) {
            alert('لا توجد بيانات لتصديرها.');
            return;
        }

        const headers = columns.map(col => col.header).join(',');
        const rows = data.map(row => {
            return columns.map(col => {
                let value: any = col.render ? col.render(row) : row[col.accessor];
                // FIX: Check if the value is a valid React element before trying to access its props.
                if (typeof value === 'object' && value !== null && React.isValidElement(value)) {
                    // FIX: Cast value.props to a type that includes children to resolve TS error.
                    value = ((value.props as { children?: React.ReactNode }).children || '').toString();
                }
                
                if (typeof value === 'string') {
                    value = value.replace(/<[^>]*>?/gm, '').replace(/,/g, '');
                } else if (value === undefined || value === null) {
                    value = '';
                }
                
                return `"${value}"`;
            }).join(',');
        });

        const csvContent = "data:text/csv;charset=utf-8,\uFEFF" + [headers, ...rows].join('\n');
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `${reportName}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="no-print flex items-center gap-2">
            <button onClick={onExportPDF} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="تصدير PDF">
                <ArrowDownTrayIcon className="w-5 h-5 text-red-500" />
            </button>
            <button onClick={onExportCSV} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="تصدير CSV">
                <TableCellsIcon className="w-5 h-5 text-green-500" />
            </button>
            <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="طباعة">
                <PrinterIcon className="w-5 h-5 text-blue-500" />
            </button>
        </div>
    );
};

export default ReportToolbar;