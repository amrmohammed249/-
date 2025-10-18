import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { Customer, Supplier, AccountNode, TreasuryTransaction } from '../../types';

interface AddTreasuryTransactionFormProps {
  onClose: () => void;
  onSuccess: (newTransaction: TreasuryTransaction) => void;
  defaultType: 'سند قبض' | 'سند صرف';
}

const AddTreasuryTransactionForm: React.FC<AddTreasuryTransactionFormProps> = ({ onClose, onSuccess, defaultType }) => {
  const { 
    customers, 
    suppliers, 
    chartOfAccounts, 
    treasuriesList, 
    addTreasuryTransaction,
    showToast 
  } = useContext(DataContext);
  
  const treasuries = useMemo(() => treasuriesList.filter((t: any) => !t.isTotal), [treasuriesList]);
  const mainTreasury = useMemo(() => treasuries.find((t: any) => t.name === 'الخزينة الرئيسية'), [treasuries]);

  const defaultPartyType = useMemo(() => {
    if (defaultType === 'سند صرف') return 'supplier';
    if (defaultType === 'سند قبض') return 'customer';
    return '';
  }, [defaultType]);

  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [treasuryId, setTreasuryId] = useState('');
  const [partyType, setPartyType] = useState<'customer' | 'supplier' | 'account' | ''>(defaultPartyType as any);
  const [partyId, setPartyId] = useState('');
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');

  const [currentBalance, setCurrentBalance] = useState<number | null>(null);
  const [newBalance, setNewBalance] = useState<number | null>(null);

  // Effect to set the default treasury once data is loaded
  useEffect(() => {
    if (!treasuryId) {
        if (mainTreasury?.id) {
            setTreasuryId(mainTreasury.id);
        } else if (treasuries.length > 0) {
            setTreasuryId(treasuries[0].id);
        }
    }
  }, [treasuries, mainTreasury, treasuryId]);

  // Effect to reset party selection when type changes
  useEffect(() => {
    setPartyId('');
  }, [partyType]);

  // Effect to get the current balance when party is selected
  useEffect(() => {
    if ((partyType === 'customer' || partyType === 'supplier') && partyId) {
      let party;
      if (partyType === 'customer') {
        party = customers.find((c: Customer) => c.id === partyId);
      } else {
        party = suppliers.find((s: Supplier) => s.id === partyId);
      }
      
      if (party) {
        setCurrentBalance(party.balance);
      } else {
        setCurrentBalance(null);
      }
    } else {
      setCurrentBalance(null);
    }
    setNewBalance(null); // Also reset newBalance when party changes
  }, [partyId, partyType, customers, suppliers]);

  // Effect to calculate the new balance when amount or party changes
  useEffect(() => {
    const numAmount = parseFloat(amount) || 0;
    if (currentBalance !== null) {
      let calculatedNewBalance = currentBalance;
      if (numAmount > 0) {
          if (partyType === 'customer') {
            if (defaultType === 'سند قبض') { // Receipt from customer
              calculatedNewBalance = currentBalance - numAmount;
            } else { // Payment to customer (refund)
              calculatedNewBalance = currentBalance + numAmount;
            }
          } else if (partyType === 'supplier') {
            if (defaultType === 'سند صرف') { // Payment to supplier
              calculatedNewBalance = currentBalance - numAmount;
            } else { // Receipt from supplier (refund)
              calculatedNewBalance = currentBalance + numAmount;
            }
          }
      }
      setNewBalance(calculatedNewBalance);
    } else {
      setNewBalance(null);
    }
  }, [amount, currentBalance, partyType, defaultType]);
  
  const accountsList = useMemo(() => {
    const flatten = (nodes: AccountNode[]): AccountNode[] => {
      return nodes.reduce<AccountNode[]>((acc, node) => {
        if (!node.children || node.children.length === 0) {
          acc.push(node);
        } else {
          acc.push(...flatten(node.children));
        }
        return acc;
      }, []);
    };
    return flatten(chartOfAccounts);
  }, [chartOfAccounts]);

  const partyTypeOptions = useMemo(() => {
    if (defaultType === 'سند صرف') { // Payment Voucher
      return [
        { value: 'supplier', label: 'مورد' },
        { value: 'account', label: 'حساب' },
        { value: 'customer', label: 'عميل' }, // For refunds
      ];
    }
    // Receipt Voucher ('سند قبض')
    return [
      { value: 'customer', label: 'عميل' },
      { value: 'supplier', label: 'مورد' }, // e.g., refund from supplier
      { value: 'account', label: 'حساب' }, // e.g., capital, loan
    ];
  }, [defaultType]);


  const partyOptions = useMemo(() => {
    switch (partyType) {
      case 'customer':
        return customers;
      case 'supplier':
        return suppliers;
      case 'account':
        return [...accountsList].sort((a,b) => a.code.localeCompare(b.code));
      default:
        return [];
    }
  }, [partyType, customers, suppliers, accountsList]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!treasuryId || !partyType || !partyId || !amount || parseFloat(amount) <= 0 || !description) {
      showToast('يرجى ملء جميع الحقول المطلوبة.', 'error');
      return;
    }
    
    const selectedTreasury = treasuries.find((t: any) => t.id === treasuryId);
    if (!selectedTreasury) {
      showToast('الرجاء اختيار خزينة صالحة.', 'error');
      return;
    }

    const newTransaction = addTreasuryTransaction({
      date,
      type: defaultType,
      treasuryAccountId: treasuryId,
      treasuryAccountName: selectedTreasury.name,
      description,
      amount: parseFloat(amount),
      partyType: partyType as 'customer' | 'supplier' | 'account',
      partyId
    });

    onSuccess(newTransaction);
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
            {partyOptions.map((p: any) => <option key={p.id} value={p.id}>{p.code ? `${p.code} - ${p.name}` : p.name}</option>)}
          </select>
        </div>

        {currentBalance !== null && (
            <div className="md:col-span-2 -mt-2 p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg border dark:border-gray-600 grid grid-cols-2 gap-4 text-sm">
                <div>
                    <span className="text-gray-500 dark:text-gray-400">الرصيد الحالي:</span>
                    <p className="font-semibold font-mono text-lg">{currentBalance.toLocaleString()} جنيه</p>
                </div>
                <div>
                    <span className="text-gray-500 dark:text-gray-400">الرصيد المتبقي:</span>
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
        <button type="submit" className="btn-primary">حفظ السند</button>
      </div>
    </form>
  );
};

export default AddTreasuryTransactionForm;