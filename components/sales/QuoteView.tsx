
import React, { useContext } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { PriceQuote } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';
import { PhotoIcon } from '../icons/PhotoIcon';

declare var jspdf: any;
declare var html2canvas: any;

interface QuoteViewProps {
  isOpen: boolean;
  onClose: () => void;
  quote: PriceQuote;
}

const QuoteView: React.FC<QuoteViewProps> = ({ isOpen, onClose, quote }) => {
  const { companyInfo, customers, printSettings } = useContext(DataContext);
  const customer = customers.find((c: any) => c.name === quote.customer);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-quote');
    if (input) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      html2canvas(input, { 
        scale: 2, 
        useCORS: true, 
        backgroundColor: isDarkMode ? '#111827' : '#ffffff' 
      })
      .then(canvas => {
          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgProps = pdf.getImageProperties(imgData);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`${quote.hidePrices ? 'بيان-كميات' : 'عرض-سعر'}-${quote.id}.pdf`);
        });
    }
  };

  const handleExportImage = () => {
    const input = document.getElementById('printable-quote');
    if (input) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      html2canvas(input, { scale: 2, useCORS: true, backgroundColor: isDarkMode ? '#111827' : '#ffffff' })
      .then(canvas => {
          const link = document.createElement('a');
          link.download = `${quote.hidePrices ? 'بيان-كميات' : 'عرض-سعر'}-${quote.id}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      });
    }
  };

  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
      {icon}<span>{label}</span>
    </button>
  );

  const isPriceHidden = !!quote.hidePrices;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`${isPriceHidden ? 'بيان كميات' : 'بيان أسعار'}: ${quote.id}`} size="4xl">
      <div className="no-print mb-6 flex flex-wrap gap-2 justify-end">
        <ActionButton icon={<PrinterIcon className="w-5 h-5" />} label="طباعة" onClick={handlePrint} />
        <ActionButton icon={<ArrowDownTrayIcon className="w-5 h-5" />} label="PDF" onClick={handleExportPDF} />
        <ActionButton icon={<PhotoIcon className="w-5 h-5 text-green-500" />} label="صورة" onClick={handleExportImage} />
      </div>

      <div id="printable-quote" className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg border">
        <header className="flex justify-between items-start pb-6 border-b-2 border-gray-800">
          <div>
            {printSettings.logo && <img src={printSettings.logo} alt="شعار الشركة" className="h-20 w-auto mb-4 object-contain"/>}
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{companyInfo.name}</h1>
            <p className="text-sm font-semibold">{companyInfo.address}</p>
            <p className="text-sm font-semibold">الهاتف: {companyInfo.phone}</p>
          </div>
          <div className="text-left">
            <h2 className={`text-3xl font-bold uppercase ${isPriceHidden ? 'text-gray-700 dark:text-gray-300' : 'text-blue-600'}`}>{isPriceHidden ? 'بيان كميات' : 'بيان أسعار'}</h2>
            <p className="font-bold text-lg">رقم: <span className="font-mono">{quote.id}</span></p>
            <p className="text-sm font-semibold">التاريخ: {new Date(quote.date).toLocaleDateString('ar-EG')}</p>
          </div>
        </header>

        <section className="my-8">
            <h3 className="text-xs font-bold text-gray-400 uppercase mb-2 tracking-widest">إلى السيد / السادة</h3>
            <p className="text-xl font-bold">{customer?.name || quote.customer || 'عميل عام / غير محدد'}</p>
            {customer && (
              <>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customer?.address}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">{customer?.phone}</p>
              </>
            )}
        </section>

        <section>
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-800 text-white">
                <th className="p-3 font-bold border border-gray-700 w-12 text-center">م</th>
                <th className="p-3 font-bold border border-gray-700">الصنف / البيان</th>
                {isPriceHidden ? (
                    <th className="p-3 font-bold border border-gray-700 text-center">الكمية والبيان</th>
                ) : (
                    <>
                        <th className="p-3 font-bold border border-gray-700 text-center">الكمية</th>
                        <th className="p-3 font-bold border border-gray-700 text-center">الوحدة</th>
                        <th className="p-3 font-bold border border-gray-700 text-center">سعر الوحدة</th>
                        <th className="p-3 font-bold border border-gray-700 text-left">الإجمالي</th>
                    </>
                )}
              </tr>
            </thead>
            <tbody>
              {quote.items.map((item, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="p-3 text-center border border-gray-200 dark:border-gray-700 font-mono text-xs">{index + 1}</td>
                  <td className="p-3 border border-gray-200 dark:border-gray-700 font-bold">{item.itemName}</td>
                  {isPriceHidden ? (
                      <td className="p-3 text-center border border-gray-200 dark:border-gray-700 font-bold text-lg bg-gray-50/50 dark:bg-gray-800/50">
                        {item.unitId === 'aggregated' ? item.unitName : `${item.quantity} ${item.unitName}`}
                      </td>
                  ) : (
                      <>
                        <td className="p-3 text-center border border-gray-200 dark:border-gray-700 font-bold text-lg">{item.quantity}</td>
                        <td className="p-3 text-center border border-gray-200 dark:border-gray-700">{item.unitName}</td>
                        <td className="p-3 text-center border border-gray-200 dark:border-gray-700 font-mono">{item.price.toLocaleString()}</td>
                        <td className="p-3 text-left border border-gray-200 dark:border-gray-700 font-bold font-mono">{item.total.toLocaleString()}</td>
                      </>
                  )}
                </tr>
              ))}
            </tbody>
            {!isPriceHidden && (
                <tfoot>
                    <tr className="font-bold text-xl bg-gray-50 dark:bg-gray-800">
                        <td colSpan={4} className="p-4 text-left border border-gray-200 dark:border-gray-700">الإجمالي النهائي</td>
                        <td colSpan={2} className="p-4 text-left border border-gray-200 dark:border-gray-700 text-blue-600 dark:text-blue-400 font-mono">{quote.total.toLocaleString()} جنيه</td>
                    </tr>
                </tfoot>
            )}
          </table>
        </section>

        <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-16 pt-6 border-t border-dotted dark:border-gray-700">
           <p className="font-bold mb-2">{isPriceHidden ? 'هذا البيان للأصناف والكميات المطلوبة فقط ولا يترتب عليه أي التزامات مالية.' : 'هذا بيان أسعار مبدئي وليس فاتورة رسمية. الأسعار صالحة لمدة محدودة.'}</p>
           <p>{companyInfo.name} - {companyInfo.phone}</p>
        </footer>
      </div>
    </Modal>
  );
};

export default QuoteView;
