import React, { useState, useContext, useEffect } from 'react';
import { DataContext } from '../../context/DataContext';
import { PlusIcon } from '../icons/PlusIcon';
import { TrashIcon } from '../icons/TrashIcon';
import Modal from '../shared/Modal';
import AddUnitForm from './AddUnitForm';
import { PackingUnit, UnitDefinition, InventoryItem } from '../../types';

interface AddItemFormProps {
  onClose: () => void;
  onSuccess?: (newItem: InventoryItem) => void;
}

const AddItemForm: React.FC<AddItemFormProps> = ({ onClose, onSuccess }) => {
  const { unitDefinitions, addUnitDefinition, addItem, sequences, showToast } = useContext(DataContext);
  
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [barcode, setBarcode] = useState('');
  const [baseUnitId, setBaseUnitId] = useState('');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [salePrice, setSalePrice] = useState('');
  const [stock, setStock] = useState('0');
  const [packingUnits, setPackingUnits] = useState<Partial<PackingUnit>[]>([]);
  
  const [isAddUnitModalOpen, setAddUnitModalOpen] = useState(false);

  useEffect(() => {
    const basePurchasePriceNum = Number(purchasePrice) || 0;
    const baseSalePriceNum = Number(salePrice) || 0;

    const updatedPackingUnits = packingUnits.map(pUnit => {
      const factor = Number(pUnit.factor) || 0;
      const newPUnit = { ...pUnit };
      newPUnit.purchasePrice = basePurchasePriceNum * factor;
      newPUnit.salePrice = baseSalePriceNum * factor;
      return newPUnit;
    });

    // Prevent infinite loop by checking if an update is actually needed
    if (JSON.stringify(updatedPackingUnits) !== JSON.stringify(packingUnits)) {
      setPackingUnits(updatedPackingUnits);
    }
  }, [purchasePrice, salePrice, packingUnits]);


  const handleAddPackingUnit = () => {
    setPackingUnits([...packingUnits, { id: `temp-${Date.now()}`, name: '', factor: 1, purchasePrice: 0, salePrice: 0 }]);
  };

  const handleRemovePackingUnit = (index: number) => {
    setPackingUnits(packingUnits.filter((_, i) => i !== index));
  };

  const handlePackingUnitChange = (index: number, field: keyof PackingUnit, value: any) => {
    const newPackingUnits = [...packingUnits];
    const unit = newPackingUnits[index];
    
    if (field === 'name') {
      const selectedUnit = unitDefinitions.find((u: UnitDefinition) => u.name === value);
      if(selectedUnit) {
        (unit as any)[field] = selectedUnit.name;
      }
    } else {
       (unit as any)[field] = value;
    }

    setPackingUnits(newPackingUnits);
  };
  
  const handleAddNewUnitSuccess = (newUnit: UnitDefinition) => {
    setAddUnitModalOpen(false);
    showToast(`تمت إضافة الوحدة "${newUnit.name}" بنجاح.`);
    // Optionally set the new unit as the base unit if none is selected
    if (!baseUnitId) {
      setBaseUnitId(newUnit.id);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!baseUnitId) {
      showToast('يجب اختيار وحدة أساسية للصنف.', 'error');
      return;
    }
    const baseUnitName = unitDefinitions.find((u: UnitDefinition) => u.id === baseUnitId)?.name || '';

    const finalPackingUnits = packingUnits
      .filter(p => p.name && p.factor && p.factor > 0)
      .map((p, index) => ({
        id: `PU-${sequences.packingUnit + index}`,
        name: p.name!,
        factor: Number(p.factor),
        purchasePrice: Number(p.purchasePrice),
        salePrice: Number(p.salePrice),
      }));

    try {
        const newItemData: Omit<InventoryItem, 'id'> = {
          name,
          barcode,
          category,
          baseUnit: baseUnitName,
          purchasePrice: Number(purchasePrice),
          salePrice: Number(salePrice),
          stock: Number(stock),
          units: finalPackingUnits,
        };
        
        const newItem = addItem(newItemData);
        if (onSuccess) {
          onSuccess(newItem);
        }
        onClose();
    } catch (error) {
        // Error toast is shown in addItem function
    }
  };

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الصنف</label>
            <input type="text" id="name" value={name} onChange={e => setName(e.target.value)} className="input-style w-full mt-1" required />
          </div>
          <div>
            <label htmlFor="category" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الفئة</label>
            <input type="text" id="category" value={category} onChange={e => setCategory(e.target.value)} className="input-style w-full mt-1" />
          </div>
          <div>
            <label htmlFor="barcode" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الباركود</label>
            <input type="text" id="barcode" value={barcode} onChange={e => setBarcode(e.target.value)} className="input-style w-full mt-1" />
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">اتركه فارغاً ليتم إنشاء باركود تلقائي.</p>
          </div>
        </div>

        {/* Base Unit Section */}
        <div className="space-y-4 rounded-lg border p-4 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">الوحدة الأساسية (وحدة المخزون)</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">هي أصغر وحدة يتم التعامل بها للصنف، ويتم تتبع رصيد المخزون بناءً عليها.</p>
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                <div className="lg:col-span-2">
                    <label htmlFor="baseUnit" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اختر الوحدة الأساسية</label>
                    <div className="flex items-center space-x-2 space-x-reverse">
                        <select id="baseUnit" value={baseUnitId} onChange={e => setBaseUnitId(e.target.value)} className="input-style w-full mt-1" required>
                            <option value="">-- اختر وحدة --</option>
                            {unitDefinitions.map((unit: UnitDefinition) => <option key={unit.id} value={unit.id}>{unit.name}</option>)}
                        </select>
                        <button type="button" onClick={() => setAddUnitModalOpen(true)} className="mt-1 flex-shrink-0 p-2 bg-gray-200 dark:bg-gray-600 rounded-md hover:bg-gray-300 dark:hover:bg-gray-500" title="إضافة وحدة قياس جديدة">
                            <PlusIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div>
                    <label htmlFor="purchasePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر الشراء</label>
                    <input type="number" id="purchasePrice" value={purchasePrice} onChange={e => setPurchasePrice(e.target.value)} className="input-style w-full mt-1" required step="any" min="0"/>
                </div>
                 <div>
                    <label htmlFor="salePrice" className="block text-sm font-medium text-gray-700 dark:text-gray-300">سعر البيع</label>
                    <input type="number" id="salePrice" value={salePrice} onChange={e => setSalePrice(e.target.value)} className="input-style w-full mt-1" required step="any" min="0"/>
                </div>
                 <div>
                    <label htmlFor="stock" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رصيد أول المدة</label>
                    <input type="number" id="stock" value={stock} onChange={e => setStock(e.target.value)} className="input-style w-full mt-1" required min="0" step="any"/>
                </div>
            </div>
        </div>

        {/* Packing Units Section */}
         <div className="space-y-4 rounded-lg border p-4 dark:border-gray-700">
            <div className="flex justify-between items-center">
                <div>
                    <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200">وحدات التعبئة (الوحدات الفرعية)</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">الوحدات الأكبر التي تحتوي على عدد معين من الوحدة الأساسية (مثال: الشوال = 25 كيلو).</p>
                </div>
                <button type="button" onClick={handleAddPackingUnit} className="btn-secondary flex items-center gap-2">
                    <PlusIcon className="w-5 h-5"/> إضافة وحدة تعبئة
                </button>
            </div>
            
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
                {packingUnits.map((pUnit, index) => (
                    <div key={pUnit.id} className="grid grid-cols-12 gap-x-3 items-center p-2 bg-gray-50 dark:bg-gray-900/50 rounded-md">
                        <div className="col-span-3">
                             <label className="text-xs font-medium text-gray-500">الوحدة</label>
                             <select value={pUnit.name} onChange={e => handlePackingUnitChange(index, 'name', e.target.value)} className="input-style w-full text-sm">
                                <option value="">اختر</option>
                                {unitDefinitions.map((u: UnitDefinition) => <option key={u.id} value={u.name}>{u.name}</option>)}
                            </select>
                        </div>
                         <div className="col-span-3">
                             <label className="text-xs font-medium text-gray-500">معامل التحويل</label>
                             <input type="number" placeholder={`كم ${unitDefinitions.find((u: UnitDefinition) => u.id === baseUnitId)?.name || '؟'}`} value={pUnit.factor} onChange={e => handlePackingUnitChange(index, 'factor', e.target.value)} className="input-style w-full text-sm" step="any" min="0"/>
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs font-medium text-gray-500">سعر الشراء</label>
                             <input type="number" value={pUnit.purchasePrice || ''} readOnly className="input-style w-full text-sm bg-gray-100 dark:bg-gray-800" />
                        </div>
                        <div className="col-span-2">
                             <label className="text-xs font-medium text-gray-500">سعر البيع</label>
                             <input type="number" value={pUnit.salePrice || ''} readOnly className="input-style w-full text-sm bg-gray-100 dark:bg-gray-800" />
                        </div>
                        <div className="col-span-2 flex justify-end pt-4">
                            <button type="button" onClick={() => handleRemovePackingUnit(index)} className="text-red-500 hover:text-red-700 p-1">
                                <TrashIcon className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                ))}
                {packingUnits.length === 0 && <p className="text-center text-sm text-gray-400 py-4">لم تتم إضافة وحدات تعبئة.</p>}
            </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
          <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
          <button type="submit" className="btn-primary">حفظ الصنف</button>
        </div>
      </form>
      
      <Modal isOpen={isAddUnitModalOpen} onClose={() => setAddUnitModalOpen(false)} title="إضافة وحدة قياس جديدة">
        <AddUnitForm onClose={() => setAddUnitModalOpen(false)} onSuccess={handleAddNewUnitSuccess} />
      </Modal>
    </>
  );
};

export default AddItemForm;