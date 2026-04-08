/**
 * COMPOSANT TOAST DE NOTIFICATIONS
 * 
 * Affiche des notifications éphémères en haut à droite de l'écran.
 * Chaque toast a une animation d'entrée/sortie, une barre de progression,
 * et un bouton de fermeture.
 */

import { useState, useEffect, useCallback } from 'react';
import { AppNotification } from '../types';
import {
  onNotificationAdded,
  onNotificationRemoved,
  removeNotification,
} from '../services/notificationService';

interface ToastItem extends AppNotification {
  isExiting: boolean;
}

export function NotificationToast() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // Écouter les nouvelles notifications
  useEffect(() => {
    const unsubAdd = onNotificationAdded((notification) => {
      setToasts(prev => [
        ...prev,
        { ...notification, isExiting: false }
      ].slice(-5)); // Max 5 toasts visibles
    });

    const unsubRemove = onNotificationRemoved((id) => {
      dismissToast(id);
    });

    return () => {
      unsubAdd();
      unsubRemove();
    };
  }, []);

  // Auto-dismiss avec timer
  useEffect(() => {
    const timers: number[] = [];

    toasts.forEach(toast => {
      if (toast.duration && toast.duration > 0 && !toast.isExiting) {
        const timer = window.setTimeout(() => {
          dismissToast(toast.id);
        }, toast.duration);
        timers.push(timer);
      }
    });

    return () => {
      timers.forEach(t => clearTimeout(t));
    };
  }, [toasts]);

  const dismissToast = useCallback((id: string) => {
    setToasts(prev =>
      prev.map(t => t.id === id ? { ...t, isExiting: true } : t)
    );

    // Retirer du DOM après l'animation
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  }, []);

  const getToastStyles = (type: AppNotification['type']) => {
    switch (type) {
      case 'success':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-green-500',
          icon: (
            <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            </div>
          ),
          progress: 'bg-green-500',
          titleColor: 'text-green-800',
        };
      case 'error':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-red-500',
          icon: (
            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
          ),
          progress: 'bg-red-500',
          titleColor: 'text-red-800',
        };
      case 'warning':
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-orange-500',
          icon: (
            <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-orange-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
          ),
          progress: 'bg-orange-500',
          titleColor: 'text-orange-800',
        };
      default: // info
        return {
          bg: 'bg-white',
          border: 'border-l-4 border-blue-500',
          icon: (
            <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
          ),
          progress: 'bg-blue-500',
          titleColor: 'text-blue-800',
        };
    }
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-[9999] flex flex-col gap-3 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const styles = getToastStyles(toast.type);

        return (
          <div
            key={toast.id}
            className={`
              ${styles.bg} ${styles.border} rounded-xl shadow-2xl overflow-hidden
              pointer-events-auto
              transition-all duration-300 ease-out
              ${toast.isExiting
                ? 'opacity-0 translate-x-full scale-95'
                : 'opacity-100 translate-x-0 scale-100'
              }
            `}
            style={{
              animation: toast.isExiting ? undefined : 'slideInRight 0.3s ease-out',
            }}
          >
            <div className="p-4 flex items-start gap-3">
              {styles.icon}

              <div className="flex-1 min-w-0">
                <p className={`font-semibold text-sm ${styles.titleColor}`}>
                  {toast.title}
                </p>
                <p className="text-gray-600 text-xs mt-0.5 leading-relaxed">
                  {toast.message}
                </p>

                {toast.action && (
                  <button
                    onClick={() => {
                      toast.action?.onClick();
                      dismissToast(toast.id);
                    }}
                    className="mt-2 text-xs font-medium text-blue-600 hover:text-blue-800 underline"
                  >
                    {toast.action.label}
                  </button>
                )}
              </div>

              <button
                onClick={() => {
                  removeNotification(toast.id);
                  dismissToast(toast.id);
                }}
                className="text-gray-400 hover:text-gray-600 flex-shrink-0 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Barre de progression */}
            {toast.duration && toast.duration > 0 && !toast.isExiting && (
              <div className="h-1 bg-gray-100">
                <div
                  className={`h-full ${styles.progress} rounded-full`}
                  style={{
                    animation: `shrinkWidth ${toast.duration}ms linear forwards`,
                  }}
                />
              </div>
            )}
          </div>
        );
      })}

      {/* Styles d'animation */}
      <style>{`
        @keyframes slideInRight {
          from {
            opacity: 0;
            transform: translateX(100%) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateX(0) scale(1);
          }
        }
        @keyframes shrinkWidth {
          from { width: 100%; }
          to { width: 0%; }
        }
      `}</style>
    </div>
  );
}

export default NotificationToast;
