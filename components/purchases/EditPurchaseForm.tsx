

import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { Purchase, LineItem, InventoryItem } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';

const EditPurchaseForm: React.FC<{ purchase: Purchase; onClose: () => void }> = ({ purchase, onClose }) => {
  const { suppliers, inventory, updatePurchase, showToast } = useContext(DataContext);
  
  const initialSupplierId = suppliers.find(s => s.name === purchase.supplier)?.id || '';
  
  const [formData, setFormData] = useState({
      date: purchase.date,
      status: purchase.status,
  });
  const [supplierId, setSupplierId] = useState(initialSupplierId);
  const [lineItems, setLineItems] = useState<LineItem[]>(() => JSON.parse(JSON.stringify(purchase.items)));
  const [grandTotal, setGrandTotal] = useState(purchase.total);
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
        item.price = inventoryItem.purchasePrice;
      } else {
        const packingUnit = inventoryItem.units.find(u => u.id === value);
        if (packingUnit) {
          item.unitName = packingUnit.name;
          item.price = packingUnit.purchasePrice;
        }
      }
    } else if (field === 'quantity') {
      item.quantity = parseFloat(value) || 0;
    } else {
      item.price = parseFloat(value) || 0;
    }
    
    item.total = item.quantity * item.price;
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
      price: selectedInventoryItem.purchasePrice, 
      discount: 0,
      total: selectedInventoryItem.purchasePrice
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
     if (!supplierId || lineItems.length === 0) {
      showToast('الرجاء اختيار مورد وإضافة بند واحد على الأقل.', 'error');
      return;
    }
    
    const subtotal = lineItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const totalDiscount = lineItems.reduce((sum, item) => sum + item.discount, 0);

    const updatedPurchaseData: Purchase = {
        ...purchase,
        ...formData,
        supplier: suppliers.find((s: any) => s.id === supplierId)?.name || 'غير معروف',
        items: lineItems,
        subtotal,
        totalDiscount,
        total: grandTotal,
    };
    updatePurchase(updatedPurchaseData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المورد</label>
          <select id="supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input-style w-full mt-1" required>
            <option value="">اختر مورد...</option>
            {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </div>
        <div>
          <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
          <input type="date" id="date" value={formData.date} onChange={handleChange} className="input-style w-full mt-1" required />
        </div>
         <div>
          <label htmlFor="status" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الحالة</label>
          <select id="status" value={formData.status} onChange={handleChange} className="input-style w-full mt-1" required>
             <option>مستحقة</option>
             <option>مدفوعة</option>
          </select>
        </div>
      </div>
      
      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 space-x-reverse mb-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
            <select value={newItemId} onChange={e => setNewItemId(e.target.value)} className="input-style w-full">
                <option value="">-- اختر صنف للإضافة --</option>
                {inventory.map((i: InventoryItem) => <option key={i.id} value={i.id}>{i.name}</option>)}
            </select>
            <button type="button" onClick={addLineItem} className="flex-shrink-0 flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                <PlusIcon className="w-4 h-4 ml-1" />
                إضافة بند
            </button>
        </div>
        
         {lineItems.length > 0 && (
          <div className="grid grid-cols-12 gap-2 text-sm font-semibold text-gray-600 dark:text-gray-300 mb-1 px-2">
            <div className="col-span-4">الصنف</div>
            <div className="col-span-2">الوحدة</div>
            <div className="col-span-2">الكمية</div>
            <div className="col-span-2">السعر</div>
            <div className="col-span-1">الإجمالي</div>
            <div className="col-span-1"></div>
          </div>
        )}

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
              <input type="number" value={line.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 input-style" placeholder="الكمية" min="0.01" step="any"/>
              <input type="number" value={line.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="col-span-2 input-style" placeholder="السعر" step="any" min="0"/>
              <input type="text" value={line.total.toLocaleString()} readOnly className="col-span-1 input-style bg-gray-100 dark:bg-gray-800" placeholder="الإجمالي" />
              <button type="button" onClick={() => removeLineItem(index)} className="col-span-1 text-red-500 hover:text-red-700">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          );
        })}
      </div>

       <div className="border-t pt-4 flex justify-end">
        <div className="w-full max-w-sm space-y-2 text-gray-700 dark:text-gray-200">
            <div className="flex justify-between text-lg font-bold">
                <span>الإجمالي الجديد:</span>
                <span className="font-mono">{grandTotal.toLocaleString()} جنيه مصري</span>
            </div>
        </div>
      </div>
      
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
        <button type="submit" className="btn-primary">حفظ التعديلات</button>
      </div>
    </form>
  );
};

export default EditPurchaseForm;