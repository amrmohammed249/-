

import React from 'react';

interface QuickActionButtonProps {
  // Fix: Specify that the icon element accepts a className prop to resolve cloneElement type error.
  icon: React.ReactElement<{ className?: string }>;
  label: string;
  onClick: () => void;
}

const QuickActionButton: React.FC<QuickActionButtonProps> = ({ icon, label, onClick }) => {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center justify-center p-4 space-y-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg hover:bg-blue-100 dark:hover:bg-gray-700 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
    >
      <div className="p-3 bg-blue-100 dark:bg-blue-900/50 rounded-full text-blue-500 dark:text-blue-400">
        {React.cloneElement(icon, { className: 'w-8 h-8' })}
      </div>
      <span className="font-semibold text-sm text-gray-600 dark:text-gray-300">{label}</span>
    </button>
  );
};

export default QuickActionButton;