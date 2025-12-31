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
            html2canvas(input, { 
                scale: 2, 
                useCORS: true, 
                backgroundColor: '#ffffff' 
            })
            .then(canvas => {
                const imgData = canvas.toDataURL('image/jpeg', 1.0);
                const pdf = new jspdf.jsPDF('p', 'pt', 'a4');
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();
                const imgWidth = canvas.width;
                const imgHeight = canvas.height;
                const ratio = pdfWidth / imgWidth;
                const imgHeightInPt = imgHeight * ratio;
                
                let heightLeft = imgHeightInPt;
                let position = 0;

                pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPt);
                heightLeft -= pdfHeight;

                while (heightLeft > 0) {
                    position -= pdfHeight;
                    pdf.addPage();
                    pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPt);
                    heightLeft -= pdfHeight;
                }
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