import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';

interface AddAccountFormProps {
  onClose: () => void;
  parentId: string | null;
  onSuccess?: (newAccount: AccountNode) => void;
}

const AddAccountForm: React.FC<AddAccountFormProps> = ({ onClose, parentId, onSuccess }) => {
  const [accountName, setAccountName] = useState('');
  const [accountCode, setAccountCode] = useState('');
  const { addAccount } = useContext(DataContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountCode) {
      alert('يرجى تعبئة اسم ورمز الحساب.');
      return;
    }
    
    const newAccount = addAccount({
      name: accountName,
      code: accountCode,
      parentId: parentId,
    });
    
    if (onSuccess) {
        onSuccess(newAccount);
    }

    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="accountName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الحساب</label>
          <input type="text" id="accountName" value={accountName} onChange={e => setAccountName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="accountCode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رمز الحساب</label>
          <input type="text" id="accountCode" value={accountCode} onChange={e => setAccountCode(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">إضافة حساب</button>
      </div>
    </form>
  );
};

export default AddAccountForm;