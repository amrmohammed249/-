import React from 'react';

interface PlaceholderPageProps {
  title: string;
}

const PlaceholderPage: React.FC<PlaceholderPageProps> = ({ title }) => {
  return (
    <div className="flex items-center justify-center h-full bg-white dark:bg-gray-800 rounded-lg shadow-md">
      <div className="text-center p-12">
        <h1 className="text-3xl font-bold text-gray-700 dark:text-gray-200 mb-4">{title}</h1>
        <p className="text-gray-500 dark:text-gray-400">هذه الصفحة قيد الإنشاء.</p>
        <p className="text-gray-500 dark:text-gray-400">سيتم إضافة المحتوى قريباً.</p>
      </div>
    </div>
  );
};

export default PlaceholderPage;