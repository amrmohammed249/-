

import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import type { Sale, LineItem, InventoryItem, Customer } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import { InformationCircleIcon } from '../icons/InformationCircleIcon';

interface EditLineItem extends LineItem {
  availableStock: number;
}

const EditSaleForm: React.FC<{ sale: Sale; onClose: () => void }> = ({ sale, onClose }) => {
  const { customers, inventory, updateSale, showToast, sales } = useContext(DataContext);
  
  const initialCustomerId = customers.find(c => c.name === sale.customer)?.id || '';
  
  const [formData, setFormData] = useState({
      date: sale.date,
      status: sale.status,
  });
  const [customerId, setCustomerId] = useState(initialCustomerId);
  const [lineItems, setLineItems] = useState<LineItem[]>(() => JSON.parse(JSON.stringify(sale.items)));
  const [grandTotal, setGrandTotal] = useState(sale.total);
  const [newItemId, setNewItemId] = useState('');

  const [activeLineIndex, setActiveLineIndex] = useState<number | null>(null);
  const [lastPriceInfo, setLastPriceInfo] = useState<string>('');

  useEffect(() => {
    const total = lineItems.reduce((sum, item) => sum + item.total, 0);
    setGrandTotal(total);
  }, [lineItems]);

  useEffect(() => {
    if (activeLineIndex === null || !customerId || lineItems.length <= activeLineIndex) {
      setLastPriceInfo('');
      return;
    }

    const activeLineItem = lineItems[activeLineIndex];
    if (!activeLineItem) {
      setLastPriceInfo('');
      return;
    }

    const itemId = activeLineItem.itemId;
    const customerName = customers.find((c: Customer) => c.id === customerId)?.name;

    if (!customerName) {
      setLastPriceInfo('');
      return;
    }

    // Find the last sale for this customer and item, excluding the current sale being edited
    const customerSales = sales
      .filter((s: Sale) => s.customer === customerName && s.id !== sale.id && !s.isArchived)
      .sort((a: Sale, b: Sale) => new Date(b.date).getTime() - new Date(a.date).getTime());

    let foundPrice: { price: number; date: string; unitName: string } | null = null;

    for (const s of customerSales) {
      const itemInSale = s.items.find(item => item.itemId === itemId);
      if (itemInSale) {
        foundPrice = { price: itemInSale.price, date: s.date, unitName: itemInSale.unitName };
        break;
      }
    }
    
    if (foundPrice) {
      setLastPriceInfo(`آخر سعر بيع لهذا العميل كان ${foundPrice.price.toLocaleString()} جنيه (${foundPrice.unitName}) بتاريخ ${foundPrice.date}.`);
    } else {
      setLastPriceInfo('لا يوجد سجل أسعار سابق لهذا الصنف مع هذا العميل.');
    }
  }, [activeLineIndex, customerId, lineItems, sales, customers, sale.id]);


  const handleItemChange = (index: number, field: 'quantity' | 'price' | 'unitId', value: any) => {
    const updatedItems = [...lineItems];
    const item = updatedItems[index];
    const inventoryItem = inventory.find((i: InventoryItem) => i.id === item.itemId);
    if (!inventoryItem) return;

    // Find original quantity in base units to calculate available stock for this specific sale edit
    const originalSaleItem = sale.items.find(i => i.itemId === item.itemId);
    let originalQuantityInBaseUnit = 0;
    if (originalSaleItem) {
        const originalInventoryItemDetails = inventory.find((i: InventoryItem) => i.id === originalSaleItem.itemId);
        if (originalInventoryItemDetails) {
            let factor = 1;
            if (originalSaleItem.unitId !== 'base') {
                const packingUnit = originalInventoryItemDetails.units.find(u => u.id === originalSaleItem.unitId);
                if (packingUnit) factor = packingUnit.factor;
            }
            originalQuantityInBaseUnit = originalSaleItem.quantity * factor;
        }
    }
    
    // Total stock available for this sale = current stock + what was originally sold
    const availableStockForSale = inventoryItem.stock + originalQuantityInBaseUnit;

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
      item.quantity = 1; // Reset to re-trigger validation

    } else if (field === 'quantity') {
       const newQuantity = parseFloat(value) || 0;
      
      let quantityInBaseUnit = newQuantity;
      let factor = 1;
      if (item.unitId !== 'base') {
          const packingUnit = inventoryItem.units.find(u => u.id === item.unitId);
          if (packingUnit && packingUnit.factor > 0) {
              factor = packingUnit.factor;
              quantityInBaseUnit = newQuantity * factor;
          }
      }

      if (quantityInBaseUnit > availableStockForSale) {
          showToast(`الكمية المطلوبة تتجاوز المخزون المتاح لهذه الفاتورة (${availableStockForSale} ${inventoryItem.baseUnit}).`, 'warning');
      }
      
      item.quantity = newQuantity;

    } else { // price
       item.price = parseFloat(value) || 0;
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
    setActiveLineIndex(lineItems.length);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
    setActiveLineIndex(null);
    setLastPriceInfo('');
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

    // Final stock check before submission
    for (const line of lineItems) {
      const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
      if (!inventoryItem) continue;

      const originalSaleItem = sale.items.find(i => i.itemId === line.itemId);
      let originalQuantityInBaseUnit = 0;
      if (originalSaleItem) {
          const originalInventoryItemDetails = inventory.find((i: InventoryItem) => i.id === originalSaleItem.itemId);
          if (originalInventoryItemDetails) {
              let factor = 1;
              if (originalSaleItem.unitId !== 'base') {
                  const packingUnit = originalInventoryItemDetails.units.find(u => u.id === originalSaleItem.unitId);
                  if (packingUnit) factor = packingUnit.factor;
              }
              originalQuantityInBaseUnit = originalSaleItem.quantity * factor;
          }
      }
      const availableStockForSale = inventoryItem.stock + originalQuantityInBaseUnit;

      let quantityInBaseUnit = line.quantity;
      if (line.unitId !== 'base') {
          const packingUnit = inventoryItem.units.find(u => u.id === line.unitId);
          if (packingUnit && packingUnit.factor > 0) {
              quantityInBaseUnit *= packingUnit.factor;
          }
      }

      if (quantityInBaseUnit > availableStockForSale) {
          showToast(`مخزون الصنف "${line.itemName}" غير كافٍ. المتاح: ${availableStockForSale} ${inventoryItem.baseUnit}.`, 'error');
          return;
      }
    }

    const updatedSaleData: Sale = {
        ...sale,
        ...formData,
        customer: customers.find((c: any) => c.id === customerId)?.name || 'غير معروف',
        items: lineItems,
        subtotal: 0, // Recalculate if needed
        totalDiscount: 0, // Recalculate if needed
        total: grandTotal,
    };
    updateSale(updatedSaleData);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label htmlFor="customer" className="block text-sm font-medium text-gray-700 dark:text-gray-300">العميل</label>
          <select id="customer" value={customerId} onChange={e => setCustomerId(e.target.value)} className="input-style w-full mt-1" required>
            <option value="">اختر عميل...</option>
            {customers.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
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
             <option>جزئية</option>
          </select>
        </div>
      </div>
       
      <div className="border-t pt-4">
        <div className="flex items-center space-x-2 space-x-reverse mb-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
            <select value={newItemId} onChange={e => setNewItemId(e.target.value)} className="input-style w-full">
                <option value="">-- اختر صنف للإضافة --</option>
                {inventory.map((i: InventoryItem) => <option key={i.id} value={i.id} disabled={(i.stock || 0) <= 0}>{i.name} (المتاح: {i.stock})</option>)}
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
            <div key={line.itemId} className="grid grid-cols-12 gap-2 items-center mb-2 p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/20" onFocus={() => setActiveLineIndex(index)}>
              <input type="text" value={line.itemName} readOnly className="col-span-4 input-style bg-gray-100 dark:bg-gray-800" />
              <select value={line.unitId} onChange={e => handleItemChange(index, 'unitId', e.target.value)} className="col-span-2 input-style">
                {unitOptions.map(opt => <option key={opt.id} value={opt.id}>{opt.name}</option>)}
              </select>
              <input type="number" value={line.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 input-style" placeholder="الكمية" min="0.01" step="any" />
              <input type="number" value={line.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="col-span-2 input-style" placeholder="السعر" step="any" min="0"/>
              <input type="text" value={line.total.toLocaleString()} readOnly className="col-span-1 input-style bg-gray-100 dark:bg-gray-800" placeholder="الإجمالي" />
              <button type="button" onClick={() => removeLineItem(index)} className="col-span-1 text-red-500 hover:text-red-700">
                <TrashIcon className="w-5 h-5" />
              </button>
            </div>
          );
        })}

        {lastPriceInfo && activeLineIndex !== null && (
            <div className="mt-2 p-3 bg-blue-50 dark:bg-gray-900/40 border-r-4 border-blue-400 text-sm text-blue-800 dark:text-blue-200 rounded-md flex items-center gap-3 transition-opacity duration-300">
                <InformationCircleIcon className="w-5 h-5 flex-shrink-0" />
                <p>{lastPriceInfo}</p>
            </div>
        )}
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

export default EditSaleForm;
