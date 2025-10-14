import React, { useState, useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import { EyeIcon } from '../icons/EyeIcon';
import { EyeSlashIcon } from '../icons/EyeSlashIcon';

type User = { id: string; name: string; username: string; role: 'مدير النظام' | 'محاسب' | 'مدخل بيانات'; password?: string };

interface EditUserFormProps {
  user: User;
  onClose: () => void;
}

const EditUserForm: React.FC<EditUserFormProps> = ({ user, onClose }) => {
  const [formData, setFormData] = useState({
    name: user.name,
    username: user.username,
    role: user.role,
  });
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { updateUser, showToast } = useContext(DataContext);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password && password !== confirmPassword) {
      showToast('كلمتا المرور غير متطابقتين.');
      return;
    }
    
    const userDataToUpdate: User = {
      id: user.id,
      ...formData
    };
    
    if (password) {
      userDataToUpdate.password = password;
    }

    updateUser(userDataToUpdate);
    onClose();
  };

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-4">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الاسم الكامل</label>
          <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="username" className="block text-sm font-medium text-gray-700 dark:text-gray-300">معرف المستخدم</label>
          <input type="text" name="username" id="username" value={formData.username} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" required />
        </div>
        <div>
          <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300">الدور</label>
          <select name="role" id="role" value={formData.role} onChange={handleChange} className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500">
            <option value="مدخل بيانات">مدخل بيانات</option>
            <option value="محاسب">محاسب</option>
            <option value="مدير النظام">مدير النظام</option>
          </select>
        </div>
        <div className="border-t pt-4 mt-4 dark:border-gray-600">
            <p className="text-sm text-gray-500 dark:text-gray-400">اترك حقول كلمة المرور فارغة لعدم تغييرها.</p>
        </div>
        <div className="relative">
            <label htmlFor="password"  className="block text-sm font-medium text-gray-700 dark:text-gray-300">كلمة المرور الجديدة</label>
            <input 
                type={showPassword ? "text" : "password"}
                name="password" 
                id="password" 
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
            />
            <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute left-3 top-8 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
            >
                {showPassword ? <EyeSlashIcon className="w-5 h-5" /> : <EyeIcon className="w-5 h-5" />}
            </button>
        </div>
         <div>
            <label htmlFor="confirmPassword"  className="block text-sm font-medium text-gray-700 dark:text-gray-300">تأكيد كلمة المرور</label>
            <input 
                type={showPassword ? "text" : "password"}
                name="confirmPassword" 
                id="confirmPassword" 
                value={confirmPassword} 
                onChange={(e) => setConfirmPassword(e.target.value)} 
                className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500" 
            />
        </div>
      </div>
      <div className="mt-6 flex justify-end space-x-2 space-x-reverse">
        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">إلغاء</button>
        <button type="submit" className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600">حفظ التعديلات</button>
      </div>
    </form>
  );
};

export default EditUserForm;