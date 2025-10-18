
import React, { useContext, useState, useRef, useEffect, useMemo } from 'react';
import { DataContext } from '../../context/DataContext';
import { UserIcon } from '../icons/UserIcon';
import { ArrowLeftOnRectangleIcon } from '../icons/ArrowLeftOnRectangleIcon';
import { CogIcon } from '../icons/CogIcon';
import { Link } from 'react-router-dom';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { ClockIcon } from '../icons/ClockIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { QuestionMarkCircleIcon } from '../icons/QuestionMarkCircleIcon';
import SecurityFeaturesModal from '../shared/SecurityFeaturesModal';
import { CircleStackIcon } from '../icons/CircleStackIcon';
import DataManagerModal from '../shared/DataManagerModal';
import { BellIcon } from '../icons/BellIcon';
import NotificationPanel from './NotificationPanel';
import { Bars3Icon } from '../icons/Bars3Icon';

const SaveStatusIndicator: React.FC = () => {
    const { saveStatus } = useContext(DataContext);

    if (saveStatus === 'idle') {
        return null;
    }

    const statusConfig = {
        saving: { text: 'جاري الحفظ...', icon: <ClockIcon className="w-5 h-5 animate-spin" />, color: 'text-gray-500 dark:text-gray-400' },
        saved: { text: 'تم الحفظ', icon: <CheckCircleIcon className="w-5 h-5" />, color: 'text-green-500 dark:text-green-400' },
        error: { text: 'خطأ في الحفظ', icon: <ExclamationTriangleIcon className="w-5 h-5" />, color: 'text-red-500 dark:text-red-400' },
    };

    const currentStatus = statusConfig[saveStatus];

    return (
        <div className={`flex items-center space-x-2 space-x-reverse text-sm transition-colors duration-300 ${currentStatus.color}`}>
            {currentStatus.icon}
            <span className="hidden sm:inline">{currentStatus.text}</span>
        </div>
    );
};

interface HeaderProps {
    onMenuClick: () => void;
}

const Header: React.FC<HeaderProps> = ({ onMenuClick }) => {
  const { currentUser, logout, notifications } = useContext(DataContext);
  const [isMenuOpen, setMenuOpen] = useState(false);
  const [isNotificationsOpen, setNotificationsOpen] = useState(false);
  const [isSecurityModalOpen, setSecurityModalOpen] = useState(false);
  const [isDataManagerOpen, setDataManagerOpen] = useState(false);
  
  const menuRef = useRef<HTMLDivElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  const unreadCount = useMemo(() => notifications.filter((n: any) => !n.read).length, [notifications]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setMenuOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setNotificationsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [menuRef, notificationsRef]);

  if (!currentUser) return null;

  return (
    <>
      <header className="bg-white dark:bg-gray-800 shadow-sm p-4 flex justify-between items-center flex-shrink-0">
        {/* Right side in RTL */}
        <div className="flex items-center gap-4">
            <button 
                onClick={onMenuClick} 
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 md:hidden"
                aria-label="فتح القائمة"
            >
                <Bars3Icon className="w-6 h-6" />
            </button>
             <div className="hidden sm:block">
              <SaveStatusIndicator />
            </div>
        </div>
        
        {/* Left side in RTL */}
        <div className="flex items-center space-x-4 space-x-reverse">
          <button
            onClick={() => setDataManagerOpen(true)}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            title="إدارة قواعد البيانات"
          >
            <CircleStackIcon className="w-6 h-6" />
          </button>
          <button 
              onClick={() => setSecurityModalOpen(true)} 
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              title="ميزات الأمان"
            >
              <QuestionMarkCircleIcon className="w-6 h-6" />
          </button>
          
          <div className="relative" ref={notificationsRef}>
            <button
                onClick={() => setNotificationsOpen(prev => !prev)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                title="الإشعارات"
            >
                <BellIcon className="w-6 h-6" />
                {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white ring-2 ring-white dark:ring-gray-800">
                        {unreadCount}
                    </span>
                )}
            </button>
            <NotificationPanel isOpen={isNotificationsOpen} onClose={() => setNotificationsOpen(false)} />
          </div>


          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen(!isMenuOpen)} className="flex items-center space-x-2 space-x-reverse">
              <span className="font-medium text-gray-700 dark:text-gray-200">{currentUser.name}</span>
              <UserIcon className="w-8 h-8 p-1 bg-gray-200 dark:bg-gray-700 rounded-full"/>
            </button>

            {isMenuOpen && (
              <div className="absolute left-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-md shadow-lg py-1 z-20 border dark:border-gray-700">
                <div className="px-4 py-2 border-b dark:border-gray-700">
                    <p className="text-sm font-semibold">{currentUser.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{currentUser.role}</p>
                </div>
                <Link to="/settings" onClick={() => setMenuOpen(false)} className="flex items-center w-full text-right px-4 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700">
                    <CogIcon className="w-5 h-5 ml-2" />
                    الإعدادات
                </Link>
                <div className="border-t dark:border-gray-700 my-1"></div>
                <button
                  onClick={() => {
                    logout();
                    setMenuOpen(false);
                  }}
                  className="flex items-center w-full text-right px-4 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                >
                  <ArrowLeftOnRectangleIcon className="w-5 h-5 ml-2" />
                  تسجيل الخروج
                </button>
              </div>
            )}
          </div>
        </div>
      </header>
      <SecurityFeaturesModal 
        isOpen={isSecurityModalOpen} 
        onClose={() => setSecurityModalOpen(false)} 
      />
      <DataManagerModal 
        isOpen={isDataManagerOpen} 
        onClose={() => setDataManagerOpen(false)} 
      />
    </>
  );
};

export default Header;
