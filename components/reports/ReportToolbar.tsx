import React from 'react';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';

declare var jspdf: any;
declare var html2canvas: any;

interface ReportToolbarProps {
  reportName: string;
}

const ReportToolbar: React.FC<ReportToolbarProps> = ({ reportName }) => {
    
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
    
    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="no-print flex items-center gap-2">
            <button onClick={onExportPDF} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="تصدير PDF">
                <ArrowDownTrayIcon className="w-5 h-5 text-red-500" />
            </button>
            <button onClick={handlePrint} className="p-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200" title="طباعة">
                <PrinterIcon className="w-5 h-5 text-blue-500" />
            </button>
        </div>
    );
};

export default ReportToolbar;
