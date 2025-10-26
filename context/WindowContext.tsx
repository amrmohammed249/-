import React, { createContext, useState, useCallback, ReactNode } from 'react';
import { ActiveWindow } from '../types';

interface WindowContextType {
    activeWindows: ActiveWindow[];
    visibleWindowId: string | null;
    openWindow: (config: { path: string; title: string; icon: ReactNode; state?: any }) => void;
    closeWindow: (id: string) => void;
    showWindow: (id: string) => void;
    hideWindow: () => void;
    setWindowDirty: (id: string, isDirty: boolean) => void;
    updateWindowState: (id: string, updater: (prevState: any) => any) => void;
}

export const WindowContext = createContext<WindowContextType>({} as WindowContextType);

interface WindowProviderProps {
    children: React.ReactNode;
}

export const WindowProvider: React.FC<WindowProviderProps> = ({ children }) => {
    const [activeWindows, setActiveWindows] = useState<ActiveWindow[]>([]);
    const [visibleWindowId, setVisibleWindowId] = useState<string | null>(null);

    const openWindow = useCallback((config: { path: string; title: string; icon: ReactNode; state?: any }) => {
        const existingWindow = activeWindows.find(w => w.path === config.path);

        if (existingWindow) {
            setVisibleWindowId(existingWindow.id);
        } else {
            const newWindow: ActiveWindow = {
                id: `win-${Date.now()}`,
                path: config.path,
                title: config.title,
                icon: config.icon,
                isDirty: false,
                state: config.state || {},
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
        setActiveWindows(prev => prev.map(w => (w.id === id ? { ...w, isDirty } : w)));
    }, []);

    const updateWindowState = useCallback((id: string, updater: (prevState: any) => any) => {
        setActiveWindows(prevWindows =>
            prevWindows.map(w => {
                if (w.id === id) {
                    const newState = updater(w.state);
                    return { ...w, state: newState, isDirty: true };
                }
                return w;
            })
        );
    }, []);

    const value = {
        activeWindows,
        visibleWindowId,
        openWindow,
        closeWindow,
        showWindow,
        hideWindow,
        setWindowDirty,
        updateWindowState,
    };

    return <WindowContext.Provider value={value}>{children}</WindowContext.Provider>;
};
