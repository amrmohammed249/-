import React from 'react';
import Modal from './Modal';

interface ViewDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  data: { [key: string]: any };
}

const ViewDetailsModal: React.FC<ViewDetailsModalProps> = ({ isOpen, onClose, title, data }) => {
  if (!isOpen) return null;

  const keyMappings: { [key: string]: string } = {
      id: 'المعرف',
      customer: 'العميل',
      supplier: 'المورد',
      date: 'التاريخ',
      total: 'الإجمالي',
      status: 'الحالة',
      name: 'الاسم',
      contact: 'البريد الإلكتروني',
      phone: 'رقم الهاتف',
      balance: 'الرصيد',
      description: 'الوصف',
      debit: 'إجمالي المدين',
      credit: 'إجمالي الدائن',
      type: 'النوع',
      amount: 'المبلغ',
      previousBalance: 'الرصيد السابق',
      newBalance: 'الرصيد الجديد',
  };

  const renderValue = (value: any) => {
    if (typeof value === 'number') return `${value.toLocaleString()} جنيه مصري`;
    if (typeof value === 'boolean') return value ? 'نعم' : 'لا';
    return String(value);
  }
  
  const { 
    previousBalance, 
    newBalance, 
    total, 
    amount, 
    items, 
    lines,
    ...restOfData 
  } = data;
  
  const transactionValue = total !== undefined ? total : amount;
  const transactionLabel = total !== undefined ? 'قيمة الفاتورة' : 'قيمة الحركة';


  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Object.entries(restOfData).map(([key, value]) => (
            <div key={key} className="p-2 border-b dark:border-gray-600">
              <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{keyMappings[key] || key}</p>
              <p className="text-gray-800 dark:text-gray-100">{renderValue(value)}</p>
            </div>
          ))}
        </div>
        
        {items && Array.isArray(items) && items.length > 0 && (
          <div className="mt-4 border-t dark:border-gray-700 pt-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">الأصناف</h4>
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-2 font-medium">الصنف</th>
                  <th className="px-3 py-2 font-medium text-center">الكمية</th>
                  <th className="px-3 py-2 font-medium text-center">السعر</th>
                  <th className="px-3 py-2 font-medium text-center">الإجمالي</th>
                </tr>
              </thead>
              <tbody>
                {items.map((item: any, index: number) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="px-3 py-2">{item.itemName || 'N/A'}</td>
                    <td className="px-3 py-2 text-center font-mono">{item.quantity}</td>
                    <td className="px-3 py-2 text-center font-mono">{renderValue(item.price)}</td>
                    <td className="px-3 py-2 text-center font-mono">{renderValue(item.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Balances Section */}
        {(previousBalance !== undefined || newBalance !== undefined || transactionValue !== undefined) && (
          <div className="mt-4 border-t dark:border-gray-700 pt-4 space-y-2">
             <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">ملخص الحساب</h4>
             {previousBalance !== undefined && (
                <div className="flex justify-between text-md">
                    <span className="text-gray-500 dark:text-gray-400">الرصيد السابق:</span>
                    <span className="font-mono font-semibold">{renderValue(previousBalance)}</span>
                </div>
             )}
             {transactionValue !== undefined && (
                <div className="flex justify-between text-md">
                    <span className="text-gray-500 dark:text-gray-400">{transactionLabel}:</span>
                    <span className={`font-mono font-semibold ${amount > 0 ? 'text-green-600' : amount < 0 ? 'text-red-600' : ''}`}>
                      {renderValue(transactionValue)}
                    </span>
                </div>
             )}
             {newBalance !== undefined && (
                <div className="flex justify-between text-lg font-bold pt-2 border-t dark:border-gray-600 mt-2">
                    <span>الرصيد الجديد:</span>
                    <span className="font-mono">{renderValue(newBalance)}</span>
                </div>
             )}
          </div>
        )}
        
        {lines && Array.isArray(lines) && (
          <div className="mt-4 border-t dark:border-gray-700 pt-4">
            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">تفاصيل القيد</h4>
            <table className="w-full text-sm text-right">
              <thead className="bg-gray-50 dark:bg-gray-700/50">
                <tr>
                  <th className="px-3 py-2 font-medium">الحساب</th>
                  <th className="px-3 py-2 font-medium text-center">مدين</th>
                  <th className="px-3 py-2 font-medium text-center">دائن</th>
                </tr>
              </thead>
              <tbody>
                {lines.map((line: any, index: number) => (
                  <tr key={index} className="border-b dark:border-gray-700">
                    <td className="px-3 py-2">{line.accountName}</td>
                    <td className="px-3 py-2 text-center font-mono">{line.debit > 0 ? line.debit.toLocaleString() : '-'}</td>
                    <td className="px-3 py-2 text-center font-mono">{line.credit > 0 ? line.credit.toLocaleString() : '-'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        
      </div>
      <div className="mt-6 flex justify-end">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 dark:bg-gray-600 dark:text-gray-200 dark:hover:bg-gray-500"
        >
          إغلاق
        </button>
      </div>
    </Modal>
  );
};

export default ViewDetailsModal;