

import React from 'react';

interface CardProps {
  title: string;
  value: string;
  // Fix: Specify that the icon element accepts a className prop to resolve cloneElement type error.
  icon: React.ReactElement<{ className?: string }>;
  footer?: React.ReactNode;
}

const Card: React.FC<CardProps> = ({ title, value, icon, footer }) => {
  return (
    <div className="bg-white dark:bg-gray-800 p-5 rounded-xl shadow-md hover:shadow-lg transition-shadow duration-300 flex flex-col justify-between">
      <div className="flex items-start justify-between">
          <p className="text-sm font-semibold text-gray-500 dark:text-gray-400">{title}</p>
          <div className="bg-gray-100 dark:bg-gray-700/50 rounded-lg p-2">
            {React.cloneElement(icon, { className: `w-6 h-6 ${icon.props.className || ''}`.trim() })}
          </div>
      </div>
      <div>
        <p className="text-3xl font-bold text-gray-800 dark:text-gray-100 mt-2">{value}</p>
        {footer && <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">{footer}</div>}
      </div>
    </div>
  );
};

export default Card;