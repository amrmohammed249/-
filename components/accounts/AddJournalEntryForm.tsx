import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

const AddJournalEntryForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const { chartOfAccounts, addJournalEntry } = useContext(DataContext);
  
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [lines, setLines] = useState([
    { id: 1, accountId: '', debit: '', credit: '' },
    { id: 2, accountId: '', debit: '', credit: '' },
  ]);
  const [nextId, setNextId] = useState(3);

  const accountsList = useMemo(() => {
    const flatten = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.reduce<AccountNode[]>((acc, node) => {
        if (node.children && node.children.length > 0) {
          return [...acc, ...flatten(node.children)];
        }
        // Only include leaf nodes which are transactable
        acc.push(node);
        return acc;
      }, []);
    };
    return flatten(chartOfAccounts).sort((a, b) => a.code.localeCompare(b.code));
  }, [chartOfAccounts]);

  const handleLineChange = (id: number, field: 'accountId' | 'debit' | 'credit', value: string) => {
    setLines(prevLines =>
      prevLines.map(line => {
        if (line.id === id) {
          const newLine = { ...line, [field]: value };
          if (field === 'debit' && value) {
            newLine.credit = '';
          } else if (field === 'credit' && value) {
            newLine.debit = '';
          }
          return newLine;
        }
        return line;
      })
    );
  };

  const addLine = () => {
    setLines(prev => [...prev, { id: nextId, accountId: '', debit: '', credit: '' }]);
    setNextId(prev => prev + 1);
  };

  const removeLine = (id: number) => {
    setLines(prev => prev.filter(line => line.id !== id));
  };

  const { totalDebit, totalCredit } = useMemo(() => {
    return lines.reduce(
      (acc, line) => {
        acc.totalDebit += parseFloat(line.debit) || 0;
        acc.totalCredit += parseFloat(line.credit) || 0;
        return acc;
      },
      { totalDebit: 0, totalCredit: 0 }
    );
  }, [lines]);

  const isBalanced = totalDebit > 0 && totalDebit === totalCredit;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBalanced) {
      alert('القيد غير متوازن أو أن الإجمالي صفر. الرجاء المراجعة.');
      return;
    }

    const finalLines = lines
      .filter(line => line.accountId && (parseFloat(line.debit) > 0 || parseFloat(line.credit) > 0))
      .map(line => {
        const account = accountsList.find(a => a.id === line.accountId);
        return {
          accountId: line.accountId,
          accountName: account?.name || 'غير معروف',
          debit: parseFloat(line.debit) || 0,
          credit: parseFloat(line.credit) || 0,
        };
      });
    
    if (finalLines.length < 2) {
      alert('يجب أن يحتوي القيد على طرف مدين وطرف دائن على الأقل.');
      return;
    }

    addJournalEntry({
      date,
      description,
      debit: totalDebit,
      credit: totalCredit,
      status: 'تحت المراجعة',
      lines: finalLines,
    });
    
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="entryDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
          <input type="date" id="entryDate" value={date} onChange={e => setDate(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الوصف</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={2} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required></textarea>
        </div>
      </div>
      
      {/* Entry Lines */}
      <div className="space-y-2">
        <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300">
            <div className="col-span-5">الحساب</div>
            <div className="col-span-3 text-center">مدين</div>
            <div className="col-span-3 text-center">دائن</div>
            <div className="col-span-1"></div>
        </div>
        {lines.map((line) => (
          <div key={line.id} className="grid grid-cols-12 gap-2 items-center">
            <select
              value={line.accountId}
              onChange={e => handleLineChange(line.id, 'accountId', e.target.value)}
              className="col-span-5 mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">-- اختر حساب --</option>
              {accountsList.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
            </select>
            <input
              type="number"
              value={line.debit}
              onChange={e => handleLineChange(line.id, 'debit', e.target.value)}
              className="col-span-3 text-center mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              step="any"
            />
            <input
              type="number"
              value={line.credit}
              onChange={e => handleLineChange(line.id, 'credit', e.target.value)}
              className="col-span-3 text-center mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
              placeholder="0.00"
              step="any"
            />
            <button type="button" onClick={() => removeLine(line.id)} className="col-span-1 text-red-500 hover:text-red-700 flex justify-center">
              <TrashIcon className="w-5 h-5" />
            </button>
          </div>
        ))}
      </div>
      <button type="button" onClick={addLine} className="flex items-center text-sm text-blue-500 hover:text-blue-700 mt-2">
        <PlusIcon className="w-4 h-4 ml-1" />
        إضافة سطر
      </button>

      {/* Totals */}
      <div className="border-t pt-4 mt-4 space-y-2">
          <div className="flex justify-between font-semibold text-lg">
              <span>إجمالي المدين</span>
              <span>{totalDebit.toLocaleString(undefined, { minimumFractionDigits: 2 })} جنيه مصري</span>
          </div>
          <div className="flex justify-between font-semibold text-lg">
              <span>إجمالي الدائن</span>
              <span>{totalCredit.toLocaleString(undefined, { minimumFractionDigits: 2 })} جنيه مصري</span>
          </div>
          <div className={`flex justify-between font-bold text-lg p-2 rounded-md ${isBalanced ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'}`}>
              <span>الفرق</span>
              <span>{(totalDebit - totalCredit).toLocaleString(undefined, { minimumFractionDigits: 2 })} جنيه مصري</span>
          </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
        <button
          type="submit"
          disabled={!isBalanced}
          className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-blue-300 disabled:cursor-not-allowed"
        >
          إضافة قيد
        </button>
      </div>
    </form>
  );
};

export default AddJournalEntryForm;