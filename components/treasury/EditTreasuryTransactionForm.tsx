import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { Customer, Supplier, AccountNode, TreasuryTransaction } from '../../types';

interface EditTreasuryTransactionFormProps {
  onClose: () => void;
  onSuccess: () => void;
  transaction: TreasuryTransaction;
}

const EditTreasuryTransactionForm: React.FC<EditTreasuryTransactionFormProps> = ({ onClose, onSuccess, transaction }) => {
  const { 
    customers, 
    suppliers, 
    chartOfAccounts, 
    treasuriesList, 
    updateTreasuryTransaction,
    showToast 
  } = useContext(DataContext);
  
  const treasuries = useMemo(() => treasuriesList.filter((t: any) => !t.isTotal), [treasuriesList]);

  const [date, setDate] = useState(transaction.date);
  const [treasuryId, setTreasuryId] = useState(transaction.treasuryAccountId);
  const [partyType, setPartyType] = useState(transaction.partyType || '');
  const [partyId, setPartyId] = useState(transaction.partyId || '');
  const [amount, setAmount] = useState(String(Math.abs(transaction.amount)));
  const [description, setDescription] = useState(transaction.description);

  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);
  
  // Effect to reset party selection when type changes
  useEffect(() => {
    // Only reset if it's a true type change from what was originally passed
    if (partyType !== transaction.partyType) {
        setPartyId('');
    }
  }, [partyType, transaction.partyType]);

  // Effect to get the current balance when party is selected
  useEffect(() => {
    if ((partyType === 'customer' || partyType === 'supplier') && partyId) {
      let party;
      if (partyType === 'customer') party = customers.find((c: Customer) => c.id === partyId);
      else party = suppliers.find((s: Supplier) => s.id === partyId);
      
      if (party) {
        // Calculate the balance *before* this transaction
        let originalEffect = 0;
        if (partyId === transaction.partyId) { // if it's the same party, calculate the balance before this specific TX
            if (transaction.partyType === 'customer') { // A receipt from customer decreases their balance
                originalEffect = transaction.type === 'سند قبض' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
            } else { // A payment to supplier decreases their balance
                originalEffect = transaction.type === 'سند صرف' ? Math.abs(transaction.amount) : -Math.abs(transaction.amount);
            }
        }
        setCurrentBalance(party.balance + originalEffect);
      } else {
        setCurrentBalance(null);
      }
    } else {
      setCurrentBalance(null);
    }
  }, [partyId, partyType, customers, suppliers, transaction]);

  // Effect to calculate the new balance when amount or party changes
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    if (currentBalance !== null) {
      let calculatedNewBalance = currentBalance;
      if (numAmount > 0) {
          if (partyType === 'customer') {
            calculatedNewBalance += (transaction.type === 'سند قبض' ? -numAmount : numAmount);
          } else if (partyType === 'supplier') {
            calculatedNewBalance += (transaction.type === 'سند صرف' ? -numAmount : numAmount);
          }
      }
      setNewBalance(calculatedNewBalance);
    } else {
      setNewBalance(null);
    }
  }, [amount, currentBalance, partyType, transaction.type]);
  
  const accountOptionsForSelect = useMemo(() => {
    const options: { account: AccountNode; level: number }[] = [];
    const traverse = (nodes: AccountNode[], level: number) => {
      nodes.forEach(node => {
        options.push({ account: node, level });
        if (node.children) {
          traverse(node.children, level + 1);
        }
      });
    };
    traverse(chartOfAccounts, 0);
    return options;
  }, [chartOfAccounts]);

  const partyTypeOptions = useMemo(() => [
    { value: 'customer', label: 'عميل' },
    { value: 'supplier', label: 'مورد' },
    { value: 'account', label: 'حساب' },
  ], []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treasuryId || !partyType || !partyId || !amount || parseFloat(amount) <= 0 || !description) {
      showToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
      return;
    }
    
    updateTreasuryTransaction(transaction.id, {
      date,
      type: transaction.type,
      treasuryAccountId: treasuryId,
      description,
      amount: parseFloat(amount),
      partyType: partyType as any,
      partyId
    });

    onSuccess();
  };
  
  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
          <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="input-style w-full mt-1" required />
        </div>
        <div>
          <label htmlFor="treasuryId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الخزينة</label>
          <select id="treasuryId" value={treasuryId} onChange={e => setTreasuryId(e.target.value)} className="input-style w-full mt-1" required>
            <option value="">-- اختر خزينة --</option>
            {treasuries.map((t: any) => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="partyType" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الطرف المقابل</label>
          <select id="partyType" value={partyType} onChange={e => setPartyType(e.target.value as any)} className="input-style w-full mt-1" required>
            <option value="">-- اختر نوع الطرف --</option>
            {partyTypeOptions.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="partyId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الطرف</label>
          <select id="partyId" value={partyId} onChange={e => setPartyId(e.target.value)} className="input-style w-full mt-1" required disabled={!partyType}>
            <option value="">-- اختر الطرف --</option>
            {partyType === 'customer' && customers.map((c: Customer) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
            {partyType === 'supplier' && suppliers.map((s: Supplier) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
            {partyType === 'account' && accountOptionsForSelect.map(({ account, level }) => (
              <option
                key={account.id}
                value={account.id}
                disabled={!!account.children && account.children.length > 0}
              >
                {'\u00A0\u00A0\u00A0\u00A0'.repeat(level)} {account.code} - {account.name}
              </option>
            ))}
          </select>
        </div>

        {currentBalance !== null && (
            <div className="md:col-span-2 -mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-500 dark:text-gray-400">الرصيد قبل الحركة:</span>
                    <p className="font-semibold font-mono text-lg">{currentBalance.toLocaleString()} جنيه</p>
                </div>
                <div>
                    <span className="text-gray-500 dark:text-gray-400">الرصيد بعد التعديل:</span>
                    <p className={`font-semibold font-mono text-lg ${newBalance !== null ? 'text-blue-600 dark:text-blue-400' : ''}`}>
                        {newBalance !== null ? newBalance.toLocaleString() + ' جنيه' : '-'}
                    </p>
                </div>
            </div>
        )}

         <div>
          <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المبلغ</label>
          <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} className="input-style w-full mt-1" required step="any" min="0.01" />
        </div>
        <div className="md:col-span-2">
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البيان</label>
          <textarea id="description" value={description} onChange={e => setDescription(e.target.value)} rows={3} className="input-style w-full mt-1" required />
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
        <button type="submit" className="btn-primary">حفظ التعديلات</button>
      </div>
    </form>
  );
};

export default EditTreasuryTransactionForm;