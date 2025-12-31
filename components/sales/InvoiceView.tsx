import React, { useContext, useEffect, useRef, useState } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { Sale, InvoiceComponentType } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';
import { PhotoIcon } from '../icons/PhotoIcon';
import BillToElement from '../invoice-elements/BillToElement';
import CompanyInfoElement from '../invoice-elements/CompanyInfoElement';
import FooterTextElement from '../invoice-elements/FooterTextElement';
import InvoiceMetaElement from '../invoice-elements/InvoiceMetaElement';
import ItemsTableElement from '../invoice-elements/ItemsTableElement';
import LogoElement from '../invoice-elements/LogoElement';
import SpacerElement from '../invoice-elements/SpacerElement';
import SummaryElement from '../invoice-elements/SummaryElement';

declare var jspdf: any;
declare var html2canvas: any;

interface InvoiceViewProps {
  isOpen: boolean;
  onClose: () => void;
  sale: Sale;
  customSettings?: any;
  isPrintView?: boolean;
}

const componentMap: { [key: string]: React.FC<any> } = {
    logo: LogoElement,
    companyInfo: CompanyInfoElement,
    billTo: BillToElement,
    invoiceMeta: InvoiceMetaElement,
    itemsTable: ItemsTableElement,
    summary: SummaryElement,
    footerText: FooterTextElement,
    spacer: SpacerElement,
};

const InvoiceView: React.FC<InvoiceViewProps> = ({ isOpen, onClose, sale, customSettings, isPrintView = false }) => {
  const context = useContext(DataContext);
  const { companyInfo, customers } = context;
  const printSettings = customSettings || context.printSettings;
  const customer = customers.find((c: any) => c.name === sale.customer);
  
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen && !isPrintView) {
      const updateScale = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.parentElement?.clientWidth || 0;
          const invoiceWidth = 800; 
          if (containerWidth < invoiceWidth && containerWidth > 0) {
            const newScale = (containerWidth - 40) / invoiceWidth;
            setScale(newScale);
          } else {
            setScale(1);
          }
        }
      };
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [isOpen, isPrintView]);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-invoice');
    if (input) {
      // فرض العرض للالتقاط
      const originalWidth = input.style.width;
      input.style.width = '800px';

      html2canvas(input, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        windowWidth: 800,
        height: input.scrollHeight,
        scrollY: 0
      })
      .then(canvas => {
          input.style.width = originalWidth;
          const imgData = canvas.toDataURL('image/jpeg', 0.9);
          const pdf = new jspdf.jsPDF('p', 'pt', 'a4');
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const pdfHeight = pdf.internal.pageSize.getHeight();
          const imgWidth = canvas.width;
          const imgHeight = canvas.height;
          const ratio = pdfWidth / imgWidth;
          const imgHeightInPt = imgHeight * ratio;
          
          let heightLeft = imgHeightInPt;
          let position = 0;

          // إضافة الصفحة الأولى
          pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPt);
          heightLeft -= pdfHeight;

          // إضافة الصفحات التالية إذا كانت الفاتورة طويلة
          while (heightLeft > 0) {
              position = heightLeft - imgHeightInPt;
              pdf.addPage();
              pdf.addImage(imgData, 'JPEG', 0, position, pdfWidth, imgHeightInPt);
              heightLeft -= pdfHeight;
          }
          
          pdf.save(`فاتورة-${sale.id}.pdf`);
        });
    }
  };

  const handleExportImage = () => {
    const input = document.getElementById('printable-invoice');
    if (input) {
      html2canvas(input, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        windowWidth: 800
      })
      .then(canvas => {
          const link = document.createElement('a');
          link.download = `فاتورة-${sale.id}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      });
    }
  };

  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-2 space-x-reverse px-3 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200">
      {icon}<span className="hidden xs:inline">{label}</span>
    </button>
  );
  
  const componentProps = { sale, customer, companyInfo, printSettings };
  const staticHeaderComponents: InvoiceComponentType[] = ['logo', 'companyInfo', 'billTo', 'invoiceMeta', 'invoiceTitle'];

  const invoiceContent = (
      <div 
        ref={containerRef}
        id="printable-invoice" 
        style={{ 
            width: isPrintView ? '100%' : '800px',
            transform: !isPrintView && scale < 1 ? `scale(${scale})` : 'none',
            margin: !isPrintView && scale < 1 ? '0 auto' : '0 auto'
        }}
        className="p-6 sm:p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg invoice-scaler"
      >
         <style>{`
            :root { --invoice-primary-color: ${printSettings.primaryColor}; --invoice-secondary-color: ${printSettings.secondaryColor}; }
            #printable-invoice td, #printable-invoice th { padding: 8px 12px; }
            @media print {
               #printable-invoice td, #printable-invoice th { padding: 4px 6px !important; }
            }
         `}</style>

        <header className="flex justify-between items-start pb-6 border-b dark:border-gray-600">
            <div className="flex-1">
                {printSettings.visibility.logo !== false && <LogoElement {...componentProps} />}
                {printSettings.visibility.companyInfo !== false && <CompanyInfoElement {...componentProps} />}
            </div>
            
            <div className="flex-1 flex flex-col justify-start items-center text-center pt-2 px-2">
                {printSettings.visibility.invoiceTitle !== false && (
                    <h2 style={{ fontSize: printSettings.fontSizes.invoiceTitle, color: printSettings.secondaryColor }} className="font-bold uppercase tracking-tight">
                        {printSettings.text.invoiceTitle}
                    </h2>
                )}
                <p className="font-bold font-mono text-sm mt-1 bg-gray-100 dark:bg-gray-800 px-2 py-0.5 rounded">{sale.id}</p>
            </div>

            <div className="flex-1 text-left">
                {printSettings.visibility.billTo !== false && <BillToElement {...componentProps} />}
                {printSettings.visibility.invoiceMeta !== false && <InvoiceMetaElement {...componentProps} />}
            </div>
        </header>

        <div className="mt-6">
            {printSettings.layout
                .filter((componentId: InvoiceComponentType) => !staticHeaderComponents.includes(componentId))
                .map((componentId: any) => {
                const Component = componentMap[componentId];
                if (!Component || printSettings.visibility[componentId] === false) return null;
                return <Component key={componentId} {...componentProps} />;
            })}
        </div>
      </div>
  );

  if (isPrintView) return invoiceContent;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`معاينة: ${sale.id}`} size="4xl">
      <div className="no-print mb-4 flex flex-wrap gap-2 justify-end sticky top-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm z-10 py-2 border-b dark:border-gray-700">
        <ActionButton icon={<PrinterIcon className="w-4 h-4 sm:w-5 h-5" />} label="طباعة" onClick={handlePrint} />
        <ActionButton icon={<ArrowDownTrayIcon className="w-4 h-4 sm:w-5 h-5" />} label="PDF" onClick={handleExportPDF} />
        <ActionButton icon={<PhotoIcon className="w-4 h-4 sm:w-5 h-5 text-green-500" />} label="صورة" onClick={handleExportImage} />
      </div>
      <div className="invoice-preview-container flex justify-center overflow-visible py-4" style={{ height: scale < 1 ? `${1150 * scale}px` : 'auto' }}>
        {invoiceContent}
      </div>
    </Modal>
  );
};

export default InvoiceView;