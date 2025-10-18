import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { PurchaseReturn, LineItem, InventoryItem, Supplier } from '../../types';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import Modal from '../shared/Modal';
import AddSupplierForm from '../suppliers/AddSupplierForm';
import AddItemForm from '../inventory/AddItemForm';

interface AddPurchaseReturnFormProps {
  onClose: () => void;
  onSuccess: (newReturn: PurchaseReturn) => void;
}

const AddPurchaseReturnForm: React.FC<AddPurchaseReturnFormProps> = ({ onClose, onSuccess }) => {
  const { suppliers, inventory, addPurchaseReturn, showToast } = useContext(DataContext);
  
  const [supplierId, setSupplierId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [originalPurchaseId, setOriginalPurchaseId] = useState('');
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [grandTotal, setGrandTotal] = useState(0);
  const [newItemId, setNewItemId] = useState('');

  const [isAddSupplierModalOpen, setAddSupplierModalOpen] = useState(false);
  const [isAddItemModalOpen, setAddItemModalOpen] = useState(false);

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
      item.quantity = 1; // Reset quantity on unit change
      
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

      if (quantityInBaseUnit > inventoryItem.stock) {
          showToast(`الكمية المطلوبة تتجاوز المخزون. المتاح: ${inventoryItem.stock} ${inventoryItem.baseUnit}.`, 'warning');
      }
      item.quantity = newQuantity;

    } else { // price
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
        total: selectedInventoryItem.purchasePrice
    };
    
    setLineItems([...lineItems, newLine]);
    setNewItemId('');
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  const handleSupplierAdded = (newSupplier: Supplier) => {
    setAddSupplierModalOpen(false);
    setSupplierId(newSupplier.id);
  };
  
  const handleItemAdded = (newItem: InventoryItem) => {
    setAddItemModalOpen(false);
    setNewItemId(newItem.id);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId || lineItems.length === 0) {
      showToast('الرجاء اختيار مورد وإضافة بند واحد على الأقل.', 'error');
      return;
    }

    // Final stock check before submission
    for (const line of lineItems) {
      const inventoryItem = inventory.find((i: InventoryItem) => i.id === line.itemId);
      if (!inventoryItem) continue;

      let quantityInBaseUnit = line.quantity;
      if (line.unitId !== 'base') {
          const packingUnit = inventoryItem.units.find(u => u.id === line.unitId);
          if (packingUnit && packingUnit.factor > 0) {
              quantityInBaseUnit *= packingUnit.factor;
          }
      }

      if (quantityInBaseUnit > inventoryItem.stock) {
          showToast(`مخزون الصنف "${line.itemName}" غير كافٍ لإتمام المرتجع. المتاح: ${inventoryItem.stock} ${inventoryItem.baseUnit}.`, 'error');
          return; // Abort submission
      }
    }
    
    const supplierName = suppliers.find((s: any) => s.id === supplierId)?.name || 'غير معروف';

    const newReturn = addPurchaseReturn({
        supplier: supplierName,
        date,
        originalPurchaseId,
        items: lineItems,
        total: grandTotal,
    });
    
    onSuccess(newReturn);
    onClose();
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="supplier" className="block text-sm font-medium text-gray-700 dark:text-gray-300">المورد</label>
            <div className="flex items-center space-x-2 space-x-reverse">
              <select id="supplier" value={supplierId} onChange={e => setSupplierId(e.target.value)} className="input-style w-full mt-1" required>
                <option value="">اختر مورد...</option>
                {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
              <button type="button" onClick={() => setAddSupplierModalOpen(true)} className="btn-primary-small mt-1 flex-shrink-0" title="إضافة مورد جديد">+ جديد</button>
            </div>
          </div>
          <div>
            <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التاريخ</label>
            <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} className="input-style w-full mt-1" required />
          </div>
          <div className="md:col-span-2">
            <label htmlFor="originalPurchaseId" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الفاتورة الأصلية (اختياري)</label>
            <input type="text" id="originalPurchaseId" value={originalPurchaseId} onChange={e => setOriginalPurchaseId(e.target.value)} className="input-style w-full mt-1" />
          </div>
        </div>
        
        <div className="border-t pt-4">
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
                <input type="number" value={line.quantity} onChange={e => handleItemChange(index, 'quantity', e.target.value)} className="col-span-2 input-style" placeholder="الكمية" min="0.01" step="any" />
                <input type="number" value={line.price} onChange={e => handleItemChange(index, 'price', e.target.value)} className="col-span-2 input-style" placeholder="السعر" step="any" min="0"/>
                <input type="text" value={line.total.toLocaleString()} readOnly className="col-span-1 input-style bg-gray-100 dark:bg-gray-800" placeholder="الإجمالي" />
                <button type="button" onClick={() => removeLineItem(index)} className="col-span-1 text-red-500 hover:text-red-700">
                  <TrashIcon className="w-5 h-5" />
                </button>
              </div>
            );
          })}
          <div className="flex items-center space-x-2 space-x-reverse mt-4 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
              <select value={newItemId} onChange={e => setNewItemId(e.target.value)} className="input-style w-full">
                  <option value="">-- اختر صنف للإضافة --</option>
                  {inventory.map((i: InventoryItem) => <option key={i.id} value={i.id}>{i.name}</option>)}
              </select>
              <button type="button" onClick={() => setAddItemModalOpen(true)} className="btn-primary-small flex-shrink-0" title="إضافة صنف جديد">+ جديد</button>
              <button type="button" onClick={addLineItem} className="flex-shrink-0 flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600">
                  <PlusIcon className="w-4 h-4 ml-1" />
                  إضافة
              </button>
          </div>
        </div>

        <div className="border-t pt-4 flex justify-end">
          <div className="text-left">
              <p className="text-sm text-gray-500 dark:text-gray-400">إجمالي قيمة المرتجع</p>
              <p className="text-2xl font-bold font-mono">{grandTotal.toLocaleString()} جنيه مصري</p>
          </div>
        </div>
        
        <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
          <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
          <button type="submit" className="btn-primary">حفظ المرتجع</button>
        </div>
      </form>
      
      <Modal isOpen={isAddSupplierModalOpen} onClose={() => setAddSupplierModalOpen(false)} title="إضافة مورد جديد">
        <AddSupplierForm onClose={() => setAddSupplierModalOpen(false)} onSuccess={handleSupplierAdded} />
      </Modal>

      <Modal isOpen={isAddItemModalOpen} onClose={() => setAddItemModalOpen(false)} title="إضافة صنف جديد" size="4xl">
        <AddItemForm onClose={() => setAddItemModalOpen(false)} onSuccess={handleItemAdded} />
      </Modal>
    </>
  );
};

export default AddPurchaseReturnForm;