import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import type { SaleReturn, LineItem, InventoryItem, Customer } from '../../types';
import { PlusIcon, TrashIcon } from '../icons';

const EditSaleReturnForm: React.FC<{ saleReturn: SaleReturn; onClose: () => void; onSuccess: (updatedReturn: SaleReturn) => void; }> = ({ saleReturn, onClose, onSuccess }) => {
  const { customers, inventory, updateSaleReturn, showToast } = useContext(DataContext);
  
  const initialCustomerId = customers.find((c: Customer) => c.name === saleReturn.customer)?.id || '';
  
  const [formData, setFormData] = useState({
      date: saleReturn.date,
      originalSaleId: saleReturn.originalSaleId || ''
  });
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [lineItems, setLineItems] = useState<LineItem[]>(() => JSON.parse(JSON.stringify(saleReturn.items)));
  const [grandTotal, setGrandTotal] = useState(saleReturn.total);
  const [newItemId, setNewItemId] = useState('');

  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + item.total, 0);
    setGrandTotal(total);
  }, [lineItems]);

  const handleItemChange = (index: number, field: 'quantity' | 'price' | 'unitId', value: any) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
    if (!inventoryItem) return;

    if (field === 'unitId') {
      item.unitId = value;
      if (value === 'base') {
        item.unitName = inventoryItem.baseUnit;
        item.price = inventoryItem.salePrice;
      } else {
        const packingUnit = inventoryItem.units.find(u => u.id === value);
        if (packingUnit) {
          item.unitName = packingUnit.name;
          item.price = packingUnit.salePrice;
        }
      }
    } else {
       (item as any)[field] = parseFloat(value) || 0;
    }

    item.total = (item.quantity || 0) * (item.price || 0);
    setLineItems(updatedItems);
  };
  
  const addLineItem = () => {
    if (!newItemId) {
      showToast('الرجاء اختيار صنف أولاً.', 'error');
      return;
    }
    const selectedInventoryItem = inventory.find((i: InventoryItem) => i.id === newItemId);
    if (!selectedInventoryItem) return;

    if (lineItems.some(li => li.itemId === newItemId)) {
        showToast('الصنف مضاف بالفعل.', 'error');
        return;
    }
    
    const newLine: LineItem = { 
        itemId: newItemId, 
        itemName: selectedInventoryItem.name,
        unitId: 'base',
        unitName: selectedInventoryItem.baseUnit,
        quantity: 1, 
        price: selectedInventoryItem.salePrice, 
        discount: 0,
        total: selectedInventoryItem.salePrice 
    };

    setLineItems([...lineItems, newLine]);
    setNewItemId('');
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
     if (!customerId || lineItems.length === 0) {
      showToast('الرجاء اختيار عميل وإضافة بند واحد على الأقل.', 'error');
      return;
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);

    const updatedReturnData: SaleReturn = {
        ...saleReturn,
        ...formData,
        customer: customers.find((c: any) => c.id === customerId)?.name || 'غير معروف',
        items: lineItems,
        subtotal: subtotal,
        totalDiscount: 0,
        total: subtotal,
    };
    const updatedReturn = updateSaleReturn(updatedReturnData);
    onSuccess(updatedReturn);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="customer" className="block text-sm font-medium">العميل</label>
            <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className="input-style w-full mt-1" required>
              <option value="">اختر عميل...</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium">تاريخ المرتجع</label>
            <input type="date" id="date" value={formData.date} onChange={handleChange} className="input-style w-full mt-1" required />
          </div>
        </div>
        <div className="border-t pt-4">
            {lineItems.map((line, index) => {
                const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
                const unitOptions = inventoryItem ? [
                    { id: 'base', name: inventoryItem.baseUnit },
                    ...inventoryItem.units.map(u => ({ id: u.id, name: u.name }))
                ] : [];
                return (
                    <div key={line.itemId} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/20">
                        <input type="text" value={line.itemName} readOnly className="col-span-4 input-style bg-gray-100 dark:bg-gray-800" />
                        <select value={line.unitId} onChange={e => handleItemChange(index, 'unitId', e.target.value)} className="col-span-2 input-style">
                          {unitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
                        </select>
                        <input type="number" value={line.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 input-style" />
                        <input type="number" value={line.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="col-span-2 input-style" />
                        <input type="text" value={line.total.toLocaleString()} readOnly className="col-span-1 input-style bg-gray-100 dark:bg-gray-800" />
                        <button type="button" onClick={() => removeLineItem(index)} className="col-span-1 text-red-500"><TrashIcon className="w-5 h-5" /></button>
                    </div>
                );
            })}
             <div className="flex items-center space-x-2 space-x-reverse mt-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <select value={newItemId} onChange={e => setNewItemId(e.target.value)} className="input-style w-full">
                  <option value="">-- اختر صنف للإضافة --</option>
                  {inventory.map((i: InventoryItem) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <button type="button" onClick={addLineItem} className="flex-shrink-0 flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <PlusIcon className="w-4 h-4 ml-1" />
                  إضافة
              </button>
          </div>
        </div>
        <div className="border-t pt-4 flex justify-end items-center">
            <div className="text-left">
                <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي قيمة المرتجع</p>
                <p className="text-2xl font-bold font-mono">{grandTotal.toLocaleString()} جنيه مصري</p>
            </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" className="btn-primary">حفظ التعديلات</button>
        </div>
    </form>
  );
};

export default EditSaleReturnForm;
