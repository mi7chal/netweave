/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, type ReactNode } from 'react';

interface ErrorContextType {
    isBackendDown: boolean;
    setBackendDown: (isDown: boolean) => void;
}

const ErrorContext = createContext<ErrorContextType | undefined>(undefined);

export const ErrorProvider = ({ children }: { children: ReactNode }) => {
    const [isBackendDown, setBackendDown] = useState(false);

    return (
        <ErrorContext.Provider value={{ isBackendDown, setBackendDown }}>
            {children}
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    const context = useContext(ErrorContext);
    if (!context) {
        throw new Error('useError must be used within an ErrorProvider');
    }
    return context;
};
