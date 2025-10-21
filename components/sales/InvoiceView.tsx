import React, { useContext } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { Sale, InvoiceComponentType } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';
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

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-invoice');
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
          pdf.save(`فاتورة-${sale.id}.pdf`);
        });
    }
  };

  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
      {icon}<span>{label}</span>
    </button>
  );
  
  const componentProps = {
      sale,
      customer,
      companyInfo,
      printSettings
  };

  const staticHeaderComponents: InvoiceComponentType[] = ['logo', 'companyInfo', 'billTo', 'invoiceMeta', 'invoiceTitle'];

  const invoiceContent = (
      <div id="printable-invoice" className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg">
         <style>
          {`
            :root {
              --invoice-primary-color: ${printSettings.primaryColor};
              --invoice-secondary-color: ${printSettings.secondaryColor};
            }
          `}
        </style>

        <header className="flex justify-between items-start pb-6 border-b dark:border-gray-600">
            <div className="flex-1">
                {printSettings.visibility.logo !== false && <LogoElement {...componentProps} />}
                {printSettings.visibility.companyInfo !== false && <CompanyInfoElement {...componentProps} />}
            </div>
            
            <div className="flex-1 flex flex-col justify-start items-center text-center pt-2">
                {printSettings.visibility.invoiceTitle !== false && (
                    <h2 
                        style={{ fontSize: printSettings.fontSizes.invoiceTitle, color: printSettings.secondaryColor }} 
                        className="font-bold uppercase"
                    >
                        {printSettings.text.invoiceTitle}
                    </h2>
                )}
                <p className="font-medium font-mono text-sm mt-1">{sale.id}</p>
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
                if (!Component || printSettings.visibility[componentId] === false) {
                    return null;
                }
                return <Component key={componentId} {...componentProps} />;
            })}
        </div>
      </div>
  );

  if (isPrintView) {
    return invoiceContent;
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل الفاتورة: ${sale.id}`} size="4xl">
      {!customSettings && (
        <div className="no-print mb-6 flex flex-wrap gap-2 justify-end">
          <ActionButton icon={<PrinterIcon className="w-5 h-5" />} label="طباعة" onClick={handlePrint} />
          <ActionButton icon={<ArrowDownTrayIcon className="w-5 h-5" />} label="تصدير PDF" onClick={handleExportPDF} />
        </div>
      )}
      {invoiceContent}
    </Modal>
  );
};

export default InvoiceView;