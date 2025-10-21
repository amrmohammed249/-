import React, { useContext } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { PurchaseReturn } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';

declare var jspdf: any;
declare var html2canvas: any;

interface PurchaseReturnViewProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseReturn: PurchaseReturn;
}

const PurchaseReturnView: React.FC<PurchaseReturnViewProps> = ({ isOpen, onClose, purchaseReturn }) => {
  const { companyInfo, suppliers, printSettings } = useContext(DataContext);
  const supplier = suppliers.find(s => s.name === purchaseReturn.supplier);

  const grandTotal = purchaseReturn.items.reduce((sum, item) => sum + item.total, 0);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-purchase-return');
    if (input) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`إشعار-مدين-${purchaseReturn.id}.pdf`);
      });
    }
  };

  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
      {icon}<span>{label}</span>
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل مرتجع المشتريات: ${purchaseReturn.id}`} size="4xl">
      <div className="no-print mb-6 flex flex-wrap gap-2 justify-end">
        <ActionButton icon={<PrinterIcon className="w-5 h-5" />} label="طباعة" onClick={handlePrint} />
        <ActionButton icon={<ArrowDownTrayIcon className="w-5 h-5" />} label="تصدير PDF" onClick={handleExportPDF} />
      </div>

      <div id="printable-purchase-return" className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg">
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            {printSettings.logo && <img src={printSettings.logo} alt="شعار الشركة" className="h-20 w-auto mb-4 object-contain"/>}
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{companyInfo.name}</h1>
            <p className="text-sm">{companyInfo.address}</p>
            <p className="text-sm">{companyInfo.phone}</p>
          </div>
          <div className="text-left">
            <h2 className="text-3xl font-bold uppercase text-blue-500">إشعار مدين</h2>
            <p className="text-sm">رقم: <span className="font-mono">{purchaseReturn.id}</span></p>
             {purchaseReturn.originalPurchaseId && <p className="text-sm">مرجع: <span className="font-mono">{purchaseReturn.originalPurchaseId}</span></p>}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 my-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">إلى المورد</h3>
            <p className="font-bold">{supplier?.name}</p>
            <p className="text-sm">{supplier?.address}</p>
            <p className="text-sm">{supplier?.phone}</p>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">التاريخ</h3>
            <p className="font-medium">{new Date(purchaseReturn.date).toLocaleDateString('ar-EG')}</p>
          </div>
        </section>

        <section>
          <table className="w-full text-right">
            <thead className="bg-gray-100 dark:bg-gray-800">
              <tr>
                <th className="p-3 font-semibold">الصنف</th>
                <th className="p-3 font-semibold text-center">الكمية المرتجعة</th>
                <th className="p-3 font-semibold text-center">سعر الوحدة</th>
                <th className="p-3 font-semibold text-left">الإجمالي</th>
              </tr>
            </thead>
            <tbody>
              {purchaseReturn.items.map((item, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-center">{item.price.toLocaleString()} جنيه مصري</td>
                  <td className="p-3 text-left">{item.total.toLocaleString()} جنيه مصري</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
                 <tr className="font-bold text-lg">
                    <td colSpan={3} className="p-3 text-left border-t-2">إجمالي قيمة المرتجع</td>
                    <td className="p-3 text-left border-t-2">{grandTotal.toLocaleString()} جنيه مصري</td>
                </tr>
            </tfoot>
          </table>
        </section>

        <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12 pt-6 border-t dark:border-gray-700">
          {printSettings.footerText && <p className="whitespace-pre-wrap mb-4">{printSettings.footerText}</p>}
          <p>تم تسجيل هذا الإشعار في حسابكم.</p>
        </footer>
      </div>
    </Modal>
  );
};

export default PurchaseReturnView;
