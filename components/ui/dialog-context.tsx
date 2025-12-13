// components/ui/dialog-context.tsx
import React, { createContext, useContext, useState, useCallback } from 'react';

interface DialogContextType {
    clickPosition: { x: number; y: number };
    captureClick: (event: React.MouseEvent | MouseEvent) => void;
}

const DialogContext = createContext<DialogContextType | undefined>(undefined);

export function useDialogClick() {
    const context = useContext(DialogContext);
    if (!context) {
        throw new Error('useDialogClick must be used within a DialogProvider');
    }
    return context;
}

export function DialogProvider({ children }: { children: React.ReactNode }) {
    // ✅ CORREÇÃO AQUI: Inicializa com 0 ou um valor seguro
    const [clickPosition, setClickPosition] = useState({ x: 0, y: 0 }); 

    // ✅ NOVO: Atualiza a posição inicial APENAS NO CLIENTE
    React.useEffect(() => {
        // Define o ponto inicial como o centro da tela assim que o componente monta no cliente
        setClickPosition({ 
            x: window.innerWidth / 2, 
            y: window.innerHeight / 2 
        });
    }, []); // Executa apenas uma vez na montagem do cliente

    const captureClick = React.useCallback((event: React.MouseEvent | MouseEvent) => {
        setClickPosition({
            x: event.clientX,
            y: event.clientY,
        });
    }, []);

    return (
        <DialogContext.Provider value={{ clickPosition, captureClick }}>
            {children}
        </DialogContext.Provider>
    );
}

// ⚠️ Lembre-se de envolver seu layout principal com <DialogProvider> 
// (ex: no seu arquivo `app/layout.tsx`)