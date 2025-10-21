import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { ActiveWindow } from '../types';

interface WindowContextType {
    activeWindows: ActiveWindow[];
    visibleWindowId: string | null;
    openWindow: (config: { path: string; title: string; icon: ReactNode }) => void;
    closeWindow: (id: string) => void;
    showWindow: (id: string) => void;
    hideWindow: () => void;
    setWindowDirty: (id: string, isDirty: boolean) => void;
}

export const WindowContext = createContext<WindowContextType>({} as WindowContextType);

interface WindowProviderProps {
    children: React.ReactNode;
}

export const WindowProvider: React.FC<WindowProviderProps> = ({ children }) => {
    const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
    const [visibleWindowId, setVisibleWindowId] = useState<string | null>(null);

    const openWindow = useCallback((config: { path: string; title: string; icon: ReactNode }) => {
        const existingWindow = activeWindows.find(w => w.path === config.path);

        if (existingWindow) {
            setVisibleWindowId(existingWindow.id);
        } else {
            const newWindow: ActiveWindow = {
                id: `win-${Date.now()}`,
                ...config,
                isDirty: false, // Initialize as not dirty
            };
            setActiveWindows(prev => [...prev, newWindow]);
            setVisibleWindowId(newWindow.id);
        }
    }, [activeWindows]);

    const closeWindow = useCallback((id: string) => {
        setActiveWindows(prev => prev.filter(w => w.id !== id));
        if (visibleWindowId === id) {
            setVisibleWindowId(null);
        }
    }, [visibleWindowId]);

    const showWindow = useCallback((id: string) => {
        setVisibleWindowId(id);
    }, []);

    const hideWindow = useCallback(() => {
        setVisibleWindowId(null);
    }, []);

    const setWindowDirty = useCallback((id: string, isDirty: boolean) => {
        setActiveWindows(prev => prev.map(w => w.id === id ? { ...w, isDirty } : w));
    }, []);

    const value = {
        activeWindows,
        visibleWindowId,
        openWindow,
        closeWindow,
        showWindow,
        hideWindow,
        setWindowDirty,
    };

    return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
};