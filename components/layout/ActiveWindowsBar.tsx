import React, { useContext } from 'react';
import { WindowContext } from '../../context/WindowContext';
import { XIcon } from '../icons/XIcon';
import { MinusIcon } from '../icons/MinusIcon';
import { ActiveWindow } from '../../types';

const ActiveWindowsBar: React.FC = () => {
    const { activeWindows, visibleWindowId, showWindow, hideWindow, closeWindow } = useContext(WindowContext);

    if (activeWindows.length === 0) {
        return null;
    }

    const handleCloseClick = (win: ActiveWindow) => {
        if (win.isDirty) {
            if (window.confirm("الفاتورة الحالية تحتوي على تغييرات غير محفوظة. هل أنت متأكد من رغبتك في الإغلاق وتجاهل هذه التغييرات؟")) {
                closeWindow(win.id);
            }
        } else {
            closeWindow(win.id);
        }
    };

    return (
        <div className="flex-shrink-0 h-10 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 shadow-top flex items-center px-2 space-x-2 space-x-reverse">
            {activeWindows.map(win => (
                <div
                    key={win.id}
                    className={`flex items-center justify-between h-8 px-3 rounded-md cursor-pointer transition-colors max-w-xs ${
                        win.id === visibleWindowId 
                        ? 'bg-blue-500 text-white shadow-sm' 
                        : 'bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600'
                    }`}
                >
                    <div
                        className="flex-grow flex items-center gap-2 truncate"
                        onClick={() => win.id === visibleWindowId ? hideWindow() : showWindow(win.id)}
                    >
                        <div className="w-4 h-4 flex-shrink-0">{win.icon}</div>
                        <span className="text-sm font-medium truncate">{win.title}</span>
                    </div>

                    <div className="flex-shrink-0 flex items-center gap-1 mr-2">
                        {win.id === visibleWindowId && (
                             <button
                                onClick={hideWindow}
                                className="p-1 rounded-full hover:bg-white/20"
                                title="إخفاء"
                            >
                                <MinusIcon className="w-3 h-3"/>
                            </button>
                        )}
                        <button
                            onClick={(e) => { e.stopPropagation(); handleCloseClick(win); }}
                            className="p-1 rounded-full hover:bg-white/20"
                            title="إغلاق"
                        >
                            <XIcon className="w-3 h-3"/>
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default ActiveWindowsBar;