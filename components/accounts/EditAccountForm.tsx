import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode } from '../../types';

interface EditAccountFormProps {
  account: AccountNode;
  onClose: () => void;
}

const EditAccountForm: React.FC<EditAccountFormProps> = ({ account, onClose }) => {
  const { chartOfAccounts, updateAccount, showToast } = useContext(DataContext);
  
  const [accountName, setAccountName] = useState(account.name);
  const [accountCode, setAccountCode] = useState(account.code);

  const findParent = (nodes: AccountNode[], childId: string): AccountNode | null => {
    for (const node of nodes) {
      if (node.children?.some(child => child.id === childId)) {
        return node;
      }
      if (node.children) {
        const parent = findParent(node.children, childId);
        if (parent) return parent;
      }
    }
    return null;
  };

  const parent = useMemo(() => findParent(chartOfAccounts, account.id), [chartOfAccounts, account.id]);
  const [parentId, setParentId] = useState<string | null>(parent ? parent.id : null);

  // Fix: Changed JSX.Element[] to React.ReactElement[] and added return type to useMemo to avoid namespace error.
  const accountOptions = useMemo((): React.ReactElement[] => {
    const options: React.ReactElement[] = [];
    const descendantIds = new Set<string>();

    const findDescendants = (node: AccountNode) => {
      descendantIds.add(node.id);
      if (node.children) {
        node.children.forEach(findDescendants);
      }
    };
    findDescendants(account);

    const generateOptions = (nodes: AccountNode[], level: number) => {
      nodes.forEach(node => {
        if (!descendantIds.has(node.id)) {
          options.push(
            <option key={node.id} value={node.id}>
              {'\u00A0\u00A0'.repeat(level)} {node.code} - {node.name}
            </option>
          );
        }
        if (node.children) {
          generateOptions(node.children, level + 1);
        }
      });
    };

    generateOptions(chartOfAccounts, 0);
    return options;
  }, [chartOfAccounts, account]);


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountName || !accountCode) {
      showToast('يرجى تعبئة اسم ورمز الحساب.', 'error');
      return;
    }
    
    updateAccount({
      id: account.id,
      name: accountName,
      code: accountCode,
      parentId: parentId,
    });
    
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
        <div>
          <label htmlFor="parentId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحساب الرئيسي</label>
          <select id="parentId" value={parentId || ''} onChange={e => setParentId(e.target.value || null)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
              <option value="">-- حساب رئيسي (لا يندرج تحت حساب آخر) --</option>
              {accountOptions}
          </select>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">حفظ التعديلات</button>
      </div>
    </form>
  );
};

export default EditAccountForm;