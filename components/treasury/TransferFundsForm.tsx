import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';

const TransferFundsForm: React.FC<{
    fromTreasuryId: string;
    onClose: () => void;
}> = ({ fromTreasuryId, onClose }) => {
    const { treasuriesList, transferTreasuryFunds } = useContext(DataContext);
    const [toTreasuryId, setToTreasuryId] = useState('');
    const [amount, setAmount] = useState('');
    const [notes, setNotes] = useState('');
    
    const fromTreasury = treasuriesList.find((t: any) => t.id === fromTreasuryId);
    const toTreasuryOptions = treasuriesList.filter((t: any) => t.id !== fromTreasuryId && !t.isTotal);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        const numAmount = parseFloat(amount);
        if (!toTreasuryId || !numAmount || numAmount <= 0) {
            alert('يرجى ملء جميع الحقول بشكل صحيح.');
            return;
        }
        transferTreasuryFunds(fromTreasuryId, toTreasuryId, numAmount, notes.trim());
        onClose();
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div className="bg-gray-50 p-3 rounded-md space-y-2 text-sm">
                <div className="flex justify-between">
                    <span>من خزينة:</span>
                    <span className="font-bold">{fromTreasury?.name}</span>
                </div>
            </div>
            <div>
                <label htmlFor="toTreasuryId" className="block text-sm font-medium text-gray-700 mb-1">إلى خزينة</label>
                <select 
                    id="toTreasuryId" 
                    value={toTreasuryId} 
                    onChange={e => setToTreasuryId(e.target.value)} 
                    required 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md bg-white"
                >
                    <option value="" disabled>-- اختر الخزينة الهدف --</option>
                    {toTreasuryOptions.map((t: any) => (
                        <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label htmlFor="amount" className="block text-sm font-medium text-gray-700 mb-1">المبلغ المحوّل</label>
                <input 
                    type="number" 
                    id="amount" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)} 
                    step="0.01" 
                    min="0.01" 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                    required 
                />
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">البيان / ملاحظات (اختياري)</label>
                <textarea 
                    id="notes" 
                    value={notes} 
                    onChange={e => setNotes(e.target.value)} 
                    rows={3} 
                    className="w-full px-3 py-2 border border-gray-300 rounded-md" 
                />
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">تأكيد التحويل</button>
            </div>
        </form>
    );
};

export default TransferFundsForm;