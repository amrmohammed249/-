
import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { AccountNode, Customer } from '../../types';

interface CustomerNoteFormProps {
    customer: Customer;
    onClose: () => void;
    onSuccess: () => void;
}

// Helper to flatten account tree
const flattenAccounts = (nodes: AccountNode[]): AccountNode[] => {
    return nodes.reduce<AccountNode[]>((acc, node) => {
        acc.push(node);
        if (node.children && node.children.length > 0) {
            acc.push(...flattenAccounts(node.children));
        }
        return acc;
    }, []);
};

const CustomerNoteForm: React.FC<CustomerNoteFormProps> = ({ customer, onClose, onSuccess }) => {
    const { chartOfAccounts, addJournalEntry, showToast } = useContext(DataContext);
    
    const [noteType, setNoteType] = useState<'credit' | 'debit'>('credit');
    const [amount, setAmount] = useState('');
    const [contraAccountId, setContraAccountId] = useState('');
    const [description, setDescription] = useState('');
    const [date, setDate] = useState(new Date().toISOString().slice(0, 10));

    // Get Customer Control Account (Assets -> Current Assets -> Customers)
    const customerControlAccount = useMemo(() => {
        const flat = flattenAccounts(chartOfAccounts);
        return flat.find(a => a.code === '1103');
    }, [chartOfAccounts]);

    // Available Contra Accounts
    const contraAccountOptions = useMemo(() => {
        const flat = flattenAccounts(chartOfAccounts);
        // Exclude root nodes and the customer control account itself
        return flat.filter(a => a.code.length > 1 && a.code !== '1103').sort((a,b) => a.code.localeCompare(b.code));
    }, [chartOfAccounts]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        
        if (!numAmount || numAmount <= 0) {
            showToast('الرجاء إدخال مبلغ صحيح.', 'error');
            return;
        }
        if (!contraAccountId) {
            showToast('الرجاء اختيار الحساب المقابل.', 'error');
            return;
        }
        if (!customerControlAccount) {
            showToast('خطأ في إعدادات النظام: حساب العملاء الرئيسي غير موجود.', 'error');
            return;
        }

        const contraAccount = contraAccountOptions.find(a => a.id === contraAccountId);
        
        // Construct Journal Entry Lines
        const lines = [];
        
        // Logic for Customers (Asset Account):
        // Balance increases with Debit, decreases with Credit.
        
        if (noteType === 'credit') {
            // Credit Note (إشعار دائن) -> Reduces Customer Balance (They owe less)
            // Example: Sales Discount, Return (if not through return invoice)
            // Debit: Contra Account (e.g., Discount Allowed)
            // Credit: Customer Control Account
            lines.push({
                accountId: contraAccountId,
                accountName: contraAccount?.name || 'غير معروف',
                debit: numAmount,
                credit: 0
            });
            lines.push({
                accountId: customerControlAccount.id,
                accountName: customerControlAccount.name,
                debit: 0,
                credit: numAmount
            });
        } else {
            // Debit Note (إشعار مدين) -> Increases Customer Balance (They owe more)
            // Example: Undercharge correction, Service fees
            // Debit: Customer Control Account
            // Credit: Contra Account (e.g., Service Revenue)
            lines.push({
                accountId: customerControlAccount.id,
                accountName: customerControlAccount.name,
                debit: numAmount,
                credit: 0
            });
            lines.push({
                accountId: contraAccountId,
                accountName: contraAccount?.name || 'غير معروف',
                debit: 0,
                credit: numAmount
            });
        }

        addJournalEntry({
            date,
            description: `${noteType === 'credit' ? 'إشعار دائن' : 'إشعار مدين'} - ${customer.name} - ${description}`,
            debit: numAmount,
            credit: numAmount,
            status: 'مرحل',
            lines: lines,
            relatedPartyId: customer.id,
            relatedPartyType: 'customer',
            relatedPartyName: customer.name
        });

        showToast('تم حفظ التسوية بنجاح.', 'success');
        onSuccess();
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="bg-gray-50 dark:bg-gray-700/30 p-3 rounded-md mb-4 border border-gray-200 dark:border-gray-600">
                <p className="text-sm font-semibold">العميل: <span className="text-blue-600 dark:text-blue-400">{customer.name}</span></p>
                <p className="text-xs text-gray-500">الرصيد الحالي: {customer.balance.toLocaleString()} جنيه</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">نوع الإشعار</label>
                    <div className="flex gap-4">
                        <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${noteType === 'credit' ? 'bg-green-50 border-green-500 text-green-700 ring-1 ring-green-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                            <input type="radio" name="noteType" value="credit" checked={noteType === 'credit'} onChange={() => setNoteType('credit')} className="mr-2" />
                            <div>
                                <span className="font-bold">إشعار دائن (Credit Note)</span>
                                <p className="text-xs opacity-75">يقلل رصيد العميل (له)</p>
                            </div>
                        </label>
                        <label className={`flex-1 flex items-center justify-center p-3 rounded-lg border cursor-pointer transition-colors ${noteType === 'debit' ? 'bg-red-50 border-red-500 text-red-700 ring-1 ring-red-500' : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'}`}>
                            <input type="radio" name="noteType" value="debit" checked={noteType === 'debit'} onChange={() => setNoteType('debit')} className="mr-2" />
                            <div>
                                <span className="font-bold">إشعار مدين (Debit Note)</span>
                                <p className="text-xs opacity-75">يزيد رصيد العميل (عليه)</p>
                            </div>
                        </label>
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">المبلغ</label>
                    <input type="number" value={amount} onChange={e => setAmount(e.target.value)} className="input-style w-full" min="0.01" step="any" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">التاريخ</label>
                    <input type="date" value={date} onChange={e => setDate(e.target.value)} className="input-style w-full" required />
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">الحساب المقابل</label>
                    <select value={contraAccountId} onChange={e => setContraAccountId(e.target.value)} className="input-style w-full" required>
                        <option value="">-- اختر الحساب --</option>
                        {contraAccountOptions.map(acc => (
                            <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>
                        ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">
                        {noteType === 'credit' ? 'مثال: خصم مسموح به، مردودات مبيعات (تسوية)' : 'مثال: إيرادات خدمات، فروقات أسعار'}
                    </p>
                </div>

                <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">البيان / السبب</label>
                    <input type="text" value={description} onChange={e => setDescription(e.target.value)} className="input-style w-full" required placeholder="مثال: خصم خاص، تصحيح خطأ..." />
                </div>
            </div>

            <div className="flex justify-end space-x-2 space-x-reverse pt-4 border-t dark:border-gray-700">
                <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                <button type="submit" className="btn-primary">حفظ الإشعار</button>
            </div>
        </form>
    );
};

export default CustomerNoteForm;
