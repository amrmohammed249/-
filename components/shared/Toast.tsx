import React, { useContext } from 'react';
import { DataContext } from '../../context/DataContext';

const Toast: React.FC = () => {
  const { toast } = useContext(DataContext);

  if (!toast.show) return null;
  
  const bgColor = toast.type === 'error' 
    ? 'bg-red-600 dark:bg-red-700' 
    : 'bg-gray-800 dark:bg-gray-900';

  return (
    <div className={`fixed bottom-5 left-1/2 -translate-x-1/2 ${bgColor} text-white px-6 py-3 rounded-lg shadow-lg z-50 animate-fade-in-out`}>
      <p>{toast.message}</p>
      <style>{`
        @keyframes fade-in-out {
          0% { opacity: 0; transform: translate(-50%, 20px); }
          10% { opacity: 1; transform: translate(-50%, 0); }
          90% { opacity: 1; transform: translate(-50%, 0); }
          100% { opacity: 0; transform: translate(-50%, 20px); }
        }
        .animate-fade-in-out {
          animation: fade-in-out 3s ease-in-out forwards;
        }
      `}</style>
    </div>
  );
};

export default Toast;