import React, { useState, useMemo, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import type { Account } from '../../types';
import Modal from '../shared/Modal';

const findAccountById = (accounts: Account[], id: string): Account | null => {
    for (const account of accounts) {
        if (account.id === id) return account;
        if (account.children) {
            const found = findAccountById(account.children, id);
            if (found) return found;
        }
    }
    return null;
}

const getNextSubAccountCode = (parentNode: Account): string => {
    if (!parentNode) return `err-${Date.now()}`;
    const parentCode = parentNode.code;
    const children = parentNode.children || [];
    
    if (children.length === 0) {
        return `${parentCode}01`;
    }

    const childCodeSuffixes = children
        .map(child => child.code)
        .filter(code => code.startsWith(parentCode)) 
        .map(code => parseInt(code.slice(parentCode.length), 10))
        .filter(num => !isNaN(num));

    if (childCodeSuffixes.length === 0) {
        return `${parentCode}01`;
    }

    const maxSuffix = Math.max(0, ...childCodeSuffixes);
    const newSuffix = (maxSuffix + 1).toString().padStart(2, '0');
    
    return `${parentCode}${newSuffix}`;
};


const GeneralTransactionForm: React.FC<{
    treasuryId: string;
    type: 'deposit' | 'withdrawal';
    onClose: () => void;
}> = ({ treasuryId, type, onClose }) => {
    const { chartOfAccounts, addTreasuryTransaction, addAccount, treasuriesList } = useContext(DataContext);
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    const isDeposit = type === 'deposit';

    const [level1AccountId, setLevel1AccountId] = useState('');
    const [level2AccountId, setLevel2AccountId] = useState('');
    const [level3AccountId, setLevel3AccountId] = useState('');
    
    const [isAddingWithdrawalParentModalOpen, setIsAddingWithdrawalParentModalOpen] = useState(false);
    const [isAddingDepositParentModalOpen, setIsAddingDepositParentModalOpen] = useState(false);
    const [newParentName, setNewParentName] = useState("");
    const [newDepositParentRootId, setNewDepositParentRootId] = useState('');

    const [isAddingGroupModalOpen, setIsAddingGroupModalOpen] = useState(false);
    const [newGroupName, setNewGroupName] = useState("");
    const [isAddingDetailModalOpen, setIsAddingDetailModalOpen] = useState(false);
    const [newDetailName, setNewDetailName] = useState("");

    const expenseRoot = useMemo(() => findAccountById(chartOfAccounts, '4-2'), [chartOfAccounts]);
    const revenueAndExpensesRoot = useMemo(() => findAccountById(chartOfAccounts, '4'), [chartOfAccounts]);
    const equityRoot = useMemo(() => findAccountById(chartOfAccounts, '3'), [chartOfAccounts]);
    const liabilityRoot = useMemo(() => findAccountById(chartOfAccounts, '2'), [chartOfAccounts]);
    
    useEffect(() => {
        if (revenueAndExpensesRoot) {
            setNewDepositParentRootId(revenueAndExpensesRoot.id);
        }
    }, [revenueAndExpensesRoot]);

    const level1AccountOptions = useMemo(() => {
        let options: Account[] = [];
        if (isDeposit) {
            if (liabilityRoot?.children) options.push(...liabilityRoot.children);
            if (equityRoot?.children) options.push(...equityRoot.children);
            if (revenueAndExpensesRoot?.children) {
                options.push(...revenueAndExpensesRoot.children.filter(c => c.id !== expenseRoot?.id));
            }
        } else {
            options = expenseRoot?.children || [];
        }
        return options.sort((a,b) => a.code.localeCompare(b.code));
    }, [isDeposit, expenseRoot, liabilityRoot, equityRoot, revenueAndExpensesRoot]);
    
    const selectedLevel1Account = useMemo(() => findAccountById(chartOfAccounts, level1AccountId), [chartOfAccounts, level1AccountId]);
    const level2AccountOptions = useMemo(() => selectedLevel1Account?.children || [], [selectedLevel1Account]);
    const selectedLevel2Account = useMemo(() => level2AccountOptions.find(acc => acc.id === level2AccountId), [level2AccountOptions, level2AccountId]);
    const level3AccountOptions = useMemo(() => selectedLevel2Account?.children || [], [selectedLevel2Account]);

    const handleAddNewParentAccount = () => {
        const parentId = isDeposit ? newDepositParentRootId : expenseRoot?.id;
        const parentNode = findAccountById(chartOfAccounts, parentId || '');
        if (!newParentName.trim() || !parentNode) {
            alert("الرجاء إدخال اسم صحيح واختيار فئة أصل.");
            return;
        }

        const newCode = getNextSubAccountCode(parentNode);
        const newAccount = addAccount({ name: newParentName.trim(), code: newCode, parentId });

        if (newAccount) {
            setLevel1AccountId(newAccount.id);
            isDeposit ? setIsAddingDepositParentModalOpen(false) : setIsAddingWithdrawalParentModalOpen(false);
            setNewParentName('');
        }
    };
    
    const handleAddNewGroupAccount = () => {
        if (!newGroupName.trim() || !level1AccountId) return;
        const parentNode = findAccountById(chartOfAccounts, level1AccountId);
        if (!parentNode) return;
        
        const newCode = getNextSubAccountCode(parentNode);
        const newAccount = addAccount({ name: newGroupName.trim(), code: newCode, parentId: level1AccountId});
        
        if (newAccount) {
            setLevel2AccountId(newAccount.id); 
            setIsAddingGroupModalOpen(false);     
            setNewGroupName('');         
        }
    };

    const handleAddNewDetailedItem = () => {
        if (!newDetailName.trim() || !selectedLevel2Account) return;
        
        const newCode = getNextSubAccountCode(selectedLevel2Account);
        const newAccount = addAccount({ name: newDetailName.trim(), code: newCode, parentId: selectedLevel2Account.id });
        
        if (newAccount) {
            setLevel3AccountId(newAccount.id);
            setIsAddingDetailModalOpen(false);
            setNewDetailName('');
        }
    };
    
    const treasury = treasuriesList.find((t: any) => t.id === treasuryId);
    
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!numAmount || numAmount <= 0 || !notes.trim()) {
            alert('يرجى ملء مبلغ وبيان صحيحين.');
            return;
        }

        if (!level1AccountId || !level2AccountId) {
            alert('يرجى اختيار الفئة الرئيسية والمجموعة على الأقل.');
            return;
        }
        
        const finalAccountId = level3AccountId || level2AccountId;
        
        addTreasuryTransaction({
            date: new Date().toISOString().slice(0, 10),
            type: isDeposit ? 'سند قبض' : 'سند صرف',
            treasuryAccountId: treasuryId,
            treasuryAccountName: treasury.name,
            description: notes.trim(),
            amount: numAmount,
            partyType: 'account',
            partyId: finalAccountId,
        });

        onClose();
    };

    const level1Label = isDeposit ? '1. فئة الحساب' : '1. فئة المصروف';
    const level2Label = isDeposit ? '2. مجموعة الحساب' : '2. مجموعة المصروف';
    const level3Label = isDeposit ? '3. البند التفصيلي (اختياري)' : '3. البند التفصيلي (اختياري)';

    return (
        <>
            <Modal isOpen={isAddingWithdrawalParentModalOpen} onClose={() => setIsAddingWithdrawalParentModalOpen(false)} title="إضافة فئة مصروف رئيسية جديدة">
                <div className="p-4 space-y-4">
                    <div>
                        <label htmlFor="newParentNameW" className="block text-sm font-medium text-gray-700 mb-1">
                            سيتم الإضافة تحت: <span className="font-bold">{expenseRoot?.name}</span>
                        </label>
                        <input type="text" id="newParentNameW" value={newParentName} onChange={(e) => setNewParentName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ادخل اسم الفئة الجديدة" required />
                    </div>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAddingWithdrawalParentModalOpen(false)} className="btn-secondary">إلغاء</button><button type="button" onClick={handleAddNewParentAccount} className="btn-primary">حفظ</button></div>
                </div>
            </Modal>

            <Modal isOpen={isAddingDepositParentModalOpen} onClose={() => setIsAddingDepositParentModalOpen(false)} title="إضافة فئة حساب رئيسية جديدة">
                <div className="p-4 space-y-4">
                     <div>
                        <label htmlFor="depositRootSelect" className="block text-sm font-medium text-gray-700 mb-1">إضافة تحت</label>
                        <select id="depositRootSelect" value={newDepositParentRootId} onChange={e => setNewDepositParentRootId(e.target.value)} className="input-style w-full">
                            {revenueAndExpensesRoot && <option value={revenueAndExpensesRoot.id}>{revenueAndExpensesRoot.name}</option>}
                            {liabilityRoot && <option value={liabilityRoot.id}>{liabilityRoot.name}</option>}
                            {equityRoot && <option value={equityRoot.id}>{equityRoot.name}</option>}
                        </select>
                    </div>
                    <div>
                        <label htmlFor="newParentNameD" className="block text-sm font-medium text-gray-700 mb-1">اسم الفئة الجديدة</label>
                        <input type="text" id="newParentNameD" value={newParentName} onChange={(e) => setNewParentName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ادخل اسم الفئة الجديدة" required />
                    </div>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAddingDepositParentModalOpen(false)} className="btn-secondary">إلغاء</button><button type="button" onClick={handleAddNewParentAccount} className="btn-primary">حفظ</button></div>
                </div>
            </Modal>
            
            <Modal isOpen={isAddingGroupModalOpen} onClose={() => setIsAddingGroupModalOpen(false)} title="إضافة مجموعة جديدة">
                <div className="p-4 space-y-4">
                    <div>
                        <label htmlFor="newGroupName" className="block text-sm font-medium text-gray-700 mb-1">
                            سيتم الإضافة تحت: <span className="font-bold">{selectedLevel1Account?.name}</span>
                        </label>
                        <input type="text" id="newGroupName" value={newGroupName} onChange={(e) => setNewGroupName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ادخل اسم المجموعة الجديدة" required />
                    </div>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAddingGroupModalOpen(false)} className="btn-secondary">إلغاء</button><button type="button" onClick={handleAddNewGroupAccount} className="btn-primary">حفظ</button></div>
                </div>
            </Modal>
            
            <Modal isOpen={isAddingDetailModalOpen} onClose={() => setIsAddingDetailModalOpen(false)} title="إضافة بند تفصيلي جديد">
                 <div className="p-4 space-y-4">
                    <div>
                        <label htmlFor="newDetailName" className="block text-sm font-medium text-gray-700 mb-1">
                            سيتم الإضافة تحت: <span className="font-bold">{selectedLevel2Account?.name}</span>
                        </label>
                        <input type="text" id="newDetailName" value={newDetailName} onChange={(e) => setNewDetailName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md" placeholder="ادخل اسم البند الجديد" required />
                    </div>
                    <div className="flex justify-end gap-2"><button type="button" onClick={() => setIsAddingDetailModalOpen(false)} className="btn-secondary">إلغاء</button><button type="button" onClick={handleAddNewDetailedItem} className="btn-primary">حفظ</button></div>
                </div>
            </Modal>

            <form onSubmit={handleSubmit} className="space-y-4 p-4">
                 <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md text-sm"><div className="flex justify-between"><span>الخزينة:</span> <span className="font-bold">{treasury?.name}</span></div></div>
                
                <div>
                    <label htmlFor="level1AccountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{level1Label}</label>
                    <div className="flex items-center gap-2">
                        <select id="level1AccountId" value={level1AccountId} onChange={e => { setLevel1AccountId(e.target.value); setLevel2AccountId(''); setLevel3AccountId(''); }} required className="input-style w-full">
                            <option value="" disabled>-- اختر الفئة الرئيسية --</option>
                            {level1AccountOptions.map(acc => <option key={acc.id} value={acc.id}>{acc.name}</option>)}
                        </select>
                        <button type="button" onClick={() => isDeposit ? setIsAddingDepositParentModalOpen(true) : setIsAddingWithdrawalParentModalOpen(true)} className="btn-primary-small flex-shrink-0" title="إضافة فئة رئيسية جديدة">+ جديد</button>
                    </div>
                </div>

                {level1AccountId && (
                    <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/30">
                        <label htmlFor="level2AccountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{level2Label}</label>
                        <div className="flex items-center gap-2">
                            <select id="level2AccountId" value={level2AccountId} onChange={e => {setLevel2AccountId(e.target.value); setLevel3AccountId('');}} className="input-style w-full" required>
                                <option value="">-- اختر مجموعة --</option>
                                {level2AccountOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setIsAddingGroupModalOpen(true)} disabled={!level1AccountId} className="btn-primary-small flex-shrink-0" title="إضافة مجموعة جديدة">+ جديد</button>
                        </div>
                    </div>
                )}

                {selectedLevel2Account && (
                     <div className="p-2 border border-gray-200 dark:border-gray-700 rounded-md bg-gray-50 dark:bg-gray-900/30">
                        <label htmlFor="level3AccountId" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{level3Label}</label>
                        <div className="flex items-center gap-2">
                             <select id="level3AccountId" value={level3AccountId} onChange={e => setLevel3AccountId(e.target.value)} className="input-style w-full">
                                <option value="">-- اختياري --</option>
                                {level3AccountOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setIsAddingDetailModalOpen(true)} disabled={!selectedLevel2Account} className="btn-primary-small flex-shrink-0" title="إضافة بند تفصيلي جديد">+ جديد</button>
                        </div>
                    </div>
                )}

                <div>
                    <label htmlFor="amount" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ</label>
                    <input type="number" id="amount" value={amount} onChange={e => setAmount(e.target.value)} step="0.01" min="0.01" className="input-style w-full" required />
                </div>
                 <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البيان / ملاحظات</label>
                    <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} rows={3} className="input-style w-full" required />
                </div>
                <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                    <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                    <button type="submit" className={`btn-primary ${isDeposit ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}>
                        {isDeposit ? 'تأكيد الإيداع' : 'تأكيد الصرف'}
                    </button>
                </div>
            </form>
        </>
    );
};

export default GeneralTransactionForm;