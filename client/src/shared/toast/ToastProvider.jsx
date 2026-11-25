import { useUiText } from '../../features/localization/hooks/useUiText'
import { useCallback, useMemo, useState } from 'react'
import { ToastContext } from './ToastContext'

const TOAST_DURATION_MS = 3200

export function ToastProvider({ children }) {
  const ui = useUiText()
  const [toasts, setToasts] = useState([])

  const dismissToast = useCallback((toastId) => {
    setToasts((current) => current.filter((toast) => toast.id !== toastId))
  }, [])

  const showToast = useCallback(
    ({ message, type = 'success' }) => {
      if (!message) return

      const toastId = `${Date.now()}-${Math.random().toString(36).slice(2)}`
      setToasts((current) => [...current, { id: toastId, message, type }])
      window.setTimeout(() => dismissToast(toastId), TOAST_DURATION_MS)
    },
    [dismissToast],
  )

  const value = useMemo(() => ({ showToast, dismissToast }), [dismissToast, showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-region" role="status" aria-live="polite" aria-atomic="true">
        {toasts.map((toast) => (
          <div className={`toast-card ${toast.type}`} key={toast.id}>
            <span>{ui(toast.message)}</span>
            <button
              aria-label={ui("Dismiss notification")}
              className="toast-close"
              type="button"
              onClick={() => dismissToast(toast.id)}
            >
              &times;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
