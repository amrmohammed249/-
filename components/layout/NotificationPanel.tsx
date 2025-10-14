import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { DataContext } from '../../context/DataContext';
import { BellIcon } from '../icons/BellIcon';
import { CheckIcon } from '../icons/CheckIcon';
import { ExclamationTriangleIcon } from '../icons/ExclamationTriangleIcon';
import { CheckCircleIcon } from '../icons/CheckCircleIcon';
import { DocumentTextIcon } from '../icons/DocumentTextIcon';
import { Notification } from '../../types';

interface NotificationPanelProps {
    isOpen: boolean;
    onClose: () => void;
}

const timeSince = (timestamp: string) => {
    const date = new Date(timestamp);
    const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
    if (seconds < 60) return 'الآن';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `منذ ${minutes} دقيقة`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `منذ ${hours} ساعة`;
    const days = Math.floor(hours / 24);
    return `منذ ${days} يوم`;
};

const NotificationIcon: React.FC<{ type: Notification['type'] }> = ({ type }) => {
    const iconClasses = "w-6 h-6";
    switch(type) {
        case 'success': return <CheckCircleIcon className={`${iconClasses} text-green-500`} />;
        case 'warning': return <ExclamationTriangleIcon className={`${iconClasses} text-yellow-500`} />;
        case 'info': return <DocumentTextIcon className={`${iconClasses} text-blue-500`} />;
        default: return <BellIcon className={`${iconClasses} text-gray-500`} />;
    }
}

const NotificationPanel: React.FC<NotificationPanelProps> = ({ isOpen, onClose }) => {
    const { notifications, markNotificationAsRead, markAllNotificationsAsRead } = useContext(DataContext);
    const navigate = useNavigate();

    const handleNotificationClick = (notification: Notification) => {
        markNotificationAsRead(notification.id);
        if (notification.link) {
            navigate(notification.link);
        }
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="absolute left-0 mt-2 w-80 sm:w-96 bg-white dark:bg-gray-800 rounded-lg shadow-xl border dark:border-gray-700 z-20 flex flex-col">
            <div className="flex justify-between items-center p-3 border-b dark:border-gray-700">
                <h3 className="font-semibold text-gray-800 dark:text-gray-100">الإشعارات</h3>
                <button 
                    onClick={markAllNotificationsAsRead}
                    className="flex items-center text-xs text-blue-500 hover:text-blue-700 dark:hover:text-blue-400"
                >
                    <CheckIcon className="w-4 h-4 ml-1" />
                    تمييز الكل كمقروء
                </button>
            </div>
            <div className="max-h-96 overflow-y-auto">
                {notifications.length > 0 ? (
                    notifications.map((n: Notification) => (
                        <div
                            key={n.id}
                            onClick={() => handleNotificationClick(n)}
                            className={`flex items-start p-3 space-x-3 space-x-reverse border-b dark:border-gray-700/50 cursor-pointer transition-colors ${
                                n.read 
                                ? 'hover:bg-gray-50 dark:hover:bg-gray-700/50' 
                                : 'bg-blue-50 dark:bg-blue-900/20 hover:bg-blue-100 dark:hover:bg-blue-900/30'
                            }`}
                        >
                            <div className="flex-shrink-0 pt-1">
                                <NotificationIcon type={n.type} />
                            </div>
                            <div className="flex-1">
                                <p className="text-sm text-gray-700 dark:text-gray-200">{n.message}</p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{timeSince(n.timestamp)}</p>
                            </div>
                            {!n.read && (
                                <div className="flex-shrink-0 pt-2">
                                    <span className="w-2.5 h-2.5 bg-blue-500 rounded-full block"></span>
                                </div>
                            )}
                        </div>
                    ))
                ) : (
                    <div className="p-10 text-center">
                        <BellIcon className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-600" />
                        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">لا توجد إشعارات جديدة.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default NotificationPanel;
