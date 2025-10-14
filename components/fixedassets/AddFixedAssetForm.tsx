import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';

const AddFixedAssetForm: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [formData, setFormData] = useState({
    name: '',
    acquisitionDate: new Date().toISOString().split('T')[0],
    cost: '',
    depreciationRate: '',
    accumulatedDepreciation: '0',
  });
  const { addFixedAsset } = useContext(DataContext);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    addFixedAsset({
      name: formData.name,
      acquisitionDate: formData.acquisitionDate,
      cost: parseFloat(formData.cost),
      depreciationRate: parseFloat(formData.depreciationRate),
      accumulatedDepreciation: parseFloat(formData.accumulatedDepreciation),
    });
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="md:col-span-2">
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم الأصل</label>
          <input type="text" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="acquisitionDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">تاريخ الاقتناء</label>
          <input type="date" id="acquisitionDate" value={formData.acquisitionDate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">التكلفة</label>
          <input type="number" id="cost" value={formData.cost} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required step="any" />
        </div>
        <div>
          <label htmlFor="depreciationRate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">نسبة الإهلاك السنوي (%)</label>
          <input type="number" id="depreciationRate" value={formData.depreciationRate} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required step="any" />
        </div>
        <div>
            <label htmlFor="accumulatedDepreciation" className="block text-sm font-medium text-gray-700 dark:text-gray-300">مجمع الإهلاك الافتتاحي</label>
            <input type="number" id="accumulatedDepreciation" value={formData.accumulatedDepreciation} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required step="any" />
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">إضافة الأصل</button>
      </div>
    </form>
  );
};

export default AddFixedAssetForm;
