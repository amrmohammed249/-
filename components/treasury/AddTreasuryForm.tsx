import React, { useState, useContext, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import type { Account } from '../../types';

const AddTreasuryForm: React.FC<{onClose: () => void}> = ({onClose}) => {
    const [name, setName] = useState('');
    const { addAccount, chartOfAccounts, showToast } = useContext(DataContext);
    
    const treasuryRootNode = useMemo(() => {
        const findNodeByCode = (nodes: Account[], code: string): Account | null => {
            for (const node of nodes) {
                if (node.code === code) return node;
                if (node.children) {
                    const found = findNodeByCode(node.children, code);
                    if (found) return found;
                }
            }
            return null;
        };
        return findNodeByCode(chartOfAccounts, '1101');
    }, [chartOfAccounts]);


    const getNextTreasuryCode = (): string => {
        if (!treasuryRootNode) return '110101'; // Fallback
        if (!treasuryRootNode.children || treasuryRootNode.children.length === 0) {
            return `${treasuryRootNode.code}01`;
        }
        
        const existingCodes = treasuryRootNode.children
            .map(child => parseInt(child.code, 10))
            .filter(code => !isNaN(code));
    
        if (existingCodes.length === 0) {
            return `${treasuryRootNode.code}01`;
        }
    
        const maxCode = Math.max(...existingCodes);
        return (maxCode + 1).toString();
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(name.trim() && treasuryRootNode) {
            addAccount({
                name: name.trim(), 
                code: getNextTreasuryCode(), 
                parentId: treasuryRootNode.id
            });
            showToast('تمت إضافة الخزينة بنجاح.');
            onClose();
        } else {
            showToast('حدث خطأ. لم يتم العثور على حساب الخزينة الرئيسي.', 'error');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4 p-4">
            <div>
                <label htmlFor="treasuryName" className="block text-sm font-medium text-gray-700 mb-1">اسم الخزينة الجديدة</label>
                <input type="text" id="treasuryName" value={name} onChange={e => setName(e.target.value)} className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
            </div>
            <div className="flex justify-end space-x-2 space-x-reverse pt-2">
                <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
                <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">إضافة الخزينة</button>
            </div>
        </form>
    );
};

export default AddTreasuryForm;