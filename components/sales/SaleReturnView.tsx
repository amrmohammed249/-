import React, { useContext } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { SaleReturn } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';
import { TableCellsIcon } from '../icons/TableCellsIcon';

declare var jspdf: any;
declare var html2canvas: any;

interface SaleReturnViewProps {
  isOpen: boolean;
  onClose: () => void;
  saleReturn: SaleReturn;
}

const SaleReturnView: React.FC<SaleReturnViewProps> = ({ isOpen, onClose, saleReturn }) => {
  const { companyInfo, customers, printSettings } = useContext(DataContext);
  const customer = customers.find(c => c.name === saleReturn.customer);

  const grandTotal = saleReturn.items.reduce((sum, item) => sum + item.total, 0);
  const currentBalance = customer?.balance || 0;
  const previousBalance = currentBalance + grandTotal;

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-sale-return');
    if (input) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      html2canvas(input, {
        scale: 2,
        useCORS: true,
        backgroundColor: isDarkMode ? '#111827' : '#ffffff',
      }).then(canvas => {
        const imgData = canvas.toDataURL('image/png');
        const pdf = new jspdf.jsPDF({
          orientation: 'portrait',
          unit: 'pt',
          format: 'a4'
        });
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const imgProps = pdf.getImageProperties(imgData);
        const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`إشعار-دائن-${saleReturn.id}.pdf`);
      });
    }
  };

  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
      {icon}<span>{label}</span>
    </button>
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل مرتجع المبيعات: ${saleReturn.id}`} size="4xl">
      <div className="no-print mb-6 flex flex-wrap gap-2 justify-end">
        <ActionButton icon={<PrinterIcon className="w-5 h-5" />} label="طباعة" onClick={handlePrint} />
        <ActionButton icon={<ArrowDownTrayIcon className="w-5 h-5" />} label="تصدير PDF" onClick={handleExportPDF} />
      </div>

      <div id="printable-sale-return" className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg">
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            {printSettings.logo && <img src={printSettings.logo} alt="شعار الشركة" className="h-20 w-auto mb-4 object-contain"/>}
            <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{companyInfo.name}</h1>
            <p className="text-sm">{companyInfo.address}</p>
            <p className="text-sm">{companyInfo.phone}</p>
            {printSettings.taxId && <p className="text-sm">الرقم الضريبي: {printSettings.taxId}</p>}
            {printSettings.commercialRegNo && <p className="text-sm">السجل التجاري: {printSettings.commercialRegNo}</p>}
          </div>
          <div className="text-left">
            <h2 className="text-3xl font-bold uppercase text-red-500">إشعار دائن</h2>
            <p className="text-sm">رقم: <span className="font-mono">{saleReturn.id}</span></p>
            {saleReturn.originalSaleId && (
              <p className="text-sm">مرجع الفاتورة الأصلية: <span className="font-mono">{saleReturn.originalSaleId}</span></p>
            )}
          </div>
        </header>

        <section className="grid grid-cols-2 gap-4 my-6">
          <div>
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase mb-2">العميل</h3>
            <p className="font-bold">{customer?.name}</p>
            <p className="text-sm">{customer?.address}</p>
            <p className="text-sm">{customer?.phone}</p>
          </div>
          <div className="text-left">
            <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400">تاريخ المرتجع</h3>
            <p className="font-medium">{new Date(saleReturn.date).toLocaleDateString('ar-EG')}</p>
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
              {saleReturn.items.map((item, index) => (
                <tr key={index} className="border-b dark:border-gray-700">
                  <td className="p-3">{item.itemName}</td>
                  <td className="p-3 text-center">{item.quantity}</td>
                  <td className="p-3 text-center">{item.price.toLocaleString()} جنيه مصري</td>
                  <td className="p-3 text-left">{item.total.toLocaleString()} جنيه مصري</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="flex justify-end mt-6">
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-sm font-bold pt-2 border-t dark:border-gray-600">
              <span>إجمالي قيمة المرتجع</span>
              <span className="text-red-600">({grandTotal.toLocaleString()}) جنيه مصري</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-500 dark:text-gray-400">الرصيد السابق</span>
              <span>{previousBalance.toLocaleString()} جنيه مصري</span>
            </div>
            <div className="flex justify-between font-bold text-lg pt-2 border-t dark:border-gray-600">
              <span>الرصيد الجديد</span>
              <span>{currentBalance.toLocaleString()} جنيه مصري</span>
            </div>
          </div>
        </section>

        <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12 pt-6 border-t dark:border-gray-700">
          {printSettings.footerText && <p className="whitespace-pre-wrap mb-4">{printSettings.footerText}</p>}
          <p>تم تسجيل هذا الإشعار في حسابكم.</p>
        </footer>
      </div>
    </Modal>
  );
};

export default SaleReturnView;
