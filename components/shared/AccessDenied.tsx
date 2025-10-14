import React from 'react';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';

const AccessDenied: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg shadow-md p-12">
      <ExclamationTriangleIcon className="w-16 h-16 text-red-500 mb-4" />
      <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-200 mb-2">تم رفض الوصول</h1>
      <p className="text-gray-500 dark:text-gray-400">ليس لديك الصلاحيات اللازمة لعرض هذه الصفحة.</p>
      <p className="text-gray-500 dark:text-gray-400">الرجاء التواصل مع مدير النظام إذا كنت تعتقد أن هذا خطأ.</p>
    </div>
  );
};

export default AccessDenied;
