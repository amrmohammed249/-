
import React, { useContext } from 'react';
import { DataContext } from '../../context/DataContext';
import PageHeader from '../shared/PageHeader';
import PlaceholderPage from '../PlaceholderPage';
import { OfficeBuildingIcon } from '../icons/OfficeBuildingIcon';

const FixedAssets: React.FC = () => {
  // Placeholder implementation for now
  return (
    <div className="space-y-6">
      <PageHeader 
        title="الأصول الثابتة" 
        buttonText="إضافة أصل"
        onButtonClick={() => {}}
        buttonIcon={<OfficeBuildingIcon />}
      />
      <div className="bg-white dark:bg-gray-800 p-8 rounded-lg shadow-md text-center">
          <OfficeBuildingIcon className="w-16 h-16 mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-bold text-gray-700 dark:text-gray-200">إدارة الأصول الثابتة</h2>
          <p className="text-gray-500 mt-2">يمكنك هنا إدارة الأصول الثابتة، حساب الإهلاك، ومتابعة القيمة الدفترية.</p>
          <p className="text-sm text-gray-400 mt-4">(هذه الوحدة قيد التطوير)</p>
      </div>
    </div>
  );
};

export default FixedAssets;
