

import React from 'react';

interface PageHeaderProps {
  title: string;
  buttonText: string;
  // Fix: Specify that the buttonIcon element accepts a className prop to resolve cloneElement type error.
  buttonIcon?: React.ReactElement<{ className?: string }>;
  onButtonClick?: () => void;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, buttonText, buttonIcon, onButtonClick }) => {
  return (
    <div className="flex flex-col gap-4 md:flex-row md:justify-between md:items-center pb-4 border-b border-gray-200 dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-800 dark:text-gray-100">{title}</h2>
      <button 
        onClick={onButtonClick}
        className="w-full md:w-auto flex items-center justify-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition-colors"
      >
        {buttonIcon && React.cloneElement(buttonIcon, { className: 'w-5 h-5 ml-2' })}
        <span>{buttonText}</span>
      </button>
    </div>
  );
};

export default PageHeader;