import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { Supplier } from '../../types';

interface AddSupplierFormProps {
  onClose: () => void;
  onSuccess?: (newSupplier: Supplier) => void;
}

const AddSupplierForm: React.FC<AddSupplierFormProps> = ({ onClose, onSuccess }) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const { addSupplier } = useContext(DataContext);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newSupplier = addSupplier({
        name,
        contact,
        phone,
        address,
        balance: 0,
    });
    if (onSuccess) {
      onSuccess(newSupplier);
    }
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="supplierName" className="block text-sm font-medium text-gray-700 dark:text-gray-300">اسم المورد</label>
          <input type="text" id="supplierName" value={name} onChange={e => setName(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="supplierPhone" className="block text-sm font-medium text-gray-700 dark:text-gray-300">رقم الهاتف</label>
          <input type="tel" id="supplierPhone" value={phone} onChange={e => setPhone(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
         <div>
          <label htmlFor="supplierAddress" className="block text-sm font-medium text-gray-700 dark:text-gray-300">العنوان</label>
          <input type="text" id="supplierAddress" value={address} onChange={e => setAddress(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
        <div>
          <label htmlFor="supplierContact" className="block text-sm font-medium text-gray-700 dark:text-gray-300">البريد الإلكتروني</label>
          <input type="email" id="supplierContact" value={contact} onChange={e => setContact(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">إضافة مورد</button>
      </div>
    </form>
  );
};

export default AddSupplierForm;