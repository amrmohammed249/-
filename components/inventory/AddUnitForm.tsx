import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { UnitDefinition } from '../../types';

interface AddUnitFormProps {
  onClose: () => void;
  onSuccess: (newUnit: UnitDefinition) => void;
}

const AddUnitForm: React.FC<AddUnitFormProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const { addUnitDefinition, showToast } = useContext(DataContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('يرجى إدخال اسم الوحدة.', 'error');
      return;
    }
    const newUnit = addUnitDefinition(name.trim());
    onSuccess(newUnit);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="unitName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الوحدة الجديدة</label>
          <input
            type="text"
            id="unitName"
            value={name}
            onChange={e => setName(e.target.value)}
            className="mt-1 block w-full input-style"
            required
            autoFocus
          />
           <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">مثال: قطعة، كيلو، كرتونة، متر...</p>
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
        <button type="submit" className="btn-primary">إضافة وحدة</button>
      </div>
    </form>
  );
};

export default AddUnitForm;
