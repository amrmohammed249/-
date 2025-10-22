import React, { useState, useContext, useMemo, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { InventoryItem, AccountNode, InventoryAdjustment, InventoryAdjustmentLineItem } from '../../types';
import { PlusIcon, TrashIcon } from '../icons';
import Modal from '../shared/Modal';
import AddAccountForm from '../accounts/AddAccountForm';

interface FormProps {
    onClose: () => void;
    onSuccess: (updatedAdjustment: InventoryAdjustment) => void;
    adjustment: InventoryAdjustment;
}

const EditInventoryAdjustmentForm: React.FC<FormProps> = ({ onClose, onSuccess, adjustment }) => {
    const { inventory, chartOfAccounts, updateInventoryAdjustment, showToast, generalSettings } = useContext(DataContext);
    
    const [date, setDate] = useState(adjustment.date);
    const [type, setType] = useState<'إضافة' | 'صرف'>(adjustment.type);
    const [contraAccountId, setContraAccountId] = useState(adjustment.contraAccountId);
    const [description, setDescription] = useState(adjustment.description);
    const [items, setItems] = useState<Partial<InventoryAdjustmentLineItem>[]>(() => JSON.parse(JSON.stringify(adjustment.items)));
    const [newItemId, setNewItemId] = useState('');
    const [totalValue, setTotalValue] = useState(adjustment.totalValue);
    const [itemErrors, setItemErrors] = useState<Record<string, string>>({});
    const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);

    const contraAccountOptions = useMemo(() => {
        const flatten = (nodes: AccountNode[]): AccountNode[] => {
            return nodes.reduce<AccountNode[]>((acc, node) => {
                if (node.children && node.children.length > 0) {
                    return [...acc, ...flatten(node.children)];
                }
                acc.push(node);
                return acc;
            }, []);
        };

        const controlAccountCodes = ['1103', '1104', '2101', '1101']; // Customers, Inventory, Suppliers, Treasury
        const forbiddenIds = flatten(chartOfAccounts)
            .filter(acc => controlAccountCodes.some(code => acc.code.startsWith(code)))
            .map(acc => acc.id);
        
        let relevantNodes: AccountNode[] = [];
        if (type === 'صرف') { // Expenses
            const expenseRoot = chartOfAccounts.find(n => n.code === '4000')?.children?.find(n => n.code === '4200');
            if (expenseRoot) relevantNodes = flatten([expenseRoot]);
        } else { // Addition (Equity, Other Revenue, etc.)
            const equityRoot = chartOfAccounts.find(n => n.code === '3000');
            const otherRevenueRoot = chartOfAccounts.find(n => n.code === '4000')?.children?.find(n => n.code === '4300');
            if(equityRoot) relevantNodes.push(...flatten([equityRoot]));
            if(otherRevenueRoot) relevantNodes.push(...flatten([otherRevenueRoot]));
        }

        return relevantNodes.filter(acc => !forbiddenIds.includes(acc.id)).sort((a,b) => a.code.localeCompare(b.code));
    }, [chartOfAccounts, type]);

    const { expenseRoot, otherRevenueRoot } = useMemo(() => ({
        expenseRoot: chartOfAccounts.find((n: AccountNode) => n.code === '4000')?.children?.find((n: AccountNode) => n.code === '4200'),
        otherRevenueRoot: chartOfAccounts.find((n: AccountNode) => n.code === '4000')?.children?.find((n: AccountNode) => n.code === '4300'),
    }), [chartOfAccounts]);

    const newAccountParentId = useMemo(() => {
        return type === 'صرف' ? expenseRoot?.id : otherRevenueRoot?.id;
    }, [type, expenseRoot, otherRevenueRoot]);
    
    useEffect(() => {
        const total = items.reduce((sum, item) => sum + (item.total || 0), 0);
        setTotalValue(total);
    }, [items]);
    
    const handleAccountAdded = (newAccount: AccountNode) => {
        setIsAddAccountModalOpen(false);
        setContraAccountId(newAccount.id);
        showToast(`تمت إضافة الحساب "${newAccount.name}" واختياره.`, 'success');
    };

    const handleAddItem = () => {
        if (!newItemId) return;
        if (items.some(i => i.itemId === newItemId)) {
            showToast('الصنف مضاف بالفعل.', 'warning');
            return;
        }
        const inventoryItem = inventory.find((i: InventoryItem) => i.id === newItemId);
        if (!inventoryItem) return;

        setItems([...items, {
            itemId: inventoryItem.id,
            itemName: inventoryItem.name,
            quantity: 1,
            cost: inventoryItem.purchasePrice,
            total: inventoryItem.purchasePrice,
        }]);
        setNewItemId('');
    };
    
    const handleItemChange = (index: number, quantity: string) => {
        const newItems = [...items];
        const item = newItems[index];
        const numQuantity = parseFloat(quantity) || 0;
        
        if (type === 'صرف' && !generalSettings.allowNegativeStock) {
            const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
            if(inventoryItem){
                const originalItem = adjustment.items.find(i => i.itemId === item.itemId);
                const originalQuantity = originalItem ? originalItem.quantity : 0;
                
                const availableStockForEdit = inventoryItem.stock + originalQuantity;

                if (numQuantity > availableStockForEdit) {
                    setItemErrors(prev => ({...prev, [item.itemId!]: `المتاح: ${availableStockForEdit}`}));
                } else {
                     setItemErrors(prev => {
                        const newErrors = {...prev};
                        delete newErrors[item.itemId!];
                        return newErrors;
                    });
                }
            }
        }
        
        item.quantity = numQuantity;
        item.total = numQuantity * (item.cost || 0);
        setItems(newItems);
    };
    
    const handleRemoveItem = (index: number) => {
        const itemToRemove = items[index];
        setItems(items.filter((_, i) => i !== index));
        if (itemToRemove) {
            setItemErrors(prev => {
                const newErrors = {...prev};
                delete newErrors[itemToRemove.itemId!];
                return newErrors;
            });
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!contraAccountId || items.length === 0) {
            showToast('يرجى اختيار حساب مقابل وإضافة صنف واحد على الأقل.', 'error');
            return;
        }
        if (Object.keys(itemErrors).length > 0) {
            showToast('لا يمكن حفظ التسوية بسبب وجود أخطاء في الكميات.', 'error');
            return;
        }

        const finalItems = items.map(item => ({
            itemId: item.itemId!,
            itemName: item.itemName!,
            quantity: item.quantity!,
            cost: item.cost!,
            total: item.total!,
        }));
        
        const contraAccount = contraAccountOptions.find(acc => acc.id === contraAccountId);
        if (!contraAccount) {
             showToast('الحساب المقابل غير صالح.', 'error');
             return;
        }
        try {
            const updatedAdjustmentData: InventoryAdjustment = {
                ...adjustment,
                date,
                type,
                contraAccountId,
                contraAccountName: contraAccount.name,
                description,
                items: finalItems,
                totalValue
            };
            const updated = updateInventoryAdjustment(updatedAdjustmentData);
            onSuccess(updated);
        } catch(error: any) {
            showToast(error.message, 'error');
        }
    };

    return (
        <>
            <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                        <label htmlFor="date" className="input-label">التاريخ</label>
                        <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="input-style w-full mt-1" required/>
                    </div>
                    <div>
                        <label htmlFor="type" className="input-label">نوع التسوية</label>
                        <select id="type" value={type} onChange={e => setType(e.target.value as any)} className="input-style w-full mt-1 bg-gray-100 dark:bg-gray-800" required disabled>
                            <option value="صرف">صرف (تخفيض كمية)</option>
                            <option value="إضافة">إضافة (زيادة كمية)</option>
                        </select>
                    </div>
                    <div>
                        <label htmlFor="contraAccountId" className="input-label">الحساب المقابل</label>
                        <div className="flex items-center gap-2 mt-1">
                            <select id="contraAccountId" value={contraAccountId} onChange={e => setContraAccountId(e.target.value)} className="input-style w-full" required>
                                <option value="">-- اختر حساب --</option>
                                {contraAccountOptions.map(acc => <option key={acc.id} value={acc.id}>{acc.code} - {acc.name}</option>)}
                            </select>
                            <button type="button" onClick={() => setIsAddAccountModalOpen(true)} className="p-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500 flex-shrink-0" title="إضافة حساب جديد">
                                <PlusIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="lg:col-span-3">
                        <label htmlFor="description" className="input-label">البيان/الوصف</label>
                        <input type="text" id="description" value={description} onChange={e => setDescription(e.target.value)} className="input-style w-full mt-1" placeholder="مثال: جرد سنوي، بضاعة تالفة..." required/>
                    </div>
                </div>

                <div className="border-t pt-4">
                    {items.map((item, index) => {
                        const error = item.itemId ? itemErrors[item.itemId] : undefined;
                        return (
                            <div key={index} className="grid grid-cols-12 gap-2 items-start mb-2">
                                <span className="col-span-5 font-medium self-center">{item.itemName}</span>
                                <div className="col-span-2">
                                    <input type="number" value={item.quantity} onChange={e => handleItemChange(index, e.target.value)} className={`input-style w-full ${error ? 'border-red-500' : ''}`} placeholder="الكمية" min="0.01" step="any"/>
                                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                                </div>
                                <span className="col-span-2 text-center self-center">{item.cost?.toLocaleString()} (للوحدة)</span>
                                <span className="col-span-2 text-center font-semibold self-center">{item.total?.toLocaleString()}</span>
                                <button type="button" onClick={() => handleRemoveItem(index)} className="col-span-1 text-red-500 hover:text-red-700 self-center">
                                    <TrashIcon className="w-5 h-5"/>
                                </button>
                            </div>
                        )
                    })}
                    <div className="flex items-center space-x-2 space-x-reverse mt-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                        <select value={newItemId} onChange={e => setNewItemId(e.target.value)} className="input-style w-full">
                            <option value="">-- اختر صنف للإضافة --</option>
                            {inventory.map(i => <option key={i.id} value={i.id}>{i.name} (المتاح: {i.stock})</option>)}
                        </select>
                        <button type="button" onClick={handleAddItem} className="btn-primary-small flex-shrink-0">
                            <PlusIcon className="w-4 h-4 mr-1"/> إضافة
                        </button>
                    </div>
                </div>

                <div className="border-t pt-4 flex justify-end">
                    <div className="text-left w-full max-w-sm">
                        <p className="text-sm text-gray-500">القيمة الإجمالية للتسوية</p>
                        <p className="text-2xl font-bold font-mono">{totalValue.toLocaleString()} جنيه</p>
                    </div>
                </div>

                <div className="mt-6 flex justify-end gap-2">
                    <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
                    <button type="submit" className="btn-primary" disabled={Object.keys(itemErrors).length > 0}>حفظ التعديلات</button>
                </div>
            </form>
            {isAddAccountModalOpen && (
                <Modal isOpen={isAddAccountModalOpen} onClose={() => setIsAddAccountModalOpen(false)} title="إضافة حساب جديد">
                    <AddAccountForm 
                        onClose={() => setIsAddAccountModalOpen(false)} 
                        onSuccess={handleAccountAdded}
                        parentId={newAccountParentId || null} 
                    />
                </Modal>
            )}
        </>
    );
};

export default EditInventoryAdjustmentForm;