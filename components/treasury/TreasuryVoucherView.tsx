import React, { useContext, useMemo } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { TreasuryTransaction, AccountNode } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';

declare var jspdf: any;
declare var html2canvas: any;

interface ViewProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: TreasuryTransaction;
}

const findAccountNameById = (nodes: AccountNode[], id: string): string | null => {
    for (const node of nodes) {
        if (node.id === id) return node.name;
        if (node.children) {
            const found = findAccountNameById(node.children, id);
            if (found) return found;
        }
    }
    return null;
};


const TreasuryVoucherView: React.FC<ViewProps> = ({ isOpen, onClose, transaction }) => {
  const { companyInfo, customers, suppliers, chartOfAccounts, printSettings } = useContext(DataContext);

  const partyName = useMemo(() => {
    if (!transaction.partyId) return transaction.accountName || '';
    switch (transaction.partyType) {
        case 'customer':
            return customers.find(c => c.id === transaction.partyId)?.name || 'غير معروف';
        case 'supplier':
            return suppliers.find(s => s.id === transaction.partyId)?.name || 'غير معروف';
        case 'account':
             return findAccountNameById(chartOfAccounts, transaction.partyId) || 'غير معروف';
        default:
            return 'غير محدد';
    }
  }, [transaction, customers, suppliers, chartOfAccounts]);


  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-voucher');
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
              pdf.save(`سند-${transaction.id}.pdf`);
          });
    }
  };
  
  const ActionButton: React.FC<{ icon: React.ReactNode; label: string; onClick?: () => void }> = ({ icon, label, onClick }) => (
    <button onClick={onClick} className="flex items-center space-x-2 space-x-reverse px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600">
      {icon}<span>{label}</span>
    </button>
  );

  const isReceipt = transaction.type === 'سند قبض';
  const title = isReceipt ? 'سند قبض' : 'سند صرف';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`تفاصيل السند: ${transaction.id}`} size="4xl">
      <div className="no-print mb-6 flex flex-wrap gap-2 justify-end">
        <ActionButton icon={<PrinterIcon className="w-5 h-5" />} label="طباعة" onClick={handlePrint} />
        <ActionButton icon={<ArrowDownTrayIcon className="w-5 h-5" />} label="تصدير PDF" onClick={handleExportPDF} />
      </div>

      <div id="printable-voucher" className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg border">
        <header className="flex justify-between items-start pb-6 border-b">
          <div>
            {printSettings.logo && <img src={printSettings.logo} alt="شعار الشركة" className="h-20 w-auto mb-4 object-contain"/>}
            <h1 className="text-2xl font-bold">{companyInfo.name}</h1>
            <p className="text-sm">{companyInfo.address}</p>
          </div>
          <div className="text-left">
            <h2 className={`text-3xl font-bold uppercase ${isReceipt ? 'text-green-600' : 'text-red-600'}`}>{title}</h2>
            <p>رقم: <span className="font-mono">{transaction.id}</span></p>
            <p>تاريخ: {new Date(transaction.date).toLocaleDateString('ar-EG')}</p>
          </div>
        </header>

        <main className="my-10 space-y-8 text-lg">
            <div className="flex items-center space-x-4 space-x-reverse">
                <span className="font-semibold">{isReceipt ? 'استلمنا من السيد/السادة:' : 'اصرفوا للسيد/السادة:'}</span>
                <span className="flex-grow border-b-2 border-dotted pb-1 font-bold">{partyName}</span>
            </div>
             <div className="flex items-center space-x-4 space-x-reverse">
                <span className="font-semibold">مبلغ وقدره:</span>
                <span className="flex-grow border-b-2 border-dotted pb-1 font-bold font-mono text-center bg-gray-100 dark:bg-gray-800 p-2 rounded-md">
                    {Math.abs(transaction.amount).toLocaleString()} جنيه مصري
                </span>
            </div>
             <div className="flex items-center space-x-4 space-x-reverse">
                <span className="font-semibold">وذلك عن:</span>
                <span className="flex-grow border-b-2 border-dotted pb-1 font-bold">{transaction.description}</span>
            </div>
        </main>
        
        <section className="grid grid-cols-3 gap-8 mt-24 text-center">
            <div>
                <p className="font-semibold">المستلم</p>
                <p className="border-t-2 border-dotted mt-12 pt-2">التوقيع</p>
            </div>
             <div>
                <p className="font-semibold">المحاسب</p>
                <p className="border-t-2 border-dotted mt-12 pt-2">التوقيع</p>
            </div>
             <div>
                <p className="font-semibold">المدير</p>
                <p className="border-t-2 border-dotted mt-12 pt-2">التوقيع</p>
            </div>
        </section>

        <footer className="text-center text-xs text-gray-500 dark:text-gray-400 mt-12 pt-6 border-t dark:border-gray-700">
           {printSettings.footerText && <p className="whitespace-pre-wrap mb-4">{printSettings.footerText}</p>}
        </footer>
      </div>
    </Modal>
  );
};

export default TreasuryVoucherView;