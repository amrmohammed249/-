import React, { useContext, useMemo, useEffect, useRef, useState } from 'react';
import Modal from '../shared/Modal';
import { DataContext } from '../../context/DataContext';
import { TreasuryTransaction, AccountNode } from '../../types';
import { PrinterIcon } from '../icons/PrinterIcon';
import { ArrowDownTrayIcon } from '../icons/ArrowDownTrayIcon';
import { PhotoIcon } from '../icons/PhotoIcon';

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
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    if (isOpen) {
      const updateScale = () => {
        if (containerRef.current) {
          const containerWidth = containerRef.current.parentElement?.clientWidth || 0;
          const invoiceWidth = 800;
          if (containerWidth < invoiceWidth && containerWidth > 0) {
            setScale((containerWidth - 20) / invoiceWidth);
          } else { setScale(1); }
        }
      };
      updateScale();
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [isOpen]);

  const partyName = useMemo(() => {
    if (!transaction.partyId) return transaction.accountName || '';
    switch (transaction.partyType) {
        case 'customer': return customers.find(c => c.id === transaction.partyId)?.name || 'غير معروف';
        case 'supplier': return suppliers.find(s => s.id === transaction.partyId)?.name || 'غير معروف';
        case 'account': return findAccountNameById(chartOfAccounts, transaction.partyId) || 'غير معروف';
        default: return 'غير محدد';
    }
  }, [transaction, customers, suppliers, chartOfAccounts]);
  
  const { previousBalance, currentBalance } = useMemo(() => {
    if (!transaction.partyId || (transaction.partyType !== 'customer' && transaction.partyType !== 'supplier')) return { previousBalance: null, currentBalance: null };
    const amount = Math.abs(transaction.amount);
    let party = null, pBalance = null, cBalance = null;
    if (transaction.partyType === 'customer') {
        party = customers.find(c => c.id === transaction.partyId);
        if (party) { cBalance = party.balance; pBalance = transaction.type === 'سند صرف' ? cBalance - amount : cBalance + amount; }
    } else if (transaction.partyType === 'supplier') {
        party = suppliers.find(s => s.id === transaction.partyId);
        if (party) { cBalance = party.balance; pBalance = transaction.type === 'سند صرف' ? cBalance + amount : cBalance - amount; }
    }
    return { previousBalance: pBalance, currentBalance: cBalance };
  }, [transaction, customers, suppliers]);

  const handlePrint = () => window.print();

  const handleExportPDF = () => {
    const input = document.getElementById('printable-voucher');
    if (input) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      html2canvas(input, { scale: 2, useCORS: true, backgroundColor: isDarkMode ? '#111827' : '#ffffff' })
      .then(canvas => {
          const imgData = canvas.toDataURL('image/jpeg', 0.7);
          const pdf = new jspdf.jsPDF({ orientation: 'portrait', unit: 'pt', format: 'a4' });
          const pdfWidth = pdf.internal.pageSize.getWidth();
          const imgProps = pdf.getImageProperties(imgData);
          const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;
          pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
          pdf.save(`سند-${transaction.id}.pdf`);
      });
    }
  };

  const handleExportImage = () => {
    const input = document.getElementById('printable-voucher');
    if (input) {
      const isDarkMode = document.documentElement.classList.contains('dark');
      html2canvas(input, { scale: 2, useCORS: true, backgroundColor: isDarkMode ? '#111827' : '#ffffff' })
      .then(canvas => {
          const link = document.createElement('a');
          link.download = `سند-${transaction.id}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
      });
    }
  };
  
  const isReceipt = transaction.type === 'سند قبض';

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`سند ${isReceipt ? 'قبض' : 'صرف'}: ${transaction.id}`} size="4xl">
      <div className="no-print mb-4 flex flex-wrap gap-2 justify-end">
        <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-gray-100 dark:bg-gray-700 rounded-lg"><PrinterIcon className="w-4 h-4"/> طباعة</button>
        <button onClick={handleExportPDF} className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-blue-100 dark:bg-blue-900/40 rounded-lg"><ArrowDownTrayIcon className="w-4 h-4"/> PDF</button>
        <button onClick={handleExportImage} className="flex items-center gap-2 px-3 py-2 text-sm font-bold bg-green-600 text-white rounded-lg shadow-md"><PhotoIcon className="w-4 h-4"/> صورة</button>
      </div>

      <div className="flex justify-center py-4 overflow-visible" style={{ height: scale < 1 ? `${900 * scale}px` : 'auto' }}>
        <div 
          ref={containerRef}
          id="printable-voucher" 
          style={{ width: '800px', transform: scale < 1 ? `scale(${scale})` : 'none', transformOrigin: 'top right' }}
          className="p-8 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-200 rounded-sm shadow-lg border"
        >
          <header className="flex justify-between items-start pb-6 border-b">
            <div>
              {printSettings.logo && <img src={printSettings.logo} alt="logo" className="h-20 w-auto mb-4 object-contain"/>}
              <h1 className="text-2xl font-bold text-blue-600 dark:text-blue-400">{companyInfo.name}</h1>
              <p className="text-sm">{companyInfo.address}</p>
            </div>
            <div className="text-left">
              <h2 className={`text-3xl font-bold uppercase ${isReceipt ? 'text-green-600' : 'text-red-600'}`}>{transaction.type}</h2>
              <p className="font-bold">رقم: <span className="font-mono">{transaction.id}</span></p>
              <p className="text-sm">تاريخ: {new Date(transaction.date).toLocaleDateString('ar-EG')}</p>
            </div>
          </header>

          <main className="my-10 space-y-8 text-lg">
              <div className="flex items-center space-x-4 space-x-reverse">
                  <span className="font-semibold shrink-0">{isReceipt ? 'استلمنا من السيد/السادة:' : 'اصرفوا للسيد/السادة:'}</span>
                  <span className="flex-grow border-b-2 border-dotted pb-1 font-bold text-blue-800 dark:text-blue-300">{partyName}</span>
              </div>
               <div className="flex items-center space-x-4 space-x-reverse">
                  <span className="font-semibold shrink-0">مبلغ وقدره:</span>
                  <span className="flex-grow border-b-2 border-dotted pb-1 font-bold font-mono text-center bg-gray-50 dark:bg-gray-800 p-2 rounded-md border text-2xl">
                      {Math.abs(transaction.amount).toLocaleString()} جنيه مصري
                  </span>
              </div>
               <div className="flex items-center space-x-4 space-x-reverse">
                  <span className="font-semibold shrink-0">وذلك عن:</span>
                  <span className="flex-grow border-b-2 border-dotted pb-1 font-bold">{transaction.description}</span>
              </div>
          </main>

          {previousBalance !== null && currentBalance !== null && (
              <section className="flex justify-end mt-6">
                  <div className="w-full max-w-sm space-y-2 text-sm border p-4 rounded-lg bg-gray-50 dark:bg-gray-800 dark:border-gray-700">
                      <div className="flex justify-between"><span>الرصيد السابق:</span><span className="font-mono">{previousBalance.toLocaleString()}</span></div>
                      <div className="flex justify-between font-bold border-t dark:border-gray-600 pt-2 text-base"><span>الرصيد المتبقي:</span><span className="font-mono">{currentBalance.toLocaleString()} جنيه</span></div>
                  </div>
              </section>
          )}
          
          <section className="grid grid-cols-3 gap-8 mt-20 text-center">
              <div><p className="font-bold text-gray-500 mb-10">المستلم</p><p className="border-t border-gray-400 pt-2 text-xs">التوقيع</p></div>
               <div><p className="font-bold text-gray-500 mb-10">المحاسب</p><p className="border-t border-gray-400 pt-2 text-xs">التوقيع</p></div>
               <div><p className="font-bold text-gray-500 mb-10">المدير</p><p className="border-t border-gray-400 pt-2 text-xs">التوقيع</p></div>
          </section>

          <footer className="text-center text-xs text-gray-400 mt-12 pt-6 border-t dark:border-gray-700">
             {printSettings.footerText && <p className="whitespace-pre-wrap">{printSettings.footerText}</p>}
          </footer>
        </div>
      </div>
    </Modal>
  );
};

export default TreasuryVoucherView;