// components/ui/dialog-context.tsx
"use client"

import * as React from "react"

/* -------------------------------------------------------------------------------------------------
 * Types
 * -----------------------------------------------------------------------------------------------*/

interface ClickPosition {
  x: number
  y: number
}

interface DialogContextValue {
  clickPosition: ClickPosition
  captureClick: (event: React.MouseEvent | MouseEvent) => void
}

/* -------------------------------------------------------------------------------------------------
 * Context
 * -----------------------------------------------------------------------------------------------*/

const DialogContext = React.createContext<DialogContextValue | null>(null)

/* -------------------------------------------------------------------------------------------------
 * Hook
 * -----------------------------------------------------------------------------------------------*/

export function useDialogClick(): DialogContextValue {
  const context = React.useContext(DialogContext)

  if (!context) {
    throw new Error("useDialogClick must be used within a DialogProvider")
  }

  return context
}

/* -------------------------------------------------------------------------------------------------
 * Provider
 * -----------------------------------------------------------------------------------------------*/

interface DialogProviderProps {
  children: React.ReactNode
}

export function DialogProvider({ children }: DialogProviderProps) {
  /**
   * Estado inicial seguro para SSR
   * Evita hydration mismatch
   */
  const [clickPosition, setClickPosition] = React.useState<ClickPosition>({
    x: 0,
    y: 0,
  })

  /**
   * Define o ponto inicial no centro da viewport
   * Executa apenas no cliente
   */
  React.useEffect(() => {
    setClickPosition({
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
    })
  }, [])

  /**
   * Captura posição do clique para animações, transições e origem visual
   */
  const captureClick = React.useCallback(
    (event: React.MouseEvent | MouseEvent) => {
      setClickPosition({
        x: event.clientX,
        y: event.clientY,
      })
    },
    []
  )

  /**
   * Memoização do valor do contexto
   * Evita re-renders desnecessários
   */
  const value = React.useMemo(
    () => ({
      clickPosition,
      captureClick,
    }),
    [clickPosition, captureClick]
  )

  return (
    <DialogContext.Provider value={value}>
      {children}
    </DialogContext.Provider>
  )
}

/* -------------------------------------------------------------------------------------------------
 * Usage
 * -----------------------------------------------------------------------------------------------*/
// Envolva seu layout principal com <DialogProvider />
// Ex: app/layout.tsx
