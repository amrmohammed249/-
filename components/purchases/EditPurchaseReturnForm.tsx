import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import type { PurchaseReturn, LineItem, InventoryItem, Supplier } from '../../types';
import { PlusIcon, TrashIcon } from '../icons';

interface EditPurchaseReturnFormProps {
  purchaseReturn: PurchaseReturn;
  onClose: () => void;
  onSuccess: (updatedReturn: PurchaseReturn) => void;
}

const EditPurchaseReturnForm: React.FC<EditPurchaseReturnFormProps> = ({ purchaseReturn, onClose, onSuccess }) => {
  const { suppliers, inventory, updatePurchaseReturn, showToast } = useContext(DataContext);
  
  const [supplierId, setSupplierId] = useState(() => suppliers.find(s => s.name === purchaseReturn.supplier)?.id || '');
  const [date, setDate] = useState(purchaseReturn.date);
  const [originalPurchaseId, setOriginalPurchaseId] = useState(purchaseReturn.originalPurchaseId || '');
  const [lineItems, setLineItems] = useState<LineItem[]>(() => JSON.parse(JSON.stringify(purchaseReturn.items)));
  const [grandTotal, setGrandTotal] = useState(purchaseReturn.total);
  const [newItemId, setNewItemId] = useState('');

  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + item.total, 0);
    setGrandTotal(total);
  }, [lineItems]);

  const handleItemChange = (index: number, field: 'quantity' | 'price' | 'unitId', value: string) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
    if (!inventoryItem) return;

    if (field === 'unitId') {
      item.unitId = value;
      if (value === 'base') {
        item.unitName = inventoryItem.baseUnit;
        item.price = inventoryItem.purchasePrice;
      } else {
        const packingUnit = inventoryItem.units.find(u => u.id === value);
        if (packingUnit) {
          item.unitName = packingUnit.name;
          item.price = packingUnit.purchasePrice;
        }
      }
    } else {
      (item as any)[field] = parseFloat(value) || 0;
    }

    item.total = (item.quantity || 0) * (item.price || 0);
    setLineItems(updatedItems);
  };
  
  const addLineItem = () => {
    if (!newItemId) { showToast('الرجاء اختيار صنف أولاً.', 'error'); return; }
    const selectedInventoryItem = inventory.find((i: InventoryItem) => i.id === newItemId);
    if (!selectedInventoryItem) return;
    if (lineItems.some(li => li.itemId === newItemId)) { showToast('الصنف مضاف بالفعل.', 'error'); return; }
    
    setLineItems([...lineItems, { 
        itemId: newItemId, itemName: selectedInventoryItem.name, unitId: 'base',
        unitName: selectedInventoryItem.baseUnit, quantity: 1, price: selectedInventoryItem.purchasePrice, 
        discount: 0, total: selectedInventoryItem.purchasePrice 
    }]);
    setNewItemId('');
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lineItems.length === 0) {
      showToast('الرجاء اختيار مورد وإضافة بند واحد على الأقل.', 'error');
      return;
    }
    
    const supplierName = suppliers.find((s: any) => s.id === supplierId)?.name || 'غير معروف';
    const updatedReturnData: PurchaseReturn = {
      ...purchaseReturn,
      supplier: supplierName,
      date,
      originalPurchaseId,
      items: lineItems,
      subtotal: grandTotal,
      totalDiscount: 0,
      total: grandTotal,
    };
    const updatedReturn = updatePurchaseReturn(updatedReturnData);
    onSuccess(updatedReturn);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium">المورد</label>
            <select id="supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input-style w-full mt-1" required>
              <option value="">اختر مورد...</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium">تاريخ المرتجع</label>
            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="input-style w-full mt-1" required />
          </div>
        </div>
        <div className="border-t pt-4">
            {lineItems.map((line, index) => (
                <div key={line.itemId} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 rounded-md">
                    <input type="text" value={line.itemName} readOnly className="col-span-4 input-style bg-gray-100" />
                    <input type="text" value={line.unitName} readOnly className="col-span-2 input-style bg-gray-100" />
                    <input type="number" value={line.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 input-style" />
                    <input type="number" value={line.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="col-span-2 input-style" />
                    <input type="text" value={line.total.toLocaleString()} readOnly className="col-span-1 input-style bg-gray-100" />
                    <button type="button" onClick={() => removeLineItem(index)} className="col-span-1 text-red-500"><TrashIcon className="w-5 h-5" /></button>
                </div>
            ))}
        </div>
        <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" className="btn-primary">حفظ التعديلات</button>
        </div>
    </form>
  );
};

export default EditPurchaseReturnForm;
